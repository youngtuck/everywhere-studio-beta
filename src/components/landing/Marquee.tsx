import { useTheme } from "../../context/ThemeContext";
const ITEMS = ["Watch · Work · Wrap","Voice DNA","Blocking Review","Impact Score","Sentinel Intelligence","Composed Intelligence","Thought Leaders","Out of your head and into the world","Reed","Multi-format export","Watch · Work · Wrap","Voice DNA","Blocking Review","Impact Score","Sentinel Intelligence","Composed Intelligence","Thought Leaders","Out of your head and into the world","Reed","Multi-format export"];
export default function Marquee() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return (
    <div style={{ overflow:"hidden", borderTop:`1px solid ${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"}`, borderBottom:`1px solid ${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"}`, padding:"10px 0", background:dark?"#090907":"#F4F4F2" }}>
      <div className="marquee-track">
        {ITEMS.map((item,i)=>(
          <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:16, padding:"0 16px", fontSize:13, fontWeight:400, letterSpacing:"0.3px", color:dark?"rgba(255,255,255,0.18)":"rgba(0,0,0,0.28)", fontFamily:"'Inter', sans-serif", whiteSpace:"nowrap" }}>
            {item}
            <span style={{ color:"rgba(245,198,66,0.4)", fontSize:5 }}>●</span>
          </span>
        ))}
      </div>
    </div>
  );
}
