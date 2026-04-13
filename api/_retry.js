/**
 * Server-side retry helper for Anthropic/external API calls.
 * Retries on rate limits (429) and server errors (5xx).
 * Does not retry auth (401) or bad request (400) errors.
 */

export async function callWithRetry(fn, maxRetries = 2) {
  let lastError;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      // Don't retry auth or validation errors
      if (err.status === 401 || err.status === 400) throw err;
      if (i < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
}
