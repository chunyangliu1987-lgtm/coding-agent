from __future__ import annotations

from datetime import timedelta
from urllib.parse import urlparse
from uuid import UUID

from integrations.jira_dc.jira_dc_user_token import (
    JiraDcUserToken,
    JiraDcUserTokenError,
    get_user_jira_dc_token,
)
from pydantic import SecretStr
from server.auth.constants import JIRA_DC_BASE_URL, JIRA_DC_ENABLE_OAUTH
from server.auth.token_manager import TokenManager
from storage.jira_dc_integration_store import JiraDcIntegrationStore
from storage.jira_dc_workspace import JiraDcWorkspace

from openhands.app_server.app_conversation.app_conversation_models import (
    ConversationTrigger,
)
from openhands.app_server.app_conversation.conversation_secret_enricher import (
    ConversationSecretEnricher,
    ConversationSecretEnrichment,
)
from openhands.app_server.services.jwt_service import JwtService
from openhands.app_server.user.user_context import UserContext
from openhands.app_server.user.user_models import UserInfo
from openhands.app_server.utils.logger import openhands_logger as logger
from openhands.sdk.secret import LookupSecret, SecretSource, StaticSecret

JIRA_DC_SECRET_HINT = """You have credentialed access to the Jira Data Center REST API:

  - Base URL: $JIRA_DC_BASE_URL
  - Auth:     Authorization: Bearer $JIRA_DC_TOKEN

The token value is supplied only as a sandbox secret/environment variable. Never echo or log the value of $JIRA_DC_TOKEN."""


def _workspace_matches_configured_jira_dc_host(workspace_name: str) -> bool:
    configured_host = urlparse(JIRA_DC_BASE_URL).hostname
    if not configured_host:
        return False
    return workspace_name.lower() == configured_host.lower()


JIRA_DC_NO_TOKEN_HINT = """You do not have a Jira Data Center API token in this conversation, so you cannot query Jira directly. Any Jira issue context you need is included above. If the user asks you to read or query Jira directly, let them know they can enable it by linking their Jira account in OpenHands under Settings → Integrations."""


def _append_jira_dc_hint(system_message_suffix: str | None) -> str:
    if not system_message_suffix:
        return JIRA_DC_SECRET_HINT
    if 'JIRA_DC_TOKEN' in system_message_suffix:
        return system_message_suffix
    return f'{system_message_suffix}\n\n{JIRA_DC_SECRET_HINT}'


def _append_no_token_hint(system_message_suffix: str | None) -> str:
    if not system_message_suffix:
        return JIRA_DC_NO_TOKEN_HINT
    if JIRA_DC_NO_TOKEN_HINT in system_message_suffix:
        return system_message_suffix
    return f'{system_message_suffix}\n\n{JIRA_DC_NO_TOKEN_HINT}'


async def _get_effective_org_id(user_context: UserContext) -> UUID | None:
    resolver_org_id = getattr(user_context, 'resolver_org_id', None)
    if resolver_org_id is not None:
        return resolver_org_id

    # Known org-bearing UserContext shapes: resolver starts set resolver_org_id;
    # user-auth starts expose get_effective_org_id on one of these auth attrs.
    for auth_attr in ('saas_user_auth', 'user_auth'):
        user_auth = getattr(user_context, auth_attr, None)
        get_effective_org_id = getattr(user_auth, 'get_effective_org_id', None)
        if callable(get_effective_org_id):
            return await get_effective_org_id()
    return None


async def _effective_org_matches(
    *,
    workspace_id: int,
    workspace_org_id: UUID,
    user_context: UserContext,
) -> bool:
    effective_org_id = await _get_effective_org_id(user_context)
    if effective_org_id is None:
        # Expected best-effort skip, not an anomaly: keep at info to avoid noise.
        logger.info(
            '[Jira DC] Skipping Jira DC token injection because workspace %s is '
            'org-scoped but no effective org was resolved',
            workspace_id,
        )
        return False
    return effective_org_id == workspace_org_id


async def _workspace_matches_context(
    workspace: JiraDcWorkspace, user_context: UserContext
) -> bool:
    workspace_org_id = getattr(workspace, 'org_id', None)
    if workspace_org_id is None:
        return True
    return await _effective_org_matches(
        workspace_id=workspace.id,
        workspace_org_id=workspace_org_id,
        user_context=user_context,
    )


async def _resolve_user_token(
    *,
    user_id: str,
    workspace_id: int,
    token_manager: TokenManager,
    store: JiraDcIntegrationStore,
    strict: bool,
) -> JiraDcUserToken | None:
    try:
        return await get_user_jira_dc_token(
            keycloak_user_id=user_id,
            workspace_id=workspace_id,
            token_manager=token_manager,
            store=store,
        )
    except JiraDcUserTokenError:
        if strict:
            raise
        logger.warning(
            '[Jira DC] Skipping Jira DC token injection because the linked user '
            'does not have a usable token',
            exc_info=True,
        )
        return None


class JiraDcConversationSecretEnricher(ConversationSecretEnricher):
    async def enrich(
        self,
        *,
        user_context: UserContext,
        user: UserInfo,
        trigger: ConversationTrigger | None,
        system_message_suffix: str | None,
        web_url: str | None,
        jwt_service: JwtService,
        access_token_hard_timeout: timedelta | None,
    ) -> ConversationSecretEnrichment:
        # Identity is resolved via user_context; `user` is required only by the interface.
        del user

        # Not gated on JIRA_DC_ENABLE_OAUTH: inject a token whenever the user has
        # one, so an email-linking deployment can still let users opt into OAuth
        # for live Jira access. Email-only users have no token and are handled
        # below (best-effort), so the resolver's baked-in context carries them.
        user_id = await user_context.get_user_id()
        if not user_id:
            return ConversationSecretEnrichment(
                system_message_suffix=system_message_suffix
            )

        store = JiraDcIntegrationStore.get_instance()
        jira_dc_user = await store.get_user_by_active_workspace(user_id)
        if not jira_dc_user:
            return ConversationSecretEnrichment(
                system_message_suffix=system_message_suffix
            )

        workspace = await store.get_workspace_by_id(jira_dc_user.jira_dc_workspace_id)
        if not workspace or workspace.status != 'active':
            return ConversationSecretEnrichment(
                system_message_suffix=system_message_suffix
            )
        if not _workspace_matches_configured_jira_dc_host(workspace.name):
            return ConversationSecretEnrichment(
                system_message_suffix=system_message_suffix
            )
        if not await _workspace_matches_context(workspace, user_context):
            return ConversationSecretEnrichment(
                system_message_suffix=system_message_suffix
            )

        secrets: dict[str, SecretSource] = {
            'JIRA_DC_BASE_URL': StaticSecret(
                value=SecretStr(JIRA_DC_BASE_URL),
                description='Jira Data Center base URL',
            )
        }

        token_manager = TokenManager()
        # Only an OAuth-mode Jira resolver start hard-fails on a missing token (so
        # the webhook can post the re-link prompt). Email mode is always
        # best-effort: inject if the user opted into OAuth, otherwise skip.
        strict = trigger == ConversationTrigger.JIRA and bool(JIRA_DC_ENABLE_OAUTH)
        if web_url:
            if strict:
                await _resolve_user_token(
                    user_id=user_id,
                    workspace_id=workspace.id,
                    token_manager=token_manager,
                    store=store,
                    strict=True,
                )
            elif not JIRA_DC_ENABLE_OAUTH:
                # The LookupSecret resolves lazily, so in email mode pre-check that
                # the user actually has a token -- else we'd inject a dud secret and
                # the success hint would wrongly claim Jira access.
                if (
                    await _resolve_user_token(
                        user_id=user_id,
                        workspace_id=workspace.id,
                        token_manager=token_manager,
                        store=store,
                        strict=False,
                    )
                    is None
                ):
                    return ConversationSecretEnrichment(
                        system_message_suffix=_append_no_token_hint(
                            system_message_suffix
                        )
                    )
            access_token = jwt_service.create_jws_token(
                payload={
                    'user_id': user_id,
                    'integration': 'jira_dc',
                    'secret_name': 'JIRA_DC_TOKEN',
                    'workspace_id': workspace.id,
                },
                expires_in=access_token_hard_timeout,
            )
            secrets['JIRA_DC_TOKEN'] = LookupSecret(
                url=f'{web_url}/integration/jira-dc/secrets/token',
                headers={'X-Access-Token': access_token},
                description='Jira Data Center OAuth access token',
            )
        else:
            user_token = await _resolve_user_token(
                user_id=user_id,
                workspace_id=workspace.id,
                token_manager=token_manager,
                store=store,
                strict=strict,
            )
            if user_token is None:
                return ConversationSecretEnrichment(
                    system_message_suffix=_append_no_token_hint(system_message_suffix)
                )
            secrets['JIRA_DC_TOKEN'] = StaticSecret(
                value=user_token.access_token,
                description='Jira Data Center OAuth access token',
            )

        return ConversationSecretEnrichment(
            secrets=secrets,
            system_message_suffix=_append_jira_dc_hint(system_message_suffix),
        )
