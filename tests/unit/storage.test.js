import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import {
  loadCatalog,
  loadRuntimeState,
  resolveConfigDir,
  saveRuntimeState,
  writeJsonAtomic
} from "../../src/storage.js";
import { makeCatalog } from "../fixtures.js";

test("resolves platform config paths without relying on the current directory", () => {
  assert.equal(
    resolveConfigDir({ platform: "win32", env: { APPDATA: "C:\\Users\\u\\AppData\\Roaming" } }),
    path.join("C:\\Users\\u\\AppData\\Roaming", "model-selector")
  );
  assert.equal(
    resolveConfigDir({ platform: "linux", env: { XDG_CONFIG_HOME: "/tmp/config" } }),
    path.join("/tmp/config", "model-selector")
  );
  assert.equal(
    resolveConfigDir({ platform: "linux", env: {}, homeDir: "/home/u" }),
    path.join("/home/u", ".config", "model-selector")
  );
});

test("loads the default catalog and returns empty state for a missing state file", async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "model-selector-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const seedPath = path.join(dir, "seed.json");
  await writeFile(seedPath, JSON.stringify(makeCatalog()));
  const loaded = await loadCatalog({ defaultCatalogPath: seedPath, configDir: dir });
  assert.equal(loaded.catalog.models[0].providerModelId, "model-a");
  assert.deepEqual(loaded.state, { snapshots: {}, overrides: [], customModels: [] });
});

test("reports malformed persisted JSON instead of silently replacing it", async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "model-selector-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, "catalog-state.json");
  await writeFile(file, "{");
  await assert.rejects(loadRuntimeState(dir), /invalid JSON|parse/i);
});

test("failed atomic replacement leaves the previous file intact", async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "model-selector-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, "state.json");
  await mkdir(dir, { recursive: true });
  await writeFile(file, '{"old":true}');
  await assert.rejects(writeJsonAtomic(file, { new: true }, {
    rename: async () => { throw new Error("simulated rename failure"); }
  }), /simulated rename failure/);
  assert.equal(await readFile(file, "utf8"), '{"old":true}');
});

test("validates persisted state before writing it", async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "model-selector-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, "catalog-state.json");
  await saveRuntimeState(dir, { snapshots: {}, overrides: [], customModels: [] });
  await assert.rejects(saveRuntimeState(dir, { snapshots: null }), /state/i);
  assert.deepEqual(JSON.parse(await readFile(file, "utf8")), {
    snapshots: {},
    overrides: [],
    customModels: []
  });
});
