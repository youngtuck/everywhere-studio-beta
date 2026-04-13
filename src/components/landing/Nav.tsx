import { useNavigate } from "react-router-dom";
import Logo from "../Logo";

export default function Nav() {
  const navigate = useNavigate();

  const bg     = "#0D1B2A";
  const bd     = "rgba(255,255,255,0.1)";
  const linkC  = "rgba(255,255,255,0.7)";
  const linkH  = "#fff";

  const LINKS = ["Problem","Framework","Rooms","Checkpoints","Contact"];

  return (
    <nav style={{ position:"sticky", top:0, left:0, right:0, zIndex:200, height:54, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 32px", background:bg, borderBottom:`1px solid ${bd}`, backdropFilter:"blur(20px)", transition:"background 0.3s ease, border-color 0.3s ease" }}>
      <div>
        <Logo size={18} variant="dark" onClick={() => navigate("/")} />
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:20 }}>
        {LINKS.map(s=>(
          <a key={s} href={`#${s.toLowerCase()}`}
            style={{ fontSize:13, fontWeight:400, color:linkC, textDecoration:"none", fontFamily:"'Afacad Flux', sans-serif", transition:"color 0.15s", letterSpacing:"-0.01em" }}
            onMouseEnter={e=>(e.currentTarget.style.color=linkH)}
            onMouseLeave={e=>(e.currentTarget.style.color=linkC)}>
            {s}
          </a>
        ))}
        <a href="/auth" onClick={(e)=>{e.preventDefault();navigate("/auth");}}
          style={{ padding:"8px 20px", borderRadius:8, background:"#F5C642", color:"#0D1B2A", fontSize:13, fontWeight:700, textDecoration:"none", textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:"'Afacad Flux', sans-serif", transition:"opacity 0.15s" }}
          onMouseEnter={e=>(e.currentTarget.style.opacity="0.88")}
          onMouseLeave={e=>(e.currentTarget.style.opacity="1")}>
          Open Studio
        </a>
      </div>
    </nav>
  );
}
