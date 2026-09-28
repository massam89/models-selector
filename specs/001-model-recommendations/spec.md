# Feature Specification: Task-Aware Model Recommendations

**Feature Branch**: `001-model-recommendations`

**Created**: 2026-09-27

**Status**: Draft

**Input**: A simple CLI that recommends coding models by selected task category and
refreshes model data from public sources without API keys.

## Clarifications

### Session 2026-09-27

- The initial provider set includes OpenAI, Anthropic, Google Gemini, DeepSeek,
  Kimi, Mistral AI, xAI/Grok, Cohere, Meta Llama, Qwen, and MiniMax.
- Refresh uses official public pages where extractable and a clearly labeled public
  aggregator fallback.
- The category menu includes the requested coding task types: feature implementation,
  performance optimization, security review, API/service integration, and dependency
  migration.
- The user starts the app with `npm start`. Its menu has exactly two options:
  suggest models or refresh all configured providers. Model listing and manual
  add/edit/reset features are out of scope.
- The “Other” category and its freeform description prompt are removed. Category
  selection goes directly to the model list.
- Show up to 10 ranked models with their names, provider/model IDs, and 1–100 scores.

## User Scenarios & Testing

### User Story 1 - Get models for a coding task (Priority: P1)

As a developer, I want to select a coding-task category and immediately see up to 10
recommended models, so I can choose a model without reviewing a comparison report.

**Independent Test**: Select a category from a populated catalog and verify up to 10
models are shown in rank order with model names, provider/model IDs, and scores.

**Acceptance Scenarios**:

1. **Given** a user starts the CLI with `npm start`, **When** the user selects
   “Suggest models” and then one task category, **Then** the CLI immediately prints
   up to 10 ranked models without asking for a task description and waits for the
   user to select “Previous” before returning to the category list.
2. **Given** the catalog has more than 10 available models, **When** a category is
   selected, **Then** only the 10 highest-ranked models are shown.
3. **Given** fewer than 10 models are available, **When** a category is selected,
   **Then** all available models are shown.
4. **Given** no models are available, **When** a category is selected, **Then** the
   CLI prints one concise no-models message and waits for “Previous” before returning
   to the category list.
5. **Given** the user is choosing a category, **When** the user selects “Previous
   menu”, **Then** the CLI returns to the two-option main menu.

### User Story 2 - Refresh all model data (Priority: P2)

As a developer, I want to select “Refresh models” from the startup menu to update
every configured provider, so recommendations use current public model data without
API keys.

**Independent Test**: Select “Refresh models” with fixtures for all providers and
verify each provider outcome is reported and failures preserve the last usable
snapshot.

**Acceptance Scenarios**:

1. **Given** the user selects “Refresh models”, **When** configured providers are
   processed, **Then** every provider is attempted and its outcome is reported.
2. **Given** a public source is blocked or unavailable, **When** a fallback is used
   or a provider fails, **Then** the CLI reports the fallback or failure.
3. **Given** a provider refresh fails or returns incomplete data, **When** refresh
   completes, **Then** its previous usable snapshot remains unchanged.
4. **Given** a provider refresh succeeds, **When** its snapshot is stored, **Then**
   models omitted from the latest validated source list are removed from that
   provider snapshot.
5. **Given** a refresh has finished, **When** all provider outcomes are reported,
   **Then** the CLI returns to the main menu instead of exiting.

## Edge Cases

- The catalog contains no available models.
- A model has unknown capabilities, pricing, or freshness metadata.
- A provider source is unavailable, malformed, or returns an empty model list.
- One provider fails while others refresh successfully.
- Two providers offer models with the same display name.
- Models have equal task fit but prices are stale, incomplete, or incomparable.

## Requirements

### Functional Requirements

- **FR-001**: The CLI MUST present fixed coding-task categories for simple and complex
  coding questions, feature implementation, easy and hard debugging, performance
  optimization, simple and complex refactoring, dependency upgrade or migration, test
  writing, code review, security review, API/service integration, and documentation.
- **FR-002**: The app MUST remain in its interactive loop after each action. After
  showing a result, the “Suggest models” flow MUST wait for the user to select
  “0. Previous” before returning to the category list. The category list MUST offer
  “0. Previous menu” to return to the main menu.
- **FR-003**: The CLI MUST exclude unavailable models and score remaining models from
  1 to 100. Up to 70 points MUST represent the fraction of selected task capability
  tags known to be supported; up to 30 points MUST represent the share of decisive,
  fresh, comparable price dominances among available models. The score MUST be
  rounded to the nearest integer and have a minimum of 1. Equal scores MUST use
  provider ID and then provider model ID. The CLI MUST show up to 10 models,
  including models with no confirmed capability matches when they rank in the top
  10.
- **FR-004**: Recommendation output MUST show model names, provider/model IDs, and
  scores. It MUST NOT show reasons, detailed capabilities, settings, prices, or
  comparisons.
- **FR-005**: The app MUST start with `npm start` and display exactly two menu
  options: suggest models or refresh models. It MUST NOT require command arguments
  or expose separate catalog listing, model addition, model editing, reset, or
  per-provider refresh commands.
- **FR-006**: The “Refresh models” menu option MUST attempt every configured provider and report each
  provider's success, failure, and applicable fallback warnings, then return to the
  main menu.
- **FR-007**: Catalog refresh MUST work without provider API keys. It MUST prefer
  extractable public official model/pricing sources, use a public aggregator as a
  clearly labeled fallback, and preserve source provenance for imported prices.
- **FR-008**: If a provider refresh fails or is incomplete, the CLI MUST retain that
  provider's last usable snapshot. A successful refresh MUST replace that provider's
  snapshot with the latest validated source list and remove records omitted from it.
- **FR-009**: The catalog MUST identify each model by provider and provider-assigned
  model ID, treating matching display names from different providers as separate
  entries.
- **FR-010**: Prices older than 30 days or with unknown freshness MUST NOT affect
  recommendation ordering. The CLI MUST NOT invent price data.

### Key Entities

- **Task Category**: A fixed coding task choice with a label, short description, and
  relevant capability tags.
- **Model Profile**: A provider-specific model with capability, settings,
  availability, source, and pricing metadata.
- **Pricing Record**: A model price with amount, currency, billing unit, source, and
  last-checked date.
- **Recommendation**: A ranked list of up to 10 model identities and 1–100 scores.
- **Provider Snapshot**: The latest successfully refreshed model list for one
  configured provider.

## Success Criteria

- **SC-001**: At least 90% of first-time test users can select a category and identify
  a model in under two minutes without assistance.
- **SC-002**: When at least 10 models are available, the category flow prints exactly
  10 ranked model identities; with fewer available models, it prints all available
  identities.
- **SC-003**: 100% of recommendation results show model names, provider/model IDs,
  and 1–100 scores.
- **SC-004**: One refresh command attempts all configured providers and reports each
  provider's outcome.
- **SC-005**: A failed or incomplete provider refresh never removes that provider's
  last usable snapshot.

## Assumptions

- The category set is a practical starting point and may change after user feedback.
- The supported first-release providers are OpenAI, Anthropic, Google Gemini,
  DeepSeek, Mistral AI, xAI/Grok, Cohere, Meta Llama, Qwen, and MiniMax.
- Capability and price data may be unknown when sources do not publish it; unknown
  information is never inferred.
- The CLI recommends models but does not submit prompts or perform coding tasks.
