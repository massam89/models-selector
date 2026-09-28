# Feature Specification: Global CLI Launch

**Feature Branch**: `not-created`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: Make the existing Model Selector available by typing `models-selector` from any terminal, instead of starting it from its project folder. Users should be able to install it globally through the project's existing runtime/package ecosystem on operating systems supported by that runtime.

## Clarifications

### Session 2026-09-28

- Q: Should users be able to install from a public package registry, or should installation require access to this project's files? → A: Support both: publish the `models-selector` npm package for registry installation, and retain local-project installation as an alternative.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Launch from any terminal (Priority: P1)

As a Model Selector user, I want to install the published npm package globally (or install from a local project checkout) and run `models-selector` from any terminal and working directory, so I can use it without finding or entering the project folder.

**Why this priority**: Direct command-line access is the primary value of the feature.

**Independent Test**: Install the app on a supported system, open a fresh terminal in a directory outside the project, run `models-selector`, and verify that the existing main menu appears.

**Acceptance Scenarios**:

1. **Given** the app is installed on a supported system, **When** the user opens a terminal in an unrelated directory and runs `models-selector`, **Then** the app starts and displays its existing main menu.
2. **Given** the app is installed, **When** the user runs `models-selector` from the project directory or another terminal session, **Then** the same application starts without requiring a project path or a change to the current directory.
3. **Given** the user follows the npm-package or local-checkout installation instructions on a supported system, **When** installation completes, **Then** the command is available in a newly opened terminal.

### User Story 2 - Use existing selector workflows (Priority: P2)

As a Model Selector user, I want the globally launched app to retain its existing recommendation and provider-refresh workflows, so the convenient launch method does not change what the app does.

**Why this priority**: Global access is useful only if it opens the same working product.

**Independent Test**: Launch the app using `models-selector`, select each existing main-menu option, and verify the recommendation and refresh flows remain available.

**Acceptance Scenarios**:

1. **Given** the user launches the app with `models-selector`, **When** the main menu appears, **Then** the user can choose either model recommendations or provider refresh as before.
2. **Given** the user starts the app outside the project directory, **When** the user completes either existing workflow, **Then** the app uses its required catalog data and reports outcomes as it does when started from the project directory.

### User Story 3 - Resolve setup problems (Priority: P3)

As a user whose system is missing a prerequisite or cannot resolve the command, I want clear setup guidance, so I can understand what prevents the app from starting.

**Why this priority**: Clear recovery guidance reduces confusion during installation while remaining secondary to successful global launch.

**Independent Test**: Attempt installation or launch in an environment missing a required prerequisite or command-path setup, and verify the user receives an actionable explanation.

**Acceptance Scenarios**:

1. **Given** a required runtime prerequisite is missing, **When** the user attempts to install or run the app, **Then** the user receives a clear message identifying the missing prerequisite and the next step.
2. **Given** installation completes but the command is not available in the current terminal session, **When** the user follows the documented recovery guidance, **Then** the guidance explains how to make the command available in a new terminal session.
3. **Given** another installed program already uses the `models-selector` command name, **When** the user attempts to install or run this app, **Then** the user receives guidance to identify and resolve the command-name conflict.

### Edge Cases

- The user runs the command before installation has completed or from a terminal session that cannot resolve it.
- The required runtime is missing or below the version required by the existing application.
- The command name is already used by another installed program.
- The user launches the app from a directory that does not contain project files.
- The local catalog is missing or unreadable when the user chooses an existing workflow.
- The operating system is not supported by the existing runtime/package ecosystem.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST be installable globally through npm as the `models-selector` package after publication, and directly from local project files as an alternative.
- **FR-002**: After installation, users MUST be able to launch the app by entering `models-selector` in any terminal session on an operating system supported by the existing runtime/package ecosystem.
- **FR-003**: Launching the command MUST NOT require users to navigate to the project directory or provide a project path.
- **FR-004**: The command MUST open the existing interactive main menu and preserve the current recommendation and provider-refresh workflows.
- **FR-005**: The app MUST locate and use the data it needs when launched from outside the project directory.
- **FR-006**: The project MUST provide user-facing guidance for installing the npm package or a local checkout, meeting required prerequisites, and resolving an unavailable command after installation.
- **FR-007**: When the app cannot start because a prerequisite is missing or the environment is unsupported, it MUST report the problem clearly and provide an actionable next step; it MUST NOT report a successful launch.
- **FR-008**: If an installation or command-name conflict prevents users from obtaining the intended command, the user MUST receive clear guidance to identify and resolve the conflict.

### Key Entities

- **Global Installation**: An installation of the `models-selector` npm package or local checkout that makes its launch command available outside the project directory.
- **Launch Command**: The `models-selector` command that starts the existing interactive application.
- **Supported Environment**: A machine, terminal session, and operating system meeting the existing runtime/package ecosystem's prerequisites.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of first-time test users can follow the installation guidance and reach the existing main menu within five minutes on a supported system.
- **SC-002**: In 100% of supported operating-system test runs, users can start the app with `models-selector` from the project directory, an unrelated directory, and a newly opened terminal.
- **SC-003**: 100% of existing main-menu workflows remain available when the app is launched with `models-selector`.
- **SC-004**: In 100% of tested missing-prerequisite and unsupported-environment cases, users receive an accurate explanation and a practical next step.

## Assumptions

- Registry users do not need the project files; users choosing local-source installation obtain the project files separately on each machine. Neither installation method synchronizes files or installations between machines.
- Installation uses the project's existing runtime/package ecosystem rather than standalone operating-system installers.
- The package is intended for publication to the public npm registry as `models-selector`; local-source installation remains available as an alternative.
- The machine must meet the existing application runtime prerequisite; systems outside the runtime's supported operating systems are out of scope.
- The existing app behavior, menu options, and catalog-refresh behavior are not otherwise changed by this feature.
- Users can open a new terminal session after installation if their current session does not yet recognize the command.
