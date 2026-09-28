import test from "node:test";
import assert from "node:assert/strict";
import { buildEffectiveCatalog, refreshProviderCatalog } from "../../src/catalog.js";
import { makeCatalog, makeModel } from "../fixtures.js";

const providers = [{
  id: "openai",
  displayName: "OpenAI",
  catalogEndpoint: "https://api.example.test/models",
  pricingSource: "https://example.test/pricing"
}];

test("refresh preserves the last usable snapshot when the provider fails", async () => {
  const previous = [{ providerId: "openai", providerModelId: "old", displayName: "Old" }];
  const state = { snapshots: { openai: { models: previous } }, overrides: [], customModels: [] };
  let saved = false;
  const result = await refreshProviderCatalog({
    providers,
    providerIds: ["openai"],
    state,
    adapters: { openai: async () => { throw new Error("provider unavailable"); } },
    saveState: async () => { saved = true; }
  });
  assert.equal(result.outcomes[0].success, false);
  assert.equal(state.snapshots.openai.models[0].providerModelId, "old");
  assert.equal(saved, false);
});

test("refresh stores a complete snapshot atomically and reports per-provider success", async () => {
  const state = { snapshots: {}, overrides: [], customModels: [] };
  let saved = false;
  const result = await refreshProviderCatalog({
    providers,
    providerIds: ["openai"],
    state,
    adapters: { openai: async () => [{ providerId: "openai", providerModelId: "new", displayName: "New" }] },
    saveState: async () => { saved = true; },
    now: new Date("2026-09-27")
  });
  assert.equal(result.outcomes[0].success, true);
  assert.equal(state.snapshots.openai.models[0].providerModelId, "new");
  assert.equal(saved, true);
});

test("invalid or missing provider selections fail without mutating snapshots", async () => {
  const state = { snapshots: {}, overrides: [], customModels: [] };
  await assert.rejects(refreshProviderCatalog({
    providers,
    providerIds: ["unknown"],
    state,
    adapters: {},
    saveState: async () => {}
  }), /unknown provider/i);
  assert.deepEqual(state.snapshots, {});
});

test("provider model-list refresh preserves curated fields and manual overrides", () => {
  const catalog = makeCatalog([makeModel()]);
  const state = {
    snapshots: {
      openai: {
        lastSuccessfulRefresh: "2026-09-27T12:00:00.000Z",
        models: [{
          providerId: "openai",
          providerModelId: "model-a",
          displayName: "Provider label",
          availability: "available",
          capabilities: {},
          supportedSettings: {},
          pricing: [],
          source: "https://api.example.test/models",
          lastChecked: "2026-09-27T12:00:00.000Z"
        }]
      }
    },
    overrides: [{
      providerId: "openai",
      providerModelId: "model-a",
      fieldPath: "displayName",
      value: "My label",
      source: "manual",
      updatedAt: "2026-09-27"
    }],
    customModels: []
  };
  const effective = buildEffectiveCatalog(catalog, state);
  assert.equal(effective.models[0].displayName, "My label");
  assert.equal(effective.models[0].capabilities.coding.support, "supported");
  assert.deepEqual(effective.models[0].supportedSettings.temperature, {
    supported: true,
    source: "fixture"
  });
});

test("refresh retries a transient provider failure once, then succeeds", async () => {
  let calls = 0;
  const state = { snapshots: {}, overrides: [], customModels: [] };
  const result = await refreshProviderCatalog({
    providers,
    providerIds: ["openai"],
    state,
    adapters: {
      openai: async () => {
        calls += 1;
        if (calls === 1) {
          const error = new Error("temporarily unavailable");
          error.retryable = true;
          throw error;
        }
        return [{
          providerId: "openai",
          providerModelId: "new",
          displayName: "New",
          source: "https://api.example.test/models",
          availability: "available",
          capabilities: {},
          supportedSettings: {},
          pricing: []
        }];
      }
    },
    saveState: async () => {},
    now: new Date("2026-09-27")
  });
  assert.equal(calls, 2);
  assert.equal(result.outcomes[0].success, true);
});

test("a successful refresh removes stale snapshot models but preserves their override records", async () => {
  const oldModel = {
    providerId: "openai",
    providerModelId: "removed",
    displayName: "Old provider model",
    availability: "available",
    capabilities: {},
    supportedSettings: {},
    pricing: [],
    source: "https://api.example.test/models",
    lastChecked: "2026-09-20"
  };
  const state = {
    snapshots: { openai: { models: [oldModel], lastSuccessfulRefresh: "2026-09-20" } },
    overrides: [{
      providerId: "openai",
      providerModelId: "removed",
      fieldPath: "displayName",
      value: "My saved label",
      source: "manual",
      updatedAt: "2026-09-20"
    }],
    customModels: []
  };
  let savedState;
  await refreshProviderCatalog({
    providers,
    providerIds: ["openai"],
    state,
    adapters: { openai: async () => [{
      providerId: "openai",
      providerModelId: "current",
      displayName: "Current model"
    }] },
    saveState: async (candidate) => { savedState = structuredClone(candidate); },
    now: new Date("2026-09-27")
  });
  assert.deepEqual(
    state.snapshots.openai.models.map((model) => model.providerModelId),
    ["current"]
  );
  assert.deepEqual(
    savedState.snapshots.openai.models.map((model) => model.providerModelId),
    ["current"]
  );
  assert.equal(state.overrides[0].value, "My saved label");
  const effective = buildEffectiveCatalog(makeCatalog([]), state);
  assert.deepEqual(effective.models.map((model) => model.providerModelId), ["current"]);
});

test("an empty provider response does not replace the last usable snapshot", async () => {
  const existing = [{
    providerId: "openai",
    providerModelId: "old",
    displayName: "Old",
    availability: "available",
    capabilities: {},
    supportedSettings: {},
    pricing: [],
    source: "https://api.example.test/models",
    lastChecked: "2026-09-20"
  }];
  const state = {
    snapshots: { openai: { models: existing, lastSuccessfulRefresh: "2026-09-20" } },
    overrides: [],
    customModels: []
  };
  const result = await refreshProviderCatalog({
    providers,
    providerIds: ["openai"],
    state,
    adapters: { openai: async () => [] },
    saveState: async () => {}
  });
  assert.equal(result.outcomes[0].success, false);
  assert.deepEqual(state.snapshots.openai.models, existing);
});
