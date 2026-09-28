import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  validateCatalog,
  validateRuntimeState
} from "./catalog.js";
import { open, readFile, rename as fsRename, mkdir, unlink } from "node:fs/promises";

export const STATE_FILE_NAME = "catalog-state.json";

export function resolveConfigDir({
  platform = process.platform,
  env = process.env,
  homeDir = os.homedir()
} = {}) {
  if (platform === "win32") {
    return path.join(env.APPDATA || path.join(homeDir, "AppData", "Roaming"), "model-selector");
  }
  if (platform === "darwin") {
    return path.join(homeDir, "Library", "Application Support", "model-selector");
  }
  return path.join(env.XDG_CONFIG_HOME || path.join(homeDir, ".config"), "model-selector");
}

export function emptyRuntimeState() {
  return { snapshots: {}, overrides: [], customModels: [] };
}

export async function writeJsonAtomic(filePath, value, {
  validate = () => {},
  rename = fsRename
} = {}) {
  await validate(value);
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  let handle;
  try {
    handle = await open(temporaryPath, "wx");
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporaryPath, filePath);
  } catch (error) {
    if (handle) await handle.close().catch(() => {});
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

export async function loadRuntimeState(configDir) {
  const statePath = path.join(configDir, STATE_FILE_NAME);
  let text;
  try {
    text = await readFile(statePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return emptyRuntimeState();
    throw error;
  }
  let state;
  try {
    state = JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in ${statePath}: ${error.message}`);
  }
  return validateRuntimeState(state);
}

export async function saveRuntimeState(configDir, state) {
  validateRuntimeState(state);
  return writeJsonAtomic(path.join(configDir, STATE_FILE_NAME), state, {
    validate: validateRuntimeState
  });
}

export async function loadCatalog({ defaultCatalogPath, configDir }) {
  const text = await readFile(defaultCatalogPath, "utf8");
  let catalog;
  try {
    catalog = JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in default catalog ${defaultCatalogPath}: ${error.message}`);
  }
  validateCatalog(catalog);
  const state = await loadRuntimeState(configDir);
  return { catalog, state };
}
