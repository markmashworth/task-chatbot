# task-chatbot-ui

React/TypeScript frontend built with Vite. Renders the chat interface and streams responses from the backend via SSE.

## Local Development

**1. Enter the UI directory**
```bash
cd task-chatbot-ui
```

**2. Install dependencies**
```bash
npm install
```

**3. Start the dev server**
```bash
npm run dev
```

Opens at `http://localhost:3000`. API requests to `/api/*` are proxied to the backend at `http://localhost:8080`, so the service must be running for chat to work.

**4. Production build**
```bash
npm run build    # type-checks then bundles to dist/
npm run preview  # serve the built output locally
```

## Linting

```bash
npm run lint
```

## Tests

```bash
npm test              # unit tests, run once
npm run test:watch    # unit tests, re-run on file changes
npm run test:e2e      # Playwright end-to-end tests
npm run test:e2e:ui   # Playwright tests with interactive UI
```
