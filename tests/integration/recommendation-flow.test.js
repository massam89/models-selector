import test from "node:test";
import assert from "node:assert/strict";
import { Readable, Writable } from "node:stream";
import { runCli } from "../../src/cli.js";
import { makeCatalog, makeModel } from "../fixtures.js";

function outputBuffer() {
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

test("selecting a category lists up to ten ranked models with scores", async () => {
  const output = outputBuffer();
  let fetchCalls = 0;
  const catalog = makeCatalog(Array.from({ length: 12 }, (_, index) => makeModel({
    providerModelId: `model-${String(index + 1).padStart(2, "0")}`,
    displayName: `Model ${String(index + 1).padStart(2, "0")}`,
    capabilities: index < 6
      ? { coding: { support: "supported", source: "fixture" } }
      : {}
  })));
  const code = await runCli([], {
    catalog,
    state: { snapshots: {}, overrides: [], customModels: [] },
    input: Readable.from(["1\n", "1\n"]),
    output: output.stream,
    fetcher: async () => { fetchCalls += 1; throw new Error("recommendations must remain local"); }
  });
  assert.equal(code, 0);
  const modelSection = output.text().split(/Top 10 by score:[^\r\n]*\r?\n/)[1] ?? "";
  const modelOutput = modelSection.split(/0\. Previous/)[0];
  const models = modelOutput.split(/\r?\n/).filter((line) => /^\d+\. /.test(line));
  assert.equal(models.length, 10);
  assert.match(models[0], /^1\. Model 01 \[openai\/model-01\] — score 70\/100$/);
  assert.match(models[6], /^7\. Model 07 \[openai\/model-07\] — score 1\/100$/);
  assert.match(output.text(), /Top 10 by score: fit 70%, price 30%; unavailable excluded; IDs break ties\./);
  assert.doesNotMatch(output.text(), /reasons?|capabilities|settings|comparison|describe the task/i);
  assert.equal(fetchCalls, 0);
});

test("results wait for Previous before category navigation continues", async () => {
  const output = outputBuffer();
  const catalog = makeCatalog([makeModel()]);
  catalog.categories.push({
    id: "debugging",
    label: "Debugging",
    description: "Find and fix a defect.",
    capabilityTags: ["debugging"],
    suggestedSettings: {}
  });
  const code = await runCli([], {
    catalog,
    state: { snapshots: {}, overrides: [], customModels: [] },
    input: Readable.from(["1\n", "1\n", "0\n", "2\n", "0\n", "0\n"]),
    output: output.stream
  });
  assert.equal(code, 0);
  assert.equal((output.text().match(/Top 10 by score:/g) ?? []).length, 2);
  assert.equal((output.text().match(/Model Selector/g) ?? []).length, 2);
  const firstResult = output.text().indexOf("Top 10 by score:");
  const previousPrompt = output.text().indexOf("0. Previous\nChoose 0 to return to categories:", firstResult);
  const nextCategory = output.text().indexOf("Choose a task:", previousPrompt);
  const secondResult = output.text().indexOf("Top 10 by score:", nextCategory);
  assert.ok(firstResult < previousPrompt && previousPrompt < nextCategory && nextCategory < secondResult);
  assert.match(output.text(), /0\. Previous menu/);
  assert.doesNotMatch(output.text(), /Describe|Other/);
});

test("an empty available catalog gives one concise result", async () => {
  const output = outputBuffer();
  const code = await runCli([], {
    catalog: makeCatalog([makeModel({ availability: "unavailable" })]),
    state: { snapshots: {}, overrides: [], customModels: [] },
    input: Readable.from(["1\n", "1\n"]),
    output: output.stream
  });
  assert.equal(code, 0);
  assert.match(output.text(), /No models available\./);
  assert.doesNotMatch(output.text(), /Top 10 by score:/);
});
