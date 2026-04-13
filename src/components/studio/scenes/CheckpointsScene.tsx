import { useEffect, useState } from "react";

const CHECKPOINTS = [
  "Voice match",
  "Fact check",
  "Hook strength",
  "AI detection",
  "Editorial standards",
  "Perspective",
  "Impact",
];

export default function CheckpointsScene({ isActive }: { isActive: boolean }) {
  const [textVisible, setTextVisible] = useState(false);
  const [checkedCount, setCheckedCount] = useState(0);

  useEffect(() => {
    if (!isActive) return;
    const t1 = setTimeout(() => setTextVisible(true), 400);
    const intervals: ReturnType<typeof setTimeout>[] = [];
    CHECKPOINTS.forEach((_, i) => {
      intervals.push(setTimeout(() => setCheckedCount(i + 1), 1200 + i * 400));
    });
    return () => { clearTimeout(t1); intervals.forEach(clearTimeout); };
  }, [isActive]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, height: 400 }}>
      {/* Checkpoint checklist */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 220 }}>
        {CHECKPOINTS.map((name, i) => {
          const done = i < checkedCount;
          return (
            <div key={name} style={{
              display: "flex", alignItems: "center", gap: 10,
              opacity: done ? 1 : 0.3,
              transition: "all 0.3s ease",
              transform: done ? "translateX(0)" : "translateX(-4px)",
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%",
                background: done ? "#50c8a0" : "rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.3s ease",
                fontSize: 10, color: "#fff",
              }}>
                {done && "\u2713"}
              </div>
              <span style={{ fontSize: 14, color: done ? "#fff" : "rgba(255,255,255,0.4)", fontFamily: "'Afacad Flux', sans-serif", transition: "color 0.3s ease" }}>
                {name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Text */}
      <div style={{
        textAlign: "center", maxWidth: 400,
        opacity: textVisible ? 1 : 0, transform: textVisible ? "translateY(0)" : "translateY(12px)",
        transition: "all 0.8s ease",
      }}>
        <p style={{ fontSize: 20, fontWeight: 600, color: "#fff", lineHeight: 1.5, margin: "0 0 12px", fontFamily: "'Afacad Flux', sans-serif" }}>
          Reed runs Review. The pipeline does not blink.
        </p>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0, fontFamily: "'Afacad Flux', sans-serif" }}>
          Voice match. Fact check. Hook strength. AI detection. Editorial standards. Nothing ships until the checks clear.
        </p>
      </div>
    </div>
  );
}
