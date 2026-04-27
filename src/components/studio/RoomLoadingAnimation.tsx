import { useState, useEffect } from "react";

const MESSAGES = [
  "Exploring angles...",
  "Mapping the category...",
  "Finding the through-line...",
  "Shaping your approach...",
];

const ORBS = [
  { color: "var(--cornflower)", duration: "3.5s", radius: 40, delay: "0s" },
  { color: "var(--gold)", duration: "4.2s", radius: 50, delay: "0.3s" },
  { color: "#50c8a0", duration: "2.8s", radius: 35, delay: "0.6s" },
  { color: "#E8506A", duration: "5.0s", radius: 45, delay: "0.9s" },
];

const CSS = `
@keyframes roomOrbit0 {
  0% { transform: rotate(0deg) translateX(40px) rotate(0deg); opacity: 0; }
  15% { opacity: 1; }
  100% { transform: rotate(360deg) translateX(40px) rotate(-360deg); opacity: 1; }
}
@keyframes roomOrbit1 {
  0% { transform: rotate(120deg) translateX(50px) rotate(-120deg); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: rotate(480deg) translateX(50px) rotate(-480deg); opacity: 1; }
}
@keyframes roomOrbit2 {
  0% { transform: rotate(240deg) translateX(35px) rotate(-240deg); opacity: 0; }
  25% { opacity: 1; }
  100% { transform: rotate(600deg) translateX(35px) rotate(-600deg); opacity: 1; }
}
@keyframes roomOrbit3 {
  0% { transform: rotate(60deg) translateX(45px) rotate(-60deg); opacity: 0; }
  30% { opacity: 1; }
  100% { transform: rotate(420deg) translateX(45px) rotate(-420deg); opacity: 1; }
}
@keyframes roomPulse {
  0%, 100% { opacity: 0.15; transform: scale(1); }
  50% { opacity: 0.25; transform: scale(1.05); }
}
@keyframes roomConverge {
  0% { opacity: 1; }
  100% { opacity: 0; transform: scale(0) translateX(0) translateY(0); }
}
@keyframes roomFadeText {
  0%, 10% { opacity: 0; transform: translateY(4px); }
  20%, 80% { opacity: 1; transform: translateY(0); }
  90%, 100% { opacity: 0; transform: translateY(-4px); }
}
`;

export default function RoomLoadingAnimation({ isLoading }: { isLoading: boolean }) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <style>{CSS}</style>
      <div style={{
        position: "relative",
        width: 120,
        height: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {/* Center ghost orb */}
        <div style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "var(--cornflower)",
          animation: isLoading ? "roomPulse 4s ease-in-out infinite" : "roomConverge 0.8s ease forwards",
        }} />
        {/* Orbiting orbs */}
        {ORBS.map((orb, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 14,
              height: 14,
              marginTop: -7,
              marginLeft: -7,
              borderRadius: "50%",
              background: orb.color,
              boxShadow: `0 0 12px ${orb.color}60`,
              animation: isLoading
                ? `roomOrbit${i} ${orb.duration} linear infinite`
                : "roomConverge 0.8s ease forwards",
              animationDelay: isLoading ? orb.delay : "0s",
            }}
          />
        ))}
      </div>
      <div style={{
        fontSize: 14,
        color: "var(--text-secondary)",
        fontFamily: "'Inter', sans-serif",
        textAlign: "center",
        minHeight: 20,
      }}>
        <span
          key={msgIndex}
          style={{
            animation: "roomFadeText 3s ease-in-out",
            display: "inline-block",
          }}
        >
          {MESSAGES[msgIndex]}
        </span>
      </div>
    </div>
  );
}
