---
'@composio/core': minor
---

Add custom tools support to `composio.use()`.

- **`composio.use(id, { customTools, customToolkits })`**: Attach custom tools to an existing session. Binds local tools for search and execution. When called without custom tools, falls back to the standard session retrieve.
- **Inline custom tools payload**: `use()` now correctly passes `inlineCustomToolsPayload` and `preloadedCustomToolSlugs` to the session, enabling custom tool execution and preloading on rehydrated sessions.
- **`CustomToolsMap.tools`**: The map now caches the raw `CustomTool[]` array for future inline re-injection on v3.1 search/execute requests.
