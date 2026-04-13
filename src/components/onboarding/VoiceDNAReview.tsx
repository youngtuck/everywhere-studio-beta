import type { VoiceDNA } from "../../utils/voiceDNAProcessor";
import { getVoiceTraitDeepDive } from "../../lib/voiceTraitDeepDives";

interface VoiceDNAReviewProps {
  data: VoiceDNA;
  onConfirm: () => void;
  onRefine?: () => void;
  onUploadMore?: () => void;
}

const TRAIT_ENTRIES: { key: keyof VoiceDNA["traits"]; label: string; description: string; strengthPhrase: string; distinctionPhrase: string }[] = [
  { key: "vocabulary_and_syntax", label: "Vocabulary and Syntax", description: "Your word choice patterns: formal vs. casual, specialized vs. accessible, complex vs. simple.", strengthPhrase: "precise, intentional word choice", distinctionPhrase: "instinct over ornamentation in vocabulary" },
  { key: "tonal_register", label: "Tonal Register", description: "The emotional temperature of your writing: warm, authoritative, conversational, or analytical.", strengthPhrase: "a distinctive tonal identity", distinctionPhrase: "tonal range that shifts with context" },
  { key: "rhythm_and_cadence", label: "Rhythm and Cadence", description: "How your sentences flow: short punches, long builds, or a mix that creates momentum.", strengthPhrase: "strong rhythmic patterns that carry ideas forward", distinctionPhrase: "content-first pacing over musical rhythm" },
  { key: "metaphor_patterns", label: "Metaphor Patterns", description: "Whether you reach for imagery to explain ideas or keep it concrete and direct.", strengthPhrase: "vivid metaphor to make abstract ideas tangible", distinctionPhrase: "direct language over figurative expression" },
  { key: "structural_habits", label: "Structural Habits", description: "How you organize thoughts: lead with the point, build to it, or layer ideas progressively.", strengthPhrase: "structurally driven writing with clear architecture", distinctionPhrase: "organic flow over rigid structure" },
];

function scoreToLabel(score: number): string {
  if (score <= 20) return "Minimal";
  if (score <= 40) return "Light";
  if (score <= 60) return "Moderate";
  if (score <= 80) return "Strong";
  return "Dominant";
}

function buildNarrativeSummary(traits: VoiceDNA["traits"]): string {
  const scored = TRAIT_ENTRIES
    .map(t => ({ ...t, score: traits?.[t.key] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const highest = scored[0];
  const lowest = scored[scored.length - 1];
  const secondHighest = scored[1];

  const sentences = [
    `Your writing leans on ${highest.strengthPhrase}.`,
    secondHighest.score > 40
      ? `You also show ${scoreToLabel(secondHighest.score).toLowerCase()} ${secondHighest.label.toLowerCase()}, giving your voice a layered quality.`
      : `That single dominant trait gives your voice a focused, recognizable quality.`,
    `Where others rely on ${lowest.label.toLowerCase()}, you favor ${lowest.distinctionPhrase}, and that's part of what makes your voice yours.`,
  ];

  return sentences.join(" ");
}

export function VoiceDNAReview({ data, onConfirm, onRefine, onUploadMore }: VoiceDNAReviewProps) {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", color: "#ffffff" }}>
      <h1
        style={{
          fontFamily: "'Afacad Flux', sans-serif",
          fontSize: 36,
          fontWeight: 600,
          margin: "0 0 8px",
        }}
      >
        Your Voice DNA
      </h1>
      <p
        style={{
          fontFamily: "'Afacad Flux', sans-serif",
          fontSize: 14,
          color: "rgba(255,255,255,0.5)",
          margin: "0 0 24px",
          lineHeight: 1.5,
        }}
      >
        This profile captures how you communicate: your patterns, rhythms, and instincts. It's what the system uses to make every piece of content sound like you wrote it.
      </p>

      {/* Narrative summary */}
      <div
        style={{
          marginBottom: 32,
          padding: "20px 24px",
          background: "rgba(200,150,26,0.08)",
          border: "1px solid rgba(200,150,26,0.2)",
          borderRadius: 12,
        }}
      >
        <p
          style={{
            fontFamily: "'Afacad Flux', sans-serif",
            fontSize: 15,
            lineHeight: 1.5,
            color: "rgba(255,255,255,0.85)",
            margin: 0,
          }}
        >
          {buildNarrativeSummary(data.traits)}
        </p>
      </div>

      {/* Trait profile */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontFamily: "'Afacad Flux', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.6)",
            marginBottom: 16,
          }}
        >
          Trait profile
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {TRAIT_ENTRIES.map((item, index) => {
            const score = data.traits?.[item.key] ?? 0;
            const label = scoreToLabel(score);
            const deep = getVoiceTraitDeepDive(item.key);
            return (
              <div key={item.key}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div
                    style={{
                      fontFamily: "'Afacad Flux', sans-serif",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.85)",
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Afacad Flux', sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--gold)",
                    }}
                  >
                    {label}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "'Afacad Flux', sans-serif",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.4)",
                    marginBottom: 8,
                    lineHeight: 1.4,
                  }}
                >
                  {deep?.tagline ?? item.description}
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.max(0, Math.min(100, score))}%`,
                      background: "var(--gold)",
                      transformOrigin: "left",
                      animation: "barFill 0.7s ease forwards",
                      animationDelay: `${index * 80}ms`,
                    }}
                  />
                </div>
                {deep ? (
                  <details
                    style={{
                      marginTop: 10,
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
                      padding: "8px 10px",
                    }}
                  >
                    <summary
                      style={{
                        fontFamily: "'Afacad Flux', sans-serif",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "rgba(245,198,66,0.95)",
                        cursor: "pointer",
                        listStyle: "none",
                      }}
                    >
                      Learn more about {deep.label}
                    </summary>
                    <p
                      style={{
                        fontFamily: "'Afacad Flux', sans-serif",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.5)",
                        lineHeight: 1.5,
                        margin: "10px 0 8px",
                      }}
                    >
                      {deep.summary}
                    </p>
                    {deep.paragraphs.map((p, i) => (
                      <p
                        key={i}
                        style={{
                          fontFamily: "'Afacad Flux', sans-serif",
                          fontSize: 12,
                          color: "rgba(255,255,255,0.72)",
                          lineHeight: 1.55,
                          margin: "0 0 8px",
                        }}
                      >
                        {p}
                      </p>
                    ))}
                  </details>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 32,
        }}
      >
        <button
          type="button"
          onClick={onConfirm}
          style={{
            flex: 1,
            minWidth: 160,
            border: "none",
            borderRadius: 999,
            padding: "14px 18px",
            background: "var(--gold)",
            color: "var(--bg)",
            fontFamily: "'Afacad Flux', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          This sounds like me
        </button>
        {onRefine && (
          <button
            type="button"
            onClick={onRefine}
            style={{
              flex: 1,
              minWidth: 160,
              borderRadius: 999,
              padding: "14px 18px",
              border: "1px solid rgba(255,255,255,0.35)",
              background: "transparent",
              color: "#ffffff",
              fontFamily: "'Afacad Flux', sans-serif",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Let me refine it
          </button>
        )}
        {onUploadMore && (
          <button
            type="button"
            onClick={onUploadMore}
            style={{
              border: "none",
              background: "none",
              color: "rgba(255,255,255,0.65)",
              fontFamily: "'Afacad Flux', sans-serif",
              fontSize: 13,
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Upload more samples
          </button>
        )}
      </div>
    </div>
  );
}
