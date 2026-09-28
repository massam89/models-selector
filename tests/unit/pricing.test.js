import test from "node:test";
import assert from "node:assert/strict";
import {
  comparePriceProfiles,
  getPriceFreshness
} from "../../src/recommendation.js";
import { makeModel } from "../fixtures.js";

function price(component, amount, extras = {}) {
  return {
    component,
    amount,
    currency: "USD",
    unit: "per-1m-tokens",
    source: "fixture",
    lastChecked: "2026-09-20",
    ...extras
  };
}

test("fresh comparable component-wise dominance orders an equal-fit pair", () => {
  const lower = makeModel({ pricing: [price("input", 1), price("output", 2)] });
  const higher = makeModel({ providerModelId: "b", pricing: [price("input", 2), price("output", 3)] });
  assert.equal(comparePriceProfiles(lower, higher, new Date("2026-09-27")).order, -1);
});

test("crossed, incomplete, or non-comparable prices do not order a pair", () => {
  const crossedA = makeModel({ pricing: [price("input", 1), price("output", 4)] });
  const crossedB = makeModel({ providerModelId: "b", pricing: [price("input", 2), price("output", 3)] });
  assert.equal(comparePriceProfiles(crossedA, crossedB, new Date("2026-09-27")).order, 0);
  const incomplete = makeModel({ providerModelId: "c", pricing: [price("input", 1)] });
  assert.equal(comparePriceProfiles(incomplete, crossedB, new Date("2026-09-27")).order, 0);
  const otherCurrency = makeModel({
    providerModelId: "d",
    pricing: [price("input", 2, { currency: "EUR" }), price("output", 3, { currency: "EUR" })]
  });
  assert.equal(comparePriceProfiles(crossedA, otherCurrency, new Date("2026-09-27")).order, 0);
});

test("price freshness distinguishes fresh, stale, and unknown dates", () => {
  assert.equal(getPriceFreshness(price("input", 1), new Date("2026-09-27")), "fresh");
  assert.equal(getPriceFreshness(price("input", 1, { lastChecked: "2026-08-27" }), new Date("2026-09-27")), "stale");
  assert.equal(getPriceFreshness(price("input", 1, { lastChecked: undefined }), new Date("2026-09-27")), "unknown");
});

test("different applicability conditions cannot be compared", () => {
  const standard = makeModel({ pricing: [price("input", 1), price("output", 2)] });
  const batch = makeModel({
    providerModelId: "batch",
    pricing: [price("input", 0.5, { conditions: { tier: "batch" } }), price("output", 1, { conditions: { tier: "batch" } })]
  });
  assert.equal(comparePriceProfiles(standard, batch, new Date("2026-09-27")).order, 0);
});
