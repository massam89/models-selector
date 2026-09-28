import test from "node:test";
import assert from "node:assert/strict";
import { recommendModels } from "../../src/recommendation.js";
import { makeModel, makeCatalog } from "../fixtures.js";

test("ranks supported capability tags and breaks remaining ties by identity", () => {
  const catalog = makeCatalog([
    makeModel({
      providerModelId: "z",
      capabilities: {
        debugging: { support: "supported", source: "fixture" },
        reasoning: { support: "supported", source: "fixture" }
      }
    }),
    makeModel({
      providerModelId: "a",
      capabilities: { debugging: { support: "supported", source: "fixture" } }
    }),
    makeModel({
      providerId: "google",
      providerModelId: "b",
      capabilities: { debugging: { support: "supported", source: "fixture" } }
    })
  ]);
  const result = recommendModels(catalog.models, ["debugging", "reasoning"], { now: new Date("2026-09-27") });
  assert.deepEqual(result.results.map(({ model }) => model.providerId + "/" + model.providerModelId),
    ["openai/z", "google/b", "openai/a"]);
  assert.deepEqual(result.results.map(({ score }) => score), [70, 35, 35]);
});

test("unknown and explicitly unsupported capabilities rank below confirmed support", () => {
  const models = [
    makeModel({ capabilities: {} }),
    makeModel({
      providerModelId: "unsupported",
      capabilities: { debugging: { support: "unsupported", source: "fixture" } }
    }),
    makeModel({
      providerModelId: "supported",
      capabilities: { debugging: { support: "supported", source: "fixture" } }
    })
  ];
  const result = recommendModels(models, ["debugging"]);
  assert.deepEqual(result.results.map(({ model }) => model.providerModelId), [
    "supported",
    "model-a",
    "unsupported"
  ]);
});

test("unavailable models are not included in recommendation candidates", () => {
  const available = makeModel();
  const unavailable = makeModel({
    providerModelId: "offline",
    availability: "unavailable"
  });
  const result = recommendModels([unavailable, available], ["coding"]);
  assert.deepEqual(result.results.map(({ model }) => model.providerModelId), ["model-a"]);
});

test("score uses 70 capability points and 30 points for fresh comparable price dominance", () => {
  const cheap = makeModel({
    providerModelId: "cheap",
    pricing: [
      { component: "input", amount: 1, currency: "USD", unit: "token", lastChecked: "2026-09-20" },
      { component: "output", amount: 2, currency: "USD", unit: "token", lastChecked: "2026-09-20" }
    ]
  });
  const expensive = makeModel({
    providerModelId: "expensive",
    pricing: [
      { component: "input", amount: 2, currency: "USD", unit: "token", lastChecked: "2026-09-20" },
      { component: "output", amount: 3, currency: "USD", unit: "token", lastChecked: "2026-09-20" }
    ]
  });
  const result = recommendModels([expensive, cheap], ["coding"], { now: new Date("2026-09-27") });
  assert.deepEqual(result.results.map(({ model, score }) => [model.providerModelId, score]), [
    ["cheap", 100],
    ["expensive", 70]
  ]);
});

test("incomparable prices do not affect score or identity tie-breaking", () => {
  const models = [
    makeModel({
      providerModelId: "b",
      pricing: [{ component: "input", amount: 1, currency: "USD", unit: "token", lastChecked: "2026-09-20" }]
    }),
    makeModel({
      providerModelId: "a",
      pricing: [{ component: "output", amount: 1, currency: "USD", unit: "token", lastChecked: "2026-09-20" }]
    })
  ];
  const result = recommendModels(models, ["coding"], { now: new Date("2026-09-27") });
  assert.deepEqual(result.results.map(({ model, score }) => [model.providerModelId, score]), [
    ["a", 70],
    ["b", 70]
  ]);
});
