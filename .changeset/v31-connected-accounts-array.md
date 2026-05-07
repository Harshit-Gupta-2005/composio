---
'@composio/core': minor
---

`connectedAccounts` now accepts both `string` and `string[]` per toolkit.

A single string is automatically coerced to an array to match the v3.1 API wire format. Existing callers passing `{ gmail: "ca_xxx" }` continue to work without changes. Only one account per toolkit is allowed when multi-account mode is disabled. Bumps `@composio/client` to `0.1.0-alpha.70`.
