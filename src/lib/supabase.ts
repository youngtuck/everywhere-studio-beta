import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Retries a Supabase query on network/timeout errors.
 * Does not retry RLS, auth, or validation errors.
 */
export async function supabaseWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await queryFn();
    if (!result.error) return result;
    // Only retry on network/timeout errors, not on RLS or auth errors
    const msg = result.error.message || "";
    const code = result.error.code || "";
    if (code === "PGRST301" || msg.includes("network") || msg.includes("Failed to fetch") || msg.includes("timeout")) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      continue;
    }
    return result; // Non-retryable error
  }
  return queryFn(); // Final attempt
}
