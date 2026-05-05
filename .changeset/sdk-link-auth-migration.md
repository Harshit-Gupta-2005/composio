---
'@composio/core': minor
---

Add migration tooling for the [link auth migration](https://docs.composio.dev/docs/changelog/2026/04/24): callers using `composio.connectedAccounts.initiate()` for Composio-managed auth configs on redirectable OAuth schemes (OAuth1, OAuth2, DCR_OAUTH) now get a typed error and a one-time deprecation warning ahead of the **2026-07-03** all-orgs cutover.

- **Added:** `ComposioLegacyConnectedAccountsEndpointRetiredError`, exported from `@composio/core`. Thrown by `initiate()` when the underlying `POST /api/v3/connected_accounts` returns a 400 indicating the retiring path. Carries the migration message and a `possibleFixes` block pointing at `link()` and the migration guide.
- **Added:** one-time-per-process `console.warn` from `initiate()` when the response indicates a redirectable OAuth scheme. Wording is conditional ("If this auth config is Composio-managed…") so callers using custom OAuth apps or non-OAuth schemes can ignore it without ambiguity.
- **JSDoc:** `initiate()` now flags the retirement explicitly and points at `link()` for the affected combination. Custom auth configs and non-OAuth schemes (API key, bearer, basic) are unaffected.

No behavior change for any caller outside the Composio-managed-OAuth combination — `initiate()` continues to call the legacy endpoint, return the same `ConnectionRequest` shape, and respect the `allowMultiple` guard.
