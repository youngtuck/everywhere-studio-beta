/**
 * SettingsResearchPanel.tsx
 * CO_038C WS9: Research surface lifted out of Watch.tsx and remounted in Settings.
 * Promote-to-keyword / publication / competitor buttons write through src/lib/watchSources.ts,
 * the shared persistence layer. Watch's in-memory state and this panel's in-memory state may
 * drift until reload (acceptable for v1).
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { supabase } from "../../lib/supabase";
import {
  addKeyword as persistAddKeyword,
  addConfigItem as persistAddConfigItem,
  addSourceItem as persistAddSourceItem,
  buildWatchConfig,
  type WatchConfigShape,
  type WatchConfigFrequency,
} from "../../lib/watchSources";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
const FONT = "var(--font)";

interface FirecrawlResult {
  title?: string;
  url?: string;
  description?: string;
}

export default function SettingsResearchPanel() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [researchQuery, setResearchQuery] = useState("");
  const [researchMessage, setResearchMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FirecrawlResult[]>([]);

  // Promotion targets, hydrated from Supabase so duplicate-skip and watch_config
  // composition use the user's current state.
  const [keywords, setKeywords] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [thoughtLeaders, setThoughtLeaders] = useState<string[]>([]);
  const [publications, setPublications] = useState<string[]>([]);
  const [redditCommunities, setRedditCommunities] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<WatchConfigFrequency>("daily");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("sentinel_topics, watch_config")
        .eq("id", user.id)
        .single();
      if (cancelled) return;

      if (Array.isArray(profile?.sentinel_topics)) setKeywords(profile.sentinel_topics);
      const wc = (profile?.watch_config as Partial<WatchConfigShape> | null) || null;
      if (wc) {
        if (Array.isArray(wc.competitors)) setCompetitors(wc.competitors);
        if (Array.isArray(wc.thoughtLeaders)) setThoughtLeaders(wc.thoughtLeaders);
        if (Array.isArray(wc.reddit)) setRedditCommunities(wc.reddit);
        if (wc.frequency === "daily" || wc.frequency === "weekly" || wc.frequency === "realtime") {
          setFrequency(wc.frequency);
        }
      }

      const { data: srcData } = await supabase
        .from("watch_sources")
        .select("name, type")
        .eq("user_id", user.id);
      if (cancelled) return;
      if (srcData) {
        setPublications(srcData.filter((s: { type: string }) => s.type === "Publication").map((s: { name: string }) => s.name));
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const buildBaseConfig = useCallback((): WatchConfigShape => buildWatchConfig({
    competitors, thoughtLeaders, frequency, reddit: redditCommunities,
  }), [competitors, thoughtLeaders, frequency, redditCommunities]);

  const handleSearch = useCallback(async () => {
    const q = researchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchResults([]);
    setResearchMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/firecrawl-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, limit: 5 }),
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      const results: FirecrawlResult[] = data.results || [];
      setSearchResults(results);
      if (results.length > 0) {
        setResearchMessage(`Found ${results.length} result${results.length !== 1 ? "s" : ""} for "${q}". Promote any of these into your Watch sources below.`);
      } else {
        setResearchMessage(`No results found for "${q}". Try a different search term, or add it directly as a keyword in Watch settings.`);
      }
    } catch {
      setResearchMessage("Search failed. Check your connection and try again.");
    } finally {
      setSearching(false);
    }
  }, [researchQuery]);

  const promoteAsKeyword = async (name: string) => {
    if (!user || !name) return;
    try {
      const updated = await persistAddKeyword(user.id, name, keywords);
      setKeywords(updated);
      toast("Added as keyword.");
    } catch {
      toast("Couldn't save. Try again.", "error");
    }
  };

  const promoteAsPublication = async (name: string) => {
    if (!user || !name) return;
    try {
      const updated = await persistAddSourceItem(user.id, publications, name, "Publication");
      setPublications(updated);
      toast("Added as publication.");
    } catch {
      toast("Couldn't save. Try again.", "error");
    }
  };

  const promoteAsCompetitor = async (name: string) => {
    if (!user || !name) return;
    try {
      const updated = await persistAddConfigItem(user.id, competitors, name, "competitors", buildBaseConfig());
      setCompetitors(updated);
      toast("Added as competitor.");
    } catch {
      toast("Couldn't save. Try again.", "error");
    }
  };

  return (
    <div className="liquid-glass-card" style={{ padding: 18, marginTop: 8 }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: "var(--fg)", marginBottom: 4, fontFamily: FONT }}>Research</div>
      <div style={{ fontSize: 14, color: "var(--fg-2)", marginBottom: 14, lineHeight: 1.5, fontFamily: FONT }}>
        Find outlets and people to track.
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <input
          value={researchQuery}
          onChange={e => setResearchQuery(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
          placeholder="e.g. Scott Galloway, Stratechery, fractional CAIO..."
          aria-label="Research query"
          style={{
            flex: "1 1 220px", minWidth: 0,
            background: "var(--glass-input)", border: "1px solid var(--glass-border)",
            borderRadius: 10, padding: "10px 14px",
            fontSize: 14, color: "var(--fg)", fontFamily: FONT, outline: "none",
            backdropFilter: "var(--glass-blur-light)",
            WebkitBackdropFilter: "var(--glass-blur-light)",
          }}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          style={{
            padding: "10px 22px", borderRadius: 10,
            background: "var(--fg)", color: "var(--surface)", border: "none",
            fontSize: 14, fontWeight: 600, fontFamily: FONT,
            cursor: searching ? "not-allowed" : "pointer",
            opacity: searching ? 0.5 : 1,
          }}
        >{searching ? "Searching..." : "Search"}</button>
      </div>

      {researchMessage && (
        <div style={{
          padding: "10px 14px", marginBottom: 14,
          background: "rgba(74,144,217,0.04)",
          border: "1px solid rgba(74,144,217,0.2)",
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.55, fontFamily: FONT }}>{researchMessage}</div>
        </div>
      )}

      <div>
        {searching && (
          <div style={{ fontSize: 14, color: "var(--fg-3)", textAlign: "center" as const, padding: "20px 0", fontFamily: FONT }}>
            Searching...
          </div>
        )}
        {!searching && searchResults.length > 0 && searchResults.map((result, i) => (
          <div key={i} style={{
            padding: "12px 14px", marginBottom: 10,
            border: "1px solid var(--glass-border)", borderRadius: 8,
            background: "rgba(0,0,0,0.015)",
          }}>
            {result.url ? (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", textDecoration: "none", display: "inline-block", marginBottom: 4, fontFamily: FONT }}
              >
                {result.title || result.url}
              </a>
            ) : (
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", marginBottom: 4, fontFamily: FONT }}>
                {result.title || "Untitled"}
              </div>
            )}
            {result.url && (
              <div style={{ fontSize: 10, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, fontFamily: FONT }}>
                {result.url}
              </div>
            )}
            {result.description && (
              <div style={{
                fontSize: 14, color: "var(--fg-2)", lineHeight: 1.55, marginTop: 8,
                display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const,
                overflow: "hidden", fontFamily: FONT,
              }}>
                {result.description}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => promoteAsKeyword(result.title || result.url || "")}
                style={{
                  fontSize: 14, fontWeight: 600, padding: "6px 12px", borderRadius: 8,
                  background: "rgba(74,144,217,0.08)", border: "1px solid rgba(74,144,217,0.22)",
                  color: "var(--blue, #4A90D9)", cursor: "pointer", fontFamily: FONT,
                }}
              >Add keyword</button>
              <button
                type="button"
                onClick={() => promoteAsPublication(result.title || result.url || "")}
                style={{
                  fontSize: 14, fontWeight: 600, padding: "6px 12px", borderRadius: 8,
                  background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.22)",
                  color: "#7C3AED", cursor: "pointer", fontFamily: FONT,
                }}
              >Add publication</button>
              <button
                type="button"
                onClick={() => promoteAsCompetitor(result.title || result.url || "")}
                style={{
                  fontSize: 14, fontWeight: 600, padding: "6px 12px", borderRadius: 8,
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)",
                  color: "#DC2626", cursor: "pointer", fontFamily: FONT,
                }}
              >Add competitor</button>
            </div>
          </div>
        ))}
        {!searching && searchResults.length === 0 && !researchMessage && (
          <div style={{
            padding: "20px 0", fontSize: 14, color: "var(--fg-3)",
            textAlign: "center" as const, lineHeight: 1.55, fontFamily: FONT,
          }}>
            Run a search to preview outlets and names. Promote anything promising straight into your Watch sources.
          </div>
        )}
      </div>
    </div>
  );
}
