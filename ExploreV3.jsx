import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════
   EVERYWHERE STUDIO / EXPLORE v3
   No sticky hacks. No canvas particle slop.
   Typography-driven. CSS geometry. Reed is the star.
   ═══════════════════════════════════════════════════ */

const T = {
  navy: "#0C1A29",
  gold: "#C8A96E",
  white: "#FFFFFF",
  off: "#F8F9FA",
  text: "#0A0A0A",
  sec: "#6B7280",
  ter: "#A1A1AA",
  onDark: "#F0EDE4",
  dimDark: "rgba(255,255,255,0.38)",
  border: "#E4E4E7",
  bDark: "rgba(255,255,255,0.06)",
};

function lerp(a, b, t) { return a + (b - a) * t; }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');

*{margin:0;padding:0;box-sizing:border-box;}
html{scroll-behavior:smooth;}
.ev3{
  font-family:'Instrument Sans',-apple-system,system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
  background:${T.white};color:${T.text};overflow-x:hidden;
}
.ev3 ::selection{background:${T.gold};color:${T.navy};}
.ev3 *:focus{outline:none;}
.m{font-family:'DM Mono',monospace;}

/* ── Keyframes ── */
@keyframes ev3up{
  from{opacity:0;transform:translateY(18px);}
  to{opacity:1;transform:translateY(0);}
}
@keyframes ev3fade{from{opacity:0;}to{opacity:1;}}
@keyframes ev3line{from{width:0;opacity:0;}to{width:64px;opacity:1;}}
@keyframes ev3spin{
  from{transform:translate(-50%,-50%) rotate(0deg);}
  to{transform:translate(-50%,-50%) rotate(360deg);}
}
@keyframes ev3spinR{
  from{transform:translate(-50%,-50%) rotate(0deg);}
  to{transform:translate(-50%,-50%) rotate(-360deg);}
}
@keyframes ev3dot{0%,100%{opacity:.25;}50%{opacity:1;}}
@keyframes ev3glow{
  0%,100%{opacity:.03;}
  50%{opacity:.07;}
}

/* ── Hero entries ── */
.ev3-h-label{animation:ev3up .8s cubic-bezier(.16,1,.3,1) .4s both;}
.ev3-h-head{animation:ev3up 1s cubic-bezier(.16,1,.3,1) .7s both;}
.ev3-h-rule{animation:ev3line 1.2s cubic-bezier(.16,1,.3,1) 1.3s both;}
.ev3-h-sub{animation:ev3up .8s cubic-bezier(.16,1,.3,1) 1.5s both;}
.ev3-h-cta{animation:ev3up .7s cubic-bezier(.16,1,.3,1) 1.8s both;}

/* ── Scroll reveal ── */
.ev3-r{opacity:0;transform:translateY(24px);transition:opacity .9s cubic-bezier(.16,1,.3,1),transform .9s cubic-bezier(.16,1,.3,1);}
.ev3-r.on{opacity:1;transform:translateY(0);}
.ev3-d1{transition-delay:.1s;}
.ev3-d2{transition-delay:.22s;}
.ev3-d3{transition-delay:.34s;}
.ev3-d4{transition-delay:.46s;}

/* ── Nav ── */
.ev3-nav{
  position:fixed;top:0;left:0;right:0;z-index:100;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 48px;height:56px;
  transition:all .5s cubic-bezier(.16,1,.3,1);
}
.ev3-nav-d{background:transparent;color:${T.onDark};}
.ev3-nav-l{
  background:rgba(255,255,255,.9);
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  color:${T.text};border-bottom:1px solid ${T.border};
}
.ev3-nav-logo{font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;}
.ev3-nav-r{display:flex;align-items:center;gap:24px;}
.ev3-nl{
  font-size:13px;font-weight:500;opacity:.55;cursor:pointer;
  background:none;border:none;color:inherit;font-family:inherit;transition:opacity .2s;
}
.ev3-nl:hover{opacity:1;}
.ev3-nc{
  font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;
  padding:9px 22px;border-radius:999px;cursor:pointer;font-family:inherit;transition:all .3s;
}
.ev3-nc-d{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);color:${T.onDark};}
.ev3-nc-d:hover{background:rgba(255,255,255,.14);}
.ev3-nc-l{background:${T.navy};border:1px solid ${T.navy};color:${T.white};}
.ev3-nc-l:hover{background:#15283d;}

/* ── Buttons ── */
.ev3-btn{
  display:inline-flex;align-items:center;gap:8px;
  padding:15px 34px;font-family:'Instrument Sans',sans-serif;
  font-size:12px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;
  border:none;border-radius:999px;cursor:pointer;
  transition:all .35s cubic-bezier(.16,1,.3,1);
}
.ev3-btn:active{transform:scale(.97);}
.ev3-btn-w{background:${T.white};color:${T.navy};}
.ev3-btn-w:hover{background:${T.gold};}
.ev3-btn-n{background:${T.navy};color:${T.white};}
.ev3-btn-n:hover{background:#15283d;}

/* ── Pulse dots ── */
.ev3-dots span{
  display:inline-block;width:5px;height:5px;border-radius:50%;
  background:${T.gold};animation:ev3dot 1.2s infinite;
}
.ev3-dots span:nth-child(2){animation-delay:.2s;}
.ev3-dots span:nth-child(3){animation-delay:.4s;}

/* ── Responsive ── */
@media(max-width:900px){
  .ev3-nav{padding:0 24px;}
  .ev3-nl{display:none;}
  .ev3-3col{grid-template-columns:1fr !important;}
  .ev3-3col>div+div{border-left:none !important;border-top:1px solid ${T.border};padding-top:40px !important;padding-left:0 !important;}
  .ev3-3col>div:first-child{padding-right:0 !important;}
  .ev3-3col>div:last-child{padding-right:0 !important;}
  .ev3-reed-side{display:none !important;}
  .ev3-reed-met{display:none !important;}
  .ev3-stats{flex-direction:column !important;}
  .ev3-stats>div+div{border-left:none !important;border-top:1px solid ${T.border};padding-top:32px !important;}
  .ev3-gates-track{flex-wrap:wrap !important;gap:12px !important;}
  .ev3-gate-line{display:none !important;}
  .ev3-hero-rings>div{transform:translate(-50%,-50%) scale(.6) !important;}
}
@media(max-width:600px){
  .ev3-sect{padding-left:20px !important;padding-right:20px !important;}
}
`;

// ═══════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════

function useReveal(threshold = 0.1) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setOn(true); obs.disconnect(); } },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, on };
}

function useCountUp(target, dur, trigger) {
  const [v, setV] = useState(0);
  const ran = useRef(false);
  useEffect(() => {
    if (!trigger || ran.current) return;
    ran.current = true;
    const t0 = performance.now();
    const go = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      setV(Math.round(target * easeOut(p)));
      if (p < 1) requestAnimationFrame(go);
    };
    requestAnimationFrame(go);
  }, [trigger, target, dur]);
  return v;
}

// ═══════════════════════════════════════════
// SCROLL PROGRESS BAR (gold, top)
// ═══════════════════════════════════════════

function Bar() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const f = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setP(h > 0 ? window.scrollY / h : 0);
    };
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, zIndex: 200, background: "transparent" }}>
      <div style={{ height: "100%", background: T.gold, width: `${p * 100}%`, transition: "width .06s linear" }} />
    </div>
  );
}

// ═══════════════════════════════════════════
// NAV
// ═══════════════════════════════════════════

function Nav() {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const f = () => setPast(window.scrollY > 60);
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <nav className={`ev3-nav ${past ? "ev3-nav-l" : "ev3-nav-d"}`}>
      <div className="ev3-nav-logo">Everywhere Studio</div>
      <div className="ev3-nav-r">
        <button className="ev3-nl">How It Works</button>
        <button className="ev3-nl">Resources</button>
        <button className="ev3-nl">Sign In</button>
        <button className={`ev3-nc ${past ? "ev3-nc-l" : "ev3-nc-d"}`}>Get Early Access</button>
      </div>
    </nav>
  );
}

// ═══════════════════════════════════════════
// HERO — CSS geometry + typography
// Three slowly rotating rings. That's it.
// ═══════════════════════════════════════════

function Hero() {
  return (
    <section style={{
      minHeight: "100vh", background: T.navy, position: "relative",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "80px 48px", overflow: "hidden",
    }} className="ev3-sect">
      {/* Subtle radial glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: "120%", height: "120%",
        transform: "translate(-50%,-50%)",
        background: "radial-gradient(ellipse at 50% 45%, rgba(200,169,110,0.04) 0%, transparent 60%)",
        animation: "ev3glow 8s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      {/* Geometric rings */}
      <div className="ev3-hero-rings" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 320, height: 320, borderRadius: "50%",
          border: "0.5px solid rgba(200,169,110,0.055)",
          animation: "ev3spin 80s linear infinite",
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 520, height: 520, borderRadius: "50%",
          border: "0.5px solid rgba(255,255,255,0.035)",
          animation: "ev3spinR 140s linear infinite",
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 740, height: 740, borderRadius: "50%",
          border: "0.5px solid rgba(255,255,255,0.025)",
          animation: "ev3spin 200s linear infinite",
        }} />
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 800, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="m ev3-h-label" style={{
          fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
          color: T.dimDark, marginBottom: 28,
        }}>
          40 Specialists. 7 Gates. One Intelligence.
        </div>

        <h1 className="ev3-h-head" style={{
          fontSize: "clamp(52px, 8.5vw, 100px)", fontWeight: 600,
          letterSpacing: "-0.04em", lineHeight: 1.02,
          color: T.onDark, marginBottom: 24,
        }}>
          Composed<br />Intelligence
        </h1>

        <div className="ev3-h-rule" style={{
          height: 1, background: T.gold, marginBottom: 28,
        }} />

        <p className="ev3-h-sub" style={{
          fontSize: 17, lineHeight: 1.65, color: T.dimDark,
          maxWidth: 400, marginBottom: 44,
        }}>
          Content that performs. Quality that scales.<br />
          Intelligence that compounds.
        </p>

        <div className="ev3-h-cta">
          <button className="ev3-btn ev3-btn-w">Get Early Access</button>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════
// PROBLEM — Editorial stack
// ═══════════════════════════════════════════

const PROBS = [
  "Your team produces 200 pieces of content a month. You have no idea which 10 moved the needle.",
  "You hired specialists for strategy, brand voice, SEO, and distribution. They have never been in the same room.",
  "Your AI tools generate fast. Your audience can tell.",
  "Quality review happens after publishing. If it happens at all.",
];

function ProblemSection() {
  const r = useReveal();
  return (
    <section className="ev3-sect" ref={r.ref} style={{ padding: "140px 48px", background: T.white }}>
      <div style={{ maxWidth: 840, margin: "0 auto" }}>
        <div className={`ev3-r ${r.on ? "on" : ""}`}>
          <div className="m" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.ter, marginBottom: 40 }}>01 / The Problem</div>
          <h2 style={{ fontSize: "clamp(30px, 4vw, 48px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.12, maxWidth: 640, marginBottom: 56 }}>
            Content teams are drowning in tools.{" "}
            <span style={{ color: T.ter }}>Starving for strategy.</span>
          </h2>
        </div>
        <div>
          {PROBS.map((txt, i) => (
            <div key={i} className={`ev3-r ev3-d${i + 1} ${r.on ? "on" : ""}`} style={{
              padding: "28px 0",
              borderTop: i === 0 ? `1px solid ${T.border}` : "none",
              borderBottom: `1px solid ${T.border}`,
              display: "flex", gap: 24, alignItems: "baseline",
            }}>
              <span className="m" style={{ fontSize: 12, color: T.gold, letterSpacing: "0.06em", flexShrink: 0 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <p style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.5, color: T.text }}>
                {txt}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════
// REED — Production interface mockup
// ═══════════════════════════════════════════

function ReedSection() {
  const r = useReveal(0.05);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!r.on) return;
    const timers = [
      setTimeout(() => setStep(1), 500),
      setTimeout(() => setStep(2), 1400),
      setTimeout(() => setStep(3), 2600),
      setTimeout(() => setStep(4), 3500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [r.on]);

  const sI = (label, active) => (
    <div style={{
      padding: "7px 12px", borderRadius: 6, fontSize: 13,
      color: active ? T.onDark : "rgba(255,255,255,0.3)",
      background: active ? "rgba(255,255,255,0.05)" : "transparent",
      display: "flex", alignItems: "center", gap: 8,
      fontWeight: active ? 500 : 400, cursor: "pointer",
    }}>
      {active && <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.gold }} />}
      {label}
    </div>
  );

  const mBar = (label, val, pct, delay) => (
    <div style={{ marginBottom: 18, opacity: step >= 4 ? 1 : 0, transition: `opacity .5s ease ${delay}s` }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span className="m" style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
        <span className="m" style={{ fontSize: 11, color: T.gold, fontWeight: 500 }}>{val}</span>
      </div>
      <div style={{ height: 2, background: "rgba(255,255,255,0.05)", borderRadius: 1, overflow: "hidden" }}>
        <div style={{
          height: "100%", background: T.gold, borderRadius: 1,
          width: step >= 4 ? `${pct}%` : "0%",
          transition: `width 1s cubic-bezier(.16,1,.3,1) ${delay + 0.2}s`,
        }} />
      </div>
    </div>
  );

  const tags = ["Brand Voice", "Enterprise Copy", "SEO", "Distribution", "Analytics"];

  return (
    <section className="ev3-sect" ref={r.ref} style={{ padding: "140px 48px", background: T.off }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className={`ev3-r ${r.on ? "on" : ""}`}>
          <div className="m" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.ter, marginBottom: 40 }}>02 / Meet Reed</div>
          <h2 style={{ fontSize: "clamp(30px, 4.5vw, 52px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.1, maxWidth: 600, marginBottom: 16 }}>
            Intelligence that thinks before it writes.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: T.sec, maxWidth: 520, marginBottom: 56 }}>
            Reed coordinates 40 specialists across research, strategy, voice calibration, and quality review before a single word reaches your audience.
          </p>
        </div>

        {/* ── Interface mockup ── */}
        <div className={`ev3-r ev3-d2 ${r.on ? "on" : ""}`} style={{
          borderRadius: 14, overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.04)",
          background: "#0D1117",
        }}>
          {/* Title bar */}
          <div style={{
            display: "flex", alignItems: "center", padding: "12px 18px",
            background: "#0B0F14", borderBottom: `1px solid ${T.bDark}`,
          }}>
            <div style={{ display: "flex", gap: 7 }}>
              <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#FF5F57" }} />
              <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#FEBC2E" }} />
              <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#28C840" }} />
            </div>
            <div style={{ flex: 1, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>Everywhere Studio</div>
            <div style={{ width: 48 }} />
          </div>

          <div style={{ display: "flex", minHeight: 420 }}>
            {/* Sidebar */}
            <div className="ev3-reed-side" style={{
              width: 172, background: "#0B0F14",
              borderRight: `1px solid ${T.bDark}`,
              padding: "18px 10px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 1,
            }}>
              <div className="m" style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", padding: "6px 12px 4px", textTransform: "uppercase" }}>Studio</div>
              {sI("Watch", false)}
              {sI("Work", true)}
              {sI("Wrap", false)}
              <div style={{ height: 1, background: T.bDark, margin: "10px 0" }} />
              <div className="m" style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", padding: "6px 12px 4px", textTransform: "uppercase" }}>Library</div>
              {sI("Catalog", false)}
              {sI("Pipeline", false)}
              {sI("Resources", false)}
              <div style={{ flex: 1 }} />
              <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#28C840" }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Reed Active</span>
              </div>
            </div>

            {/* Chat */}
            <div style={{ flex: 1, background: "#141A22", padding: "24px 28px", display: "flex", flexDirection: "column" }}>
              <div className="m" style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", textAlign: "center", marginBottom: 20 }}>Today at 10:42 AM</div>

              {/* User msg */}
              <div style={{
                opacity: step >= 1 ? 1 : 0, transform: step >= 1 ? "translateY(0)" : "translateY(8px)",
                transition: "all .5s cubic-bezier(.16,1,.3,1)",
                alignSelf: "flex-end", maxWidth: "78%", marginBottom: 18,
              }}>
                <div style={{
                  padding: "13px 17px", borderRadius: "13px 13px 3px 13px",
                  background: "rgba(255,255,255,0.05)", fontSize: 14,
                  color: "rgba(255,255,255,0.75)", lineHeight: 1.6,
                }}>
                  Write a product launch email for our Q2 feature release targeting enterprise design teams.
                </div>
              </div>

              {/* Composing */}
              <div style={{
                opacity: step === 2 ? 1 : 0, transition: "opacity .25s ease",
                marginBottom: 14, display: "flex", alignItems: "center", gap: 10, minHeight: 32,
              }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(200,169,110,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.gold }} />
                </div>
                <div className="ev3-dots" style={{ display: "flex", gap: 3 }}><span /><span /><span /></div>
                <span className="m" style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Composing with 12 specialists...</span>
              </div>

              {/* Reed response */}
              <div style={{
                opacity: step >= 3 ? 1 : 0, transform: step >= 3 ? "translateY(0)" : "translateY(8px)",
                transition: "all .6s cubic-bezier(.16,1,.3,1)",
                maxWidth: "88%", marginBottom: 16,
              }}>
                <div style={{ display: "flex", gap: 11 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(200,169,110,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.gold }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.gold, marginBottom: 7 }}>Reed</div>
                    <div style={{
                      padding: "14px 18px", borderRadius: "3px 13px 13px 13px",
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${T.bDark}`,
                      fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.7,
                    }}>
                      I analyzed your brand voice profile, reviewed the Q2 feature documentation, and cross-referenced engagement patterns from your last three launches. The draft targets the strategic pain points your enterprise segment flagged in March. Copy maintains a 96% voice DNA match with your established tone.
                    </div>
                    {/* Tags */}
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 12 }}>
                      {tags.map((tag, i) => (
                        <span key={tag} style={{
                          padding: "3px 9px", borderRadius: 999,
                          background: "rgba(200,169,110,0.07)",
                          border: "1px solid rgba(200,169,110,0.12)",
                          fontSize: 10, color: "rgba(200,169,110,0.65)",
                          fontFamily: "'DM Mono',monospace",
                          opacity: step >= 4 ? 1 : 0,
                          transition: `opacity .4s ease ${0.3 + i * 0.07}s`,
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ flex: 1 }} />

              {/* Input */}
              <div style={{
                padding: "11px 16px", borderRadius: 9,
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${T.bDark}`,
                display: "flex", alignItems: "center",
              }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.18)" }}>Ask Reed anything...</span>
              </div>
            </div>

            {/* Metrics */}
            <div className="ev3-reed-met" style={{
              width: 192, background: "#0B0F14",
              borderLeft: `1px solid ${T.bDark}`,
              padding: "18px 14px", flexShrink: 0,
            }}>
              <div className="m" style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 22 }}>Composition</div>
              {mBar("Voice DNA", "96%", 96, 0)}
              {mBar("Impact", "High", 88, 0.12)}
              {mBar("Brand Match", "94%", 94, 0.24)}

              <div style={{ height: 1, background: T.bDark, margin: "14px 0" }} />

              <div style={{ opacity: step >= 4 ? 1 : 0, transition: "opacity .5s ease .4s" }}>
                <div className="m" style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Gates</div>
                <div style={{ display: "flex", gap: 3, marginBottom: 18 }}>
                  {[1,2,3,4,5,6,7].map(n => (
                    <div key={n} style={{
                      width: 18, height: 18, borderRadius: "50%",
                      border: `1px solid rgba(200,169,110,0.35)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, color: T.gold, fontFamily: "'DM Mono',monospace",
                    }}>{n}</div>
                  ))}
                </div>
                <div className="m" style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Specialists</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: T.onDark, lineHeight: 1 }}>
                  12 <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontWeight: 400 }}>activated</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════

function Stats() {
  const r = useReveal(0.15);
  const a = useCountUp(40, 1600, r.on);
  const b = useCountUp(12, 1200, r.on);
  const c = useCountUp(7, 900, r.on);

  const n = { fontSize: "clamp(48px, 6.5vw, 76px)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 };
  const l = { fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.ter, marginTop: 10 };

  return (
    <section className="ev3-sect" ref={r.ref} style={{ padding: "100px 48px", background: T.white }}>
      <div className={`ev3-r ev3-stats ${r.on ? "on" : ""}`} style={{
        maxWidth: 880, margin: "0 auto",
        display: "flex", alignItems: "center",
      }}>
        {[{ v: a, t: "Specialists" }, { v: b, t: "Output Formats" }, { v: c, t: "Quality Gates" }].map((s, i) => (
          <React.Fragment key={s.t}>
            {i > 0 && <div style={{ width: 1, background: T.border, alignSelf: "stretch" }} />}
            <div style={{ flex: 1, textAlign: "center", padding: "0 32px" }}>
              <div style={n}>{s.v}</div>
              <div style={l}>{s.t}</div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════
// WATCH. WORK. WRAP.
// ═══════════════════════════════════════════

const ROOMS = [
  { name: "Watch", body: "The intelligence layer. Reed monitors your industry, tracks competitor moves, surfaces opportunities, and builds strategic foundation before creation begins." },
  { name: "Work", body: "The creation engine. 40 specialists collaborate in real time across copywriting, brand voice, SEO, design direction, and distribution strategy." },
  { name: "Wrap", body: "The quality standard. Seven gates verify every output against voice DNA, strategic alignment, factual accuracy, and audience relevance before it ships." },
];

function WWW() {
  const r = useReveal();
  return (
    <section className="ev3-sect" ref={r.ref} style={{ padding: "140px 48px", background: T.off }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className={`ev3-r ${r.on ? "on" : ""}`}>
          <div className="m" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.ter, marginBottom: 40 }}>03 / The System</div>
          <h2 style={{ fontSize: "clamp(34px, 5vw, 56px)", fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.08, marginBottom: 64 }}>Watch. Work. Wrap.</h2>
        </div>
        <div className={`ev3-r ev3-d2 ev3-3col ${r.on ? "on" : ""}`} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
          {ROOMS.map((rm, i) => (
            <div key={rm.name} style={{
              padding: i === 0 ? "0 40px 0 0" : i === 2 ? "0 0 0 40px" : "0 40px",
              borderLeft: i > 0 ? `1px solid ${T.border}` : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{ height: 1, width: 28, background: T.gold }} />
                <h3 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{rm.name}</h3>
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: T.sec }}>{rm.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════
// QUALITY GATES
// ═══════════════════════════════════════════

const GATES = ["Voice", "Strategy", "Accuracy", "Audience", "Format", "Brand", "Final"];

function Quality() {
  const r = useReveal(0.12);
  const [lit, setLit] = useState(0);
  useEffect(() => {
    if (!r.on) return;
    let i = 0;
    const iv = setInterval(() => { i++; setLit(i); if (i >= 7) clearInterval(iv); }, 220);
    return () => clearInterval(iv);
  }, [r.on]);

  return (
    <section className="ev3-sect" ref={r.ref} style={{ padding: "140px 48px", background: T.white, textAlign: "center" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div className={`ev3-r ${r.on ? "on" : ""}`}>
          <div className="m" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.ter, marginBottom: 40 }}>04 / Quality Standard</div>
          <h2 style={{ fontSize: "clamp(30px, 4.5vw, 52px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16 }}>
            Seven gates. Zero compromises.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: T.sec, maxWidth: 520, margin: "0 auto 56px" }}>
            Every piece of content passes through seven independent quality checkpoints before reaching your audience.
          </p>
        </div>

        <div className={`ev3-r ev3-d2 ev3-gates-track ${r.on ? "on" : ""}`} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {GATES.map((g, i) => {
            const on = i < lit;
            return (
              <React.Fragment key={g}>
                {i > 0 && <div className="ev3-gate-line" style={{ width: 32, height: 1, background: on ? T.gold : T.border, transition: "background .3s ease", flexShrink: 0 }} />}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    border: `1.5px solid ${on ? T.gold : T.border}`,
                    background: on ? "rgba(200,169,110,0.05)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 500,
                    color: on ? T.gold : T.ter,
                    transition: "all .35s cubic-bezier(.16,1,.3,1)",
                  }}>
                    {i + 1}
                  </div>
                  <span className="m" style={{
                    fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase",
                    color: on ? T.gold : T.ter, transition: "color .3s ease",
                  }}>{g}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════
// CTA
// ═══════════════════════════════════════════

function CTA() {
  const r = useReveal();
  return (
    <section className="ev3-sect" ref={r.ref} style={{
      padding: "160px 48px", background: T.navy,
      textAlign: "center", position: "relative", overflow: "hidden",
    }}>
      {/* Subtle ring echo */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: 500, height: 500, borderRadius: "50%",
        border: "0.5px solid rgba(200,169,110,0.04)",
        animation: "ev3spin 120s linear infinite",
        pointerEvents: "none",
      }} />

      <div className={`ev3-r ${r.on ? "on" : ""}`} style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="m" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: T.dimDark, marginBottom: 32 }}>Everywhere Studio</div>
        <h2 style={{
          fontSize: "clamp(30px, 5vw, 56px)", fontWeight: 600,
          letterSpacing: "-0.035em", lineHeight: 1.1,
          color: T.onDark, maxWidth: 560, marginBottom: 24,
        }}>
          Your content deserves<br />composed intelligence.
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.65, color: T.dimDark, maxWidth: 380, marginBottom: 44 }}>
          Join the teams replacing content chaos with a system that compounds.
        </p>
        <button className="ev3-btn ev3-btn-w" style={{ marginBottom: 28 }}>Get Early Access</button>
        <div className="m" style={{ fontSize: 12, color: T.dimDark }}>mark@coastalintelligence.ai</div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════

function Footer() {
  const ls = {
    fontSize: 12, color: T.ter, cursor: "pointer",
    background: "none", border: "none",
    fontFamily: "'Instrument Sans',sans-serif",
    transition: "color .2s",
  };
  const hov = (e) => { e.target.style.color = T.text; };
  const out = (e) => { e.target.style.color = T.ter; };

  return (
    <footer style={{
      padding: "36px 48px",
      background: T.white,
      borderTop: `1px solid ${T.border}`,
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 16,
      }}>
        <div style={{ fontSize: 12, color: T.ter }}>
          &copy; {new Date().getFullYear()} Mixed Grill LLC / Coastal Intelligence. All rights reserved.
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <button style={ls} onMouseOver={hov} onMouseOut={out}>Terms of Service</button>
          <button style={ls} onMouseOver={hov} onMouseOut={out}>Privacy Policy</button>
          <button style={ls} onMouseOver={hov} onMouseOut={out}>Cookie Policy</button>
        </div>
        <div className="m" style={{ fontSize: 11, color: T.ter }}>mark@coastalintelligence.ai</div>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════

export default function ExploreV3() {
  return (
    <div className="ev3">
      <style>{CSS}</style>
      <Bar />
      <Nav />
      <Hero />
      <ProblemSection />
      <ReedSection />
      <Stats />
      <WWW />
      <Quality />
      <CTA />
      <Footer />
    </div>
  );
}
