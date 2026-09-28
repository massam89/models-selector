import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("globally installed command launches from an unrelated working directory", async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "models-selector-global-"));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));

  const prefix = path.join(tempRoot, "prefix");
  const workingDirectory = path.join(tempRoot, "outside");
  await mkdir(workingDirectory);

  const install = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["install", "--global", "--prefix", prefix, projectRoot],
    {
      cwd: projectRoot,
      encoding: "utf8",
      shell: process.platform === "win32",
      timeout: 60_000
    }
  );
  assert.equal(install.status, 0, install.stderr || install.error?.message);

  const binDirectory = process.platform === "win32" ? prefix : path.join(prefix, "bin");
  const env = {
    ...process.env,
    PATH: `${binDirectory}${path.delimiter}${process.env.PATH ?? ""}`
  };
  const result = spawnSync("models-selector", [], {
    cwd: workingDirectory,
    env,
    input: "1\n1\n0\n0\n",
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 15_000
  });

  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.match(result.stdout, /Model Selector/);
  assert.match(result.stdout, /Top 10 by score/);
});
