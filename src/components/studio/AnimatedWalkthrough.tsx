import { useState, useEffect } from "react";
import WelcomeScene from "./scenes/WelcomeScene";
import ReedScene from "./scenes/ReedScene";
import RoomScene from "./scenes/RoomScene";
import CheckpointsScene from "./scenes/CheckpointsScene";
import EverywhereScene from "./scenes/EverywhereScene";

const STEPS = [WelcomeScene, ReedScene, RoomScene, CheckpointsScene, EverywhereScene];

export default function AnimatedWalkthrough({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [showNav, setShowNav] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowNav(true), 3500);
    return () => clearTimeout(timer);
  }, [step]);

  const advance = () => {
    if (step >= STEPS.length - 1) {
      onComplete();
      return;
    }
    setTransitioning(true);
    setShowNav(false);
    setTimeout(() => {
      setStep(s => s + 1);
      setTransitioning(false);
    }, 300);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
      e.preventDefault();
      advance();
    }
    if (e.key === "Escape") onComplete();
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const CurrentScene = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0, 0, 0, 0.92)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        fontFamily: "'Afacad Flux', sans-serif",
      }}
      onClick={advance}
    >
      {/* Scene */}
      <div style={{
        opacity: transitioning ? 0 : 1,
        transition: "opacity 0.3s ease",
      }}>
        <CurrentScene isActive={!transitioning} />
      </div>

      {/* Navigation */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "absolute", bottom: 40, left: 0, right: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 48px",
          opacity: showNav ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      >
        {/* Skip */}
        <button
          onClick={onComplete}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 13, color: "rgba(255,255,255,0.35)",
            fontFamily: "'Afacad Flux', sans-serif",
            transition: "color 0.15s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
        >
          Skip tour
        </button>

        {/* Step dots */}
        <div style={{ display: "flex", gap: 6 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: i === step ? "var(--gold)" : "rgba(255,255,255,0.2)",
              transition: "background 0.3s ease",
            }} />
          ))}
        </div>

        {/* Next / Finish */}
        <button
          onClick={advance}
          style={{
            padding: isLast ? "10px 24px" : "8px 20px",
            borderRadius: 8,
            border: "none",
            background: isLast ? "var(--gold)" : "rgba(255,255,255,0.1)",
            color: isLast ? "var(--fg)" : "rgba(255,255,255,0.7)",
            fontSize: 14,
            fontWeight: isLast ? 600 : 500,
            cursor: "pointer",
            fontFamily: "'Afacad Flux', sans-serif",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = isLast ? "var(--gold)" : "rgba(255,255,255,0.15)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = isLast ? "var(--gold)" : "rgba(255,255,255,0.1)"; }}
        >
          {isLast ? "Start your first session" : "Next"}
        </button>
      </div>
    </div>
  );
}
