---
'@composio/core': minor
---

Add expanded ToolRouter session controls for agent workflows. `composio.create()`
now creates a fresh session on each call for better isolation and observability,
while `composio.use()` can resume an existing session for multi-turn
conversations. Sessions can preload frequently used tools, expose custom tools
directly from `session.tools()`, use a direct-tools preset for agents that know
their tool set upfront, and update session config mid-session with
`session.update()`.
