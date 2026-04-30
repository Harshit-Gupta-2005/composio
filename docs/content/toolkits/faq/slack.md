## What does the Composio + Slack integration do?

Composio turns Slack's API into ready-to-use tools that AI agents and automations can call. With the integration you can send and read messages, manage channels, upload files, react to events, search conversations, and more — all through a unified platform. Composio supports two toolkits: **Slack** (authenticate as a user for workspace-level actions) and **Slackbot** (authenticate as a bot for in-channel messaging, app mentions, and slash commands). Developers connect their Slack workspace once and then orchestrate any combination of these actions from their agents or workflows.

## How does Composio handle my Slack data?

Composio executes API calls on behalf of your connected account. All data is encrypted and subject to a 30-day retention policy. Authentication tokens are encrypted at rest and scoped to the permissions you grant during the OAuth flow. For full details on data handling, retention, and third-party data practices, see our [Privacy Policy](https://composio.dev/privacy).

## How do I set up custom OAuth credentials for Slack?

For a step-by-step guide on creating and configuring your own Slack OAuth credentials with Composio, see [How to create OAuth credentials for Slack](https://composio.dev/auth/slack).

## Why do users see "This app isn't listed in the Slack Marketplace…" during install?

This appears when a workspace **member** tries to install a non-Marketplace app and the workspace has **"Require apps from Slack Marketplace"** enabled. To resolve, either have a workspace **owner** install/authorize the app, disable **"Require apps from Slack Marketplace"** in the workspace's app management settings, or — recommended — use your own OAuth app credentials. See [How to create OAuth credentials for Slack](https://composio.dev/auth/slack).

## Do I have to be a Workspace Owner to install the app?

Only if the workspace blocks non-Marketplace apps. If **"Require apps from Slack Marketplace"** is enabled, then yes — a workspace owner must install our app. Otherwise, a member may proceed with the install themselves.

## Why am I being asked to submit a request during auth?

The workspace has **"Require approved apps"** enabled, so Slack is asking an admin or owner to approve the install before it can be completed. An admin must approve the request, or the setting must be disabled, before the connection can finish.

## How can a workspace member complete the connection without asking for permissions or approvals?

There are two ways:

- Disable both **"Require apps from Slack Marketplace"** and **"Require approved apps"** in the workspace's app management settings.
- Use the workspace's own OAuth app credentials (recommended — see below).

## What's the recommended solution for Slack install/approval friction?

Use your own OAuth app credentials. It's the safest option and avoids repeated owner/admin involvement on every install. See [How to create OAuth credentials for Slack](https://composio.dev/auth/slack).

## What is the difference between Slack and Slackbot toolkits?

Slack is for workspace-level API access (channels, files, users) while Slackbot is bot-centric (messaging, interactivity). Slack triggers cover workspace events; Slackbot covers bot entry points like app mentions, DMs, and slash commands. Slack can post as the app; Slackbot posts as the bot user.

## Where can I find Slack's available scopes?

See the [Slack scopes reference](https://docs.slack.dev/reference/scopes/).

## Why am I getting a redirect URI mismatch error?

Update the redirect URL in your Slack App under OAuth & Permissions → Redirect URLs.

## How do I set up Slack event webhooks?

Enable Event Subscriptions in your Slack app. Set the Request URL to `https://backend.composio.dev/api/v3.1/trigger_instances/slack/default/handle`. Add events (e.g., `reaction_added`) to Subscribe to Bot Events and save. If using the Slackbot integration, add the bot to the channels you want to monitor.

## Why am I getting scope errors on Slack?

Either you're missing a bot scope (add one under OAuth & Permissions) or you have "Insufficient scopes" (ensure all scopes from your auth config are configured in the Slack app).

## What does the `as_user` parameter do in Slack tools?

For the Slack toolkit, set `as_user=True` to post as the authenticated user. For Slackbot, leave it blank (defaults to false). A `missing_charset` error usually means invalid `as_user`, wrong channel ID, or missing required fields.

## Why aren't my Slack triggers working?

Provide the Verification Token or signing secret in the auth config so Composio can validate incoming events.

---
