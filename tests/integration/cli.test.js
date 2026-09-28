import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cli = path.join(root, "src", "cli.js");

test("startup presents exactly the two app actions before category selection", () => {
  const result = spawnSync(process.execPath, [cli], {
    encoding: "utf8",
    input: "1\n1\n"
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^Model Selector\r?\n1\. Suggest models\r?\n2\. Refresh models\r?\nChoose an option:/);
  assert.match(result.stdout, /0\. Previous menu/);
  assert.match(result.stdout, /Choose a task:/);
  assert.match(result.stdout, /Top 10 by score: fit 70%, price 30%; unavailable excluded; IDs break ties\./);
});

test("invalid menu selection produces a visible error and non-zero exit", () => {
  const result = spawnSync(process.execPath, [cli], {
    encoding: "utf8",
    input: "3\n"
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /1\. Suggest models/);
  assert.match(result.stdout, /2\. Refresh models/);
  assert.match(result.stderr, /Choose 1|Choose 2/);
});

test("app actions are selected in the menu rather than passed as commands", () => {
  for (const command of ["refresh", "help", "--help", "catalog"]) {
    const result = spawnSync(process.execPath, [cli, command], { encoding: "utf8" });
    assert.notEqual(result.status, 0, command);
    assert.match(result.stderr, /model-selector/);
  }
});
