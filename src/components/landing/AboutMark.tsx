export default function AboutMark() {
  return (
    <section style={{ padding:"100px 32px", background:"var(--bg-2)", borderTop:"1px solid var(--line)" }}>
      <div style={{ maxWidth:860, margin:"0 auto" }}>
        <p className="eyebrow" style={{ marginBottom:24 }}>The founder</p>
        <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:48, alignItems:"start" }} className="mark-g">
          <div style={{ width:72, height:72, borderRadius:12, background:"#111110", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:"1px solid rgba(245,198,66,0.22)" }}>
            <span style={{ fontFamily:"'Inter', sans-serif", fontSize:22, fontWeight:400, color:"#F5C642", letterSpacing:"-0.5px" }}>MS</span>
          </div>
          <div>
            <h2 style={{ fontFamily:"'Inter', sans-serif", fontSize:"clamp(22px,2.5vw,34px)", fontWeight:400, color:"var(--fg)", marginBottom:20, letterSpacing:"-0.3px" }}>Mark Sylvester</h2>
            <blockquote style={{ borderLeft:"2px solid #F5C642", paddingLeft:24, marginBottom:20 }}>
              <p style={{ fontSize:17, lineHeight:1.82, color:"var(--fg)", fontFamily:"'Inter', sans-serif", fontWeight:400, fontStyle:"normal" }}>
                "I spent years helping others find and share their voice. IdeasOut is what I wish I'd had. It doesn't replace the thinking; it removes every obstacle between the thinking and the audience."
              </p>
            </blockquote>
            <p style={{ fontSize:14, lineHeight:1.78, color:"var(--fg-3)", fontFamily:"'Inter', sans-serif", fontWeight:300 }}>
              Executive producer, TEDxSantaBarbara. Entrepreneur. Founder of Mixed Grill LLC.
            </p>
          </div>
        </div>
      </div>
      <style>{`@media(max-width:600px){.mark-g{grid-template-columns:1fr!important}}`}</style>
    </section>
  );
}
