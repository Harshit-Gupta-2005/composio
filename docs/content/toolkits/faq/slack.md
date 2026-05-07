## What does the Composio + Slack integration do?

Composio turns Slack's API into ready-to-use tools that AI agents and automations can call. With the integration you can send and read messages, manage channels, upload files, react to events, search conversations, and more — all through a unified platform. Composio supports two toolkits: **Slack** (authenticate as a user for workspace-level actions) and **Slackbot** (authenticate as a bot for in-channel messaging, app mentions, and slash commands). Developers connect their Slack workspace once and then orchestrate any combination of these actions from their agents or workflows.

## How does Composio handle my Slack data?

Composio executes API calls on behalf of your connected account. All data is encrypted and subject to a 30-day retention policy. Authentication tokens are encrypted at rest and scoped to the permissions you grant during the OAuth flow. For full details on data handling, retention, and third-party data practices, see our [Privacy Policy](https://composio.dev/privacy).

## How do I set up custom OAuth credentials for Slack?

For a step-by-step guide on creating and configuring your own Slack OAuth credentials with Composio, see [How to create OAuth credentials for Slack](https://composio.dev/auth/slack).

## What is the difference between Slack and Slackbot toolkits?

Slack is for workspace-level API access (channels, files, users) while Slackbot is bot-centric (messaging, interactivity). Slack triggers cover workspace events; Slackbot covers bot entry points like app mentions, DMs, and slash commands. Slack can post as the app; Slackbot posts as the bot user.

## Where can I find Slack's available scopes?

See the [Slack scopes reference](https://docs.slack.dev/reference/scopes/).

## Why am I getting a redirect URI mismatch error?

Update the redirect URL in your Slack App under OAuth & Permissions → Redirect URLs.

## How do I set up Slack event webhooks?

**If you use Composio-managed Slack credentials**, nothing to set up — the webhook endpoint is already provisioned for your project. Create the trigger and you're done.

**If you bring your own Slack OAuth app**, configure a webhook endpoint once per OAuth app. Step-by-step:

1. **Create the endpoint:**

       curl -X POST "https://backend.composio.dev/api/v3.1/webhook_endpoints" \
         -H "x-api-key: <YOUR_COMPOSIO_API_KEY>" \
         -H "Content-Type: application/json" \
         -d '{ "toolkit_slug": "slack", "client_id": "<YOUR_SLACK_CLIENT_ID>" }'

   Save the `id` and `webhook_url` from the response.

2. **Store your signing secret on the endpoint** (Slack app → Basic Information → App Credentials → Signing Secret):

       curl -X PATCH "https://backend.composio.dev/api/v3.1/webhook_endpoints/<ENDPOINT_ID>" \
         -H "x-api-key: <YOUR_COMPOSIO_API_KEY>" \
         -H "Content-Type: application/json" \
         -d '{ "data": { "webhook_signing_secret": "<SIGNING_SECRET>" } }'

3. **For DMs, private channels, and reactions, also store an app-level token** (Slack app → Basic Information → App-Level Tokens, scope `authorizations:read`):

       curl -X PATCH "https://backend.composio.dev/api/v3.1/webhook_endpoints/<ENDPOINT_ID>" \
         -H "x-api-key: <YOUR_COMPOSIO_API_KEY>" \
         -H "Content-Type: application/json" \
         -d '{ "data": { "app_token": "xapp-..." } }'

4. **Set Slack app → Event Subscriptions → Request URL** to the `webhook_url` from step 1. Composio responds to Slack's `url_verification` challenge automatically.

5. **Subscribe to the events you need** under Event Subscriptions and save.

If you're using the Slackbot integration, add the bot to the channels you want to monitor.

For the full reference (PATCH vs POST update semantics, listing endpoints, troubleshooting), see [Configuring the webhook endpoint](https://docs.composio.dev/docs/setting-up-triggers/creating-triggers#configuring-the-webhook-endpoint).

## Why am I getting scope errors on Slack?

Either you're missing a bot scope (add one under OAuth & Permissions) or you have "Insufficient scopes" (ensure all scopes from your auth config are configured in the Slack app).

## What does the `as_user` parameter do in Slack tools?

For the Slack toolkit, set `as_user=True` to post as the authenticated user. For Slackbot, leave it blank (defaults to false). A `missing_charset` error usually means invalid `as_user`, wrong channel ID, or missing required fields.

## Why aren't my Slack triggers working?

If you bring your own Slack OAuth app, the most common cause is a missing or wrong **signing secret on the webhook endpoint** — every inbound request fails signature verification with `400`, and Slack auto-disables the URL after about 36 hours of consecutive failures. Confirm the endpoint is set up correctly:

    curl "https://backend.composio.dev/api/v3.1/webhook_endpoints" \
      -H "x-api-key: <YOUR_COMPOSIO_API_KEY>"

Look for an endpoint with your `client_id` and a populated `verified_at`. If `verified_at` is null, the URL hasn't completed Slack's `url_verification` handshake yet — re-save the URL on Slack app → Event Subscriptions. If you don't see an endpoint at all, follow [How do I set up Slack event webhooks?](#how-do-i-set-up-slack-event-webhooks) above.

For DMs, private channels, or reactions, also confirm the endpoint has an `app_token` set. See [Triggers troubleshooting](https://docs.composio.dev/docs/troubleshooting/triggers) for the full list of failure modes.

---
