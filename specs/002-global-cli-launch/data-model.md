# Data Model: Global CLI Launch

## Scope

This feature adds no new application-owned records or persistent data schema. It exposes the existing package and command through a global installation. Catalog data remains packaged with the application; mutable runtime state remains in the user's existing configuration directory.

## Entities

### Installed Package

Represents one local global installation of Model Selector on a machine.

| Attribute | Description | Constraint |
|---|---|---|
| Package name | `models-selector` | npm package identity used for registry installation. |
| Source | npm registry after publication, or local project files | Both installation sources are supported. |
| Runtime requirement | Node.js `>=22` | Must match the package's existing engine requirement. |
| Included assets | CLI source, default catalog, and user guidance | Must remain available after installation and outside the source working directory. |

### Launch Command

Represents the executable name exposed by the installed package.

| Attribute | Description | Constraint |
|---|---|---|
| Name | `models-selector` | Executable name, matching the npm package name. |
| Entry point | Existing `src/cli.js` | Must retain its Node.js shebang and ESM behavior. |
| Arguments | None | Existing menu-driven workflow remains the interface. |
| Resolution | npm global executable directory | That directory must be available on the user's `PATH`. |

### Runtime State

Represents the existing per-user catalog snapshots and overrides. It is not new feature data.

| Attribute | Description | Constraint |
|---|---|---|
| Location | Platform-specific user configuration directory | Must not depend on the current working directory or be stored in the global package directory. |
| Contents | Existing snapshots, overrides, and custom-model state | Schema and behavior remain unchanged. |

## Relationships and Lifecycle

- Each Installed Package exposes one Launch Command.
- The Launch Command loads the default catalog from files included with its Installed Package and reads or writes the current user's Runtime State.
- The user installs `models-selector` from npm or installs a local checkout, then invokes `models-selector` from any working directory.
- Global installation and per-user state are machine-local; this feature does not synchronize either between machines.

## Validation Rules

- The npm package name and executable command must both be `models-selector`.
- The command entry point must exist in the installed package and be executable by Node.js.
- The package must include all source and data files needed for the menu and existing workflows.
- The runtime requirement must remain Node.js `>=22`, with an actionable error for an older runtime.
- Catalog lookup must be package-relative; runtime-state lookup must remain user-relative.
