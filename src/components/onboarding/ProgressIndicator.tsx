import type { CSSProperties } from "react";

interface ProgressIndicatorProps {
  currentStep: number; // 1-based
  totalSteps: number;
}

export function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  const clampedStep = Math.min(Math.max(currentStep, 1), totalSteps);
  const pct = (clampedStep / totalSteps) * 100;

  const barTrack: CSSProperties = {
    width: "100%",
    height: 3,
    borderRadius: 999,
    background: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  };

  const barFill: CSSProperties = {
    height: "100%",
    width: `${pct}%`,
    background: "#C8961A",
    transition: "width 0.3s cubic-bezier(.16,1,.3,1)",
  };

  return (
    <div style={{ width: "100%", maxWidth: 640, margin: "0 auto 32px" }}>
      <div style={barTrack}>
        <div style={barFill} />
      </div>
    </div>
  );
}

