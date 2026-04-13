import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // Verify webhook secret (Kajabi should send this in a header)
  const webhookSecret = process.env.KAJABI_WEBHOOK_SECRET;
  if (webhookSecret && req.headers["x-kajabi-secret"] !== webhookSecret) {
    return res.status(401).json({ error: "Invalid webhook secret" });
  }

  const { email, name, offer_id } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email required" });

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Create an access code for this buyer
    const code = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") + Date.now().toString(36);

    const { error } = await supabase.from("access_codes").insert({
      code,
      max_uses: 1,
      current_uses: 0,
      note: `Kajabi purchase: ${name || email} (offer: ${offer_id || "unknown"})`,
    });

    if (error) {
      console.error("[kajabi-webhook] DB error:", error);
      return res.status(500).json({ error: "Failed to provision access" });
    }

    console.log(`[kajabi-webhook] Provisioned access for ${email}, code: ${code}`);

    // TODO: Send welcome email with access code (wire up when email service is ready)

    return res.status(200).json({ success: true, message: "Access provisioned" });
  } catch (err) {
    console.error("[kajabi-webhook] Error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
