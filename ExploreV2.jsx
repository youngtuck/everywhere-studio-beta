import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════
   EVERYWHERE STUDIO — EXPLORE PAGE v2
   Earned scroll. Frequency-line animation. Brand narrative.
   Modern precision. White canvas. One dark moment.
   ═══════════════════════════════════════════════════════════ */

// ── Tokens ──
const T = {
  navy: "#0C1A29",
  navyDeep: "#080F18",
  gold: "#C8A96E",
  goldDim: "rgba(200,169,110,0.25)",
  white: "#FFFFFF",
  offwhite: "#FAFBFC",
  text: "#0A0A0A",
  textSec: "#71717A",
  textTer: "#A1A1AA",
  textOnDark: "#F0EDE4",
  textDimDark: "rgba(255,255,255,0.4)",
  border: "#E4E4E7",
  borderDark: "rgba(255,255,255,0.07)",
};

function lerp(a, b, t) { return a + (b - a) * t; }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function clampN(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ── CSS ──
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');

*{margin:0;padding:0;box-sizing:border-box;}

.ev2-root {
  font-family:'Instrument Sans',-apple-system,sans-serif;
  -webkit-font-smoothing:antialiased;
  background:${T.white};
  color:${T.text};
  overflow-x:hidden;
}
.ev2-root ::selection{background:${T.gold};color:${T.navy};}
.ev2-mono{font-family:'DM Mono',monospace;}

/* Keyframes */
@keyframes ev2-pulse{
  0%,100%{opacity:0.3;}
  50%{opacity:1;}
}
@keyframes ev2-slideUp{
  from{opacity:0;transform:translateY(20px);}
  to{opacity:1;transform:translateY(0);}
}
@keyframes ev2-fadeIn{
  from{opacity:0;}
  to{opacity:1;}
}

/* Scroll-triggered reveal */
.ev2-reveal{
  opacity:0;transform:translateY(28px);
  transition:opacity 1s cubic-bezier(0.16,1,0.3,1),transform 1s cubic-bezier(0.16,1,0.3,1);
}
.ev2-reveal.shown{opacity:1;transform:translateY(0);}
.ev2-d1{transition-delay:0.12s;}
.ev2-d2{transition-delay:0.24s;}
.ev2-d3{transition-delay:0.36s;}

/* Nav */
.ev2-nav{
  position:fixed;top:0;left:0;right:0;z-index:100;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 48px;height:60px;
  transition:all 0.5s cubic-bezier(0.16,1,0.3,1);
}
.ev2-nav-dark{background:transparent;color:${T.textOnDark};}
.ev2-nav-light{
  background:rgba(255,255,255,0.88);
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  color:${T.text};border-bottom:1px solid ${T.border};
}
.ev2-nav-logo{font-size:12px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;}
.ev2-nav-links{display:flex;align-items:center;gap:28px;}
.ev2-nav-link{
  font-size:13px;font-weight:500;opacity:0.6;cursor:pointer;
  background:none;border:none;color:inherit;font-family:inherit;
  transition:opacity 0.2s;letter-spacing:0.01em;
}
.ev2-nav-link:hover{opacity:1;}
.ev2-nav-cta{
  font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;
  padding:10px 24px;border-radius:999px;cursor:pointer;font-family:inherit;
  transition:all 0.3s cubic-bezier(0.16,1,0.3,1);
}
.ev2-cta-dark{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:${T.textOnDark};}
.ev2-cta-dark:hover{background:rgba(255,255,255,0.14);}
.ev2-cta-light{background:${T.navy};border:1px solid ${T.navy};color:${T.white};}
.ev2-cta-light:hover{background:#162336;}

/* Buttons */
.ev2-btn{
  display:inline-flex;align-items:center;gap:8px;
  padding:16px 36px;font-family:'Instrument Sans',sans-serif;
  font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;
  border:none;border-radius:999px;cursor:pointer;
  transition:all 0.35s cubic-bezier(0.16,1,0.3,1);
}
.ev2-btn:active{transform:scale(0.97);}
.ev2-btn-white{background:${T.white};color:${T.navy};}
.ev2-btn-white:hover{background:${T.gold};color:${T.navy};}
.ev2-btn-dark{background:${T.navy};color:${T.white};}
.ev2-btn-dark:hover{background:#162336;}

/* Reed composing dots */
.ev2-dot-pulse span{
  display:inline-block;width:6px;height:6px;border-radius:50%;
  background:${T.gold};animation:ev2-pulse 1.2s infinite;
}
.ev2-dot-pulse span:nth-child(2){animation-delay:0.2s;}
.ev2-dot-pulse span:nth-child(3){animation-delay:0.4s;}

@media(max-width:768px){
  .ev2-nav{padding:0 20px;}
  .ev2-nav-link{display:none;}
  .ev2-nav-links{gap:12px;}
}
`;

// ═══════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════

function useStickyProgress(ref) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const tick = () => {
      const el = ref.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const p = clampN(-el.getBoundingClientRect().top / total, 0, 1);
      setProgress(p);
    };
    window.addEventListener("scroll", tick, { passive: true });
    tick();
    return () => window.removeEventListener("scroll", tick);
  }, [ref]);
  return progress;
}

function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, vis };
}

function useCountUp(target, dur, trigger) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    const t0 = performance.now();
    const go = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      setVal(Math.round(target * easeOut(p)));
      if (p < 1) requestAnimationFrame(go);
    };
    requestAnimationFrame(go);
  }, [trigger, target, dur]);
  return val;
}

// ═══════════════════════════════════════════
// FREQUENCY CANVAS
// Scroll-driven: chaos → composition
// 5 frequency lines + 40 nodes harmonizing
// ═══════════════════════════════════════════

function FrequencyCanvas({ progress }) {
  const canvasRef = useRef(null);
  const pRef = useRef(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const frameRef = useRef(null);
  const nodesRef = useRef(null);

  useEffect(() => { pRef.current = progress; }, [progress]);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    let W, H;

    const initScatter = (w, h) => {
      const phi = (1 + Math.sqrt(5)) / 2;
      return Array.from({ length: 40 }, (_, i) => ({
        sx: (i * phi * 137.508 + 80) % w,
        sy: ((i * 89.37 + 150) % (h * 0.6)) + h * 0.2,
        li: Math.floor(i / 8),
        pi: i % 8,
      }));
    };

    const resize = () => {
      const r = cvs.parentElement.getBoundingClientRect();
      W = r.width; H = r.height;
      cvs.width = W * dpr; cvs.height = H * dpr;
      cvs.style.width = W + "px"; cvs.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodesRef.current = initScatter(W, H);
    };
    resize();
    window.addEventListener("resize", resize);

    const onM = (e) => {
      const r = cvs.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const offM = () => { mouseRef.current = { x: -1000, y: -1000 }; };
    cvs.addEventListener("mousemove", onM);
    cvs.addEventListener("mouseleave", offM);

    const draw = (now) => {
      const p = pRef.current;
      const ep = easeOut(p);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const nodes = nodesRef.current;
      ctx.clearRect(0, 0, W, H);

      const LC = 5, NP = 8;

      // ── Draw frequency lines ──
      for (let i = 0; i < LC; i++) {
        const t = i / (LC - 1);
        const spreadY = H * 0.12 + t * H * 0.76;
        const convY = H * 0.5 + (t - 0.5) * 24;
        const baseY = lerp(spreadY, convY, ep);
        const freq = (0.012 + i * 0.005) * (1 - p * 0.55);
        const amp = (45 + i * 14) * (1 - ep * 0.94);
        const phase = i * 1.4 + now * (0.00035 + i * 0.00007);

        const sR = 120 + i * 18, sG = 150 + i * 14, sB = 215 - i * 8;
        const r = Math.round(lerp(sR, 200, p));
        const g = Math.round(lerp(sG, 169, p));
        const b = Math.round(lerp(sB, 110, p));
        const a = 0.06 + p * 0.2;

        ctx.beginPath();
        for (let x = 0; x <= W; x += 2) {
          const dx = x - mx, dy = baseY - my;
          const md = Math.sqrt(dx * dx + dy * dy);
          const mw = md < 180 ? Math.sin(md * 0.025) * 12 * (1 - md / 180) * (1 - p * 0.5) : 0;
          const y = baseY + Math.sin(x * freq + phase) * amp + mw;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ── Draw nodes ──
      if (!nodes) { frameRef.current = requestAnimationFrame(draw); return; }
      const np = Math.pow(clampN(p * 1.6 - 0.15, 0, 1), 0.55);

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const t = n.li / (LC - 1);
        const spreadY = H * 0.12 + t * H * 0.76;
        const convY = H * 0.5 + (t - 0.5) * 24;
        const lBaseY = lerp(spreadY, convY, ep);
        const lFreq = (0.012 + n.li * 0.005) * (1 - p * 0.55);
        const lAmp = (45 + n.li * 14) * (1 - ep * 0.94);
        const lPhase = n.li * 1.4 + now * (0.00035 + n.li * 0.00007);
        const cx = W * (n.pi + 1) / (NP + 1);
        const cy = lBaseY + Math.sin(cx * lFreq + lPhase) * lAmp;

        const nx = lerp(n.sx, cx, np);
        const ny = lerp(n.sy, cy, np);

        const mDist = Math.sqrt((nx - mx) ** 2 + (ny - my) ** 2);
        const mGlow = mDist < 140 ? 1 - mDist / 140 : 0;

        const nR = Math.round(lerp(120 + n.li * 18, 200, p));
        const nG = Math.round(lerp(150 + n.li * 14, 169, p));
        const nB = Math.round(lerp(215 - n.li * 8, 110, p));
        const nA = clampN(0.12 + p * 0.55 + mGlow * 0.3, 0, 1);
        const nRad = 1.6 + mGlow * 1.8;

        ctx.beginPath();
        ctx.arc(nx, ny, nRad, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${nR},${nG},${nB},${nA})`;
        ctx.fill();

        if (mGlow > 0.15) {
          ctx.beginPath();
          ctx.arc(nx, ny, nRad + 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200,169,110,${mGlow * 0.1})`;
          ctx.fill();
        }

        // Connections
        if (p > 0.25) {
          for (let j = i + 1; j < Math.min(i + 8, nodes.length); j++) {
            const o = nodes[j];
            const oT = o.li / (LC - 1);
            const oSY = H * 0.12 + oT * H * 0.76;
            const oCY = H * 0.5 + (oT - 0.5) * 24;
            const oBY = lerp(oSY, oCY, ep);
            const oFr = (0.012 + o.li * 0.005) * (1 - p * 0.55);
            const oAm = (45 + o.li * 14) * (1 - ep * 0.94);
            const oPh = o.li * 1.4 + now * (0.00035 + o.li * 0.00007);
            const oCx = W * (o.pi + 1) / (NP + 1);
            const oCy2 = oBY + Math.sin(oCx * oFr + oPh) * oAm;
            const ox = lerp(o.sx, oCx, np);
            const oy = lerp(o.sy, oCy2, np);
            const d = Math.sqrt((nx - ox) ** 2 + (ny - oy) ** 2);
            if (d < 110) {
              const ca = (1 - d / 110) * clampN((p - 0.25) / 0.5, 0, 1) * 0.07;
              ctx.beginPath();
              ctx.moveTo(nx, ny);
              ctx.lineTo(ox, oy);
              ctx.strokeStyle = `rgba(200,169,110,${ca})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      cvs.removeEventListener("mousemove", onM);
      cvs.removeEventListener("mouseleave", offM);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, pointerEvents: "all" }} />;
}

// ═══════════════════════════════════════════
// SCROLL PROGRESS BAR
// ═══════════════════════════════════════════

function ScrollBar() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const tick = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setP(h > 0 ? window.scrollY / h : 0);
    };
    window.addEventListener("scroll", tick, { passive: true });
    return () => window.removeEventListener("scroll", tick);
  }, []);
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, zIndex: 200 }}>
      <div style={{ height: "100%", background: T.gold, width: `${p * 100}%`, transition: "width 0.08s linear" }} />
    </div>
  );
}

// ═══════════════════════════════════════════
// NAV
// ═══════════════════════════════════════════

function Nav() {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const tick = () => setPast(window.scrollY > 80);
    window.addEventListener("scroll", tick, { passive: true });
    return () => window.removeEventListener("scroll", tick);
  }, []);
  return (
    <nav className={`ev2-nav ${past ? "ev2-nav-light" : "ev2-nav-dark"}`}>
      <div className="ev2-nav-logo">Everywhere Studio</div>
      <div className="ev2-nav-links">
        <button className="ev2-nav-link">How It Works</button>
        <button className="ev2-nav-link">Resources</button>
        <button className="ev2-nav-link">Sign In</button>
        <button className={`ev2-nav-cta ${past ? "ev2-cta-light" : "ev2-cta-dark"}`}>Get Early Access</button>
      </div>
    </nav>
  );
}

// ═══════════════════════════════════════════
// HERO (Sticky — earned scroll)
// ═══════════════════════════════════════════

function HeroSection() {
  const ref = useRef(null);
  const p = useStickyProgress(ref);

  const labelOp = clampN((p - 0.15) / 0.15, 0, 1);
  const headOp = clampN((p - 0.3) / 0.2, 0, 1);
  const headY = lerp(20, 0, easeOut(clampN((p - 0.3) / 0.2, 0, 1)));
  const subOp = clampN((p - 0.52) / 0.15, 0, 1);
  const ctaOp = clampN((p - 0.62) / 0.12, 0, 1);
  const fadeOut = p > 0.85 ? 1 - (p - 0.85) / 0.15 : 1;

  return (
    <div ref={ref} style={{ height: "350vh", position: "relative" }}>
      <div style={{
        position: "sticky", top: 0, height: "100vh", overflow: "hidden",
        background: T.navyDeep,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: fadeOut,
      }}>
        <FrequencyCanvas progress={p} />

        <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 840, padding: "0 32px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Label */}
          <div className="ev2-mono" style={{
            fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
            color: T.textDimDark, marginBottom: 32,
            opacity: labelOp,
          }}>
            40 Specialists. 7 Gates. One Intelligence.
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: "clamp(52px, 8vw, 96px)", fontWeight: 600,
            letterSpacing: "-0.04em", lineHeight: 1.02,
            color: T.textOnDark,
            opacity: headOp,
            transform: `translateY(${headY}px)`,
            transition: "none",
            marginBottom: 28,
          }}>
            Composed<br />Intelligence
          </h1>

          {/* Subline */}
          <p style={{
            fontSize: 18, lineHeight: 1.65, color: T.textDimDark,
            maxWidth: 420, opacity: subOp, marginBottom: 44,
          }}>
            Content that performs. Quality that scales.<br />
            Intelligence that compounds.
          </p>

          {/* CTA */}
          <div style={{ opacity: ctaOp }}>
            <button className="ev2-btn ev2-btn-white">Get Early Access</button>
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{
          position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)",
          opacity: clampN(1 - p * 4, 0, 0.5),
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        }}>
          <div className="ev2-mono" style={{ fontSize: 10, color: T.textDimDark, letterSpacing: "0.1em" }}>SCROLL</div>
          <div style={{ width: 1, height: 28, background: "linear-gradient(to bottom, rgba(255,255,255,0.25), transparent)" }} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// PROBLEM (Sticky — full-screen statements)
// ═══════════════════════════════════════════

const PROBLEMS = [
  { num: "01", text: "Your team produces 200 pieces of content a month. You have no idea which 10 moved the needle." },
  { num: "02", text: "You hired specialists for strategy, brand voice, SEO, and distribution. They have never been in the same room." },
  { num: "03", text: "Your AI tools generate fast. Your audience can tell." },
  { num: "04", text: "Quality review happens after publishing. If it happens at all." },
];

function ProblemSection() {
  const ref = useRef(null);
  const p = useStickyProgress(ref);

  const getOpacity = (i) => {
    const seg = 1 / PROBLEMS.length;
    const fade = seg * 0.25;
    const start = i * seg;
    const end = start + seg;
    if (p < start || p > end) return 0;
    if (p < start + fade) return (p - start) / fade;
    if (i === PROBLEMS.length - 1) return 1; // last stays
    if (p > end - fade) return (end - p) / fade;
    return 1;
  };

  return (
    <div ref={ref} style={{ height: "400vh", position: "relative" }}>
      <div style={{
        position: "sticky", top: 0, height: "100vh",
        background: T.white,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        {/* Section label — always visible */}
        <div className="ev2-mono" style={{
          position: "absolute", top: 48, left: 48,
          fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
          color: T.textTer,
        }}>
          01 / The Problem
        </div>

        {/* Progress dots */}
        <div style={{
          position: "absolute", right: 48, top: "50%", transform: "translateY(-50%)",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          {PROBLEMS.map((_, i) => {
            const active = getOpacity(i) > 0.5;
            return (
              <div key={i} style={{
                width: 6, height: active ? 24 : 6, borderRadius: 3,
                background: active ? T.gold : T.border,
                transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
              }} />
            );
          })}
        </div>

        {/* Statements */}
        {PROBLEMS.map((item, i) => (
          <div key={i} style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 100px",
            opacity: getOpacity(i),
            transform: `translateY(${(1 - getOpacity(i)) * 12}px)`,
            transition: "none",
            pointerEvents: getOpacity(i) > 0.5 ? "auto" : "none",
          }}>
            <div style={{ maxWidth: 760, textAlign: "center" }}>
              <div className="ev2-mono" style={{
                fontSize: 12, color: T.gold, letterSpacing: "0.1em", marginBottom: 24,
              }}>
                {item.num}
              </div>
              <p style={{
                fontSize: "clamp(24px, 3.5vw, 42px)", fontWeight: 600,
                letterSpacing: "-0.025em", lineHeight: 1.25,
                color: T.text,
              }}>
                {item.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// REED DEMO — Production interface mockup
// ═══════════════════════════════════════════

function ReedSection() {
  const r = useReveal(0.1);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!r.vis) return;
    const t1 = setTimeout(() => setStep(1), 400);
    const t2 = setTimeout(() => setStep(2), 1200);
    const t3 = setTimeout(() => setStep(3), 2400);
    const t4 = setTimeout(() => setStep(4), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [r.vis]);

  const sidebarItem = (label, active) => (
    <div style={{
      padding: "8px 12px", borderRadius: 6, fontSize: 13,
      color: active ? T.textOnDark : "rgba(255,255,255,0.35)",
      background: active ? "rgba(255,255,255,0.06)" : "transparent",
      cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
      fontWeight: active ? 500 : 400,
    }}>
      {active && <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.gold }} />}
      {label}
    </div>
  );

  const metricBar = (label, value, pct, delay) => (
    <div style={{ marginBottom: 20, opacity: step >= 4 ? 1 : 0, transition: `opacity 0.6s ease ${delay}s` }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>{label}</span>
        <span style={{ fontSize: 12, color: T.gold, fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>{value}</span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", background: T.gold, borderRadius: 2,
          width: step >= 4 ? `${pct}%` : "0%",
          transition: `width 1s cubic-bezier(0.16,1,0.3,1) ${delay + 0.2}s`,
        }} />
      </div>
    </div>
  );

  const specialistTags = ["Brand Voice", "Enterprise Copy", "SEO", "Distribution Strategy", "Analytics"];

  return (
    <section ref={r.ref} style={{ padding: "140px 48px", background: T.white }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div className={`ev2-reveal ${r.vis ? "shown" : ""}`}>
          <div className="ev2-mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.textTer, marginBottom: 40 }}>
            02 / Meet Reed
          </div>
          <h2 style={{ fontSize: "clamp(32px, 4.5vw, 56px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.1, maxWidth: 640, marginBottom: 20 }}>
            Intelligence that thinks<br />before it writes.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: T.textSec, maxWidth: 560, marginBottom: 64 }}>
            Reed coordinates 40 specialists across research, strategy, voice calibration, and quality review before a single word reaches your audience.
          </p>
        </div>

        {/* ── Product mockup ── */}
        <div className={`ev2-reveal ev2-d2 ${r.vis ? "shown" : ""}`} style={{
          borderRadius: 16, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)",
          background: "#0D1117",
        }}>
          {/* Title bar */}
          <div style={{
            display: "flex", alignItems: "center", padding: "14px 20px",
            background: "#0D1117", borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ display: "flex", gap: 7 }}>
              <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#FF5F57" }} />
              <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#FEBC2E" }} />
              <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#28C840" }} />
            </div>
            <div style={{ flex: 1, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>
              Everywhere Studio
            </div>
            <div style={{ width: 50 }} />
          </div>

          <div style={{ display: "flex", minHeight: 440 }}>
            {/* Sidebar */}
            <div style={{
              width: 180, background: "#0D1117",
              borderRight: "1px solid rgba(255,255,255,0.06)",
              padding: "20px 12px", flexShrink: 0,
              display: "flex", flexDirection: "column", gap: 2,
            }}>
              <div className="ev2-mono" style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", padding: "8px 12px 4px", textTransform: "uppercase" }}>Studio</div>
              {sidebarItem("Watch", false)}
              {sidebarItem("Work", true)}
              {sidebarItem("Wrap", false)}
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "12px 0" }} />
              <div className="ev2-mono" style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", padding: "8px 12px 4px", textTransform: "uppercase" }}>Library</div>
              {sidebarItem("Catalog", false)}
              {sidebarItem("Pipeline", false)}
              {sidebarItem("Resources", false)}
              <div style={{ flex: 1 }} />
              <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#28C840" }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Reed Active</span>
              </div>
            </div>

            {/* Chat area */}
            <div style={{ flex: 1, background: "#161B22", padding: 28, display: "flex", flexDirection: "column" }}>
              <div className="ev2-mono" style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", textAlign: "center", marginBottom: 24 }}>
                Today at 10:42 AM
              </div>

              {/* User message */}
              <div style={{
                opacity: step >= 1 ? 1 : 0, transition: "opacity 0.5s ease",
                alignSelf: "flex-end", maxWidth: "80%", marginBottom: 20,
              }}>
                <div style={{
                  padding: "14px 18px", borderRadius: "14px 14px 4px 14px",
                  background: "rgba(255,255,255,0.06)", fontSize: 14,
                  color: "rgba(255,255,255,0.8)", lineHeight: 1.6,
                }}>
                  Write a product launch email for our Q2 feature release targeting enterprise design teams.
                </div>
              </div>

              {/* Composing indicator */}
              <div style={{
                opacity: step === 2 ? 1 : 0, transition: "opacity 0.3s ease",
                marginBottom: 16, display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(200,169,110,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.gold }} />
                </div>
                <div className="ev2-dot-pulse" style={{ display: "flex", gap: 4 }}>
                  <span /><span /><span />
                </div>
                <span className="ev2-mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                  Composing with 12 specialists...
                </span>
              </div>

              {/* Reed response */}
              <div style={{
                opacity: step >= 3 ? 1 : 0, transition: "opacity 0.6s ease",
                maxWidth: "90%", marginBottom: 20,
              }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(200,169,110,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.gold }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.gold, marginBottom: 8 }}>Reed</div>
                    <div style={{
                      padding: "16px 20px", borderRadius: "4px 14px 14px 14px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.7,
                    }}>
                      I analyzed your brand voice profile, reviewed the Q2 feature documentation, and cross-referenced engagement patterns from your last three launches. The draft targets the strategic pain points your enterprise segment flagged in March. Copy maintains a 96% voice DNA match with your established tone.
                    </div>
                  </div>
                </div>

                {/* Specialist tags */}
                <div style={{
                  display: "flex", gap: 6, flexWrap: "wrap", marginLeft: 40,
                  opacity: step >= 4 ? 1 : 0, transition: "opacity 0.5s ease 0.3s",
                }}>
                  {specialistTags.map((tag, i) => (
                    <span key={tag} style={{
                      padding: "4px 10px", borderRadius: 999,
                      background: "rgba(200,169,110,0.08)",
                      border: "1px solid rgba(200,169,110,0.15)",
                      fontSize: 11, color: "rgba(200,169,110,0.7)",
                      fontFamily: "'DM Mono',monospace",
                      transition: `opacity 0.4s ease ${0.3 + i * 0.08}s`,
                      opacity: step >= 4 ? 1 : 0,
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1 }} />

              {/* Input area */}
              <div style={{
                padding: "12px 16px", borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center",
              }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>Ask Reed anything...</span>
              </div>
            </div>

            {/* Metrics panel */}
            <div style={{
              width: 200, background: "#0D1117",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              padding: "20px 16px", flexShrink: 0,
            }}>
              <div className="ev2-mono" style={{
                fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em",
                textTransform: "uppercase", marginBottom: 24,
              }}>
                Composition
              </div>
              {metricBar("Voice DNA", "96%", 96, 0)}
              {metricBar("Impact", "High", 88, 0.15)}
              {metricBar("Brand Match", "94%", 94, 0.3)}

              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "16px 0" }} />

              <div style={{ opacity: step >= 4 ? 1 : 0, transition: "opacity 0.6s ease 0.5s" }}>
                <div className="ev2-mono" style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Gates</div>
                <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
                  {[1,2,3,4,5,6,7].map(n => (
                    <div key={n} style={{
                      width: 20, height: 20, borderRadius: "50%",
                      border: `1px solid ${T.gold}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, color: T.gold, fontFamily: "'DM Mono',monospace",
                    }}>{n}</div>
                  ))}
                </div>

                <div className="ev2-mono" style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Specialists</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: T.textOnDark }}>12 <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>activated</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════
// STATS — Count up
// ═══════════════════════════════════════════

function StatsSection() {
  const r = useReveal(0.2);
  const s1 = useCountUp(40, 1800, r.vis);
  const s2 = useCountUp(12, 1400, r.vis);
  const s3 = useCountUp(7, 1000, r.vis);

  const statStyle = {
    flex: 1, textAlign: "center", padding: "0 40px",
  };
  const numStyle = {
    fontSize: "clamp(52px, 7vw, 80px)", fontWeight: 700,
    letterSpacing: "-0.04em", lineHeight: 1, color: T.text,
  };
  const labelStyle = {
    fontFamily: "'DM Mono',monospace", fontSize: 12,
    letterSpacing: "0.08em", textTransform: "uppercase",
    color: T.textTer, marginTop: 12,
  };
  const divider = {
    width: 1, background: T.border, alignSelf: "stretch",
  };

  return (
    <section ref={r.ref} style={{ padding: "100px 48px", background: T.offwhite }}>
      <div className={`ev2-reveal ${r.vis ? "shown" : ""}`} style={{
        maxWidth: 960, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={statStyle}><div style={numStyle}>{s1}</div><div style={labelStyle}>Specialists</div></div>
        <div style={divider} />
        <div style={statStyle}><div style={numStyle}>{s2}</div><div style={labelStyle}>Output Formats</div></div>
        <div style={divider} />
        <div style={statStyle}><div style={numStyle}>{s3}</div><div style={labelStyle}>Quality Gates</div></div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════
// WATCH. WORK. WRAP.
// ═══════════════════════════════════════════

const WWW = [
  { name: "Watch", body: "The intelligence layer. Reed monitors your industry, tracks competitor moves, surfaces opportunities, and builds the strategic foundation before creation begins." },
  { name: "Work", body: "The creation engine. 40 specialists collaborate in real time across copywriting, brand voice, SEO, design direction, and distribution strategy." },
  { name: "Wrap", body: "The quality standard. Seven gates verify every output against voice DNA, strategic alignment, factual accuracy, and audience relevance before it ships." },
];

function WWWSection() {
  const r = useReveal();
  return (
    <section ref={r.ref} style={{ padding: "140px 48px", background: T.white }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className={`ev2-reveal ${r.vis ? "shown" : ""}`}>
          <div className="ev2-mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.textTer, marginBottom: 40 }}>
            03 / The System
          </div>
          <h2 style={{ fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.08, marginBottom: 72 }}>
            Watch. Work. Wrap.
          </h2>
        </div>

        <div className={`ev2-reveal ev2-d2 ${r.vis ? "shown" : ""}`} style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0,
        }}>
          {WWW.map((item, i) => (
            <div key={item.name} style={{
              padding: i === 0 ? "0 48px 0 0" : i === 2 ? "0 0 0 48px" : "0 48px",
              borderLeft: i > 0 ? `1px solid ${T.border}` : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                <div style={{ height: 1, width: 32, background: T.gold }} />
                <h3 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>{item.name}</h3>
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: T.textSec }}>{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════
// QUALITY GATES — Sequential light-up
// ═══════════════════════════════════════════

function QualitySection() {
  const r = useReveal(0.15);
  const [lit, setLit] = useState(0);

  useEffect(() => {
    if (!r.vis) return;
    let i = 0;
    const iv = setInterval(() => { i++; setLit(i); if (i >= 7) clearInterval(iv); }, 250);
    return () => clearInterval(iv);
  }, [r.vis]);

  const gateLabels = ["Voice", "Strategy", "Accuracy", "Audience", "Format", "Brand", "Final"];

  return (
    <section ref={r.ref} style={{ padding: "140px 48px", background: T.offwhite, textAlign: "center" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div className={`ev2-reveal ${r.vis ? "shown" : ""}`}>
          <div className="ev2-mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.textTer, marginBottom: 40 }}>
            04 / Quality Standard
          </div>
          <h2 style={{ fontSize: "clamp(32px, 4.5vw, 56px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20 }}>
            Seven gates. Zero compromises.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: T.textSec, maxWidth: 560, margin: "0 auto 64px" }}>
            Every piece of content passes through seven independent quality checkpoints before reaching your audience.
          </p>
        </div>

        <div className={`ev2-reveal ev2-d2 ${r.vis ? "shown" : ""}`} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 0, flexWrap: "wrap",
        }}>
          {gateLabels.map((label, i) => {
            const active = i < lit;
            return (
              <div key={label} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && (
                  <div style={{
                    width: 40, height: 1,
                    background: active ? T.gold : T.border,
                    transition: "background 0.4s ease",
                  }} />
                )}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    border: `1.5px solid ${active ? T.gold : T.border}`,
                    background: active ? "rgba(200,169,110,0.06)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 500,
                    color: active ? T.gold : T.textTer,
                    transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
                  }}>
                    {i + 1}
                  </div>
                  <span className="ev2-mono" style={{
                    fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase",
                    color: active ? T.gold : T.textTer,
                    transition: "color 0.4s ease",
                  }}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════
// CTA — Dark bookend
// ═══════════════════════════════════════════

function CTASection() {
  const r = useReveal();
  return (
    <section ref={r.ref} style={{
      padding: "160px 48px", background: T.navy, textAlign: "center",
      minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div className={`ev2-reveal ${r.vis ? "shown" : ""}`} style={{
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <div className="ev2-mono" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: T.textDimDark, marginBottom: 36 }}>
          Everywhere Studio
        </div>
        <h2 style={{
          fontSize: "clamp(32px, 5vw, 60px)", fontWeight: 600,
          letterSpacing: "-0.035em", lineHeight: 1.1,
          color: T.textOnDark, maxWidth: 600, marginBottom: 28,
        }}>
          Your content deserves<br />composed intelligence.
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.65, color: T.textDimDark, maxWidth: 400, marginBottom: 48 }}>
          Join the teams replacing content chaos with a system that compounds.
        </p>
        <button className="ev2-btn ev2-btn-white" style={{ marginBottom: 32 }}>Get Early Access</button>
        <div className="ev2-mono" style={{ fontSize: 12, color: T.textDimDark }}>
          mark@coastalintelligence.ai
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════
// FOOTER — Legal
// ═══════════════════════════════════════════

function Footer() {
  const linkStyle = {
    fontSize: 12, color: T.textTer, cursor: "pointer",
    background: "none", border: "none", fontFamily: "'Instrument Sans',sans-serif",
    textDecoration: "none",
    transition: "color 0.2s",
  };

  return (
    <footer style={{
      padding: "40px 48px", background: T.white,
      borderTop: `1px solid ${T.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 16,
    }}>
      <div style={{ fontSize: 12, color: T.textTer }}>
        &copy; {new Date().getFullYear()} Mixed Grill LLC / Coastal Intelligence. All rights reserved.
      </div>
      <div style={{ display: "flex", gap: 24 }}>
        <button style={linkStyle} onMouseOver={e => e.target.style.color = T.text} onMouseOut={e => e.target.style.color = T.textTer}>Terms of Service</button>
        <button style={linkStyle} onMouseOver={e => e.target.style.color = T.text} onMouseOut={e => e.target.style.color = T.textTer}>Privacy Policy</button>
        <button style={linkStyle} onMouseOver={e => e.target.style.color = T.text} onMouseOut={e => e.target.style.color = T.textTer}>Cookie Policy</button>
      </div>
      <div className="ev2-mono" style={{ fontSize: 11, color: T.textTer }}>
        mark@coastalintelligence.ai
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════

export default function ExploreV2() {
  return (
    <div className="ev2-root">
      <style>{CSS}</style>
      <ScrollBar />
      <Nav />
      <HeroSection />
      <ProblemSection />
      <ReedSection />
      <StatsSection />
      <WWWSection />
      <QualitySection />
      <CTASection />
      <Footer />
    </div>
  );
}
