import { createClient } from "@supabase/supabase-js";

/**
 * Verify Supabase JWT from Authorization header.
 * Returns { user } on success, or sends a 401 response and returns null.
 */
export async function requireAuth(req, res) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Authentication required." });
    return null;
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    res.status(401).json({ error: "Authentication required." });
    return null;
  }

  return { user };
}
