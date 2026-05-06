/**
 * Tool Router direct_tools session preset with OpenAI Agents
 *
 * `sessionPreset: "direct_tools"` is a shortcut for sessions where the full
 * allowed tool set is known upfront. It disables Tool Router meta/helper tools
 * by default and loads all tools allowed by the filters directly into
 * `session.tools()` and the MCP tool list.
 *
 * Usage:
 *   COMPOSIO_API_KEY=... OPENAI_API_KEY=... bun src/direct-tools-preset.ts
 */
import 'dotenv/config';
import { Composio } from '@composio/core';
import { OpenAIAgentsProvider } from '@composio/openai-agents';
import { Agent, run } from '@openai/agents';

function requireEnv(name: 'COMPOSIO_API_KEY' | 'OPENAI_API_KEY'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Set ${name} before running this example.`);
  }
  return value;
}

const composioApiKey = requireEnv('COMPOSIO_API_KEY');
requireEnv('OPENAI_API_KEY');

const composio = new Composio({
  apiKey: composioApiKey,
  baseURL: process.env.COMPOSIO_BASE_URL || undefined,
  provider: new OpenAIAgentsProvider(),
});

const session = await composio.create(`direct-tools-example-${Date.now()}`, {
  sessionPreset: 'direct_tools',
  toolkits: ['hackernews'],
  tools: {
    hackernews: {
      enable: ['HACKERNEWS_GET_USER'],
    },
  },
});

const tools = await session.tools();
console.log('Direct tools exposed to the agent:');
for (const tool of tools) {
  console.log(`- ${tool.name}`);
}

const agent = new Agent({
  name: 'Direct Tools Demo Agent',
  instructions:
    'Use the provided direct tools. The session is configured without Tool Router meta/helper tools.',
  model: process.env.OPENAI_MODEL ?? 'gpt-5.1',
  tools,
});

const prompt =
  process.argv.slice(2).join(' ') ||
  'Use the Hacker News tool to look up user "pg" and report their karma.';

console.log(`\nUser: ${prompt}\n`);
const result = await run(agent, prompt);
console.log(`Assistant: ${result.finalOutput}`);
