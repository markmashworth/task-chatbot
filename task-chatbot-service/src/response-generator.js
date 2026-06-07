import OpenAI from 'openai';
import config from '../config/config.js';
import { TOOL_DEFINITIONS, executeTool } from './tools.js';
import { SYSTEM_PROMPT } from './prompts.js';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

export async function generateResponse(query, history = [], onChunk) {
  const nonSystemHistory = history.filter((m) => m.role !== 'system');
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...nonSystemHistory,
    { role: 'user', content: query },
  ];

  const first = await openai.chat.completions.create({
    model: config.openai.model,
    temperature: config.openai.temperature,
    messages,
    tools: TOOL_DEFINITIONS,
    tool_choice: 'auto',
  });

  const choice = first.choices[0];

  // No tool calls, emit as a single chunk
  if (choice.finish_reason !== 'tool_calls') {
    onChunk(choice.message.content ?? '');
    return;
  }

  // Append the assistant turn that contains the tool_calls
  messages.push(choice.message);

  // Execute all tool calls
  const toolResults = await Promise.all(
    choice.message.tool_calls.map(async (tc) => {
      try {
        const args = JSON.parse(tc.function.arguments);
        const content = await executeTool(tc.function.name, args);
        return { tool_call_id: tc.id, content };
      } catch (err) {
        console.error('Tool execution error:', err);
        return { tool_call_id: tc.id, content: 'Tool execution failed — data unavailable.' };
      }
    }),
  );

  for (const result of toolResults) {
    messages.push({ role: 'tool', tool_call_id: result.tool_call_id, content: result.content });
  }

  // Second call: stream the answer as we receive chunks
  const stream = await openai.chat.completions.create({
    model: config.openai.model,
    temperature: config.openai.temperature,
    messages,
    stream: true,
  });

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content;
    if (token) onChunk(token);
  }
}
