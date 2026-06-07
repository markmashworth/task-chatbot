import config from '../config/config.js';

const BASE_URL = 'https://api.github.com';

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
// NOTE: process-local cache — not suitable for production (multi-instance deploys or
// restarts will lose cached data). Replace with a distributed cache such as Redis in production.
const activityCache = new Map(); // key: name → { ts, data }

async function githubFetch(path, params = {}, extraHeaders = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.github.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...extraHeaders,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`GitHub ${res.status}: ${body.message || res.statusText}`);
  }

  return res.json();
}

async function findGithubUser(name) {
  // USER_MAP takes priority — GitHub's global user search is unreliable for org members
  const mapped = config.userMap[name]?.github;
  if (mapped) {
    return githubFetch(`/users/${encodeURIComponent(mapped)}`);
  }

  const safeName = name.replace(/[^a-zA-Z\s'-]/g, '').trim();
  if (!safeName) return null;
  const data = await githubFetch('/search/users', { q: `fullname:"${safeName}"`, per_page: 5 });

  const searchItem = data.items[0];
  return searchItem ? githubFetch(`/users/${encodeURIComponent(searchItem.login)}`) : null;
}

async function getRecentCommits(username, daysBack = 30, repo = null) {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);
  const dateStr = since.toISOString().split('T')[0];

  // Build repo qualifier: use owner/repo as-is if provided, otherwise assume username/repo
  const repoQualifier = repo
    ? `repo:${repo.includes('/') ? repo : `${username}/${repo}`}`
    : '';

  const q = [`author:${username}`, `committer-date:>=${dateStr}`, repoQualifier]
    .filter(Boolean)
    .join(' ');

  const data = await githubFetch(
    '/search/commits',
    { q, sort: 'committer-date', order: 'desc', per_page: 30 },
  );

  return data.items || [];
}

async function getOpenPRs(username) {
  const data = await githubFetch('/search/issues', {
    q: `is:pr is:open author:${username}`,
    sort: 'updated',
    order: 'desc',
    per_page: 5,
  });
  return data.items || [];
}

export async function getUserGithubActivity(name, daysBack = 30, repo = null) {
  if (!config.github) throw new Error('GitHub is not configured');

  const cacheKey = `${name}:${daysBack}:${repo ?? ''}`;
  const cached = activityCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const user = await findGithubUser(name);
  if (!user) {
    const data = { user: null, commits: [], prs: [], repos: [] };
    activityCache.set(cacheKey, { ts: Date.now(), data });
    return data;
  }

  const [commits, prs] = await Promise.all([
    getRecentCommits(user.login, daysBack, repo),
    getOpenPRs(user.login),
  ]);

  const repos = [
    ...new Set([
      ...commits.map((c) => c.repository?.full_name).filter(Boolean),
      ...prs.map((pr) => pr.repository_url?.split('/').slice(-2).join('/')).filter(Boolean),
    ]),
  ];

  const data = { user, commits, prs, repos };
  activityCache.set(cacheKey, { ts: Date.now(), data });
  return data;
}
