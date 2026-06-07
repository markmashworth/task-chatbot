import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../jira-client.js', () => ({ getUserJiraActivity: vi.fn() }));
vi.mock('../github-client.js', () => ({ getUserGithubActivity: vi.fn() }));
vi.mock('../../config/config.js', () => ({
  default: {
    jira: { baseUrl: 'https://test.atlassian.net' },
    userMap: {},
  },
}));

import { TOOL_DEFINITIONS, executeTool } from '../tools.js';
import { getUserJiraActivity } from '../jira-client.js';
import { getUserGithubActivity } from '../github-client.js';

describe('TOOL_DEFINITIONS', () => {
  it('exports two tools: get_jira_activity and get_github_activity', () => {
    const names = TOOL_DEFINITIONS.map((t) => t.function.name);
    expect(names).toHaveLength(2);
    expect(names).toContain('get_jira_activity');
    expect(names).toContain('get_github_activity');
  });

  it('each definition has required type and function fields', () => {
    for (const def of TOOL_DEFINITIONS) {
      expect(def.type).toBe('function');
      expect(def.function.name).toBeTypeOf('string');
      expect(def.function.description).toBeTypeOf('string');
      expect(def.function.parameters.required).toContain('name');
    }
  });
});

describe('executeTool', () => {
  it('throws for an unknown tool name', async () => {
    await expect(executeTool('unknown_tool', {})).rejects.toThrow('Unknown tool: "unknown_tool"');
  });

  describe('get_jira_activity', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns unavailable context when jira client throws', async () => {
      getUserJiraActivity.mockRejectedValue(new Error('network error'));
      const result = await executeTool('get_jira_activity', { name: 'Alice' });
      expect(result).toContain('Team member: Alice');
      expect(result).toContain('JIRA: unavailable (API error)');
    });

    it('returns user-not-found context when jira returns null user', async () => {
      getUserJiraActivity.mockResolvedValue({ user: null, issues: [] });
      const result = await executeTool('get_jira_activity', { name: 'Bob' });
      expect(result).toContain('JIRA: user not found');
    });

    it('returns no-tickets context when user has no active issues', async () => {
      getUserJiraActivity.mockResolvedValue({
        user: { displayName: 'Alice' },
        issues: [],
      });
      const result = await executeTool('get_jira_activity', { name: 'Alice' });
      expect(result).toContain('JIRA: no active tickets');
    });

    it('formats issues with status, priority, and URL', async () => {
      getUserJiraActivity.mockResolvedValue({
        user: { displayName: 'Alice' },
        issues: [
          {
            key: 'KAN-1',
            fields: {
              summary: 'Fix the bug',
              status: { name: 'In Progress' },
              priority: { name: 'High' },
              reporter: { displayName: 'Jane' },
              duedate: '2024-08-01',
              description: null,
            },
          },
        ],
      });
      const result = await executeTool('get_jira_activity', { name: 'Alice' });
      expect(result).toContain('KAN-1: Fix the bug');
      expect(result).toContain('Status: In Progress');
      expect(result).toContain('Priority: High');
      expect(result).toContain('Reporter: Jane');
      expect(result).toContain('Due: 2024-08-01');
      expect(result).toContain('https://test.atlassian.net/browse/KAN-1');
    });

    it('extracts plain text from ADF description', async () => {
      getUserJiraActivity.mockResolvedValue({
        user: { displayName: 'Alice' },
        issues: [
          {
            key: 'KAN-2',
            fields: {
              summary: 'ADF issue',
              status: { name: 'To Do' },
              priority: { name: 'Medium' },
              reporter: null,
              duedate: null,
              description: {
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Hello world' }],
                  },
                ],
              },
            },
          },
        ],
      });
      const result = await executeTool('get_jira_activity', { name: 'Alice' });
      expect(result).toContain('Hello world');
    });

    it('wraps output in <tool_data> tags', async () => {
      getUserJiraActivity.mockResolvedValue({ user: null, issues: [] });
      const result = await executeTool('get_jira_activity', { name: 'X' });
      expect(result).toMatch(/^<tool_data>/);
      expect(result).toMatch(/<\/tool_data>$/);
    });
  });

  describe('get_github_activity', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns unavailable context when github client throws', async () => {
      getUserGithubActivity.mockRejectedValue(new Error('network error'));
      const result = await executeTool('get_github_activity', { name: 'Alice' });
      expect(result).toContain('GitHub: unavailable (API error)');
    });

    it('returns user-not-found context when github returns null user', async () => {
      getUserGithubActivity.mockResolvedValue({ user: null, commits: [], prs: [], repos: [] });
      const result = await executeTool('get_github_activity', { name: 'Bob' });
      expect(result).toContain('GitHub: user not found');
    });

    it('formats commits with message and repo', async () => {
      getUserGithubActivity.mockResolvedValue({
        user: { login: 'alice' },
        commits: [
          {
            commit: { message: 'feat: add login\n\nbody text' },
            repository: { full_name: 'org/repo' },
            html_url: 'https://github.com/org/repo/commit/abc',
          },
        ],
        prs: [],
        repos: ['org/repo'],
      });
      const result = await executeTool('get_github_activity', { name: 'Alice' });
      expect(result).toContain('feat: add login');
      expect(result).not.toContain('body text');
      expect(result).toContain('org/repo');
      expect(result).toContain('https://github.com/org/repo/commit/abc');
    });

    it('formats open pull requests', async () => {
      getUserGithubActivity.mockResolvedValue({
        user: { login: 'alice' },
        commits: [],
        prs: [
          { title: 'Add dark mode', html_url: 'https://github.com/org/repo/pull/1' },
        ],
        repos: [],
      });
      const result = await executeTool('get_github_activity', { name: 'Alice' });
      expect(result).toContain('Add dark mode');
      expect(result).toContain('https://github.com/org/repo/pull/1');
    });

    it('caps commits at 20', async () => {
      const commits = Array.from({ length: 25 }, (_, i) => ({
        commit: { message: `commit ${i}` },
        repository: { full_name: 'org/repo' },
        html_url: null,
      }));
      getUserGithubActivity.mockResolvedValue({
        user: { login: 'alice' },
        commits,
        prs: [],
        repos: [],
      });
      const result = await executeTool('get_github_activity', { name: 'Alice' });
      expect(result).toContain('commit 19');
      expect(result).not.toContain('commit 20');
    });

    it('wraps output in <tool_data> tags', async () => {
      getUserGithubActivity.mockResolvedValue({ user: null, commits: [], prs: [], repos: [] });
      const result = await executeTool('get_github_activity', { name: 'X' });
      expect(result).toMatch(/^<tool_data>/);
      expect(result).toMatch(/<\/tool_data>$/);
    });
  });
});
