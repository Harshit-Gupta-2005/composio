/**
 * ToolRouter class for managing tool router sessions.
 *
 * @description Allows you to create an isolated toolRouter MCP session for a user
 * @example
 * ```typescript
 * import { Composio } from '@composio/core';
 *
 * const composio = new Composio();
 * const userId = 'user_123';
 *
 * const session = await composio.experimental.create(userId, {
 *   toolkits: ['gmail'],
 *   manageConnections: true
 * });
 *
 * console.log(session.mcp.url);
 * ```
 */
import { Composio as ComposioClient } from '@composio/client';
import { telemetry } from '../telemetry/Telemetry';
import { BaseComposioProvider } from '../provider/BaseProvider';
import { ComposioConfig } from '../composio';
import {
  ToolRouterCreateSessionConfig,
  Session,
  SessionExperimental,
  MCPServerType,
  ToolRouterMCPServerConfig,
  ToolRouterSessionMetadata,
} from '../types/toolRouter.types';
import { ToolRouterCreateSessionConfigSchema } from '../types/toolRouter.types';
import {
  SessionCreateParams,
  SessionCreateResponse,
  SessionRetrieveResponse,
} from '@composio/client/resources/tool-router/session/session.mjs';
import type { CustomTool, CustomToolkit, InlineCustomToolsWirePayload } from '../types/customTool.types';
import {
  transformToolRouterTagsParams,
  transformToolRouterToolsParams,
  transformToolRouterManageConnectionsParams,
  transformToolRouterWorkbenchParams,
  transformToolRouterToolkitsParams,
  transformToolRouterMultiAccountParams,
} from '../lib/toolRouterParams';
import { ToolRouterSession } from './ToolRouterSession';
import {
  assertNoCustomToolSlugsInPreload,
  buildCustomToolsMap,
  buildCustomToolsMapFromResponse,
  getPreloadedCustomToolSlugs,
  serializeCustomTools,
  serializeCustomToolkits,
} from './CustomTool';
import type { CustomToolsMap } from '../types/customTool.types';

function getSessionMetadata(session: SessionCreateResponse | SessionRetrieveResponse) {
  const metadata: ToolRouterSessionMetadata = {
    preload: session.config.preload,
    configVersion: session.config_version,
    warnings: 'warnings' in session ? (session.warnings ?? []) : [],
  };
  return metadata;
}

export class ToolRouter<
  TToolCollection,
  TTool,
  TProvider extends BaseComposioProvider<TToolCollection, TTool, unknown>,
> {
  constructor(
    private client: ComposioClient,
    private config?: ComposioConfig<TProvider>
  ) {
    telemetry.instrument(this, 'ToolRouter');
  }

  private createMCPServerConfig({
    type,
    url,
  }: {
    type: MCPServerType;
    url: string;
  }): ToolRouterMCPServerConfig {
    return {
      type,
      url,
      headers: {
        ...(this.config?.apiKey ? { 'x-api-key': this.config.apiKey } : {}),
      },
    };
  }

  /**
   * Creates a new tool router session for a user.
   *
   * @param userId {string} The user id to create the session for
   * @param config {ToolRouterCreateSessionConfig} The config for the tool router session
   * @returns {Promise<Session<TToolCollection, TTool, TProvider>>} The tool router session
   *
   * @example
   * ```typescript
   * import { Composio, experimental_createTool } from '@composio/core';
   *
   * const composio = new Composio();
   *
   * const session = await composio.create('user_123', {
   *   toolkits: ['gmail'],
   *   manageConnections: true,
   *   experimental: {
   *     customTools: [myCustomTool],
   *     customToolkits: [myToolkit],
   *   },
   * });
   *
   * // Custom tools are searched by default. Set `preload: true` on a custom
   * // tool or toolkit to expose it directly from `session.tools()`.
   *
   * // Expose all tools allowed by filters directly, without meta/helper tools.
   * // `preload.tools = "all"` requires a positive filter such as `toolkits`.
   * const directSession = await composio.create('user_123', {
   *   sessionPreset: 'direct_tools',
   *   toolkits: ['github'],
   * });
   * ```
   */
  async create(
    userId: string,
    config?: ToolRouterCreateSessionConfig
  ): Promise<Session<TToolCollection, TTool, TProvider>> {
    const routerConfig = ToolRouterCreateSessionConfigSchema.parse(config ?? {});
    const isDirectToolsPreset = routerConfig.sessionPreset === 'direct_tools';

    // Extract custom tools/toolkits from experimental config
    const customTools = routerConfig.experimental?.customTools;
    const customToolkits = routerConfig.experimental?.customToolkits;
    const defaultCustomPreload = routerConfig.preload?.tools === 'all';
    const localCustomToolsMap =
      customTools?.length || customToolkits?.length
        ? buildCustomToolsMap(customTools ?? [], customToolkits)
        : undefined;
    assertNoCustomToolSlugsInPreload(routerConfig.preload?.tools, localCustomToolsMap);

    // Build the typed experimental payload for the backend
    const experimentalPayload: SessionCreateParams['experimental'] = {};

    if (routerConfig.experimental?.assistivePrompt?.userTimezone) {
      experimentalPayload.assistive_prompt_config = {
        user_timezone: routerConfig.experimental.assistivePrompt.userTimezone,
      };
    }

    if (customTools?.length) {
      experimentalPayload.custom_tools = serializeCustomTools(customTools, {
        defaultPreload: defaultCustomPreload,
      });
    }
    if (customToolkits?.length) {
      experimentalPayload.custom_toolkits = serializeCustomToolkits(customToolkits, {
        defaultPreload: defaultCustomPreload,
      });
    }
    const inlineCustomToolsPayload =
      experimentalPayload.custom_tools || experimentalPayload.custom_toolkits
        ? {
            ...(experimentalPayload.custom_tools
              ? { custom_tools: experimentalPayload.custom_tools }
              : {}),
            ...(experimentalPayload.custom_toolkits
              ? { custom_toolkits: experimentalPayload.custom_toolkits }
              : {}),
          }
        : undefined;

    const multiAccountPayload = transformToolRouterMultiAccountParams(routerConfig.multiAccount);

    const payload: SessionCreateParams = {
      user_id: userId,
      auth_configs: routerConfig.authConfigs,
      connected_accounts: routerConfig.connectedAccounts,
      toolkits: transformToolRouterToolkitsParams(routerConfig.toolkits),
      tools: transformToolRouterToolsParams(routerConfig.tools),
      tags: transformToolRouterTagsParams(routerConfig.tags),
      manage_connections: transformToolRouterManageConnectionsParams(
        routerConfig.manageConnections
      ),
      workbench: transformToolRouterWorkbenchParams(routerConfig.workbench),
      multi_account: multiAccountPayload,
      preload: routerConfig.preload,
      ...(isDirectToolsPreset && {
        search: { enable: false },
        execute: { enable_multi_execute: false },
      }),
      experimental: Object.keys(experimentalPayload).length > 0 ? experimentalPayload : undefined,
    };

    const session = await this.client.toolRouter.session.create(payload);

    // Build custom tools map from the response's slug/original_slug mapping
    // instead of computing LOCAL_ prefix client-side
    let customToolsMap: CustomToolsMap | undefined;
    if (customTools?.length || customToolkits?.length) {
      customToolsMap = buildCustomToolsMapFromResponse(
        customTools ?? [],
        customToolkits,
        session.experimental
      );
    }
    const metadata = {
      ...getSessionMetadata(session),
      preloadedCustomToolSlugs: getPreloadedCustomToolSlugs(customToolsMap, defaultCustomPreload),
      inlineCustomToolsPayload,
    };

    const assistivePrompt = session.experimental?.assistive_prompt;

    return new ToolRouterSession<TToolCollection, TTool, TProvider>(
      this.client,
      this.config,
      session.session_id,
      this.createMCPServerConfig(session.mcp),
      { assistivePrompt },
      customToolsMap,
      userId,
      metadata
    );
  }

  /**
   * Use an existing session
   * @param id {string} The id of the session to use
   * @returns {Promise<Session<TToolCollection, TTool, TProvider>>} The tool router session
   *
   * @example
   * ```typescript
   * import { Composio } from '@composio/core';
   *
   * const composio = new Composio();
   * const id = 'session_123';
   * const session = await composio.toolRouter.use(id);
   *
   * console.log(session.mcp.url);
   * console.log(session.mcp.headers);
   * ```
   */
  async use(
    id: string,
    options?: { customTools?: CustomTool[]; customToolkits?: CustomToolkit[] }
  ): Promise<Session<TToolCollection, TTool, TProvider>> {
    const customTools = options?.customTools;
    const customToolkits = options?.customToolkits;
    const hasCustoms = !!(customTools?.length || customToolkits?.length);

    let session: SessionRetrieveResponse;
    let inlineCustomToolsPayload: InlineCustomToolsWirePayload | undefined;

    if (hasCustoms) {
      const serializedTools = customTools?.length ? serializeCustomTools(customTools) : undefined;
      const serializedToolkits = customToolkits?.length
        ? serializeCustomToolkits(customToolkits)
        : undefined;

      const experimentalPayload: {
        custom_tools?: SessionCreateParams.Experimental.CustomTool[];
        custom_toolkits?: SessionCreateParams.Experimental.CustomToolkit[];
      } = {};
      if (serializedTools) experimentalPayload.custom_tools = serializedTools;
      if (serializedToolkits) experimentalPayload.custom_toolkits = serializedToolkits;

      inlineCustomToolsPayload = {
        ...(serializedTools ? { custom_tools: serializedTools } : {}),
        ...(serializedToolkits ? { custom_toolkits: serializedToolkits } : {}),
      };

      session = await this.client.post<SessionRetrieveResponse>(
        `/api/v3.1/tool_router/session/${encodeURIComponent(id)}/attach`,
        { body: { experimental: experimentalPayload } }
      );
    } else {
      session = await this.client.toolRouter.session.retrieve(id);
    }

    let customToolsMap: CustomToolsMap | undefined;
    let userId: string | undefined;
    if (hasCustoms) {
      customToolsMap = buildCustomToolsMapFromResponse(
        customTools ?? [],
        customToolkits,
        session.experimental
      );
      userId = session.config.user_id;
    }

    const metadata = {
      ...getSessionMetadata(session),
      preloadedCustomToolSlugs: getPreloadedCustomToolSlugs(customToolsMap),
      inlineCustomToolsPayload,
    };

    return new ToolRouterSession<TToolCollection, TTool, TProvider>(
      this.client,
      this.config,
      session.session_id,
      this.createMCPServerConfig(session.mcp),
      undefined,
      customToolsMap,
      userId,
      metadata
    );
  }
}
