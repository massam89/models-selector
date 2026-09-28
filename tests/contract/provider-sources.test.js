import test from "node:test";
import assert from "node:assert/strict";
import {
  createPublicAdapters,
  OPENROUTER_MODELS_URL,
  parseAnthropicModelsMarkdown,
  parseAnthropicPricingMarkdown,
  parseCohereModelsMarkdown,
  parseDeepSeekCatalogHtml,
  parseGoogleModelsMarkdown,
  parseKimiModelsMarkdown,
  parseKimiPricingMarkdown,
  parseMiniMaxPricingMarkdown,
  parseOpenAIModelsMarkdown,
  parseOpenAIPricingMarkdown,
  parseQwenModelsMarkdown,
  parseXaiModelsPricing,
  parseOpenRouterCatalog
} from "../../src/providers/public-catalog.js";
import { getJson, REQUEST_TIMEOUT_MS } from "../../src/providers/shared.js";

const checkedAt = new Date("2026-09-27T12:00:00.000Z");

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Failure",
    json: async () => JSON.parse(body),
    text: async () => body
  };
}

const openAiModels = `# Models
- [GPT Test](/api/docs/models/gpt-test.md): Coding and reasoning.
- [GPT Next](/api/docs/models/gpt-next.md): A fast model.
`;

const openAiPricing = `### Standard pricing data
| Model | Short context input | Short context cached input | Short context cache writes | Short context output |
| --- | --- | --- | --- | --- |
| gpt-test | $2.00 | $0.20 | $2.50 | $10.00 |
| gpt-next | $1.00 | - | - | $5.00 |
### Batch pricing data
| Model | Short context input | Short context cached input | Short context cache writes | Short context output |
| --- | --- | --- | --- | --- |
| gpt-test | $1.00 | $0.10 | $1.25 | $5.00 |
`;

const anthropicModels = `| Feature | Claude Sonnet Test | Claude Haiku Test |
| --- | --- | --- |
| Description | Reasoning and coding | Fast coding model |
| Claude API ID | \`claude-sonnet-test\` | \`claude-haiku-test\` |
`;

const anthropicPricing = `| Model | Base input tokens | Output tokens |
| --- | --- | --- |
| Claude Sonnet Test | $3 / MTok | $15 / MTok |
`;

test("public refresh adapters include all eleven configured provider IDs", () => {
  assert.deepEqual(Object.keys(createPublicAdapters()).sort(), [
    "anthropic",
    "cohere",
    "deepseek",
    "google",
    "kimi",
    "meta-llama",
    "minimax",
    "mistral",
    "openai",
    "qwen",
    "xai"
  ]);
});

test("OpenRouter parsing preserves exact provider IDs and accepts missing pricing", () => {
  const models = parseOpenRouterCatalog({
    data: [
      {
        id: "google/models/gemini-test",
        name: "Gemini Test",
        supported_parameters: ["temperature", "reasoning_effort"],
        reasoning: { supported_efforts: ["high", "low"] },
        pricing: { prompt: "0.000001", completion: "0.000002" }
      },
      { id: "openai/model-without-pricing", name: "No listed price" },
      { id: "anthropic/not-openai", name: "Different provider" }
    ]
  }, "google", { now: checkedAt });

  assert.equal(models.length, 1);
  assert.equal(models[0].providerModelId, "gemini-test");
  assert.equal(models[0].pricing[0].amount, 1);
  assert.equal(models[0].pricing[0].conditions.marketplace, "OpenRouter");
  assert.equal(models[0].supportedSettings.temperature.supported, true);
  assert.deepEqual(models[0].supportedSettings.reasoningEffort.values, ["high", "low"]);
});

test("OpenRouter parser rejects malformed catalog payloads", () => {
  assert.throws(() => parseOpenRouterCatalog({ data: "not-an-array" }, "openai"), /invalid model-list response/i);
  assert.throws(() => parseOpenRouterCatalog({ data: [] }, "unknown"), /unsupported provider/i);
});

test("OpenRouter provider IDs map DeepSeek, Mistral, xAI/Grok, Cohere, Meta Llama, Qwen, MiniMax, and Kimi", () => {
  const cases = [
    ["deepseek", "deepseek/deepseek-chat"],
    ["mistral", "mistralai/mistral-large"],
    ["xai", "x-ai/grok-4"],
    ["cohere", "cohere/command-a"],
    ["meta-llama", "meta-llama/llama-4-maverick"],
    ["qwen", "qwen/qwen3-coder"],
    ["minimax", "minimax/minimax-m2"],
    ["kimi", "moonshotai/kimi-k3"]
  ];
  for (const [providerId, sourceId] of cases) {
    const models = parseOpenRouterCatalog({
      data: [{
        id: sourceId,
        name: `${providerId} model`,
        description: "A coding model for software engineering.",
        pricing: { prompt: "0.000001" }
      }]
    }, providerId, { now: checkedAt });
    assert.equal(models.length, 1, providerId);
    assert.equal(models[0].providerModelId, sourceId.slice(sourceId.indexOf("/") + 1), providerId);
    assert.equal(models[0].capabilities["code-generation"].support, "supported", providerId);
  }
});

test("additional providers use OpenRouter with a visible marketplace-source notice", async () => {
  const adapters = createPublicAdapters({
    now: checkedAt,
    fetcher: async (url, options) => {
      assert.equal(options.headers.authorization, undefined);
      assert.equal(String(url), OPENROUTER_MODELS_URL);
      return response(JSON.stringify({
        data: [{ id: "mistralai/mistral-large", name: "Mistral Large", pricing: { prompt: "0.000001" } }]
      }));
    }
  });
  const result = await adapters.mistral();
  assert.equal(result.models[0].providerId, "mistral");
  assert.ok(result.warnings.some((warning) => /marketplace-specific/.test(warning)));
});

test("new official provider adapters enrich profiles while remaining credential-free", async () => {
  const pages = new Map([
    ["https://api-docs.deepseek.com/quick_start/pricing/", `
      <table>
        <tr><td colspan="3">MODEL</td><td>deepseek-flash</td></tr>
        <tr><td>THINKING MODE</td><td colspan="2">Supports both non-thinking and thinking modes</td></tr>
        <tr><td>1M INPUT TOKENS (CACHE MISS)</td><td>OFF-PEAK</td><td>$0.15</td></tr>
        <tr><td>PEAK</td><td>$0.3</td></tr>
        <tr><td>1M OUTPUT TOKENS</td><td>OFF-PEAK</td><td>$0.6</td></tr>
        <tr><td>PEAK</td><td>$1.2</td></tr>
      </table>
    `],
    ["https://docs.x.ai/developers/models", `| Model | Context | Input / 1M tokens | Cached input / 1M tokens | Output / 1M tokens |
| --- | --- | --- | --- | --- |
| grok-4.7 (< 200k prompt tokens) | 500k | $2.00 | $0.50 | $6.00 |`],
    ["https://platform.minimax.io/docs/guides/pricing-paygo.md", `| Model | Input | Output | Prompt caching Read |
| --- | --- | --- | --- |
| **MiniMax-M3** | \\$0.30 / M tokens | \\$1.20 / M tokens | \\$0.06 / M tokens |`],
    ["https://docs.cohere.com/docs/models.md", `| Model Name | Status | Description | Modality | Context Length | Maximum Output Tokens | Endpoints |
| --- | --- | --- | --- | --- | --- | --- |
| \`command-a\` | Deprecated | Reasoning and coding model | Text | 256k | 8k | [Chat](../reference/chat) |`],
    ["https://help.aliyun.com/zh/model-studio/text-generation-model", `| **模型ID** | **上下文** | **思考模式** | **Function Calling** |
| --- | --- | --- | --- |
| \`qwen3-coder-plus\` | 1M | 支持 | 支持 |`]
  ]);
  const adapters = createPublicAdapters({
    now: checkedAt,
    fetcher: async (url, options) => {
      assert.equal(options.headers.authorization, undefined);
      assert.equal(options.headers["x-api-key"], undefined);
      if (String(url) === OPENROUTER_MODELS_URL) return response(JSON.stringify({
        data: [{
          id: "cohere/command-a",
          name: "Command A",
          pricing: { prompt: "0.000001", completion: "0.000002" }
        }]
      }));
      const body = pages.get(String(url));
      if (body === undefined) throw new Error(`Unexpected official source ${url}`);
      return response(body);
    }
  });

  const [deepseek, xai, minimax, cohere, qwen] = await Promise.all([
    adapters.deepseek(),
    adapters.xai(),
    adapters.minimax(),
    adapters.cohere(),
    adapters.qwen()
  ]);
  assert.equal(deepseek.models[0].pricing.find((item) => item.component === "input").amount, 0.3);
  assert.equal(xai.models[0].pricing.find((item) => item.component === "output").amount, 6);
  assert.equal(minimax.models[0].pricing.find((item) => item.component === "cached-input").amount, 0.06);
  assert.equal(cohere.models[0].source, "https://docs.cohere.com/docs/models");
  assert.equal(cohere.models[0].availability, "unavailable");
  assert.equal(cohere.models[0].pricing[0].conditions.marketplace, "OpenRouter");
  assert.equal(qwen.models[0].capabilities["code-generation"].support, "supported");
});

test("Kimi adapter uses official model/pricing data and OpenRouter fallback without credentials", async () => {
  const pages = new Map([
    ["https://platform.kimi.ai/docs/models.md", `## Multi-modal Model
| Model Name | Description |
| --- | --- |
| \`kimi-k3\` | Coding and reasoning model. |
## Deprecated Models
| \`kimi-k2.5\` | Deprecated |
`],
    ["https://platform.kimi.ai/docs/pricing/chat.md", `rows={[
["kimi-k3", "1M tokens", <>{"$"}3.00</>, <>{"$"}6.00</>, <>{"$"}0.30</>, <>{"$"}3.00</>, <>{"$"}15.00</>, "1,048,576 tokens"],
]}`]
  ]);
  const adapters = createPublicAdapters({
    now: checkedAt,
    fetcher: async (url, options) => {
      assert.equal(options.headers.authorization, undefined);
      assert.equal(options.headers["x-api-key"], undefined);
      if (String(url) === OPENROUTER_MODELS_URL) return response(JSON.stringify({
        data: [{
          id: "moonshotai/kimi-k3",
          name: "Kimi K3",
          pricing: { prompt: "0.000004", completion: "0.000020" }
        }]
      }));
      const body = pages.get(String(url));
      if (body === undefined) throw new Error(`Unexpected official source ${url}`);
      return response(body);
    }
  });

  const result = await adapters.kimi();
  assert.equal(result.models.length, 2);
  assert.equal(result.models[0].providerModelId, "kimi-k3");
  assert.equal(result.models[1].availability, "unavailable");
  assert.equal(result.models[0].pricing.find((price) => price.component === "input").amount, 3);
  assert.equal(result.models[0].pricing[0].conditions.cacheTtl, "5min");
});

test("OpenAI model and pricing pages parse official IDs and standard component prices", () => {
  const models = parseOpenAIModelsMarkdown(openAiModels, { now: checkedAt });
  const prices = parseOpenAIPricingMarkdown(openAiPricing, { now: checkedAt });

  assert.deepEqual(models.map((model) => model.providerModelId), ["gpt-test", "gpt-next"]);
  assert.match(models[0].capabilities.reasoning.source, /developers\.openai\.com/);
  assert.equal(prices.get("gpt-test").find((item) => item.component === "input").amount, 2);
  assert.equal(prices.get("gpt-test").find((item) => item.component === "output").amount, 10);
  assert.equal(prices.get("gpt-test").find((item) => item.component === "cached-input").amount, 0.2);
  assert.equal(prices.get("gpt-test").find((item) => item.component === "cache-write").amount, 2.5);
  assert.equal(prices.get("gpt-next").find((item) => item.component === "cached-input").amount, null);
});

test("Anthropic model and pricing pages map official model IDs and prices", () => {
  const models = parseAnthropicModelsMarkdown(anthropicModels, { now: checkedAt });
  const prices = parseAnthropicPricingMarkdown(anthropicPricing, models, { now: checkedAt });

  assert.deepEqual(models.map((model) => model.providerModelId), ["claude-sonnet-test", "claude-haiku-test"]);
  assert.equal(prices.get("claude-sonnet-test")[0].amount, 3);
  assert.equal(prices.get("claude-sonnet-test")[1].amount, 15);
});

test("Google model page parser accepts model tables and excludes non-text endpoints", () => {
  const models = parseGoogleModelsMarkdown(`| Model | Endpoint | Description |
| --- | --- | --- |
| Gemini Test | gemini-test | Reasoning and coding model |
| Audio Test | gemini-audio-test | Audio generation model |
`, { now: checkedAt });
  assert.deepEqual(models.map((model) => model.providerModelId), ["gemini-test"]);
  assert.equal(models[0].capabilities.reasoning.support, "supported");
});

test("Kimi official model and pricing pages import active text models and current rates", () => {
  const models = parseKimiModelsMarkdown(`## Multi-modal Model
| Model Name | Description |
| --- | --- |
| \`kimi-k3\` | Long-horizon coding and deep reasoning. |
| \`kimi-k2.7-code\` | Dedicated coding model. |
## Deprecated Models
| \`kimi-k2.5\` | Deprecated |
`, { now: checkedAt });
  const prices = parseKimiPricingMarkdown(`rows={[
["kimi-k3", "1M tokens", <>{"$"}3.00</>, <>{"$"}6.00</>, <>{"$"}0.30</>, <>{"$"}3.00</>, <>{"$"}15.00</>, "1,048,576 tokens"],
["kimi-k2.7-code", "1M tokens", <>{"$"}0.19</>, <>{"$"}0.95</>, <>{"$"}4.00</>, "262,144 tokens"],
]}`, models, { now: checkedAt });

  assert.deepEqual(models.map((model) => model.providerModelId), [
    "kimi-k3",
    "kimi-k2.7-code",
    "kimi-k2.5"
  ]);
  assert.equal(models[0].capabilities.reasoning.support, "supported");
  assert.equal(models[1].capabilities["code-generation"].support, "supported");
  assert.equal(models[2].availability, "unavailable");
  assert.deepEqual(prices.get("kimi-k3").map(({ component, amount }) => [component, amount]), [
    ["cache-write", 3],
    ["cache-write", 6],
    ["cached-input", 0.3],
    ["input", 3],
    ["output", 15]
  ]);
  assert.deepEqual(prices.get("kimi-k3").slice(0, 2).map(({ conditions }) => conditions.cacheTtl), ["5min", "1h"]);
  assert.deepEqual(prices.get("kimi-k2.7-code").map(({ component, amount }) => [component, amount]), [
    ["cached-input", 0.19],
    ["input", 0.95],
    ["output", 4]
  ]);
});

test("DeepSeek official page parser extracts model IDs, features, and peak prices", () => {
  const result = parseDeepSeekCatalogHtml(`
    <table>
      <tr><td colspan="3">MODEL</td><td>deepseek-flash<sup>(1)</sup></td><td>deepseek-v4-pro</td></tr>
      <tr><td>THINKING MODE</td><td colspan="4">Supports both non-thinking and thinking modes</td></tr>
      <tr><td rowspan="2">FEATURES</td><td>Tool Calls</td><td>✓</td><td>✓</td></tr>
      <tr><td>1M INPUT TOKENS (CACHE HIT)</td><td>OFF-PEAK</td><td>$0.003</td><td>$0.022</td></tr>
      <tr><td>PEAK</td><td>$0.006</td><td>$0.044</td></tr>
      <tr><td>1M INPUT TOKENS (CACHE MISS)</td><td>OFF-PEAK</td><td>$0.15</td><td>$0.66</td></tr>
      <tr><td>PEAK</td><td>$0.3</td><td>$1.32</td></tr>
      <tr><td>1M OUTPUT TOKENS</td><td>OFF-PEAK</td><td>$0.6</td><td>$1.98</td></tr>
      <tr><td>PEAK</td><td>$1.2</td><td>$3.96</td></tr>
    </table>
  `, { now: checkedAt });

  assert.deepEqual(result.models.map((model) => model.providerModelId), ["deepseek-flash", "deepseek-v4-pro"]);
  assert.equal(result.models[0].capabilities.reasoning.support, "supported");
  assert.equal(result.models[0].capabilities["api-integration"].support, "supported");
  assert.deepEqual(result.prices.get("deepseek-flash").map(({ component, amount }) => [component, amount]), [
    ["cached-input", 0.006],
    ["input", 0.3],
    ["output", 1.2]
  ]);
});

test("xAI official model table extracts text models and base-context prices", () => {
  const result = parseXaiModelsPricing(`| Model | Context | Input / 1M tokens | Cached input / 1M tokens | Output / 1M tokens |
| --- | --- | --- | --- | --- |
| grok-4.7 (< 200k prompt tokens) | 500k | $2.00 | $0.50 | $6.00 |
| grok-4.7 (≥ 200k prompt tokens) | 500k | $4.00 | $1.00 | $12.00 |
| grok-4.6 (< 200k prompt tokens) | 500k | $2.00 | $0.50 | $6.00 |
| Model | Cost |
| --- | --- |
| grok-imagine-image | $0.02 / image |`, { now: checkedAt });

  assert.deepEqual(result.models.map((model) => model.providerModelId), ["grok-4.7", "grok-4.6"]);
  assert.equal(result.models[0].capabilities["code-generation"].support, "supported");
  assert.deepEqual(result.prices.get("grok-4.7").map(({ component, amount }) => [component, amount]), [
    ["input", 2],
    ["cached-input", 0.5],
    ["output", 6]
  ]);
  const htmlResult = parseXaiModelsPricing(`<table>
    <tr><th>Model</th><th>Context</th><th>Input / 1M tokens</th><th>Cached input / 1M tokens</th><th>Output / 1M tokens</th></tr>
    <tr><td>grok-4.7 (&lt; 200k prompt tokens)</td><td>500k</td><td>$2.00</td><td>$0.50</td><td>$6.00</td></tr>
  </table>`, { now: checkedAt });
  assert.equal(htmlResult.models[0].providerModelId, "grok-4.7");
});

test("MiniMax official pricing parser uses standard rates and keeps billing conditions", () => {
  const result = parseMiniMaxPricingMarkdown(`<Tabs>
  <Tab title="Standard">
    | Model | Input | Output | Prompt caching Read | Prompt caching Write |
    | --- | --- | --- | --- | --- |
    | **MiniMax-M3**<br />≤ 512k input tokens | ~~\\$0.60~~ \\$0.30 / M tokens | ~~\\$2.40~~ \\$1.20 / M tokens | ~~\\$0.12~~ \\$0.06 / M tokens | - |
    | **MiniMax-M3**<br />> 512k input tokens | \\$0.60 / M tokens | \\$2.40 / M tokens | \\$0.12 / M tokens | - |
  </Tab>
  <Tab title="Priority">
    | Model | Input | Output |
    | --- | --- | --- |
    | **MiniMax-M3** | \\$0.45 / M tokens | \\$1.80 / M tokens |
  </Tab>
</Tabs>
| Model | Input | Output | Prompt caching Read | Prompt caching Write |
| --- | --- | --- | --- | --- |
| **MiniMax-M2.7** | \\$0.3 / M tokens | \\$1.2 / M tokens | \\$0.06 / M tokens | \\$0.375 / M tokens |`, { now: checkedAt });

  assert.deepEqual(result.models.map((model) => model.providerModelId), ["MiniMax-M3", "MiniMax-M2.7"]);
  assert.deepEqual(result.prices.get("MiniMax-M3").map(({ component, amount }) => [component, amount]), [
    ["input", 0.3],
    ["cached-input", 0.06],
    ["output", 1.2]
  ]);
  assert.equal(result.prices.get("MiniMax-M3")[0].conditions.context, "≤512k input tokens");
});

test("Cohere official model parser keeps chat models and their published lifecycle", () => {
  const models = parseCohereModelsMarkdown(`| Model Name | Status | Description | Modality | Context Length | Maximum Output Tokens | Endpoints |
| --- | --- | --- | --- | --- | --- | --- |
| \`command-a\` | Live | Agents, code generation, and reasoning | Text | 256k | 8k | [Chat](../reference/chat) |
| \`embed-v4\` | Live | Embeddings | Text | 128k | - | [Embed](../reference/embed) |
| \`command-old\` | Deprecated | Legacy chat model | Text | 128k | 4k | [Chat](../reference/chat) |`, { now: checkedAt });

  assert.deepEqual(models.map((model) => [model.providerModelId, model.availability]), [
    ["command-a", "available"],
    ["command-old", "unavailable"]
  ]);
  assert.equal(models[0].capabilities["code-generation"].support, "supported");
  assert.equal(models[0].capabilities.reasoning.support, "supported");
});

test("Qwen official model parser extracts text IDs and explicit supported reasoning", () => {
  const models = parseQwenModelsMarkdown(`| **模型ID** | **上下文** | **思考模式** | **Function Calling** |
| --- | --- | --- | --- |
| \`qwen3-coder-plus\` | 1M | 支持 | 支持 |
| \`qwen3-basic\` | 128k | 不支持 | 支持 |
| \`deepseek-v4-pro\` | 1M | 支持 | 支持 |`, { now: checkedAt });

  assert.deepEqual(models.map((model) => model.providerModelId), ["qwen3-coder-plus", "qwen3-basic"]);
  assert.equal(models[0].capabilities["code-generation"].support, "supported");
  assert.equal(models[0].capabilities.reasoning.support, "supported");
  assert.equal(models[1].capabilities.reasoning, undefined);
  const htmlModels = parseQwenModelsMarkdown(`<table>
    <tr><th>模型ID</th><th>上下文</th><th>思考模式</th></tr>
    <tr><td><code>qwen3-coder-plus</code></td><td>1M</td><td>支持</td></tr>
  </table>`, { now: checkedAt });
  assert.equal(htmlModels[0].providerModelId, "qwen3-coder-plus");
});

test("public adapters refresh without authorization and report official-source fallback", async () => {
  const openRouterBody = {
    data: [{
      id: "openai/gpt-test",
      name: "OpenRouter GPT Test",
      pricing: { prompt: "0.000002", completion: "0.00001" },
      supported_parameters: ["temperature"]
    }]
  };
  const requested = [];
  const adapters = createPublicAdapters({
    now: checkedAt,
    fetcher: async (url, options) => {
      requested.push(String(url));
      assert.equal(options.headers.authorization, undefined);
      assert.equal(options.headers["x-api-key"], undefined);
      if (String(url) === OPENROUTER_MODELS_URL) return response(JSON.stringify(openRouterBody));
      if (String(url).endsWith("models.md")) return response(openAiModels);
      if (String(url).endsWith("pricing.md")) return response(openAiPricing);
      throw new Error(`Unexpected public source ${url}`);
    }
  });

  const result = await adapters.openai();
  assert.ok(requested.includes(OPENROUTER_MODELS_URL));
  assert.equal(result.models.find((model) => model.providerModelId === "gpt-test").pricing[0].source,
    "https://developers.openai.com/api/docs/pricing");
  assert.deepEqual(result.warnings, []);
});

test("public HTTP failures do not expose response bodies or send credentials", async () => {
  let requestOptions;
  await assert.rejects(getJson("https://api.example.test/models", {
    providerName: "Test",
    fetcher: async (_url, options) => {
      requestOptions = options;
      return response('{"error":"private-token"}', 401);
    }
  }), (error) => {
    assert.match(error.message, /HTTP 401/);
    assert.doesNotMatch(error.message, /private-token/);
    return true;
  });
  assert.equal(requestOptions.headers.authorization, undefined);
  assert.equal(requestOptions.headers["x-api-key"], undefined);
});

test("OpenRouter price fallback is explicitly reported when official rates are missing", async () => {
  const adapters = createPublicAdapters({
    now: checkedAt,
    fetcher: async (url, options) => {
      assert.equal(options.headers.authorization, undefined);
      if (String(url) === OPENROUTER_MODELS_URL) return response(JSON.stringify({
        data: [{
          id: "openai/gpt-test",
          name: "GPT Test",
          pricing: { prompt: "0.000002", completion: "0.00001" }
        }]
      }));
      if (String(url).endsWith("models.md")) return response(openAiModels);
      if (String(url).endsWith("pricing.md")) return response("# Pricing\nRates are listed below.");
      throw new Error(`Unexpected public source ${url}`);
    }
  });

  const result = await adapters.openai();
  assert.equal(result.models.find((model) => model.providerModelId === "gpt-test").pricing[0].source,
    OPENROUTER_MODELS_URL);
  assert.ok(result.warnings.some((warning) => /OpenRouter marketplace prices were used/.test(warning)));
});

test("OpenRouter remains usable when an official source is blocked", async () => {
  const adapters = createPublicAdapters({
    now: checkedAt,
    fetcher: async (url, options) => {
      assert.equal(options.headers.authorization, undefined);
      assert.equal(options.headers["x-api-key"], undefined);
      if (String(url) === OPENROUTER_MODELS_URL) return response(JSON.stringify({
        data: [{
          id: "google/gemini-test",
          name: "Gemini Test",
          pricing: { prompt: "0.000001", completion: "0.000002" }
        }]
      }));
      return response("blocked", 403);
    }
  });
  const result = await adapters.google();
  assert.equal(result.models[0].providerModelId, "gemini-test");
  assert.ok(result.warnings.some((warning) => /OpenRouter data was used as fallback/.test(warning)));
  assert.ok(result.warnings.some((warning) => /pricing page was unavailable/.test(warning)));
});

test("provider requests use the bounded ten-second timeout", async () => {
  assert.equal(REQUEST_TIMEOUT_MS, 10_000);
  const keepAlive = setTimeout(() => {}, 50);
  try {
    await assert.rejects(getJson("https://api.example.test/models", {
      providerName: "Test",
      timeoutMs: 1,
      fetcher: async (_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      })
    }), /network or timeout/i);
  } finally {
    clearTimeout(keepAlive);
  }
});
