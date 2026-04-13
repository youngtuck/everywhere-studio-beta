import { useEffect, useState } from "react";

const CSS = `
@keyframes roomSplit0 { 0% { transform: scale(0); opacity: 0; } 30% { transform: scale(1); opacity: 1; } 100% { transform: rotate(360deg) translateX(50px) rotate(-360deg); } }
@keyframes roomSplit1 { 0% { transform: scale(0); opacity: 0; } 35% { transform: scale(1); opacity: 1; } 100% { transform: rotate(480deg) translateX(40px) rotate(-480deg); } }
@keyframes roomSplit2 { 0% { transform: scale(0); opacity: 0; } 40% { transform: scale(1); opacity: 1; } 100% { transform: rotate(600deg) translateX(45px) rotate(-600deg); } }
@keyframes roomSplit3 { 0% { transform: scale(0); opacity: 0; } 45% { transform: scale(1); opacity: 1; } 100% { transform: rotate(720deg) translateX(35px) rotate(-720deg); } }
@keyframes outlineReveal { from { width: 0; opacity: 0; } to { opacity: 0.4; } }
`;

const ORBS = [
  { color: "#6B7FF2", anim: "roomSplit0", dur: "4s" },
  { color: "#C8961A", anim: "roomSplit1", dur: "5s" },
  { color: "#50c8a0", anim: "roomSplit2", dur: "3.5s" },
  { color: "#E8506A", anim: "roomSplit3", dur: "6s" },
];

const OUTLINE_BARS = [80, 60, 75, 50, 70];

export default function RoomScene({ isActive }: { isActive: boolean }) {
  const [textVisible, setTextVisible] = useState(false);
  const [showOutline, setShowOutline] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    const t1 = setTimeout(() => setTextVisible(true), 600);
    const t2 = setTimeout(() => setShowOutline(true), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isActive]);

  return (
    <div style={{ position: "relative", width: 600, height: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <style>{CSS}</style>

      {/* Orbiting orbs */}
      {!showOutline && (
        <div style={{ position: "relative", width: 120, height: 120 }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", width: 16, height: 16, marginTop: -8, marginLeft: -8, borderRadius: "50%", background: "#6B7FF2", opacity: 0.2 }} />
          {ORBS.map((orb, i) => (
            <div key={i} style={{
              position: "absolute", top: "50%", left: "50%", width: 10, height: 10, marginTop: -5, marginLeft: -5,
              borderRadius: "50%", background: orb.color, boxShadow: `0 0 8px ${orb.color}50`,
              animation: `${orb.anim} ${orb.dur} linear infinite`,
            }} />
          ))}
        </div>
      )}

      {/* Outline skeleton */}
      {showOutline && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 200 }}>
          {OUTLINE_BARS.map((w, i) => (
            <div key={i} style={{
              height: 3, borderRadius: 2, background: "#C8961A",
              width: `${w}%`,
              animation: `outlineReveal 0.6s ease-out ${i * 0.3}s both`,
            }} />
          ))}
        </div>
      )}

      {/* Text */}
      <div style={{
        position: "absolute", bottom: 40, textAlign: "center", maxWidth: 420,
        opacity: textVisible ? 1 : 0, transform: textVisible ? "translateY(0)" : "translateY(12px)",
        transition: "all 0.8s ease",
      }}>
        <p style={{ fontSize: 20, fontWeight: 600, color: "#fff", lineHeight: 1.5, margin: "0 0 12px", fontFamily: "'Afacad Flux', sans-serif" }}>
          Then the Writer's Room takes over.
        </p>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0, fontFamily: "'Afacad Flux', sans-serif" }}>
          They explore angles. Build the structure. Write the draft. You're in control at every step.
        </p>
      </div>
    </div>
  );
}
