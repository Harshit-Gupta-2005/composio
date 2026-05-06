import type {
  SessionExecuteParams,
  SessionSearchParams,
} from '@composio/client/resources/tool-router/session/session.mjs';
import type { InlineCustomToolsWirePayload } from '../types/customTool.types';

type InlineCustomToolsExperimental =
  | SessionExecuteParams.Experimental
  | SessionSearchParams.Experimental;

export function inlineCustomToolsExperimental<TExperimental extends InlineCustomToolsExperimental>(
  payload?: InlineCustomToolsWirePayload
): TExperimental | undefined {
  // The SDK wire payload is a structural subset of Stainless' endpoint-specific
  // experimental payloads, with input-only preload hints on custom definitions.
  return payload as TExperimental | undefined;
}
