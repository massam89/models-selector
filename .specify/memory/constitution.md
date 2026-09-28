<!--
Sync Impact Report
Version change: 2.0.0 -> 3.0.0
Modified principles: II. Explainable Recommendations; III. Pricing-Aware Choices
Modified sections: Technical and Product Constraints
Reason: Recommendations now expose a concise 1–100 score derived from task fit and fresh comparable price dominance.
Follow-up TODOs: Align feature specification, CLI contract, plan, quickstart, and data model with weighted scoring.
-->
# model-selector Constitution

## Core Principles

### I. Simple, Task-First Experience
The CLI MUST help users identify the kind of work they need to do before recommending a
model. The initial task categories MUST be grounded in user needs and investigated before
they are finalized. The interface and implementation MUST favor clear, focused choices
over unnecessary complexity.

### II. Explainable Recommendations
Recommendations MUST be ranked deterministically using the selected task and known
model capabilities. The ranking rules MUST be testable and MUST NOT imply that one
model is universally best. The standard CLI output MUST remain concise and show model
names, provider/model identities, and a 1–100 recommendation score; it MUST NOT
display explanations, detailed capabilities, settings, or comparisons.

### III. Pricing-Aware Choices
Recommendations MUST derive up to 70 score points from task capability fit and up to
30 from price dominance over available models with fresh, comparable prices.
Unavailable models MUST be excluded; provider and model IDs MUST break score ties.
Pricing source and freshness MUST be retained internally, and unknown or uncertain
prices MUST NOT be invented or used for ranking.

### IV. Maintainable Model Catalog
The model list and its capabilities, supported parameters, and pricing MUST be
maintainable through an update workflow. Catalog data MUST make its source and update
status clear enough to avoid silently treating stale information as current.

### V. Node.js CLI
The product MUST remain a Node.js command-line application. Its user-facing behavior
MUST be usable from a terminal, and failures or missing data MUST be communicated
clearly rather than hidden behind misleading recommendations.

## Technical and Product Constraints

The application is a Node.js CLI. The user-facing application is limited to category
recommendations and refreshing all providers. Recommendation output contains model
names, provider/model identities, and concise scores. Task categories are a
product-discovery concern and MUST be investigated with users before being treated as
a complete or permanent list.

## Development Workflow

Changes to task categories, model matching, pricing, or catalog updates MUST include
automated checks for the behavior they affect. User-visible changes MUST keep relevant
usage guidance current. Reviews MUST verify that recommendation ranking and any pricing inputs are supported
by available catalog data.

## Governance

This constitution governs product and development decisions for model-selector. When
a change conflicts with a principle, the change MUST be revised or the constitution
MUST be amended before implementation. Amendments require an explicit rationale and
review by the project maintainer. Version changes follow semantic versioning: MAJOR
for incompatible governance changes, MINOR for added or materially expanded
principles, and PATCH for clarifications that do not change intent. Reviews MUST
check relevant changes for compliance with this constitution.

**Version**: 3.0.0 | **Ratified**: 2026-09-27 | **Last Amended**: 2026-09-27
