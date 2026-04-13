const FORMATS = [
  { name: "Essay", desc: "Long-form argument or narrative." },
  { name: "Podcast", desc: "Episode outline and script." },
  { name: "Book", desc: "Chapter-ready structure and beats." },
  { name: "Website", desc: "Homepage, about, and key pages." },
  { name: "Video Script", desc: "Script, hook, thumbnail copy." },
  { name: "Newsletter", desc: "Story-forward, audience-tuned." },
  { name: "Socials", desc: "Multi-platform posts and threads." },
  { name: "Presentation", desc: "Talk outline, slide beats, keynote." },
  { name: "Business", desc: "Proposals, pitches, RFPs, sales docs." },
  { name: "Freestyle", desc: "Anything that does not fit the grid." },
  { name: "Sunday Story", desc: "Weekly narrative for your audience." },
  { name: "Email", desc: "Direct outreach, sequences, and campaigns." },
];
export default function TwelveFormats() {
  return (
    <section style={{ padding:"100px 32px", background:"var(--bg)", borderTop:"1px solid var(--line)" }}>
      <div style={{ maxWidth:1160, margin:"0 auto" }}>
        <div style={{ maxWidth:480, marginBottom:64 }}>
          <p className="eyebrow" style={{ marginBottom:20 }}>Output formats</p>
          <h2 style={{ fontFamily:"'Afacad Flux', sans-serif", fontSize:"clamp(32px,3.8vw,56px)", fontWeight:400, letterSpacing:"-0.5px", color:"var(--fg)", lineHeight:1.08 }}>
            One idea,<br /><em style={{fontStyle:"normal"}}>many surfaces.</em>
          </h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }} className="fmt-g">
          {FORMATS.map((f,i) => (
            <div key={i}
              style={{ padding:"20px 18px", background:"var(--surface)", border:"1px solid var(--line)", borderRadius:10, cursor:"default", transition:"all 0.15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor="var(--line-2)"; e.currentTarget.style.boxShadow="var(--shadow-sm)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor="var(--line)"; e.currentTarget.style.boxShadow="none"; }}>
              <p style={{ fontSize:13, fontWeight:500, color:"var(--fg)", marginBottom:4, fontFamily:"'Afacad Flux', sans-serif", letterSpacing:"-0.01em" }}>{f.name}</p>
              <p style={{ fontSize:11, color:"var(--fg-3)", fontFamily:"'Afacad Flux', sans-serif", fontWeight:300, lineHeight:1.4 }}>{f.desc}</p>
            </div>
          ))}
        </div>
        <style>{`@media(max-width:820px){.fmt-g{grid-template-columns:repeat(2,1fr)!important}}`}</style>
      </div>
    </section>
  );
}
