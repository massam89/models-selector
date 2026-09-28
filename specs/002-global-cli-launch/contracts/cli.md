# CLI Contract: Global Launch

## Installation

- The machine must have Node.js `>=22` and npm installed.
- After publication, users install globally with `npm install --global models-selector`.
- Users may install from the project root with `npm install --global .`, or supply another local project path.
- The installed package and its `bin`-mapped executable are both named `models-selector`.
- The npm global executable directory must be on the user's `PATH`. It is `{prefix}/bin` on Unix-like systems and `{prefix}` on Windows.

## Invocation

```text
models-selector
```

- No arguments are required or accepted; the existing interactive menu remains the user interface.
- If arguments are supplied, the command rejects them and directs the user to launch `models-selector` without arguments.
- The command must start from the project directory or any unrelated working directory.
- The command displays the existing Model Selector menu and retains the recommendation and provider-refresh actions.
- The default catalog is read from the installed package. Existing mutable state continues to be read from and written to the user's platform-specific configuration directory.

## Failure and Recovery

- If Node.js is older than 22, the application must display the detected version, the minimum required version, and an actionable upgrade instruction before entering the menu.
- If the command cannot be resolved, the installation guidance must direct users to check the global npm executable directory and any earlier command with the same name on `PATH`.
- If users choose local-source installation, the project files must be available locally.
- Startup errors must remain visible to the user and must not be presented as a successful launch.

## Platform Behavior

npm is responsible for creating the platform-specific executable link or shim from the package command mapping and Node.js shebang. No separate operating-system launcher is part of the CLI contract.
