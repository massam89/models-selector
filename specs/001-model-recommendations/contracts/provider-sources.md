# Public Provider Source Contracts

Refresh is user-initiated and uses unauthenticated HTTPS GET requests. No provider
API key is read or sent. Source values are validated before they can replace a
provider's last-known-good snapshot.

| Provider | Official model source | Official pricing source | Fallback |
|---|---|---|---|
| OpenAI | `https://developers.openai.com/api/docs/models.md` | `https://developers.openai.com/api/docs/pricing.md` | OpenRouter public model catalog |
| Anthropic | `https://platform.claude.com/docs/en/models/overview.md` | `https://platform.claude.com/docs/en/about-claude/pricing.md` | OpenRouter public model catalog |
| Google Gemini | `https://ai.google.dev/gemini-api/docs/models.md` | `https://ai.google.dev/gemini-api/docs/pricing.md` | OpenRouter public model catalog |
| Kimi (Moonshot AI) | `https://platform.kimi.ai/docs/models.md` | `https://platform.kimi.ai/docs/pricing/chat.md` | OpenRouter public model catalog |
| DeepSeek | `https://api-docs.deepseek.com/quick_start/pricing/` | Same official model-and-pricing page | OpenRouter public model catalog |
| Mistral AI | Not currently integrated | Not currently integrated | OpenRouter public model catalog |
| xAI (Grok) | `https://docs.x.ai/developers/models` | Same official model-and-pricing page | OpenRouter public model catalog |
| Cohere | `https://docs.cohere.com/docs/models.md` | Not available in a parseable public page | OpenRouter public model catalog |
| Meta Llama | Not currently integrated | Not currently integrated | OpenRouter public model catalog |
| Qwen | `https://help.aliyun.com/zh/model-studio/text-generation-model` | Official rates are regional/tiered and not currently imported | OpenRouter public model catalog |
| MiniMax | `https://platform.minimax.io/docs/guides/pricing-paygo.md` | Same official model-and-pricing page | OpenRouter public model catalog |

The OpenRouter source is
`https://openrouter.ai/api/v1/models?output_modalities=text`. Models are filtered by
their OpenRouter provider prefix and normalized to the provider ID configured by this
application. Mistral AI uses `mistralai`, xAI/Grok uses `x-ai`, and Meta Llama uses
`meta-llama` as OpenRouter prefixes. Google IDs strip the optional `models/` prefix.
OpenRouter token rates are
converted to USD per million tokens and labeled with OpenRouter as the marketplace
source; they are not represented as direct provider rates.

Official-source parsers extract model IDs, display names, descriptions where
available, and published input/output prices. Kimi's model page contributes active
model IDs and descriptions; its pricing page contributes per-million-token input,
output, cache-hit, and cache-write rates. Kimi K3's 5-minute and 1-hour cache-write
rates remain separate with their TTL conditions. Models listed as deprecated by Kimi
are marked unavailable, even if OpenRouter still lists them.
DeepSeek and Qwen pages are parsed from
their server-rendered HTML tables; Markdown sources are parsed for xAI, Cohere, and
MiniMax. The DeepSeek parser records published peak input, cached-input, and output
rates; peak/off-peak rates differ, so the imported rate is explicitly marked as peak.
xAI imports the first (lower-context) text-price row per model, with its context
condition. MiniMax imports standard-tier token pricing and the first listed context
tier when applicable; Priority pricing and higher-context tier rows are not imported.
Cohere's official model page contributes chat model names, descriptions, and lifecycle
status, but not prices. Qwen's official text-generation page contributes model IDs
and explicitly listed reasoning/coder capabilities. Qwen rates vary by region and
token tier and remain sourced from OpenRouter until those dimensions can be represented
without losing meaning. Unsupported, missing, blocked, or unparseable fields remain
unknown. Every imported price carries its source, check date, unit, and applicable
pricing conditions.

Mistral's current model documentation does not expose a parseable official catalog
table through the public static page fetch used here. The Meta Model API model list
requires credentials and is not equivalent to the configured Meta Llama catalog, so
neither is fetched; both retain the public OpenRouter fallback.

Official pages and the aggregator are requested concurrently. If an official
provider's model or pricing page is unavailable or cannot be parsed, the refresh
returns a user-visible warning and uses OpenRouter data for that provider when
available. For official model-only sources, OpenRouter pricing is retained as a
clearly labeled marketplace fallback. Google pages may be blocked to automated
clients; the warning must not be silently suppressed. If no source returns a usable
model list, the refresh fails and retains the previous snapshot. A successful refresh
replaces that provider's snapshot with the current validated model list; model IDs no
longer returned by the source are removed instead of being kept as historical
unavailable entries.

Each HTTP request has a 10-second timeout. Transient network and server failures may
be retried once. HTTP errors, malformed responses, duplicate model IDs, invalid
profiles, and empty usable results must not replace the prior snapshot. Requests must
not include authorization or provider API-key headers.

## Official References

- OpenAI models: https://developers.openai.com/api/docs/models
- OpenAI pricing: https://developers.openai.com/api/docs/pricing
- Anthropic models: https://platform.claude.com/docs/en/models/overview
- Anthropic pricing: https://platform.claude.com/docs/en/about-claude/pricing
- Google Gemini models: https://ai.google.dev/gemini-api/docs/models
- Google Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- Kimi models: https://platform.kimi.ai/docs/models
- Kimi pricing: https://platform.kimi.ai/docs/pricing/chat
- DeepSeek models and pricing: https://api-docs.deepseek.com/quick_start/pricing/
- xAI models and pricing: https://docs.x.ai/developers/models
- Cohere models: https://docs.cohere.com/docs/models
- Cohere pricing: https://cohere.com/pricing
- Qwen text-generation models: https://help.aliyun.com/zh/model-studio/text-generation-model
- Qwen pricing: https://help.aliyun.com/zh/model-studio/model-pricing
- MiniMax models and pricing: https://platform.minimax.io/docs/guides/pricing-paygo
- Mistral models: https://docs.mistral.ai/models
- OpenRouter public model catalog: https://openrouter.ai/api/v1/models
