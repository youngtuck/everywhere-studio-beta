import type { PipelineStatus } from "../../lib/agents/types";

interface PipelineProgressProps {
  status: PipelineStatus;
  currentStage?: string;
  blockedAt?: string;
}

const STAGES = [
  { id: "checkpoints", label: "Checkpoints 0-6" },
  { id: "forecast", label: "Impact Score" },
  { id: "wrap", label: "Wrap" },
  { id: "qa", label: "QA" },
  { id: "complete", label: "Completeness" },
] as const;

export function PipelineProgress({ status, currentStage, blockedAt }: PipelineProgressProps) {
  if (status === "IDLE") return null;

  return (
    <div
      style={{
        marginTop: 16,
        padding: 12,
        borderRadius: 10,
        background: "var(--surface-white)",
        border: "1px solid var(--border-subtle)",
        fontFamily: "'Afacad Flux', sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 14,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginBottom: 8,
        }}
      >
        Pipeline
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {STAGES.map((stage, index) => {
          const isCurrent =
            currentStage === stage.id ||
            (stage.id === "complete" && status === "PASSED");
          const isDone =
            status === "PASSED" ||
            (status === "BLOCKED" && stage.id !== currentStage && stage.id !== "complete");

          const bg =
            isCurrent && status === "RUNNING"
              ? "rgba(200,150,26,0.10)"
              : isDone
                ? "rgba(22,163,74,0.08)"
                : "rgba(0,0,0,0.02)";

          const border =
            isCurrent && status === "RUNNING"
              ? "1px solid var(--gold-dark)"
              : isDone
                ? "1px solid rgba(22,163,74,0.4)"
                : "1px solid var(--border-subtle)";

          return (
            <div
              key={stage.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 999,
                background: bg,
                border,
                fontSize: 14,
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background:
                    status === "BLOCKED" && isCurrent
                      ? "#b91c1c"
                      : isDone
                        ? "#16a34a"
                        : "rgba(0,0,0,0.12)",
                }}
              />
              <span>{index + 1}.</span>
              <span>{stage.label}</span>
            </div>
          );
        })}
      </div>
      {blockedAt && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#b91c1c",
          }}
        >
          Blocked at {blockedAt}
        </div>
      )}
    </div>
  );
}

