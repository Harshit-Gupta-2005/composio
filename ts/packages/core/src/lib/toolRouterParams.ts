import {
  SessionCreateParams,
  SessionPatchParams,
} from '@composio/client/resources/tool-router/session/session.mjs';
import {
  ToolRouterConfigTags,
  ToolRouterConfigTools,
  ToolRouterConfigToolsSchema,
  ToolRouterToolsParam,
  ToolRouterConfigManageConnectionsSchema,
  ToolRouterCreateSessionConfig,
  ToolRouterToolkitsParamSchema,
  ToolRouterToolkitsDisabledConfigSchema,
  ToolRouterToolkitsEnabledConfigSchema,
  ToolRouterUpdateSessionConfig,
} from '../types/toolRouter.types';
import { ValidationError } from '../errors';
import { z } from 'zod';

export const transformToolRouterToolsParams = (
  params?: Record<string, ToolRouterToolsParam | ToolRouterConfigTools> | undefined
):
  | Record<
      string,
      SessionCreateParams.Enable | SessionCreateParams.Disable | SessionCreateParams.Tags
    >
  | undefined => {
  if (!params) {
    return undefined;
  }

  if (typeof params === 'object') {
    const result = Object.keys(params).reduce(
      (acc, key) => {
        if (Array.isArray(params[key])) {
          acc[key] = { enable: params[key] };
        } else if (typeof params[key] === 'object') {
          const parsedResult = ToolRouterConfigToolsSchema.safeParse(params[key]);
          if (parsedResult.success) {
            const data = parsedResult.data;
            if (Array.isArray(data)) {
              acc[key] = { enable: data };
            } else if ('enable' in data) {
              acc[key] = { enable: data.enable };
            } else if ('disable' in data) {
              acc[key] = { disable: data.disable };
            } else if ('tags' in data) {
              const tags = transformToolRouterTagsParams(data.tags);
              if (tags) {
                acc[key] = { tags };
              }
            }
          } else {
            throw new ValidationError(parsedResult.error.message);
          }
        } else {
          acc[key] = { enable: params[key] };
        }
        return acc;
      },
      {} as Record<
        string,
        SessionCreateParams.Enable | SessionCreateParams.Disable | SessionCreateParams.Tags
      >
    );
    return result;
  }
};

export const transformToolRouterTagsParams = (
  params?: ToolRouterConfigTags
): SessionCreateParams.Tags['tags'] | undefined => {
  if (!params) {
    return undefined;
  }
  if (Array.isArray(params)) {
    return { enable: params };
  } else if (typeof params === 'object') {
    return {
      enable: params.enable,
      disable: params.disable,
    };
  }
};

export const transformToolRouterManageConnectionsParams = (
  params?: boolean | z.infer<typeof ToolRouterConfigManageConnectionsSchema>
): SessionCreateParams.ManageConnections => {
  if (params === undefined) {
    // Default case when params is undefined
    return {
      enable: true,
    };
  }

  if (typeof params === 'boolean') {
    return {
      enable: params,
    };
  }

  // Parse the params using the zod schema for type safety
  const parsedResult = ToolRouterConfigManageConnectionsSchema.safeParse(params);
  if (!parsedResult.success) {
    throw new ValidationError('Failed to parse manage connections config', {
      cause: parsedResult.error,
    });
  }

  const config = parsedResult.data;
  return {
    enable: config.enable ?? true,
    callback_url: config.callbackUrl,
    enable_wait_for_connections: config.waitForConnections,
  };
};

export const transformToolRouterWorkbenchParams = (
  params?: ToolRouterCreateSessionConfig['workbench']
): SessionCreateParams.Workbench | undefined => {
  if (!params) {
    return undefined;
  }

  return {
    enable: params.enable ?? true,
    enable_proxy_execution: params.enableProxyExecution,
    auto_offload_threshold: params.autoOffloadThreshold,
    sandbox_size: params.sandboxSize,
  };
};

export const transformToolRouterMultiAccountParams = (
  params?: ToolRouterCreateSessionConfig['multiAccount']
): SessionCreateParams.MultiAccount | undefined => {
  if (!params) {
    return undefined;
  }

  const transformedParams = {
    enable: params.enable,
    max_accounts_per_toolkit: params.maxAccountsPerToolkit,
    require_explicit_selection: params.requireExplicitSelection,
  };

  if (
    transformedParams.enable === undefined &&
    transformedParams.max_accounts_per_toolkit === undefined &&
    transformedParams.require_explicit_selection === undefined
  ) {
    return undefined;
  }

  return transformedParams;
};

export const transformToolRouterToolkitsParams = (
  params?: ToolRouterCreateSessionConfig['toolkits']
): SessionCreateParams.Enable | SessionCreateParams.Disable | undefined => {
  if (!params) {
    return undefined;
  }

  // If it's an array, convert to enable format
  if (Array.isArray(params)) {
    return { enable: params };
  }

  // Otherwise return as-is (already in enable/disable format)
  return params as SessionCreateParams.Enable | SessionCreateParams.Disable;
};

export const transformToolRouterUpdateParams = (
  config: ToolRouterUpdateSessionConfig
): SessionPatchParams => {
  const params: SessionPatchParams = {};

  if (config.toolkits !== undefined) {
    params.toolkits = transformToolRouterToolkitsParams(config.toolkits);
  }
  if (config.tools !== undefined) {
    params.tools = transformToolRouterToolsParams(config.tools);
  }
  if (config.tags !== undefined) {
    params.tags = transformToolRouterTagsParams(config.tags);
  }
  if (config.authConfigs !== undefined) {
    params.auth_configs = config.authConfigs;
  }
  if (config.connectedAccounts !== undefined) {
    params.connected_accounts = config.connectedAccounts;
  }
  if (config.manageConnections !== undefined) {
    if (config.manageConnections === null) {
      params.manage_connections = null;
    } else {
      params.manage_connections = transformToolRouterManageConnectionsParams(config.manageConnections);
    }
  }
  if (config.workbench !== undefined) {
    if (config.workbench === null) {
      params.workbench = null;
    } else {
      params.workbench = transformToolRouterWorkbenchParams(config.workbench);
    }
  }
  if (config.multiAccount !== undefined) {
    if (config.multiAccount === null) {
      params.multi_account = null;
    } else {
      params.multi_account = transformToolRouterMultiAccountParams(config.multiAccount);
    }
  }
  if (config.preload !== undefined) {
    params.preload = config.preload;
  }

  return params;
};
