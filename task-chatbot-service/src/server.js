import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from '../config/config.js';
import { generateResponse } from './response-generator.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '64kb' }));
app.use(express.static('public'));

app.post('/api/v1/chat', async (req, res) => {
  const { message, history = [] } = req.body ?? {};

  if (!message?.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  if (message.length > 4000) {
    return res.status(400).json({ error: 'message must not exceed 4000 characters' });
  }

  if (!Array.isArray(history)) {
    return res.status(400).json({ error: 'history must be an array' });
  }

  // Validate each history item: only known roles, string content, reasonable length.
  // Silently drop invalid entries rather than rejecting the whole request.
  const VALID_ROLES = new Set(['user', 'assistant']);
  const validatedHistory = history.filter(
    (m) =>
      m !== null &&
      typeof m === 'object' &&
      VALID_ROLES.has(m.role) &&
      typeof m.content === 'string' &&
      m.content.length <= 4000,
  );

  // Switch to SSE — headers must be set before any writes
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const write = (token) => res.write(`data: ${JSON.stringify({ token })}\n\n`);

  try {
    await generateResponse(message, validatedHistory, write);
    res.write('data: [DONE]\n\n');
  } catch (err) {
    console.error('generateResponse error:', err);
    // Surface known upstream errors so callers can distinguish them from bugs
    const message =
      err.status === 429 ? 'OpenAI rate limit or quota exceeded' :
      err.status === 401 ? 'OpenAI authentication failed — check OPENAI_API_KEY' :
      'Internal server error';
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
  } finally {
    res.end();
  }
});

app.get('/heartbeat', (_req, res) => res.json({ status: 'ok' }));

export { app };

const isMain = process.argv[1] && process.argv[1].endsWith('server.js');
if (isMain) {
  app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
  });
}
