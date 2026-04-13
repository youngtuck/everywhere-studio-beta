export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlKey) return res.status(503).json({ error: "FIRECRAWL_API_KEY not configured" });

  const { query, limit = 5 } = req.body || {};
  if (!query) return res.status(400).json({ error: "query required" });

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit }),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Firecrawl search failed" });
    }

    const data = await response.json();
    return res.json({ results: data.data || data.results || [] });
  } catch (err) {
    console.error("[firecrawl-search] error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
