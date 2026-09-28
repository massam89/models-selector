import { createPublicAdapters } from "./providers/public-catalog.js";

const ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
const SETTING_PATTERN = /^[a-z][A-Za-z0-9._-]*$/;
const AVAILABILITY = new Set(["available", "unavailable", "unknown"]);
const SUPPORT = new Set(["supported", "unsupported"]);
const DATE_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/;

export function modelKey(providerId, providerModelId) {
  return `${providerId}/${providerModelId}`;
}

function requireString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string`);
  }
}

function validateDate(value, field, optional = false) {
  if (value === undefined || value === null) {
    if (optional) return;
    throw new Error(`${field} must be an ISO date or timestamp`);
  }
  const match = typeof value === "string" ? DATE_PATTERN.exec(value) : null;
  if (!match || Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be an ISO date or timestamp`);
  }
  if (new Date(`${match[1]}T00:00:00.000Z`).toISOString().slice(0, 10) !== match[1]) {
    throw new Error(`${field} must be a valid calendar date`);
  }
}

function validateProvider(provider) {
  if (!provider || typeof provider !== "object") throw new Error("provider must be an object");
  requireString(provider.id, "provider.id");
  if (!ID_PATTERN.test(provider.id)) throw new Error("provider.id must be a lowercase identifier");
  requireString(provider.displayName, "provider.displayName");
  const endpoint = new URL(provider.catalogEndpoint);
  if (endpoint.protocol !== "https:") throw new Error("provider.catalogEndpoint must use HTTPS");
  requireString(provider.pricingSource, "provider.pricingSource");
  return provider;
}

function validateCategory(category) {
  if (!category || typeof category !== "object") throw new Error("category must be an object");
  requireString(category.id, "category.id");
  if (!ID_PATTERN.test(category.id)) throw new Error("category.id must be a lowercase identifier");
  requireString(category.label, "category.label");
  requireString(category.description, "category.description");
  if (!Array.isArray(category.capabilityTags)) {
    throw new Error(`category ${category.id} must have a capabilityTags array`);
  }
  for (const tag of category.capabilityTags) {
    requireString(tag, `category ${category.id} capability tag`);
    if (!ID_PATTERN.test(tag)) throw new Error(`invalid capability tag: ${tag}`);
  }
  if (category.provisional !== undefined && typeof category.provisional !== "boolean") {
    throw new Error(`category ${category.id} provisional must be boolean`);
  }
  if (category.suggestedSettings !== undefined &&
      (!category.suggestedSettings || typeof category.suggestedSettings !== "object" || Array.isArray(category.suggestedSettings))) {
    throw new Error(`category ${category.id} suggestedSettings must be an object`);
  }
  return category;
}

function validateCapability(value, field) {
  if (!value || typeof value !== "object" || !SUPPORT.has(value.support)) {
    throw new Error(`${field}.support must be supported or unsupported`);
  }
  requireString(value.source, `${field}.source`);
  validateDate(value.lastChecked, `${field}.lastChecked`, true);
}

function validateSetting(value, field) {
  if (!value || typeof value !== "object" || typeof value.supported !== "boolean") {
    throw new Error(`${field}.supported must be boolean`);
  }
  requireString(value.source, `${field}.source`);
  if (value.values !== undefined && !Array.isArray(value.values)) {
    throw new Error(`${field}.values must be an array`);
  }
  if (value.values) {
    for (const item of value.values) requireString(item, `${field}.values item`);
  }
}

function validatePrice(price, field = "pricing record") {
  if (!price || typeof price !== "object") throw new Error(`${field} must be an object`);
  requireString(price.component, `${field}.component`);
  if (price.amount !== null && (!Number.isFinite(price.amount) || price.amount < 0)) {
    throw new Error(`${field}.amount must be a non-negative number or null`);
  }
  if (price.amount !== null) {
    requireString(price.currency, `${field}.currency`);
    if (!/^[A-Z]{3}$/.test(price.currency)) throw new Error(`${field}.currency must be a 3-letter code`);
    requireString(price.unit, `${field}.unit`);
    requireString(price.source, `${field}.source`);
  }
  validateDate(price.lastChecked, `${field}.lastChecked`, true);
  if (price.conditions !== undefined && (!price.conditions || typeof price.conditions !== "object" || Array.isArray(price.conditions))) {
    throw new Error(`${field}.conditions must be an object`);
  }
}

export function validateModelProfile(model, providerIds) {
  if (!model || typeof model !== "object") throw new Error("model profile must be an object");
  requireString(model.providerId, "model.providerId");
  requireString(model.providerModelId, "model.providerModelId");
  requireString(model.displayName, "model.displayName");
  if (providerIds && !providerIds.includes(model.providerId)) {
    throw new Error(`unknown provider ${model.providerId}`);
  }
  if (!AVAILABILITY.has(model.availability)) {
    throw new Error("model.availability must be available, unavailable, or unknown");
  }
  if (!model.capabilities || typeof model.capabilities !== "object" || Array.isArray(model.capabilities)) {
    throw new Error("model.capabilities must be an object");
  }
  for (const [tag, capability] of Object.entries(model.capabilities)) {
    if (!ID_PATTERN.test(tag)) throw new Error(`invalid capability tag: ${tag}`);
    validateCapability(capability, `model.capabilities.${tag}`);
  }
  if (!model.supportedSettings || typeof model.supportedSettings !== "object" || Array.isArray(model.supportedSettings)) {
    throw new Error("model.supportedSettings must be an object");
  }
  for (const [setting, value] of Object.entries(model.supportedSettings)) {
    if (!SETTING_PATTERN.test(setting)) throw new Error(`invalid setting identifier: ${setting}`);
    validateSetting(value, `model.supportedSettings.${setting}`);
  }
  if (!Array.isArray(model.pricing)) throw new Error("model.pricing must be an array");
  for (const [index, price] of model.pricing.entries()) validatePrice(price, `model.pricing[${index}]`);
  requireString(model.source, "model.source");
  validateDate(model.lastChecked, "model.lastChecked", true);
  return model;
}

export function validateCatalog(catalog) {
  if (!catalog || typeof catalog !== "object" || catalog.version !== 1) {
    throw new Error("catalog must be an object with version 1");
  }
  for (const field of ["providers", "categories", "models"]) {
    if (!Array.isArray(catalog[field])) throw new Error(`catalog.${field} must be an array`);
  }
  const providerIds = new Set();
  for (const provider of catalog.providers) {
    validateProvider(provider);
    if (providerIds.has(provider.id)) throw new Error(`duplicate provider ${provider.id}`);
    providerIds.add(provider.id);
  }
  const categoryIds = new Set();
  for (const category of catalog.categories) {
    validateCategory(category);
    if (categoryIds.has(category.id)) throw new Error(`duplicate category ${category.id}`);
    categoryIds.add(category.id);
  }
  const identities = new Set();
  for (const model of catalog.models) {
    validateModelProfile(model, [...providerIds]);
    const key = modelKey(model.providerId, model.providerModelId);
    if (identities.has(key)) throw new Error(`duplicate model identity ${key}`);
    identities.add(key);
  }
  return catalog;
}

function validateOverride(override) {
  requireString(override.providerId, "override.providerId");
  requireString(override.providerModelId, "override.providerModelId");
  requireString(override.source, "override.source");
  validateDate(override.updatedAt, "override.updatedAt");
  const { fieldPath, value } = override;
  if (fieldPath === "availability") {
    if (!AVAILABILITY.has(value)) throw new Error("override availability is invalid");
  } else if (fieldPath === "displayName") {
    requireString(value, "override displayName");
  } else if (fieldPath === "pricing") {
    if (!Array.isArray(value)) throw new Error("override pricing must be an array");
    value.forEach((price, index) => validatePrice(price, `override pricing[${index}]`));
  } else {
    const capability = /^capabilities\.([a-z0-9][a-z0-9._-]*)$/.exec(fieldPath);
    const setting = /^supportedSettings\.([a-z][A-Za-z0-9._-]*)$/.exec(fieldPath);
    if (capability) validateCapability(value, `override ${fieldPath}`);
    else if (setting) validateSetting(value, `override ${fieldPath}`);
    else throw new Error(`field ${fieldPath} is not editable; use an allowlisted model field`);
  }
  return override;
}

export function createFieldOverride(override) {
  return validateOverride({ ...override });
}

export function applyFieldOverrides(model, overrides) {
  const result = structuredClone(model);
  result.manualOverrides = [];
  for (const override of overrides) {
    validateOverride(override);
    if (override.providerId !== model.providerId || override.providerModelId !== model.providerModelId) continue;
    if (override.fieldPath === "pricing" || override.fieldPath === "availability" || override.fieldPath === "displayName") {
      result[override.fieldPath] = structuredClone(override.value);
      result.manualOverrides.push(override.fieldPath);
      continue;
    }
    const [group, key] = override.fieldPath.split(".");
    result[group][key] = structuredClone(override.value);
    result.manualOverrides.push(override.fieldPath);
  }
  return result;
}

export function setFieldOverride(state, override) {
  validateOverride(override);
  const next = structuredClone(state);
  next.overrides = next.overrides.filter((item) =>
    !(item.providerId === override.providerId &&
      item.providerModelId === override.providerModelId &&
      item.fieldPath === override.fieldPath)
  );
  next.overrides.push(structuredClone(override));
  return next;
}

export function resetFieldOverride(state, providerId, providerModelId, fieldPath) {
  const next = structuredClone(state);
  next.overrides = next.overrides.filter((item) =>
    !(item.providerId === providerId && item.providerModelId === providerModelId && item.fieldPath === fieldPath)
  );
  return next;
}

export function addManualModel(catalog, model) {
  validateModelProfile(model, catalog.providers.map((provider) => provider.id));
  const key = modelKey(model.providerId, model.providerModelId);
  if (catalog.models.some((existing) => modelKey(existing.providerId, existing.providerModelId) === key)) {
    throw new Error(`duplicate model identity ${key}`);
  }
  return { ...structuredClone(catalog), models: [...catalog.models, structuredClone(model)] };
}

export function validateRuntimeState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new Error("catalog state must be an object");
  if (!state.snapshots || typeof state.snapshots !== "object" || Array.isArray(state.snapshots)) {
    throw new Error("catalog state snapshots must be an object");
  }
  if (!Array.isArray(state.overrides) || !Array.isArray(state.customModels)) {
    throw new Error("catalog state overrides and customModels must be arrays");
  }
  state.overrides.forEach(validateOverride);
  for (const [providerId, snapshot] of Object.entries(state.snapshots)) {
    requireString(providerId, "snapshot provider ID");
    if (!snapshot || typeof snapshot !== "object" || !Array.isArray(snapshot.models)) {
      throw new Error(`snapshot ${providerId} must contain a models array`);
    }
    validateDate(snapshot.lastSuccessfulRefresh, `snapshot ${providerId} lastSuccessfulRefresh`, true);
    const identities = new Set();
    for (const model of snapshot.models) {
      validateModelProfile(model);
      if (model.providerId !== providerId) throw new Error(`snapshot ${providerId} contains a different provider`);
      const key = modelKey(model.providerId, model.providerModelId);
      if (identities.has(key)) throw new Error(`snapshot ${providerId} contains duplicate identity ${key}`);
      identities.add(key);
    }
  }
  for (const model of state.customModels) validateModelProfile(model);
  return state;
}

function isTransientError(error) {
  return error?.retryable === true ||
    ["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN"].includes(error?.code) ||
    /timeout|temporarily unavailable|network/i.test(error?.message ?? "");
}

function safeProviderError(error) {
  return error?.publicMessage ?? error?.message ?? "Refresh failed.";
}

export async function refreshProviderCatalog({
  providers,
  providerIds,
  state,
  adapters,
  fetcher = fetch,
  saveState,
  now = new Date()
}) {
  for (const providerId of providerIds) {
    if (!providers.some((provider) => provider.id === providerId)) throw new Error(`unknown provider ${providerId}`);
  }
  const selectedAdapters = adapters ?? createPublicAdapters({ fetcher, now });
  const outcomes = [];
  for (const providerId of providerIds) {
    const adapter = selectedAdapters[providerId];
    if (typeof adapter !== "function") {
      outcomes.push({ providerId, success: false, message: "No refresh adapter is configured." });
      continue;
    }
    try {
      let models;
      let warnings = [];
      for (let attempt = 0; ; attempt += 1) {
        try {
          const result = await adapter({ fetcher, now });
          models = Array.isArray(result) ? result : result?.models;
          warnings = Array.isArray(result?.warnings) ? result.warnings : [];
          break;
        } catch (error) {
          if (attempt >= 1 || !isTransientError(error)) throw error;
        }
      }
      if (!Array.isArray(models)) throw new Error("provider returned an invalid model list");
      if (models.length === 0) throw new Error("provider returned an empty model list; previous snapshot was retained");
      const provider = providers.find((item) => item.id === providerId);
      const checkedAt = now.toISOString();
      const normalized = models.map((model) => validateModelProfile({
        availability: "available",
        capabilities: {},
        supportedSettings: {},
        pricing: [],
        source: provider.catalogEndpoint,
        lastChecked: checkedAt,
        ...model,
        providerId
      }, providers.map((item) => item.id)));
      const refreshedIds = new Set();
      for (const model of normalized) {
        const key = modelKey(model.providerId, model.providerModelId);
        if (refreshedIds.has(key)) throw new Error(`provider returned duplicate model identity ${key}`);
        refreshedIds.add(key);
      }
      const candidate = structuredClone(state);
      candidate.snapshots[providerId] = {
        models: normalized,
        lastSuccessfulRefresh: checkedAt
      };
      if (saveState) await saveState(candidate);
      state.snapshots[providerId] = candidate.snapshots[providerId];
      outcomes.push({ providerId, success: true, count: normalized.length, checkedAt, warnings });
    } catch (error) {
      outcomes.push({
        providerId,
        success: false,
        message: safeProviderError(error)
      });
    }
  }
  return { outcomes };
}

export function buildEffectiveCatalog(catalog, state) {
  const snapshots = state.snapshots ?? {};
  const base = new Map(catalog.models.map((model) => [modelKey(model.providerId, model.providerModelId), structuredClone(model)]));
  for (const [providerId, snapshot] of Object.entries(snapshots)) {
    const fetched = new Map((snapshot.models ?? []).map((model) => [modelKey(providerId, model.providerModelId), model]));
    for (const [key, model] of base) {
      if (model.providerId === providerId && !fetched.has(key)) model.availability = "unavailable";
    }
    for (const [key, refreshed] of fetched) {
      const previous = base.get(key);
      base.set(key, previous
        ? {
            ...previous,
            displayName: refreshed.displayName,
            availability: refreshed.availability,
            capabilities: { ...previous.capabilities, ...refreshed.capabilities },
            supportedSettings: { ...previous.supportedSettings, ...refreshed.supportedSettings },
            pricing: refreshed.pricing.length ? refreshed.pricing : previous.pricing,
            source: refreshed.source,
            lastChecked: refreshed.lastChecked
          }
        : structuredClone(refreshed));
    }
  }
  for (const model of state.customModels ?? []) {
    base.set(modelKey(model.providerId, model.providerModelId), structuredClone(model));
  }
  const models = [...base.values()].map((model) => {
    const overrides = (state.overrides ?? []).filter((item) =>
      item.providerId === model.providerId && item.providerModelId === model.providerModelId
    );
    return applyFieldOverrides(model, overrides);
  });
  return validateCatalog({ ...catalog, models });
}
