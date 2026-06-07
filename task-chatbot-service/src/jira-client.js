import config from '../config/config.js';

function authHeader() {
  const encoded = Buffer.from(`${config.jira.email}:${config.jira.apiToken}`).toString('base64');
  return `Basic ${encoded}`;
}

async function jiraFetch(path, params = {}) {
  const url = new URL(`${config.jira.baseUrl}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url, {
    headers: {
      Authorization: authHeader(),
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`JIRA ${res.status}: ${body.errorMessages?.join(', ') || res.statusText}`);
  }

  return res.json();
}

async function findJiraUser(name) {
  // USER_MAP entry can be an email or display name fragment — pass it directly to the search
  const query = config.userMap[name]?.jira ?? name;
  const users = await jiraFetch('/rest/api/3/user/search', { query, maxResults: 5 });
  return users[0] || null;
}

async function getAssignedIssues(accountId) {
  if (!/^[a-zA-Z0-9:_-]{1,128}$/.test(accountId)) {
    throw new Error('Invalid JIRA account ID format');
  }
  const jql = `assignee = "${accountId}" AND statusCategory in ("To Do", "In Progress") ORDER BY updated DESC`;
  const data = await jiraFetch('/rest/api/3/search/jql', {
    jql,
    maxResults: 10,
    fields: 'summary,description,status,priority,reporter,duedate,updated,assignee',
  });
  return data.issues || [];
}

export async function getUserJiraActivity(name) {
  const user = await findJiraUser(name);
  if (!user) {
    return { user: null, issues: [] };
  }

  const issues = await getAssignedIssues(user.accountId);
  return { user, issues };
}
