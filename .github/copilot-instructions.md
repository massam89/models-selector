# Repository instructions

## Build, test, and lint

- Requires Node.js 22 or newer.
- Run the CLI locally with `npm start`.
- Run the full test suite with `npm test` (the script invokes `node --test`).
- Run one test file with `node --test tests/unit/recommendation.test.js`.
- Run matching tests in a file with `node --test --test-name-pattern="price" tests/unit/recommendation.test.js`.
- There are no configured build or lint scripts in `package.json`.

## Architecture

The CLI entry point is `src/cli.js`. It loads the checked-in seed catalog from `data/default-catalog.json` and per-user runtime state, then builds an effective catalog for recommendations or provider refreshes. The seed catalog is the curated baseline; runtime state adds the latest successful provider snapshots, custom models, and field-level manual overrides. State is stored outside the repository in the platform's user config directory.

`src/catalog.js` owns catalog/profile validation, merging, refresh orchestration, and model overrides. `src/storage.js` handles config paths and JSON persistence; state writes are validated and atomic. `src/recommendation.js` ranks available profiles using supported capability tags and fresh, comparable price dominance. Provider source adapters and parsing live in `src/providers/public-catalog.js`, with HTTP/timeouts in `src/providers/shared.js`; official public sources are preferred, with OpenRouter as a documented fallback where needed.

## Repository conventions

- Keep the checked-in catalog and runtime state aligned with the version-1 schema enforced by `validateCatalog`, `validateModelProfile`, and `validateRuntimeState` in `src/catalog.js`. Model identity is the pair `providerId` and exact `providerModelId`.
- Provider adapters normalize source data into model profiles before refresh saves a snapshot. A failed or empty refresh must retain the provider's previous snapshot; a successful snapshot replaces that provider's prior source list. Preserve curated profile fields and manual overrides when merging refreshed data.
- Unknown capability or price data stays unknown; do not infer unsupported capabilities or treat unknown prices as zero. Only fresh, complete, comparable price profiles affect ranking.
- The CLI and provider code accept injectable dependencies (such as streams, fetchers, adapters, clocks, and persistence callbacks); follow this pattern in tests rather than relying on live services or user config.
- Tests use `node:test` and `node:assert/strict`, grouped under `tests/unit`, `tests/integration`, and `tests/contract`. Shared catalog/model fixtures are in `tests/fixtures.js`.
