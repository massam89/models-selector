const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

export function getPriceFreshness(price, now = new Date()) {
  if (!price || !price.lastChecked) return "unknown";
  const checkedAt = Date.parse(price.lastChecked);
  const current = now instanceof Date ? now.getTime() : Date.parse(now);
  if (!Number.isFinite(checkedAt) || !Number.isFinite(current)) return "unknown";
  return current - checkedAt > STALE_AFTER_MS ? "stale" : "fresh";
}

function stableValue(value) {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function priceMap(model, now) {
  const prices = model.pricing ?? [];
  const map = new Map();
  for (const price of prices) {
    if (map.has(price.component) || price.amount === null || getPriceFreshness(price, now) !== "fresh") return null;
    map.set(price.component, price);
  }
  return map.size ? map : null;
}

export function comparePriceProfiles(left, right, now = new Date()) {
  const leftPrices = priceMap(left, now);
  const rightPrices = priceMap(right, now);
  if (!leftPrices || !rightPrices || leftPrices.size !== rightPrices.size) {
    return { order: 0, comparable: false, status: "incomplete-or-not-fresh" };
  }
  const leftKeys = [...leftPrices.keys()].sort();
  const rightKeys = [...rightPrices.keys()].sort();
  if (leftKeys.some((key, index) => key !== rightKeys[index])) {
    return { order: 0, comparable: false, status: "different-components" };
  }
  let leftCheaper = false;
  let rightCheaper = false;
  for (const key of leftKeys) {
    const a = leftPrices.get(key);
    const b = rightPrices.get(key);
    if (a.currency !== b.currency || a.unit !== b.unit ||
        stableValue(a.conditions ?? {}) !== stableValue(b.conditions ?? {})) {
      return { order: 0, comparable: false, status: "different-units-or-conditions" };
    }
    if (a.amount < b.amount) leftCheaper = true;
    if (b.amount < a.amount) rightCheaper = true;
  }
  if (leftCheaper && !rightCheaper) return { order: -1, comparable: true, status: "left-dominates" };
  if (rightCheaper && !leftCheaper) return { order: 1, comparable: true, status: "right-dominates" };
  return { order: 0, comparable: true, status: leftCheaper ? "crossed" : "equal" };
}

export function recommendModels(models, capabilityTags, { now = new Date() } = {}) {
  const tags = [...new Set(capabilityTags)];
  const candidates = models
    .filter((model) => model.availability !== "unavailable")
    .map((model) => ({
      model,
      matched: tags.filter((tag) => model.capabilities?.[tag]?.support === "supported").length
    }));
  const results = candidates.map((candidate, index) => {
    let cheaperThan = 0;
    let moreExpensiveThan = 0;
    for (let otherIndex = 0; otherIndex < candidates.length; otherIndex += 1) {
      if (index === otherIndex) continue;
      const comparison = comparePriceProfiles(candidate.model, candidates[otherIndex].model, now);
      if (!comparison.comparable) continue;
      if (comparison.order < 0) cheaperThan += 1;
      else if (comparison.order > 0) moreExpensiveThan += 1;
    }
    const decisivePriceComparisons = cheaperThan + moreExpensiveThan;
    const capabilityPoints = tags.length ? 70 * candidate.matched / tags.length : 0;
    const pricePoints = decisivePriceComparisons
      ? 30 * cheaperThan / decisivePriceComparisons
      : 0;
    return {
      model: candidate.model,
      score: Math.max(1, Math.round(capabilityPoints + pricePoints))
    };
  });
  results.sort((left, right) => {
    if (left.score !== right.score) return right.score - left.score;
    if (left.model.providerId !== right.model.providerId) {
      return left.model.providerId < right.model.providerId ? -1 : 1;
    }
    if (left.model.providerModelId !== right.model.providerModelId) {
      return left.model.providerModelId < right.model.providerModelId ? -1 : 1;
    }
    return 0;
  });
  return { results };
}
