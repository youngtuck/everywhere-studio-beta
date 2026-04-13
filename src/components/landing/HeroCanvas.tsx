import { useRef, useEffect, useCallback } from "react";

interface HeroCanvasProps {
  isMobile: boolean;
}

interface Blob {
  baseX: number;
  baseY: number;
  radius: number;
  color: string;
  phaseX: number;
  phaseY: number;
  freqX: number;
  freqY: number;
  driftX: number;
  driftY: number;
}

const BLOBS: Blob[] = [
  { baseX: 0.3, baseY: 0.3, radius: 0.45, color: "rgba(107,127,242,0.18)", phaseX: 0, phaseY: 0.5, freqX: 0.15, freqY: 0.12, driftX: 0.12, driftY: 0.09 },
  { baseX: 0.7, baseY: 0.6, radius: 0.38, color: "rgba(200,169,110,0.14)", phaseX: 1.2, phaseY: 0.8, freqX: 0.1, freqY: 0.14, driftX: 0.10, driftY: 0.13 },
  { baseX: 0.5, baseY: 0.4, radius: 0.5, color: "rgba(180,150,90,0.12)", phaseX: 2.5, phaseY: 1.7, freqX: 0.08, freqY: 0.11, driftX: 0.15, driftY: 0.10 },
  { baseX: 0.2, baseY: 0.7, radius: 0.35, color: "rgba(140,160,255,0.10)", phaseX: 3.1, phaseY: 2.3, freqX: 0.13, freqY: 0.09, driftX: 0.09, driftY: 0.12 },
  { baseX: 0.8, baseY: 0.3, radius: 0.4, color: "rgba(80,100,200,0.12)", phaseX: 0.7, phaseY: 3.5, freqX: 0.11, freqY: 0.07, driftX: 0.13, driftY: 0.08 },
];

const SPRING_STIFFNESS = 0.028;
const SPRING_DAMPING = 0.88;
const CURSOR_INFLUENCE = 0.08;

export default function HeroCanvas({ isMobile }: HeroCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const springRef = useRef({ x: 0.5, y: 0.5, vx: 0, vy: 0 });
  const rafRef = useRef<number>(0);
  const visibleRef = useRef(true);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current.x = e.clientX / window.innerWidth;
    mouseRef.current.y = e.clientY / window.innerHeight;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obs = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { threshold: 0 }
    );
    obs.observe(canvas);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (isMobile) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);

    const render = (time: number) => {
      if (!visibleRef.current) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }
      const w = window.innerWidth;
      const h = window.innerHeight;
      const t = time * 0.001;

      // Update spring-tracked cursor position
      const spring = springRef.current;
      const mouse = mouseRef.current;
      const dx = mouse.x - spring.x;
      const dy = mouse.y - spring.y;
      spring.vx = (spring.vx + dx * SPRING_STIFFNESS) * SPRING_DAMPING;
      spring.vy = (spring.vy + dy * SPRING_STIFFNESS) * SPRING_DAMPING;
      spring.x += spring.vx;
      spring.y += spring.vy;

      // Clear with base navy
      ctx.fillStyle = "#060D14";
      ctx.fillRect(0, 0, w, h);

      // Draw blobs with additive blending
      ctx.globalCompositeOperation = "lighter";

      for (const blob of BLOBS) {
        // Organic drift via layered sine waves
        const ox = Math.sin(t * blob.freqX + blob.phaseX) * blob.driftX
          + Math.sin(t * blob.freqX * 0.7 + blob.phaseY * 1.3) * blob.driftX * 0.5;
        const oy = Math.sin(t * blob.freqY + blob.phaseY) * blob.driftY
          + Math.sin(t * blob.freqY * 0.6 + blob.phaseX * 1.5) * blob.driftY * 0.5;

        // Cursor influence shifts blobs slightly
        const cx = (spring.x - 0.5) * CURSOR_INFLUENCE;
        const cy = (spring.y - 0.5) * CURSOR_INFLUENCE;

        const bx = (blob.baseX + ox + cx) * w;
        const by = (blob.baseY + oy + cy) * h;
        const br = blob.radius * Math.max(w, h);

        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        grad.addColorStop(0, blob.color);
        grad.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // Reset compositing for vignette
      ctx.globalCompositeOperation = "source-over";

      // Vignette overlay - radial gradient from transparent center to dark edges
      const vcx = w * 0.5;
      const vcy = h * 0.5;
      const vr = Math.max(w, h) * 0.7;
      const vignette = ctx.createRadialGradient(vcx, vcy, vr * 0.3, vcx, vcy, vr);
      vignette.addColorStop(0, "rgba(6,13,20,0)");
      vignette.addColorStop(1, "rgba(6,13,20,0.35)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isMobile, handleMouseMove]);

  if (isMobile) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        display: "block",
      }}
    />
  );
}
