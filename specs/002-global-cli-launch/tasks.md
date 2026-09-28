# Tasks: Global CLI Launch

**Input**: Design documents from `specs/002-global-cli-launch/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/cli.md`, `quickstart.md`

**Tests**: Add the isolated global-install smoke test specified in `plan.md`; also validate with the existing `npm test` suite, package inspection, and the end-to-end scenarios in `quickstart.md`.

**Organization**: Tasks are grouped by the prioritized user stories in `spec.md`. The existing project structure and test harness already exist, so Setup and Foundational phases require no new files or infrastructure.

## Phase 1: Setup

**Purpose**: The repository is already an initialized Node.js CLI with source, data, documentation, and tests.

No setup tasks are required.

---

## Phase 2: Foundational

**Purpose**: No new shared infrastructure or dependencies are needed; the existing package and CLI provide the foundation.

No foundational tasks are required.

---

## Phase 3: User Story 1 - Launch from any terminal (Priority: P1) 🎯 MVP

**Goal**: Install the `models-selector` npm package or a local checkout and start the existing app with `models-selector` from any terminal working directory.

**Independent Test**: Install from the project files on a supported machine, open a new terminal in a directory outside the project, run `models-selector`, and verify that the existing main menu appears.

### Implementation

- [X] T001 [P] [US1] Set the npm package name and executable command to `models-selector` in `package.json`, preserving the Node.js engine requirement and included source/data files.
- [X] T002 [P] [US1] Document global installation with `npm install --global models-selector` after publication and local-checkout installation with `npm install --global .`; explain prerequisites, launching from any working directory, and opening a new terminal.

**Checkpoint**: The global command starts the existing menu from outside the project directory without publishing the package.

---

## Phase 4: User Story 2 - Use existing selector workflows (Priority: P2)

**Goal**: Preserve catalog loading, per-user state, recommendations, and provider refresh when the CLI is launched globally.

**Independent Test**: From an unrelated working directory, launch the installed command, get a recommendation using a task category, return to the main menu, and verify the provider-refresh option and its existing outcome flow remain available.

### Implementation

- [X] T003 [P] [US2] Extend `specs/002-global-cli-launch/quickstart.md` to verify both existing menu workflows and package-relative catalog/user-state access from outside the project directory.

**Checkpoint**: The installed command uses the packaged catalog and existing per-user state, and retains both existing actions.

---

## Phase 5: User Story 3 - Resolve setup problems (Priority: P3)

**Goal**: Give users clear recovery guidance for an outdated runtime, missing command, PATH issue, or command-name conflict.

**Independent Test**: Verify that an outdated Node.js runtime produces a visible message with the detected and required versions, and confirm the README explains how to install prerequisites and diagnose command resolution.

### Implementation

- [X] T004 [P] [US3] Add a Node.js version check to `src/cli.js` before showing the menu; report the detected version, Node.js 22 minimum, and an upgrade step, change invalid-argument guidance from `npm start` to `models-selector`, and recognize npm's symlinked entry path.
- [X] T005 [P] [US3] Add troubleshooting guidance to `README.md` for missing/outdated Node.js or npm, the npm global prefix and platform-specific PATH location, new terminal sessions, and command-name conflicts.

**Checkpoint**: Runtime and command-resolution failures provide actionable guidance without appearing to launch successfully.

---

## Phase 6: Polish & Cross-Cutting Validation

**Purpose**: Confirm package contents, existing behavior, and end-to-end global launch.

- [X] T006 Add a cross-platform local npm global-install smoke test in `tests/integration/global-install.test.js`; invoke `models-selector` by name from an unrelated working directory and verify the menu and a recommendation appear.
- [ ] T007 Re-verify final package metadata and included assets with `npm pack --dry-run --json`, then run the existing `npm test` suite from the repository root.
- [ ] T008 Follow `specs/002-global-cli-launch/quickstart.md` to install from npm (or local project files before publication) and launch from outside the project; verify the command, menu workflows, and documented recovery on each supported operating system.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No work required; the Node.js CLI is already initialized.
- **Foundational (Phase 2)**: No work required; existing package metadata, CLI, data, and test harness are sufficient.
- **User Story 1 (Phase 3)**: Starts immediately; T001 and T002 are independent and may run in parallel.
- **User Stories 2 and 3 (Phases 4 and 5)**: Both depend on User Story 1. They may proceed in parallel after T001 and T002; T003, T004, and T005 modify separate files.
- **Polish (Phase 6)**: Depends on T003, T004, and T005. T006 also requires T001 and T004; T007 follows T006; T008 follows T007.

### Task Dependency Graph

- T001 and T002 have no prerequisites.
- T003 depends on T001 and T002.
- T004 depends on T001 and T002; T005 depends on T001 and T002.
- T006 depends on T001 and T004.
- T007 depends on T003, T004, T005, and T006.
- T008 depends on T007.

### Parallel Opportunities

- **User Story 1**: T001 (`package.json`) and T002 (`README.md`) can run in parallel.
- **User Story 2**: T003 has no parallel task within its story; after User Story 1, it can run alongside T004 and T005.
- **User Story 3**: T004 (`src/cli.js`) and T005 (`README.md`) can run in parallel after their User Story 1 prerequisites.
- **Polish**: T006 adds the isolated install smoke test; T007 validates package contents and runs the suite; T008 performs the documented platform checks.

### Parallel Execution Examples

**User Story 1** — after confirming the existing project files are unchanged:

```text
T001: Update package.json with the command mapping.
T002: Update README.md with local global-install instructions.
```

**User Story 2 and User Story 3** — after T001 and T002:

```text
T003: Extend the quickstart workflow validation.
T004: Add the runtime guard and correct command guidance in src/cli.js.
T005: Add prerequisite and PATH troubleshooting in README.md.
```

## Implementation Strategy

### MVP First (User Story 1)

1. Complete T001 and T002.
2. Install from local project files and independently verify `models-selector` starts from an unrelated directory.
3. Stop and validate this MVP before adding recovery polish.

### Incremental Delivery

1. Deliver User Story 1 for registry and local global installation and launch.
2. Verify User Story 2 preserves recommendations, refresh availability, and data access.
3. Add User Story 3 runtime and PATH recovery guidance.
4. Complete package, regression, and supported-platform validation in Phase 6.

## Notes

- `[P]` tasks use separate files and can run concurrently after their stated prerequisites.
- `[US1]`, `[US2]`, and `[US3]` map to the corresponding prioritized stories in `spec.md`.
- The smoke test uses a temporary npm prefix so it does not modify the developer's global installation.
- T008's Windows validation is covered locally; macOS and Linux runs remain pending because those environments are unavailable here.
- T007 remains pending after the package rename; npm validation and publication were not performed in this update.
