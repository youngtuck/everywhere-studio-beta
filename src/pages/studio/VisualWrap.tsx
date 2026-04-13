/**
 * Visual Intelligence: Wrap As Visual. Picks a style, generates an illustrated image via Gemini.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Ruler,
  Type,
  Search,
  Film,
  Briefcase,
  ChevronDown,
  Download,
  Copy,
  X,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useMobile } from "../../hooks/useMobile";
import { fetchWithRetry } from "../../lib/retry";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

function Lightbox({ image, alt, onClose }: { image: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="View full size"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.85)",
        zIndex: 9999,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          background: "rgba(255,255,255,0.1)",
          border: "none",
          borderRadius: 8,
          padding: 8,
          cursor: "pointer",
          color: "#fff",
          transition: "background 0.15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
        aria-label="Close"
      >
        <X size={24} />
      </button>
      <img
        src={`data:image/png;base64,${image}`}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }}
        style={{
          maxWidth: "90vw",
          maxHeight: "85vh",
          objectFit: "contain",
          borderRadius: 8,
          opacity: 0,
          transition: "opacity 0.4s ease-out",
        }}
      />
    </div>
  );
}

const VIBES = {
  Sketchbook: {
    label: "Sketchbook",
    descriptor: "Watercolor notebook",
    icon: Pencil,
  },
  Blueprint: {
    label: "Blueprint",
    descriptor: "Technical drafting",
    icon: Ruler,
  },
  Poster: {
    label: "Poster",
    descriptor: "Bold editorial",
    icon: Type,
  },
  FieldNotes: {
    label: "Field Notes",
    descriptor: "Research journal",
    icon: Search,
  },
  Storyboard: {
    label: "Storyboard",
    descriptor: "Cinematic panels",
    icon: Film,
  },
  Boardroom: {
    label: "Boardroom",
    descriptor: "Executive consulting",
    icon: Briefcase,
  },
} as const;

type VibeKey = keyof typeof VIBES;
const VIBE_KEYS: VibeKey[] = Object.keys(VIBES) as VibeKey[];

interface Output {
  id: string;
  title: string;
  content: string;
  output_type: string;
  score: number;
  created_at: string;
}

interface SavedVisual {
  id: string;
  vibe: string;
  aspect_ratio: string;
  image_base64: string;
  mime_type: string;
  created_at: string;
}

export default function VisualWrap() {
  const { outputId } = useParams();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const { user } = useAuth();
  const resultRef = useRef<HTMLDivElement>(null);
  const vibeRef = useRef<HTMLDivElement>(null);

  const [output, setOutput] = useState<Output | null>(null);
  const [voiceProfile, setVoiceProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedVibe, setSelectedVibe] = useState<VibeKey>("Sketchbook");
  const [generating, setGenerating] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [result, setResult] = useState<{ image: string; mimeType: string; vibe: string } | null>(null);
  const [gallery, setGallery] = useState<Record<string, { image: string; mimeType: string } | "loading" | "error">>({});
  const [error, setError] = useState<string | null>(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [brandColors, setBrandColors] = useState("");
  const [authorOverride, setAuthorOverride] = useState("");
  const [contextText, setContextText] = useState("");
  const [lightbox, setLightbox] = useState<{ image: string; vibe: string } | null>(null);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [resultRevealPhase, setResultRevealPhase] = useState<null | "revealing" | "complete">(null);
  const [resultActionsVisible, setResultActionsVisible] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cardExpanded, setCardExpanded] = useState(false);
  const [savedVisuals, setSavedVisuals] = useState<SavedVisual[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  /** Persist a generated visual to Supabase so it survives navigation. */
  const saveVisual = useCallback(
    async (vibe: string, imageBase64: string, mimeType: string, ar: string) => {
      if (!user?.id || !outputId || outputId === "new") return;
      const { data, error: insertErr } = await supabase
        .from("output_visuals")
        .insert({
          output_id: outputId,
          user_id: user.id,
          vibe,
          aspect_ratio: ar,
          image_base64: imageBase64,
          mime_type: mimeType,
        })
        .select("id, vibe, aspect_ratio, image_base64, mime_type, created_at")
        .single();
      if (!insertErr && data) {
        setSavedVisuals((prev) => {
          // Replace any existing visual with same vibe + aspect_ratio
          const filtered = prev.filter(
            (v) => !(v.vibe === vibe && v.aspect_ratio === ar)
          );
          return [data as SavedVisual, ...filtered];
        });
      }
    },
    [user?.id, outputId]
  );

  /** Load previously generated visuals for this output. */
  const loadSavedVisuals = useCallback(async () => {
    if (!outputId || outputId === "new") return;
    setLoadingSaved(true);
    const { data } = await supabase
      .from("output_visuals")
      .select("id, vibe, aspect_ratio, image_base64, mime_type, created_at")
      .eq("output_id", outputId)
      .order("created_at", { ascending: false });
    if (data) setSavedVisuals(data as SavedVisual[]);
    setLoadingSaved(false);
  }, [outputId]);

  useEffect(() => {
    if (generating && !generatingAll) setCardExpanded(false);
  }, [generating, generatingAll]);

  useEffect(() => {
    const show = (generating && !generatingAll) || (result && !generatingAll && (resultRevealPhase === "revealing" || resultRevealPhase === "complete")) || (generateError && !generatingAll);
    if (!show) return;
    const id = requestAnimationFrame(() => setCardExpanded(true));
    return () => cancelAnimationFrame(id);
  }, [generating, generatingAll, result, resultRevealPhase, generateError]);

  useEffect(() => {
    if (generating || generatingAll) {
      setElapsedSeconds(0);
      setGenerateError(null);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [generating, generatingAll]);

  useEffect(() => {
    if (!outputId || outputId === "new") {
      setLoading(false);
      setNotFound(true);
      return;
    }
    (async () => {
      const { data: outData, error: outErr } = await supabase
        .from("outputs")
        .select("id, title, content, output_type, score, created_at")
        .eq("id", outputId)
        .single();
      if (outErr || !outData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setOutput(outData as Output);

      if (user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("voice_profile")
          .eq("id", user.id)
          .single();
        setVoiceProfile(profile?.voice_profile || null);
      }
      // Load any previously saved visuals for this output
      await loadSavedVisuals();
      setLoading(false);
    })();
  }, [outputId, user?.id, loadSavedVisuals]);

  const author =
    authorOverride ||
    (user?.user_metadata as Record<string, unknown>)?.full_name ||
    user?.email?.split("@")[0] ||
    "EVERYWHERE Studio";
  const context =
    contextText ||
    (output ? `${output.output_type.replace("_", " ")} · ${new Date(output.created_at).toLocaleDateString()}` : "");

  const voiceStyle = voiceProfile
    ? [voiceProfile.role, voiceProfile.audience, voiceProfile.tone].filter(Boolean).join(", ")
    : null;

  const generateVisual = useCallback(
    async (vibe: VibeKey) => {
      if (!output) return;
      const res = await fetchWithRetry(
        `${API_BASE}/api/visual`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: output.content,
            title: output.title,
            author: typeof author === "string" ? author : "EVERYWHERE Studio",
            context,
            vibe,
            brandColors: brandColors.trim() || null,
            voiceStyle,
            aspectRatio,
          }),
        },
        { timeout: 60000 } // visual generation takes longer
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Generation failed");
      return data as { image: string; mimeType: string };
    },
    [output, author, context, brandColors, voiceStyle, aspectRatio]
  );

  const handleGenerateOne = async () => {
    if (!output) return;
    setError(null);
    setGenerateError(null);
    setResult(null);
    setResultRevealPhase(null);
    setResultActionsVisible(false);
    setGenerating(true);
    try {
      const data = await generateVisual(selectedVibe);
      if (data) {
        setResult({ image: data.image, mimeType: data.mimeType, vibe: selectedVibe });
        setGenerating(false);
        setResultRevealPhase("revealing");
        resultRef.current?.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => setResultRevealPhase("complete"), 800);
        setTimeout(() => setResultActionsVisible(true), 1800);
        // Persist to Supabase in the background
        saveVisual(selectedVibe, data.image, data.mimeType, aspectRatio);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setGenerateError("Generation failed. Try again.");
      setGenerating(false);
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleGenerateAll = async () => {
    if (!output) return;
    setError(null);
    setGenerateError(null);
    setGeneratingAll(true);
    const initial: Record<string, "loading"> = {};
    VIBE_KEYS.forEach((v) => (initial[v] = "loading"));
    setGallery(initial);
    setResult(null);

    const promises = VIBE_KEYS.map(async (vibe) => {
      try {
        const data = await generateVisual(vibe);
        if (data) {
          setGallery((prev) => ({ ...prev, [vibe]: { image: data.image, mimeType: data.mimeType } }));
          // Persist each visual as it completes
          saveVisual(vibe, data.image, data.mimeType, aspectRatio);
        } else {
          setGallery((prev) => ({ ...prev, [vibe]: "error" }));
        }
      } catch {
        setGallery((prev) => ({ ...prev, [vibe]: "error" }));
      }
    });
    await Promise.allSettled(promises);
    setGeneratingAll(false);
    resultRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const downloadPng = (base64: string, mimeType: string, filename: string) => {
    const blob = new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const clean = filename
      .toLowerCase()
      .slice(0, 50)
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      || "everywhere-visual";
    a.download = `${clean}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (base64: string, mimeType: string) => {
    const blob = new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type: mimeType });
    await navigator.clipboard.write([new ClipboardItem({ [mimeType]: blob })]);
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          fontFamily: "'Afacad Flux', sans-serif",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "2px solid #C8961A",
            borderTopColor: "transparent",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (notFound || !output) {
    return (
      <div style={{ padding: 48, textAlign: "center", fontFamily: "'Afacad Flux', sans-serif" }}>
        <p style={{ color: "var(--fg-3)", marginBottom: 16 }}>Output not found.</p>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => navigate("/studio/outputs")}
        >
          Back to The Vault
        </button>
      </div>
    );
  }

  const gridCols = isMobile ? 2 : 3;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1000,
        margin: "0 auto",
        padding: isMobile ? "24px 16px" : "40px 40px",
        fontFamily: "'Afacad Flux', sans-serif",
        background: "var(--surface-primary)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 32,
        }}
      >
        <button
          type="button"
          onClick={() => navigate(`/studio/outputs/${output.id}`)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--fg-3)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            padding: 0,
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em", flex: 1, fontFamily: "'Afacad Flux', sans-serif" }}>
          Visual Intelligence
        </h1>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: "var(--fg-3)",
            textTransform: "uppercase",
            padding: "5px 12px",
            background: "rgba(0,0,0,0.06)",
            borderRadius: 6,
          }}
        >
          {output.output_type.replace("_", " ")}
        </span>
      </div>

      {/* Section 1: Output preview */}
      <div
        className="liquid-glass-card"
        style={{
          padding: 16,
          marginBottom: 28,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>{output.title}</div>
        <div
          style={{
            fontFamily: "'Afacad Flux', sans-serif",
            fontSize: 15,
            color: "var(--text-primary)",
            lineHeight: 1.5,
            marginBottom: 8,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {output.content.slice(0, 200)}
          {output.content.length > 200 ? "..." : ""}
        </div>
        <div style={{ fontSize: 14, color: "var(--fg-3)" }}>Impact: {output.score}%</div>
      </div>

      {/* Section 2: Visual Style */}
      <div ref={vibeRef} style={{ marginBottom: 32 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: "var(--fg-3)",
            marginBottom: 6,
            textTransform: "uppercase",
          }}
        >
          VISUAL STYLE
        </div>
        <p style={{ fontSize: 15, color: "var(--fg-3)", marginBottom: 20 }}>
          Each style is a completely different illustration approach
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
            gap: 14,
          }}
        >
          {VIBE_KEYS.map((key) => {
            const config = VIBES[key];
            const Icon = config.icon;
            const selected = selectedVibe === key;
            return (
              <button
                type="button"
                key={key}
                onClick={() => setSelectedVibe(key)}
                style={{
                  width: "100%",
                  padding: 20,
                  border: selected ? "2px solid #C8961A" : "1px solid var(--glass-border)",
                  borderRadius: 12,
                  background: selected ? "rgba(200,150,26,0.04)" : "var(--glass-card)",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s ease",
                  boxShadow: selected ? "none" : undefined,
                }}
                onMouseEnter={(e) => {
                  if (!selected) {
                    e.currentTarget.style.borderColor = "var(--border-default)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selected) {
                    e.currentTarget.style.borderColor = "var(--glass-border)";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                <Icon size={28} style={{ color: "var(--fg-2)", marginBottom: 10 }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", marginBottom: 3 }}>{config.label}</div>
                <div style={{ fontSize: 14, color: "var(--fg-3)" }}>{config.descriptor}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section: Aspect Ratio */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: "var(--fg-3)",
            marginBottom: 12,
            textTransform: "uppercase",
          }}
        >
          ASPECT RATIO
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {([
            { value: "16:9" as const, label: "16:9", subtitle: "Landscape" },
            { value: "9:16" as const, label: "9:16", subtitle: "Portrait" },
            { value: "1:1" as const, label: "1:1", subtitle: "Square" },
          ]).map((opt) => {
            const selected = aspectRatio === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAspectRatio(opt.value)}
                style={{
                  padding: "12px 24px",
                  border: selected ? "2px solid #C8961A" : "1px solid var(--glass-border)",
                  borderRadius: 10,
                  background: selected ? "rgba(200,150,26,0.04)" : "var(--glass-card)",
                  cursor: "pointer",
                  fontFamily: "'Afacad Flux', sans-serif",
                  textAlign: "center",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => { if (!selected) e.currentTarget.style.borderColor = "var(--border-default)"; }}
                onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = "var(--glass-border)"; }}
              >
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)" }}>{opt.label}</div>
                <div style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 2 }}>{opt.subtitle}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 3: Customize (collapsible) */}
      <div style={{ marginBottom: 28 }}>
        <button
          type="button"
          onClick={() => setShowCustomize((s) => !s)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            color: "var(--fg-2)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {showCustomize ? "Hide" : "Customize"}
          <ChevronDown
            size={14}
            style={{ transform: showCustomize ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
          />
        </button>
        {showCustomize && (
          <div
            style={{
              marginTop: 12,
              padding: 20,
              background: "var(--glass-card)",
              border: "1px solid var(--glass-border)",
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              backdropFilter: "var(--glass-blur-light)",
              WebkitBackdropFilter: "var(--glass-blur-light)",
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--fg-3)", marginBottom: 4 }}>
                Brand Colors
              </label>
              <input
                type="text"
                value={brandColors}
                onChange={(e) => setBrandColors(e.target.value)}
                placeholder="e.g. #C8961A, #4A90F5, #0D8C9E"
                className="input-field"
                style={{ width: "100%", maxWidth: 400 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--fg-3)", marginBottom: 4 }}>
                Author Override
              </label>
              <input
                type="text"
                value={authorOverride}
                onChange={(e) => setAuthorOverride(e.target.value)}
                placeholder="e.g. Coastal Intelligence"
                className="input-field"
                style={{ width: "100%", maxWidth: 400 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--fg-3)", marginBottom: 4 }}>
                Context
              </label>
              <input
                type="text"
                value={contextText}
                onChange={(e) => setContextText(e.target.value)}
                placeholder="e.g. Partner Brief, March 2026"
                className="input-field"
                style={{ width: "100%", maxWidth: 400 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Actions */}
      {error && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            background: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.2)",
            borderRadius: 8,
            fontSize: 13,
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
        <button
          type="button"
          onClick={handleGenerateOne}
          disabled={generating || generatingAll}
          style={{
            width: "100%",
            height: 56,
            borderRadius: 12,
            border: "none",
            background: "#C8961A",
            color: "#07090f",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: generating || generatingAll ? "not-allowed" : "pointer",
            opacity: generating || generatingAll ? 0.4 : 1,
            fontFamily: "'Afacad Flux', sans-serif",
          }}
        >
          Generate Visual
        </button>
        <button
          type="button"
          onClick={handleGenerateAll}
          disabled={generating || generatingAll}
          style={{
            width: "100%",
            height: 56,
            borderRadius: 12,
            border: "2px solid var(--fg)",
            background: "transparent",
            color: "var(--fg)",
            fontSize: 14,
            fontWeight: 600,
            cursor: generating || generatingAll ? "not-allowed" : "pointer",
            fontFamily: "'Afacad Flux', sans-serif",
          }}
        >
          Generate All 6 Styles
        </button>
      </div>

      {/* Kai rendering card: single generation */}
      {((generating && !generatingAll) || (result && !generatingAll && (resultRevealPhase === "revealing" || resultRevealPhase === "complete")) || (generateError && !generatingAll)) && (
        <div
          style={{
            maxHeight: cardExpanded ? 1200 : 0,
            opacity: cardExpanded ? 1 : 0,
            overflow: "hidden",
            transition: "max-height 0.4s ease-out, opacity 0.4s ease-out",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              background: "var(--glass-card)",
              border: "1px solid var(--glass-border)",
              borderRadius: 16,
              padding: 48,
              minHeight: 320,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              backdropFilter: "var(--glass-blur-light)",
              WebkitBackdropFilter: "var(--glass-blur-light)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 4, fontFamily: "'Afacad Flux', sans-serif" }}>
              Kai
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 12, fontFamily: "'Afacad Flux', sans-serif" }}>
              Visual Intelligence - Transforms your content into publication-ready visual formats
            </div>
            <div
              style={{
                fontSize: 14,
                color: resultRevealPhase === "complete" ? "var(--fg-2)" : "var(--fg-2)",
                fontStyle: "normal",
                marginBottom: 24,
              }}
            >
              {generateError ? "Generation failed" : resultRevealPhase === "complete" ? "Complete" : "Rendering your visual..."}
            </div>

            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: aspectRatio === "9:16" ? 280 : 500,
                aspectRatio: aspectRatio.replace(":", "/"),
                border: "1px solid var(--glass-border)",
                borderRadius: 12,
                background: "#FAFAF8",
                overflow: "hidden",
                marginBottom: 16,
              }}
            >
              {generateError ? (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--fg-3)" }}>
                  Generation failed. Try again.
                </div>
              ) : result && (resultRevealPhase === "revealing" || resultRevealPhase === "complete") ? (
                <>
                  <div
                    className={`render-sweep ${resultRevealPhase === "revealing" || resultRevealPhase === "complete" ? "render-sweep-paused" : ""}`}
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: resultRevealPhase === "revealing" || resultRevealPhase === "complete" ? 0 : 1,
                      transition: "opacity 0.4s ease-out",
                      pointerEvents: "none",
                    }}
                  />
                  <img
                    src={result ? `data:${result.mimeType};base64,${result.image}` : ""}
                    alt=""
                    onClick={() => result && resultRevealPhase === "complete" && setLightbox({ image: result.image, vibe: result.vibe })}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      maxWidth: "100%",
                      objectFit: "contain",
                      borderRadius: 12,
                      opacity: resultRevealPhase === "complete" ? 1 : 0,
                      transition: "opacity 0.8s ease-out 0.2s",
                      cursor: resultRevealPhase === "complete" ? "pointer" : "default",
                    }}
                  />
                </>
              ) : (
                <>
                  <div className="render-sweep" style={{ position: "absolute", inset: 0, borderRadius: 12, overflow: "hidden" }} />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "none",
                    }}
                  >
                    {(() => {
                      const Icon = VIBES[selectedVibe].icon;
                      return <Icon size={32} style={{ color: "rgba(0,0,0,0.08)", animation: "iconPulse 2s ease-in-out infinite" }} />;
                    })()}
                  </div>
                </>
              )}
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-3)", marginBottom: 4 }}>
              {generateError ? "" : result ? result.vibe : VIBES[selectedVibe].label}
            </div>
            {!generateError && (
              <div style={{ fontSize: 14, color: "var(--fg-3)", fontVariantNumeric: "tabular-nums" }}>
                {elapsedSeconds}s
              </div>
            )}

            {result && resultRevealPhase === "complete" && resultActionsVisible && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  justifyContent: "center",
                  marginTop: 24,
                  animation: "kaiActionsFadeIn 0.3s ease-out",
                }}
              >
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                  onClick={() => result && downloadPng(result.image, result.mimeType, `${output.title}-${result.vibe}`)}
                >
                  <Download size={14} /> Download PNG
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                  onClick={() => result && copyToClipboard(result.image, result.mimeType)}
                >
                  <Copy size={14} /> Copy to Clipboard
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                  onClick={() => vibeRef.current?.scrollIntoView({ behavior: "smooth" })}
                >
                  Try Another Style
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer { 0%,100%{ opacity:1 } 50%{ opacity:0.6 } }
        @keyframes paintSweep {
          0% { left: -60%; }
          100% { left: 100%; }
        }
        @keyframes paintSweepVertical {
          0% { top: -40%; }
          100% { top: 100%; }
        }
        @keyframes iconPulse {
          0%, 100% { opacity: 0.08; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(1.05); }
        }
        @keyframes kaiActionsFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .render-sweep::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(200, 150, 26, 0.04) 30%,
            rgba(200, 150, 26, 0.08) 50%,
            rgba(200, 150, 26, 0.04) 70%,
            transparent 100%
          );
          animation: paintSweep 3s ease-in-out infinite;
        }
        .render-sweep::after {
          content: '';
          position: absolute;
          left: 0;
          top: -100%;
          width: 100%;
          height: 40%;
          background: linear-gradient(
            180deg,
            transparent 0%,
            rgba(200, 150, 26, 0.03) 40%,
            rgba(200, 150, 26, 0.06) 50%,
            rgba(200, 150, 26, 0.03) 60%,
            transparent 100%
          );
          animation: paintSweepVertical 4.5s ease-in-out infinite;
        }
        .render-sweep-paused::before,
        .render-sweep-paused::after {
          animation-play-state: paused;
        }
      `}</style>

      {/* Section 5: Result (single, only when not shown in card) */}
      <div ref={resultRef}>
        {result && !(resultRevealPhase === "complete" && resultActionsVisible) && (
          <div style={{ marginBottom: 32 }}>
            <img
              src={`data:${result.mimeType};base64,${result.image}`}
              alt={`Visual: ${result.vibe}`}
              onClick={() => setLightbox({ image: result.image, vibe: result.vibe })}
              style={{
                width: "100%",
                borderRadius: 12,
                boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                display: "block",
                cursor: "pointer",
              }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
              <button
                type="button"
                className="btn-ghost"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => downloadPng(result.image, result.mimeType, `${output.title}-${result.vibe}`)}
              >
                <Download size={14} /> Download PNG
              </button>
              <button
                type="button"
                className="btn-ghost"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => copyToClipboard(result.image, result.mimeType)}
              >
                <Copy size={14} /> Copy to Clipboard
              </button>
              <button
                type="button"
                className="btn-ghost"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => vibeRef.current?.scrollIntoView({ behavior: "smooth" })}
              >
                Try Another Style
              </button>
            </div>
          </div>
        )}

        {/* Gallery (all 6): Kai mini rendering cards */}
        {generatingAll || Object.keys(gallery).length > 0 ? (
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                gap: 16,
              }}
            >
              {VIBE_KEYS.map((vibe) => {
                const entry = gallery[vibe];
                const isLoading = entry === "loading";
                const isError = entry === "error";
                const data = entry && entry !== "loading" && entry !== "error" ? entry : null;
                const Icon = VIBES[vibe].icon;
                return (
                  <div
                    key={vibe}
                    style={{
                      background: "var(--glass-card)",
                      border: "1px solid var(--glass-border)",
                      borderRadius: 16,
                      overflow: "hidden",
                      minHeight: 200,
                      padding: 16,
                      display: "flex",
                      backdropFilter: "var(--glass-blur-light)",
                      WebkitBackdropFilter: "var(--glass-blur-light)",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: "var(--fg-3)", marginBottom: 8 }}>
                      {VIBES[vibe].label}
                    </div>
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: aspectRatio.replace(":", "/"),
                        border: "1px solid var(--glass-border)",
                        borderRadius: 12,
                        background: "#FAFAF8",
                        overflow: "hidden",
                        flex: 1,
                        minHeight: 100,
                      }}
                    >
                      {isLoading && (
                        <>
                          <div className="render-sweep" style={{ position: "absolute", inset: 0, borderRadius: 12, overflow: "hidden" }} />
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              pointerEvents: "none",
                            }}
                          >
                            <Icon size={28} style={{ color: "rgba(0,0,0,0.08)", animation: "iconPulse 2s ease-in-out infinite" }} />
                          </div>
                        </>
                      )}
                      {isError && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            color: "var(--fg-3)",
                          }}
                        >
                          Generation failed. Try again.
                        </div>
                      )}
                      {data && (
                        <>
                          <div
                            className="render-sweep"
                            style={{
                              position: "absolute",
                              inset: 0,
                              opacity: 0,
                              transition: "opacity 0.4s ease-out",
                              pointerEvents: "none",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setLightbox({ image: data.image, vibe })}
                            style={{
                              position: "absolute",
                              inset: 0,
                              width: "100%",
                              height: "100%",
                              padding: 0,
                              border: "none",
                              background: "none",
                              cursor: "pointer",
                              display: "block",
                            }}
                          >
                            <img
                              src={`data:${data.mimeType};base64,${data.image}`}
                              alt={vibe}
                              onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }}
                              style={{
                                width: "100%",
                                height: "100%",
                                maxWidth: "100%",
                                objectFit: "contain",
                                borderRadius: 12,
                                opacity: 0,
                                transition: "opacity 0.5s ease-out",
                              }}
                            />
                          </button>
                        </>
                      )}
                    </div>
                    {data && (
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ fontSize: 14, padding: "6px 10px", marginTop: 8 }}
                        onClick={() => downloadPng(data.image, data.mimeType, `${output.title}-${vibe}`)}
                      >
                        Download
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {!isMobile && Object.keys(gallery).length > 0 && Object.values(gallery).some((v) => v !== "loading" && v !== "error") && (
              <p style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 12 }}>
                Download each image above, or use Download All as ZIP when available.
              </p>
            )}
          </div>
        ) : null}
      </div>

      {/* Section: Previously Generated Visuals */}
      {savedVisuals.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "var(--fg-3)",
              marginBottom: 6,
              textTransform: "uppercase",
            }}
          >
            Previously Generated
          </div>
          <p style={{ fontSize: 15, color: "var(--fg-3)", marginBottom: 20 }}>
            Visuals saved from earlier sessions
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            {savedVisuals.map((sv) => {
              const vibeConfig = VIBES[sv.vibe as VibeKey];
              return (
                <div
                  key={sv.id}
                  style={{
                    background: "var(--glass-card)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: 16,
                    overflow: "hidden",
                    padding: 16,
                    backdropFilter: "var(--glass-blur-light)",
                    WebkitBackdropFilter: "var(--glass-blur-light)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: "var(--fg-3)" }}>
                      {vibeConfig?.label || sv.vibe}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--fg-3)" }}>
                      {sv.aspect_ratio}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLightbox({ image: sv.image_base64, vibe: sv.vibe })}
                    style={{
                      width: "100%",
                      aspectRatio: sv.aspect_ratio.replace(":", "/"),
                      border: "1px solid var(--glass-border)",
                      borderRadius: 12,
                      background: "#FAFAF8",
                      overflow: "hidden",
                      cursor: "pointer",
                      padding: 0,
                      display: "block",
                      position: "relative",
                    }}
                  >
                    <img
                      src={`data:${sv.mime_type};base64,${sv.image_base64}`}
                      alt={`${sv.vibe} visual`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        borderRadius: 12,
                      }}
                    />
                  </button>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ fontSize: 13, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}
                      onClick={() => downloadPng(sv.image_base64, sv.mime_type, `${output.title}-${sv.vibe}`)}
                    >
                      <Download size={13} /> Download
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ fontSize: 13, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}
                      onClick={() => copyToClipboard(sv.image_base64, sv.mime_type)}
                    >
                      <Copy size={13} /> Copy
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 6 }}>
                    {new Date(sv.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loadingSaved && savedVisuals.length === 0 && (
        <div style={{ textAlign: "center", padding: 32, color: "var(--fg-3)", fontSize: 13 }}>
          Loading saved visuals...
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          image={lightbox.image}
          alt={lightbox.vibe}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
