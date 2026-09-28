import test from "node:test";
import assert from "node:assert/strict";
import {
  applyFieldOverrides,
  modelKey,
  validateCatalog,
  validateModelProfile
} from "../../src/catalog.js";
import { makeCatalog, makeModel, today } from "../fixtures.js";

test("model identity includes provider and exact provider-assigned ID", () => {
  assert.equal(modelKey("openai", "same-name"), "openai/same-name");
  assert.notEqual(modelKey("openai", "same-name"), modelKey("google", "same-name"));
});

test("validates a catalog and rejects duplicate composite identities", () => {
  assert.equal(validateCatalog(makeCatalog()).models.length, 1);
  assert.throws(
    () => validateCatalog(makeCatalog([makeModel(), makeModel()])),
    /duplicate.*openai\/model-a/i
  );
});

test("distinguishes an unknown capability from explicitly unsupported", () => {
  const model = makeModel({
    capabilities: {
      unsupported: { support: "unsupported", source: "fixture" }
    }
  });
  assert.doesNotThrow(() => validateModelProfile(model, ["openai"]));
  assert.equal(model.capabilities.unknown, undefined);
  assert.equal(model.capabilities.unsupported.support, "unsupported");
});

test("rejects malformed pricing and unsupported model fields", () => {
  assert.throws(
    () => validateModelProfile(makeModel({
      pricing: [{ component: "input", amount: -1, currency: "USD", unit: "per-1m-tokens" }]
    }), ["openai"]),
    /amount/i
  );
  assert.throws(
    () => applyFieldOverrides(makeModel(), [{
      providerId: "openai",
      providerModelId: "model-a",
      fieldPath: "secret",
      value: "x",
      source: "manual",
      updatedAt: today
    }]),
    /not editable|allowlist/i
  );
});

test("applies valid field overrides without changing the base profile", () => {
  const model = makeModel();
  const result = applyFieldOverrides(model, [{
    providerId: "openai",
    providerModelId: "model-a",
    fieldPath: "displayName",
    value: "My label",
    source: "manual",
    updatedAt: today
  }]);
  assert.equal(result.displayName, "My label");
  assert.deepEqual(result.manualOverrides, ["displayName"]);
  assert.equal(model.displayName, "Model A");
});
