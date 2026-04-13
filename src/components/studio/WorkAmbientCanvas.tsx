import { useEffect, useRef } from "react";

interface Line {
  x: number;
  y: number;
  speed: number;
  amplitude: number;
  period: number;
  phase: number;
  width: number;
  color: string;
  length: number;
}

export default function WorkAmbientCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const linesRef = useRef<Line[]>([]);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio, 2);

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize lines
    const W = window.innerWidth;
    const H = window.innerHeight;
    const lineCount = 24;
    const lines: Line[] = [];

    for (let i = 0; i < lineCount; i++) {
      const isWarm = Math.random() > 0.4;
      lines.push({
        x: Math.random() * W * 1.5 - W * 0.25,
        y: Math.random() * H,
        speed: 0.15 + Math.random() * 0.25,
        amplitude: 30 + Math.random() * 50,
        period: 6 + Math.random() * 6,
        phase: Math.random() * Math.PI * 2,
        width: 0.8 + Math.random() * 0.8,
        color: isWarm
          ? `rgba(200, 150, 26, ${0.06 + Math.random() * 0.06})`
          : `rgba(107, 127, 242, ${0.04 + Math.random() * 0.04})`,
        length: 200 + Math.random() * 300,
      });
    }
    linesRef.current = lines;

    const draw = (ts: number) => {
      const t = ts * 0.001;
      const W = window.innerWidth;
      const H = window.innerHeight;
      ctx.clearRect(0, 0, W, H);

      for (const line of linesRef.current) {
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.width;
        ctx.lineCap = "round";

        const steps = 80;
        for (let s = 0; s <= steps; s++) {
          const progress = s / steps;
          const px = line.x + progress * line.length;
          const py = line.y + Math.sin(
            (progress * Math.PI * 2) + (t / line.period) + line.phase
          ) * line.amplitude;

          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Drift
        line.x += line.speed;
        if (line.x > W + 100) {
          line.x = -line.length - 100;
          line.y = Math.random() * H;
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
