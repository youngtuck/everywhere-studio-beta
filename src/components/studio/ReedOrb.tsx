import { useEffect, useRef } from 'react';

export default function ReedOrb({ size = 90, breathing = true }: { size?: number; breathing?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const dim = size * 3;
    canvas.width = dim * dpr;
    canvas.height = dim * dpr;
    ctx.scale(dpr, dpr);

    let t = 0;
    let animId: number;

    function draw() {
      ctx!.clearRect(0, 0, dim, dim);
      const cx = dim / 2;
      const cy = dim / 2;
      t += breathing ? 0.006 : 0.015;

      // Breathing opacity modulation (slow sine wave, 80%-100%)
      const breathAlpha = breathing ? 0.8 + 0.2 * Math.sin(t * 0.5) : 1;
      ctx!.globalAlpha = breathAlpha;

      const baseR = size * 0.42;

      // Ambient glow (large, soft)
      for (let i = 6; i >= 0; i--) {
        const gr = baseR + i * 18 + Math.sin(t * 0.4 + i * 0.5) * 6;
        const ga = 0.015 - i * 0.002;
        if (ga <= 0) continue;
        const g = ctx!.createRadialGradient(cx, cy, 0, cx, cy, gr);
        g.addColorStop(0, `rgba(74, 144, 217, ${ga + 0.01})`);
        g.addColorStop(0.4, `rgba(74, 144, 217, ${ga})`);
        g.addColorStop(1, 'rgba(74, 144, 217, 0)');
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(cx, cy, gr, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Draw multiple morphing layers for depth
      const layers = [
        { color: [74, 144, 217], alpha: 0.12, rOff: 0, freq: 3, amp: 5, speed: 1.0 },
        { color: [100, 160, 230], alpha: 0.08, rOff: -4, freq: 5, amp: 3, speed: 1.4 },
        { color: [120, 180, 245], alpha: 0.06, rOff: -8, freq: 7, amp: 2.5, speed: 0.8 },
        { color: [245, 198, 66], alpha: 0.03, rOff: -2, freq: 4, amp: 4, speed: 1.2 },
      ];

      for (const layer of layers) {
        const pts = 180;
        ctx!.beginPath();
        for (let i = 0; i <= pts; i++) {
          const a = (i / pts) * Math.PI * 2;
          const w1 = Math.sin(a * layer.freq + t * layer.speed) * layer.amp;
          const w2 = Math.sin(a * (layer.freq + 2) - t * layer.speed * 0.7) * (layer.amp * 0.6);
          const w3 = Math.cos(a * (layer.freq + 4) + t * layer.speed * 1.3) * (layer.amp * 0.3);
          const r = baseR + layer.rOff + w1 + w2 + w3;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          i === 0 ? ctx!.moveTo(x, y) : ctx!.lineTo(x, y);
        }
        ctx!.closePath();

        const grad = ctx!.createRadialGradient(
          cx - baseR * 0.25 + Math.sin(t * 0.3) * 8,
          cy - baseR * 0.2 + Math.cos(t * 0.4) * 6,
          0, cx, cy, baseR + 10
        );
        grad.addColorStop(0, `rgba(${layer.color.join(',')}, ${layer.alpha * 2})`);
        grad.addColorStop(0.5, `rgba(${layer.color.join(',')}, ${layer.alpha})`);
        grad.addColorStop(1, `rgba(${layer.color.join(',')}, ${layer.alpha * 0.3})`);
        ctx!.fillStyle = grad;
        ctx!.fill();
      }

      // Inner core light
      const coreGrad = ctx!.createRadialGradient(
        cx + Math.sin(t * 0.5) * 6,
        cy + Math.cos(t * 0.6) * 5,
        0, cx, cy, baseR * 0.5
      );
      coreGrad.addColorStop(0, 'rgba(220, 235, 255, 0.2)');
      coreGrad.addColorStop(0.5, 'rgba(180, 210, 250, 0.06)');
      coreGrad.addColorStop(1, 'rgba(180, 210, 250, 0)');
      ctx!.fillStyle = coreGrad;
      ctx!.beginPath();
      ctx!.arc(cx, cy, baseR * 0.5, 0, Math.PI * 2);
      ctx!.fill();

      // Traveling highlights (iridescent shimmer moving along the edge)
      for (let h = 0; h < 3; h++) {
        const hAngle = t * (0.3 + h * 0.15) + h * 2.1;
        const hx = cx + Math.cos(hAngle) * baseR * 0.75;
        const hy = cy + Math.sin(hAngle) * baseR * 0.65;
        const hGrad = ctx!.createRadialGradient(hx, hy, 0, hx, hy, 18);
        const hColors = [
          [245, 198, 66],   // gold
          [180, 210, 250],  // light blue
          [232, 180, 160],  // coral
        ];
        const c = hColors[h];
        hGrad.addColorStop(0, `rgba(${c.join(',')}, 0.1)`);
        hGrad.addColorStop(1, `rgba(${c.join(',')}, 0)`);
        ctx!.fillStyle = hGrad;
        ctx!.beginPath();
        ctx!.arc(hx, hy, 18, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Breathing outer ring
      const ringR = baseR + 12 + Math.sin(t * 0.35) * 8;
      const ringA = 0.04 + Math.sin(t * 0.35) * 0.02;
      ctx!.strokeStyle = `rgba(74, 144, 217, ${ringA})`;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx!.stroke();

      // Second breathing ring (delayed)
      const ring2R = baseR + 20 + Math.sin(t * 0.35 - 1) * 10;
      const ring2A = 0.02 + Math.sin(t * 0.35 - 1) * 0.01;
      ctx!.strokeStyle = `rgba(74, 144, 217, ${ring2A})`;
      ctx!.lineWidth = 0.5;
      ctx!.beginPath();
      ctx!.arc(cx, cy, ring2R, 0, Math.PI * 2);
      ctx!.stroke();

      ctx!.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, [size, breathing]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size * 3,
        height: size * 3,
        pointerEvents: 'none',
      }}
    />
  );
}
