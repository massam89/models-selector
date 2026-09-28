# Data Model: Task-Aware Model Recommendations

## Task Category

Represents a kind of work selected by the user.

| Field | Meaning | Validation |
|---|---|---|
| `id` | Stable category key | Required, unique, lowercase identifier |
| `label` | User-facing category name | Required, non-empty |
| `description` | Plain-language distinction and examples | Required |
| `capabilityTags` | Capabilities relevant to the category | Zero or more known capability identifiers |
| `suggestedSettings` | Optional task-specific setting suggestions | Each setting must be supported by the selected model before display |
| `provisional` | Indicates the category awaits user validation | Boolean; false after intended-user validation |

The configured categories are fixed task choices. Selecting one does not require a
freeform task description.

## Provider

Identifies a supported model source.

| Field | Meaning | Validation |
|---|---|---|
| `id` | Stable source identifier for a configured provider | Required, unique |
| `displayName` | User-facing provider name | Required |
| `catalogEndpoint` | Documented model-list source | HTTPS; only allowlisted endpoints |
| `lastSuccessfulRefresh` | Last successful source refresh | ISO-8601 timestamp or unknown |

## Model Profile

Represents one provider-specific model. Identity is the composite of `providerId` and
`providerModelId`; equal display names from different providers are separate profiles.

| Field | Meaning | Validation |
|---|---|---|
| `providerId` | Provider identifier | Must reference a supported Provider |
| `providerModelId` | Provider-assigned model identifier | Required; exact source identifier |
| `displayName` | User-facing model name | Required |
| `availability` | Whether the model is currently listed/usable according to the source or curator | `available`, `unavailable`, or `unknown` |
| `capabilities` | Task-relevant capabilities such as reasoning or coding | A known value uses `{support: "supported"|"unsupported", source, lastChecked?}`; an absent tag is unknown |
| `supportedSettings` | Provider-supported configuration parameters | Each known setting uses `{supported: boolean, source, values?}`; absent settings are unknown |
| `source` | Provider endpoint or curated source for the base profile | Required for non-manual data |
| `lastChecked` | Last time base metadata was checked | ISO-8601 timestamp or unknown |

## Pricing Record

Stores one or more model price components.

| Field | Meaning | Validation |
|---|---|---|
| `component` | Rate type, such as input, output, cached input, or batch | Required identifier |
| `amount` | Non-negative decimal price | Unknown must be null, never zero by default |
| `currency` | Currency code | Required when amount is known |
| `unit` | Billing basis, such as per million tokens | Required when amount is known |
| `conditions` | Tier, context, date range, or other applicability | Optional; required to compare condition-dependent rates |
| `source` | URL or manual source description | Required when amount is known |
| `lastChecked` | Date the price was verified | ISO-8601 date or unknown |

Prices are comparable only when their currencies, billing units, and applicable
conditions align. A price checked more than 30 days before the current date is stale;
a missing check date means freshness is unknown. Stale and freshness-unknown prices
remain visible but are excluded from recommendation ordering. Input and output rates
remain separate; the CLI does not fabricate a combined usage estimate.

## Recommendation Ranking

Unavailable models are excluded. Each available model receives a score from 1 to
100: up to 70 points are proportional to its fraction of selected category tags
known to be supported, and up to 30 points are proportional to its share of decisive
price comparisons it wins against other available models. A price win requires a
complete, fresh, comparable profile that is no more expensive in any component and
cheaper in at least one. Equal, crossed, incomplete, incomparable, stale, and
freshness-unknown prices do not count as wins or losses. The combined score is rounded
to the nearest integer, with a minimum of 1. Models rank by score descending; ties
use provider ID, then provider model ID, ascending. The CLI displays up to 10 models
with their display names, provider/model identities, and scores.

## Provider Snapshot and Refresh State

A provider snapshot contains exactly the validated model-list records from its latest
successful refresh. Replacing a snapshot drops records no longer returned by the
source, while failed or incomplete refreshes leave the previous snapshot unchanged.
Each provider has its own snapshot and refresh status.

| State | Meaning |
|---|---|
| `never-refreshed` | No successful refresh has been stored |
| `refreshing` | A user-requested refresh is in progress |
| `succeeded` | A complete valid snapshot was saved |
| `failed` | Refresh failed; the previous usable snapshot remains active |
| `partial` | Some pages/records failed validation; no partial snapshot replaces the previous one |

A refresh records its start/end time, provider, outcome, and a user-readable error when
applicable. A provider's failure does not invalidate another provider's snapshot.

## Recommendation

A transient result containing the selected `Task Category` and up to 10 eligible
`Model Profile` identities. Capability and price metadata are used internally to rank
models; the category-selection output does not include comparison details.
