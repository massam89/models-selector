# Tasks: Task-Aware Model Recommendations

**Input**: Design documents from `specs/001-model-recommendations/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

**Organization**: Tasks are grouped by user story so each increment can be implemented and validated independently.

## Phase 1: Setup

**Purpose**: Initialize the Node.js CLI project and shared directory structure.

- [X] T001 Create the ESM package manifest, Node.js >=22 engine requirement, CLI bin entry, and `test` script in `package.json`
- [X] T002 [P] Create `src/`, `src/providers/`, `data/`, `tests/unit/`, `tests/contract/`, and `tests/integration/` per `specs/001-model-recommendations/plan.md`
- [X] T003 [P] Add project usage, supported Node versions, setup, and test instructions to `README.md`
- [X] T004 Add a small valid starter catalog JSON structure with the three provider IDs and provisional task categories in `data/default-catalog.json`

## Phase 2: Foundational

**Purpose**: Shared entities, configuration persistence, and CLI behavior needed by all stories.

- [X] T005 Define and validate provider, model profile, pricing, task category, and field override records in `src/catalog.js`
- [X] T006 Implement user configuration directory resolution and default catalog loading in `src/storage.js`
- [X] T007 Implement validated atomic JSON writes and preserve the previous file when writes fail in `src/storage.js`
- [X] T008 Implement shared CLI command parsing, help output, and non-zero error handling in `src/cli.js`
- [X] T009 [P] Add tests for catalog entity validation, composite provider/model identity, and unknown-versus-false capability data in `tests/unit/catalog.test.js`
- [X] T010 [P] Add tests for configuration paths, missing files, malformed JSON, and atomic write failure recovery in `tests/unit/storage.test.js`
- [X] T011 Add tests for help, invalid arguments, and command failure exit codes in `tests/integration/cli.test.js`

**Checkpoint**: Project initializes, shared catalog/storage contracts work, and CLI failures are visible; user-story work can begin.

## Phase 3: User Story 1 - Get a Model Recommendation for a Task (Priority: P1)

**Goal**: Let users select a coding task and get an explainable local ranking from the available catalog.

**Independent Test**: With a fixture catalog, select each built-in task and verify relevant models are ranked with reasons; verify “Other” and insufficient-data paths do not make unsupported recommendations.

### Tests for User Story 1

- [X] T012 [P] [US1] Add category-selection tests for matched, multi-category, and unmatched “Other” descriptions with mocked terminal input in `tests/integration/recommendation-flow.test.js`
- [X] T013 [P] [US1] Add tests for supported-tag match counts, deterministic price dominance, stable identity tie-breaking, and no-reliable-match behavior in `tests/unit/recommendation.test.js`

### Implementation for User Story 1

- [X] T014 [P] [US1] Define provisional task categories, case-insensitive whole-word/phrase match terms, descriptions, and capability tags in `src/categories.js`
- [X] T015 [P] [US1] Add representative curated provider/model profiles and metadata provenance in `data/default-catalog.json`
- [X] T016 [US1] Implement local match-term lookup for “Other,” union matched-category tags, supported-tag scoring, reliable-match threshold, and deterministic reason generation in `src/recommendation.js`
- [X] T017 [US1] Implement interactive category selection, “Other” text entry, recommendation output, and insufficient-data messaging in `src/cli.js`
- [X] T018 [US1] Verify user-entered “Other” descriptions stay local and are not sent to providers in `src/cli.js`
- [X] T019 [US1] Validate provisional category names, descriptions, and match terms with intended users; record decisions in `specs/001-model-recommendations/spec.md` and revise `src/categories.js`
- [X] T020 [US1] Document validated task categories, recommendation reasons, and the local-only task flow in `README.md`

**Checkpoint**: User can run the CLI without credentials, select a task, and receive a local recommendation with a visible explanation.

## Phase 4: User Story 2 - Compare Model Capabilities and Cost (Priority: P1)

**Goal**: Show comparable model settings and price information so users can assess trade-offs.

**Independent Test**: Given fixtures with known, missing, stale, and non-comparable metadata, verify the CLI presents supported settings, provenance, and pricing accurately and never treats unknown prices as free.

### Tests for User Story 2

- [X] T021 [P] [US2] Add tests for comparable and non-comparable currency/unit pricing, 30-day staleness, unknown freshness, and equal-fit ordering in `tests/unit/pricing.test.js`
- [X] T022 [P] [US2] Verify recommendation output omits settings, prices, and explanations in `tests/integration/recommendation-output.test.js`

### Implementation for User Story 2

- [X] T023 [P] [US2] Add capability, supported-setting, and pricing fixtures with source and freshness metadata in `data/default-catalog.json`
- [X] T024 [US2] Implement component-wise price dominance, 30-day staleness handling, unknown-freshness handling, and stable identity tie-breaking in `src/recommendation.js`
- [X] T025 [US2] Display task-fit factors, provider-specific supported settings, and suggested values only when supported in `src/cli.js`
- [X] T026 [US2] Display price component, currency, billing unit, source, check date, freshness, and non-comparable status in `src/cli.js`
- [X] T027 [US2] Document comparison, category-match, ranking, and pricing-freshness rules in `README.md`

**Checkpoint**: Users can compare model fit, settings, and reliable price data without unsupported parameter suggestions or fabricated totals.

## Phase 5: User Story 3 - Keep the Model Catalog Current (Priority: P2)

**Goal**: Support manual catalog maintenance and provider refresh while preserving user overrides and last-known-good data.

**Independent Test**: Add or edit a model field, refresh provider fixtures with conflicting data, and simulate failed refreshes; verify overrides persist, failures are reported, and prior catalog snapshots remain usable.

### Tests for User Story 3

- [X] T028 [P] [US3] Add tests for manual model add/edit, per-field override precedence, reset, and invalid edits in `tests/unit/catalog-update.test.js`
- [X] T029 [P] [US3] Add public-source contract fixtures for OpenRouter, official Markdown model/pricing parsers, keyless requests, and fallback behavior in `tests/contract/provider-sources.test.js`
- [X] T030 [P] [US3] Add refresh integration tests for keyless source outcomes, timeouts, provider-specific failure, last-known-good snapshot retention, and pruning models omitted by a successful refresh in `tests/integration/catalog-refresh.test.js`

### Implementation for User Story 3

- [X] T031 [US3] Implement allowlisted field-level manual overrides and reset behavior in `src/catalog.js`
- [X] T032 [US3] Implement OpenAI public model/pricing page parsing and OpenRouter fallback in `src/providers/public-catalog.js`
- [X] T033 [US3] Implement Anthropic public model/pricing page parsing and OpenRouter fallback in `src/providers/public-catalog.js`
- [X] T034 [US3] Implement Google public model page parsing and OpenRouter fallback in `src/providers/public-catalog.js`
- [X] T035 [US3] Implement per-provider refresh orchestration, bounded timeout/retry, and atomic snapshot replacement that drops models omitted by successful refreshes in `src/catalog.js`
- [X] T036 [US3] Add catalog list, keyless refresh with per-provider warnings/outcomes, add, edit, and reset command handling in `src/cli.js`
- [X] T037 [US3] Document public refresh sources, fallback attribution, manual edits, refresh, and reset commands in `README.md`

**Checkpoint**: Catalog changes and refreshes report their results; provider failures do not erase valid data, and manual values persist until reset.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate end-to-end behavior, security boundaries, compatibility, and user documentation.

- [X] T038 [P] Add cross-platform tests for paths, line endings, and CLI invocation on supported Node.js LTS versions in `tests/integration/platform.test.js`
- [X] T039 [P] Verify unauthenticated public requests, visible source failures, and local-only task descriptions in `src/cli.js` and `src/providers/public-catalog.js`
- [X] T040 Run every validation scenario in `specs/001-model-recommendations/quickstart.md` and record any implementation gaps in `README.md`
- [X] T041 Verify local recommendations complete within one second for a 500-profile fixture in `tests/integration/performance.test.js`

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No prerequisites.
- **Foundational (Phase 2)**: Depends on Setup and blocks all story phases.
- **User Story 1 (Phase 3)**: Depends on Foundational; delivers the recommendation MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and builds on the recommendation flow from US1 for its comparison output.
- **User Story 3 (Phase 5)**: Depends on Foundational; catalog updates feed the same profiles used by US1/US2, while its manual-data and refresh behavior can be validated independently.
- **Polish (Phase 6)**: Depends on all user stories selected for release.

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational. No dependency on other user stories.
- **US2 (P1)**: Core price and capability comparison is independently testable with fixtures; integration into the interactive recommendation flow depends on US1.
- **US3 (P2)**: Manual catalog operations and provider refresh can be tested independently after Foundational; recommendations consume updated catalog data through the shared catalog contract.

### Within Each User Story

- Create tests before or alongside behavior; the project constitution requires automated checks for affected recommendation, pricing, and catalog behavior.
- Complete the catalog/category definitions before recommendation matching.
- Complete matching before integrating the interactive recommendation flow.
- Validate category labels, descriptions, and match terms with intended users before treating the taxonomy as complete.
- Validate public-source parsers with fixtures before integrating refresh outcomes and fallback warnings.
- Run each story's independent test before moving to the next story checkpoint.

## Parallel Opportunities

- **Setup**: T002 and T003 can proceed in parallel after T001 defines the package entry points; T004 can be prepared alongside README work.
- **Foundational**: T009 and T010 are independent test files; T011 depends on the shared CLI parser in T008.
- **US1**: T012 and T013 are independent test files; T014 and T015 can be prepared in parallel; T016 depends on category/catalog shapes; T017 depends on T016.
- **US2**: T021 and T022 are independent test files; T023 can be edited in parallel; T024 depends on the recommendation implementation; T025 and T026 touch the shared CLI file and should be coordinated/sequential.
- **US3**: T028, T029, and T030 are independent test files; T032, T033, and T034 touch the shared public-source module and should be coordinated; T035 integrates refresh outcomes; T036 integrates the CLI command handlers.
- **Polish**: T038, T039, and T041 can run in parallel after the stories are implemented.

## Provider Source Work: User Story 3

```text
Task: T032 Implement the OpenAI public source in src/providers/public-catalog.js
Task: T033 Implement the Anthropic public source in src/providers/public-catalog.js (same file; coordinate sequentially)
Task: T034 Implement the Google public source in src/providers/public-catalog.js (same file; coordinate sequentially)
```

## Phase 7: Keyless Public Catalog Refresh

**Purpose**: Align refresh behavior and documentation with the requirement to update models and prices without API keys.

- [X] T042 [US3] Integrate public-source adapters into refresh orchestration while preserving snapshots, curated fields, and manual overrides in `src/catalog.js`
- [X] T043 [US3] Report source fallback warnings in CLI output and remove API-key setup text from CLI help in `src/cli.js`
- [X] T044 [US3] Update the README, quickstart, plan, research, and CLI/provider contracts to document official sources plus labeled OpenRouter fallback
- [X] T045 [US3] Replace credential-based fixtures with public-source parser, pricing, no-auth, and fallback contract tests in `tests/contract/provider-sources.test.js`
- [X] T046 [US3] Validate keyless refresh behavior and fallback visibility in `tests/integration/refresh-command.test.js`

## Phase 8: Additional Provider Coverage

**Purpose**: Extend the keyless catalog to the additional providers selected by the user.

- [X] T047 [US3] Add DeepSeek, Mistral AI, xAI/Grok, Cohere, Meta Llama, Qwen, and MiniMax provider mappings in `src/providers/public-catalog.js`
- [X] T048 [US3] Broaden the public text-model feed and test OpenRouter provider-prefix normalization and source labels in `tests/contract/provider-sources.test.js`
- [X] T049 [US3] Register additional provider IDs in the bundled catalog and update provider-source documentation in `data/default-catalog.json`
- [X] T050 [US3] Document the full provider set and identify aggregator-only coverage in `README.md` and `specs/001-model-recommendations/`

## Phase 9: Concise Top-Five Recommendations

**Purpose**: Show only the user's highest-ranked models after selecting a task category.

- [X] T051 [US1] Limit category recommendation output to up to five supported model identities and a concise no-result message in `src/cli.js`
- [X] T052 [US1] Update recommendation flow tests to enforce the five-model cap and absence of detail/comparison output in `tests/integration/recommendation-flow.test.js`
- [X] T053 [US1] Align README, feature requirements, CLI contract, and quickstart with the concise recommendation output

## Phase 10: Additional Coding Categories

**Purpose**: Expand the task taxonomy with the five requested coding categories.

- [X] T054 [US1] Add feature implementation, performance optimization, security review, API/service integration, and dependency migration category records in `data/default-catalog.json`
- [X] T055 [US1] Test the new categories' match terms and capability tag mappings in `tests/unit/recommendation.test.js`
- [X] T056 [US1] Update category list and taxonomy documentation in `README.md`, `specs/001-model-recommendations/spec.md`, and `specs/001-model-recommendations/data-model.md`

## Phase 11: Simplified Recommendation and Refresh Flows

**Purpose**: Keep the CLI focused on category recommendations and refreshing every provider.

- [X] T057 [US1] Change the recommendation flow to show up to 10 ranked available models without a freeform description in `src/cli.js`
- [X] T058 [US1] Remove the “Other” category, freeform matching, and related tests in `data/default-catalog.json`, `src/`, and `tests/`
- [X] T059 [US3] Replace catalog subcommands with one all-provider `refresh` command and update `npm run refresh` in `src/cli.js` and `package.json`
- [X] T060 [US1] Update CLI and recommendation tests to enforce the 10-model cap, concise output, and unavailable removed commands in `tests/integration/`
- [X] T061 [US1] Update README and feature documents to describe only category recommendations and all-provider refresh in `README.md` and `specs/001-model-recommendations/`

## Phase 12: Single-Command Two-Option Startup

**Purpose**: Make `npm start` the only app entry and put both user actions in its startup menu.

- [X] T062 [US1] Add a startup menu with exactly “Suggest models” and “Refresh models” in `src/cli.js`
- [X] T063 [US1] Route category recommendations and all-provider refresh through the selected menu action in `src/cli.js`
- [X] T064 [US1] Remove separate refresh/bin entry points and document `npm start` as the sole app command in `package.json`, `README.md`, and Spec Kit contracts
- [X] T065 [US1] Test both menu actions, invalid selections, and rejection of command arguments in `tests/integration/`

## Phase 13: Reusable Menu Navigation

**Purpose**: Keep the app open after an action and let users browse multiple task categories.

- [X] T066 [US1] Keep category selection repeatable and add a previous-menu choice in `src/cli.js`
- [X] T067 [US3] Return to the main menu after provider refresh and handle closed input without an error in `src/cli.js`
- [X] T068 [US1] Test repeated category selection, previous-menu navigation, and app-loop behavior in `tests/integration/`
- [X] T069 [US1] Document repeatable menu navigation and previous-menu behavior in `README.md` and `specs/001-model-recommendations/`

## Phase 14: Explicit Previous Navigation

**Purpose**: Wait for the user's Previous selection before returning from model results to the category list.

- [X] T070 [US1] Add a result-screen “0. Previous” prompt and wait for selection before reopening the category list in `src/cli.js`
- [X] T071 [US1] Test that results remain displayed until Previous is selected, then allow another category selection in `tests/integration/recommendation-flow.test.js`
- [X] T072 [US1] Document explicit Previous navigation in `README.md` and `specs/001-model-recommendations/`

## Implementation Strategy

1. Run `npm start` to open the two-option menu.
2. Use “Suggest models” to choose a category; select “Previous” after results to choose again or return to the main menu.
3. Use “Refresh models” to refresh every configured provider and return to the menu.
4. Validate recommendation output, navigation, refresh outcomes, and failure recovery with tests.

## Format Validation

- Every task uses the required `- [ ] Tnnn [P?] [USn?] description with file path` format.
- Setup, foundational, and polish tasks omit story labels; user-story tasks include the matching story label.
- `[P]` is used only for tasks in distinct files that can proceed independently.
