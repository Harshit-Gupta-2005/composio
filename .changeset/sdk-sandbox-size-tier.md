---
'@composio/core': patch
---

Add `workbench.sandboxSize` to the Tool Router session config so callers can pick the workbench sandbox compute tier.

- **Added:** `workbench.sandboxSize?: 'standard' | 'medium' | 'large' | 'xlarge'` on `ToolRouterCreateSessionConfig`. Forwarded to the API as snake_case `workbench.sandbox_size`. Optional; the server defaults it to `'standard'` (1 vCPU / 1 GB) when omitted, so existing callers keep current behavior.
- **Added:** `SandboxSize` literal union and `SandboxSizeSchema` zod enum, exported from `@composio/core` so callers can pass tier values without stringly-typing them.
- **Bumped:** `@composio/client` peer to `0.1.0-alpha.67` to pick up the matching `sandbox_size` field on the Tool Router session params.

Tiers: `standard` (1 vCPU / 1 GB), `medium` (2 / 2), `large` (4 / 4), `xlarge` (8 / 8). Sandboxes are not billed today; usage-based pricing is planned. See the changelog entry at [`docs/content/changelog/04-28-26-sdk-sandbox-size.mdx`](https://github.com/ComposioHQ/composio/blob/master/docs/content/changelog/04-28-26-sdk-sandbox-size.mdx) for usage and the full tier table.

Provider packages that depend on `@composio/core` receive automatic patch bumps in the same release train via the changesets `updateInternalDependencies: "patch"` setting — no public-API change in those packages.
