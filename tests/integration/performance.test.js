import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { recommendModels } from "../../src/recommendation.js";
import { makeModel } from "../fixtures.js";

test("recommendation ranking completes under one second for 500 profiles", () => {
  const models = Array.from({ length: 500 }, (_, index) => makeModel({
    providerId: index % 2 === 0 ? "openai" : "google",
    providerModelId: `model-${String(index).padStart(3, "0")}`,
    capabilities: {
      debugging: { support: index % 3 === 0 ? "supported" : "unsupported", source: "fixture" },
      reasoning: { support: index % 7 === 0 ? "supported" : "unsupported", source: "fixture" }
    }
  }));
  const started = performance.now();
  const result = recommendModels(models, ["debugging", "reasoning"]);
  const elapsed = performance.now() - started;
  assert.equal(result.results.length, 500);
  assert.ok(elapsed < 1000, `recommendation took ${elapsed.toFixed(1)}ms`);
});
