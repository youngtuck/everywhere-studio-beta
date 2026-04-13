const STATS = [
  { num: "Reed", label: "First listener, every session" },
  { num: "Wrap", label: "From approved draft to channel-ready assets" },
  { num: "Hold", label: "Review blocks until the checks clear" },
  { num: "100", label: "Impact Score ceiling" },
  { num: "3", label: "Voice DNA layers" },
];
export default function StatsBar() {
  return (
    <div style={{ background:"var(--bg-2)", borderTop:"1px solid var(--line)", borderBottom:"1px solid var(--line)", padding:"48px 32px" }}>
      <div style={{ maxWidth:1160, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:20 }} className="stats-g">
        {STATS.map((s,i) => (
          <div key={i} style={{ textAlign:"center" }}>
            <p style={{ fontFamily:"'Afacad Flux', sans-serif", fontSize:"clamp(36px,3.5vw,56px)", fontWeight:400, color:"#F5C642", letterSpacing:"-1.5px", lineHeight:1 }}>{s.num}</p>
            <p style={{ fontSize:13, fontWeight:400, color:"rgba(255,255,255,0.5)", marginTop:8, fontFamily:"'Afacad Flux', sans-serif" }}>{s.label}</p>
          </div>
        ))}
      </div>
      <style>{`@media(max-width:640px){.stats-g{grid-template-columns:repeat(3,1fr)!important}}`}</style>
    </div>
  );
}
