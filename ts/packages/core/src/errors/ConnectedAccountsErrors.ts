import { ComposioError, ComposioErrorOptions } from './ComposioError';

export const ConnectedAccountErrorCodes = {
  CONNECTED_ACCOUNT_NOT_FOUND: 'CONNECTED_ACCOUNT_NOT_FOUND',
  MULTIPLE_CONNECTED_ACCOUNTS: 'MULTIPLE_CONNECTED_ACCOUNTS',
  FAILED_TO_CREATE_CONNECTED_ACCOUNT_LINK: 'FAILED_TO_CREATE_CONNECTED_ACCOUNT_LINK',
  LEGACY_CONNECTED_ACCOUNTS_ENDPOINT_RETIRED: 'LEGACY_CONNECTED_ACCOUNTS_ENDPOINT_RETIRED',
} as const;

export class ComposioConnectedAccountNotFoundError extends ComposioError {
  constructor(
    message: string = 'Connected account not found',
    options: Omit<ComposioErrorOptions, 'code' | 'statusCode'> = {}
  ) {
    super(message, {
      ...options,
      code: ConnectedAccountErrorCodes.CONNECTED_ACCOUNT_NOT_FOUND,
      statusCode: 404,
      possibleFixes: options.possibleFixes || [
        'Ensure the connected account exists and is active in your Composio dashboard',
      ],
    });
    this.name = 'ComposioConnectedAccountNotFoundError';
  }
}

export class ComposioMultipleConnectedAccountsError extends ComposioError {
  constructor(
    message: string = 'Multiple connected accounts found',
    options: Omit<ComposioErrorOptions, 'code'> = {}
  ) {
    super(message, {
      ...options,
      code: ConnectedAccountErrorCodes.MULTIPLE_CONNECTED_ACCOUNTS,
      possibleFixes: options.possibleFixes || [
        'Use the allowMultiple flag to allow multiple connected accounts per user for an auth config',
      ],
    });
    this.name = 'ComposioMultipleConnectedAccountsError';
  }
}

export class ComposioFailedToCreateConnectedAccountLink extends ComposioError {
  constructor(
    message: string = 'Failed to create connected account link',
    options: Omit<ComposioErrorOptions, 'code'> = {}
  ) {
    super(message, {
      ...options,
      code: ConnectedAccountErrorCodes.FAILED_TO_CREATE_CONNECTED_ACCOUNT_LINK,
    });
    this.name = 'ComposioFailedToCreateConnectedAccountLink';
  }
}

/**
 * Thrown by `composio.connectedAccounts.initiate()` when the legacy
 * `POST /api/v3/connected_accounts` endpoint rejects a Composio-managed
 * OAuth (OAuth1, OAuth2, DCR_OAUTH) auth-config request.
 *
 * The retiring path is being phased out — new orgs from 2026-05-08 and
 * all remaining orgs from 2026-07-03. Migrate the call to
 * `composio.connectedAccounts.link()`, which works for every redirectable
 * scheme regardless of whether the auth config is Composio-managed or
 * custom.
 *
 * See: https://docs.composio.dev/docs/changelog/2026/04/24
 */
export class ComposioLegacyConnectedAccountsEndpointRetiredError extends ComposioError {
  constructor(
    message: string = 'POST /api/v3/connected_accounts is no longer supported for Composio-managed OAuth auth configs. Use composio.connectedAccounts.link() instead.',
    options: Omit<ComposioErrorOptions, 'code' | 'statusCode'> = {}
  ) {
    super(message, {
      ...options,
      code: ConnectedAccountErrorCodes.LEGACY_CONNECTED_ACCOUNTS_ENDPOINT_RETIRED,
      statusCode: 400,
      possibleFixes: options.possibleFixes || [
        'Replace `composio.connectedAccounts.initiate(userId, authConfigId, options)` with `composio.connectedAccounts.link(userId, authConfigId, options)`. The return shape (id, redirectUrl, waitForConnection()) is the same.',
        'Migration guide: https://docs.composio.dev/docs/changelog/2026/04/24',
      ],
    });
    this.name = 'ComposioLegacyConnectedAccountsEndpointRetiredError';
  }
}
