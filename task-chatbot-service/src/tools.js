import { getUserJiraActivity } from './jira-client.js';
import { getUserGithubActivity } from './github-client.js';
import config from '../config/config.js';

// ── Tool definitions (OpenAI schema) ─────────────────────────────────────────
// Add the schema for each new tool here alongside its handler below.

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'get_jira_activity',
      description:
        "Fetch a team member's active JIRA tickets and their statuses. Use when the user asks about tickets, issues, tasks, or JIRA. Do NOT call this when the user asks specifically about commits, pull requests, or GitHub activity.",
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: "The team member's name as mentioned in the conversation (e.g. 'John' or 'Sarah Jones')",
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_github_activity',
      description:
        "Fetch a team member's recent GitHub activity including commits and open pull requests. Use when the user asks about commits, pull requests, code, or GitHub. Do NOT call this when the user asks specifically about tickets, issues, tasks, or JIRA.",
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: "The team member's name as mentioned in the conversation (e.g. 'John' or 'Sarah Jones')",
          },
          days_back: {
            type: 'integer',
            description:
              'How many days back to search for commits. Infer this from the query — e.g. "last week" → 7, "this month" → 30, "last 3 months" → 90, "last year" → 365. Defaults to 30 if not specified.',
          },
          repo: {
            type: 'string',
            description:
              'Limit commits to a specific repository. Use "owner/repo" format when known (e.g. "markmashworth/brex"), or just the repo name (e.g. "brex") if the owner is unknown.',
          },
        },
        required: ['name'],
      },
    },
  },
];

// ── Tool handlers ─────────────────────────────────────────────────────────────
// Each key must match the `name` field of its corresponding TOOL_DEFINITIONS entry.

const handlers = {
  async get_jira_activity({ name }) {
    let jiraData = null;
    try {
      jiraData = await getUserJiraActivity(name);
    } catch (err) {
      console.error(`JIRA fetch failed for "${name}":`, err);
    }
    return buildJiraContext(name, jiraData);
  },

  async get_github_activity({ name, days_back, repo }) {
    let githubData = null;
    try {
      githubData = await getUserGithubActivity(name, days_back, repo);
    } catch (err) {
      console.error(`GitHub fetch failed for "${name}":`, err);
    }
    return buildGithubContext(name, githubData);
  },
};

// ── Dispatcher ────────────────────────────────────────────────────────────────

export async function executeTool(toolName, args) {
  const handler = handlers[toolName];
  if (!handler) throw new Error(`Unknown tool: "${toolName}"`);
  return handler(args);
}

// ── Context builders ──────────────────────────────────────────────────────────

/**
 * Recursively extract plain text from an Atlassian Document Format (ADF) node.
 * JIRA v3 returns description as ADF JSON rather than a plain string.
 */
function extractAdfText(node) {
  if (!node || typeof node !== 'object') return '';
  if (node.type === 'text') return node.text ?? '';
  if (!Array.isArray(node.content)) return '';
  return node.content.map(extractAdfText).join(' ').replace(/\s+/g, ' ').trim();
}

function buildJiraContext(name, jiraData) {
  const lines = [`Team member: ${name}\n`];

  if (!jiraData) {
    lines.push('JIRA: unavailable (API error)');
  } else if (!jiraData.user) {
    lines.push('JIRA: user not found');
  } else if (jiraData.issues.length === 0) {
    lines.push('JIRA: no active tickets');
  } else {
    lines.push('JIRA tickets (active):');
    for (const issue of jiraData.issues) {
      const status   = issue.fields.status?.name    ?? 'Unknown';
      const priority = issue.fields.priority?.name  ?? 'Unknown';
      const reporter = issue.fields.reporter?.displayName ?? null;
      const dueDate  = issue.fields.duedate ?? null;
      const url      = `${config.jira.baseUrl}/browse/${issue.key}`;
      const description = issue.fields.description
        ? extractAdfText(issue.fields.description).slice(0, 300)
        : null;
      lines.push(`  - ${issue.key}: ${issue.fields.summary}`);
      lines.push(`    Status: ${status}`);
      lines.push(`    Priority: ${priority}`);
      if (reporter) lines.push(`    Reporter: ${reporter}`);
      if (dueDate)  lines.push(`    Due: ${dueDate}`);
      if (url)         lines.push(`    URL: ${url}`);
      if (description) lines.push(`    Description: ${description}`);
    }
  }

  return `<tool_data>\n${lines.join('\n')}\n</tool_data>`;
}

function buildGithubContext(name, githubData) {
  const lines = [`Team member: ${name}\n`];

  if (!githubData) {
    lines.push('GitHub: unavailable (API error)');
  } else if (!githubData.user) {
    lines.push('GitHub: user not found');
  } else {
    if (githubData.commits.length === 0) {
      lines.push('GitHub commits (last 7 days): none');
    } else {
      lines.push('GitHub commits (last 7 days):');
      for (const commit of githubData.commits.slice(0, 20)) {
        const msg = commit.commit.message.split('\n')[0];
        const repo = commit.repository?.full_name ?? 'unknown repo';
        lines.push(`  - ${msg} (${repo})`);
        if (commit.html_url) lines.push(`    URL: ${commit.html_url}`);
      }
    }

    if (githubData.prs.length === 0) {
      lines.push('Open pull requests: none');
    } else {
      lines.push('Open pull requests:');
      for (const pr of githubData.prs.slice(0, 5)) {
        lines.push(`  - ${pr.title}`);
        if (pr.html_url) lines.push(`    URL: ${pr.html_url}`);
      }
    }

    if (githubData.repos.length > 0) {
      lines.push(`Active repositories: ${githubData.repos.join(', ')}`);
    }
  }

  return `<tool_data>\n${lines.join('\n')}\n</tool_data>`;
}
