interface PipelineBlockedAlertProps {
  blockedAt?: string;
  feedback?: string;
}

export function PipelineBlockedAlert({ blockedAt, feedback }: PipelineBlockedAlertProps) {
  if (!blockedAt && !feedback) return null;

  return (
    <div
      style={{
        marginTop: 16,
        padding: 14,
        borderRadius: 10,
        border: "1px solid rgba(185,28,28,0.3)",
        background: "rgba(185,28,28,0.06)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#b91c1c",
          marginBottom: 4,
        }}
      >
        Quality pipeline blocked
      </div>
      {blockedAt && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "#b91c1c",
            marginBottom: 4,
          }}
        >
          {blockedAt}
        </div>
      )}
      {feedback && (
        <div
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            whiteSpace: "pre-wrap",
          }}
        >
          {feedback}
        </div>
      )}
    </div>
  );
}

