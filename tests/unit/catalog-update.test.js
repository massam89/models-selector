import test from "node:test";
import assert from "node:assert/strict";
import {
  addManualModel,
  createFieldOverride,
  resetFieldOverride,
  setFieldOverride
} from "../../src/catalog.js";
import { makeCatalog, makeModel, today } from "../fixtures.js";

test("adds a validated manual model and rejects duplicate composite identity", () => {
  const catalog = makeCatalog([]);
  const added = addManualModel(catalog, makeModel({ source: "manual" }));
  assert.equal(added.models.length, 1);
  assert.throws(() => addManualModel(added, makeModel({ source: "manual" })), /duplicate/i);
});

test("field overrides take precedence until the selected field is reset", () => {
  const override = createFieldOverride({
    providerId: "openai",
    providerModelId: "model-a",
    fieldPath: "displayName",
    value: "Edited name",
    source: "manual note",
    updatedAt: today
  });
  let state = setFieldOverride({ snapshots: {}, overrides: [], customModels: [] }, override);
  assert.equal(state.overrides[0].value, "Edited name");
  state = resetFieldOverride(state, "openai", "model-a", "displayName");
  assert.deepEqual(state.overrides, []);
});

test("rejects invalid editable values without changing the original state", () => {
  const state = { snapshots: {}, overrides: [], customModels: [] };
  assert.throws(() => createFieldOverride({
    providerId: "openai",
    providerModelId: "model-a",
    fieldPath: "availability",
    value: "maybe",
    source: "manual",
    updatedAt: today
  }), /availability/i);
  assert.deepEqual(state.overrides, []);
});
