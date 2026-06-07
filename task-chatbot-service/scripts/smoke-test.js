#!/usr/bin/env node
/**
 * Smoke test — starts the server, runs all chat test cases, then shuts down.
 *
 * Usage: node scripts/smoke-test.js
 *   or:  npm run smoke-test
 *
 * Requires a populated .env file (real credentials needed for OpenAI calls).
 */

import { spawn, execSync } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

const BASE_URL = 'http://localhost:8080';
let server = null;
let exitCode = 0;

// ── Test cases ────────────────────────────────────────────────────────────────
// Each case has a description and one or more turns. Multi-turn cases
// accumulate history automatically, enabling conversation context tests.
//
// Per turn:
//   text                   — the user message
//   expectedResponseRegex  — (optional) response must match this pattern
//   unexpectedResponseRegex — (optional) response must NOT match this pattern

const TEST_CASES = [
  {
    description: 'General activity query returns JIRA and GitHub content',
    turns: [
      {
        text: 'What is Mark working on?',
        expectedResponseRegex: 'KAN-\\d|ticket|issue|commit|pull request|repository',
      },
    ],
  },
  {
    description: 'Multi-turn conversation without tool calls — history is passed correctly',
    turns: [
      {
        text: 'Why is the sky blue?',
        expectedResponseRegex: 'scatter|wavelength|atmosphere|light|blue',
      },
      {
        text: 'What did I just ask?',
        expectedResponseRegex: 'sky|blue',
      },
    ],
  },
  {
    description: 'Commit query returns GitHub content only',
    turns: [
      {
        text: 'What has Mark committed this month?',
        expectedResponseRegex: 'commit|pull request|repository|github',
        unexpectedResponseRegex: 'KAN-\\d|jira ticket|jira issue',
      },
    ],
  },
  {
    description: 'Commit query for last hour handles empty results gracefully',
    turns: [
      {
        text: 'What has Mark committed in the last hour?',
        expectedResponseRegex: 'commit|pull request|repository|github|no recent',
        unexpectedResponseRegex: 'KAN-\\d|jira ticket|jira issue',
      },
    ],
  },
  {
    description: 'Pull request query returns GitHub content only',
    turns: [
      {
        text: "Show me Mark's recent pull requests",
        expectedResponseRegex: 'pull request|commit|repository|github',
        unexpectedResponseRegex: 'KAN-\\d|jira ticket|jira issue',
      },
    ],
  },
  {
    description: 'Issues query returns JIRA content only',
    turns: [
      {
        text: "Show me Mark's current issues",
        expectedResponseRegex: 'KAN-\\d|ticket|issue|jira',
        unexpectedResponseRegex: 'commit|pull request',
      },
    ],
  },
  {
    description: 'JIRA tickets query returns JIRA content only',
    turns: [
      {
        text: 'What JIRA tickets is Mark working on?',
        expectedResponseRegex: 'KAN-\\d|ticket|issue|jira',
        unexpectedResponseRegex: 'commit|pull request',
      },
    ],
  },
  {
    description: 'Unknown user — response acknowledges user was not found',
    turns: [
      {
        text: 'What JIRA tickets is Joe Schmoe working on?',
        expectedResponseRegex: "no JIRA user|no user|not found|no information|unable|can't find|cannot find|couldn't find|don't have|no data|not set up|not in the system",
      },
    ],
  },
];

// ── Process cleanup ──────────────────────────────────────────────────────────

function killServer() {
  if (server && !server.killed) server.kill();
}

process.on('SIGINT', () => { killServer(); process.exit(130); });
process.on('SIGTERM', () => { killServer(); process.exit(143); });

// ── Server lifecycle ─────────────────────────────────────────────────────────

function clearPort(port) {
  try {
    const pids = execSync(`lsof -ti :${port}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (pids) {
      pids.split('\n').forEach((pid) => process.kill(Number(pid), 'SIGKILL'));
      console.log(`Cleared stale process(es) on port ${port}`);
    }
  } catch { /* nothing running */ }
}

function startServer() {
  clearPort(8080);
  server = spawn('node', ['src/server.js'], { stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
  server.on('exit', (code) => {
    if (code !== null && code !== 0) console.error(`[server] exited with code ${code}`);
  });
}

async function waitForReady(maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BASE_URL}/heartbeat`, { signal: AbortSignal.timeout(1_000) });
      if (res.ok) return;
    } catch { /* not ready yet */ }
    await sleep(300);
  }
  throw new Error('Server did not become ready within the allotted time');
}

// ── SSE stream reader ────────────────────────────────────────────────────────

async function readSSEStream(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let assembled = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';
      for (const event of events) {
        for (const line of event.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') return assembled;
          const parsed = JSON.parse(data);
          if (parsed.error) throw new Error(`Server stream error: ${parsed.error}`);
          if (parsed.token) {
            assembled += parsed.token;
            process.stdout.write(parsed.token);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return assembled;
}

// ── Assertions ───────────────────────────────────────────────────────────────

function pass(label) { console.log(`    ✓  ${label}`); }
function fail(label) { console.error(`    ✗  ${label}`); exitCode = 1; }

// ── Test runners ─────────────────────────────────────────────────────────────

async function testValidationRejectsEmptyMessage() {
  console.log('Test 1 — missing message field returns non-2xx');
  const res = await fetch(`${BASE_URL}/api/v1/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (res.status >= 400 && res.status < 500) {
    pass(`received expected ${res.status} status`);
  } else {
    fail(`expected 4xx but got ${res.status}`);
  }
  console.log('  response body:', await res.json());
}

async function runTestCases() {
  for (const [i, { description, turns }] of TEST_CASES.entries()) {
    console.log(`\nTest ${i + 2} — ${description}`);

    const history = [];

    for (const turn of turns) {
      console.log(`  user: ${turn.text}`);
      process.stdout.write('  assistant: ');

      const res = await fetch(`${BASE_URL}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: turn.text, history }),
      });

      if (res.status < 200 || res.status >= 300) {
        fail(`expected 2xx but got ${res.status}`);
        console.error('  response body:', await res.text());
        break;
      }

      const response = await readSSEStream(res);
      console.log('\n');

      if (response.length === 0) {
        fail('got an empty response');
        break;
      }

      pass('received a response');

      if (turn.expectedResponseRegex) {
        const regex = new RegExp(turn.expectedResponseRegex, 'i');
        if (regex.test(response)) pass(`response matches expected pattern`);
        else { fail(`response does not match expected pattern: ${turn.expectedResponseRegex}`); console.log(`    got: ${response}`); }
      }

      if (turn.unexpectedResponseRegex) {
        const regex = new RegExp(turn.unexpectedResponseRegex, 'i');
        if (!regex.test(response)) pass(`response does not contain unexpected content`);
        else { fail(`response matches unexpected pattern: ${turn.unexpectedResponseRegex}`); console.log(`    got: ${response}`); }
      }

      history.push({ role: 'user', content: turn.text });
      history.push({ role: 'assistant', content: response });
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  startServer();
  console.log('\nWaiting for server...');
  await waitForReady();
  console.log('Server ready.\n');

  await testValidationRejectsEmptyMessage();
  await runTestCases();
}

run()
  .catch((err) => { console.error('\nFatal error:', err.message); exitCode = 1; })
  .finally(() => {
    console.log('\n\nShutting down server...');
    killServer();
    process.exit(exitCode);
  });
