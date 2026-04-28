---
'@composio/core': patch
---

Bring `connectedAccounts.link()` to parity with `connectedAccounts.initiate()` by adding the `allowMultiple` option and the matching active-connection guard. With customers being migrated off `connected_accounts/create` (initiate) onto `connected_accounts/link` ([SEC-339](https://github.com/ComposioHQ/composio/pull/3274)), the guard moves with them.

- **Added:** `link(userId, authConfigId, { allowMultiple })`. When `allowMultiple` is `false` (default) and the user already has an `ACTIVE` connection on the auth config, `link()` throws `ComposioMultipleConnectedAccountsError` — same behavior as `initiate()`. Pair with `alias` and a session-level `multiAccount` config to disambiguate at execution time.
- **Behavior change:** `link()` now performs a `connectedAccounts.list({ userIds, authConfigIds, statuses: ['ACTIVE'] })` pre-flight before calling `client.link.create`. Callers that intentionally create multiple connections per auth config must pass `allowMultiple: true`.

Python parity: same option (`allow_multiple: bool = False`) and same guard added to `composio.connected_accounts.link()`.
