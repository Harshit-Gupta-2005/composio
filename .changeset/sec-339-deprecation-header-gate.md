---
'@composio/core': patch
---

Fix false-positive `initiate()` deprecation warning for custom auth configs (SEC-339 follow-up).

`composio.connectedAccounts.initiate()` previously emitted a one-time `console.warn` on every redirectable-OAuth response, regardless of whether the auth config was Composio-managed (subject to the 2026-07-03 cutover) or custom (unaffected). The wording was conditional ("If this auth config is Composio-managed…") so callers using their own OAuth apps could ignore it, but the warning still printed and caused noise in logs.

Apollo already emits the SEC-339 `Deprecation` / `Sunset` / `Link rel="deprecation"` headers (RFC 9745 / RFC 8594) **only** on the retiring branch — managed + redirectable OAuth. The SDK now reads the `Deprecation` header from the response (via `APIPromise.withResponse()`) and gates the warning on its presence. Custom auth configs and non-OAuth schemes get a clean response from the server and now stay silent in the SDK as well.

- **Behavior change:** No warning is emitted for `initiate()` calls against custom OAuth auth configs or non-OAuth schemes (API key, bearer, basic). Managed-OAuth callers continue to get exactly one warning per process, now with revised wording that points at the response's `Sunset` header for the precise cutover date.
- **No public API change:** `initiate()` returns the same `ConnectionRequest` shape and respects the same `allowMultiple` guard. `ComposioLegacyConnectedAccountsEndpointRetiredError` continues to surface from the 400 retired-path response.
- **Test scaffolding:** new mock helper `mockApiPromiseWithHeaders()` in `connectedAccounts.test.ts` wraps a value as an `APIPromise`-shaped thenable so the new tests can simulate apollo's header behavior. Pre-existing initiate tests using `mockResolvedValueOnce` continue to pass via the SDK's defensive fallback when `withResponse` is absent on the mock.

Python SDK gets the matching change in the same release train.
