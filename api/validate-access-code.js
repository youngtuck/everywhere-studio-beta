import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { code, email } = req.body || {};
  if (!code || !code.trim()) {
    return res.status(400).json({ valid: false, error: "Access code is required." });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    // Fallback: hardcoded universal code if Supabase not configured
    if (process.env.FALLBACK_ACCESS_CODE && process.env.FALLBACK_ACCESS_CODE === code.trim().toLowerCase()) {
      return res.status(200).json({ valid: true, codeId: null, assignedName: null });
    }
    return res.status(200).json({ valid: false, error: "Invalid access code." });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: rows, error } = await supabase
      .from("access_codes")
      .select("id, code, assigned_email, assigned_name, max_uses, use_count, is_active")
      .ilike("code", code.trim())
      .eq("is_active", true)
      .limit(1);

    if (error) {
      // Table might not exist yet - fall back to hardcoded
      console.error("[validate-access-code] DB error:", error.message);
      if (process.env.FALLBACK_ACCESS_CODE && process.env.FALLBACK_ACCESS_CODE === code.trim().toLowerCase()) {
        return res.status(200).json({ valid: true, codeId: null, assignedName: null });
      }
      return res.status(200).json({ valid: false, error: "Invalid access code." });
    }

    if (!rows || rows.length === 0) {
      return res.status(200).json({ valid: false, error: "Invalid access code. Contact mark@mixedgrill.studio for access." });
    }

    const row = rows[0];

    // Check email restriction
    if (row.assigned_email && email) {
      if (row.assigned_email.toLowerCase() !== email.trim().toLowerCase()) {
        return res.status(200).json({ valid: false, error: "This code is assigned to a different email address." });
      }
    }

    // Check usage limit
    if (row.max_uses !== null && row.use_count >= row.max_uses) {
      return res.status(200).json({ valid: false, error: "This access code has already been used." });
    }

    return res.status(200).json({
      valid: true,
      codeId: row.id,
      assignedName: row.assigned_name,
    });
  } catch (err) {
    console.error("[validate-access-code]", err);
    // Ultimate fallback
    if (process.env.FALLBACK_ACCESS_CODE && process.env.FALLBACK_ACCESS_CODE === code.trim().toLowerCase()) {
      return res.status(200).json({ valid: true, codeId: null, assignedName: null });
    }
    return res.status(200).json({ valid: false, error: "Validation failed. Try again." });
  }
}
