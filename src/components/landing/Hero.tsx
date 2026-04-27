import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

const LINES = [
  "There's a leadership principle I've been sitting on for three years...",
  "Finished a brutal week. Here's what I actually learned from it...",
  "Most people get delegation backwards. Here's the version that works...",
];
const FORMATS = ["LinkedIn Post","Newsletter","Sunday Story","Podcast Script","Twitter Thread","Essay","Short Video","Substack Note","Talk Outline","Email Campaign","Blog Post","Executive Brief"];

function Demo() {
  const [typed, setTyped] = useState(""); const [li, setLi] = useState(0); const [ci, setCi] = useState(0);
  const [active, setActive] = useState(false); const [cnt, setCnt] = useState(0);
  const t = useRef<any>(); const iv = useRef<any>(); const resetTimer = useRef<any>();
  useEffect(() => {
    const line = LINES[li];
    if (ci < line.length) { t.current = setTimeout(() => { setTyped(line.slice(0,ci+1)); setCi(c=>c+1); }, 34); }
    else { t.current = setTimeout(() => { setActive(true); setCnt(0); }, 700); }
    return () => clearTimeout(t.current);
  }, [ci, li]);
  useEffect(() => {
    if (!active) return;
    iv.current = setInterval(() => setCnt(c => {
      if (c >= FORMATS.length) { clearInterval(iv.current); resetTimer.current = setTimeout(() => { setActive(false); setCnt(0); setTyped(""); setCi(0); setLi(l=>(l+1)%LINES.length); }, 2400); return c; }
      return c+1;
    }), 80);
    return () => { clearInterval(iv.current); clearTimeout(resetTimer.current); };
  }, [active]);

  return (
    <div style={{ background:"#0E0E0C", borderRadius:14, padding:"22px", border:"1px solid rgba(255,255,255,0.07)", boxShadow:"0 40px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02)", width:"100%", maxWidth:440 }}>
      {/* Header bar */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:16, paddingBottom:12, borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ width:6, height:6, borderRadius:"50%", background:"#F5C642", boxShadow:"0 0 6px rgba(245,198,66,0.5)" }} />
        <span style={{ fontSize:13, color:"rgba(255,255,255,0.2)", fontFamily:"'Inter', sans-serif", letterSpacing:"0.5px" }}>Reed is listening</span>
      </div>
      {/* Input */}
      <div style={{ marginBottom:16, minHeight:56 }}>
        <p style={{ fontSize:14, lineHeight:1.72, color:"rgba(255,255,255,0.78)", fontFamily:"'Inter', sans-serif", fontWeight:300 }}>
          {typed}<span style={{ display:"inline-block", width:1.5, height:13, background:"rgba(245,198,66,0.7)", marginLeft:2, verticalAlign:"middle", animation:"blink 1s step-end infinite" }} />
        </p>
      </div>
      {/* Formats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:4 }}>
        {FORMATS.map((f,i) => { const on = active && i < cnt; return (
          <div key={f} style={{ padding:"8px 10px", background:on?"rgba(245,198,66,0.07)":"rgba(255,255,255,0.02)", border:`1px solid ${on?"rgba(245,198,66,0.18)":"rgba(255,255,255,0.04)"}`, borderRadius:6, opacity:on?1:0.4, transition:"all 0.18s" }}>
            <p style={{ fontSize:13, fontWeight:on?500:400, color:on?"#F5C642":"rgba(255,255,255,0.38)", fontFamily:"'Inter', sans-serif", lineHeight:1.3, transition:"color 0.18s" }}>{f}</p>
          </div>
        );})}
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}

export default function Hero() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const dark = theme === "dark";

  const bg    = dark ? "#0D1B2A" : "#F7F9FC";
  const headC = dark ? "#ffffff" : "#0D1B2A";
  const bodyC = dark ? "rgba(255,255,255,0.6)" : "#1B263B";
  const microC = dark ? "rgba(255,255,255,0.3)" : "rgba(27,38,59,0.5)";
  const secBd  = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const secC   = dark ? "rgba(240,240,238,0.42)" : "rgba(17,17,16,0.38)";

  return (
    <section style={{ minHeight:"100vh", display:"flex", alignItems:"center", padding:"90px 32px 80px", background:bg, position:"relative", overflow:"hidden" }}>
      {/* Noise-like subtle texture */}
      <div style={{ position:"absolute", inset:0, backgroundImage:`radial-gradient(circle at 20% 50%, ${dark?"rgba(74,144,217,0.04)":"rgba(74,144,217,0.05)"} 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${dark?"rgba(245,198,66,0.03)":"rgba(245,198,66,0.06)"} 0%, transparent 50%)`, pointerEvents:"none" }} />

      <div style={{ maxWidth:1160, margin:"0 auto", width:"100%", display:"grid", gridTemplateColumns:"1.1fr 1fr", gap:80, alignItems:"center" }} className="hero-g">
        <div>
          {/* Eyebrow */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginBottom:32, padding:"5px 12px", background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)", border:`1px solid ${dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"}`, borderRadius:20 }}>
            <span style={{ width:5, height:5, borderRadius:"50%", background:"#4A90D9", display:"block" }} />
            <span style={{ fontSize:14, fontWeight:400, letterSpacing:"0.3px", color:dark?"rgba(255,255,255,0.45)":"rgba(0,0,0,0.42)", fontFamily:"'Inter', sans-serif" }}>Composed Intelligence Platform</span>
          </div>

          {/* Headline: very large, serif */}
          <h1 style={{ fontFamily:"'Inter', sans-serif", fontSize:"clamp(48px,5.8vw,82px)", fontWeight:400, lineHeight:1.0, letterSpacing:"-1px", color:headC, marginBottom:28 }}>
            Your thinking,<br />
            <em style={{ fontStyle:"normal", color:"#F5C642" }}>composed.</em>
          </h1>

          <p style={{ fontSize:"clamp(15px,1.4vw,17px)", lineHeight:1.82, color:bodyC, maxWidth:420, marginBottom:40, fontFamily:"'Inter', sans-serif", fontWeight:300 }}>
            There is a mountain between the spark and the audience. IdeasOut carries it: one idea, many surfaces, everywhere it belongs.
          </p>

          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:24 }}>
            <button onClick={()=>navigate("/studio/dashboard")}
              style={{ background:"transparent", border:`1px solid ${secBd}`, color:secC, cursor:"pointer", fontSize:13, fontWeight:400, letterSpacing:"-0.01em", padding:"12px 24px", borderRadius:8, fontFamily:"'Inter', sans-serif", transition:"all 0.15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=dark?"rgba(255,255,255,0.28)":"rgba(0,0,0,0.28)"; e.currentTarget.style.color=headC; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=secBd; e.currentTarget.style.color=secC; }}>
              Explore demo →
            </button>
          </div>
          <p style={{ fontSize:14, color:microC, fontFamily:"'Inter', sans-serif", fontWeight:300 }}>Invitation only · Founding members onboarding now</p>
        </div>

        <div style={{ display:"flex", justifyContent:"flex-end", alignItems:"center" }}>
          <Demo />
        </div>
      </div>
      <style>{`@media(max-width:820px){.hero-g{grid-template-columns:1fr!important}}`}</style>
    </section>
  );
}
