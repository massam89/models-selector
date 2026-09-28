import test from "node:test";
import assert from "node:assert/strict";
import { resolveConfigDir } from "../../src/storage.js";

test("configuration path generation uses native path separators", () => {
  const windows = resolveConfigDir({
    platform: "win32",
    env: { APPDATA: "C:\\Users\\test\\AppData\\Roaming" }
  });
  assert.match(windows, /model-selector$/);
  assert.ok(!windows.includes("/"));
});

test("CLI sources are valid UTF-8 and use portable newline output", async () => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const source = await readFile(fileURLToPath(new URL("../../src/cli.js", import.meta.url)), "utf8");
  assert.doesNotMatch(source, /(?<!\r)\n/);
  assert.match(source, /(?:\r\n|\n)/);
});
