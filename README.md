# Task Chatbot

An AI chatbot that answers questions about team member activity by pulling live data from JIRA and GitHub. The backend service is built on top of OpenAI with custom tools for fetching team activities, so you can continue on a conversation like you typically would with an LLM.

## Example queries

- *"What is John working on these days?"*
- *"Show me Sarah's recent activity"*
- *"What has Mike committed this week?"*
- *"Show me Lisa's open pull requests"*
- *"Tell me more about that first ticket"* — follow-up; no new API calls made

## Notes

The project description had these two endpoint requirements. Given the implementation I chose, I did not include endpoints for forwarding requests to Jira or GitHub. Instead that functionality is captured in OpenAI tools.

* Implement endpoint to fetch user’s assigned issues
* Implement endpoint to fetch user’s recent commits and PRs

## Local Development

This is a monorepo containing both the frontend and backend services.

For instructions on running the backend, see the task-chatbot-service [README](./task-chatbot-service/README.md).

For instructions on running the frontend, see the task-chatbot-ui [README](./task-chatbot-ui/README.md).

---

## Architecture

### Conversational context

The `/api/v1/chat` endpoint accepts a `history` array alongside each `message`. This array, maintained on the client-side, is prepended to every OpenAI request, giving the model full conversation context without requiring any server-side session state.

### Intent routing via OpenAI function calling

Tthe app uses [OpenAI function calling](https://platform.openai.com/docs/guides/function-calling). Two tools are defined and made available to the model on every request:

| Tool | When the model calls it |
|---|---|
| `get_jira_activity(name)` | Questions about tickets, issues, or tasks |
| `get_github_activity(name)` | Questions about commits, pull requests, or GitHub activity |

For general questions ("what is X working on?"), the model calls both tools. For specific questions ("what has X committed?"), it calls only the relevant one, avoiding unnecessary API calls. For follow-up questions that can be answered from conversation context, it calls neither.

**Flow:**
```
User message (+ history for multi-turn conversations)
  → OpenAI (with tool context)
      ├─ finish_reason: "tool_calls"
      │     → fetch JIRA and/or GitHub data
      │     → return results to OpenAI
      │     → OpenAI streams final answer token by token via SSE
      └─ finish_reason: "stop" (no tool call required)
            → emit full content as single SSE chunk
```

**Trade-offs**

| | Regex routing (original) | Function calling (current) |
|---|---|---|
| Name extraction | Brittle — breaks on unexpected phrasing | Robust — model understands natural language |
| API calls | Always fetches on every message | Only fetches when the model determines it's needed |
| Latency | Single OpenAI call | One extra round-trip (~500 ms) when data is fetched |
| Follow-up questions | Not supported | Answered from context, no extra API calls |
| Complexity | Low | Moderate — two-step OpenAI loop |

The extra latency on data-fetching turns is acceptable for a conversational, LLM-backed tool.

### Response streaming

Responses are delivered as **Server-Sent Events**. For the tool-calling path (where total latency is 2–4 s), tokens stream as soon as the second OpenAI call begins. The user sees the answer being written rather than waiting for the full response. For direct answers (no tool call needed), the response arrives quickly enough that it is emitted as a single SSE chunk.

**Temperature** is set low by default (configurable via `OPENAI_TEMPERATURE`). A low temperature makes the model more deterministic, which keeps responses consistent across repeated queries and makes the smoke test results predictable. In practice we would probably want to raise the temperature.

### JIRA integration

Uses JIRA Cloud REST API. Authenticates with Basic auth. Looks up a user by display name via `/rest/api/3/user/search`, then fetches their active issues using JQL, e.g.

```
assignee = "{accountId}" AND statusCategory in ("To Do", "In Progress") ORDER BY updated DESC
```

### GitHub integration

Authenticates with a Personal Access Token. Looks up users via `USER_MAP` first (recommended), falling back to GitHub's global user search. Fetches:
- Recent commits via the commit search API (date is parsed from the user message)
- Open pull requests via the issue search API

Both JIRA and GitHub fetches run concurrently via `Promise.allSettled`, so a failure in one source does not prevent the other from being returned.

---

## Production considerations

- **In-memory cache**: GitHub activity results are cached in a `Map` for 2 minutes to reduce API calls during a conversation. This cache is process-local and does not survive restarts. A production deployment would replace this with a shared cache (e.g. Redis) to work correctly across multiple instances.

- **Rate limiting**: The `/api/v1/chat` endpoint has no rate limiting. In production, add a rate limiter (e.g. [`express-rate-limit`](https://github.com/express-rate-limit/express-rate-limit)) to protect against abuse and to stay within OpenAI and GitHub API quotas.

- **User Lookup**: This application integrates with third party apps (Github + Jira). I considered implementing a robust user lookup service to be out of scope. As a workaround, you can configure a user map (see [.env.example](./task-chatbot-service/.env.example) for instructions) that associates a GitHub or Jira username with a name. In practice, we would probably have some user directory or a product org to rely on. 
