import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { useMobile } from "../../hooks/useMobile";
import { getVoiceTraitDeepDive } from "../../lib/voiceTraitDeepDives";
import { DnaNav } from "../../components/studio/DnaNav";
import "./shared.css";

const VOICE_QUESTIONS = [
  "When people describe you, do they see you as more formal or more casual? Do you agree with them?",
  "When you are at your best in a conversation, how would you describe your energy?",
  "When you write something you are proud of, do the sentences tend to be short and punchy, long and flowing, or a mix?",
  "Do you tend to start with the point and then support it, or build up a story and arrive at the point?",
  "Are there words or phrases you find yourself using again and again? Things people associate with you?",
  "Are there words or phrases you hate? Things that make you cringe when AI writes them?",
  "How does humor show up in your communication, if it does at all?",
  "What do you believe about your field that most people get wrong?",
  "When you write or speak, who are you really talking to? Not the broadest audience, the specific person you imagine reading it?",
  "When you disagree with someone, how do you typically handle it in writing?",
  "If you were writing a LinkedIn post right now, how would you start it? Give me the first line.",
  "Read this sentence: \"Innovation requires us to leverage synergies across our ecosystem.\" How does it make you feel, and why?",
];

function scoreToLabel(score: number): string {
  if (score <= 20) return "Minimal";
  if (score <= 40) return "Light";
  if (score <= 60) return "Moderate";
  if (score <= 80) return "Strong";
  return "Dominant";
}

interface TraitSet {
  vocabulary_and_syntax: number;
  tonal_register: number;
  rhythm_and_cadence: number;
  metaphor_patterns: number;
  structural_habits: number;
}

const TRAIT_META: { key: keyof TraitSet; label: string; strengthPhrase: string; distinctionPhrase: string; explanations: Record<string, string> }[] = [
  {
    key: "vocabulary_and_syntax", label: "Vocabulary and Syntax",
    strengthPhrase: "precise, intentional word choice", distinctionPhrase: "instinct over ornamentation in vocabulary",
    explanations: {
      Dominant: "You use precise, intentional word choices. Reed will match this specificity.",
      Strong: "Your word choice is deliberate. Reed will maintain your level of formality.",
      Moderate: "You balance specialized and accessible language. Reed will mirror this range.",
      default: "You keep your language simple and direct. Reed will avoid jargon.",
    },
  },
  {
    key: "tonal_register", label: "Tonal Register",
    strengthPhrase: "a distinctive tonal identity", distinctionPhrase: "tonal range that shifts with context",
    explanations: {
      Dominant: "You have a strong, recognizable tone. Reed will preserve its distinctiveness.",
      Strong: "Your tone is consistent and confident. Reed will maintain that register.",
      Moderate: "You shift tone with context. Reed will adapt to match the situation.",
      default: "You favor a neutral, even tone. Reed will keep things understated.",
    },
  },
  {
    key: "rhythm_and_cadence", label: "Rhythm and Cadence",
    strengthPhrase: "strong rhythmic patterns that carry ideas forward", distinctionPhrase: "content-first pacing over musical rhythm",
    explanations: {
      Dominant: "Your writing has a strong rhythmic signature. Reed will match your pacing.",
      Strong: "You write with clear momentum. Reed will carry that forward in drafts.",
      Moderate: "Your rhythm varies with the content. Reed will follow your lead.",
      default: "You prioritize clarity over rhythm. Reed will keep sentences functional.",
    },
  },
  {
    key: "metaphor_patterns", label: "Metaphor Patterns",
    strengthPhrase: "vivid metaphor to make abstract ideas tangible", distinctionPhrase: "direct language over figurative expression",
    explanations: {
      Dominant: "You use vivid metaphors to make ideas concrete. Reed will lean into this.",
      Strong: "You reach for figurative language when it earns its place. Reed will do the same.",
      Moderate: "You use metaphor selectively. Reed will mirror that restraint.",
      default: "You prefer direct language. Reed will avoid unnecessary figurative expression.",
    },
  },
  {
    key: "structural_habits", label: "Structural Habits",
    strengthPhrase: "structurally driven writing with clear architecture", distinctionPhrase: "organic flow over rigid structure",
    explanations: {
      Dominant: "You build with clear architecture. Reed will create structured, deliberate drafts.",
      Strong: "Your writing has a clear shape. Reed will maintain that organizational logic.",
      Moderate: "You balance structure with flow. Reed will find the right mix.",
      default: "You favor organic flow over rigid structure. Reed will keep things conversational.",
    },
  },
];

function getTraitExplanation(meta: typeof TRAIT_META[number], score: number): string {
  const label = scoreToLabel(score);
  return meta.explanations[label] || meta.explanations.default;
}

function buildNarrativeSummary(traits: TraitSet): string {
  const entries = TRAIT_META.map(m => ({ ...m, score: traits[m.key] || 0 }));
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];
  const secondHighest = sorted[1];

  return [
    `Your writing leans on ${highest.strengthPhrase}.`,
    secondHighest.score > 40
      ? `You also show ${scoreToLabel(secondHighest.score).toLowerCase()} ${secondHighest.label.toLowerCase()}, giving your voice a layered quality.`
      : `That single dominant trait gives your voice a focused, recognizable quality.`,
    `Where others rely on ${lowest.label.toLowerCase()}, you favor ${lowest.distinctionPhrase}, and that is part of what makes your voice yours.`,
  ].join(" ");
}

function TraitBar({
  label,
  score,
  delay,
  explanation,
  isMobile,
  traitKey,
}: {
  label: string;
  score: number;
  delay: number;
  explanation: string;
  isMobile: boolean;
  traitKey: keyof TraitSet;
}) {
  const deep = getVoiceTraitDeepDive(traitKey);
  const indent = isMobile ? 0 : 196;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontFamily: "var(--font)", fontSize: isMobile ? 12 : 14, fontWeight: 500, color: "var(--fg)", width: isMobile ? 120 : 180, flexShrink: 0 }}>{label}</div>
        <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(0,0,0,0.04)", overflow: "hidden" }}>
          <div style={{ width: `${score}%`, height: "100%", overflow: "hidden", borderRadius: 4 }}>
            <div
              style={{
                height: "100%",
                width: "100%",
                borderRadius: 4,
                background: "var(--gold)",
                animation: "barFill 0.8s ease forwards",
                animationDelay: `${delay}ms`,
                transformOrigin: "left",
              }}
            />
          </div>
        </div>
        <div style={{ fontFamily: "var(--font)", fontSize: 13, fontWeight: 600, color: "var(--gold)", width: 72, textAlign: "right" }}>{scoreToLabel(score)}</div>
      </div>
      <div style={{ marginLeft: indent, fontSize: 12, color: "var(--fg-3)", lineHeight: 1.5, marginTop: 4 }}>
        {explanation}
      </div>
      {deep ? (
        <details
          style={{
            marginTop: 8,
            marginLeft: indent,
            borderRadius: 10,
            border: "1px solid var(--glass-border)",
            background: "rgba(0,0,0,0.02)",
            padding: "8px 12px",
          }}
        >
          <summary
            style={{
              fontFamily: "var(--font)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--gold)",
              cursor: "pointer",
            }}
          >
            Full guide: {deep.label}
          </summary>
          <p style={{ fontFamily: "var(--font)", fontSize: 12, color: "var(--fg-3)", lineHeight: 1.55, margin: "10px 0 8px" }}>
            {deep.tagline}
          </p>
          <p style={{ fontFamily: "var(--font)", fontSize: 12, color: "var(--fg-2)", lineHeight: 1.55, margin: "0 0 8px" }}>{deep.summary}</p>
          {deep.paragraphs.map((p, i) => (
            <p key={i} style={{ fontFamily: "var(--font)", fontSize: 13, color: "var(--fg-2)", lineHeight: 1.65, margin: "0 0 10px" }}>
              {p}
            </p>
          ))}
        </details>
      ) : null}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "var(--font)", fontSize: 10, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.08em",
      color: "var(--fg-3)", marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section style={{
      background: "var(--glass-card)", border: "1px solid var(--glass-border)",
      borderRadius: 12, padding: 32, marginBottom: 24,
      backdropFilter: "var(--glass-blur-light)", WebkitBackdropFilter: "var(--glass-blur-light)",
      ...style,
    }}>
      {children}
    </section>
  );
}

export default function VoiceDnaSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useMobile();
  const [voiceDna, setVoiceDna] = useState<any>(null);
  const [voiceDnaMd, setVoiceDnaMd] = useState("");
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [method, setMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [interviewOpen, setInterviewOpen] = useState(false);

  // CO_038C WS10: scroll lives inside the canonical flex+minHeight wrapper below.
  // The previous imperative `.studio-main-inner` overflow patch is removed; the
  // wrapper now scrolls inside the stage canvas per the viewport-lock contract.

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("voice_dna, voice_dna_md, voice_dna_completed, voice_dna_completed_at, voice_dna_method")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.voice_dna) setVoiceDna(data.voice_dna);
        if (data?.voice_dna_md) setVoiceDnaMd(data.voice_dna_md);
        if (data?.voice_dna_completed_at) setCompletedAt(data.voice_dna_completed_at);
        if (data?.voice_dna_method) setMethod(data.voice_dna_method);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, fontFamily: "var(--font)" }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", padding: isMobile ? "20px 16px 100px" : "32px 24px 80px" }}>
            <DnaNav />
            <p style={{ fontSize: 14, color: "var(--fg-3)" }}>Loading Voice DNA...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!voiceDna) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, fontFamily: "var(--font)" }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", padding: isMobile ? "20px 16px 100px" : "32px 24px 80px" }}>
            <DnaNav />
            <header style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: "var(--font)", fontSize: 28, fontWeight: 700, color: "var(--fg)", margin: 0, letterSpacing: "-0.02em" }}>
                Voice DNA
              </h1>
            </header>
            <Card>
              <p style={{ fontSize: 15, color: "var(--fg-2)", margin: "0 0 20px", lineHeight: 1.6 }}>
                Your Voice DNA has not been captured yet. Voice DNA teaches Reed how you communicate so every piece of content sounds like you wrote it.
              </p>
              <button
                onClick={() => navigate("/onboarding?retrain=voice")}
                style={{
                  background: "var(--gold-bright)", color: "var(--fg)", border: "none",
                  borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600,
                  cursor: "pointer", fontFamily: "var(--font)",
                }}
              >
                Set Up Voice DNA
              </button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const traits: TraitSet = voiceDna.traits || {
    vocabulary_and_syntax: 0, tonal_register: 0, rhythm_and_cadence: 0,
    metaphor_patterns: 0, structural_habits: 0,
  };

  const formattedDate = completedAt
    ? new Date(completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const interviewResponses: Record<string, string> | undefined = voiceDna.interview_responses;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, fontFamily: "var(--font)" }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: isMobile ? "20px 16px 100px" : "32px 24px 80px" }}>
          <DnaNav />
          {/* HEADER */}
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font)", fontSize: 28, fontWeight: 700, color: "var(--fg)", margin: 0, letterSpacing: "-0.02em" }}>
          Voice DNA
        </h1>
        <p style={{ fontFamily: "var(--font)", fontSize: 14, color: "var(--fg-2)", marginTop: 4, marginBottom: 0 }}>
          How the system learns to write like you
        </p>
      </header>

      {/* SECTION A: Your Voice DNA */}
      <Card>
        <SectionLabel>Your Voice DNA</SectionLabel>
        {formattedDate && (
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 12 }}>
            Captured via {method || "interview"} on {formattedDate}
          </div>
        )}
        <p style={{ fontFamily: "var(--font)", fontSize: 15, lineHeight: 1.7, color: "var(--fg-2)", margin: 0 }}>
          {voiceDna.voice_description || buildNarrativeSummary(traits)}
        </p>
      </Card>

      {/* SECTION B: Voice Layers */}
      <Card>
        <SectionLabel>Voice Layers</SectionLabel>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 20 }}>
          {[
            { label: "Voice Layer", desc: "How you sound: sentence structure, rhythm, pacing" },
            { label: "Value Layer", desc: "What you believe: positions, convictions, worldview" },
            { label: "Personality Layer", desc: "How you show up: warmth, edge, humor, gravity" },
          ].map(layer => (
            <div key={layer.label} style={{ flex: "1 1 160px", minWidth: 140 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>{layer.label}</div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", lineHeight: 1.5 }}>{layer.desc}</div>
            </div>
          ))}
        </div>
        {voiceDna.value_description && (
          <p style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.6, margin: "0 0 8px" }}>
            {voiceDna.value_description}
          </p>
        )}
        {voiceDna.personality_description && (
          <p style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.6, margin: 0 }}>
            {voiceDna.personality_description}
          </p>
        )}
      </Card>

      {/* SECTION C: Trait Profile */}
      <Card>
        <SectionLabel>Trait Profile</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {TRAIT_META.map((t, i) => (
            <TraitBar
              key={t.key}
              traitKey={t.key}
              label={t.label}
              score={traits[t.key] || 0}
              delay={i * 100}
              explanation={getTraitExplanation(t, traits[t.key] || 0)}
              isMobile={isMobile}
            />
          ))}
        </div>
        <p style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.6, margin: "8px 0 0" }}>
          {buildNarrativeSummary(traits)}
        </p>
      </Card>

      {/* SECTION D: Your Signature */}
      <Card>
        <SectionLabel>Your Signature</SectionLabel>
        {voiceDna.signature_phrases && voiceDna.signature_phrases.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-3)", marginBottom: 6 }}>Phrases Reed will use</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {voiceDna.signature_phrases.map((p: string, i: number) => (
                <span key={i} style={{
                  padding: "4px 10px", borderRadius: 16, fontSize: 13,
                  background: "rgba(245,198,66,0.08)", border: "1px solid rgba(245,198,66,0.15)",
                  color: "var(--fg)", fontFamily: "var(--font)",
                }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
        {voiceDna.prohibited_words && voiceDna.prohibited_words.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-3)", marginBottom: 6 }}>Words Reed will never use</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {voiceDna.prohibited_words.map((w: string, i: number) => (
                <span key={i} style={{
                  padding: "4px 10px", borderRadius: 16, fontSize: 13,
                  background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.12)",
                  color: "var(--fg-2)", fontFamily: "var(--font)",
                }}>
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}
        {voiceDna.contraction_frequency && (
          <div style={{ fontSize: 14, color: "var(--fg-2)", marginBottom: 6 }}>
            Contraction usage: <span style={{ fontWeight: 600, color: "var(--fg)" }}>{voiceDna.contraction_frequency}</span>
          </div>
        )}
        {voiceDna.sentence_length_avg && (
          <div style={{ fontSize: 14, color: "var(--fg-2)", marginBottom: 6 }}>
            Average sentence length: <span style={{ fontWeight: 600, color: "var(--fg)" }}>{voiceDna.sentence_length_avg}</span>
          </div>
        )}
        {voiceDna.emotional_register && (
          <div style={{ fontSize: 14, color: "var(--fg-2)" }}>
            Emotional register: <span style={{ fontWeight: 600, color: "var(--fg)" }}>{voiceDna.emotional_register}</span>
          </div>
        )}
      </Card>

      {/* SECTION E: Interview Responses (collapsible) or Upload note */}
      {(method === "interview" || voiceDna.method === "interview") && interviewResponses && Object.keys(interviewResponses).length > 1 ? (
        <Card>
          <button
            onClick={() => setInterviewOpen(!interviewOpen)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "var(--font)", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase" as const,
              color: "var(--fg-3)", padding: 0,
            }}
          >
            <span style={{
              display: "inline-block",
              transform: interviewOpen ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
              fontSize: 12,
            }}>&#9654;</span>
            Your Interview Responses
          </button>

          {interviewOpen && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 20 }}>
              {Object.entries(interviewResponses)
                .sort(([a], [b]) => {
                  const numA = parseInt(a.replace(/\D/g, "")) || 0;
                  const numB = parseInt(b.replace(/\D/g, "")) || 0;
                  return numA - numB;
                })
                .slice(1)
                .map(([key, answer], index) => (
                  <div key={key}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-3)", marginBottom: 6, lineHeight: 1.5 }}>
                      {VOICE_QUESTIONS[index] || `Question ${index + 1}`}
                    </div>
                    <div style={{ fontSize: 14, color: "var(--fg)", lineHeight: 1.65 }}>
                      {answer as string}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>
      ) : (method === "upload" || voiceDna.method === "upload") ? (
        <Card>
          <SectionLabel>Source Material</SectionLabel>
          <p style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.65, margin: 0 }}>
            Voice DNA was captured from uploaded writing samples. Reed uses these samples to match your natural voice across all content.
          </p>
        </Card>
      ) : null}

      {/* SECTION F: Retrain */}
      <Card style={{ marginBottom: 0 }}>
        <SectionLabel>Retrain</SectionLabel>
        <p style={{ fontSize: 14, color: "var(--fg-2)", margin: "0 0 16px", lineHeight: 1.6 }}>
          Re-run the voice interview or upload new writing samples to improve how Reed matches your voice.
        </p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("This will replace your current Voice DNA. Your existing profile will be archived. Continue?")) {
              navigate("/onboarding?retrain=voice");
            }
          }}
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
          Retrain Voice DNA
        </button>
      </Card>
        </div>
      </div>
    </div>
  );
}
