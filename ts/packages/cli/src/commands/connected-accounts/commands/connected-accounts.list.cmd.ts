import { Command, Options } from '@effect/cli';
import { Effect, Option, Schema } from 'effect';
import type { ConnectedAccountListParams } from '@composio/client/resources/connected-accounts';
import {
  ComposioClientSingleton,
  ConnectedAccountListResponse,
} from 'src/services/composio-clients';
import { TerminalUI } from 'src/services/terminal-ui';
import { requireAuth } from 'src/effects/require-auth';
import { clampLimit } from 'src/ui/clamp-limit';
import { redact } from 'src/ui/redact';
import {
  formatResolveCommandProjectError,
  resolveCommandProject,
} from 'src/services/command-project';
import { formatConnectedAccountsTable, formatConnectedAccountsJson } from '../format';

const toolkits = Options.text('toolkits').pipe(
  Options.withDescription(
    'Filter by toolkit slugs, comma-separated (e.g. "gmail" or "gmail,slack")'
  ),
  Options.optional
);

const userId = Options.text('user-id').pipe(
  Options.withDescription('Filter by user ID'),
  Options.optional
);

const status = Options.choice('status', [
  'INITIALIZING',
  'INITIATED',
  'ACTIVE',
  'FAILED',
  'EXPIRED',
  'INACTIVE',
  'REVOKED',
] as const).pipe(Options.withDescription('Filter by connection status'), Options.optional);

const limit = Options.integer('limit').pipe(
  Options.withDefault(30),
  Options.withDescription('Number of results per page (1-1000)')
);

/**
 * List connected accounts with optional filters.
 *
 * @example
 * ```bash
 * composio dev connected-accounts list
 * composio dev connected-accounts list --toolkits "gmail"
 * composio dev connected-accounts list --user-id "default" --status ACTIVE
 * ```
 */
export const connectedAccountsCmd$List = Command.make(
  'list',
  { toolkits, userId, status, limit },
  ({ toolkits, userId, status, limit }) =>
    Effect.gen(function* () {
      if (!(yield* requireAuth)) return;

      const ui = yield* TerminalUI;
      const clientSingleton = yield* ComposioClientSingleton;

      const toolkitSlugs = Option.isSome(toolkits)
        ? toolkits.value.split(',').map(s => s.trim())
        : undefined;
      const resolvedProject = yield* resolveCommandProject({
        mode: 'developer',
      }).pipe(Effect.mapError(formatResolveCommandProjectError));
      const client = yield* clientSingleton.getFor({
        orgId: resolvedProject.orgId,
        projectId: resolvedProject.projectId,
      });

      const rawResult = yield* ui.withSpinner(
        'Fetching connected accounts...',
        Effect.tryPromise(() =>
          client.connectedAccounts.list({
            toolkit_slugs: toolkitSlugs,
            user_ids: Option.isSome(userId) ? [userId.value] : undefined,
            // Bypass the stale Stainless union (still missing 'REVOKED')
            // until @composio/client is regenerated.
            statuses: Option.isSome(status)
              ? ([status.value] as ConnectedAccountListParams['statuses'])
              : undefined,
            limit: clampLimit(limit),
          })
        )
      );
      // The Composio server enum for connection statuses evolves on Apollo's
      // cadence (REVOKED was added in PR #9550; S2S_OAUTH2 revocation is queued
      // next). A closed `Schema.Literal(...)` in `ConnectedAccountItem` would
      // reject any future status and brick `composio dev connected-accounts list`
      // for every user — even those filtering on `--status ACTIVE`. Catch the
      // ParseError, warn, and degrade to the raw response so the table still
      // renders.
      const result = yield* Schema.decodeUnknown(ConnectedAccountListResponse)(rawResult).pipe(
        Effect.catchTag('ParseError', error =>
          Effect.gen(function* () {
            yield* ui.log.warn(
              `Server returned a connection field this CLI does not recognize ` +
                `(likely a newly-added status). Run "composio upgrade" to pick up ` +
                `the latest schema. Continuing with raw response.\n\n` +
                `Decode error: ${error.message}`
            );
            // Cast lies about the schema brand, but the downstream formatters
            // (`formatConnectedAccountsTable`, `formatConnectedAccountsJson`)
            // only read whitelisted fields — credential-bearing `state` /
            // `data` are never indexed, so the unvalidated raw payload is
            // safe to render as-is.
            return rawResult as ConnectedAccountListResponse;
          })
        )
      );

      if (result.items.length === 0) {
        let hint: string;
        if (Option.isSome(toolkits)) {
          hint = `No connected accounts found for toolkit "${toolkits.value}". Verify the toolkit slug with:\n> composio dev toolkits list`;
        } else if (Option.isSome(userId)) {
          hint = `No connected accounts found for user "${userId.value}".`;
        } else if (Option.isSome(status)) {
          hint = `No connected accounts found with status "${status.value}".`;
        } else {
          hint = 'No connected accounts found.';
        }
        yield* ui.log.warn(hint);
        return;
      }

      const showing = result.items.length;
      const total = result.total_items;

      yield* ui.log.info(
        `Listing ${showing} of ${total} connected accounts\n\n${formatConnectedAccountsTable(result.items)}`
      );

      // Next step hint
      const firstId = result.items[0]?.id;
      const redactedId = redact({ value: firstId, prefix: 'con_' });

      if (firstId) {
        yield* ui.log.step(
          `To view details of a connected account:\n> composio dev connected-accounts info "${redactedId}"`
        );
      }

      yield* ui.output(formatConnectedAccountsJson(result.items));
    })
).pipe(Command.withDescription('List connected accounts.'));
