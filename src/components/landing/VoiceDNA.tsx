const LAYERS = [
  { name:"Voice", pct:97, note:"Rhythm, cadence, signature constructions" },
  { name:"Value", pct:94, note:"Positions, beliefs, what you won't compromise" },
  { name:"Personality", pct:91, note:"Tone, warmth, what makes you recognizable" },
];
export default function VoiceDNA() {
  return (
    <section style={{ padding:"100px 32px", background:"var(--bg)", borderTop:"1px solid var(--line)" }}>
      <div style={{ maxWidth:1160, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:100, alignItems:"start" }} className="vdna-g">
        <div>
          <p className="eyebrow" style={{ marginBottom:20 }}>Voice DNA</p>
          <h2 style={{ fontFamily:"'Afacad Flux', sans-serif", fontSize:"clamp(32px,3.8vw,56px)", fontWeight:400, letterSpacing:"-0.5px", color:"var(--fg)", marginBottom:22, lineHeight:1.08 }}>
            It learns your voice.<br /><em style={{fontStyle:"normal"}}>Permanently.</em>
          </h2>
          <p style={{ fontSize:16, lineHeight:1.82, color:"var(--fg-2)", fontFamily:"'Afacad Flux', sans-serif", fontWeight:300, marginBottom:14 }}>
            A 15-minute conversation. Three extracted layers. A Voice Fidelity Score that climbs with every session. The longer you use EVERYWHERE Studio, the more it sounds like you.
          </p>
          <p style={{ fontSize:14, lineHeight:1.78, color:"var(--fg-3)", fontFamily:"'Afacad Flux', sans-serif", fontWeight:300 }}>
            Competitors can copy the output format. They cannot copy the system underneath it.
          </p>
        </div>
        <div>
          {/* Score card */}
          <div style={{ padding:"28px 32px", background:"var(--surface)", border:"1px solid var(--line)", borderRadius:12, marginBottom:24, boxShadow:"var(--shadow-sm)" }}>
            <p className="eyebrow" style={{ marginBottom:16 }}>Voice Fidelity Score</p>
            <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
              <span style={{ fontFamily:"'Afacad Flux', sans-serif", fontSize:72, fontWeight:400, color:"#F5C642", letterSpacing:"-3px", lineHeight:1 }}>94.7</span>
              <span style={{ fontSize:13, color:"var(--fg-3)", fontFamily:"'Afacad Flux', sans-serif", fontWeight:300 }}>/100 · ↑ 2.3 this week</span>
            </div>
          </div>
          {/* Layers */}
          {LAYERS.map((l,i) => (
            <div key={i} style={{ marginBottom:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:400, color:"var(--fg)", fontFamily:"'Afacad Flux', sans-serif" }}>{l.name} Layer</span>
                <span style={{ fontSize:13, fontWeight:500, color:"#F5C642", fontFamily:"'Afacad Flux', sans-serif" }}>{l.pct}%</span>
              </div>
              <div style={{ height:3, background:"var(--bg-3)", borderRadius:2, marginBottom:6, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${l.pct}%`, background:"#F5C642", borderRadius:2 }} />
              </div>
              <p style={{ fontSize:13, color:"var(--fg-3)", fontFamily:"'Afacad Flux', sans-serif", fontWeight:300 }}>{l.note}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`@media(max-width:820px){.vdna-g{grid-template-columns:1fr!important}}`}</style>
    </section>
  );
}
