---
'@composio/core': minor
---

Add custom tools support to `composio.use()` and update `connectedAccounts` to array type.

- **`composio.use(id, { customTools, customToolkits })`**: Attach custom tools to an existing session. Calls the v3.1 `/attach` endpoint to bind local tools for search and execution. Without customs, falls back to the standard session retrieve.
- **Inline custom tools payload**: `use()` now correctly passes `inlineCustomToolsPayload` and `preloadedCustomToolSlugs` to the session, enabling custom tool execution and preloading on rehydrated sessions.
- **`connectedAccounts` type change**: Updated from `Record<string, string>` to `Record<string, string[]>` to match the v3.1 API. Only one account per toolkit is allowed when multi-account mode is disabled.
- **`CustomToolsMap.tools`**: The map now caches the raw `CustomTool[]` array for future inline re-injection on v3.1 search/execute requests.
- **`@composio/client`**: Bumped to `0.1.0-alpha.70`.
