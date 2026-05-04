/**
 * Watch.tsx, Sentinel Briefing + Settings.
 * CO_038C WS9: Research surface moved to /studio/settings; persistence
 * helpers lifted to src/lib/watchSources.ts.
 */
import { useState, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import { useShell } from "../../components/studio/StudioShell";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { supabase } from "../../lib/supabase";
import { fetchWithRetry } from "../../lib/retry";
import { DEFAULT_SOURCES, DEFAULT_KEYWORDS } from "../../lib/defaultWatchSources";
import type { WatchSource } from "../../lib/defaultWatchSources";
import {
  addKeyword as persistAddKeyword,
  removeKeyword as persistRemoveKeyword,
  addConfigItem as persistAddConfigItem,
  removeConfigItem as persistRemoveConfigItem,
  addSourceItem as persistAddSourceItem,
  removeSourceItem as persistRemoveSourceItem,
  saveWatchConfig as persistSaveWatchConfig,
  buildWatchConfig as composeWatchConfig,
  type WatchConfigShape,
  type WatchConfigFrequency,
} from "../../lib/watchSources";
import { useMobile } from "../../hooks/useMobile";
import "./shared.css";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
const FONT = "var(--font)";

/** Start Work with a fresh session and the intake composer pre-filled (user sends when ready). */
function goToWorkFromWatchItem(navigate: NavigateFunction, title: string, summary: string) {
  sessionStorage.setItem("ew-new-session", "1");
  sessionStorage.setItem("ew-signal-draft-only", "1");
  sessionStorage.setItem("ew-signal-text", title);
  sessionStorage.setItem("ew-signal-detail", summary || "");
  navigate("/studio/work");
}

type WatchTabId = "briefing" | "settings";

const WATCH_TABS: { id: WatchTabId; label: string; hint: string }[] = [
  { id: "briefing", label: "Briefing", hint: "Signals from your watchlist" },
  { id: "settings", label: "Settings", hint: "Sources, keywords, and delivery" },
];

// ── Types ──────────────────────────────────────────────────────
interface Signal {
  title: string;
  summary: string;
  implication?: string;
  priority?: "High" | "Medium" | "Low";
  severity?: string;
  effort?: number;
  impact?: number;
  score?: number;
  cta_label?: string;
  cta_prompt?: string;
  recommended_action?: string;
  sources?: { name: string; url: string }[];
  track?: string;
}

interface BriefingData {
  date_label?: string;
  sections?: {
    whats_moving?: Signal[];
    threats?: Signal[];
    opportunities?: Signal[];
    content_triggers?: Signal[];
    event_radar?: Signal[];
  };
}

// ── Signal card components (kept from original) ────────────────
function SignalCard({ signal, ctaLabel, ctaColor, onCta }: {
  signal: Signal; ctaLabel: string; ctaColor: string; onCta?: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--glass-border)", flexWrap: "wrap" }}>
      <div style={{ flex: 1, fontSize: 14, color: "var(--fg-2)", lineHeight: 1.5, minWidth: 0 }}>
        <strong style={{ color: "var(--fg)" }}>{signal.title}</strong>
        {signal.summary ? `, ${signal.summary}` : ""}
        {signal.implication && (
          <div style={{ fontSize: 14, color: "var(--fg-3)", marginTop: 3, lineHeight: 1.4 }}>{signal.implication}</div>
        )}
        {signal.sources && signal.sources.length > 0 && (
          <div style={{ fontSize: 9, color: "var(--fg-3)", marginTop: 3 }}>
            {signal.sources.map(s => s.name).join(" · ")}
          </div>
        )}
      </div>
      {onCta && (
        <button type="button" onClick={onCta} style={{
          fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const,
          padding: "3px 8px", borderRadius: 4, border: `1px solid ${ctaColor}33`,
          background: `${ctaColor}14`, color: "var(--fg)", flexShrink: 0,
          fontFamily: FONT, transition: "opacity 0.1s", textDecoration: "underline",
        }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.75"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >{ctaLabel}</button>
      )}
    </div>
  );
}

function OpportunityRow({ signal, active, onUseThis }: { signal: Signal; active: boolean; onUseThis?: () => void }) {
  const ctaColor = "var(--blue)";
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 0",
      borderBottom: "1px solid var(--glass-border)", opacity: active ? 1 : 0.55,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "var(--blue)" : "var(--line-2)", flexShrink: 0, marginTop: 5 }} />
      <div style={{ flex: 1, fontSize: 14, color: "var(--fg-2)", lineHeight: 1.5, minWidth: 0 }}>
        <strong style={{ color: "var(--fg)" }}>{signal.title}</strong>
        {signal.summary ? `, ${signal.summary}` : ""}
      </div>
      {onUseThis ? (
        <button type="button" onClick={onUseThis} style={{
          fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const,
          padding: "3px 8px", borderRadius: 4, border: `1px solid ${ctaColor}33`,
          background: `${ctaColor}14`, color: "var(--fg)", flexShrink: 0,
          fontFamily: FONT, transition: "opacity 0.1s", textDecoration: "underline",
        }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.75"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >Use this</button>
      ) : null}
    </div>
  );
}

// ── Briefing section card (header + body hierarchy) ──────────
function Card({
  title, subtitle, count, children, action,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="liquid-glass-card" style={{ padding: 0, marginBottom: 14, overflow: "hidden" }}>
      <div style={{
        padding: "14px 16px",
        borderBottom: "1px solid var(--glass-border)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        background: "rgba(0,0,0,0.02)",
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            color: "var(--fg-3)",
            fontFamily: "var(--studio-mono-font, ui-monospace, monospace)",
          }}>{title}</div>
          {subtitle ? (
            <div style={{ fontSize: 14, color: "var(--fg-3)", marginTop: 5, lineHeight: 1.45 }}>{subtitle}</div>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {count != null && count > 0 ? (
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--fg-3)",
              padding: "3px 9px",
              borderRadius: 999,
              background: "var(--glass-surface)",
              border: "1px solid var(--glass-border)",
            }}>{count}</span>
          ) : null}
          {action}
        </div>
      </div>
      <div style={{ padding: "6px 16px 14px" }}>{children}</div>
    </div>
  );
}

// ── Settings Add Row ───────────────────────────────────────────
function AddRow({ placeholder, onAdd }: { placeholder: string; onAdd: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
      <input
        value={v}
        onChange={e => setV(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && v.trim()) { onAdd(v.trim()); setV(""); } }}
        placeholder={placeholder}
        style={{
          flex: 1, background: "var(--glass-input)", border: "1px solid var(--glass-border)", borderRadius: 10,
          padding: "8px 11px", fontSize: 14, color: "var(--fg)", fontFamily: FONT, outline: "none",
          backdropFilter: "var(--glass-blur-light)", WebkitBackdropFilter: "var(--glass-blur-light)",
        }}
      />
      <button
        type="button"
        onClick={() => { if (v.trim()) { onAdd(v.trim()); setV(""); } }}
        style={{
          padding: "0 14px", borderRadius: 10, background: "var(--fg)", border: "none", color: "var(--surface)",
          fontSize: 18, lineHeight: 1, cursor: "pointer", fontWeight: 300,
        }}
        aria-label="Add"
      >+</button>
    </div>
  );
}

// ── Tag Chips ──────────────────────────────────────────────────
function TagChips({ items, onRemove, chipStyle }: { items: string[]; onRemove: (v: string) => void; chipStyle?: React.CSSProperties }) {
  if (items.length === 0) {
    return (
      <div style={{ fontSize: 14, color: "var(--fg-3)", fontStyle: "italic", marginBottom: 10, padding: "4px 0" }}>
        None yet. Add below.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
      {items.map(item => (
        <span
          key={item}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--fg-2)",
            background: "var(--glass-surface)", border: "1px solid var(--glass-border)", padding: "5px 10px",
            borderRadius: 8, ...chipStyle,
          }}
        >
          {item}
          <button
            type="button"
            onClick={() => onRemove(item)}
            aria-label={`Remove ${item}`}
            style={{
              cursor: "pointer", color: "var(--fg-3)", fontSize: 14, lineHeight: 1, border: "none", background: "none",
              padding: 0, display: "flex", alignItems: "center",
            }}
          >&times;</button>
        </span>
      ))}
    </div>
  );
}

// ── Source Rows (newsletter/podcast/pub style) ─────────────────
function SourceRows({ items, onRemove, borderColor }: { items: string[]; onRemove: (v: string) => void; borderColor: string }) {
  if (items.length === 0) {
    return (
      <div style={{ fontSize: 14, color: "var(--fg-3)", fontStyle: "italic", marginBottom: 10, padding: "4px 0" }}>
        None yet. Add below.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 10, borderRadius: 8, overflow: "hidden", border: "1px solid var(--glass-border)" }}>
      {items.map(item => (
        <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderLeft: `3px solid ${borderColor}`, borderBottom: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.015)" }}>
          <span style={{ flex: 1, fontSize: 14, color: "var(--fg-2)" }}>{item}</span>
          <button
            type="button"
            onClick={() => onRemove(item)}
            aria-label={`Remove ${item}`}
            style={{ cursor: "pointer", color: "var(--fg-3)", fontSize: 14, lineHeight: 1, border: "none", background: "none", padding: 4 }}
          >&times;</button>
        </div>
      ))}
    </div>
  );
}

function WatchFieldGroup({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)",
        marginBottom: description ? 4 : 8, fontFamily: "var(--studio-mono-font, ui-monospace, monospace)",
      }}>{title}</div>
      {description ? (
        <div style={{ fontSize: 14, color: "var(--fg-3)", marginBottom: 10, lineHeight: 1.45 }}>{description}</div>
      ) : null}
      {children}
    </div>
  );
}

// ── Right Panel: Watch Dashboard ──────────────────────────────
function WatchRightPanel({ contentTriggers, onTurnIntoBrief }: {
  contentTriggers: Signal[];
  onTurnIntoBrief: () => void;
}) {
  const topSignal = contentTriggers[0];
  const hasSignals = contentTriggers.length > 0;

  // CO_016 Fix 1: Reed's Take — single confident recommendation
  let reedTake: string;
  if (!hasSignals) {
    reedTake = "Run a briefing to surface this week's signals.";
  } else {
    reedTake = `You should write about ${topSignal.title} this week. ${topSignal.summary}`;
    if (topSignal.implication) reedTake += ` ${topSignal.implication}`;
  }

  const DpSection = ({ children }: { children: React.ReactNode }) => (
    <div style={{ marginBottom: 14 }}>{children}</div>
  );
  const DpLabel = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 6 }}>{children}</div>
  );

  return (
    <>
      <DpSection>
        <DpLabel>Reed's Take</DpLabel>
        <div style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.6 }}>{reedTake}</div>
      </DpSection>

      {/* CO_016 Fix 2: Single First Move button */}
      {hasSignals && (
        <DpSection>
          <DpLabel>First Move</DpLabel>
          <button
            type="button"
            className="liquid-glass-btn-gold"
            onClick={onTurnIntoBrief}
            style={{ width: "100%", fontSize: 14, padding: "8px 16px", fontFamily: FONT }}
          >
            <span className="liquid-glass-btn-gold-label">Turn signal into brief</span>
          </button>
        </DpSection>
      )}
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function Watch() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { setFeedbackContent, setReedPrefill, setAskReedPlaceholder } = useShell();
  const isMobile = useMobile();

  const [activeTab, setActiveTab] = useState<WatchTabId>("briefing");

  // Sources & config: start empty for new users, load from Supabase
  const [keywords, setKeywords] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [thoughtLeaders, setThoughtLeaders] = useState<string[]>([]);
  const [newsletters, setNewsletters] = useState<string[]>([]);
  const [podcasts, setPodcasts] = useState<string[]>([]);
  const [publications, setPublications] = useState<string[]>([]);
  const [substacks, setSubstacks] = useState<string[]>([]);
  const [redditCommunities, setRedditCommunities] = useState<string[]>([]);
  const [hasSetup, setHasSetup] = useState(true); // assume true until profile loads

  const [frequency, setFrequency] = useState<WatchConfigFrequency>("daily");

  // Load user profile (sentinel_topics + watch_config) and watch_sources
  useEffect(() => {
    if (!user) return;
    (async () => {
      // Load profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("sentinel_topics, watch_config")
        .eq("id", user.id)
        .single();

      const hasKeywords = profile?.sentinel_topics && Array.isArray(profile.sentinel_topics) && profile.sentinel_topics.length > 0;
      if (hasKeywords) {
        setKeywords(profile.sentinel_topics);
      }

      let hasConfig = false;
      if (profile?.watch_config && typeof profile.watch_config === "object") {
        const wc = profile.watch_config as any;
        if (Array.isArray(wc.competitors) && wc.competitors.length > 0) { setCompetitors(wc.competitors); hasConfig = true; }
        if (Array.isArray(wc.thoughtLeaders) && wc.thoughtLeaders.length > 0) { setThoughtLeaders(wc.thoughtLeaders); hasConfig = true; }
        if (Array.isArray(wc.reddit) && wc.reddit.length > 0) setRedditCommunities(wc.reddit);
        if (wc.frequency) setFrequency(wc.frequency);
      }

      // Load watch_sources
      const { data: srcData } = await supabase
        .from("watch_sources")
        .select("*")
        .eq("user_id", user.id);

      if (srcData && srcData.length > 0) {
        setNewsletters(srcData.filter((s: any) => s.type === "Newsletter").map((s: any) => s.name));
        setPodcasts(srcData.filter((s: any) => s.type === "Podcast").map((s: any) => s.name));
        setPublications(srcData.filter((s: any) => s.type === "Publication").map((s: any) => s.name));
        setSubstacks(srcData.filter((s: any) => s.type === "Substack").map((s: any) => s.name));
      }

      // Detect new user: no keywords, no config, no sources
      const hasSources = srcData && srcData.length > 0;
      setHasSetup(!!(hasKeywords || hasConfig || hasSources));
    })();
  }, [user]);

  // Briefing state
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [briefingDate, setBriefingDate] = useState("");
  const [briefingTime, setBriefingTime] = useState("Updated 6:00 AM");
  const [loadingBriefing, setLoadingBriefing] = useState(true);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);

  // Load latest briefing from Supabase
  useEffect(() => {
    if (!user) { setLoadingBriefing(false); return; }
    (async () => {
      const { data } = await supabase
        .from("watch_briefings")
        .select("briefing, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data?.briefing) {
        const b = data.briefing as any;
        setBriefing({
          sections: {
            content_triggers: (b.signals || []).map((s: any) => ({
              title: s.headline || s.title || "",
              summary: s.relevance || s.description || "",
              score: s.scores?.composite ?? undefined,
              cta_label: s.track === "competitor" ? "Note it" : "Use this",
            })),
            opportunities: (b.suggestions || []).map((s: any) => ({
              title: s.topic || s.title || "",
              summary: s.oneLiner || s.anglePrompt || "",
              score: s.scores?.composite ?? undefined,
              priority: "High" as const,
            })),
            threats: (b.signals || [])
              .filter((s: any) => s.track === "competitor" || s.track === "thoughtLeader")
              .map((s: any) => ({
                title: s.source ? `${s.track === "competitor" ? "Competitor" : "Thought leader"}: ${s.source}` : s.headline || "",
                summary: s.relevance || "",
                score: s.scores?.composite ?? undefined,
                priority: (s.scores?.composite ?? 0) >= 4 ? "High" as const : "Low" as const,
              })),
          },
        });
        setBriefingDate(new Date(data.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
        setBriefingTime(`Updated ${new Date(data.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`);
      }
      setLoadingBriefing(false);
    })();
  }, [user]);

  // Generate fresh briefing
  const handleGenerateBriefing = async () => {
    if (!user || generatingBriefing) return;
    setGeneratingBriefing(true);
    toast("Generating briefing...");

    try {
      const res = await fetchWithRetry(`${API_BASE}/api/run-sentinel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          forceRefresh: true,
          sentinelConfig: {
            keywords,
            rankingWeights: { relevance: 5, actionability: 3, urgency: 2 },
            tracks: { competitors, thoughtLeaders },
          },
          sources: activeSources.map(s => ({ name: s.name, type: s.type, track: s.track })),
        }),
      }, { timeout: 120000 });

      if (!res.ok) throw new Error(`Sentinel error ${res.status}`);
      const data = await res.json();

      if (data.signals || data.suggestions) {
        setBriefing({
          sections: {
            content_triggers: (data.signals || []).map((s: any) => ({
              title: s.headline || s.title || "",
              summary: s.relevance || s.description || "",
              score: s.scores?.composite ?? undefined,
              cta_label: s.track === "competitor" ? "Note it" : "Use this",
            })),
            opportunities: (data.suggestions || []).map((s: any) => ({
              title: s.topic || s.title || "",
              summary: s.oneLiner || s.anglePrompt || "",
              score: s.scores?.composite ?? undefined,
              priority: "High" as const,
            })),
            threats: (data.signals || [])
              .filter((s: any) => s.track === "competitor" || s.track === "thoughtLeader")
              .map((s: any) => ({
                title: s.source ? `${s.track === "competitor" ? "Competitor" : "Thought leader"}: ${s.source}` : s.headline || "",
                summary: s.relevance || "",
                score: s.scores?.composite ?? undefined,
                priority: (s.scores?.composite ?? 0) >= 4 ? "High" as const : "Low" as const,
              })),
          },
        });
        const now = new Date();
        setBriefingDate(now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
        setBriefingTime(`Updated ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`);
        toast("Briefing ready.");
      } else if (data.error) {
        toast(data.error, "error");
      }
    } catch (err) {
      toast("Could not generate briefing. Try again.", "error");
      console.error("[Watch][sentinel]", err);
    } finally {
      setGeneratingBriefing(false);
    }
  };

  // Persistence helpers, thin wrappers over src/lib/watchSources.ts.
  // Each wrapper preserves the existing call-site signature and routes the
  // actual Supabase write through the shared module.
  const buildWatchConfigSnapshot = useCallback((): WatchConfigShape => composeWatchConfig({
    competitors, thoughtLeaders, frequency, reddit: redditCommunities,
  }), [competitors, thoughtLeaders, frequency, redditCommunities]);

  const addKeyword = useCallback(async (v: string) => {
    if (!v || !user) return;
    try {
      const updated = await persistAddKeyword(user.id, v, keywords);
      setKeywords(updated);
    } catch {
      toast("Couldn't save. Try again.", "error");
    }
  }, [user, keywords, toast]);

  const removeKeyword = useCallback(async (v: string) => {
    if (!user) return;
    try {
      const updated = await persistRemoveKeyword(user.id, v, keywords);
      setKeywords(updated);
    } catch {
      toast("Couldn't save. Try again.", "error");
    }
  }, [user, keywords, toast]);

  const saveWatchConfig = useCallback((patch: Record<string, unknown>) => {
    if (!user) return;
    persistSaveWatchConfig(user.id, patch).catch(() => toast("Couldn't save. Try again.", "error"));
  }, [user, toast]);

  const addConfigItem = (
    currentList: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    field: keyof WatchConfigShape,
  ) => async (v: string) => {
    if (!v || !user || currentList.includes(v)) return;
    try {
      const updated = await persistAddConfigItem(user.id, currentList, v, field, buildWatchConfigSnapshot());
      setter(updated);
    } catch {
      toast("Couldn't save. Try again.", "error");
    }
  };

  const removeConfigItem = (
    currentList: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    field: keyof WatchConfigShape,
  ) => async (v: string) => {
    if (!user) return;
    try {
      const updated = await persistRemoveConfigItem(user.id, currentList, v, field, buildWatchConfigSnapshot());
      setter(updated);
    } catch {
      toast("Couldn't save. Try again.", "error");
    }
  };

  const addSourceItem = (
    currentList: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    type: string,
  ) => async (v: string) => {
    if (!v || !user || currentList.includes(v)) return;
    try {
      const updated = await persistAddSourceItem(user.id, currentList, v, type);
      setter(updated);
    } catch {
      toast("Couldn't save. Try again.", "error");
    }
  };

  const removeSourceItem = (
    currentList: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    type: string,
  ) => async (v: string) => {
    if (!user) return;
    try {
      const updated = await persistRemoveSourceItem(user.id, currentList, v, type);
      setter(updated);
    } catch {
      toast("Couldn't save. Try again.", "error");
    }
  };

  // Reconstruct sources array from user-configured items for briefing generation
  const activeSources = useMemo<WatchSource[]>(() => {
    const s: WatchSource[] = [];
    newsletters.forEach(name => s.push({ name, type: "newsletter", track: "industry" }));
    podcasts.forEach(name => s.push({ name, type: "podcast", track: "industry" }));
    publications.forEach(name => s.push({ name, type: "publication", track: "industry" }));
    substacks.forEach(name => s.push({ name, type: "substack", track: "industry" }));
    return s;
  }, [newsletters, podcasts, publications, substacks]);

  const prefillReed = useCallback((text: string) => {
    setReedPrefill(text);
  }, [setReedPrefill]);

  // Extract briefing sections (memoized to prevent re-render loops)
  const sections = briefing?.sections;
  const contentTriggers = useMemo(() => sections?.content_triggers ?? sections?.whats_moving ?? [], [sections]);
  const opportunities = useMemo(() => sections?.opportunities ?? [], [sections]);
  const marketSignals = useMemo(() => sections?.threats ?? [], [sections]);

  const now = new Date();
  const displayDate = briefingDate || now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // Inject right panel dashboard (Reed flyout opens only from the edge launcher)
  const topSignalForBrief = contentTriggers[0];
  const handleTurnIntoBrief = useCallback(() => {
    if (topSignalForBrief) {
      goToWorkFromWatchItem(nav, topSignalForBrief.title, topSignalForBrief.summary || "");
    }
  }, [nav, topSignalForBrief]);

  useLayoutEffect(() => {
    setFeedbackContent(
      <WatchRightPanel
        contentTriggers={contentTriggers}
        onTurnIntoBrief={handleTurnIntoBrief}
      />
    );
    return () => setFeedbackContent(null);
  }, [contentTriggers, handleTurnIntoBrief, setFeedbackContent]);

  // CO_016 Fix 3: Ask Reed placeholder override for Watch page
  useLayoutEffect(() => {
    setAskReedPlaceholder("Ask me why I picked this signal over the others...");
    return () => setAskReedPlaceholder("");
  }, [setAskReedPlaceholder]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden", fontFamily: FONT }}>
      <header className="liquid-glass" style={{
        display: "flex", alignItems: "center", flexShrink: 0, borderRadius: 0,
        borderBottom: "1px solid var(--glass-border)",
        padding: "10px 20px", gap: 12, flexWrap: "wrap",
      }}>
        <div
          role="tablist"
          aria-label="Watch sections"
          style={{
            display: "inline-flex", gap: 4, padding: 5,
            borderRadius: 14, background: "rgba(0,0,0,0.028)", border: "1px solid var(--glass-border)",
            flexShrink: 0,
          }}
        >
          {WATCH_TABS.map(({ id, label }) => {
            const selected = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(id)}
                style={{
                  fontSize: 14, fontWeight: selected ? 600 : 400, fontFamily: FONT,
                  color: selected ? "var(--fg)" : "var(--fg-3)",
                  padding: "7px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: selected ? "var(--glass-surface)" : "transparent",
                  boxShadow: selected ? "0 1px 0 rgba(0,0,0,0.04)" : "none",
                  transition: "background 0.12s, color 0.12s",
                }}
              >{label}</button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        {activeTab === "briefing" && (
          <>
            <span style={{ fontSize: 10, color: "var(--fg-3)", lineHeight: 1.4 }}>
              {displayDate}
              <span style={{ margin: "0 4px" }}>·</span>
              <span style={{ fontFamily: "var(--studio-mono-font, ui-monospace, monospace)" }}>{briefingTime}</span>
            </span>
            <button
              type="button"
              onClick={handleGenerateBriefing}
              disabled={generatingBriefing || loadingBriefing}
              style={{
                fontSize: 14, fontWeight: 600, padding: "8px 18px", borderRadius: 10,
                background: "var(--fg)", color: "var(--gold, #F5C642)", border: "none",
                cursor: generatingBriefing || loadingBriefing ? "not-allowed" : "pointer", fontFamily: FONT,
                letterSpacing: "0.02em", opacity: generatingBriefing || loadingBriefing ? 0.5 : 1,
                flexShrink: 0,
              }}
            >{generatingBriefing ? "Running..." : "Run Brief"}</button>
          </>
        )}

        {activeTab === "settings" && (
          <>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--fg-3)" }}>
                  Briefing cadence
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {([
                    ["Daily", "daily" as const],
                    ["Weekly", "weekly" as const],
                    ["Real-time", "realtime" as const],
                  ] as const).map(([label, val]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setFrequency(val);
                        saveWatchConfig({ ...buildWatchConfigSnapshot(), frequency: val });
                      }}
                      style={{
                        fontSize: 14, fontWeight: frequency === val ? 600 : 400,
                        padding: "6px 12px", borderRadius: 9, border: "1px solid var(--glass-border)",
                        background: frequency === val ? "var(--glass-surface)" : "transparent",
                        color: frequency === val ? "var(--fg)" : "var(--fg-3)",
                        cursor: "pointer", fontFamily: FONT,
                      }}
                    >{label}</button>
                  ))}
                </div>
              </div>
          </>
          )}
      </header>

      {/* ── Tab Content ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {/* ── BRIEFING TAB ── */}
        {activeTab === "briefing" && (
          <div style={{ padding: "20px 20px 28px", maxWidth: 720, margin: "0 auto", width: "100%" }}>
            {loadingBriefing ? (
              <div style={{ fontSize: 14, color: "var(--fg-3)", padding: "40px 0", textAlign: "center" as const }}>Loading briefing...</div>
            ) : generatingBriefing ? (
              <div style={{ fontSize: 14, color: "var(--fg-3)", padding: "40px 0", textAlign: "center" as const }}>
                Generating your briefing. This takes about 60 seconds...
              </div>
            ) : contentTriggers.length === 0 && opportunities.length === 0 && marketSignals.length === 0 ? (
              <div className="liquid-glass-card" style={{ textAlign: "center" as const, padding: "40px 28px", maxWidth: 400, margin: "0 auto" }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 10 }}>
                  Sentinel
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg)", marginBottom: 10 }}>No briefing yet</div>
                <div style={{ fontSize: 14, color: "var(--fg-3)", lineHeight: 1.65, marginBottom: 22 }}>
                  Configure keywords and sources in Settings, then run a brief. Reed ranks what matters for your next move.
                </div>
                <button type="button" onClick={handleGenerateBriefing} disabled={generatingBriefing} style={{
                  fontSize: 14, fontWeight: 600, padding: "10px 22px", borderRadius: 10,
                  background: "var(--fg)", border: "none", color: "var(--surface)",
                  cursor: "pointer", fontFamily: FONT,
                }}>Generate briefing</button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 6 }}>
                    At a glance
                  </div>
                  <div style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.55 }}>
                    Top five per section. Use a signal in Work, or open Ask Reed from the right panel for deeper follow-up.
                  </div>
                </div>
                {contentTriggers.length > 0 && (
                  <Card
                    title="Content triggers"
                    subtitle="Timely hooks Reed surfaced from your sources."
                    count={Math.min(5, contentTriggers.length)}
                  >
                    {contentTriggers.slice(0, 5).map((item, i) => (
                      <SignalCard key={i} signal={item}
                        ctaLabel={item.cta_label === "Note it" ? "Note it" : "Use this"}
                        ctaColor={item.cta_label === "Note it" ? "var(--gold)" : "var(--blue)"}
                        onCta={() => {
                          if (item.cta_label !== "Note it") {
                            goToWorkFromWatchItem(nav, item.title, item.summary || "");
                          }
                        }}
                      />
                    ))}
                  </Card>
                )}
                {opportunities.length > 0 && (
                  <Card
                    title="Opportunities"
                    subtitle="Angles worth drafting while the window is open."
                    count={Math.min(5, opportunities.length)}
                  >
                    {opportunities.slice(0, 5).map((item, i) => (
                      <OpportunityRow
                        key={i}
                        signal={item}
                        active={item.priority !== "Low"}
                        onUseThis={() => goToWorkFromWatchItem(nav, item.title, item.summary || "")}
                      />
                    ))}
                  </Card>
                )}
                {marketSignals.length > 0 && (
                  <Card
                    title="Market signals"
                    subtitle="Movement from competitors and named voices you track."
                    count={Math.min(5, marketSignals.length)}
                  >
                    {marketSignals.slice(0, 5).map((item, i) => (
                      <OpportunityRow
                        key={i}
                        signal={item}
                        active={item.priority === "High"}
                        onUseThis={() => goToWorkFromWatchItem(nav, item.title, item.summary || "")}
                      />
                    ))}
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === "settings" && (
          <div style={{ padding: "20px 20px 32px", maxWidth: 720, margin: "0 auto", width: "100%" }}>
            {!hasSetup && keywords.length === 0 && competitors.length === 0 && newsletters.length === 0 && (
              <div className="liquid-glass-card" style={{
                background: "rgba(245,198,66,0.05)", borderColor: "rgba(245,198,66,0.22)",
                padding: "18px 20px", marginBottom: 22,
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 8 }}>
                  Quick start
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", marginBottom: 8 }}>
                  Set up your Watch
                </div>
                <div style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.6, marginBottom: 16 }}>
                  Tell Reed what to track. Add a few keywords about your industry, name your competitors, and pick some sources you read. You can always change these later.
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 8 }}>Suggested keywords</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {DEFAULT_KEYWORDS.filter(k => !keywords.includes(k)).map(k => (
                      <button key={k} type="button" onClick={() => addKeyword(k)} style={{
                        fontSize: 14, padding: "6px 12px", borderRadius: 8,
                        background: "var(--glass-surface)", border: "1px solid var(--glass-border)",
                        color: "var(--fg-2)", cursor: "pointer", fontFamily: FONT,
                        transition: "border-color 0.1s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(245,198,66,0.5)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--glass-border)"; }}
                      >Add {k}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 8 }}>Suggested sources</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {DEFAULT_SOURCES.filter(s => s.type === "newsletter" || s.type === "substack").slice(0, 12).map(s => {
                      const isAdded = (s.type === "newsletter" ? newsletters : substacks).includes(s.name);
                      return (
                        <button
                          key={s.name}
                          type="button"
                          onClick={() => {
                            if (!isAdded) {
                              if (s.type === "newsletter") addSourceItem(newsletters, setNewsletters, "Newsletter")(s.name);
                              else addSourceItem(substacks, setSubstacks, "Substack")(s.name);
                            }
                          }}
                          disabled={isAdded}
                          style={{
                            fontSize: 14, padding: "6px 12px", borderRadius: 8,
                            background: isAdded ? "rgba(34,197,94,0.08)" : "var(--glass-surface)",
                            border: isAdded ? "1px solid rgba(34,197,94,0.3)" : "1px solid var(--glass-border)",
                            color: isAdded ? "#16A34A" : "var(--fg-2)", cursor: isAdded ? "default" : "pointer",
                            fontFamily: FONT, transition: "border-color 0.1s",
                          }}
                          onMouseEnter={e => { if (!isAdded) e.currentTarget.style.borderColor = "rgba(245,198,66,0.5)"; }}
                          onMouseLeave={e => { if (!isAdded) e.currentTarget.style.borderColor = "var(--glass-border)"; }}
                        >{isAdded ? "Added" : "Add"} {s.name}</button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="liquid-glass-card" style={{ padding: "18px 20px" }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 6 }}>
                  Topic & community
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>What to listen for</div>
                <div style={{ fontSize: 14, color: "var(--fg-3)", lineHeight: 1.55, marginBottom: 18 }}>
                  Keywords run across every channel. Reddit adds community-level chatter on top.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 22 }}>
                  <div>
                    <WatchFieldGroup title="Keywords" description="Terms Reed should treat as signal, not noise.">
                      <TagChips items={keywords} onRemove={removeKeyword} />
                      <AddRow placeholder="Add a keyword..." onAdd={addKeyword} />
                    </WatchFieldGroup>
                  </div>
                  <div>
                    <WatchFieldGroup title="Reddit communities" description="Use full paths like r/consulting.">
                      <TagChips items={redditCommunities} onRemove={removeConfigItem(redditCommunities, setRedditCommunities, "reddit")} />
                      <AddRow placeholder="e.g. r/consulting..." onAdd={addConfigItem(redditCommunities, setRedditCommunities, "reddit")} />
                    </WatchFieldGroup>
                  </div>
                </div>
              </div>

              <div className="liquid-glass-card" style={{ padding: "18px 20px" }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 6 }}>
                  Media you follow
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>Sources for the briefing</div>
                <div style={{ fontSize: 14, color: "var(--fg-3)", lineHeight: 1.55, marginBottom: 18 }}>
                  Layer newsletters, podcasts, publications, and Substacks. Reed weights all of them when Sentinel runs.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 22 }}>
                  <div>
                    <WatchFieldGroup title="Newsletters" description="Named editions you subscribe to or skim regularly.">
                      <SourceRows items={newsletters} onRemove={removeSourceItem(newsletters, setNewsletters, "Newsletter")} borderColor="rgba(74,144,217,0.4)" />
                      <AddRow placeholder="Add newsletter..." onAdd={addSourceItem(newsletters, setNewsletters, "Newsletter")} />
                    </WatchFieldGroup>
                    <div style={{ marginTop: 20 }}>
                      <WatchFieldGroup title="Podcasts" description="Shows and feeds where your buyers show up.">
                        <SourceRows items={podcasts} onRemove={removeSourceItem(podcasts, setPodcasts, "Podcast")} borderColor="rgba(196,154,32,0.4)" />
                        <AddRow placeholder="Add podcast..." onAdd={addSourceItem(podcasts, setPodcasts, "Podcast")} />
                      </WatchFieldGroup>
                    </div>
                  </div>
                  <div>
                    <WatchFieldGroup title="Publications" description="Sites, columns, and trade desks worth tracking.">
                      <SourceRows items={publications} onRemove={removeSourceItem(publications, setPublications, "Publication")} borderColor="rgba(74,144,217,0.3)" />
                      <AddRow placeholder="Add publication..." onAdd={addSourceItem(publications, setPublications, "Publication")} />
                    </WatchFieldGroup>
                    <div style={{ marginTop: 20 }}>
                      <WatchFieldGroup title="Substack" description="Individual writers publishing on Substack.">
                        <SourceRows items={substacks} onRemove={removeSourceItem(substacks, setSubstacks, "Substack")} borderColor="rgba(168,85,247,0.3)" />
                        <AddRow placeholder="Add Substack..." onAdd={addSourceItem(substacks, setSubstacks, "Substack")} />
                      </WatchFieldGroup>
                    </div>
                  </div>
                </div>
              </div>

              <div className="liquid-glass-card" style={{ padding: "18px 20px" }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 6 }}>
                  Competitive lens
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>People and brands to contrast</div>
                <div style={{ fontSize: 14, color: "var(--fg-3)", lineHeight: 1.55, marginBottom: 18 }}>
                  Competitors sharpen positioning signals. Thought leaders keep you honest on narrative shifts.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 22 }}>
                  <WatchFieldGroup title="Competitors" description="Companies you win against or watch for moves.">
                    <TagChips items={competitors} onRemove={removeConfigItem(competitors, setCompetitors, "competitors")} chipStyle={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#991B1B" }} />
                    <AddRow placeholder="Add competitor..." onAdd={addConfigItem(competitors, setCompetitors, "competitors")} />
                  </WatchFieldGroup>
                  <WatchFieldGroup title="Thought leaders" description="Voices your audience already trusts.">
                    <TagChips items={thoughtLeaders} onRemove={removeConfigItem(thoughtLeaders, setThoughtLeaders, "thoughtLeaders")} chipStyle={{ background: "rgba(245,198,66,0.08)", border: "1px solid rgba(245,198,66,0.3)", color: "#92400E" }} />
                    <AddRow placeholder="Add thought leader..." onAdd={addConfigItem(thoughtLeaders, setThoughtLeaders, "thoughtLeaders")} />
                  </WatchFieldGroup>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
