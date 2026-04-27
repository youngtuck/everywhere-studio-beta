import { useState } from "react";
import type { GateResult } from "../../lib/agents/types";

function CopyFeedbackButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async (e) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      title="Copy feedback"
      style={{
        width: 28,
        height: 28,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 6,
        border: "1px solid var(--line)",
        background: copied ? "#50c8a0" : "transparent",
        color: copied ? "#fff" : "var(--fg-3)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        flexShrink: 0,
        padding: 0,
      }}
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      )}
    </button>
  );
}

interface CheckpointResultsPanelProps {
  results: GateResult[];
  blockedAt?: string;
}

export function CheckpointResultsPanel({ results, blockedAt }: CheckpointResultsPanelProps) {
  if (!results.length) return null;

  return (
    <div
      style={{
        marginTop: 24,
        padding: 20,
        borderRadius: 12,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Quality Checkpoints
        </div>
        {blockedAt && (
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#b91c1c",
            }}
          >
            Blocked at {blockedAt}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {results.map((result) => {
          const isFail = result.status === "FAIL";
          const isFlag = result.status === "FLAG";
          const color =
            result.status === "PASS"
              ? "var(--work-teal)"
              : isFail
                ? "#b91c1c"
                : "var(--gold)";
          return (
            <details
              key={`${result.gate}-${result.score}-${result.status}`}
              style={{
                borderRadius: 8,
                border: "1px solid var(--line)",
                padding: "8px 10px",
                background: "rgba(0,0,0,0.01)",
              }}
            >
              <summary
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  listStyle: "none",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: color,
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {result.gate}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      color: color,
                      fontWeight: 600,
                    }}
                  >
                    {result.score}%
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      color: "var(--text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {result.status}
                  </span>
                </div>
              </summary>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  whiteSpace: "pre-wrap",
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1 }}>
                  {result.feedback}
                  {result.methodologyTermFidelity ? (
                    <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-tertiary)" }}>
                      Method term fidelity: {result.methodologyTermFidelity}
                    </div>
                  ) : null}
                </div>
                {result.feedback && (
                  <CopyFeedbackButton text={`${result.gate} (${result.score}/100, ${result.status})\n\n${result.feedback}${result.methodologyTermFidelity ? `\n\nMethod term fidelity: ${result.methodologyTermFidelity}` : ""}${result.issues?.length ? "\n\nIssues:\n" + result.issues.map(i => `- ${i}`).join("\n") : ""}`} />
                )}
              </div>
              {result.issues && result.issues.length > 0 && (
                <ul
                  style={{
                    marginTop: 6,
                    paddingLeft: 18,
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                  }}
                >
                  {result.issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              )}
            </details>
          );
        })}
      </div>
    </div>
  );
}
