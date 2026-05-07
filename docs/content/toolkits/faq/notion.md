## Why do Notion operations show "Composio" instead of the user's name?

Notion attributes actions to the integration itself, not the individual user. The name and logo shown come from the integration configuration. To use a custom name or logo, create your own Notion integration. See [Notion integration docs](https://developers.notion.com/docs/create-a-notion-integration).

## How do I grant access to more Notion pages?

Open Notion, go to Settings & Members, then Connections. Select the integration (Composio or your custom integration), click "Select pages" or "Manage access", and add or remove pages as needed.

## Does Notion use OAuth scopes?

No. Notion controls access by granting integrations access to specific pages and databases, not through scopes. You don't need to pass scopes when creating an auth config.

## How does Notion's access model work?

It depends on the integration type. OAuth apps (public) let users select which pages to share during authorization. Internal integrations (API key) have page access managed in the integration settings.

## How do I set up Notion webhook triggers?

**If you use Composio-managed Notion credentials**, nothing to set up — the webhook endpoint is already provisioned for your project. Create the trigger and you're done.

**If you bring your own Notion integration**, configure a webhook endpoint once per integration. Step-by-step:

1. **Discover what credentials Notion needs.** The schema endpoint is the source of truth for which fields you'll be asked to provide:

       curl "https://backend.composio.dev/api/v3.1/webhook_endpoints/schema?toolkit_slug=notion" \
         -H "x-api-key: <YOUR_COMPOSIO_API_KEY>"

2. **Create the endpoint:**

       curl -X POST "https://backend.composio.dev/api/v3.1/webhook_endpoints" \
         -H "x-api-key: <YOUR_COMPOSIO_API_KEY>" \
         -H "Content-Type: application/json" \
         -d '{ "toolkit_slug": "notion", "client_id": "<YOUR_NOTION_CLIENT_ID>" }'

   Save the `id` and `webhook_url` from the response.

3. **Add the `webhook_url`** from step 2 to your Notion integration's **Webhooks** settings (in the integration's configuration page on Notion's developer dashboard).

4. **Store the credentials returned by the schema** (step 1) on the endpoint via `PATCH` — use the field names exactly as they came back:

       curl -X PATCH "https://backend.composio.dev/api/v3.1/webhook_endpoints/<ENDPOINT_ID>" \
         -H "x-api-key: <YOUR_COMPOSIO_API_KEY>" \
         -H "Content-Type: application/json" \
         -d '{ "data": { "<FIELD_FROM_SCHEMA>": "<VALUE_FROM_NOTION>" } }'

5. **Confirm the endpoint is verified:**

       curl "https://backend.composio.dev/api/v3.1/webhook_endpoints/<ENDPOINT_ID>" \
         -H "x-api-key: <YOUR_COMPOSIO_API_KEY>"

   A populated `verified_at` means Notion completed the verification handshake. You can now create Notion triggers on this OAuth app.

For the full reference (PATCH vs POST update semantics, rotating credentials, listing endpoints), see [Configuring the webhook endpoint](https://docs.composio.dev/docs/setting-up-triggers/creating-triggers#configuring-the-webhook-endpoint).

---
