# Implementation Plan: Global CLI Launch

**Branch**: `002-global-cli-launch` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-global-cli-launch/spec.md`

## Summary

Expose the existing Model Selector entry point as the globally available `models-selector` command in the `models-selector` npm package. Support global installation from the npm registry after publication and from local project files as an alternative; no platform-specific installer is in scope. Keep the existing Node.js CLI, packaged catalog, per-user state, interactive menu, and recommendation/refresh behavior intact, and document installation prerequisites and PATH recovery.

## Technical Context

**Language/Version**: JavaScript ES modules on Node.js >=22
**Primary Dependencies**: Node.js built-in modules; npm for registry or local global installation
**Storage**: Existing packaged `data/default-catalog.json` and per-user JSON runtime state in the platform-specific configuration directory
**Testing**: Node.js built-in test runner via `npm test`; verify package executable metadata and packaged assets, and add an isolated global-install smoke test that launches from an unrelated working directory
**Target Platform**: Operating systems supported by Node.js >=22 and npm, including Windows, macOS, and Linux
**Project Type**: Single Node.js CLI
**Performance Goals**: No new latency target; launching the command must reach the existing interactive menu without a project-directory dependency
**Constraints**: Use npm registry or local project files; no standalone installers; npm's global executable directory must be on `PATH`; package data must remain resolvable independently of the current working directory
**Scale/Scope**: One local global installation and one existing user-state location per machine; no cross-machine synchronization

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / gate | Check |
|---|---|
| I. Simple, Task-First Experience | Pass. The current category and action menus remain unchanged; this feature changes only how users launch the CLI. |
| II. Explainable Recommendations | Pass. Recommendation ranking and output are unchanged. |
| III. Pricing-Aware Choices | Pass. Price data and ranking are unchanged. |
| IV. Maintainable Model Catalog | Pass. The existing catalog stays packaged with the CLI; refresh behavior is unchanged. |
| V. Node.js CLI | Pass. The feature preserves the Node.js terminal application and makes missing prerequisites/setup errors clearer. |
| Development Workflow | Pass. Update user guidance and add automated checks for the global command and working-directory-independent launch. |

**Gate result**: Pass before research. No constitution violations or unjustified complexity.

## Project Structure

### Documentation (this feature)

```text
specs/002-global-cli-launch/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── cli.md
```

### Source Code (repository root)

```text
package.json
README.md
src/
├── cli.js
├── catalog.js
├── recommendation.js
├── storage.js
└── providers/
    ├── public-catalog.js
    └── shared.js
data/
└── default-catalog.json
tests/
├── contract/
├── integration/
└── unit/
```

**Structure Decision**: Keep the existing single-project layout. Name the npm package and executable `models-selector`, mapping the command to `src/cli.js`, retaining the Node shebang and package inclusion of `src/`, `data/`, and `README.md`. The CLI already resolves its default catalog relative to its own module and stores runtime state in the user's platform-specific configuration directory; those paths must remain independent of the caller's working directory.

The existing invalid-argument message refers to `npm start`; update it and its test guidance to name `models-selector` so users receive instructions that match the global command.

## Complexity Tracking

No constitution violations or additional architectural components are required.

## Phase 0: Research

Research decisions and source references are recorded in [research.md](research.md). The principal decision is to distribute through npm and use npm's platform-generated executable shims, while retaining local global installation as an alternative rather than adding per-OS launchers.

## Phase 1: Design

- [Data model](data-model.md): existing package, launch command, and runtime-state relationships; no new persistent business data.
- [CLI contract](contracts/cli.md): installation source, command name, invocation behavior, and environment expectations.
- [Quickstart](quickstart.md): baseline tests and supported-system validation from outside the project directory.

**Post-design constitution check**: Pass. The design uses the existing Node.js CLI and storage boundaries, adds no new service or data store, and keeps catalog/recommendation behavior unchanged.
