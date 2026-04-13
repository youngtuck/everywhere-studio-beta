import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { codeId, userId } = req.body || {};
  if (!codeId || !userId) {
    return res.status(200).json({ success: true }); // No-op if no codeId (universal code)
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(200).json({ success: true });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get current code
    const { data: row } = await supabase
      .from("access_codes")
      .select("max_uses, use_count")
      .eq("id", codeId)
      .single();

    if (!row) return res.status(200).json({ success: true });

    const update = {
      use_count: (row.use_count || 0) + 1,
    };

    // If single-use, also record who used it
    if (row.max_uses === 1) {
      update.used_by = userId;
      update.used_at = new Date().toISOString();
    }

    // If max uses reached, deactivate
    if (row.max_uses !== null && (row.use_count || 0) + 1 >= row.max_uses) {
      update.is_active = false;
    }

    await supabase.from("access_codes").update(update).eq("id", codeId);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[redeem-access-code]", err);
    return res.status(200).json({ success: true }); // Don't block signup on redemption failure
  }
}
