import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { CLAUDE_MODEL } from "./_config.js";

const BLOCKED_DOMAINS = [
  "linkedin.com", "www.linkedin.com", "facebook.com", "www.facebook.com",
  "instagram.com", "twitter.com", "x.com",
];

async function searchArticles(query, firecrawlKey, limit = 5) {
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${query} -site:linkedin.com -site:facebook.com`,
        limit,
        tbs: "qdr:w",
      }),
    });
    if (!res.ok) {
      console.error(`[sentinel] Firecrawl search failed for "${query}":`, res.status);
      return [];
    }
    const data = await res.json();
    const results = data.data || data.results || [];
    return results
      .map(r => ({
        url: r.url || "",
        title: r.title || r.metadata?.title || "",
        description: r.description || r.metadata?.description || "",
      }))
      .filter(r => {
        if (!r.url || !r.title) return false;
        try {
          const hostname = new URL(r.url).hostname.replace(/^www\./, "");
          return !BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));
        } catch { return false; }
      });
  } catch (err) {
    console.error(`[sentinel] Search error for "${query}":`, err.message);
    return [];
  }
}

function buildSearchQueries(config, sources) {
  const keywords = config.keywords || [];
  const allThemes = [...new Set(keywords)];
  const themeQueries = allThemes.slice(0, 6).map(k => `${k} 2026`);
  const notableSources = (sources || []).filter(s =>
    ["Blog", "Newsletter", "Publication", "Substack"].includes(s.type)
  );
  const crossQueries = notableSources.slice(0, 6).map((s, i) => {
    const theme = allThemes[i % allThemes.length] || "AI strategy";
    return `"${s.name}" ${theme}`;
  });
  const tracks = config.tracks || config.watchlist || {};
  const trackQueries = [
    ...(tracks.competitors || []).slice(0, 2).map(c => `${c} latest news 2026`),
    ...(tracks.industryOrgs || []).slice(0, 2).map(o => `${o} AI adoption`),
  ];
  return [...new Set([...themeQueries, ...crossQueries, ...trackQueries])].filter(Boolean).slice(0, 18);
}

function dedupeArticles(articles) {
  const seen = new Map();
  for (const article of articles) {
    if (!seen.has(article.url)) seen.set(article.url, article);
  }
  return Array.from(seen.values());
}

async function loadCachedBriefing(supabase, userId, runDate, configHash) {
  const { data } = await supabase
    .from("watch_briefings")
    .select("briefing")
    .eq("user_id", userId)
    .eq("run_date", runDate)
    .eq("config_hash", configHash)
    .limit(1)
    .single();
  return data?.briefing || null;
}

async function saveBriefing(supabase, userId, runDate, configHash, briefing) {
  await supabase.from("watch_briefings").upsert({
    user_id: userId,
    run_date: runDate,
    config_hash: configHash,
    briefing,
  }, { onConflict: "user_id,run_date,config_hash" });
}

function hashConfig(config, sources) {
  const str = JSON.stringify({ config, sources: (sources || []).sort((a, b) => a.name.localeCompare(b.name)) });
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export const config = { maxDuration: 120 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!firecrawlKey) return res.status(503).json({ error: "FIRECRAWL_API_KEY not configured." });
  if (!anthropicKey) return res.status(503).json({ error: "ANTHROPIC_API_KEY not configured." });

  const { userId, sentinelConfig, sources, forceRefresh } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId is required." });

  const userConfig = sentinelConfig || {
    keywords: ["AI adoption", "thought leadership", "digital transformation"],
    rankingWeights: { relevance: 5, actionability: 3, urgency: 2 },
    tracks: {},
  };

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const runDate = new Date().toISOString().slice(0, 10);
  const configHash = hashConfig(userConfig, sources);

  // Check cache (skip if forceRefresh)
  if (!forceRefresh) {
    const cached = await loadCachedBriefing(supabase, userId, runDate, configHash);
    if (cached) {
      // Don't return cached empty briefings - run fresh instead
      if (cached.signals && cached.signals.length > 0) {
        return res.json({ ...cached, cached: true });
      }
      console.log("[sentinel] Cached briefing is empty, running fresh");
    }
  }

  try {
    const queries = buildSearchQueries(userConfig, sources);
    console.log(`[sentinel] Running ${queries.length} search queries`);

    const searchResults = [];
    for (let i = 0; i < queries.length; i += 3) {
      const batch = queries.slice(i, i + 3);
      const results = await Promise.all(
        batch.map(async q => ({ query: q, results: await searchArticles(q, firecrawlKey, 5) }))
      );
      searchResults.push(...results);
      if (i + 3 < queries.length) await new Promise(r => setTimeout(r, 1000));
    }

    const allArticles = dedupeArticles(
      searchResults.flatMap(sr => sr.results.map(r => ({ ...r, searchQuery: sr.query })))
    );
    console.log(`[sentinel] Found ${allArticles.length} unique articles`);

    if (allArticles.length === 0) {
      return res.json({ signals: [], suggestions: [], error: "No articles found. Try adjusting your keywords." });
    }

    const articlesContext = allArticles
      .map((a, i) => `[${i + 1}] ${a.title}\nSnippet: ${a.description || "No description."}\nURL: ${a.url}\nQuery: ${a.searchQuery}`)
      .join("\n\n");

    const weights = userConfig.rankingWeights || userConfig.signalRanking || { relevance: 5, actionability: 3, urgency: 2 };

    const systemPrompt = `You are Sentinel, the intelligence engine for EVERYWHERE Studio.

YOUR JOB: Analyze real articles and produce an intelligence briefing with scored signals and content suggestions.

RULES:
- You may ONLY reference the real articles provided. Never invent headlines, sources, or URLs.
- Every signal URL must exactly match one of the provided URLs.
- Return exactly 5 signals (or fewer if data doesn't support 5 distinct topics).
- Return exactly 5 content suggestions (or fewer if data doesn't support them).
- Each signal gets three scores from 1-5: relevance, actionability, urgency.
- User weights: relevance=${weights.relevance}, actionability=${weights.actionability}, urgency=${weights.urgency}.
- Sort signals by weighted composite score (highest first).
- Maximize topic diversity: never return two signals on the same subject.
- Each content suggestion must include an "anglePrompt": a 1-2 sentence editorial nudge for the writer.
- Never use em-dashes. Use commas, periods, colons, or semicolons.

KEYWORDS THE USER TRACKS: ${(userConfig.keywords || []).join(", ")}

Return ONLY valid JSON:
{
  "signals": [{ "source": "Name", "headline": "Headline", "relevance": "Why this matters", "track": "competitor|thoughtLeader|techInfra|industry|general", "url": "exact URL", "scores": { "relevance": 1-5, "actionability": 1-5, "urgency": 1-5 } }],
  "suggestions": [{ "topic": "Topic", "oneLiner": "Description", "anglePrompt": "Editorial nudge", "source": "Source", "url": "URL", "track": "track" }]
}`;

    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: `REAL ARTICLES (ONLY THESE MAY BE USED):\n\n${articlesContext}` }],
    });

    const text = response.content?.[0]?.type === "text" ? response.content[0].text : "";
    let briefing;
    try {
      const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      briefing = jsonMatch ? JSON.parse(jsonMatch[0]) : { signals: [], suggestions: [] };
    } catch {
      briefing = { signals: [], suggestions: [] };
    }

    // Validate URLs and compute composite scores
    const validUrls = new Set(allArticles.map(a => a.url));
    const totalWeight = weights.relevance + weights.actionability + weights.urgency;

    briefing.signals = (briefing.signals || [])
      .filter(s => validUrls.has(s.url))
      .map(s => {
        const scores = s.scores || { relevance: 3, actionability: 3, urgency: 3 };
        const composite = totalWeight > 0
          ? (scores.relevance * weights.relevance + scores.actionability * weights.actionability + scores.urgency * weights.urgency) / totalWeight
          : (scores.relevance + scores.actionability + scores.urgency) / 3;
        return { ...s, scores: { ...scores, composite: Math.round(composite * 10) / 10 } };
      })
      .sort((a, b) => (b.scores?.composite || 0) - (a.scores?.composite || 0));

    // Only cache if we have actual signals
    if (briefing.signals && briefing.signals.length > 0) {
      try {
        await saveBriefing(supabase, userId, runDate, configHash, briefing);
      } catch (err) {
        console.error("[sentinel] Cache save failed:", err.message);
      }
    }

    return res.json({ ...briefing, cached: false });
  } catch (err) {
    console.error("[sentinel] Fatal error:", err);
    return res.status(500).json({ error: "Briefing generation failed. Please try again." });
  }
}
