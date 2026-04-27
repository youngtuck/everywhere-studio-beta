import { useEffect, useRef, useState } from "react";

export default function WelcomeScene({ isActive }: { isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    const timer = setTimeout(() => setTextVisible(true), 800);
    return () => clearTimeout(timer);
  }, [isActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 600, h = 400;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const stars: Array<{ x: number; y: number; vx: number; vy: number; alpha: number; born: number }> = [];
    const startTime = performance.now();
    let animId: number;

    function draw(now: number) {
      const elapsed = (now - startTime) / 1000;
      ctx!.clearRect(0, 0, w, h);

      // Spawn stars over first 3 seconds
      if (elapsed < 3 && stars.length < 30 && Math.random() < 0.15) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          alpha: 0,
          born: elapsed,
        });
      }

      for (const s of stars) {
        const age = elapsed - s.born;
        s.alpha = Math.min(1, age * 2);
        s.x += s.vx;
        s.y += s.vy;

        // Pulse gold at 3.5s
        const pulseT = Math.max(0, elapsed - 3.2);
        const pulse = pulseT > 0 && pulseT < 1 ? Math.sin(pulseT * Math.PI) : 0;

        const r = 200 + pulse * 55;
        const g = 150 + pulse * 0;
        const b = 26 + pulse * 0;

        ctx!.fillStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${s.alpha * 0.6})`;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, 2 + pulse * 1.5, 0, Math.PI * 2);
        ctx!.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [isActive]);

  return (
    <div style={{ position: "relative", width: 600, height: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: 600, height: 400 }} />
      <div style={{
        position: "relative", zIndex: 1, textAlign: "center",
        opacity: textVisible ? 1 : 0, transform: textVisible ? "translateY(0)" : "translateY(12px)",
        transition: "all 0.8s ease",
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--gold)", marginBottom: 16, fontFamily: "'Inter', sans-serif" }}>
          IdeasOut
        </div>
        <p style={{ fontSize: 24, fontWeight: 600, color: "#fff", lineHeight: 1.4, margin: 0, fontFamily: "'Inter', sans-serif" }}>
          You bring the idea.<br />Reed and the studio carry it to the line.
        </p>
      </div>
    </div>
  );
}
