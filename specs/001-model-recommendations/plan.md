# Implementation Plan: Task-Aware Model Recommendations

**Branch**: `001-model-recommendations` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-model-recommendations/spec.md`

## Summary

Build a cross-platform Node.js CLI started with `npm start`. Its menu offers two
actions: choose a coding-task category and see up to 10 ranked models, or refresh all
configured providers. Keep ranking deterministic using a 1–100 score based on task
capability fit (70%) and fresh comparable price dominance (30%), with provider/model
ID tie-breaking. Use public
provider sources without API keys, with a clearly labeled OpenRouter fallback.
Recommendation output includes model names, provider/model IDs, and scores.

## Technical Context

**Language/Version**: JavaScript ESM, Node.js >=22; develop on Node 22 and verify on Node 22 and 24

**Primary Dependencies**: Node.js built-ins only: `readline/promises`, `fetch`, `fs/promises`, `node:test`, and `node:assert`

**Storage**: Bundled curated JSON catalog plus user config JSON for provider snapshots; write updates atomically

**Testing**: Node.js built-in test runner; unit tests, fixture-based provider contract tests, and end-to-end CLI tests with network calls mocked

**Target Platform**: Windows, macOS, and Linux with a supported Node.js LTS runtime

**Project Type**: Single-project CLI

**Performance Goals**: Local category selection and recommendations complete in under 1 second for a catalog of up to 500 model profiles; provider requests have a 10-second timeout and report outcomes per provider

**Constraints**: Refresh only from public HTTPS sources without API keys. Parse
official model/pricing Markdown where extractable and use OpenRouter as a labeled
fallback; identify aggregator prices as marketplace-specific. Refresh all configured
providers together and preserve the last usable snapshot for any failed provider.
Prices older than 30 days or without a check date do not affect ranking.

**Scale/Scope**: One local user, ten supported providers, and up to 500 model profiles; no model inference, account system, or telemetry

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Simple, Task-First Experience**: PASS — the CLI has only category recommendations and all-provider refresh.
- **II. Explainable Recommendations**: PASS — deterministic weighted capability and pricing rules are summarized by a score in the CLI.
- **III. Pricing-Aware Choices**: PASS — prices retain units, source, and freshness; only comparable prices affect ordering, and unknown prices are not estimated.
- **IV. Maintainable Model Catalog**: PASS — provider snapshots retain provenance; refresh failures preserve the last usable data.
- **V. Node.js CLI**: PASS — the solution uses supported Node.js LTS releases and remains terminal-first.
- **Development Workflow**: PASS — automated unit/contract/CLI tests and usage documentation are part of implementation.
- **Gate result**: PASS. No constitution violations or complexity exceptions are required.
- **Post-design re-check**: PASS — local deterministic ranking, provenance-aware data, and all-provider refresh preserve the five principles without adding unnecessary services or dependencies.

## Project Structure

### Documentation (this feature)

```text
specs/001-model-recommendations/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── cli.md
│   └── provider-sources.md
└── tasks.md              # Created by /speckit-tasks
```

### Source Code (repository root)
```text
package.json
README.md
data/
└── default-catalog.json
src/
├── cli.js
├── catalog.js
├── recommendation.js
├── storage.js
└── providers/
    ├── public-catalog.js
    └── shared.js
tests/
├── unit/
├── contract/
└── integration/
```

**Structure Decision**: Use one small ESM package with focused modules for the CLI,
catalog/storage, deterministic recommendation rules, and a shared public-source
adapter for supported providers. Keep the curated seed catalog separate from
user-specific provider snapshots. Tests are split by unit behavior, provider response
contracts, and CLI flows; no web front end or service project is needed.

## Complexity Tracking

No constitution violations. No complexity exceptions.
