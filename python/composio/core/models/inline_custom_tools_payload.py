from __future__ import annotations

import typing as t

from composio_client import Omit, omit
from composio_client.types.tool_router import (
    session_execute_params,
    session_search_params,
)

from composio.core.models.custom_tool_types import InlineCustomToolsWirePayload


def inline_custom_tools_execute_experimental(
    payload: t.Optional[InlineCustomToolsWirePayload],
) -> t.Union[session_execute_params.Experimental, Omit]:
    if payload is None:
        return omit
    # The SDK wire payload is a structural subset of Stainless' endpoint-specific
    # experimental payloads, with input-only preload hints on custom definitions.
    return t.cast(session_execute_params.Experimental, payload)


def inline_custom_tools_search_experimental(
    payload: t.Optional[InlineCustomToolsWirePayload],
) -> t.Union[session_search_params.Experimental, Omit]:
    if payload is None:
        return omit
    # The SDK wire payload is a structural subset of Stainless' endpoint-specific
    # experimental payloads, with input-only preload hints on custom definitions.
    return t.cast(session_search_params.Experimental, payload)
