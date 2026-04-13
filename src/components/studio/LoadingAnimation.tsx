import { useState, useEffect, useRef } from 'react';

type LoadingVariant = 'reed' | 'sentinel' | 'generate';

interface LoadingAnimationProps {
  variant?: LoadingVariant;
  progress?: number;
  message?: string;
  detailLabel?: string;
}

export default function LoadingAnimation({ variant = 'reed', progress, message, detailLabel }: LoadingAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (progress === undefined) return;
    const interval = setInterval(() => {
      setDisplayProgress(prev => {
        if (prev < progress) return Math.min(prev + 1, progress);
        return prev;
      });
    }, 20);
    return () => clearInterval(interval);
  }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = variant === 'reed' ? 200 : 300;
    const h = variant === 'reed' ? 60 : 40;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    let t = 0;
    let animId: number;

    function drawReed() {
      ctx!.clearRect(0, 0, w, h);
      const cy = h / 2;
      const colors = ['#4A90D9', '#F5C642', '#4A90D9'];
      const baseX = w / 2;
      const spacing = 28;

      for (let i = 0; i < 3; i++) {
        const phase = t * 3 + i * 0.8;
        const bounce = Math.sin(phase) * 10;
        const scale = 0.8 + Math.sin(phase) * 0.25;
        const x = baseX + (i - 1) * spacing;
        const y = cy + bounce;
        const radius = 7 * scale;

        const glow = ctx!.createRadialGradient(x, y, 0, x, y, radius * 3);
        glow.addColorStop(0, colors[i] + '30');
        glow.addColorStop(1, colors[i] + '00');
        ctx!.fillStyle = glow;
        ctx!.beginPath();
        ctx!.arc(x, y, radius * 3, 0, Math.PI * 2);
        ctx!.fill();

        const grad = ctx!.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
        grad.addColorStop(0, colors[i] + 'ff');
        grad.addColorStop(1, colors[i] + 'aa');
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(x, y, radius, 0, Math.PI * 2);
        ctx!.fill();
      }
      t += 0.03;
    }

    function drawSentinel() {
      ctx!.clearRect(0, 0, w, h);
      const cy = h / 2;
      const count = 5;
      const totalWidth = 180;
      const startX = (w - totalWidth) / 2;

      for (let i = 0; i < count; i++) {
        const phase = t * 2.5 - i * 0.4;
        const ease = (Math.sin(phase) + 1) / 2;
        const x = startX + ease * totalWidth;
        const radius = 5;

        const trail = ctx!.createRadialGradient(x, cy, 0, x, cy, radius * 4);
        trail.addColorStop(0, '#4A90D920');
        trail.addColorStop(1, '#4A90D900');
        ctx!.fillStyle = trail;
        ctx!.beginPath();
        ctx!.arc(x, cy, radius * 4, 0, Math.PI * 2);
        ctx!.fill();

        const r = Math.round(74 + (245 - 74) * ease);
        const g = Math.round(144 + (198 - 144) * ease);
        const b = Math.round(217 + (66 - 217) * ease);
        ctx!.fillStyle = `rgb(${r},${g},${b})`;
        ctx!.beginPath();
        ctx!.arc(x, cy, radius, 0, Math.PI * 2);
        ctx!.fill();
      }
      t += 0.02;
    }

    function drawGenerate() {
      ctx!.clearRect(0, 0, w, h);
      const barH = 4;
      const barY = h / 2 - barH / 2;
      const barW = w - 40;
      const barX = 20;
      const prog = (progress || 0) / 100;

      ctx!.fillStyle = '#E2E8F0';
      ctx!.beginPath();
      ctx!.roundRect(barX, barY, barW, barH, barH / 2);
      ctx!.fill();

      const fillW = barW * prog;
      if (fillW > 0) {
        const grad = ctx!.createLinearGradient(barX, 0, barX + fillW, 0);
        grad.addColorStop(0, '#4A90D9');
        grad.addColorStop(1, '#F5C642');
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.roundRect(barX, barY, fillW, barH, barH / 2);
        ctx!.fill();

        const shimmerX = barX + (fillW * ((Math.sin(t * 3) + 1) / 2));
        const shimmer = ctx!.createRadialGradient(shimmerX, barY + barH / 2, 0, shimmerX, barY + barH / 2, 20);
        shimmer.addColorStop(0, 'rgba(255,255,255,0.4)');
        shimmer.addColorStop(1, 'rgba(255,255,255,0)');
        ctx!.fillStyle = shimmer;
        ctx!.beginPath();
        ctx!.arc(shimmerX, barY + barH / 2, 20, 0, Math.PI * 2);
        ctx!.fill();
      }

      t += 0.02;
    }

    function animate() {
      if (variant === 'reed') drawReed();
      else if (variant === 'sentinel') drawSentinel();
      else drawGenerate();
      animId = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(animId);
  }, [variant, progress]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <canvas
        ref={canvasRef}
        style={{
          width: variant === 'reed' ? 200 : 300,
          height: variant === 'reed' ? 60 : 40,
          pointerEvents: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {progress !== undefined && (
          <span style={{
            fontFamily: "'Afacad Flux', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--cornflower)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {displayProgress}%
          </span>
        )}
        {message && (
          <span style={{
            fontFamily: "'Afacad Flux', sans-serif",
            fontSize: 13,
            color: 'var(--fg-3)',
          }}>
            {message}
          </span>
        )}
        {detailLabel && (
          <span style={{
            fontFamily: "'Afacad Flux', sans-serif",
            fontSize: 12,
            color: 'var(--cornflower)',
            fontWeight: 600,
          }}>
            {detailLabel}
          </span>
        )}
      </div>
    </div>
  );
}
