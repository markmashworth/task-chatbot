import dotenv from 'dotenv';
dotenv.config();

const required = ['OPENAI_API_KEY', 'GITHUB_TOKEN', 'JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in your credentials.');
  process.exit(1);
}

let userMap = {};
if (process.env.USER_MAP) {
  try {
    userMap = JSON.parse(process.env.USER_MAP);
  } catch {
    console.warn('[config] USER_MAP is not valid JSON, ignoring it.');
  }
}

export default {
  jira: {
    baseUrl: process.env.JIRA_BASE_URL.replace(/\/$/, ''),
    email: process.env.JIRA_EMAIL,
    apiToken: process.env.JIRA_API_TOKEN,
  },
  github: { token: process.env.GITHUB_TOKEN },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE ?? '0'),
  },
  port: parseInt(process.env.PORT || '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  userMap,
};
