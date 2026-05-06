"""
Tool Router direct_tools session preset with OpenAI Agents.

session_preset="direct_tools" is a shortcut for sessions where the full allowed
tool set is known upfront. It disables Tool Router meta/helper tools by default
and loads all tools allowed by the filters directly into session.tools() and the
MCP tool list.

Usage:
    COMPOSIO_API_KEY=... OPENAI_API_KEY=... python examples/tool_router/direct_tools_preset.py
"""

import os

from agents import Agent, Runner
from composio_openai_agents import OpenAIAgentsProvider

from composio import Composio


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Set {name} before running this example.")
    return value


composio = Composio(
    api_key=require_env("COMPOSIO_API_KEY"),
    provider=OpenAIAgentsProvider(),
)
require_env("OPENAI_API_KEY")

session = composio.create(
    user_id="direct-tools-example-user",
    session_preset="direct_tools",
    toolkits=["hackernews"],
    tools={"hackernews": {"enable": ["HACKERNEWS_GET_USER"]}},
)

tools = session.tools()
print("Direct tools exposed to the agent:")
for tool in tools:
    print(f"- {tool.name}")

agent = Agent(
    name="Direct Tools Demo Agent",
    instructions=(
        "Use the provided direct tools. The session is configured without Tool "
        "Router meta/helper tools."
    ),
    model=os.environ.get("OPENAI_MODEL", "gpt-5.5"),
    tools=tools,
)

result = Runner.run_sync(
    agent,
    'Use the Hacker News tool to look up user "pg" and report their karma.',
)
print(result.final_output)
