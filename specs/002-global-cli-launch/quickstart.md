# Quickstart: Validate Global CLI Launch

## Prerequisites

- Node.js `>=22` and npm are installed.
- The npm global executable directory is on the terminal's `PATH`.
- The `models-selector` package is published to npm, or a local project checkout is available.

## Automated Baseline

From the project root, run:

```sh
npm test
```

Expected: the existing test suite passes.

## Install and Launch

After the package is published, install it from npm:

```sh
npm install --global models-selector
```

Before publication, or when validating a local checkout, install from the project root instead:

```sh
npm install --global .
```

Open a new terminal session, change to a directory outside the project, and run:

```sh
model-selector
```

Expected: the existing Model Selector main menu appears with **1. Suggest models** and **2. Refresh models**. Choose **1. Suggest models** and a task category to confirm recommendations load from the installed package. Return to the menu and verify that **2. Refresh models** remains available.

Choose **2. Refresh models** and verify that the app reports an outcome for each provider and returns to the main menu. A successful refresh stores runtime state under the user's platform-specific configuration directory, not under the current working directory:

- Windows: `%APPDATA%\model-selector`
- macOS: `~/Library/Application Support/model-selector`
- Linux: `$XDG_CONFIG_HOME/model-selector`, or `~/.config/model-selector` when `XDG_CONFIG_HOME` is unset

Repeat the launch from the project directory and from a newly opened terminal. All invocations must start the same application without requiring a project path.

## Troubleshooting

Check the runtime and npm global prefix:

```sh
node --version
npm prefix --global
```

The runtime must be version 22 or newer. The global executable directory must be on `PATH`: on Windows this is the npm prefix itself; on Unix-like systems it is the `bin` directory under the prefix.

To inspect command resolution, use `Get-Command model-selector` in PowerShell, `where.exe model-selector` in Command Prompt, or `command -v model-selector` in a POSIX shell. If another executable is found first, resolve the command-name or `PATH` conflict and open a new terminal session.
