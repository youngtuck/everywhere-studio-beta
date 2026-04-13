import { useEffect, useRef, useState } from "react";

export default function ReedScene({ isActive }: { isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    const timer = setTimeout(() => setTextVisible(true), 600);
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

    const cx = w / 2, cy = h / 2;
    let t = 0;
    let animId: number;

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      t += 0.02;

      // Reed orb
      const orbR = 24;
      const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, orbR);
      grad.addColorStop(0, "rgba(107, 127, 242, 0.8)");
      grad.addColorStop(1, "rgba(107, 127, 242, 0.2)");
      ctx!.fillStyle = grad;
      ctx!.beginPath();
      ctx!.arc(cx, cy, orbR, 0, Math.PI * 2);
      ctx!.fill();

      // Concentric listening rings
      for (let i = 0; i < 4; i++) {
        const r = orbR + 20 + i * 25 + (t * 15) % 25;
        const alpha = Math.max(0, 0.15 - (r - orbR) * 0.001);
        ctx!.strokeStyle = `rgba(107, 127, 242, ${alpha})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.arc(cx, cy, r, 0, Math.PI * 2);
        ctx!.stroke();
      }

      // Drifting text fragments toward the orb
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + t * 0.3;
        const dist = 120 + Math.sin(t + i) * 20;
        const drift = Math.max(0, dist - t * 8);
        const x = cx + Math.cos(angle) * drift;
        const y = cy + Math.sin(angle) * drift;
        const alpha = drift > 20 ? 0.15 : 0;
        ctx!.fillStyle = `rgba(200, 150, 26, ${alpha})`;
        ctx!.fillRect(x - 12, y - 1, 24, 2);
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
        position: "relative", zIndex: 1, textAlign: "center", maxWidth: 420,
        opacity: textVisible ? 1 : 0, transform: textVisible ? "translateY(0)" : "translateY(12px)",
        transition: "all 0.8s ease",
        marginTop: 160,
      }}>
        <p style={{ fontSize: 20, fontWeight: 600, color: "#fff", lineHeight: 1.5, margin: "0 0 12px", fontFamily: "'Afacad Flux', sans-serif" }}>
          Reed is your First Listener.
        </p>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0, fontFamily: "'Afacad Flux', sans-serif" }}>
          He interviews you until he fully understands what you're trying to say. Not a form. Not a prompt. A conversation.
        </p>
      </div>
    </div>
  );
}
