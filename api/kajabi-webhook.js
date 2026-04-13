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
      use_count: 0,
      assigned_email: email,
      assigned_name: name || "",
      note: `Kajabi purchase: ${name || email} (offer: ${offer_id || "unknown"})`,
    });

    if (error) {
      console.error("[kajabi-webhook] DB error:", error);
      return res.status(500).json({ error: "Failed to provision access" });
    }

    console.log(`[kajabi-webhook] Provisioned access for ${email}, code: ${code}`);

    // Send welcome email with access code via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const firstName = name ? name.split(" ")[0] : "";
        const siteUrl = process.env.VITE_API_BASE || "https://everywhere-studio-beta.vercel.app";

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || "EVERYWHERE Studio <onboarding@resend.dev>",
            to: [email],
            subject: "Welcome to EVERYWHERE Studio",
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
                <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Welcome to EVERYWHERE Studio${firstName ? `, ${firstName}` : ""}</h1>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">Your account is ready. Use the access code below to sign up and start creating.</p>
                <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
                  <p style="font-size: 13px; color: #71717a; margin: 0 0 8px 0;">Your access code</p>
                  <p style="font-size: 28px; font-weight: 700; letter-spacing: 2px; margin: 0; color: #09090b;">${code}</p>
                </div>
                <a href="${siteUrl}" style="display: inline-block; background: #09090b; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; font-weight: 500; margin-bottom: 24px;">Open EVERYWHERE Studio</a>
                <p style="font-size: 14px; line-height: 1.6; color: #71717a; margin-top: 32px;">If you have any questions, reply to this email. We read everything.</p>
              </div>
            `,
          }),
        });

        if (!emailResponse.ok) {
          const errBody = await emailResponse.text();
          console.error("[kajabi-webhook] Resend error:", errBody);
        } else {
          console.log(`[kajabi-webhook] Welcome email sent to ${email}`);
        }
      } catch (emailErr) {
        // Log but don't fail the webhook if email fails
        console.error("[kajabi-webhook] Email send failed:", emailErr);
      }
    } else {
      console.warn("[kajabi-webhook] RESEND_API_KEY not set, skipping welcome email");
    }

    return res.status(200).json({ success: true, message: "Access provisioned" });
  } catch (err) {
    console.error("[kajabi-webhook] Error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
