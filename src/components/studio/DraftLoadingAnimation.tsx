import { useState, useEffect } from "react";

const MESSAGES = [
  "Writing your first draft...",
  "Your voice, your ideas, your words...",
  "Following the beat sheet...",
  "Crafting the opening hook...",
];

const CSS = `
@keyframes draftLineFill {
  from { width: 0; }
}
@keyframes draftCursorBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
@keyframes draftBlockFade {
  0%, 85% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes draftFadeText {
  0%, 10% { opacity: 0; transform: translateY(4px); }
  20%, 80% { opacity: 1; transform: translateY(0); }
  90%, 100% { opacity: 0; transform: translateY(-4px); }
}
`;

const LINE_WIDTHS = [90, 85, 70, 95, 60, 80, 75, 88];

export default function DraftLoadingAnimation() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const msgInterval = setInterval(() => setMsgIndex(i => (i + 1) % MESSAGES.length), 3000);
    const cycleInterval = setInterval(() => setCycle(c => c + 1), 14000);
    return () => { clearInterval(msgInterval); clearInterval(cycleInterval); };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <style>{CSS}</style>
      <div
        style={{
          width: 300, height: 180, borderRadius: 12,
          background: "var(--surface)", border: "1px solid var(--line)",
          padding: 20, display: "flex", flexDirection: "column", gap: 8,
          overflow: "hidden",
          animation: `draftBlockFade 14s ease infinite`,
        }}
        key={cycle}
      >
        {LINE_WIDTHS.map((w, i) => (
          <div key={i} style={{ position: "relative", height: 8 }}>
            <div
              style={{
                height: "100%",
                borderRadius: 4,
                background: "var(--text-primary)",
                opacity: 0.12,
                width: `${w}%`,
                animation: `draftLineFill 1.5s ease-out ${i * 1.3}s both`,
              }}
            />
            {/* Cursor at leading edge of current line */}
            {i === Math.floor((Date.now() / 1300) % LINE_WIDTHS.length) && (
              <div style={{
                position: "absolute", top: 0, right: `${100 - w}%`,
                width: 2, height: "100%", background: "var(--gold)",
                animation: "draftCursorBlink 0.8s step-end infinite",
              }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 14, color: "var(--text-secondary)", fontFamily: "'Afacad Flux', sans-serif", textAlign: "center", minHeight: 20 }}>
        <span key={msgIndex} style={{ animation: "draftFadeText 3s ease-in-out", display: "inline-block" }}>
          {MESSAGES[msgIndex]}
        </span>
      </div>
    </div>
  );
}
