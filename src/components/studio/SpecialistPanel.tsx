/**
 * Checkpoint and advisor cards for in-page quality UI.
 * Route-level advisor readout and Reed chat live in StudioShell inspector (edge panel), not here.
 */
import { useState, useEffect } from "react";
import { Check, AlertTriangle, X as XIcon, Loader2 } from "lucide-react";
import { useMobile } from "../../hooks/useMobile";

const SPECIALIST_INFO: Record<number, { name: string; role: string; color: string; detail: string }> = {
  0: {
    name: "Deduplication",
    role: "Quality checkpoint",
    color: "var(--cornflower)",
    detail: "Scans for conceptual repetition, not just word-for-word duplicates. If your piece restates the same argument in different words across sections, it catches it.",
  },
  1: {
    name: "Research Validation",
    role: "Quality checkpoint",
    color: "var(--gold)",
    detail: "Verifies every factual claim against independent sources. Unverified claims are flagged for revision or removal. Minimum 8 sources for long-form.",
  },
  2: {
    name: "Voice Authenticity",
    role: "Quality checkpoint",
    color: "var(--cornflower)",
    detail: "Compares every sentence against your Voice DNA profile. Vocabulary, rhythm, tonal register, metaphor patterns, and structural habits all get scored. Target is 95% fidelity.",
  },
  3: {
    name: "Engagement Optimization",
    role: "Quality checkpoint",
    color: "#A080F5",
    detail: "Runs the 7-second hook test. If your opening does not earn attention within the first two sentences, it fails. Also checks for clear stakes and counts quotable moments.",
  },
  4: {
    name: "SLOP Detection",
    role: "Quality checkpoint",
    color: "#E8506A",
    detail: "Scans for Superfluity, Loops, Overwrought prose, and Pretension. Zero tolerance for AI padding.",
  },
  5: {
    name: "Editorial Excellence",
    role: "Quality checkpoint",
    color: "var(--cornflower)",
    detail: "Applies publication-grade editorial standards plus the Stranger Test. Every term must be explained for a cold reader. If a stranger cannot follow your argument without context, it fails.",
  },
  6: {
    name: "Perspective & Risk",
    role: "Quality checkpoint",
    color: "#50c8a0",
    detail: "Checks for cultural blind spots and unexamined assumptions. Applies nonviolent communication principles. Ensures content challenges without alienating.",
  },
};

// Map simplified checkpoint keys (from /api/generate) to checkpoint card indices
const CHECKPOINT_KEY_MAP: Record<string, number> = {
  accuracy: 1, voice: 2, audience: 3, ai_tells: 4, strategy: 5, platform: 6, impact: 6,
};

interface CheckpointData {
  index: number;
  status: "pass" | "fail" | "flag" | "processing" | "pending";
  score?: number;
  feedback?: string;
  issues?: string[];
}

interface SpecialistPanelProps {
  // From real pipeline (GateResult[])
  pipelineCheckpointResults?: Array<{ checkpoint?: string; status?: string; score?: number; feedback?: string; issues?: string[] } | null>;
  // From simplified /api/generate gates
  simpleCheckpoints?: Record<string, number | undefined> | null;
  // Animation state
  visibleCount?: number;
  revealedCount?: number;
  // Total score
  totalScore?: number;
  showTotal?: boolean;
  // Interactivity
  isAnimating?: boolean;
  // Threshold
  threshold?: number;
}

function scoreColor(score: number): string {
  if (score >= 80) return "#50c8a0";
  if (score >= 60) return "var(--gold)";
  return "#E53935";
}

// ─────────────────────────────────────────────────────────────────────────────
// ADVISOR CARDS (Strategic Advice mode)
// ─────────────────────────────────────────────────────────────────────────────

interface AdvisorCardData {
  role: string;
  color: string;
  take: string;
}

const DEFAULT_ADVISORS: AdvisorCardData[] = [
  {
    role: "CATEGORY DESIGN",
    color: "#4A90D9",
    take: "This is a positioning piece, not a thought leadership piece. The question is whether you are defining a new category or competing in an existing one. If you are competing, the draft needs to work harder to earn the reader's attention.",
  },
  {
    role: "MARKET POSITIONING",
    color: "#B8860B",
    take: "The opening paragraph assumes the reader already agrees with your premise. Strongest positioning pieces open with the world the reader already lives in, then show them the gap.",
  },
  {
    role: "MARKET REALITY",
    color: "#C0622A",
    take: "The claim in paragraph 2 is directionally correct but unsourced. This is the kind of statement that builds trust if verified and destroys it if not.",
  },
];

interface AdvisorCardsProps {
  onDiscuss?: (role: string) => void;
}

export function AdvisorCards({ onDiscuss }: AdvisorCardsProps) {
  const [cardStates, setCardStates] = useState<Record<number, "default" | "applied" | "discussing" | "passed">>({});

  const handleApply = (idx: number) => {
    setCardStates(prev => ({ ...prev, [idx]: "applied" }));
  };

  const handleDiscuss = (idx: number, role: string) => {
    setCardStates(prev => ({ ...prev, [idx]: "discussing" }));
    onDiscuss?.(role);
  };

  const handlePass = (idx: number) => {
    setCardStates(prev => ({ ...prev, [idx]: "passed" }));
  };

  return (
    <div>
      {DEFAULT_ADVISORS.map((advisor, i) => {
        const state = cardStates[i] || "default";
        return (
          <div
            key={i}
            style={{
              border: "1px solid #E2E8F0",
              borderRadius: 6,
              marginBottom: 8,
              overflow: "hidden",
              opacity: state === "passed" ? 0.4 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {/* Header */}
            <div style={{ padding: "10px 12px" }}>
              <div style={{
                fontSize: 9, fontWeight: 800, letterSpacing: "0.1em",
                textTransform: "uppercase" as const, color: advisor.color,
                marginBottom: 4,
              }}>
                {advisor.role}
              </div>
              <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>
                {advisor.take}
              </div>
            </div>

            {/* Actions bar */}
            <div style={{
              borderTop: "1px solid #F1F5F9",
              display: "flex", gap: 0,
            }}>
              {/* Apply */}
              <button
                className="apply"
                disabled={state === "applied"}
                onClick={() => handleApply(i)}
                style={{
                  flex: 1, padding: "7px 4px", fontSize: 10, fontWeight: 600,
                  border: "none", background: "transparent", cursor: state === "applied" ? "default" : "pointer",
                  fontFamily: "inherit", transition: "0.12s",
                  color: state === "applied" ? "#4A90D9" : "#64748B",
                  borderRight: "1px solid #F1F5F9",
                }}
                onMouseEnter={e => { if (state !== "applied") { e.currentTarget.style.background = "#EFF6FF"; e.currentTarget.style.color = "#4A90D9"; } }}
                onMouseLeave={e => { if (state !== "applied") { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748B"; } }}
              >
                {state === "applied" ? "Shown" : "Apply"}
              </button>

              {/* Change All (only when applied) */}
              {state === "applied" && (
                <button
                  style={{
                    padding: "7px 4px", fontSize: 10, fontWeight: 600,
                    border: "none", background: "transparent", cursor: "pointer",
                    fontFamily: "inherit", color: "#4A90D9",
                    borderRight: "1px solid #F1F5F9",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#EFF6FF"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  Change All
                </button>
              )}

              {/* Discuss */}
              <button
                className="discuss"
                onClick={() => handleDiscuss(i, advisor.role)}
                style={{
                  flex: 1, padding: "7px 4px", fontSize: 10, fontWeight: 600,
                  border: "none", background: "transparent", cursor: "pointer",
                  fontFamily: "inherit", transition: "0.12s",
                  color: state === "discussing" ? "#0D1B2A" : "#64748B",
                  borderRight: "1px solid #F1F5F9",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#F7F9FC"; e.currentTarget.style.color = "#0D1B2A"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = state === "discussing" ? "#0D1B2A" : "#64748B"; }}
              >
                {state === "discussing" ? "In thread" : "Discuss"}
              </button>

              {/* Pass */}
              <button
                className="pass"
                onClick={() => handlePass(i)}
                style={{
                  flex: 1, padding: "7px 4px", fontSize: 10, fontWeight: 600,
                  border: "none", background: "transparent", cursor: "pointer",
                  fontFamily: "inherit", transition: "0.12s",
                  color: state === "passed" ? "#94A3B8" : "#64748B",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#FFF8F0"; e.currentTarget.style.color = "#94A3B8"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = state === "passed" ? "#94A3B8" : "#64748B"; }}
              >
                {state === "passed" ? "Passed" : "Pass"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUALITY PIPELINE (existing checkpoint display)
// ─────────────────────────────────────────────────────────────────────────────

export default function SpecialistPanel({
  pipelineCheckpointResults,
  simpleCheckpoints,
  visibleCount = 7,
  revealedCount = 7,
  totalScore,
  showTotal = true,
  isAnimating = false,
  threshold = 900,
}: SpecialistPanelProps) {
  const isMobile = useMobile();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Build checkpoint data from either source
  const gates: CheckpointData[] = [];

  if (pipelineCheckpointResults && pipelineCheckpointResults.some(Boolean)) {
    // Real pipeline results
    for (let i = 0; i < 7; i++) {
      const r = pipelineCheckpointResults[i];
      if (!r) {
        gates.push({ index: i, status: i < visibleCount ? "processing" : "pending" });
      } else {
        const s = (r.status || "").toUpperCase();
        gates.push({
          index: i,
          status: s === "PASS" ? "pass" : s === "FAIL" ? "fail" : s === "FLAG" ? "flag" : "pass",
          score: r.score,
          feedback: r.feedback,
          issues: r.issues,
        });
      }
    }
  } else if (simpleCheckpoints) {
    // Simplified gates from /api/generate
    // Echo always passes
    gates.push({ index: 0, status: "pass" });
    const keys = ["accuracy", "voice", "audience", "ai_tells", "strategy", "platform"];
    for (let i = 0; i < keys.length; i++) {
      const val = simpleCheckpoints[keys[i] as keyof typeof simpleCheckpoints] as number | undefined;
      gates.push({
        index: i + 1,
        status: val !== undefined ? (val >= 60 ? "pass" : "fail") : "pending",
        score: val,
      });
    }
  } else {
    for (let i = 0; i < 7; i++) {
      gates.push({ index: i, status: "pending" });
    }
  }

  // Auto-select the most recently completed checkpoint during animation
  useEffect(() => {
    if (!isAnimating) return;
    const lastRevealed = gates.filter(g => g.status !== "processing" && g.status !== "pending").length - 1;
    if (lastRevealed >= 0) setSelectedIndex(lastRevealed);
  }, [revealedCount, isAnimating]);

  const selected = selectedIndex !== null ? gates[selectedIndex] : null;
  const selectedInfo = selectedIndex !== null ? SPECIALIST_INFO[selectedIndex] : null;

  const statusIcon = (g: CheckpointData) => {
    if (g.status === "processing") return <Loader2 size={16} style={{ color: "var(--fg-3)", animation: "spin 0.8s linear infinite" }} />;
    if (g.status === "pending") return <span style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--bg-3)", display: "block" }} />;
    if (g.status === "pass") return <Check size={16} strokeWidth={2.5} style={{ color: "#50c8a0" }} />;
    if (g.status === "flag") return <AlertTriangle size={16} style={{ color: "var(--gold)" }} />;
    return <XIcon size={16} style={{ color: "#E53935" }} />;
  };

  const renderDetailPanel = () => {
    if (!selected || !selectedInfo) {
      return (
        <div style={{ padding: 32, textAlign: "center", color: "var(--fg-3)", fontSize: 14 }}>
          Click a checkpoint to see its evaluation
        </div>
      );
    }

    return (
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ width: 32, height: 32, borderRadius: 8, background: selectedInfo.color + "18", color: selectedInfo.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
            {"\u2022"}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)" }}>{selectedInfo.name}</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{selectedInfo.role}</div>
          </div>
          {selected.score !== undefined && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: scoreColor(selected.score), fontVariantNumeric: "tabular-nums" }}>
                {selected.score}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: selected.score >= 80 ? "#50c8a0" : selected.score >= 60 ? "var(--gold)" : "#E53935" }}>
                {selected.score >= 80 ? "Strong" : selected.score >= 60 ? "Needs work" : "Needs attention"}
              </span>
            </div>
          )}
        </div>

        {selected.score !== undefined && (
          <div style={{ marginBottom: 16, padding: "0 0 0 42px" }}>
            <div style={{ height: 4, borderRadius: 2, background: "var(--bg-3)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, selected.score)}%`, background: scoreColor(selected.score), borderRadius: 2 }} />
            </div>
          </div>
        )}

        <p style={{ fontSize: 13, color: "var(--fg-3)", lineHeight: 1.25, marginBottom: 16 }}>
          {selectedInfo.detail}
        </p>

        {selected.feedback ? (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 8 }}>Feedback</div>
            <p style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.25, margin: 0, whiteSpace: "pre-wrap" }}>
              {selected.feedback}
            </p>
          </div>
        ) : selected.score !== undefined ? (
          <p style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 8 }}>
            Run the quality pipeline for detailed feedback on this checkpoint.
          </p>
        ) : null}

        {selected.issues && selected.issues.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 8 }}>Issues Found</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {selected.issues.map((issue, i) => (
                <li key={i} style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.25 }}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "var(--cornflower)", marginBottom: 16 }}>
        QUALITY PIPELINE
      </div>
      <p style={{ fontSize: 13, color: "var(--fg-3)", lineHeight: 1.25, marginBottom: 16, marginTop: -8 }}>
        Your content ran through the full quality pipeline. Open any step to see its evaluation.
      </p>
      <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 12, color: "var(--fg-3)" }}>
        <span><span style={{ color: "#50c8a0", fontWeight: 700 }}>80+</span> Strong</span>
        <span><span style={{ color: "var(--gold)", fontWeight: 700 }}>60-79</span> Needs work</span>
        <span><span style={{ color: "#E53935", fontWeight: 700 }}>&lt;60</span> Needs attention</span>
      </div>

      <div style={{ display: isMobile ? "flex" : "grid", gridTemplateColumns: "1fr 360px", flexDirection: "column", gap: 16, marginBottom: showTotal ? 24 : 0 }}>
        {/* Left: Checkpoint cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {gates.map((g, i) => {
            const info = SPECIALIST_INFO[g.index];
            if (!info) return null;
            const isVisible = !isAnimating || i < visibleCount;
            const isRevealed = !isAnimating || i < revealedCount;
            const isSelected = selectedIndex === i;
            if (!isVisible) return null;

            const card = (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedIndex(isSelected ? null : i)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background: isSelected ? "var(--glass-card)" : "transparent",
                  border: "1px solid",
                  borderColor: isSelected ? info.color : "var(--glass-border)",
                  borderLeft: isSelected ? `3px solid ${info.color}` : "1px solid var(--glass-border)",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontFamily: "'Afacad Flux', sans-serif",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                  boxShadow: "none",
                  animation: isAnimating && g.status === "processing" ? "pulse 2s ease-in-out infinite" : "none",
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--glass-surface)"; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ width: 28, height: 28, borderRadius: 6, background: info.color + "18", color: info.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {"\u2022"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{info.name}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{info.role}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {isRevealed && g.score !== undefined ? (
                    <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor(g.score), fontVariantNumeric: "tabular-nums" }}>
                      {g.score}
                    </span>
                  ) : isRevealed && g.status === "pass" ? (
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#50c8a0" }}>Pass</span>
                  ) : null}
                  {statusIcon(g)}
                </div>
              </button>
            );

            // Mobile: inline expand
            if (isMobile && isSelected) {
              return (
                <div key={i}>
                  {card}
                  <div style={{ background: "var(--glass-card)", border: "1px solid var(--glass-border)", borderTop: "none", borderRadius: "0 0 8px 8px", marginTop: -1 }}>
                    {renderDetailPanel()}
                  </div>
                </div>
              );
            }

            return card;
          })}
        </div>

        {/* Right: Detail panel (desktop only) */}
        {!isMobile && (
          <div style={{ background: "var(--glass-card)", border: "1px solid var(--glass-border)", borderRadius: 12, minHeight: 200, position: "sticky", top: 80, alignSelf: "start", backdropFilter: "var(--glass-blur-light)", WebkitBackdropFilter: "var(--glass-blur-light)" }}>
            {renderDetailPanel()}
          </div>
        )}
      </div>

      {/* Total score */}
      {showTotal && totalScore !== undefined && (
        <div style={{ textAlign: "center", padding: "24px 0", borderTop: "1px solid var(--glass-border)" }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: totalScore >= threshold ? "#50c8a0" : totalScore >= 700 ? "var(--gold)" : "#E53935", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
            {totalScore}
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>
            Publication threshold: {threshold}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: totalScore >= threshold ? "#50c8a0" : "var(--fg-2)", marginTop: 8 }}>
            {totalScore >= threshold ? "Ready to publish" : (() => {
              const scored = gates.filter(g => g.score !== undefined).sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
              const lowest = scored.slice(0, 2);
              if (lowest.length === 0) return "Below threshold. Revisions recommended.";
              const names = lowest.map(g => {
                const info = SPECIALIST_INFO[g.index];
                return info ? info.name : null;
              }).filter(Boolean);
              return `Focus on improving ${names.join(" and ")} to reach the publication threshold.`;
            })()}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(74,144,217,0); }
          50% { box-shadow: 0 0 0 4px rgba(74,144,217,0.1); }
        }
      `}</style>
    </div>
  );
}
