---
'@composio/core': minor
---

feat(connected-accounts): namespace SHARED-connection surface under `experimental`

Aligns the TypeScript SDK with the experimental wire shape used by Shared Connections. The flat `accountType` / `aclConfigForShared` options on `connectedAccounts.link()` and `session.authorize()` have moved under a single `experimental` block, and `connectedAccounts.updateAcl()` has moved off the class onto a top-level `experimental_updateAcl(composio, id, opts)` export — same precedent as `experimental_createTool` / `experimental_createToolkit`.

The `experimental` namespace is the signal that the shape may change in future releases. Pinning a SHARED connection in a session config (`connectedAccounts: { gmail: [...] }`) and direct execute by `connectedAccountId` are unchanged — only the connection-create / patch / authorize surfaces are namespaced.

Also surfaces the `accountType` filter on `connectedAccounts.list()` so SHARED connections can be listed without dropping to the raw client. The wire keeps this as a flat query param, so the SDK keeps it flat too.

`@composio/client` bumped from `0.1.0-alpha.71` → `0.1.0-alpha.72` so the generated typed client carries the `Experimental` namespaces for `link.create`, `toolRouter.session.link`, and `connectedAccounts.patch`.

Caller migration:

```typescript
// before
await composio.connectedAccounts.link('user_id', 'auth_config_id', {
  accountType: 'SHARED',
  aclConfigForShared: { allowAllUsers: true },
});
await composio.connectedAccounts.updateAcl('ca_abc', { allowAllUsers: true });
await session.authorize('github', {
  accountType: 'SHARED',
  aclConfigForShared: { allowAllUsers: true },
});

// after
await composio.connectedAccounts.link('user_id', 'auth_config_id', {
  experimental: {
    accountType: 'SHARED',
    aclConfigForShared: { allowAllUsers: true },
  },
});
await experimental_updateAcl(composio, 'ca_abc', { allowAllUsers: true });
await session.authorize('github', {
  experimental: {
    accountType: 'SHARED',
    aclConfigForShared: { allowAllUsers: true },
  },
});

// new — list SHARED connections
const shared = await composio.connectedAccounts.list({
  accountType: 'SHARED',
  userIds: ['user_creator'],
});
```
