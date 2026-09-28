export const today = "2026-09-27";

export function makeModel(overrides = {}) {
  return {
    providerId: "openai",
    providerModelId: "model-a",
    displayName: "Model A",
    availability: "available",
    capabilities: {
      coding: { support: "supported", source: "fixture", lastChecked: today }
    },
    supportedSettings: {
      temperature: { supported: true, source: "fixture" }
    },
    pricing: [],
    source: "fixture",
    lastChecked: today,
    ...overrides
  };
}

export function makeCatalog(models = [makeModel()]) {
  return {
    version: 1,
    providers: [
      {
        id: "openai",
        displayName: "OpenAI",
        catalogEndpoint: "https://api.example.test/models",
        pricingSource: "https://example.test/pricing"
      },
      {
        id: "google",
        displayName: "Google",
        catalogEndpoint: "https://api.example.test/google/models",
        pricingSource: "https://example.test/google-pricing"
      }
    ],
    categories: [
      {
        id: "coding",
        label: "Coding",
        description: "Write or change code.",
        capabilityTags: ["coding"],
        suggestedSettings: {},
        provisional: true
      }
    ],
    models
  };
}
