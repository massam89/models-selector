import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { Writable } from "node:stream";
import { runCli } from "../../src/cli.js";
import { makeCatalog, makeModel } from "../fixtures.js";

test("recommendation output includes the score without exposing settings or price source details", async () => {
  let text = "";
  const output = new Writable({ write(chunk, _encoding, callback) { text += chunk; callback(); } });
  const catalog = makeCatalog([
    makeModel({
      supportedSettings: {
        temperature: { supported: false, source: "fixture" },
        reasoningEffort: { supported: true, values: ["low", "high"], source: "fixture" }
      },
      pricing: [{
        component: "input",
        amount: 1,
        currency: "USD",
        unit: "per-1m-tokens",
        source: "fixture price list",
        lastChecked: "2026-09-27"
      }]
    })
  ]);
  await runCli([], {
    catalog,
    state: { snapshots: {}, overrides: [], customModels: [] },
    output,
    input: Readable.from(["1\n", "1\n"])
  });
  assert.match(text, /Top 10 by score:[^\r\n]*\r?\n1\. Model A \[openai\/model-a\] — score 70\/100/);
  assert.doesNotMatch(text, /reasoningEffort|temperature|fixture price list|per-1m-tokens|compare/i);
});
