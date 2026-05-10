---
'@composio/core': minor
---

Add `accountType` and per-user ACL support for SHARED connected accounts (Hermes #9860, #9882, #9902).

Surfaces three Apollo-side features that previously had no SDK wrappers:

- **`accountType` on create**: `composio.connectedAccounts.link(userId, authConfigId, { accountType: 'SHARED' })` creates a SHARED connection. Default remains `PRIVATE`. SHARED is reachable from a tool-router session by other users in the project, but only when explicitly pinned and only when the requesting `userId` passes the connection's ACL.
- **`accountType` on retrieve**: `get()` and `list()` responses now include `accountType` (`'PRIVATE' | 'SHARED'`).
- **`updateAcl()` method** (new): `composio.connectedAccounts.updateAcl(nanoid, { allowAllUsers, allowedUserIds, notAllowedUserIds })` writes the per-user ACL on a SHARED connection via `PATCH /connected_accounts/{id}`. Backend rejects ACL writes on PRIVATE rows with `ComposioAclOnlyForSharedError` (400). PATCH semantics — omit a field to leave it unchanged; pass an empty array to clear an allow/deny list.
- **ACL fields on retrieve**: `get()` and `list()` responses expose `allowAllUsers`, `allowedUserIds`, `notAllowedUserIds` when the caller is the connection's creator or is using a project/org API key. Other callers see the row without these fields (left as `undefined` in the SDK shape).

ACL resolution rule (deny wins):

1. requesting `userId` ∈ `notAllowedUserIds` → DENY
2. `allowAllUsers === true` → ALLOW
3. requesting `userId` ∈ `allowedUserIds` → ALLOW
4. otherwise → DENY (deny-by-default)

New error classes:

- `ComposioSharedAccessDeniedError` (403) — surfaces from direct `connectedAccountId` execution paths when the requesting user fails the ACL.
- `ComposioAclOnlyForSharedError` (400) — sent ACL fields on a PRIVATE row.
- `ComposioSharedConnectionNotAccessibleError` (400) — tool-router session create / PATCH with a pinned SHARED connection the session user cannot use.

No breaking changes. Existing `link()` callers without `accountType` get a `PRIVATE` connection exactly as today; existing `get()` / `list()` callers see new optional fields.

Python SDK gets the matching change in the same release train.
