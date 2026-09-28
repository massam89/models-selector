# CLI Contract

The user starts the app with `npm start`. The app presents exactly two actions:

1. **Suggest models** — select a task category and display up to 10 ranked model
   names and provider/model IDs. The results screen waits for **0. Previous** before
   returning to the category list. The category list includes **0. Previous menu**
   to return to the main menu.
2. **Refresh models** — refresh every configured provider, report each outcome, then
   return to the main menu.

The app does not require command arguments or expose separate commands for refresh,
catalog listing, model addition, or model editing.

## Suggest Models

After the user selects **Suggest models**, display the configured task categories.
Accept one category and immediately display up to 10 available models. Exclude
unavailable models. Score each remaining model from 1 to 100: up to 70 points are
based on the fraction of selected capability tags known to be supported; up to 30
points are based on the model's share of decisive, fresh, comparable price
dominances among available models. Round to the nearest integer and clamp the minimum
to 1. Equal scores use provider ID and then model ID.

Output shows model names, provider/model identities, and scores. It does not show
reasons, detailed capabilities, settings, prices, or comparisons. If no models are
available, show one concise message and wait for **0. Previous** before returning to
the category list.

## Refresh Models

Refresh uses unauthenticated public HTTPS sources; users do not configure API keys.
Every configured provider is attempted. Official provider pages are preferred where
extractable, with OpenRouter as an explicitly reported fallback. Successful sources
replace their provider snapshot; failures retain the last usable snapshot. See
[Provider Source Contracts](provider-sources.md) for source and attribution
requirements.

Invalid menu selections or unexpected command arguments are reported and exit
non-zero. Refresh reports each provider outcome and exits non-zero if any provider
refresh fails.
