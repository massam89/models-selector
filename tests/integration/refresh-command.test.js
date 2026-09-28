import test from "node:test";
import assert from "node:assert/strict";
import { Readable, Writable } from "node:stream";
import { runCli } from "../../src/cli.js";
import { makeCatalog, makeModel } from "../fixtures.js";

function capture() {
  let text = "";
  return {
    stream: new Writable({
      write(chunk, _encoding, callback) {
        text += chunk.toString();
        callback();
      }
    }),
    text: () => text
  };
}

test("the menu's refresh option updates every configured provider", async () => {
  const output = capture();
  let state = { snapshots: {}, overrides: [], customModels: [] };
  const code = await runCli([], {
    catalog: makeCatalog([]),
    state,
    input: Readable.from(["2\n"]),
    output: output.stream,
    adapters: {
      openai: async () => [makeModel({ providerModelId: "openai-model" })],
      google: async () => [makeModel({ providerId: "google", providerModelId: "google-model" })]
    },
    saveState: async (next) => { state = structuredClone(next); },
    now: new Date("2026-09-27T12:00:00.000Z")
  });
  assert.equal(code, 0);
  assert.deepEqual(Object.keys(state.snapshots).sort(), ["google", "openai"]);
  assert.equal(state.snapshots.openai.models[0].providerModelId, "openai-model");
  assert.equal(state.snapshots.google.models[0].providerModelId, "google-model");
  assert.match(output.text(), /openai: refreshed 1 model/);
  assert.match(output.text(), /google: refreshed 1 model/);
});

test("refresh reports public-source fallback warnings without credentials", async () => {
  const output = capture();
  let state = { snapshots: {}, overrides: [], customModels: [] };
  const code = await runCli([], {
    catalog: makeCatalog([]),
    state,
    input: Readable.from(["2\n"]),
    output: output.stream,
    env: {},
    adapters: {
      openai: async () => ({
        models: [makeModel({ providerModelId: "public-model" })],
        warnings: ["Official source was blocked; OpenRouter data was used as fallback."]
      }),
      google: async () => [makeModel({ providerId: "google", providerModelId: "google-model" })]
    },
    saveState: async (next) => { state = structuredClone(next); }
  });
  assert.equal(code, 0);
  assert.equal(state.snapshots.openai.models[0].providerModelId, "public-model");
  assert.match(output.text(), /OpenRouter data was used as fallback/);
  assert.doesNotMatch(output.text(), /API_KEY/);
});
