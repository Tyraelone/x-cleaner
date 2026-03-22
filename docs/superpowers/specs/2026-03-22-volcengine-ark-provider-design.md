# Volcengine Ark Provider Design

## Goal

Add Volcengine Ark as an AI moderation provider using its OpenAI-compatible API so users can select it from settings and use their Ark API key plus model ID for content review.

## Scope

This change adds one new AI provider:

- `ark`

It does not add new moderation categories, new auth flows, or provider-specific UI beyond the existing provider and model fields.

## Integration Direction

Use the official OpenAI-compatible invocation path from Volcengine documentation:

- Base URL: `https://operator.las.cn-beijing.volces.com/api/v1`
- Auth header: `Authorization: Bearer <ARK_API_KEY>`
- Endpoint style: `chat/completions`

The existing extension already stores one API key and one model string. We will keep that shape and reuse it for Ark.

## Behavior

- Settings can persist `ark` as `ai.provider`
- Options UI shows `Volcengine Ark` in the provider select
- Background request routing treats `ark` like a real provider that requires an API key
- The Ark provider sends a chat-completions request with a system instruction that returns strict JSON text
- Response parsing normalizes the provider output into the existing raw classification shape
- Failure behavior remains fail-open and returns a non-blocking result

## Testing

Add or update tests for:

- settings form provider selection
- settings storage sanitization for `ark`
- provider routing in background listener
- Ark request URL and body shape
- Ark response parsing and safe fallback behavior
