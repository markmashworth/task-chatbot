# task-chatbot-service

This is a Node.js/Express backend service. It is essentially an OpenAI wrapper with custom tool definitions for grabbing user activity from JIRA and GitHub.

## Local Development

**1. Enter the backend directory**
```bash
cd task-chatbot-service
```

**2. Install dependencies**
```bash
npm install
```

**3. Configure credentials**
```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Description |
|---|---|
| `JIRA_BASE_URL` | Your JIRA Cloud URL, e.g. `https://yourorg.atlassian.net` |
| `JIRA_EMAIL` | The email address associated with your JIRA API token |
| `JIRA_API_TOKEN` | JIRA API token — generate one at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens) |
| `GITHUB_TOKEN` | GitHub Personal Access Token with `read:user` and `public_repo` scopes |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | OpenAI model to use (default: `gpt-4o-mini`) |
| `OPENAI_TEMPERATURE` | Sampling temperature, `[0, 2]`|
| `PORT` | Server port (default: `3000`) |
| `CORS_ORIGIN` | Allowed CORS origin (default: `http://localhost:3000`) |
| `USER_MAP` | *(Optional)* JSON mapping of display names to JIRA emails and GitHub usernames — see below |

**4. (Recommended) Configure the user map**

GitHub's global user search is unreliable for matching display names to organisation members. Add a `USER_MAP` to your `.env` to resolve names accurately:

```
USER_MAP={"John":{"jira":"john.smith@company.com","github":"jsmith"},"Sarah":{"jira":"sarah.jones@company.com","github":"sjones"}}
```

**5. Run**
```bash
npm start        # production
npm run dev      # development (restarts on file changes)
```

The server starts at `http://localhost:8080`.

## API

### `POST /api/v1/chat`

Send a message and receive a streaming response via Server-Sent Events (SSE). Pass the conversation history on each turn so the assistant maintains context across messages.

**Request**
```json
{
  "message": "What is John working on?",
  "history": []
}
```

`history` is an array of prior `{ "role": "user" | "assistant", "content": "..." }` turns. The frontend is responsible for maintaining this array and appending each exchange before the next request.

**Response** — `Content-Type: text/event-stream`

Tokens are emitted as they are generated:
```
data: {"token": "John"}
data: {"token": " is"}
data: {"token": " currently"}
...
data: [DONE]
```

If an error occurs after the stream has opened, an error event is sent instead of `[DONE]`:
```
data: {"error": "Internal server error"}
```

Validation errors (missing `message`, malformed `history`) are returned as normal JSON with a `4xx` status before the stream opens.

### `GET /heartbeat`

Returns `{ "status": "ok" }`. Use for health checks.

## Linting

```bash
npm run lint        # report issues
npm run lint:fix    # auto-fix where possible
```

## Tests

```bash
npm test            # run once
npm run test:watch  # re-run on file changes
npm run smoke-test  # end-to-end smoke test against a running server (requires `.env` to be filled out)
```