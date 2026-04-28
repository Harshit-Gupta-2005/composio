"""Security tests for the legacy ``CustomTool`` / ``CustomTools`` API.

Regression tests for SEC-365 (CWE-639, cross-tenant credential access).

Before the fix, ``CustomTool.__call__`` extracted ``user_id`` from the same
``**kwargs`` dict that carried LLM-supplied tool arguments, and
``CustomTools.execute`` happily forwarded that LLM-controlled dict via
``custom_tool(**request, user_id=user_id)``. An LLM (or prompt-injection
input) could therefore set ``user_id`` to another tenant's identifier —
either getting it forwarded into ``CustomTool.__call__`` directly or
relying on Python's duplicate-kwarg ``TypeError`` to leak whose tokens
were nearly looked up.

The fix:
    * ``CustomTools.execute`` strips ``user_id`` from the LLM-supplied
      ``request`` dict at the trust boundary, so only the trusted, explicit
      ``user_id`` parameter reaches the credential lookup.
    * ``CustomTool.__call__`` exposes ``user_id`` as a keyword-only
      parameter and drops any ``user_id`` left in ``kwargs`` before the
      request body is validated.
"""

from unittest.mock import MagicMock

import pytest
from pydantic import BaseModel, Field

from composio.core.models.custom_tools import CustomTool, CustomTools
from composio.exceptions import NotFoundError


class _IssueInput(BaseModel):
    issue_number: int = Field(description="GitHub issue number")


def _make_mock_client() -> MagicMock:
    """Build a mock HttpClient suitable for CustomTool.__get_auth_credentials."""

    state = MagicMock()
    state.val.model_dump.return_value = {"access_token": "trusted-token"}

    account = MagicMock()
    account.created_at = "2026-01-01T00:00:00Z"
    account.state = state

    response = MagicMock()
    response.items = [account]

    client = MagicMock()
    client.connected_accounts.list.return_value = response
    client.tools.proxy = MagicMock()
    return client


def test_execute_strips_user_id_from_llm_request() -> None:
    """``CustomTools.execute`` MUST strip ``user_id`` from the request dict."""
    client = _make_mock_client()
    tools = CustomTools(client=client)

    def github_tool(request: _IssueInput, execute_request, auth_credentials):
        """Fetch issue info."""
        return {"token": auth_credentials["access_token"]}

    tools.register(toolkit="github")(github_tool)

    result = tools.execute(
        slug="GITHUB_GITHUB_TOOL",
        request={"issue_number": 1, "user_id": "victim-user"},
        user_id="trusted-user",
    )

    assert result == {"token": "trusted-token"}
    # Only the trusted, explicit user_id reaches the credential lookup.
    client.connected_accounts.list.assert_called_once_with(
        toolkit_slugs=["github"],
        user_ids=["trusted-user"],
    )


def test_execute_falls_back_to_default_when_user_id_missing() -> None:
    """If the caller forgets a trusted ``user_id``, fall back to ``"default"``.

    Specifically, ``execute`` must NOT silently use the LLM-supplied
    ``user_id`` from ``request`` as a fallback — that would re-introduce
    the SEC-365 vulnerability under a different code path.
    """
    client = _make_mock_client()
    tools = CustomTools(client=client)

    def github_tool(request: _IssueInput, execute_request, auth_credentials):
        """Fetch issue info."""
        return {"ok": True}

    tools.register(toolkit="github")(github_tool)

    tools.execute(
        slug="GITHUB_GITHUB_TOOL",
        request={"issue_number": 1, "user_id": "victim-user"},
        user_id=None,
    )

    client.connected_accounts.list.assert_called_once_with(
        toolkit_slugs=["github"],
        user_ids=["default"],
    )


def test_execute_does_not_mutate_caller_request_dict() -> None:
    """Sanitization MUST NOT mutate the caller's ``request`` dict in place."""
    client = _make_mock_client()
    tools = CustomTools(client=client)

    def github_tool(request: _IssueInput, execute_request, auth_credentials):
        """Fetch issue info."""
        return {"ok": True}

    tools.register(toolkit="github")(github_tool)

    request_dict = {"issue_number": 1, "user_id": "victim-user"}
    tools.execute(
        slug="GITHUB_GITHUB_TOOL",
        request=request_dict,
        user_id="trusted-user",
    )

    # The original dict is untouched (the SDK should not surprise the caller).
    assert request_dict == {"issue_number": 1, "user_id": "victim-user"}


def test_call_drops_user_id_smuggled_in_kwargs_dict() -> None:
    """``CustomTool.__call__`` MUST ignore any ``user_id`` smuggled in kwargs.

    A caller might unpack a partially-trusted dict like ``tool(**llm_dict)``
    without realizing that the LLM controls every key in it. Before the fix,
    a ``user_id`` key in that dict was popped and used to look up OAuth
    credentials — letting an LLM read another tenant's tokens. After the fix,
    ``__call__`` always uses the safe ``"default"`` user_id and the smuggled
    value is dropped before request validation.
    """
    client = _make_mock_client()

    def github_tool(request: _IssueInput, execute_request, auth_credentials):
        """Fetch issue info."""
        return {"ok": True}

    tool = CustomTool(f=github_tool, client=client, toolkit="github")

    smuggled_kwargs = {"issue_number": 1, "user_id": "victim-user"}
    tool(**smuggled_kwargs)

    client.connected_accounts.list.assert_called_once_with(
        toolkit_slugs=["github"],
        user_ids=["default"],
    )


def test_invoke_uses_trusted_user_id_separate_from_request() -> None:
    """``_invoke`` takes ``user_id`` separately from the request dict.

    This is the trusted internal entry point used by ``CustomTools.execute``.
    Even if the LLM-controlled ``request_kwargs`` happens to contain a
    ``user_id`` key (and somehow gets past the sanitization in ``execute``),
    the ``user_id`` argument here is structurally separate, so the trusted
    value is what reaches the credential lookup.
    """
    client = _make_mock_client()

    captured: dict = {}

    def github_tool(request: _IssueInput, execute_request, auth_credentials):
        """Fetch issue info."""
        captured["request"] = request
        return {"ok": True}

    tool = CustomTool(f=github_tool, client=client, toolkit="github")
    tool._invoke(user_id="trusted-user", request_kwargs={"issue_number": 7})

    client.connected_accounts.list.assert_called_once_with(
        toolkit_slugs=["github"],
        user_ids=["trusted-user"],
    )
    assert captured["request"].issue_number == 7


def test_execute_unknown_slug_raises() -> None:
    """Sanity check: unknown slugs still surface ``NotFoundError``."""
    client = _make_mock_client()
    tools = CustomTools(client=client)

    with pytest.raises(NotFoundError):
        tools.execute(
            slug="DOES_NOT_EXIST",
            request={"foo": "bar"},
            user_id="trusted-user",
        )
