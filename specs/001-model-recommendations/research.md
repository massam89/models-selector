# Research: Task-Aware Model Recommendations

**Date**: 2026-09-27
**Status**: Decisions resolved

## Runtime and CLI

**Decision**: Use JavaScript ESM with Node.js 22 or newer; develop on the available Node
22 LTS runtime and test on Node 22 and 24. Use built-in argument parsing, readline,
HTTP, filesystem, and test modules. Add no CLI framework or test framework initially.

**Rationale**: Both Node 22 and 24 are LTS lines. Node's `util.parseArgs()` and
`node:test` cover this small command surface and test suite without adding dependencies
or a build step. Node 22 is the minimum to retain the broadest supported LTS coverage.

**Alternatives considered**: Requiring Node 24 would narrow the initial runtime range.
TypeScript plus a compiler, or a third-party CLI framework, can be reconsidered if the
command or type complexity grows enough to justify the added toolchain.

**Sources**:

- Node.js release schedule: https://nodejs.org/en/about/previous-releases
- Node.js `util.parseArgs()`: https://nodejs.org/api/util.html#utilparseargsconfig
- Node.js TypeScript support: https://nodejs.org/api/typescript.html
- Node.js test runner: https://nodejs.org/api/test.html

## Catalog Data and Persistence

**Decision**: Keep a bundled, curated JSON catalog for initial recommendations and
user-specific provider snapshots in the platform's user configuration directory. Use
Node filesystem APIs and atomic file replacement; do not introduce a database for the
expected catalog size.

**Rationale**: The first release targets one local user and at most 500 model profiles.
JSON is inspectable and sufficient for this scale. Provider snapshots preserve the
last usable data if a source fails.

**Alternatives considered**: SQLite is unnecessary for the expected size and query
patterns. YAML would be more comment-friendly but requires another parser dependency.
`lowdb` is an optional convenience layer, but direct filesystem operations keep the
initial dependency footprint at zero.

## Provider Sources and Refresh Limits

**Decision**: Support OpenAI, Anthropic, Google Gemini, Kimi, DeepSeek, Mistral AI,
xAI (Grok), Cohere, Meta Llama, Qwen, and MiniMax. Refresh without API keys by parsing
official public model and pricing pages where their formats are extractable. Official
sources now cover Kimi active model IDs and token/cache pricing, DeepSeek model
features and peak pricing, xAI text models and lower-context pricing, Cohere chat-model
lifecycle/descriptions, Qwen text model IDs and explicit reasoning/coder signals, and
MiniMax standard token pricing. Mistral still uses OpenRouter because no stable,
parseable official catalog was identified;
Meta's current API model listing requires credentials and does not match the configured
Meta Llama provider. Use OpenRouter's public catalog for missing or unavailable
official fields as a clearly labeled fallback. Tag OpenRouter-derived rates as
marketplace-specific rather than direct provider prices. Do not infer missing
capabilities or prices. Report unavailable or unparseable sources, and retain the
last-known-good snapshot when no usable source returns models.

**Rationale**: Public official pages can provide model identities and pricing without
requiring an API account, while OpenRouter provides a public, machine-readable catalog
with broad provider coverage. The OpenRouter catalog must not be narrowed to its
programming category because that category omitted multiple requested vendors in live
responses. Google documentation returned HTTP 403 in the implementation environment,
so that source must be treated as best-effort and its fallback visible to the user.
Per-field provenance prevents aggregator pricing from being mistaken for direct
provider rates.

**Alternatives considered**: Requiring API credentials conflicts with the user's
keyless requirement. Depending only on official pages would leave incomplete coverage
when pages are blocked or layouts change. Depending only on an aggregator would obscure
official pricing where it is available.

**Sources**:

- OpenAI models: https://developers.openai.com/api/docs/models
- OpenAI pricing: https://developers.openai.com/api/docs/pricing
- Anthropic models: https://platform.claude.com/docs/en/models/overview
- Anthropic pricing: https://platform.claude.com/docs/en/about-claude/pricing
- Google Gemini models: https://ai.google.dev/gemini-api/docs/models
- Google Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- OpenRouter public model catalog: https://openrouter.ai/api/v1/models

## Recommendation and Pricing Rules

**Decision**: Present fixed task categories without freeform descriptions or
model-based matching. Exclude unavailable models and give available models a score
from 1 to 100: up to 70 points are proportional to selected capability tags known to
be supported; up to 30 points are proportional to decisive, fresh, comparable price
dominances against other available models. A dominance requires the same complete
component set and no higher price for every component, with at least one lower price.
Break score ties by provider ID and model ID. Treat prices checked more than 30 days
before the current date as stale; missing check dates have unknown freshness. Those
prices do not contribute to score.

**Rationale**: Deterministic ranking uses supported capability evidence and published
prices without implying that an unprovided workload has a known total cost. The
weighted score makes the relative influence of capability fit and price explicit.
Unsupported capability or pricing metadata remains unknown rather than being treated
as false or free.

**Alternatives considered**: Calling a language model to rank providers is outside
the feature scope and would add hidden decisions and network dependencies.

## Failure, Security, and Privacy

**Decision**: Perform public-source refreshes only on user request, without API keys
and with a bounded request timeout. Validate response shape before updating a provider
snapshot. Keep prior usable data when all public sources fail. Do not transmit task
descriptions.

**Rationale**: Recommendations must remain available offline, and a partial or untrusted refresh must
not silently degrade the catalog. Public source failures are reported instead of
falling back to credential prompts.
