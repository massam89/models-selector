export const REQUEST_TIMEOUT_MS = 10_000;
const USER_AGENT = "model-selector/0.1.0 (public catalog refresh)";

async function request(url, {
  providerName,
  fetcher = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
  accept
}) {
  let response;
  try {
    response = await fetcher(url, {
      method: "GET",
      headers: {
        accept,
        "user-agent": USER_AGENT
      },
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (cause) {
    const error = new Error(`${providerName} public source request failed due to a network or timeout error.`);
    error.retryable = true;
    error.cause = cause;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(`${providerName} public source returned HTTP ${response.status}.`);
    error.retryable = response.status === 429 || response.status >= 500;
    throw error;
  }
  return response;
}

export async function getJson(url, options) {
  const response = await request(url, { ...options, accept: "application/json" });
  try {
    return await response.json();
  } catch {
    throw new Error(`${options.providerName} public source returned malformed JSON.`);
  }
}

export async function getText(url, options) {
  const response = await request(url, {
    ...options,
    accept: "text/markdown, text/plain;q=0.9, text/html;q=0.5"
  });
  return response.text();
}
