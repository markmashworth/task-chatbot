import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockConfig = vi.hoisted(() => ({
  github: { token: 'gh-test-token' },
  userMap: {},
}));

vi.mock('../../config/config.js', () => ({ default: mockConfig }));

import { getUserGithubActivity } from '../github-client.js';

function makeFetchMock(...responses) {
  const queue = [...responses];
  return vi.fn(() => {
    const next = queue.shift();
    if (next instanceof Error) return Promise.reject(next);
    return Promise.resolve({
      ok: next.ok ?? true,
      status: next.status ?? 200,
      statusText: next.statusText ?? 'OK',
      json: () => Promise.resolve(next.body),
    });
  });
}

beforeEach(() => {
  // Reset mock config between tests
  vi.unstubAllGlobals();
});

describe('getUserGithubActivity', () => {
  it('throws when GitHub is not configured', async () => {
    const original = mockConfig.github;
    mockConfig.github = null;
    await expect(getUserGithubActivity('Alice')).rejects.toThrow('GitHub is not configured');
    mockConfig.github = original;
  });

  it('returns null user when search returns no results', async () => {
    vi.stubGlobal('fetch', makeFetchMock(
      // user search
      { body: { items: [] } },
    ));
    const result = await getUserGithubActivity('__no_match_' + Date.now());
    expect(result.user).toBeNull();
    expect(result.commits).toEqual([]);
    expect(result.prs).toEqual([]);
  });

  it('uses userMap to skip search and fetch user directly', async () => {
    const name = 'Alice__map_' + Date.now();
    mockConfig.userMap[name] = { github: 'alice-gh' };
    const user = { login: 'alice-gh', name: 'Alice' };
    const fetchMock = makeFetchMock(
      { body: user },            // /users/alice-gh
      { body: { items: [] } },  // commits search
      { body: { items: [] } },  // PRs search
    );
    vi.stubGlobal('fetch', fetchMock);

    await getUserGithubActivity(name);

    const firstUrl = fetchMock.mock.calls[0][0].toString();
    expect(firstUrl).toContain('/users/alice-gh');
    delete mockConfig.userMap[name];
  });

  it('returns commits, prs, and repos on success', async () => {
    const user = { login: 'bob', name: 'Bob' };
    const commits = [
      {
        commit: { message: 'feat: new feature' },
        repository: { full_name: 'org/repo' },
        html_url: 'https://github.com/org/repo/commit/1',
      },
    ];
    const prs = [
      {
        title: 'My PR',
        html_url: 'https://github.com/org/repo/pull/1',
        repository_url: 'https://api.github.com/repos/org/repo',
      },
    ];
    vi.stubGlobal('fetch', makeFetchMock(
      { body: { items: [{ login: 'bob' }] } },  // user search
      { body: user },                            // /users/bob
      { body: { items: commits } },              // commits
      { body: { items: prs } },                  // PRs
    ));

    const result = await getUserGithubActivity('Bob__success_' + Date.now());
    expect(result.user).toEqual(user);
    expect(result.commits).toEqual(commits);
    expect(result.prs).toEqual(prs);
    expect(result.repos).toContain('org/repo');
  });

  it('throws when the API returns a non-ok response', async () => {
    vi.stubGlobal('fetch', makeFetchMock(
      { ok: false, status: 403, statusText: 'Forbidden', body: { message: 'rate limit' } },
    ));
    await expect(getUserGithubActivity('Anyone__err_' + Date.now())).rejects.toThrow('GitHub 403');
  });

  it('returns cached data on second call with same key', async () => {
    const user = { login: 'cached-user', name: 'Cached' };
    const fetchMock = makeFetchMock(
      { body: { items: [{ login: 'cached-user' }] } },
      { body: user },
      { body: { items: [] } },
      { body: { items: [] } },
    );
    vi.stubGlobal('fetch', fetchMock);

    const name = 'CachedUser__' + Date.now();
    await getUserGithubActivity(name, 30, null);
    await getUserGithubActivity(name, 30, null);

    // fetch should only be called for the first request
    expect(fetchMock.mock.calls.length).toBe(4);
  });
});
