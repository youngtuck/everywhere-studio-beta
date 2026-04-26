/**
 * Admin data API - returns users, stats, activity, and manages codes.
 * POST body: { action, ...params }
 * Requires admin auth via Authorization header.
 */
import { createClient } from "@supabase/supabase-js";
import { setCorsHeaders } from "./_cors.js";

async function verifyAdmin(req) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[admin-data] Missing env vars. SUPABASE_URL:", !!supabaseUrl, "SERVICE_ROLE_KEY:", !!serviceRoleKey);
    return { admin: false, error: "Server not configured. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars." };
  }

  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return { admin: false, error: "No auth token provided" };

  try {
    // Use service role to verify the token (more reliable than anon key)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user }, error } = await adminClient.auth.getUser(token);
    if (error || !user) {
      console.error("[admin-data] Token verification failed:", error?.message);
      return { admin: false, error: "Invalid or expired auth token" };
    }

    const { data: profile } = await adminClient.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) return { admin: false, error: "Not an admin user" };

    return { admin: true, userId: user.id, client: adminClient };
  } catch (err) {
    console.error("[admin-data] Auth error:", err);
    return { admin: false, error: "Authentication failed" };
  }
}

function sanitize(input, maxLength = 500) {
  if (!input || typeof input !== "string") return "";
  return input.trim().slice(0, maxLength).replace(/<[^>]*>/g, "");
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { admin, error: authError, client, userId } = await verifyAdmin(req);
  if (!admin) return res.status(403).json({ error: authError || "Unauthorized" });

  const { action, ...params } = req.body || {};

  try {
    // ── USERS LIST ────────────────────────────────
    if (action === "get_users") {
      const { data: profiles } = await client.from("profiles").select("id, full_name, onboarding_complete, voice_dna_completed, created_at, sentinel_topics");
      const { data: outputStats } = await client.from("outputs").select("user_id, score, created_at, output_type");

      // Get emails from auth.users (email is NOT in profiles table)
      let authUsers = [];
      try {
        const { data: authData } = await client.auth.admin.listUsers({ perPage: 1000 });
        authUsers = authData?.users || [];
      } catch (e) {
        console.error("[admin-data] Failed to list auth users:", e);
      }
      const emailMap = {};
      for (const au of authUsers) {
        emailMap[au.id] = au.email || "";
      }

      const userMap = {};
      for (const p of (profiles || [])) {
        userMap[p.id] = {
          ...p,
          email: emailMap[p.id] || null,
          outputCount: 0,
          avgScore: 0,
          lastActive: null,
          totalScore: 0,
        };
      }
      for (const o of (outputStats || [])) {
        const u = userMap[o.user_id];
        if (u) {
          u.outputCount++;
          u.totalScore += o.score || 0;
          if (!u.lastActive || o.created_at > u.lastActive) u.lastActive = o.created_at;
        }
      }
      const users = Object.values(userMap).map(u => ({
        ...u,
        avgScore: u.outputCount > 0 ? Math.round(u.totalScore / u.outputCount) : null,
      }));
      users.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
      return res.status(200).json({ users });
    }

    // ── USER DETAIL ───────────────────────────────
    if (action === "get_user_detail") {
      const { targetUserId } = params;
      const { data: outputs } = await client.from("outputs").select("id, title, output_type, score, created_at").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(5);
      const { data: profile } = await client.from("profiles").select("sentinel_topics, voice_dna").eq("id", targetUserId).single();
      return res.status(200).json({ outputs: outputs || [], profile });
    }

    // ── RESET ONBOARDING ──────────────────────────
    if (action === "reset_onboarding") {
      const { targetUserId } = params;
      await client.from("profiles").update({ onboarding_complete: false, voice_dna_completed: false }).eq("id", targetUserId);
      return res.status(200).json({ success: true });
    }

    // ── STATS ─────────────────────────────────────
    if (action === "get_stats") {
      const { data: profiles } = await client.from("profiles").select("id, onboarding_complete, created_at");
      const { data: outputs } = await client.from("outputs").select("id, score, output_type, created_at, user_id");
      const { data: codes } = await client.from("access_codes").select("id, is_active, used_by");

      const totalUsers = (profiles || []).length;
      const onboarded = (profiles || []).filter(p => p.onboarding_complete).length;
      const totalOutputs = (outputs || []).length;
      const scores = (outputs || []).filter(o => o.score > 0).map(o => o.score);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const published = scores.filter(s => s >= 900).length;

      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const newUsersThisWeek = (profiles || []).filter(p => p.created_at > weekAgo).length;
      const outputsThisWeek = (outputs || []).filter(o => o.created_at > weekAgo).length;

      const totalCodes = (codes || []).length;
      const redeemedCodes = (codes || []).filter(c => c.used_by).length;
      const availableCodes = (codes || []).filter(c => c.is_active && !c.used_by).length;

      // Most common output type
      const typeCounts = {};
      for (const o of (outputs || [])) {
        typeCounts[o.output_type] = (typeCounts[o.output_type] || 0) + 1;
      }
      const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0] || ["-", 0];

      return res.status(200).json({
        totalUsers, onboarded, totalOutputs, avgScore, published,
        newUsersThisWeek, outputsThisWeek,
        totalCodes, redeemedCodes, availableCodes,
        topOutputType: topType[0], topOutputTypeCount: topType[1],
      });
    }

    // ── ACTIVITY FEED ─────────────────────────────
    if (action === "get_activity") {
      const events = [];
      const { data: recentProfiles } = await client.from("profiles").select("id, full_name, created_at, onboarding_complete").order("created_at", { ascending: false }).limit(10);
      for (const p of (recentProfiles || [])) {
        events.push({ type: "signup", name: p.full_name || "User", ts: p.created_at, detail: p.onboarding_complete ? "Completed onboarding" : "Signed up" });
      }
      const { data: recentOutputs } = await client.from("outputs").select("id, title, output_type, score, created_at, user_id").order("created_at", { ascending: false }).limit(15);
      // Get names for output authors
      const userIds = [...new Set((recentOutputs || []).map(o => o.user_id))];
      const { data: authorProfiles } = await client.from("profiles").select("id, full_name").in("id", userIds.length > 0 ? userIds : ["none"]);
      const nameMap = {};
      for (const p of (authorProfiles || [])) nameMap[p.id] = p.full_name || "User";
      for (const o of (recentOutputs || [])) {
        events.push({ type: "output", name: nameMap[o.user_id] || "User", ts: o.created_at, detail: `Created ${o.output_type} (scored ${o.score})`, title: o.title });
      }
      events.sort((a, b) => (b.ts || "").localeCompare(a.ts || ""));
      return res.status(200).json({ events: events.slice(0, 20) });
    }

    // ── ACCESS CODES ──────────────────────────────
    if (action === "get_codes") {
      const { data: codes } = await client.from("access_codes").select("*").order("created_at", { ascending: false });
      // Enrich with user names for redeemed codes
      const usedByIds = (codes || []).filter(c => c.used_by).map(c => c.used_by);
      const { data: usedByProfiles } = await client.from("profiles").select("id, full_name, email").in("id", usedByIds.length > 0 ? usedByIds : ["none"]);
      const profileMap = {};
      for (const p of (usedByProfiles || [])) profileMap[p.id] = p;
      const enriched = (codes || []).map(c => ({
        ...c,
        redeemed_name: c.used_by ? profileMap[c.used_by]?.full_name : null,
        redeemed_email: c.used_by ? profileMap[c.used_by]?.email : null,
      }));
      return res.status(200).json({ codes: enriched });
    }

    if (action === "create_code") {
      const { name, email, note, code } = params;
      const { data, error: insertError } = await client.from("access_codes").insert({
        code: sanitize(code, 20),
        assigned_name: sanitize(name, 200) || null,
        assigned_email: sanitize(email, 200) || null,
        note: sanitize(note, 500) || null,
        created_by: userId,
        max_uses: 1,
        use_count: 0,
        is_active: true,
      }).select().single();
      if (insertError) return res.status(400).json({ error: insertError.message });
      return res.status(200).json({ code: data });
    }

    if (action === "create_bulk_codes") {
      const { codes, note } = params;
      const rows = codes.map(code => ({
        code,
        note: note || null,
        created_by: userId,
        max_uses: 1,
        use_count: 0,
        is_active: true,
      }));
      const { data, error: insertError } = await client.from("access_codes").insert(rows).select();
      if (insertError) return res.status(400).json({ error: insertError.message });
      return res.status(200).json({ codes: data });
    }

    if (action === "toggle_code") {
      const { codeId, active } = params;
      await client.from("access_codes").update({ is_active: active }).eq("id", codeId);
      return res.status(200).json({ success: true });
    }

    if (action === "delete_code") {
      const { codeId } = params;
      await client.from("access_codes").delete().eq("id", codeId);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (err) {
    console.error("[admin-data]", err);
    return res.status(500).json({ error: "Server error." });
  }
}
