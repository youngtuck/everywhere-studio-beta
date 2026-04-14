import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers["authorization"];
  if (authHeader !== "Bearer " + process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://everywhere-studio-beta.vercel.app";
  const apiUrl = `${baseUrl}/api/sentinel-generate`;

  const defaultTopics = ["AI", "thought leadership", "executive communication", "content strategy"];

  try {
    const { data: profiles, error: queryError } = await supabase
      .from("profiles")
      .select("id, full_name, sentinel_topics")
      .or("onboarding_complete.eq.true,sentinel_topics.neq.null");

    if (queryError) {
      console.error("[api/sentinel-cron] profiles query error", queryError);
      return res.status(500).json({ error: queryError.message });
    }

    const list = Array.isArray(profiles) ? profiles : [];
    let processed = 0;

    for (const profile of list) {
      try {
        const body = {
          userId: profile.id,
          userName: profile.full_name || "there",
          topics: Array.isArray(profile.sentinel_topics) && profile.sentinel_topics.length > 0
            ? profile.sentinel_topics
            : defaultTopics,
        };
        const r = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          const errText = await r.text();
          throw new Error(`${r.status} ${errText?.slice(0, 200)}`);
        }
        processed++;
      } catch (err) {
        console.error("[api/sentinel-cron] user failed", profile?.id, err?.message || err);
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    return res.status(200).json({
      success: true,
      processed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[api/sentinel-cron]", err);
    return res.status(500).json({ error: err?.message || "Cron failed" });
  }
}
