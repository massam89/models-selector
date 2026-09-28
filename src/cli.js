#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildEffectiveCatalog,
  refreshProviderCatalog
} from "./catalog.js";
import { recommendModels } from "./recommendation.js";
import {
  loadCatalog,
  resolveConfigDir,
  saveRuntimeState
} from "./storage.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CATALOG_PATH = path.join(ROOT, "data", "default-catalog.json");
const INPUT_CLOSED = "INPUT_CLOSED";
const MIN_NODE_MAJOR = 22;

function writeLine(stream, text = "") {
  stream.write(`${text}\n`);
}

function createPromptSession(input, output) {
  const readline = createInterface({
    input,
    output,
    crlfDelay: Infinity,
    terminal: Boolean(input.isTTY && output.isTTY)
  });
  const queuedLines = [];
  const waiters = [];
  let closed = false;
  readline.on("line", (line) => {
    const waiter = waiters.shift();
    if (waiter) waiter.resolve(line);
    else queuedLines.push(line);
  });
  readline.on("close", () => {
    closed = true;
    for (const waiter of waiters.splice(0)) {
      const error = new Error("Input closed before the prompt was answered.");
      error.code = INPUT_CLOSED;
      waiter.reject(error);
    }
  });
  return {
    question(prompt) {
      output.write(prompt);
      if (queuedLines.length) return Promise.resolve(queuedLines.shift());
      if (closed) {
        const error = new Error("Input closed before the prompt was answered.");
        error.code = INPUT_CLOSED;
        return Promise.reject(error);
      }
      return new Promise((resolve, reject) => waiters.push({ resolve, reject }));
    },
    close() {
      readline.close();
    }
  };
}

async function chooseAction(prompt, output) {
  writeLine(output, "Model Selector");
  writeLine(output, "1. Suggest models");
  writeLine(output, "2. Refresh models");
  const answer = (await prompt.question("Choose an option: ")).trim();
  if (answer === "1") return "suggest";
  if (answer === "2") return "refresh";
  throw new Error("Choose 1 to suggest models or 2 to refresh models.");
}

async function chooseCategory(catalog, prompt, output) {
  writeLine(output, "Choose a task:");
  writeLine(output, "  0. Previous menu");
  catalog.categories.forEach((category, index) => {
    writeLine(output, `  ${index + 1}. ${category.label} — ${category.description}`);
  });
  const answer = await prompt.question("Category number: ");
  if (answer.trim() === "0") return null;
  const index = Number.parseInt(answer, 10) - 1;
  const category = catalog.categories[index];
  if (!category) throw new Error("Invalid category selection.");
  return category;
}

async function waitForPrevious(prompt, output) {
  writeLine(output, "0. Previous");
  while (true) {
    const answer = (await prompt.question("Choose 0 to return to categories: ")).trim();
    if (answer === "0") return;
    writeLine(output, "Choose 0 to return to categories.");
  }
}

function printRecommendations(catalog, category, output, now) {
  const recommendation = recommendModels(catalog.models, category.capabilityTags, { now });
  const topModels = recommendation.results.slice(0, 10);
  if (!topModels.length) {
    writeLine(output, "No models available.");
    return;
  }
  writeLine(output, "Top 10 by score: fit 70%, price 30%; unavailable excluded; IDs break ties.");
  topModels.forEach(({ model, score }, index) => {
    writeLine(output, `${index + 1}. ${model.displayName} [${model.providerId}/${model.providerModelId}] — score ${score}/100`);
  });
}

async function refreshAllProviders(catalog, state, deps) {
  const saveState = deps.saveState ?? ((next) => saveRuntimeState(deps.configDir, next));
  const result = await refreshProviderCatalog({
    providers: catalog.providers,
    providerIds: catalog.providers.map((provider) => provider.id),
    state,
    adapters: deps.adapters,
    fetcher: deps.fetcher,
    saveState,
    now: deps.now
  });
  for (const outcome of result.outcomes) {
    writeLine(deps.output, outcome.success
      ? `${outcome.providerId}: refreshed ${outcome.count} model(s) at ${outcome.checkedAt}.`
      : `${outcome.providerId}: refresh failed — ${outcome.message}`);
    for (const warning of outcome.warnings ?? []) {
      writeLine(deps.output, `  Warning: ${warning}`);
    }
  }
  return result.outcomes.every((outcome) => outcome.success) ? 0 : 1;
}

async function dispatch(argv, deps) {
  if (argv.length) throw new Error("Run model-selector without arguments and choose an option from the menu.");
  const loaded = deps.catalog
    ? { catalog: deps.catalog, state: deps.state ?? { snapshots: {}, overrides: [], customModels: [] } }
    : await loadCatalog({ defaultCatalogPath: deps.defaultCatalogPath, configDir: deps.configDir });
  const prompt = createPromptSession(deps.input, deps.output);
  try {
    while (true) {
      const catalog = buildEffectiveCatalog(loaded.catalog, loaded.state);
      const action = await chooseAction(prompt, deps.output);
      if (action === "suggest") {
        while (true) {
          const category = await chooseCategory(catalog, prompt, deps.output);
          if (!category) break;
          printRecommendations(catalog, category, deps.output, deps.now);
          await waitForPrevious(prompt, deps.output);
        }
      } else {
        await refreshAllProviders(catalog, loaded.state, deps);
      }
    }
  } catch (error) {
    if (error.code === INPUT_CLOSED) return 0;
    throw error;
  } finally {
    prompt.close();
  }
}

export async function runCli(argv = process.argv.slice(2), options = {}) {
  const nodeVersion = options.nodeVersion ?? process.versions.node;
  const nodeMajor = Number.parseInt(nodeVersion, 10);
  if (!Number.isInteger(nodeMajor) || nodeMajor < MIN_NODE_MAJOR) {
    writeLine(
      options.errorOutput ?? process.stderr,
      `Error: Model Selector requires Node.js ${MIN_NODE_MAJOR} or newer. Detected ${nodeVersion}. Install or upgrade Node.js from https://nodejs.org/en/download/.`
    );
    return 2;
  }

  const deps = {
    input: options.input ?? process.stdin,
    output: options.output ?? process.stdout,
    errorOutput: options.errorOutput ?? process.stderr,
    configDir: options.configDir ?? resolveConfigDir({ env: options.env ?? process.env }),
    defaultCatalogPath: options.defaultCatalogPath ?? DEFAULT_CATALOG_PATH,
    env: options.env ?? process.env,
    fetcher: options.fetcher ?? fetch,
    now: options.now ?? new Date(),
    ...options
  };
  try {
    return await dispatch(argv, deps);
  } catch (error) {
    writeLine(deps.errorOutput, `Error: ${error.message}`);
    return 2;
  }
}

if (
  process.argv[1]
  && realpathSync(path.resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url))
) {
  runCli().then((code) => {
    process.exitCode = code;
  });
}
