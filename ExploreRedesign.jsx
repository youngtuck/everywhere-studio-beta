import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ─────────────────────────────────────────────
   EVERYWHERE STUDIO — EXPLORE PAGE REDESIGN
   Design direction: Modern precision on white.
   One dark moment (hero). Signature orchestration
   interaction. Instrument Sans throughout.
   ───────────────────────────────────────────── */

// ── Brand tokens ──
const T = {
  navy: "#0C1A29",
  navyLight: "#152233",
  gold: "#C8A96E",
  goldDim: "rgba(200,169,110,0.3)",
  blue: "#4A90D9",
  white: "#FFFFFF",
  bg: "#FAFAFA",
  text: "#0A0A0A",
  textSecondary: "#71717A",
  textTertiary: "#A1A1AA",
  textOnDark: "#F5F5F5",
  textOnDarkDim: "rgba(255,255,255,0.45)",
  border: "#E4E4E7",
  borderDark: "rgba(255,255,255,0.08)",
};

// ── Font import + global styles ──
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  .explore-root {
    font-family: 'Instrument Sans', -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: ${T.white};
    color: ${T.text};
    overflow-x: hidden;
  }

  .explore-root ::selection {
    background: ${T.gold};
    color: ${T.navy};
  }

  .mono { font-family: 'DM Mono', monospace; }

  /* ── Reveal animation ── */
  .reveal-target {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .reveal-target.revealed {
    opacity: 1;
    transform: translateY(0);
  }

  /* ── Subtle fade only (no translate) ── */
  .fade-target {
    opacity: 0;
    transition: opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .fade-target.revealed { opacity: 1; }

  /* ── Stagger delays ── */
  .delay-1 { transition-delay: 0.1s; }
  .delay-2 { transition-delay: 0.2s; }
  .delay-3 { transition-delay: 0.3s; }
  .delay-4 { transition-delay: 0.4s; }

  /* ── Button base ── */
  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 32px;
    font-family: 'Instrument Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .btn-primary:active { transform: scale(0.97); }

  .btn-dark {
    background: ${T.white};
    color: ${T.navy};
  }
  .btn-dark:hover { background: ${T.gold}; color: ${T.navy}; }

  .btn-light {
    background: ${T.navy};
    color: ${T.white};
  }
  .btn-light:hover { background: #1a2d42; }

  .btn-ghost {
    background: transparent;
    color: ${T.textSecondary};
    border: 1px solid ${T.border};
  }
  .btn-ghost:hover { border-color: ${T.text}; color: ${T.text}; }

  /* ── Section label ── */
  .section-label {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: ${T.textTertiary};
    margin-bottom: 40px;
  }
  .section-label-light {
    color: ${T.textOnDarkDim};
  }

  /* ── Section wrapper ── */
  .section-white {
    background: ${T.white};
    padding: 120px 40px;
  }
  .section-dark {
    background: ${T.navy};
    padding: 120px 40px;
  }

  .section-inner {
    max-width: 1080px;
    margin: 0 auto;
  }

  .section-inner-wide {
    max-width: 1280px;
    margin: 0 auto;
  }

  /* ── Typography ── */
  .heading-display {
    font-size: clamp(48px, 7vw, 88px);
    font-weight: 600;
    letter-spacing: -0.035em;
    line-height: 1.05;
  }

  .heading-section {
    font-size: clamp(32px, 4vw, 52px);
    font-weight: 600;
    letter-spacing: -0.03em;
    line-height: 1.15;
  }

  .heading-sub {
    font-size: clamp(20px, 2.5vw, 28px);
    font-weight: 500;
    letter-spacing: -0.02em;
    line-height: 1.35;
  }

  .body-large {
    font-size: 18px;
    font-weight: 400;
    line-height: 1.7;
    color: ${T.textSecondary};
    max-width: 640px;
  }

  .body-large-light {
    color: ${T.textOnDarkDim};
  }

  /* ── Dividers ── */
  .rule { height: 1px; background: ${T.border}; width: 100%; }
  .rule-gold { height: 1px; background: ${T.gold}; width: 60px; }
  .rule-dark { height: 1px; background: ${T.borderDark}; width: 100%; }

  /* ── Nav ── */
  .explore-nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 40px;
    height: 64px;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .explore-nav.nav-dark {
    background: transparent;
    color: ${T.textOnDark};
  }
  .explore-nav.nav-light {
    background: rgba(255,255,255,0.92);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    color: ${T.text};
    border-bottom: 1px solid ${T.border};
  }
  .nav-logo {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .nav-links {
    display: flex;
    align-items: center;
    gap: 32px;
  }
  .nav-link {
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.02em;
    opacity: 0.7;
    cursor: pointer;
    transition: opacity 0.2s;
    background: none;
    border: none;
    color: inherit;
    font-family: inherit;
  }
  .nav-link:hover { opacity: 1; }
  .nav-cta {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 10px 24px;
    border-radius: 999px;
    cursor: pointer;
    transition: all 0.3s;
    font-family: inherit;
  }
  .nav-cta-dark {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.15);
    color: ${T.textOnDark};
  }
  .nav-cta-dark:hover { background: rgba(255,255,255,0.15); }
  .nav-cta-light {
    background: ${T.navy};
    border: 1px solid ${T.navy};
    color: ${T.white};
  }
  .nav-cta-light:hover { background: #1a2d42; }

  /* ── Stats row ── */
  .stats-row {
    display: flex;
    gap: 0;
    justify-content: center;
    align-items: stretch;
  }
  .stat-item {
    flex: 1;
    text-align: center;
    padding: 0 40px;
  }
  .stat-item + .stat-item {
    border-left: 1px solid ${T.border};
  }
  .stat-number {
    font-size: clamp(48px, 6vw, 72px);
    font-weight: 700;
    letter-spacing: -0.04em;
    line-height: 1;
    color: ${T.text};
  }
  .stat-label {
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${T.textTertiary};
    margin-top: 12px;
  }

  /* ── Three columns ── */
  .three-col {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0;
  }
  .three-col-item {
    padding: 0 40px;
  }
  .three-col-item + .three-col-item {
    border-left: 1px solid ${T.border};
  }
  .three-col-item:first-child { padding-left: 0; }
  .three-col-item:last-child { padding-right: 0; }

  /* ── Reed demo ── */
  .reed-container {
    border: 1px solid ${T.border};
    border-radius: 16px;
    overflow: hidden;
    background: ${T.white};
    max-width: 720px;
  }
  .reed-header {
    padding: 16px 24px;
    border-bottom: 1px solid ${T.border};
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .reed-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${T.gold};
  }
  .reed-title {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .reed-body { padding: 32px 24px; }
  .reed-prompt {
    font-size: 14px;
    color: ${T.textTertiary};
    margin-bottom: 24px;
    padding-left: 16px;
    border-left: 2px solid ${T.border};
  }
  .reed-response {
    font-size: 16px;
    line-height: 1.7;
    color: ${T.text};
    margin-bottom: 24px;
  }
  .reed-metrics {
    display: flex;
    gap: 24px;
    padding-top: 16px;
    border-top: 1px solid ${T.border};
  }
  .reed-metric {
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    color: ${T.textTertiary};
  }
  .reed-metric-value {
    color: ${T.gold};
    font-weight: 500;
  }

  /* ── Quality gates ── */
  .gates-track {
    display: flex;
    align-items: center;
    gap: 0;
    justify-content: center;
    padding: 40px 0;
  }
  .gate-node {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1.5px solid ${T.border};
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Mono', monospace;
    font-size: 13px;
    font-weight: 500;
    color: ${T.textSecondary};
    flex-shrink: 0;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .gate-node:hover {
    border-color: ${T.gold};
    color: ${T.gold};
    transform: scale(1.1);
  }
  .gate-line {
    height: 1px;
    flex: 1;
    max-width: 80px;
    background: ${T.border};
  }

  /* ── Pain point items ── */
  .pain-item {
    padding: 32px 0;
    border-bottom: 1px solid ${T.border};
  }
  .pain-item:first-child { border-top: 1px solid ${T.border}; }
  .pain-number {
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    color: ${T.textTertiary};
    margin-bottom: 8px;
  }
  .pain-text {
    font-size: 20px;
    font-weight: 500;
    letter-spacing: -0.01em;
    line-height: 1.4;
    color: ${T.text};
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .section-white, .section-dark { padding: 80px 24px; }
    .explore-nav { padding: 0 24px; }
    .nav-links { gap: 16px; }
    .nav-link { display: none; }
    .three-col { grid-template-columns: 1fr; gap: 48px; }
    .three-col-item { padding: 0; }
    .three-col-item + .three-col-item { border-left: none; border-top: 1px solid ${T.border}; padding-top: 48px; }
    .stats-row { flex-direction: column; gap: 40px; }
    .stat-item + .stat-item { border-left: none; border-top: 1px solid ${T.border}; padding-top: 40px; }
    .stat-item { padding: 0; }
    .gates-track { flex-wrap: wrap; gap: 8px; }
    .gate-line { display: none; }
  }
`;

// ═══════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════

function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function useScrollPosition() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const onScroll = () => setY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return y;
}

// ═══════════════════════════════════════════════
// SIGNATURE INTERACTION — ORCHESTRATION CANVAS
// 40 nodes composing into intelligence
// ═══════════════════════════════════════════════

function OrchestrationCanvas() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const nodesRef = useRef(null);
  const frameRef = useRef(null);
  const startTimeRef = useRef(null);

  const initNodes = useCallback((w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const nodes = [];
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const dist = 120 + Math.random() * 200;
      const targetX = cx + Math.cos(angle) * dist;
      const targetY = cy + Math.sin(angle) * dist;
      nodes.push({
        x: cx + (Math.random() - 0.5) * w * 0.8,
        y: cy + (Math.random() - 0.5) * h * 0.7,
        targetX,
        targetY,
        driftX: (Math.random() - 0.5) * 0.15,
        driftY: (Math.random() - 0.5) * 0.15,
        radius: 1.8 + Math.random() * 0.6,
        baseOpacity: 0.25 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return nodes;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodesRef.current = initNodes(rect.width, rect.height);
    };

    resize();
    window.addEventListener("resize", resize);
    startTimeRef.current = performance.now();

    const onMouse = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    canvas.addEventListener("mousemove", onMouse);

    const draw = (now) => {
      const elapsed = (now - startTimeRef.current) / 1000;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const nodes = nodesRef.current;
      if (!nodes) { frameRef.current = requestAnimationFrame(draw); return; }

      ctx.clearRect(0, 0, w, h);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const composeProgress = Math.min(1, Math.max(0, (elapsed - 1.5) / 3));
      const connectionAlpha = Math.min(1, Math.max(0, (elapsed - 0.8) / 2));

      // Update positions: drift toward target over time
      for (const n of nodes) {
        n.x += (n.targetX - n.x) * 0.003 * composeProgress + n.driftX;
        n.y += (n.targetY - n.y) * 0.003 * composeProgress + n.driftY;
        // Gentle breathing drift
        n.driftX += (Math.random() - 0.5) * 0.005;
        n.driftY += (Math.random() - 0.5) * 0.005;
        n.driftX *= 0.99;
        n.driftY *= 0.99;
      }

      // Draw connections
      if (connectionAlpha > 0) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 140;
            if (dist < maxDist) {
              const strength = (1 - dist / maxDist) * connectionAlpha;
              // Mouse proximity boost
              const midX = (nodes[i].x + nodes[j].x) / 2;
              const midY = (nodes[i].y + nodes[j].y) / 2;
              const mDist = Math.sqrt((midX - mx) ** 2 + (midY - my) ** 2);
              const mBoost = mDist < 180 ? 1 + (1 - mDist / 180) * 1.5 : 1;
              ctx.beginPath();
              ctx.moveTo(nodes[i].x, nodes[i].y);
              ctx.lineTo(nodes[j].x, nodes[j].y);
              ctx.strokeStyle = `rgba(200,169,110,${strength * 0.1 * mBoost})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      }

      // Draw nodes
      const fadeIn = Math.min(1, elapsed / 1.5);
      for (const n of nodes) {
        const pulse = Math.sin(now * 0.001 + n.phase) * 0.15;
        const mDist = Math.sqrt((n.x - mx) ** 2 + (n.y - my) ** 2);
        const mGlow = mDist < 150 ? (1 - mDist / 150) * 0.4 : 0;
        const alpha = (n.baseOpacity + pulse + mGlow) * fadeIn;
        const r = n.radius + (mDist < 150 ? (1 - mDist / 150) * 1 : 0);

        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245,245,245,${alpha})`;
        ctx.fill();

        // Gold core for mouse-proximate nodes
        if (mGlow > 0.1) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200,169,110,${mGlow * 0.6})`;
          ctx.fill();
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMouse);
    };
  }, [initNodes]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "all" }}
    />
  );
}

// ═══════════════════════════════════════════════
// SECTION COMPONENTS
// ═══════════════════════════════════════════════

function Nav({ scrollY }) {
  const pastHero = scrollY > 100;
  return (
    <nav className={`explore-nav ${pastHero ? "nav-light" : "nav-dark"}`}>
      <div className="nav-logo">Everywhere Studio</div>
      <div className="nav-links">
        <button className="nav-link">How It Works</button>
        <button className="nav-link">Resources</button>
        <button className="nav-link">Sign In</button>
        <button className={`nav-cta ${pastHero ? "nav-cta-light" : "nav-cta-dark"}`}>
          Get Early Access
        </button>
      </div>
    </nav>
  );
}

function Hero() {
  const [headlineVisible, setHeadlineVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setHeadlineVisible(true), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="section-dark" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: "120px 40px 80px" }}>
      <OrchestrationCanvas />
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 800, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Label */}
        <div
          className="mono section-label section-label-light"
          style={{
            opacity: headlineVisible ? 1 : 0,
            transition: "opacity 1s cubic-bezier(0.16,1,0.3,1)",
            transitionDelay: "0s",
          }}
        >
          40 Specialists. 7 Gates. One Intelligence.
        </div>

        {/* Main headline */}
        <h1
          className="heading-display"
          style={{
            color: T.textOnDark,
            opacity: headlineVisible ? 1 : 0,
            transform: headlineVisible ? "translateY(0)" : "translateY(16px)",
            transition: "all 1.2s cubic-bezier(0.16,1,0.3,1)",
            transitionDelay: "0.15s",
            marginBottom: 24,
          }}
        >
          Composed
          <br />
          Intelligence
        </h1>

        {/* Subline */}
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.6,
            color: T.textOnDarkDim,
            maxWidth: 480,
            opacity: headlineVisible ? 1 : 0,
            transform: headlineVisible ? "translateY(0)" : "translateY(12px)",
            transition: "all 1s cubic-bezier(0.16,1,0.3,1)",
            transitionDelay: "0.4s",
            marginBottom: 40,
          }}
        >
          Content that performs. Quality that scales.
          <br />
          Intelligence that compounds.
        </p>

        {/* CTA */}
        <div
          style={{
            opacity: headlineVisible ? 1 : 0,
            transform: headlineVisible ? "translateY(0)" : "translateY(8px)",
            transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)",
            transitionDelay: "0.6s",
          }}
        >
          <button className="btn-primary btn-dark">Get Early Access</button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{
        position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        opacity: headlineVisible ? 0.4 : 0,
        transition: "opacity 1s ease 1.2s",
      }}>
        <div style={{ width: 1, height: 32, background: `linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)` }} />
      </div>
    </section>
  );
}

function ProblemSection() {
  const r = useReveal();
  const problems = [
    { num: "01", text: "Your team produces 200 pieces of content a month. You have no idea which 10 actually moved the needle." },
    { num: "02", text: "You hired specialists for strategy, brand voice, SEO, and distribution. They have never been in the same room." },
    { num: "03", text: "Your AI tools generate fast. Your audience can tell." },
    { num: "04", text: "Quality review happens after publishing, if it happens at all." },
  ];

  return (
    <section className="section-white">
      <div className="section-inner" ref={r.ref}>
        <div className={`reveal-target ${r.visible ? "revealed" : ""}`}>
          <div className="section-label mono">01 / The Problem</div>
          <h2 className="heading-section" style={{ maxWidth: 720, marginBottom: 64 }}>
            Content teams are drowning in tools.
            <span style={{ color: T.textTertiary }}> Starving for strategy.</span>
          </h2>
        </div>
        <div>
          {problems.map((p, i) => (
            <div key={p.num} className={`pain-item reveal-target delay-${i + 1} ${r.visible ? "revealed" : ""}`}>
              <div className="pain-number mono">{p.num}</div>
              <div className="pain-text">{p.text}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReedSection() {
  const r = useReveal();
  return (
    <section className="section-white" style={{ background: T.bg }}>
      <div className="section-inner" ref={r.ref}>
        <div className={`reveal-target ${r.visible ? "revealed" : ""}`}>
          <div className="section-label mono">02 / Meet Reed</div>
          <h2 className="heading-section" style={{ maxWidth: 640, marginBottom: 16 }}>
            Intelligence that thinks before it writes.
          </h2>
          <p className="body-large" style={{ marginBottom: 56 }}>
            Reed is your composed intelligence layer. It coordinates 40 specialists across research, strategy, voice calibration, and quality review before a single word reaches your audience.
          </p>
        </div>

        <div className={`reed-container reveal-target delay-2 ${r.visible ? "revealed" : ""}`}>
          <div className="reed-header">
            <div className="reed-dot" />
            <div className="reed-title">Reed</div>
            <span className="mono" style={{ fontSize: 11, color: T.textTertiary, marginLeft: "auto" }}>Active</span>
          </div>
          <div className="reed-body">
            <div className="reed-prompt">
              Write a product launch email for our Q2 feature release targeting enterprise design teams.
            </div>
            <div className="reed-response">
              I have analyzed your brand voice profile, reviewed the Q2 feature documentation, cross-referenced engagement patterns from your last three launches, and drafted an email optimized for your enterprise segment. The copy maintains a 96% voice DNA match and targets the strategic pain points your analytics flagged in March.
            </div>
            <div className="reed-metrics">
              <div className="reed-metric">Voice DNA: <span className="reed-metric-value">96%</span></div>
              <div className="reed-metric">Impact Score: <span className="reed-metric-value">High</span></div>
              <div className="reed-metric">Gates Cleared: <span className="reed-metric-value">7/7</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const r = useReveal(0.2);
  const stats = [
    { number: "40", label: "Specialists" },
    { number: "12", label: "Output Formats" },
    { number: "7", label: "Quality Gates" },
  ];
  return (
    <section className="section-white" style={{ padding: "100px 40px" }}>
      <div className="section-inner-wide" ref={r.ref}>
        <div className={`stats-row reveal-target ${r.visible ? "revealed" : ""}`}>
          {stats.map((s) => (
            <div key={s.label} className="stat-item">
              <div className="stat-number">{s.number}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WatchWorkWrapSection() {
  const r = useReveal();
  const rooms = [
    {
      name: "Watch",
      desc: "The intelligence layer. Reed monitors your industry, tracks competitor moves, surfaces opportunities, and builds the strategic foundation before creation begins.",
    },
    {
      name: "Work",
      desc: "The creation engine. 40 specialists collaborate in real time, each contributing expertise across copywriting, brand voice, SEO, design direction, and distribution strategy.",
    },
    {
      name: "Wrap",
      desc: "The quality standard. Seven gates verify every output against your voice DNA, strategic alignment, factual accuracy, and audience relevance before it ships.",
    },
  ];

  return (
    <section className="section-white" style={{ background: T.bg }}>
      <div className="section-inner-wide" ref={r.ref}>
        <div className={`reveal-target ${r.visible ? "revealed" : ""}`}>
          <div className="section-label mono">03 / The System</div>
          <h2 className="heading-section" style={{ marginBottom: 64 }}>
            Watch. Work. Wrap.
          </h2>
        </div>
        <div className={`three-col reveal-target delay-2 ${r.visible ? "revealed" : ""}`}>
          {rooms.map((room) => (
            <div key={room.name} className="three-col-item">
              <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <div className="rule-gold" />
                <h3 className="heading-sub">{room.name}</h3>
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: T.textSecondary }}>
                {room.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QualitySection() {
  const r = useReveal();
  return (
    <section className="section-white">
      <div className="section-inner" ref={r.ref} style={{ textAlign: "center" }}>
        <div className={`reveal-target ${r.visible ? "revealed" : ""}`}>
          <div className="section-label mono">04 / Quality Standard</div>
          <h2 className="heading-section" style={{ marginBottom: 16 }}>
            Seven gates. Zero compromises.
          </h2>
          <p className="body-large" style={{ margin: "0 auto 48px", textAlign: "center" }}>
            Every piece of content passes through seven independent quality checkpoints before it reaches your audience. Voice consistency, strategic alignment, factual accuracy, audience calibration, format optimization, brand compliance, and final review.
          </p>
        </div>
        <div className={`gates-track reveal-target delay-2 ${r.visible ? "revealed" : ""}`}>
          {[1, 2, 3, 4, 5, 6, 7].map((n, i) => (
            <React.Fragment key={n}>
              {i > 0 && <div className="gate-line" />}
              <div className="gate-node">{n}</div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const r = useReveal();
  return (
    <section className="section-dark" style={{ textAlign: "center", minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="section-inner" ref={r.ref} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className={`reveal-target ${r.visible ? "revealed" : ""}`}>
          <div className="section-label mono section-label-light" style={{ marginBottom: 32 }}>
            Everywhere Studio
          </div>
          <h2 className="heading-section" style={{ color: T.textOnDark, maxWidth: 600, marginBottom: 24 }}>
            Your content deserves
            <br />composed intelligence.
          </h2>
          <p style={{ fontSize: 16, color: T.textOnDarkDim, marginBottom: 40, maxWidth: 400, margin: "0 auto 40px" }}>
            Join the teams replacing content chaos with a system that compounds.
          </p>
          <button className="btn-primary btn-dark" style={{ marginBottom: 24 }}>Get Early Access</button>
          <div className="mono" style={{ fontSize: 12, color: T.textOnDarkDim }}>
            mark@coastalintelligence.ai
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════

export default function ExploreRedesign() {
  const scrollY = useScrollPosition();

  return (
    <div className="explore-root">
      <style>{GLOBAL_CSS}</style>
      <Nav scrollY={scrollY} />
      <Hero />
      <ProblemSection />
      <ReedSection />
      <StatsSection />
      <WatchWorkWrapSection />
      <QualitySection />
      <CTASection />
    </div>
  );
}
