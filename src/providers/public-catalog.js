import { getJson, getText } from "./shared.js";

export const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models?output_modalities=text";

const PUBLIC_PROVIDERS = {
  openai: {
    name: "OpenAI",
    modelsUrl: "https://developers.openai.com/api/docs/models.md",
    pricingUrl: "https://developers.openai.com/api/docs/pricing.md",
    modelsPage: "https://developers.openai.com/api/docs/models",
    pricingPage: "https://developers.openai.com/api/docs/pricing"
  },
  anthropic: {
    name: "Anthropic",
    modelsUrl: "https://platform.claude.com/docs/en/models/overview.md",
    pricingUrl: "https://platform.claude.com/docs/en/about-claude/pricing.md",
    modelsPage: "https://platform.claude.com/docs/en/models/overview",
    pricingPage: "https://platform.claude.com/docs/en/about-claude/pricing"
  },
  google: {
    name: "Google Gemini",
    modelsUrl: "https://ai.google.dev/gemini-api/docs/models.md",
    pricingUrl: "https://ai.google.dev/gemini-api/docs/pricing.md",
    modelsPage: "https://ai.google.dev/gemini-api/docs/models",
    pricingPage: "https://ai.google.dev/gemini-api/docs/pricing"
  },
  kimi: {
    name: "Kimi (Moonshot AI)",
    modelsUrl: "https://platform.kimi.ai/docs/models.md",
    pricingUrl: "https://platform.kimi.ai/docs/pricing/chat.md",
    modelsPage: "https://platform.kimi.ai/docs/models",
    pricingPage: "https://platform.kimi.ai/docs/pricing/chat",
    openRouterId: "moonshotai"
  },
  deepseek: {
    name: "DeepSeek",
    modelsUrl: "https://api-docs.deepseek.com/quick_start/pricing/",
    pricingUrl: "https://api-docs.deepseek.com/quick_start/pricing/",
    modelsPage: "https://api-docs.deepseek.com/quick_start/pricing",
    pricingPage: "https://api-docs.deepseek.com/quick_start/pricing",
    openRouterId: "deepseek"
  },
  mistral: {
    name: "Mistral AI",
    openRouterId: "mistralai"
  },
  xai: {
    name: "xAI (Grok)",
    modelsUrl: "https://docs.x.ai/developers/models",
    pricingUrl: "https://docs.x.ai/developers/models",
    modelsPage: "https://docs.x.ai/developers/models",
    pricingPage: "https://docs.x.ai/developers/models",
    openRouterId: "x-ai"
  },
  cohere: {
    name: "Cohere",
    modelsUrl: "https://docs.cohere.com/docs/models.md",
    modelsPage: "https://docs.cohere.com/docs/models",
    openRouterId: "cohere"
  },
  "meta-llama": {
    name: "Meta Llama",
    openRouterId: "meta-llama"
  },
  qwen: {
    name: "Qwen",
    modelsUrl: "https://help.aliyun.com/zh/model-studio/text-generation-model",
    modelsPage: "https://help.aliyun.com/zh/model-studio/text-generation-model",
    openRouterId: "qwen"
  },
  minimax: {
    name: "MiniMax",
    modelsUrl: "https://platform.minimax.io/docs/guides/pricing-paygo.md",
    pricingUrl: "https://platform.minimax.io/docs/guides/pricing-paygo.md",
    modelsPage: "https://platform.minimax.io/docs/guides/pricing-paygo",
    pricingPage: "https://platform.minimax.io/docs/guides/pricing-paygo",
    openRouterId: "minimax"
  }
};

const COMPONENT_FIELDS = [
  ["prompt", "input"],
  ["completion", "output"],
  ["input_cache_read", "cached-input"],
  ["input_cache_write", "cache-write"]
];

function checkedDate(now) {
  return now.toISOString().slice(0, 10);
}

function capabilityRecord(support, source, lastChecked) {
  return { support, source, lastChecked };
}

function capabilitiesFromDescription(description, source, lastChecked) {
  const capabilities = {};
  if (/\b(code|coding|coder|programming|software engineering)\b/i.test(description)) {
    capabilities["code-generation"] = capabilityRecord("supported", source, lastChecked);
  }
  if (/\b(reason(?:ing)?|thinking)\b/i.test(description)) {
    capabilities.reasoning = capabilityRecord("supported", source, lastChecked);
  }
  if (/\bdebug(?:ging)?\b/i.test(description)) {
    capabilities.debugging = capabilityRecord("supported", source, lastChecked);
  }
  return capabilities;
}

function normalizeOpenRouterModel(item, providerId, now) {
  const providerModelId = item.id.slice(item.id.indexOf("/") + 1);
  const normalizedId = providerId === "google"
    ? providerModelId.replace(/^models\//, "")
    : providerModelId;
  const source = OPENROUTER_MODELS_URL;
  const lastChecked = checkedDate(now);
  const capabilities = capabilitiesFromDescription(item.description ?? "", source, lastChecked);
  if (item.reasoning || item.supported_parameters?.some((parameter) =>
    ["reasoning", "reasoning_effort"].includes(parameter)
  )) {
    capabilities.reasoning = capabilityRecord("supported", source, lastChecked);
  }
  const supportedSettings = {};
  if (Array.isArray(item.supported_parameters)) {
    for (const [parameter, setting] of [
      ["temperature", "temperature"],
      ["reasoning_effort", "reasoningEffort"]
    ]) {
      const supportedSetting = {
        supported: item.supported_parameters.includes(parameter),
        source,
        lastChecked
      };
      if (setting === "reasoningEffort" && Array.isArray(item.reasoning?.supported_efforts)) {
        supportedSetting.values = item.reasoning.supported_efforts;
      }
      supportedSettings[setting] = supportedSetting;
    }
  }
  const pricing = [];
  for (const [field, component] of COMPONENT_FIELDS) {
    if (item.pricing?.[field] === undefined || item.pricing[field] === null) continue;
    const tokenRate = Number(item.pricing[field]);
    pricing.push({
      component,
      amount: Number.isFinite(tokenRate) && tokenRate >= 0 ? tokenRate * 1_000_000 : null,
      currency: "USD",
      unit: "per-1m-tokens",
      conditions: { marketplace: "OpenRouter" },
      source,
      lastChecked
    });
  }
  return {
    providerId,
    providerModelId: normalizedId,
    displayName: item.name,
    availability: item.expiration_date && Date.parse(item.expiration_date) <= now.getTime()
      ? "unavailable"
      : "available",
    capabilities,
    supportedSettings,
    pricing,
    source,
    lastChecked
  };
}

export function parseOpenRouterCatalog(body, providerId, { now = new Date() } = {}) {
  if (!PUBLIC_PROVIDERS[providerId]) throw new Error(`Unsupported provider ${providerId}.`);
  if (!body || !Array.isArray(body.data)) throw new Error("OpenRouter returned an invalid model-list response.");
  const result = [];
  const seen = new Set();
  for (const item of body.data) {
    if (!item || typeof item.id !== "string" || typeof item.name !== "string") continue;
    const separator = item.id.indexOf("/");
    const openRouterId = PUBLIC_PROVIDERS[providerId].openRouterId ?? providerId;
    if (separator <= 0 || item.id.slice(0, separator) !== openRouterId) continue;
    const model = normalizeOpenRouterModel(item, providerId, now);
    if (!model.providerModelId) continue;
    if (seen.has(model.providerModelId)) throw new Error(`OpenRouter returned duplicate model ID ${model.providerModelId}.`);
    seen.add(model.providerModelId);
    result.push(model);
  }
  return result;
}

function tableRows(markdown) {
  return markdown.split(/\r?\n/)
    .filter((line) => /^\s*\|/.test(line))
    .map((line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim()))
    .filter((cells) => cells.length > 1 && !cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
}

function cleanCell(value) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*|~~/g, "")
    .replace(/\\\$/g, "$")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .trim();
}

function modelProfile(providerId, providerModelId, displayName, description, source, now, availability = "available") {
  const lastChecked = checkedDate(now);
  return {
    providerId,
    providerModelId,
    displayName,
    availability,
    capabilities: capabilitiesFromDescription(description, source, lastChecked),
    supportedSettings: {},
    pricing: [],
    source,
    lastChecked
  };
}

function htmlTableRows(html) {
  return [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((row) => [...row[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)]
      .map((cell) => cleanCell(cell[1].replace(/<br\s*\/?>/gi, " "))))
    .filter((row) => row.length > 1);
}

function sourceTableRows(content) {
  const markdownRows = tableRows(content);
  return markdownRows.length ? markdownRows : htmlTableRows(content);
}

export function parseDeepSeekCatalogHtml(html, { now = new Date() } = {}) {
  const rows = htmlTableRows(html);
  const header = rows.find((row) => cleanCell(row[0]).toUpperCase() === "MODEL");
  if (!header) return { models: [], prices: new Map() };
  const modelIds = header.slice(1).map((cell) => cleanCell(cell).replace(/\(\d+\)$/, ""));
  const models = modelIds.map((id) => modelProfile(
    "deepseek",
    id,
    id,
    "Official DeepSeek model listing",
    PUBLIC_PROVIDERS.deepseek.modelsPage,
    now
  ));
  const prices = new Map(models.map((model) => [model.providerModelId, []]));
  let currentComponent;
  for (const row of rows) {
    const label = row.join(" ").toUpperCase();
    if (/1M INPUT TOKENS.*CACHE HIT/.test(label)) currentComponent = "cached-input";
    else if (/1M INPUT TOKENS.*CACHE MISS/.test(label)) currentComponent = "input";
    else if (/1M OUTPUT TOKENS/.test(label)) currentComponent = "output";
    if (label.includes("THINKING MODE") && /SUPPORTS BOTH/i.test(label)) {
      for (const model of models) {
        model.capabilities.reasoning = capabilityRecord(
          "supported",
          PUBLIC_PROVIDERS.deepseek.modelsPage,
          checkedDate(now)
        );
      }
    }
    if (label.includes("TOOL CALLS")) {
      const support = row.slice(-modelIds.length);
      support.forEach((value, index) => {
        if (value.includes("✓")) {
          models[index].capabilities["api-integration"] = capabilityRecord(
            "supported",
            PUBLIC_PROVIDERS.deepseek.modelsPage,
            checkedDate(now)
          );
        }
      });
    }
    if (!currentComponent || /OFF-PEAK/.test(label) || !/\bPEAK\b/.test(label)) continue;
    const amounts = [...row.join(" ").matchAll(/\$([\d,]+(?:\.\d+)?)/g)]
      .map((match) => Number(match[1].replace(/,/g, "")));
    if (amounts.length < modelIds.length) continue;
    models.forEach((model, index) => {
      prices.get(model.providerModelId).push(price(
        currentComponent,
        amounts.at(-modelIds.length + index),
        PUBLIC_PROVIDERS.deepseek.pricingPage,
        checkedDate(now),
        { period: "peak" }
      ));
    });
  }
  for (const model of models) model.pricing = prices.get(model.providerModelId);
  return { models, prices };
}

export function parseXaiModelsPricing(markdown, { now = new Date() } = {}) {
  const rows = sourceTableRows(markdown);
  const headerIndex = rows.findIndex((row) =>
    /^Model$/i.test(cleanCell(row[0])) &&
    row.some((cell) => /Input\s*\/\s*1M tokens/i.test(cleanCell(cell))) &&
    row.some((cell) => /Output\s*\/\s*1M tokens/i.test(cleanCell(cell)))
  );
  if (headerIndex < 0) return { models: [], prices: new Map() };
  const header = rows[headerIndex].map(cleanCell);
  const inputIndex = header.findIndex((cell) => /Input\s*\/\s*1M tokens/i.test(cell));
  const cachedIndex = header.findIndex((cell) => /Cached input\s*\/\s*1M tokens/i.test(cell));
  const outputIndex = header.findIndex((cell) => /Output\s*\/\s*1M tokens/i.test(cell));
  const models = new Map();
  const prices = new Map();
  for (const row of rows.slice(headerIndex + 1)) {
    const rawName = cleanCell(row[0] ?? "");
    if (/^(?:Model|Mode)$/i.test(rawName)) break;
    const match = /^([a-z0-9][a-z0-9._-]*)/i.exec(rawName);
    if (!match) break;
    const id = match[1];
    if (models.has(id) || /(?:≥|>=)\s*[\d,]+\s*k/i.test(rawName)) continue;
    const description = id === "grok-4.7" ? "Grok 4.7 is recommended for coding" : id;
    const model = modelProfile("xai", id, id, description, PUBLIC_PROVIDERS.xai.modelsPage, now);
    if (/reasoning/i.test(id)) {
      model.capabilities.reasoning = capabilityRecord("supported", PUBLIC_PROVIDERS.xai.modelsPage, checkedDate(now));
    }
    models.set(id, model);
    const context = /(<\s*[\d,]+\s*k|≥\s*[\d,]+\s*k|>=\s*[\d,]+\s*k)/i.exec(rawName)?.[1] ?? "base";
    const pricing = [
      ["input", inputIndex],
      ["cached-input", cachedIndex],
      ["output", outputIndex]
    ].flatMap(([component, column]) => {
      if (column < 0) return [];
      const amount = parseMoneyPerMillion(row[column] ?? "");
      return amount === null ? [] : [price(
        component,
        amount,
        PUBLIC_PROVIDERS.xai.pricingPage,
        checkedDate(now),
        { context }
      )];
    });
    prices.set(id, pricing);
    model.pricing = pricing;
  }
  return { models: [...models.values()], prices };
}

export function parseMiniMaxPricingMarkdown(markdown, { now = new Date() } = {}) {
  const standardTab = /<Tab\s+title="Standard">([\s\S]*?)<\/Tab>/i.exec(markdown)?.[1] ?? "";
  const outsideTabs = markdown.replace(/<Tabs>[\s\S]*?<\/Tabs>/gi, "");
  const rows = tableRows(`${standardTab}\n${outsideTabs}`);
  const models = new Map();
  const prices = new Map();
  for (let index = 0; index < rows.length; index += 1) {
    const header = rows[index].map(cleanCell);
    const modelIndex = header.findIndex((cell) => /^Model$/i.test(cell));
    const inputIndex = header.findIndex((cell) => /^Input$/i.test(cell));
    const outputIndex = header.findIndex((cell) => /^Output$/i.test(cell));
    if (modelIndex < 0 || inputIndex < 0 || outputIndex < 0) continue;
    const cachedReadIndex = header.findIndex((cell) => /Prompt caching Read/i.test(cell));
    const cachedWriteIndex = header.findIndex((cell) => /Prompt caching Write/i.test(cell));
    for (const row of rows.slice(index + 1)) {
      if (row[0] && /^Model$/i.test(cleanCell(row[0]))) break;
      const rawName = cleanCell(row[modelIndex] ?? "");
      const match = /^([a-z0-9][a-z0-9._-]*)/i.exec(rawName);
      if (!match) continue;
      const id = match[1];
      if (models.has(id)) continue;
      const context = /≤\s*512k/i.test(rawName) ? "≤512k input tokens"
        : />\s*512k/i.test(rawName) ? ">512k input tokens"
          : undefined;
      const model = modelProfile(
        "minimax",
        id,
        id,
        "Official MiniMax text model pricing",
        PUBLIC_PROVIDERS.minimax.modelsPage,
        now
      );
      const pricing = [
        ["input", inputIndex],
        ["cached-input", cachedReadIndex],
        ["cache-write", cachedWriteIndex],
        ["output", outputIndex]
      ].flatMap(([component, column]) => {
        if (column < 0) return [];
        const amount = parseMoneyPerMillion(row[column] ?? "");
        return amount === null ? [] : [price(
          component,
          amount,
          PUBLIC_PROVIDERS.minimax.pricingPage,
          checkedDate(now),
          { tier: "standard", ...(context ? { context } : {}) }
        )];
      });
      model.pricing = pricing;
      models.set(id, model);
      prices.set(id, pricing);
    }
    index += 1;
  }
  return { models: [...models.values()], prices };
}

export function parseCohereModelsMarkdown(markdown, { now = new Date() } = {}) {
  const rows = tableRows(markdown);
  const models = new Map();
  for (let index = 0; index < rows.length; index += 1) {
    const header = rows[index].map(cleanCell);
    const nameIndex = header.findIndex((cell) => /^Model Name$/i.test(cell));
    const statusIndex = header.findIndex((cell) => /^Status$/i.test(cell));
    const descriptionIndex = header.findIndex((cell) => /^Description$/i.test(cell));
    const endpointsIndex = header.findIndex((cell) => /^Endpoints$/i.test(cell));
    if (nameIndex < 0 || statusIndex < 0 || descriptionIndex < 0 || endpointsIndex < 0) continue;
    for (const row of rows.slice(index + 1)) {
      if (/^Model Name$/i.test(cleanCell(row[nameIndex] ?? ""))) break;
      if (!/\bChat\b/i.test(cleanCell(row[endpointsIndex] ?? ""))) continue;
      const id = cleanCell(row[nameIndex] ?? "");
      if (!/^[a-z0-9][a-z0-9._-]*$/i.test(id)) continue;
      const status = cleanCell(row[statusIndex] ?? "");
      const description = cleanCell(row[descriptionIndex] ?? "");
      const model = modelProfile(
        "cohere",
        id,
        id,
        description,
        PUBLIC_PROVIDERS.cohere.modelsPage,
        now,
        /deprecated|retired/i.test(status) ? "unavailable" : "available"
      );
      models.set(id, model);
    }
    index += 1;
  }
  return [...models.values()];
}

export function parseQwenModelsMarkdown(markdown, { now = new Date() } = {}) {
  const rows = sourceTableRows(markdown);
  const models = new Map();
  for (let index = 0; index < rows.length; index += 1) {
    const header = rows[index].map(cleanCell);
    const idIndex = header.findIndex((cell) => /模型\s*ID|模型ID/i.test(cell));
    if (idIndex < 0) continue;
    const thinkingIndex = header.findIndex((cell) => /思考模式/.test(cell));
    for (const row of rows.slice(index + 1)) {
      if (/模型\s*ID/i.test(cleanCell(row[idIndex] ?? ""))) break;
      const rawId = cleanCell(row[idIndex] ?? "").match(/qwen[a-z0-9._-]*/i)?.[0];
      if (!rawId) continue;
      const description = row.map(cleanCell).join(" ");
      const model = modelProfile(
        "qwen",
        rawId,
        rawId,
        description,
        PUBLIC_PROVIDERS.qwen.modelsPage,
        now
      );
      if (/coder/i.test(rawId)) {
        model.capabilities["code-generation"] = capabilityRecord(
          "supported",
          PUBLIC_PROVIDERS.qwen.modelsPage,
          checkedDate(now)
        );
      }
      const thinkingSupport = cleanCell(row[thinkingIndex] ?? "");
      if (/支持/.test(thinkingSupport) && !/不支持/.test(thinkingSupport)) {
        model.capabilities.reasoning = capabilityRecord(
          "supported",
          PUBLIC_PROVIDERS.qwen.modelsPage,
          checkedDate(now)
        );
      }
      models.set(rawId, model);
    }
    index += 1;
  }
  return [...models.values()];
}

export function parseKimiModelsMarkdown(markdown, { now = new Date() } = {}) {
  const [activeModels, deprecatedModels = ""] = markdown.split(/^## Deprecated Models\b/im);
  const models = new Map();
  for (const row of tableRows(activeModels)) {
    const id = cleanCell(row[0] ?? "");
    const description = cleanCell(row[1] ?? "");
    if (!/^kimi-[a-z0-9.-]+$/i.test(id) || !description) continue;
    models.set(id, modelProfile(
      "kimi",
      id,
      id,
      description,
      PUBLIC_PROVIDERS.kimi.modelsPage,
      now
    ));
  }
  for (const row of tableRows(deprecatedModels)) {
    const id = cleanCell(row[0] ?? "");
    const description = cleanCell(row[1] ?? "");
    if (!/^(?:kimi-[a-z0-9.-]+|moonshot-v1-[a-z0-9.-]+)$/i.test(id)) continue;
    models.set(id, modelProfile(
      "kimi",
      id,
      id,
      description || "Deprecated model",
      PUBLIC_PROVIDERS.kimi.modelsPage,
      now,
      "unavailable"
    ));
  }
  return [...models.values()];
}

export function parseKimiPricingMarkdown(markdown, models, { now = new Date() } = {}) {
  const prices = new Map();
  const currentModelIds = new Set(models.map((model) => model.providerModelId));
  for (const match of markdown.matchAll(/\[\s*"([^"]+)"\s*,\s*"1M tokens"\s*,([\s\S]*?)\]/g)) {
    const [, id, row] = match;
    const values = [...row.matchAll(/\{"\$"\}\s*([\d,]+(?:\.\d+)?)/g)]
      .map((priceMatch) => Number(priceMatch[1].replace(/,/g, "")));
    const k3Series = id === "kimi-k3";
    const expectedValues = k3Series ? 5 : 3;
    if (!currentModelIds.has(id) || values.length < expectedValues) continue;
    const components = k3Series
      ? [
          ["cache-write", values[0], { cacheTtl: "5min" }],
          ["cache-write", values[1], { cacheTtl: "1h" }],
          ["cached-input", values[2]],
          ["input", values[3]],
          ["output", values[4]]
        ]
      : [
          ["cached-input", values[0]],
          ["input", values[1]],
          ["output", values[2]]
        ];
    prices.set(id, components.map(([component, amount, conditions = {}]) => ({
      component,
      amount,
      currency: "USD",
      unit: "per-1m-tokens",
      ...(Object.keys(conditions).length ? { conditions } : {}),
      source: PUBLIC_PROVIDERS.kimi.pricingPage,
      lastChecked: checkedDate(now)
    })));
  }
  return prices;
}

export function parseOpenAIModelsMarkdown(markdown, { now = new Date() } = {}) {
  const page = PUBLIC_PROVIDERS.openai.modelsPage;
  const models = new Map();
  const linkPattern = /\[([^\]]+)\]\((?:https:\/\/developers\.openai\.com)?\/api\/docs\/models\/([^)\s]+)\)/g;
  for (const line of markdown.split(/\r?\n/)) {
    for (const match of line.matchAll(linkPattern)) {
      const id = decodeURIComponent(match[2].replace(/\.md$/, "").replace(/\/$/, ""));
      if (!/^[a-z0-9][a-z0-9._-]*$/i.test(id)) continue;
      const remainder = line.slice(match.index + match[0].length).replace(/^\s*:\s*/, "");
      models.set(id, modelProfile("openai", id, cleanCell(match[1]), remainder, page, now));
    }
  }
  return [...models.values()];
}

function parseMoneyPerMillion(text) {
  if (/^\s*-\s*$/.test(text)) return null;
  const matches = [...text.replace(/\\\$/g, "$").matchAll(/\$([\d,]+(?:\.\d+)?)/g)];
  const match = matches.at(-1);
  if (!match) return null;
  return Number(match[1].replace(/,/g, ""));
}

function price(component, amount, source, lastChecked, conditions = {}) {
  return {
    component,
    amount,
    currency: "USD",
    unit: "per-1m-tokens",
    conditions,
    source,
    lastChecked
  };
}

export function parseOpenAIPricingMarkdown(markdown, { now = new Date() } = {}) {
  const rows = tableRows(markdown);
  const headerIndex = rows.findIndex((row) =>
    cleanCell(row[0]) === "Model" &&
    row.some((cell) => /Short context input/i.test(cell)) &&
    row.some((cell) => /Short context output/i.test(cell))
  );
  if (headerIndex < 0) return new Map();
  const header = rows[headerIndex].map(cleanCell);
  const componentColumns = [
    ["Short context input", "input"],
    ["Short context cached input", "cached-input"],
    ["Short context cache writes", "cache-write"],
    ["Short context output", "output"]
  ].map(([label, component]) => ({
    index: header.findIndex((cell) => cell.toLowerCase() === label.toLowerCase()),
    component
  })).filter(({ index }) => index >= 0);
  const prices = new Map();
  for (const row of rows.slice(headerIndex + 1)) {
    if (cleanCell(row[0]) === "Model") break;
    const rawId = cleanCell(row[0]);
    const id = rawId.split(/\s+/)[0];
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(id)) continue;
    prices.set(id, componentColumns.map(({ index, component }) => price(
      component,
      parseMoneyPerMillion(row[index] ?? ""),
      PUBLIC_PROVIDERS.openai.pricingPage,
      checkedDate(now),
      { tier: "standard", context: "short" }
    )));
  }
  return prices;
}

export function parseAnthropicModelsMarkdown(markdown, { now = new Date() } = {}) {
  const modelTable = tableRows(markdown);
  const headerIndex = modelTable.findIndex((row) => cleanCell(row[0]) === "Feature" && row.slice(1).some((cell) => /Claude/i.test(cell)));
  if (headerIndex < 0) return [];
  const header = modelTable[headerIndex].map(cleanCell).slice(1);
  const apiIds = modelTable.slice(headerIndex + 1).find((row) => cleanCell(row[0]) === "Claude API ID");
  if (!apiIds) return [];
  const descriptions = modelTable.slice(headerIndex + 1).find((row) => cleanCell(row[0]) === "Description");
  return header.flatMap((displayName, index) => {
    const id = cleanCell(apiIds[index + 1] ?? "");
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(id)) return [];
    const description = cleanCell(descriptions?.[index + 1] ?? "");
    return [modelProfile("anthropic", id, displayName, description,
      PUBLIC_PROVIDERS.anthropic.modelsPage, now)];
  });
}

export function parseAnthropicPricingMarkdown(markdown, models, { now = new Date() } = {}) {
  const rows = tableRows(markdown);
  const headerIndex = rows.findIndex((row) =>
    cleanCell(row[0]) === "Model" &&
    row.some((cell) => /Base input tokens/i.test(cell)) &&
    row.some((cell) => /Output tokens/i.test(cell))
  );
  if (headerIndex < 0) return new Map();
  const header = rows[headerIndex].map(cleanCell);
  const inputIndex = header.findIndex((cell) => /Base input tokens/i.test(cell));
  const outputIndex = header.findIndex((cell) => /Output tokens/i.test(cell));
  const idsByName = new Map(models.map((model) => [model.displayName.toLowerCase(), model.providerModelId]));
  const prices = new Map();
  for (const row of rows.slice(headerIndex + 1)) {
    const displayName = cleanCell(row[0]).replace(/\s*\([^)]*\)\s*$/, "");
    const id = idsByName.get(displayName.toLowerCase());
    if (!id) continue;
    const input = parseMoneyPerMillion(row[inputIndex] ?? "");
    const output = parseMoneyPerMillion(row[outputIndex] ?? "");
    prices.set(id, [
      price("input", input, PUBLIC_PROVIDERS.anthropic.pricingPage, checkedDate(now)),
      price("output", output, PUBLIC_PROVIDERS.anthropic.pricingPage, checkedDate(now))
    ]);
  }
  return prices;
}

export function parseGoogleModelsMarkdown(markdown, { now = new Date() } = {}) {
  const rows = tableRows(markdown);
  const models = new Map();
  for (let index = 0; index < rows.length; index += 1) {
    const header = rows[index].map(cleanCell);
    const endpointIndex = header.findIndex((cell) => cell.toLowerCase() === "endpoint");
    const descriptionIndex = header.findIndex((cell) => cell.toLowerCase() === "description");
    if (endpointIndex < 0 || descriptionIndex < 0) continue;
    const nameIndex = header.findIndex((cell) => cell.toLowerCase() === "model");
    for (const row of rows.slice(index + 1)) {
      const id = cleanCell(row[endpointIndex] ?? "");
      if (!/^[a-z0-9][a-z0-9._-]*$/i.test(id)) break;
      if (/(?:tts|audio|image|live|transcri|speech|embed)/i.test(id)) continue;
      const displayName = cleanCell(row[nameIndex] ?? id);
      const description = cleanCell(row[descriptionIndex] ?? "");
      models.set(id, modelProfile("google", id, displayName, description,
        PUBLIC_PROVIDERS.google.modelsPage, now));
    }
  }
  return [...models.values()];
}

async function fetchOfficialSource(providerId, { fetcher, now }) {
  const source = PUBLIC_PROVIDERS[providerId];
  if (!source.modelsUrl) return { models: [], warnings: [] };
  const warnings = [];
  const modelsRequest = getText(source.modelsUrl, { providerName: source.name, fetcher });
  const pricingRequest = source.pricingUrl
    ? source.pricingUrl === source.modelsUrl
      ? modelsRequest
      : getText(source.pricingUrl, { providerName: source.name, fetcher })
    : undefined;
  const [modelsResult, pricingResult] = await Promise.all([
    Promise.resolve(modelsRequest).then(
      (value) => ({ status: "fulfilled", value }),
      (reason) => ({ status: "rejected", reason })
    ),
    pricingRequest
      ? Promise.resolve(pricingRequest).then(
          (value) => ({ status: "fulfilled", value }),
          (reason) => ({ status: "rejected", reason })
        )
      : Promise.resolve({ status: "unavailable" })
  ]);
  let models = [];
  let embeddedPricing = new Map();
  if (modelsResult.status === "fulfilled") {
    try {
      if (providerId === "openai") models = parseOpenAIModelsMarkdown(modelsResult.value, { now });
      else if (providerId === "anthropic") models = parseAnthropicModelsMarkdown(modelsResult.value, { now });
      else if (providerId === "google") models = parseGoogleModelsMarkdown(modelsResult.value, { now });
      else if (providerId === "kimi") models = parseKimiModelsMarkdown(modelsResult.value, { now });
      else if (providerId === "deepseek") {
        const parsed = parseDeepSeekCatalogHtml(modelsResult.value, { now });
        models = parsed.models;
        embeddedPricing = parsed.prices;
      } else if (providerId === "xai") {
        const parsed = parseXaiModelsPricing(modelsResult.value, { now });
        models = parsed.models;
        embeddedPricing = parsed.prices;
      } else if (providerId === "minimax") {
        const parsed = parseMiniMaxPricingMarkdown(modelsResult.value, { now });
        models = parsed.models;
        embeddedPricing = parsed.prices;
      } else if (providerId === "cohere") models = parseCohereModelsMarkdown(modelsResult.value, { now });
      else if (providerId === "qwen") models = parseQwenModelsMarkdown(modelsResult.value, { now });
    } catch {
      warnings.push(`${source.name} model page could not be parsed; OpenRouter data was used as fallback.`);
    }
    if (models.length === 0) warnings.push(`${source.name} model page had no usable entries; OpenRouter data was used as fallback.`);
  } else {
    warnings.push(`${source.name} model page was unavailable; OpenRouter data was used as fallback.`);
  }
  if (source.pricingUrl && pricingResult.status === "rejected") {
    warnings.push(`${source.name} pricing page was unavailable; OpenRouter pricing was used where available.`);
  } else if (source.pricingUrl && providerId === "openai" && pricingResult.status === "fulfilled") {
    const pricing = parseOpenAIPricingMarkdown(pricingResult.value, { now });
    for (const model of models) {
      if (pricing.has(model.providerModelId)) model.pricing = pricing.get(model.providerModelId);
    }
    if (!pricing.size) warnings.push("OpenAI pricing table was not recognized; OpenRouter pricing was used where available.");
  } else if (source.pricingUrl && providerId === "anthropic" && pricingResult.status === "fulfilled") {
    const pricing = parseAnthropicPricingMarkdown(pricingResult.value, models, { now });
    for (const model of models) {
      if (pricing.has(model.providerModelId)) model.pricing = pricing.get(model.providerModelId);
    }
    if (!pricing.size) warnings.push("Anthropic pricing table was not recognized; OpenRouter pricing was used where available.");
  } else if (source.pricingUrl && providerId === "google" && pricingResult.status === "fulfilled") {
    warnings.push("Google model-specific pricing was not extractable; OpenRouter pricing was used where available.");
  } else if (source.pricingUrl && providerId === "kimi" && pricingResult.status === "fulfilled") {
    const pricing = parseKimiPricingMarkdown(pricingResult.value, models, { now });
    for (const model of models) {
      if (pricing.has(model.providerModelId)) model.pricing = pricing.get(model.providerModelId);
    }
    if (!pricing.size) warnings.push("Kimi pricing table was not recognized; OpenRouter pricing was used where available.");
  } else if (source.pricingUrl &&
      ![...embeddedPricing.values()].some((pricing) => pricing.length > 0) &&
      providerId !== "openai" && providerId !== "anthropic" && providerId !== "google" && providerId !== "kimi") {
    warnings.push(`${source.name} pricing table was not recognized; OpenRouter pricing was used where available.`);
  }
  for (const model of models) {
    if (embeddedPricing.has(model.providerModelId)) {
      model.pricing = embeddedPricing.get(model.providerModelId);
    }
  }
  return { models, warnings };
}

function mergeProfiles(providerId, openRouterModels, official, now) {
  const byId = new Map(openRouterModels.map((model) => [model.providerModelId, model]));
  for (const officialModel of official.models) {
    const existing = byId.get(officialModel.providerModelId);
    byId.set(officialModel.providerModelId, existing
      ? {
          ...existing,
          displayName: officialModel.displayName || existing.displayName,
          availability: officialModel.availability ?? existing.availability,
          capabilities: { ...existing.capabilities, ...officialModel.capabilities },
          supportedSettings: { ...existing.supportedSettings, ...officialModel.supportedSettings },
          pricing: officialModel.pricing.length ? officialModel.pricing : existing.pricing,
          source: officialModel.source,
          lastChecked: checkedDate(now)
        }
      : officialModel);
  }
  return [...byId.values()].map((model) => ({
    ...model,
    providerId,
    lastChecked: checkedDate(now)
  }));
}

export function createPublicAdapters({ fetcher = fetch, now = new Date() } = {}) {
  let openRouterPromise;
  const getOpenRouterCatalog = () => {
    if (!openRouterPromise) {
      openRouterPromise = getJson(OPENROUTER_MODELS_URL, {
        providerName: "OpenRouter",
        fetcher
      });
      openRouterPromise.catch(() => { openRouterPromise = undefined; });
    }
    return openRouterPromise;
  };
  return Object.fromEntries(Object.keys(PUBLIC_PROVIDERS).map((providerId) => [
    providerId,
    async () => {
      const [openRouterResult, official] = await Promise.allSettled([
        getOpenRouterCatalog(),
        fetchOfficialSource(providerId, { fetcher, now })
      ]);
      const officialData = official.status === "fulfilled"
        ? official.value
        : { models: [], warnings: [`${PUBLIC_PROVIDERS[providerId].name} public pages were unavailable.`] };
      const warnings = [...officialData.warnings];
      let openRouterModels = [];
      if (openRouterResult.status === "fulfilled") {
        openRouterModels = parseOpenRouterCatalog(openRouterResult.value, providerId, { now });
      } else {
        warnings.push("OpenRouter public catalog was unavailable.");
      }
      if (!PUBLIC_PROVIDERS[providerId].modelsUrl && openRouterModels.length) {
        warnings.push(`${PUBLIC_PROVIDERS[providerId].name} model and pricing data are currently sourced from OpenRouter; prices are marketplace-specific.`);
      }
      const models = mergeProfiles(providerId, openRouterModels, officialData, now);
      const officialPricedIds = new Set(officialData.models
        .filter((model) => model.pricing.length > 0)
        .map((model) => model.providerModelId));
      if (models.some((model) =>
        !officialPricedIds.has(model.providerModelId) &&
        model.pricing.some((item) => item.source === OPENROUTER_MODELS_URL)
      )) {
        warnings.push("OpenRouter marketplace prices were used for models without extractable official rates.");
      }
      if (models.length === 0) {
        throw new Error(`${PUBLIC_PROVIDERS[providerId].name}: no usable public model source was available.`);
      }
      return { models, warnings };
    }
  ]));
}
