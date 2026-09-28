# Model Selector

A simple Node.js CLI: choose a coding-task category to see up to 10 recommended
models and their 1–100 scores, or refresh all supported providers.

## Use

Requires Node.js 22 or newer and npm.

To run from the project directory:

```sh
npm start
```

After the package is published, install it globally from npm:

```sh
npm install --global models-selector
```

Open a new terminal session, then run `model-selector` from any directory.

To install directly from a local checkout instead, open a terminal in the project
root and run:

```sh
npm install --global . 
```

This local-source option is useful before the npm package is published or when
installing a particular checkout.

## Troubleshooting

Install Node.js 22 or newer and npm before installing Model Selector. If the
`model-selector` command is not found after installation, open a new terminal and
check the global npm prefix with `npm prefix --global`. The global executable
directory is the prefix itself on Windows and its `bin` subdirectory on
Unix-like systems; that directory must be on `PATH`.

To check which command your terminal will run, use `Get-Command model-selector`
in PowerShell, `where.exe model-selector` in Command Prompt, or
`command -v model-selector` in a POSIX shell. If another program with the same
name is found first, resolve the command-name or `PATH` conflict. When started
with an outdated Node.js runtime, Model Selector reports the detected version
and directs you to install a supported version.

When the app starts, choose **1. Suggest models** to select a task category and see
its highest-ranked models, or **2. Refresh models** to update every configured
provider. Scores award up to 70 points for supported task capabilities and up to 30
points for fresh, comparable price dominance over other available models. Unavailable
models are excluded; provider and model IDs break score ties. Task selection stays
local.

After showing recommendations, the app waits at **0. Previous**. Select it to return
to the category list; it will not return automatically. Select **0. Previous menu**
from the category list to return to the two-option menu. Refreshing providers also
returns to that menu. The app stays open until you close the terminal or interrupt it.

Refresh uses public sources without API keys. Official sources are used where
available; OpenRouter is a clearly labeled fallback. Refresh reports provider
outcomes and keeps the last successful snapshot when a refresh fails. Successful
refreshes remove models no longer returned by their source.
Official sources cover OpenAI, Anthropic, Google, Kimi, DeepSeek, xAI, Cohere, Qwen,
and MiniMax where their public docs expose parseable data; Mistral and Meta Llama
currently use OpenRouter.

## Categories

| Task |
|---|
| Simple coding question |
| Complex coding or architecture |
| Feature implementation |
| Easy debugging |
| Hard debugging |
| Performance optimization |
| Easy refactoring |
| Complex refactoring |
| Dependency upgrade or migration |
| Test writing |
| Code review |
| Security review |
| API and service integration |
| Documentation |

## Development

```sh
npm test
```
