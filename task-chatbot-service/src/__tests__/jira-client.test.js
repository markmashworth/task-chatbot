import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockConfig = vi.hoisted(() => ({
  jira: {
    baseUrl: 'https://test.atlassian.net',
    email: 'user@example.com',
    apiToken: 'token123',
  },
  userMap: {},
}));

vi.mock('../../config/config.js', () => ({ default: mockConfig }));

import { getUserJiraActivity } from '../jira-client.js';

function mockFetch(...responses) {
  const queue = [...responses];
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      const next = queue.shift();
      if (next instanceof Error) return Promise.reject(next);
      return Promise.resolve({
        ok: next.ok ?? true,
        status: next.status ?? 200,
        statusText: next.statusText ?? 'OK',
        json: () => Promise.resolve(next.body),
      });
    }),
  );
}

beforeEach(() => vi.unstubAllGlobals());

describe('getUserJiraActivity', () => {
  it('throws when JIRA is not configured', async () => {
    const original = mockConfig.jira;
    mockConfig.jira = null;
    await expect(getUserJiraActivity('Alice')).rejects.toThrow('JIRA is not configured');
    mockConfig.jira = original;
  });

  it('returns null user when no matching user is found', async () => {
    mockFetch({ body: [] });
    const result = await getUserJiraActivity('Unknown Person');
    expect(result).toEqual({ user: null, issues: [] });
  });

  it('returns user and their assigned issues', async () => {
    const user = { accountId: 'abc123', displayName: 'Alice' };
    const issues = [
      {
        key: 'KAN-1',
        fields: { summary: 'Fix bug', status: { name: 'In Progress' } },
      },
    ];
    mockFetch({ body: [user] }, { body: { issues } });

    const result = await getUserJiraActivity('Alice');
    expect(result.user).toEqual(user);
    expect(result.issues).toEqual(issues);
  });

  it('uses userMap when entry exists for the name', async () => {
    mockConfig.userMap['Alice'] = { jira: 'alice@company.com' };
    const user = { accountId: 'mapped123', displayName: 'Alice' };
    mockFetch({ body: [user] }, { body: { issues: [] } });

    const fetchSpy = vi.mocked(fetch);
    await getUserJiraActivity('Alice');

    const searchUrl = fetchSpy.mock.calls[0][0].toString();
    expect(searchUrl).toContain('alice%40company.com');

    delete mockConfig.userMap['Alice'];
  });

  it('throws when the API returns a non-ok response', async () => {
    mockFetch({ ok: false, status: 401, statusText: 'Unauthorized', body: { errorMessages: ['Not authenticated'] } });
    await expect(getUserJiraActivity('Alice')).rejects.toThrow('JIRA 401');
  });

  it('rejects invalid accountId format', async () => {
    const user = { accountId: '../../etc/passwd', displayName: 'Hacker' };
    mockFetch({ body: [user] });
    await expect(getUserJiraActivity('Hacker')).rejects.toThrow('Invalid JIRA account ID format');
  });
});
