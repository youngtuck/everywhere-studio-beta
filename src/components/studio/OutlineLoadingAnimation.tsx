import { useState, useEffect } from "react";

const MESSAGES = [
  "Breaking the story...",
  "Mapping the structure...",
  "Finding the arc...",
  "Building your beat sheet...",
];

const CSS = `
@keyframes outlineBarGrow {
  from { width: 0; opacity: 0; }
  to { opacity: 0.4; }
}
@keyframes outlineBarFade {
  0%, 80% { opacity: 0.4; }
  100% { opacity: 0.15; }
}
@keyframes outlineFadeText {
  0%, 10% { opacity: 0; transform: translateY(4px); }
  20%, 80% { opacity: 1; transform: translateY(0); }
  90%, 100% { opacity: 0; transform: translateY(-4px); }
}
`;

const BAR_WIDTHS = [75, 60, 80, 55, 70];

export default function OutlineLoadingAnimation() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const msgInterval = setInterval(() => setMsgIndex(i => (i + 1) % MESSAGES.length), 3000);
    const cycleInterval = setInterval(() => setCycle(c => c + 1), 4000);
    return () => { clearInterval(msgInterval); clearInterval(cycleInterval); };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
      <style>{CSS}</style>
      <div style={{ width: 200, display: "flex", flexDirection: "column", gap: 10 }}>
        {BAR_WIDTHS.map((w, i) => (
          <div
            key={`${cycle}-${i}`}
            style={{
              height: 3,
              borderRadius: 2,
              background: "var(--gold)",
              width: `${w}%`,
              animation: `outlineBarGrow 0.6s ease-out ${i * 0.4}s both, outlineBarFade 4s ease ${i * 0.4 + 0.6}s both`,
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 14, color: "var(--text-secondary)", fontFamily: "'Afacad Flux', sans-serif", textAlign: "center", minHeight: 20 }}>
        <span key={msgIndex} style={{ animation: "outlineFadeText 3s ease-in-out", display: "inline-block" }}>
          {MESSAGES[msgIndex]}
        </span>
      </div>
    </div>
  );
}
