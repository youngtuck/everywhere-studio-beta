import { useEffect, useState } from "react";

const CHANNELS = ["LinkedIn", "Newsletter", "Podcast", "Essay"];

export default function EverywhereScene({ isActive }: { isActive: boolean }) {
  const [textVisible, setTextVisible] = useState(false);
  const [visibleChannels, setVisibleChannels] = useState(0);

  useEffect(() => {
    if (!isActive) return;
    const t1 = setTimeout(() => setTextVisible(true), 400);
    const intervals: ReturnType<typeof setTimeout>[] = [];
    CHANNELS.forEach((_, i) => {
      intervals.push(setTimeout(() => setVisibleChannels(i + 1), 800 + i * 500));
    });
    return () => { clearTimeout(t1); intervals.forEach(clearTimeout); };
  }, [isActive]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, height: 400 }}>
      {/* Channel cards fanning out */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
        {CHANNELS.map((name, i) => {
          const visible = i < visibleChannels;
          return (
            <div key={name} style={{
              width: 100, height: 120, borderRadius: 8,
              background: visible ? "rgba(200, 150, 26, 0.08)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${visible ? "rgba(200, 150, 26, 0.2)" : "rgba(255,255,255,0.05)"}`,
              display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 10,
              opacity: visible ? 1 : 0.2,
              transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.9)",
              transition: "all 0.5s ease",
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: visible ? "rgba(200,150,26,0.8)" : "rgba(255,255,255,0.2)", fontFamily: "'Inter', sans-serif", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
                {name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Text */}
      <div style={{
        textAlign: "center", maxWidth: 360,
        opacity: textVisible ? 1 : 0, transform: textVisible ? "translateY(0)" : "translateY(12px)",
        transition: "all 0.8s ease",
      }}>
        <p style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.4, margin: "0 0 12px", fontFamily: "'Inter', sans-serif" }}>
          One idea. Everywhere.
        </p>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0, fontFamily: "'Inter', sans-serif" }}>
          The output is yours because the input was yours.
        </p>
      </div>
    </div>
  );
}
