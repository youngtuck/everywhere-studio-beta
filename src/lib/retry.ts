/**
 * Shared fetch-with-retry utility for client-side API calls.
 * Retries on 5xx and network failures with exponential backoff + jitter.
 * Does not retry 4xx (client errors) or user-initiated aborts.
 * Fires toast notifications on retry recovery and exhaustion.
 */

import { showGlobalToast } from "../context/ToastContext";
import { supabase } from "./supabase";

type RetryOptions = {
  maxRetries?: number;
  baseDelay?: number;
  timeout?: number;
  /** Called when a retry succeeds after an initial failure. */
  onRetrySuccess?: () => void;
  /** Called when all retries are exhausted. */
  onRetriesExhausted?: () => void;
};

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  {
    maxRetries = 3,
    baseDelay = 1000,
    timeout = 30000,
    onRetrySuccess,
    onRetriesExhausted,
  }: RetryOptions = {}
): Promise<Response> {
  let lastError: Error | null = null;
  let hadFailure = false;

  // Inject auth token
  let authHeaders: Record<string, string> = {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      authHeaders = { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {}

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          ...authHeaders,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Don't retry client errors (4xx), only server errors (5xx) and network failures
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        if (hadFailure && response.ok) {
          showGlobalToast("Connection restored", "success");
          onRetrySuccess?.();
        }
        return response;
      }

      hadFailure = true;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err: unknown) {
      hadFailure = true;
      lastError = err as Error;
      // Don't retry short-timeout requests on first abort (likely too slow)
      // But DO retry long-running operations (timeout > 60s) since slowness is expected
      if ((err as any).name === "AbortError" && attempt === 0 && timeout <= 60000) {
        throw new Error("Request timed out. Please try again.");
      }
    }

    // Exponential backoff with jitter before retrying
    if (attempt < maxRetries) {
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  showGlobalToast("Unable to connect. Check your internet and try again.", "error");
  onRetriesExhausted?.();

  throw lastError || new Error("Request failed after retries");
}
