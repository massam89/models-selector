# Research: Global CLI Launch

**Date**: 2026-09-28
**Scope**: Distribute the existing Node.js ESM CLI as the `models-selector` npm package and support local-project global installation as an alternative.

## Decision 1: Publish through npm and retain local installation

**Decision**: After publication, users install the package with `npm install --global models-selector`. Keep `npm install --global .` (or `npm install --global <project-path>`) available for local checkouts.

**Rationale**: Registry installation lets users install without obtaining the project files themselves. npm's local package install remains useful before publication and for users who prefer a particular checkout.

**Alternatives considered**:

- Local-only installation: retained as an alternative, but not the only distribution method.
- `npm link`: useful for active development because it links the working directory, but it is not the default end-user installation flow.
- Platform-specific installers: unnecessary for a Node.js CLI and outside the chosen distribution scope.
- A packed tarball: possible, but unnecessary for the supported npm registry and local-checkout workflows.

**Sources**:

- [npm install](https://docs.npmjs.com/cli/v10/commands/npm-install)
- [npm link](https://docs.npmjs.com/cli/v10/commands/npm-link)

## Decision 2: Register the existing entry point with `bin`

**Decision**: Add a `bin` mapping from the exact command name `model-selector` to `src/cli.js`. Keep the existing `#!/usr/bin/env node` shebang, ESM package type, and Node engine requirement.

**Rationale**: npm uses package `bin` metadata to create the command link or shim. The current CLI already has the required shebang and resolves its packaged catalog relative to its own source file, so it can serve as the entry point without adding a separate wrapper.

**Alternatives considered**:

- Shell aliases or per-shell scripts: would need separate user configuration and would not make the command uniformly available across terminals.
- Per-operating-system launchers: npm already creates platform-appropriate command shims from the single entry point.
- Rewriting the application as a standalone executable: conflicts with the Node.js CLI constraint and is not required.

**Sources**:

- [package.json `bin`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#bin)
- [Node.js packages and module type](https://nodejs.org/api/packages.html#determining-module-system)
- [npm cmd-shim](https://github.com/npm/cmd-shim)

## Decision 3: Treat Node.js >=22 and global PATH as explicit prerequisites

**Decision**: Keep Node.js `>=22` as the supported runtime, document that prerequisite and the npm global executable path, and provide a startup version guard so an outdated Node.js runtime gets an actionable error. Document that a Node.js runtime and npm must be installed before the package can be installed.

**Rationale**: npm's `engines` metadata is advisory unless the user's npm configuration enables `engine-strict`; it does not guarantee that an incompatible runtime cannot attempt to launch the command. npm links global executables under `{prefix}/bin` on Unix-like systems and directly under `{prefix}` on Windows. Those directories must be on `PATH`; npm does not add them to `PATH` for a particular package.

**Alternatives considered**:

- Rely only on the `engines` warning: insufficient for clear launch-time feedback.
- Change the user's `PATH` automatically: npm does not provide package-specific PATH modification, and changing shell configuration is out of scope.
- Claim support without Node/npm installed: incompatible with a global install through the existing runtime/package ecosystem.

**Sources**:

- [package.json `engines`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#engines)
- [npm `engine-strict` configuration](https://docs.npmjs.com/cli/v10/using-npm/config#engine-strict)
- [npm folders and executables](https://docs.npmjs.com/cli/v10/configuring-npm/folders#executables)

## Decision 4: Keep application data anchored to the installed package and user state separate

**Decision**: Continue loading `data/default-catalog.json` relative to the CLI module and keep runtime state in the existing per-user configuration directory. Ensure the installed package includes `src/`, `data/`, and `README.md`.

**Rationale**: This preserves the current data model and lets a global invocation work from any current directory. The package manifest already includes all three required paths; `npm pack --dry-run --json` confirmed that the CLI, catalog, and README are included.

**Alternatives considered**:

- Resolve catalog data from the current working directory: fails when launched elsewhere.
- Store user state inside the global package installation: risks losing user state on package replacement and is not writable for many system-wide installs.
- Copy data into each launch directory: unnecessary and inconsistent with the existing design.

## Decision 5: Rely on npm's cross-platform command shims and document conflict recovery

**Decision**: Do not implement custom operating-system launchers. Document how users can identify command resolution and restore the intended npm global executable directory to `PATH` if the command is missing or shadowed.

**Rationale**: npm links executable files on POSIX systems and generates command shims on Windows. The package author supplies one Node entry point; the user's shell resolves the first matching command on `PATH`.

**Alternatives considered**:

- Shipping separate `.cmd`, PowerShell, and shell files: duplicates npm's shim behavior.
- Silently renaming or overriding a conflicting command: could launch the wrong program or surprise users; instead provide clear inspection and resolution guidance.

**Sources**:

- [npm package `bin`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#bin)
- [npm folders and executables](https://docs.npmjs.com/cli/v10/configuring-npm/folders#executables)
- [npm cmd-shim](https://github.com/npm/cmd-shim)
