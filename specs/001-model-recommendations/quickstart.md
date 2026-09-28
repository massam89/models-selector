# Quickstart: Model Selector

## Prerequisites

- Node.js 22 or newer.
- No provider credentials are needed.

## Use

1. Run `npm start`.
2. Choose **1. Suggest models** to select a task category and see up to 10 ranked
   model names, provider/model IDs, and scores, or **2. Refresh models** to refresh
   every configured provider.
3. After a recommendation, select **0. Previous** to return to the category list;
   the app waits for this selection instead of returning automatically. Select
   **0. Previous menu** from the category list to return to the main menu.
4. Scores combine task capability fit (up to 70 points) with fresh, comparable price
   dominance (up to 30 points). Recommendations do not display settings, exact
   prices, explanations, or comparisons; refresh reports each provider and preserves
   the last successful snapshot for failures.

Refresh uses mocked HTTP responses in automated tests; no live provider credentials
or calls are needed to run the test suite.

## Tests

```sh
npm test
```
