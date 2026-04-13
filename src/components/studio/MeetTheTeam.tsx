import { useState } from "react";
import { X } from "lucide-react";

interface TeamMember {
  name: string;
  role: string;
  description: string;
}

const REED: TeamMember = {
  name: "Reed",
  role: "First Listener",
  description: "Named for the reading that built him. Built for the writing that matters.",
};

const CHECKPOINT_ROWS = [
  { name: "Deduplication", desc: "Zero redundant content. Catches repeated ideas across paragraphs and sections." },
  { name: "Research Validation", desc: "Every factual claim verified with two independent sources. Hard-blocks on unverified assertions." },
  { name: "Voice Authenticity", desc: "Scores draft against Voice DNA. Target: 95% match or above." },
  { name: "Engagement Optimization", desc: "Opening test: if the lead does not earn the read, the piece does not ship." },
  { name: "SLOP Detection", desc: "Zero AI fingerprints. Catches phrases, patterns, and structures that read as machine-generated." },
  { name: "Editorial Excellence", desc: "Publication-grade writing plus the Stranger Test. Would a stranger who has never heard of you still get value?" },
  { name: "Perspective and Risk", desc: "Cultural sensitivity, blind spots, and the nonviolent communication review." },
];

const REED_CAPABILITIES = [
  { name: "Voice Check", desc: "Compares your draft against your Voice DNA. Flags phrases that do not sound like you." },
  { name: "Strategic Advice", desc: "Surfaces the lenses that matter: Category Design, Positioning, Market Reality." },
  { name: "Challenge This", desc: "Takes the other side and surfaces the strongest counter-argument." },
  { name: "Audience Check", desc: "Are you writing for the right person? Asks before you get too far in." },
  { name: "What Is Next", desc: "Reads where you are in the session and tells you exactly where to focus." },
  { name: "Editorial Review", desc: "Is this ready? Reads the draft as an adversarial editor." },
];

interface DetailView {
  id: string;
  title: string;
  tag: string;
  content: React.ReactNode;
}

function ReedDetailContent() {
  return (
    <>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: 20 }}>
        <p style={{ margin: "0 0 12px" }}>Reed is named for what he does: he reads. Deeply, across your industry, your competitors, and what your audience is saying. He distills what matters into signal you can act on.</p>
        <p style={{ margin: "0 0 12px" }}>Reed does not just surface information. He challenges it. He is skeptical of first answers, because the first answer is almost never the right one. He pushes back not to be difficult, but because he has seen enough weak premises dressed up as insight to know the difference.</p>
        <p style={{ margin: "0 0 12px" }}>Reed is not an assistant. He is a thought partner. He asks better questions than most people do. He remembers what you have said. He connects what you are writing to what is happening in your space. When your writing is strong, he tells you. When it is not, he tells you that too.</p>
        <p style={{ margin: 0, fontWeight: 600 }}>Named for the reading that built him. Built for the writing that matters.</p>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 10 }}>
        CAPABILITIES
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {REED_CAPABILITIES.map((cap, i) => (
          <div key={i} style={{ padding: "10px 12px", border: "1px solid var(--glass-border)", borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>{cap.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>{cap.desc}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function CheckpointsDetailContent() {
  return (
    <>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: 20 }}>
        Review runs a sequence of blocking quality checkpoints. Each gate is binary: if the piece fails, it cannot advance until the issue is resolved. Reed carries the conversation; the pipeline carries the standard.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CHECKPOINT_ROWS.map((cp) => (
          <div key={cp.name} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", background: "#F5C642", marginTop: 6, flexShrink: 0,
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{cp.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{cp.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ImpactScoreDetailContent() {
  return (
    <>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: 20 }}>
        A 1-100 composite score that predicts the strength of a piece before it publishes. The publication threshold is 75. Below 75, the piece is flagged for revision.
      </div>
      <div style={{
        background: "#F0F7FF", borderLeft: "3px solid #4A90D9",
        padding: "10px 14px", borderRadius: "0 6px 6px 0",
      }}>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.75 }}>
          The Impact Score is not a grade. It is a prediction. It asks: given everything Reed knows about your voice, your audience, and your competitive landscape, how likely is this piece to move the needle?
        </div>
      </div>
    </>
  );
}

function HumanVoiceTestDetailContent() {
  return (
    <>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: 20 }}>
        An eight-vector adversarial reader simulation. The test creates eight synthetic readers with different objections, attention spans, and expectations. If any vector fails, the piece is hard-blocked from Approve.
      </div>
      <div style={{
        background: "#FFFBEB", borderLeft: "3px solid #F5C642",
        padding: "10px 14px", borderRadius: "0 6px 6px 0",
      }}>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.75 }}>
          This is the final gate. Everything else can be iterated. The Human Voice Test is pass-fail. If a piece does not sound like a human wrote it with conviction, it does not ship.
        </div>
      </div>
    </>
  );
}

const DETAIL_VIEWS: DetailView[] = [
  { id: "reed", title: "Reed", tag: "FIRST LISTENER", content: <ReedDetailContent /> },
  { id: "checkpoints", title: "Quality checkpoints", tag: "QUALITY SYSTEM", content: <CheckpointsDetailContent /> },
  { id: "impact-score", title: "Impact Score", tag: "SCORING SYSTEM", content: <ImpactScoreDetailContent /> },
  { id: "human-voice-test", title: "Human Voice Test", tag: "ADVERSARIAL SYSTEM", content: <HumanVoiceTestDetailContent /> },
];

const CLICKABLE_SYSTEM_ITEMS = [
  { label: "Quality checkpoints", detailId: "checkpoints" },
  { label: "Impact Score", detailId: "impact-score" },
  { label: "Human Voice Test", detailId: "human-voice-test" },
];

interface MeetTheTeamProps {
  onClose: () => void;
  /** Reserved for future use (e.g. highlight Reed when active in session). */
  activeAgents?: string[];
}

export default function MeetTheTeam({ onClose, activeAgents = [] }: MeetTheTeamProps) {
  const [activeDetail, setActiveDetail] = useState<string | null>(null);
  const detailView = activeDetail ? DETAIL_VIEWS.find(d => d.id === activeDetail) : null;
  const reedActive = activeAgents.includes("Reed");

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
          zIndex: 9998,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Studio overview"
        style={{
          position: "fixed", left: "50%", top: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%", maxWidth: 640, maxHeight: "85vh",
          overflow: "auto", background: "var(--glass-card)",
          borderRadius: 16, border: "1px solid var(--glass-border)",
          boxShadow: "var(--glass-shadow)",
          backdropFilter: "var(--glass-blur-light)",
          WebkitBackdropFilter: "var(--glass-blur-light)",
          zIndex: 9999, fontFamily: "'Afacad Flux', sans-serif",
          padding: "28px 32px",
        }}
      >
        {detailView ? (
          <>
            <button
              type="button"
              onClick={() => setActiveDetail(null)}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: 0,
                fontSize: 10, fontWeight: 700, color: "#4A90D9",
                textTransform: "uppercase", letterSpacing: "0.05em",
                marginBottom: 16, display: "flex", alignItems: "center", gap: 4,
                fontFamily: "inherit",
              }}
            >
              &lt; BACK TO DISCOVER
            </button>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0D1B2A", margin: "0 0 4px" }}>
              {detailView.title}
            </h2>
            <div style={{
              fontSize: 10, fontWeight: 700, color: "#94A3B8",
              textTransform: "uppercase", letterSpacing: "0.1em",
              marginBottom: 20,
            }}>
              {detailView.tag}
            </div>
            {detailView.content}
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
                  Reed, then the pipeline
                </h2>
                <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: "4px 0 0" }}>
                  You work with Reed. Review runs blocking checks you never have to name in a meeting.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-tertiary)" }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {CLICKABLE_SYSTEM_ITEMS.map((item) => (
                <button
                  key={item.detailId}
                  type="button"
                  onClick={() => setActiveDetail(item.detailId)}
                  style={{
                    padding: "8px 14px", borderRadius: 8,
                    border: "1px solid var(--glass-border)", background: "var(--glass-card)",
                    cursor: "pointer", fontSize: 12, fontWeight: 600,
                    color: "var(--text-primary)", fontFamily: "inherit",
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#4A90D9"; e.currentTarget.style.color = "#4A90D9"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--glass-border)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setActiveDetail("reed")}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 10, marginBottom: 20,
                background: reedActive ? "rgba(74,144,217,0.08)" : "transparent",
                border: reedActive ? "1px solid rgba(74,144,217,0.35)" : "1px solid var(--glass-border)",
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              }}
            >
              <span style={{
                width: 32, height: 32, borderRadius: 8, background: "rgba(74,144,217,0.15)", color: "#4A90D9",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>R</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                  {REED.name}
                  <span style={{ fontWeight: 400, color: "var(--text-tertiary)", marginLeft: 8, fontSize: 12 }}>{REED.role}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.45 }}>{REED.description}</div>
              </div>
            </button>

            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
              Watch keeps your category in view. Work moves from Intake through Review with Reed in the room. Wrap turns approved thinking into channel-ready assets. Sentinel runs beside Watch; the rest of the depth stays under the hood.
            </p>
          </>
        )}
      </div>
    </>
  );
}
