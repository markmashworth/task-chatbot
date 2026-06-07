import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../config/config.js', () => ({
  default: {
    openai: { apiKey: 'test', model: 'gpt-4o-mini', temperature: 0 },
    port: 3001,
    corsOrigin: 'http://localhost:3000',
    userMap: {},
    jira: null,
    github: null,
  },
}));

vi.mock('../response-generator.js', () => ({
  generateResponse: vi.fn(),
}));

import { app } from '../server.js';
import { generateResponse } from '../response-generator.js';

beforeEach(() => vi.clearAllMocks());

describe('POST /api/v1/chat', () => {
  it('returns 400 when message is missing', async () => {
    const res = await request(app).post('/api/v1/chat').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/message is required/);
  });

  it('returns 400 when message is an empty string', async () => {
    const res = await request(app).post('/api/v1/chat').send({ message: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/message is required/);
  });

  it('returns 400 when message exceeds 4000 characters', async () => {
    const res = await request(app).post('/api/v1/chat').send({ message: 'a'.repeat(4001) });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/4000/);
  });

  it('returns 400 when history is not an array', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'hello', history: 'not-an-array' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/history must be an array/);
  });

  it('streams SSE tokens and ends with [DONE]', async () => {
    generateResponse.mockImplementation((_query, _history, onChunk) => {
      onChunk('Hello');
      onChunk(' world');
      return Promise.resolve();
    });

    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'hi' });

    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    expect(res.text).toContain('data: {"token":"Hello"}');
    expect(res.text).toContain('data: {"token":" world"}');
    expect(res.text).toContain('data: [DONE]');
  });

  it('strips invalid history entries silently', async () => {
    generateResponse.mockResolvedValue(undefined);

    await request(app).post('/api/v1/chat').send({
      message: 'hello',
      history: [
        { role: 'user', content: 'valid message' },
        { role: 'system', content: 'should be dropped' },
        { role: 'user', content: 123 },
        null,
        { role: 'assistant', content: 'a'.repeat(4001) },
        { role: 'assistant', content: 'also valid' },
      ],
    });

    const passedHistory = generateResponse.mock.calls[0][1];
    expect(passedHistory).toHaveLength(2);
    expect(passedHistory[0]).toEqual({ role: 'user', content: 'valid message' });
    expect(passedHistory[1]).toEqual({ role: 'assistant', content: 'also valid' });
  });

  it('emits an error event when generateResponse throws', async () => {
    const err = new Error('boom');
    err.status = 429;
    generateResponse.mockRejectedValue(err);

    const res = await request(app).post('/api/v1/chat').send({ message: 'hello' });
    expect(res.text).toContain('rate limit');
  });
});

describe('GET /heartbeat', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/heartbeat');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
