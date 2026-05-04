import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { useMobile } from "../../hooks/useMobile";
import { BRAND_FIELD_GUIDES } from "../../lib/brandFieldDeepDives";
import { DnaNav } from "../../components/studio/DnaNav";
import { safeMarkdownToHtml } from "../../lib/markdown";
import "./shared.css";

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <span style={{ fontSize: 12, color: "var(--fg-3)", fontWeight: 600 }}>{formatKey(k)}: </span>
            <span style={{ fontSize: 13, color: "var(--fg-2)" }}>{renderValue(v)}</span>
          </div>
        ))}
      </div>
    );
  }
  return String(value);
}

export default function BrandDnaSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useMobile();
  const [brandDna, setBrandDna] = useState<any>(null);
  const [brandDnaMd, setBrandDnaMd] = useState("");
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // CO_038C WS10: scroll lives inside the canonical flex+minHeight wrapper below.
  // The previous imperative `.studio-main-inner` overflow patch is removed; the
  // wrapper now scrolls inside the stage canvas per the viewport-lock contract.

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("brand_dna, brand_dna_md, brand_dna_completed, brand_dna_completed_at")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) console.error("Failed to load Brand DNA:", error);
        if (data?.brand_dna) setBrandDna(data.brand_dna);
        if (data?.brand_dna_md) setBrandDnaMd(data.brand_dna_md);
        if (data?.brand_dna_completed_at) setCompletedAt(data.brand_dna_completed_at);
        setLoading(false);
      }, (err) => { console.error("Brand DNA fetch failed:", err); setLoading(false); });
  }, [user]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, fontFamily: "var(--font)" }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", padding: isMobile ? "20px 16px 100px" : "32px 24px 80px" }}>
            <p style={{ fontSize: 14, color: "var(--fg-3)" }}>Loading Brand DNA...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!brandDna && !brandDnaMd) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, fontFamily: "var(--font)" }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", padding: isMobile ? "20px 16px 100px" : "32px 24px 80px" }}>
            <DnaNav />
            <header style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: "var(--font)", fontSize: 28, fontWeight: 700, color: "var(--fg)", margin: 0, letterSpacing: "-0.02em" }}>
                Brand DNA
              </h1>
            </header>
            <section style={{ background: "var(--glass-card)", border: "1px solid var(--glass-border)", borderRadius: 12, padding: 32, backdropFilter: "var(--glass-blur-light)", WebkitBackdropFilter: "var(--glass-blur-light)" }}>
              <p style={{ fontSize: 15, color: "var(--fg-2)", margin: "0 0 20px", lineHeight: 1.6 }}>
                Your Brand DNA has not been captured yet. Brand DNA teaches Reed your brand voice, values, and positioning so content stays on-brand.
              </p>
              <button
                onClick={() => navigate("/onboarding?retrain=brand")}
                style={{
                  background: "var(--gold-bright)", color: "var(--fg)", border: "none",
                  borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600,
                  cursor: "pointer", fontFamily: "var(--font)",
                }}
              >
                Set Up Brand DNA
              </button>
            </section>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = completedAt
    ? new Date(completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  // Filter out internal/meta keys from the brand_dna object
  const SKIP_KEYS = new Set(["created_at", "updated_at", "method", "id"]);
  const brandFields = brandDna
    ? Object.entries(brandDna).filter(([k]) => !SKIP_KEYS.has(k) && brandDna[k] !== null && brandDna[k] !== "")
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, fontFamily: "var(--font)" }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: isMobile ? "20px 16px 100px" : "32px 24px 80px" }}>
          <DnaNav />
          <header style={{ marginBottom: 24 }}>
            <h1 style={{ fontFamily: "var(--font)", fontSize: 28, fontWeight: 700, color: "var(--fg)", margin: 0, letterSpacing: "-0.02em" }}>
              Brand DNA
            </h1>
        <p style={{ fontFamily: "var(--font)", fontSize: 14, color: "var(--fg-2)", marginTop: 4, marginBottom: 0 }}>
          How Reed stays on-brand across everything it produces
        </p>
      </header>

      {/* SECTION A: Summary */}
      <section style={{ background: "var(--glass-card)", border: "1px solid var(--glass-border)", borderRadius: 12, padding: 32, marginBottom: 24, backdropFilter: "var(--glass-blur-light)", WebkitBackdropFilter: "var(--glass-blur-light)" }}>
        <div style={{ fontFamily: "var(--font)", fontSize: 14, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-3)", marginBottom: 12 }}>
          Your Brand DNA
        </div>
        {formattedDate && (
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 12 }}>
            Captured on {formattedDate}
          </div>
        )}
        {brandDnaMd ? (
          <div
            style={{ fontFamily: "var(--font)", fontSize: 14, color: "var(--fg-2)", lineHeight: 1.65 }}
            className="md-content"
            dangerouslySetInnerHTML={{ __html: safeMarkdownToHtml(brandDnaMd) }}
          />
        ) : (
          <p style={{ fontSize: 14, color: "var(--fg-3)", margin: 0 }}>
            No markdown summary available.
          </p>
        )}
      </section>

      <section style={{ background: "var(--glass-card)", border: "1px solid var(--glass-border)", borderRadius: 12, padding: 32, marginBottom: 24, backdropFilter: "var(--glass-blur-light)", WebkitBackdropFilter: "var(--glass-blur-light)" }}>
        <div style={{ fontFamily: "var(--font)", fontSize: 14, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-3)", marginBottom: 14 }}>
          Field guides
        </div>
        <p style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6, margin: "0 0 16px" }}>
          Each block explains what Reed listens for in Brand DNA, similar to how Voice DNA traits have full guides in Preferences.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {BRAND_FIELD_GUIDES.map(g => {
            const hasValue = Boolean(brandDna && typeof brandDna === "object" && (brandDna as Record<string, unknown>)[g.field]);
            return (
              <details
                key={g.field}
                style={{
                  borderRadius: 10,
                  border: "1px solid var(--glass-border)",
                  background: "rgba(0,0,0,0.02)",
                  padding: "10px 12px",
                }}
              >
                <summary style={{ fontFamily: "var(--font)", fontSize: 13, fontWeight: 600, color: "var(--fg)", cursor: "pointer" }}>
                  {g.title}
                  {hasValue ? <span style={{ fontSize: 11, fontWeight: 500, color: "var(--fg-3)", marginLeft: 8 }}>(in your profile)</span> : null}
                </summary>
                <p style={{ fontFamily: "var(--font)", fontSize: 12, color: "var(--fg-3)", lineHeight: 1.55, margin: "10px 0 6px" }}>{g.summary}</p>
                {g.paragraphs.map((p, i) => (
                  <p key={i} style={{ fontFamily: "var(--font)", fontSize: 13, color: "var(--fg-2)", lineHeight: 1.65, margin: "0 0 8px" }}>
                    {p}
                  </p>
                ))}
              </details>
            );
          })}
        </div>
      </section>

      {/* SECTION B: Brand DNA Fields */}
      {brandFields.length > 0 && (
        <section style={{ background: "var(--glass-card)", border: "1px solid var(--glass-border)", borderRadius: 12, padding: 32, marginBottom: 24, backdropFilter: "var(--glass-blur-light)", WebkitBackdropFilter: "var(--glass-blur-light)" }}>
          <div style={{ fontFamily: "var(--font)", fontSize: 14, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-3)", marginBottom: 18 }}>
            Brand Details
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {brandFields.map(([key, value]) => (
              <div key={key}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--fg-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                  {formatKey(key)}
                </div>
                <div style={{ fontSize: 14, color: "var(--fg)", lineHeight: 1.6 }}>
                  {renderValue(value)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION C: Retrain */}
      <section style={{ background: "var(--glass-card)", border: "1px solid var(--glass-border)", borderRadius: 12, padding: 32, backdropFilter: "var(--glass-blur-light)", WebkitBackdropFilter: "var(--glass-blur-light)" }}>
        <div style={{ fontFamily: "var(--font)", fontSize: 14, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-3)", marginBottom: 12 }}>
          Retrain
        </div>
        <p style={{ fontSize: 14, color: "var(--fg-2)", margin: "0 0 16px", lineHeight: 1.6 }}>
          Re-run onboarding to refresh Brand DNA from your site, Reed chat, or blended notes and documents.
        </p>
        <button
          type="button"
          onClick={() => navigate("/onboarding?retrain=brand")}
          style={{
            background: "transparent", color: "var(--gold)",
            border: "2px solid var(--gold)", borderRadius: 8,
            padding: "10px 20px", fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "var(--font)",
            display: "flex", alignItems: "center", gap: 8,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(245,198,66,0.06)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <RefreshCw size={16} />
          Retrain Brand DNA
        </button>
      </section>
        </div>
      </div>
    </div>
  );
}
