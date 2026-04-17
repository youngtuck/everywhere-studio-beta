import{u as $,a as Y,r as s,j as e,L as S,M as W}from"./index-CG4OVmWa.js";const n="cubic-bezier(0.16, 1, 0.3, 1)";function C(l=.15){const i=s.useRef(null),[d,x]=s.useState(!1);return s.useEffect(()=>{const h=i.current;if(!h)return;const p=new IntersectionObserver(([u])=>{u.isIntersecting&&x(!0)},{threshold:l});return p.observe(h),()=>p.disconnect()},[l]),{ref:i,isVisible:d}}function A(){const[l,i]=s.useState(0);return s.useEffect(()=>{const d=()=>{const x=document.documentElement.scrollHeight-window.innerHeight;i(x>0?window.scrollY/x:0)};return window.addEventListener("scroll",d,{passive:!0}),()=>window.removeEventListener("scroll",d)},[]),l}function a({children:l,delay:i=0,threshold:d=.15,direction:x="up",distance:h=40,duration:p=900,once:u=!0,scale:m,style:b}){const{ref:c,isVisible:f}=C(d),w=(()=>{switch(x){case"up":return`translateY(${h}px)`;case"left":return`translateX(${h}px)`;case"right":return`translateX(-${h}px)`;case"scale":return"scale(0.92)";case"none":return"none";default:return`translateY(${h}px)`}})(),g=f;return e.jsx("div",{ref:c,style:{opacity:g?1:0,transform:g?"translateY(0) translateX(0) scale(1)":`${w}${m&&x!=="scale"?" scale(0.95)":""}`,transition:`opacity ${p}ms ${n} ${i}ms, transform ${p}ms ${n} ${i}ms`,...b},children:l})}const H=`
@import url('https://fonts.googleapis.com/css2?family=Afacad+Flux:wght@100..900&display=swap');

:root {
  --ew-navy: #0D1B2A;
  --ew-navy-rich: #1B263B;
  --ew-gold: #F5C642;
  --ew-blue: #4A90D9;
  --ew-coral: #E8B4A0;
  --ew-white: #FFFFFF;
  --ew-offwhite: #F7F9FC;
  --ew-text-dark: #111111;
  --ew-text-body: #64748B;
  --ew-text-light: rgba(255,255,255,0.85);
  --ew-text-light-dim: rgba(255,255,255,0.5);
  --ew-border-light: #E2E8F0;
  --ew-border-dark: rgba(255,255,255,0.08);
  --ew-ease: ${n};
  --font: 'Afacad Flux', sans-serif;
}

.xp {
  background: var(--ew-navy);
  color: var(--ew-text-light);
  font-family: var(--font);
  font-size: 17px;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  position: relative;
  scroll-behavior: smooth;
}

.xp a { color: inherit; text-decoration: none; }
.xp button, .xp a { cursor: pointer; }

/* Text selection: dark surface */
.xp ::selection { background: rgba(245,198,66,0.3); color: white; }
/* Light surface selection overrides */
[data-nav-theme="light"] ::selection { background: rgba(74,144,217,0.2); color: #111; }

/* Active press feedback on buttons */
.xp button:active, .xp a:active { transform: scale(0.98) !important; transition-duration: 0.1s !important; }

/* Reed widget: showcase, not link */
.xp-reed-widget { cursor: default; }

/* Watch.Work.Wrap columns */
.xp-www-cols {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-start;
  gap: 0;
}
.xp-www-col {
  flex: 1;
  padding: 0 40px;
  text-align: center;
}
.xp-www-col-border {
  border-right: 1px solid rgba(255,255,255,0.1);
}
.xp-www-mob-divider { display: none; }

@media (max-width: 768px) {
  .xp-www-cols { flex-direction: column; gap: 0; }
  .xp-www-col { padding: 0; text-align: center; }
  .xp-www-col-border { border-right: none; }
  .xp-www-mob-divider {
    display: block;
    width: 60px;
    height: 1px;
    background: rgba(255,255,255,0.08);
    margin: 32px auto;
  }
}

/* Nav: starts transparent over dark hero, darkens on scroll */
.xp-nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  transition: background 0.4s ease, border-color 0.4s ease, backdrop-filter 0.4s ease;
}
.xp-nav.scrolled {
  background: rgba(13, 27, 42, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--ew-border-dark);
}
.xp-nav-links {
  display: flex;
  align-items: center;
  gap: 32px;
}
.xp-nav-link {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ew-text-light-dim);
  transition: color 0.2s ease;
  cursor: pointer;
  background: none;
  border: none;
  font-family: var(--font);
  padding: 0;
}
.xp-nav-link:hover { color: var(--ew-text-light); }

/* Buttons: dark surface variants (gold accent) */
.xp-btn-gold {
  display: inline-block;
  padding: 14px 36px;
  background: var(--ew-gold);
  color: var(--ew-navy);
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
  font-family: var(--font);
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: opacity 0.25s ${n}, transform 0.25s ${n};
  text-decoration: none;
}
.xp-btn-gold:hover { opacity: 0.88; transform: translateY(-1px); }
/* Light surface variant: blue accent */
.xp-btn-blue {
  display: inline-block;
  padding: 14px 36px;
  background: var(--ew-blue);
  color: var(--ew-white);
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
  font-family: var(--font);
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: opacity 0.25s ${n}, transform 0.25s ${n};
  text-decoration: none;
}
.xp-btn-blue:hover { opacity: 0.88; transform: translateY(-1px); }
.xp-btn-outline {
  display: inline-block;
  padding: 14px 36px;
  background: transparent;
  color: var(--ew-text-light);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font);
  cursor: pointer;
  transition: border-color 0.25s ${n}, transform 0.25s ${n};
  text-decoration: none;
}
.xp-btn-outline:hover { border-color: rgba(255, 255, 255, 0.4); transform: translateY(-1px); }
/* Outline on light surfaces */
.xp-btn-outline-light {
  display: inline-block;
  padding: 14px 36px;
  background: transparent;
  color: var(--ew-text-dark);
  border: 1px solid var(--ew-border-light);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font);
  cursor: pointer;
  transition: border-color 0.25s ${n}, transform 0.25s ${n};
  text-decoration: none;
}
.xp-btn-outline-light:hover { border-color: #CBD5E1; transform: translateY(-1px); }

/* Section container */
.xp-inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 40px;
}

/* Grid */
.xp-grid-2 {
  display: grid;
  grid-template-columns: 5fr 6fr;
  gap: 80px;
  align-items: start;
}

/* Rooms: dark surface (Watch.Work.Wrap on navy) */
.xp-rooms {
  display: grid;
  grid-template-columns: 1fr 1px 1fr 1px 1fr;
  gap: 0;
}
.xp-room-divider {
  background: var(--ew-border-dark);
  width: 1px;
  align-self: stretch;
}
.xp-room { padding: 0 36px; }
.xp-room:first-child { padding-left: 0; }
.xp-room:last-child { padding-right: 0; }
.xp-room-name {
  font-size: clamp(36px, 4vw, 56px);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: -0.02em;
  line-height: 1;
  color: var(--ew-text-light);
  margin: 0 0 8px;
}
.xp-room-tag {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ew-gold);
  margin-bottom: 20px;
}
.xp-room-body {
  font-size: 15px;
  color: var(--ew-text-light-dim);
  line-height: 1.65;
  margin-bottom: 24px;
}
.xp-room-items {
  list-style: none;
  padding: 0;
  margin: 0;
}
.xp-room-items li {
  font-size: 14px;
  color: var(--ew-text-light-dim);
  padding: 8px 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.xp-room-items li::before {
  content: '';
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ew-gold);
  flex-shrink: 0;
  position: relative;
  top: -2px;
}

/* Checkpoints */
.xp-cp {
  padding: 18px 0;
  border-bottom: 1px solid var(--ew-border-dark);
  line-height: 1.6;
}
.xp-cp-num {
  font-size: 12px;
  font-weight: 700;
  color: var(--ew-gold);
  margin-right: 10px;
  font-variant-numeric: tabular-nums;
}
.xp-cp-name {
  font-weight: 700;
  color: var(--ew-text-light);
  margin-right: 6px;
}
.xp-cp-desc {
  color: var(--ew-text-light-dim);
  font-size: 15px;
}

/* Moments */
.xp-moment {
  padding: 24px 0;
  border-bottom: 1px solid var(--ew-border-dark);
}
.xp-moment:first-child { border-top: 1px solid var(--ew-border-dark); }
.xp-moment-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--ew-gold);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 6px;
}
.xp-moment-text {
  color: var(--ew-text-light-dim);
  font-size: 16px;
  line-height: 1.6;
}

/* Footer */
.xp-footer {
  padding: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1080px;
  margin: 0 auto;
  font-size: 13px;
  color: var(--ew-text-body);
}

/* Mobile */
@media (max-width: 768px) {
  .xp-nav { padding: 0 20px; }
  .xp-nav-links-desktop { display: none !important; }
  .xp-inner { padding: 0 24px; }
  .xp-grid-2 { grid-template-columns: 1fr; gap: 48px; }
  .xp-rooms { grid-template-columns: 1fr; gap: 0; }
  .xp-room-divider { width: 100%; height: 1px; align-self: auto; }
  .xp-room { padding: 32px 0; }
  .xp-room:first-child { padding-left: 0; padding-top: 0; }
  .xp-room:last-child { padding-right: 0; }
  .xp-footer { flex-direction: column; gap: 16px; text-align: center; padding: 32px 24px; }
}
@media (max-width: 820px) {
  .xp-problem-grid { grid-template-columns: 1fr !important; gap: 40px !important; padding: 0 24px !important; }
}
@media (max-width: 400px) {
  .xp-hero-ctas { flex-direction: column !important; width: 100% !important; }
  .xp-hero-ctas > * { width: 100% !important; text-align: center !important; }
}
`,B=[{name:"Watch",body:"You arrive knowing what your audience is already thinking. Your ideas land in context, not into noise."},{name:"Work",body:"Your idea becomes publication-ready content. In your voice. Verified. Zero AI fingerprints. Nothing ships until it reads like a human made every decision."},{name:"Wrap",body:"One idea. Every channel. Simultaneously. Newsletter, LinkedIn, podcast, Substack, formatted for each, ready to publish."}];function N({howRef:l}){return e.jsx("section",{ref:l,"data-nav-theme":"dark",style:{padding:"120px 0",background:"var(--ew-navy)"},children:e.jsxs("div",{style:{maxWidth:1080,margin:"0 auto",padding:"0 24px"},children:[e.jsx(a,{children:e.jsxs("div",{style:{textAlign:"center",marginBottom:64},children:[e.jsx("div",{style:{fontSize:11,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",color:"var(--ew-gold)",marginBottom:16},children:"Three rooms. One idea."}),e.jsx("h2",{style:{fontSize:"clamp(32px, 5vw, 56px)",fontWeight:700,lineHeight:1.08,letterSpacing:"-0.02em",margin:0,color:"var(--ew-white)",textWrap:"balance"},children:"Watch. Work. Wrap."})]})}),e.jsx("div",{className:"xp-www-cols",children:B.map((i,d)=>e.jsx(a,{delay:d*150,children:e.jsxs("div",{className:`xp-www-col${d<2?" xp-www-col-border":""}`,children:[d>0&&e.jsx("div",{className:"xp-www-mob-divider"}),e.jsx("div",{style:{fontSize:20,fontWeight:700,color:"var(--ew-gold)",marginBottom:12},children:i.name}),e.jsx("p",{style:{fontSize:15,color:"rgba(255,255,255,0.6)",lineHeight:1.7,margin:0},children:i.body})]})},i.name))})]})})}function M(){const l=$(),i=Y(),d=s.useRef(null),x=s.useRef(null),h=s.useRef(null),[p,u]=s.useState({y:0,opacity:1}),[m,b]=s.useState(!1),[c,f]=s.useState("dark"),[w,g]=s.useState(!1),[z,T]=s.useState(!1),E=A();s.useEffect(()=>{const t=setTimeout(()=>T(!0),100);return()=>clearTimeout(t)},[]),s.useEffect(()=>{const t=()=>{const r=window.scrollY,o=window.innerHeight;u({y:r*-.3,opacity:Math.max(0,1-r/(o*.55))}),b(r>50)};return window.addEventListener("scroll",t,{passive:!0}),()=>window.removeEventListener("scroll",t)},[]),s.useEffect(()=>{const t=document.querySelectorAll("[data-nav-theme]");if(t.length===0)return;const r=new IntersectionObserver(o=>{for(const y of o)if(y.isIntersecting){const v=y.target.dataset.navTheme;v&&f(v)}},{rootMargin:"-1px 0px -95% 0px",threshold:0});return t.forEach(o=>r.observe(o)),()=>r.disconnect()},[]);const I=s.useCallback(t=>{var r;(r=t.current)==null||r.scrollIntoView({behavior:"smooth"})},[]),R=i?"64px 0":"120px 0";return e.jsxs("div",{className:"xp",style:{opacity:z?1:0,transition:`opacity 0.4s ${n}`},children:[e.jsx("style",{children:H}),e.jsx("div",{style:{position:"fixed",top:0,left:0,height:2,width:`${E*100}%`,background:c==="dark"?"var(--ew-gold)":"var(--ew-blue)",zIndex:9999,transition:"background 0.4s ease",pointerEvents:"none"}}),e.jsxs("nav",{style:{position:"fixed",top:0,left:0,right:0,zIndex:100,height:56,display:"flex",alignItems:"center",justifyContent:"space-between",padding:i?"0 20px":"0 40px",background:m?c==="dark"?"rgba(13,27,42,0.92)":"rgba(255,255,255,0.85)":"transparent",backdropFilter:m?"blur(16px)":"none",WebkitBackdropFilter:m?"blur(16px)":"none",borderBottom:m?c==="dark"?"1px solid var(--ew-border-dark)":"1px solid var(--ew-border-light)":"1px solid transparent",transition:"background 0.4s ease, border-color 0.4s ease, backdrop-filter 0.4s ease"},children:[e.jsx(S,{size:"sm",variant:c==="dark"?"dark":"light",onClick:()=>window.scrollTo({top:0,behavior:"smooth"})}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:32},children:[!i&&e.jsx(e.Fragment,{children:[{label:"Sign In",action:()=>l("/auth")}].map(t=>e.jsxs("button",{onClick:t.action,style:{fontSize:12,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:c==="dark"?"rgba(255,255,255,0.7)":"var(--ew-text-body)",background:"none",border:"none",cursor:"pointer",fontFamily:"var(--font)",padding:"4px 0",position:"relative",transition:"color 0.3s ease"},onMouseEnter:r=>{r.currentTarget.style.color=c==="dark"?"var(--ew-white)":"var(--ew-text-dark)";const o=r.currentTarget.querySelector("[data-nav-dot]");o&&(o.style.opacity="1",o.style.transform="translateX(-50%) translateY(-2px)")},onMouseLeave:r=>{r.currentTarget.style.color=c==="dark"?"rgba(255,255,255,0.7)":"var(--ew-text-body)";const o=r.currentTarget.querySelector("[data-nav-dot]");o&&(o.style.opacity="0",o.style.transform="translateX(-50%) translateY(0)")},children:[t.label,e.jsx("span",{"data-nav-dot":"",style:{position:"absolute",bottom:-4,left:"50%",transform:"translateX(-50%) translateY(0)",width:4,height:4,borderRadius:"50%",background:"var(--ew-gold)",opacity:0,transition:`opacity 0.2s ${n}, transform 0.2s ${n}`}})]},t.label))}),!i&&e.jsx("button",{onClick:()=>l("/auth?mode=signup"),style:{padding:"8px 22px",fontSize:12,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:"var(--font)",borderRadius:100,cursor:"pointer",transition:"all 0.4s ease",...c==="dark"?{border:"1px solid rgba(255,255,255,0.2)",color:"var(--ew-white)",background:"transparent"}:{border:"none",color:"var(--ew-white)",background:"var(--ew-text-dark)"}},children:"Get Early Access"}),i&&e.jsx("button",{onClick:()=>g(!0),style:{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex",flexDirection:"column",gap:5},children:[0,1,2].map(t=>e.jsx("span",{style:{display:"block",width:20,height:2,background:c==="dark"?"var(--ew-white)":"var(--ew-text-dark)",borderRadius:1}},t))})]})]}),i&&w&&e.jsxs("div",{style:{position:"fixed",inset:0,zIndex:200,background:"var(--ew-navy)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:32},children:[e.jsx("button",{onClick:()=>g(!1),style:{position:"absolute",top:16,right:20,background:"none",border:"none",cursor:"pointer",fontSize:28,color:"var(--ew-gold)",fontFamily:"var(--font)",fontWeight:300},children:"×"}),[{label:"Sign In",action:()=>{g(!1),l("/auth")}},{label:"Get Early Access",action:()=>{g(!1),l("/auth?mode=signup")}}].map((t,r)=>e.jsx("button",{onClick:t.action,style:{background:"none",border:"none",cursor:"pointer",fontSize:24,fontWeight:600,color:"var(--ew-white)",fontFamily:"var(--font)",letterSpacing:"0.04em",animation:`xpSlideInRight 0.5s ${n} ${r*80}ms both`},children:t.label},t.label))]}),e.jsx("style",{children:`
        @keyframes xpSlideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}),e.jsxs("section",{ref:h,"data-nav-theme":"dark",style:{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",background:"var(--ew-navy)",overflow:"hidden"},children:[e.jsx("div",{style:{position:"absolute",inset:0,background:"radial-gradient(ellipse 70% 50% at 50% 30%, rgba(74,144,217,0.06) 0%, transparent 60%)",transform:`translateY(${p.y*-.33}px)`,pointerEvents:"none"}}),e.jsx("div",{style:{position:"absolute",inset:0,backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,opacity:.025,pointerEvents:"none"}}),e.jsxs("div",{style:{textAlign:"center",maxWidth:900,padding:"0 32px",position:"relative",zIndex:1,transform:`translateY(${p.y}px)`,opacity:p.opacity,willChange:"transform, opacity"},children:[e.jsxs("h1",{style:{fontSize:"clamp(36px, 6vw, 72px)",fontWeight:700,lineHeight:1.1,letterSpacing:"-0.03em",textWrap:"balance",margin:"0 0 28px",color:"var(--ew-white)"},children:[e.jsx("span",{style:{display:"block"},children:"Your thinking reaches your audience.".split(" ").map((t,r)=>e.jsx("span",{style:{display:"inline-block",animation:`xpWordUp 0.7s ${n} ${100+r*80}ms both`,marginRight:"0.27em"},children:t},r))}),e.jsxs("span",{style:{display:"block",color:"var(--ew-gold)",fontWeight:500,fontStyle:"normal",animation:`xpFadeUp 0.9s ${n} 500ms both`},children:["In your voice. Better than you'd write it"," ","yourself."]})]}),e.jsxs("p",{style:{fontSize:"clamp(16px, 2vw, 22px)",color:"var(--ew-text-light-dim)",maxWidth:540,margin:"0 auto 44px",lineHeight:1.6,animation:`xpFadeUp 0.8s ${n} 700ms both`},children:["Reed is your guide. You talk, and the world hears"," ","you."]}),e.jsxs("div",{className:"xp-hero-ctas",style:{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap",animation:`xpFadeUp 0.8s ${n} 900ms both`},children:[e.jsx("button",{onClick:()=>l("/auth?mode=signup"),className:"xp-hero-cta-primary",style:{background:"var(--ew-gold)",color:"var(--ew-navy)",border:"none",borderRadius:100,padding:"16px 36px",fontWeight:700,fontSize:14,letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:"var(--font)",cursor:"pointer",transition:`transform 0.3s ${n}, box-shadow 0.3s ${n}`},onMouseEnter:t=>{t.currentTarget.style.transform="scale(1.03)",t.currentTarget.style.boxShadow="0 8px 24px rgba(245,198,66,0.25)"},onMouseLeave:t=>{t.currentTarget.style.transform="scale(1)",t.currentTarget.style.boxShadow="none"},children:"Get Early Access"}),e.jsx("a",{href:"#how",onClick:t=>{t.preventDefault(),I(d)},style:{display:"inline-flex",alignItems:"center",background:"transparent",color:"var(--ew-white)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:100,padding:"16px 36px",fontWeight:600,fontSize:14,fontFamily:"var(--font)",textDecoration:"none",cursor:"pointer",transition:`border-color 0.3s ${n}, background 0.3s ${n}`},onMouseEnter:t=>{t.currentTarget.style.borderColor="rgba(255,255,255,0.5)",t.currentTarget.style.background="rgba(255,255,255,0.04)"},onMouseLeave:t=>{t.currentTarget.style.borderColor="rgba(255,255,255,0.2)",t.currentTarget.style.background="transparent"},children:"See How It Works"})]})]}),e.jsx("div",{style:{position:"absolute",bottom:40,left:"50%",transform:"translateX(-50%)",animation:"xpScrollPulse 2s ease-in-out infinite",opacity:p.opacity},children:e.jsx("div",{style:{width:2,height:24,background:"var(--ew-gold)",borderRadius:1}})}),e.jsx("style",{children:`
          @keyframes xpFadeUp {
            from { opacity: 0; transform: translateY(24px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes xpWordUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes xpScrollPulse {
            0%, 100% { transform: translateX(-50%) translateY(0); opacity: 0.6; }
            50% { transform: translateX(-50%) translateY(8px); opacity: 1; }
          }
        `})]}),e.jsx("section",{"data-nav-theme":"light",style:{padding:"140px 0",background:"var(--ew-white)"},children:e.jsx("div",{style:{maxWidth:1080,margin:"0 auto",padding:"0 40px"},children:e.jsx("div",{style:{marginLeft:i?0:"clamp(40px, 12vw, 160px)",maxWidth:600},children:e.jsxs("div",{style:{display:"flex",gap:0},children:[e.jsx("div",{style:{width:3,background:"var(--ew-blue)",borderRadius:2,flexShrink:0}}),e.jsxs("div",{style:{paddingLeft:i?20:32},children:[e.jsx(a,{direction:"left",distance:30,duration:800,children:e.jsxs("h2",{style:{fontSize:"clamp(26px, 3.5vw, 42px)",fontWeight:700,lineHeight:1.2,letterSpacing:"-0.02em",margin:"0 0 32px",color:"var(--ew-text-dark)",textWrap:"balance"},children:["The thought leaders you see everywhere aren't better thinkers."," ",e.jsxs("span",{style:{color:"var(--ew-blue)",fontWeight:700},children:["They got their ideas"," ","out."]})]})}),e.jsx(a,{direction:"up",distance:20,delay:150,children:e.jsxs("p",{style:{color:"var(--ew-text-body)",maxWidth:540,marginBottom:16,fontSize:16,lineHeight:1.7},children:["You have the thinking. What you've been missing is someone to carry it, from your head, into the world, without you doing the work"," ","twice."]})}),e.jsx(a,{direction:"up",distance:20,delay:300,children:e.jsx("p",{style:{color:"var(--ew-text-body)",maxWidth:540,marginBottom:16,fontSize:16,lineHeight:1.7},children:"This isn't about discipline or talent."})}),e.jsx(a,{direction:"up",distance:20,delay:450,children:e.jsxs("p",{style:{color:"var(--ew-text-body)",maxWidth:540,fontSize:16,lineHeight:1.7},children:["It's an infrastructure problem. ",e.jsx("span",{style:{fontWeight:600,color:"var(--ew-text-dark)"},children:"Reed is the answer."})]})})]})]})})})}),e.jsx("section",{"data-nav-theme":"dark",style:{padding:"120px 0",background:"var(--ew-navy-rich)"},children:e.jsxs("div",{className:"xp-inner",style:{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:80},children:[e.jsx(a,{children:e.jsx("div",{style:{fontSize:11,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",color:"var(--ew-gold)",marginBottom:20,textAlign:"center"},children:"Reed"})}),e.jsx(a,{delay:100,children:e.jsxs("p",{style:{color:"var(--ew-text-light-dim)",maxWidth:620,textAlign:"center",marginBottom:16,fontSize:16,lineHeight:1.7},children:[e.jsx("span",{style:{color:"var(--ew-text-light)",fontWeight:600},children:"Reed is your thinking partner."})," You talk. He listens. He asks until he finds what you actually mean, not what you said first. Then you're"," ","done."]})}),e.jsx(a,{delay:200,children:e.jsxs("p",{style:{color:"var(--ew-text-light-dim)",maxWidth:620,textAlign:"center",marginBottom:56,fontSize:16,lineHeight:1.7},children:["No editing. No formatting. No chasing the idea across five tabs. Reed carries it. What comes back is done. In your voice. Ready to"," ","ship."]})}),e.jsx(a,{direction:"scale",duration:1e3,children:e.jsx("div",{className:"xp-reed-widget",style:{perspective:1e3,maxWidth:480,width:"100%",marginBottom:56},onMouseMove:t=>{const r=t.currentTarget.firstElementChild;if(!r)return;const o=t.currentTarget.getBoundingClientRect(),y=o.left+o.width/2,v=o.top+o.height/2,k=(t.clientX-y)/(o.width/2),j=(t.clientY-v)/(o.height/2);r.style.transform=`rotateY(${k*3}deg) rotateX(${-j*3}deg)`,r.style.boxShadow=`${-k*8}px ${-j*8}px 80px rgba(0,0,0,0.4), 0 0 60px rgba(74,144,217,0.06)`},onMouseLeave:t=>{const r=t.currentTarget.firstElementChild;r&&(r.style.transform="rotateY(0deg) rotateX(0deg)",r.style.boxShadow="0 24px 80px rgba(0,0,0,0.4)")},children:e.jsxs("div",{style:{background:"rgba(255,255,255,0.03)",borderRadius:16,border:"1px solid var(--ew-border-dark)",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.4)",width:"100%",transition:`transform 0.6s ${n}, box-shadow 0.6s ${n}`,position:"relative"},children:[e.jsx("div",{style:{position:"absolute",inset:-40,background:"radial-gradient(circle at 50% 50%, rgba(74,144,217,0.08) 0%, transparent 70%)",pointerEvents:"none",zIndex:0}}),e.jsxs("div",{style:{padding:"14px 20px",borderBottom:"1px solid var(--ew-border-dark)",display:"flex",alignItems:"center",gap:10,position:"relative",zIndex:1},children:[e.jsx("span",{style:{width:8,height:8,borderRadius:"50%",background:"var(--ew-gold)",flexShrink:0}}),e.jsx("span",{style:{fontSize:13,fontWeight:600,color:"var(--ew-text-light-dim)",letterSpacing:"0.04em"},children:"Reed is listening"})]}),e.jsxs("div",{style:{padding:"20px 20px 16px",position:"relative",zIndex:1},children:[e.jsx("div",{style:{display:"flex",justifyContent:"flex-end",marginBottom:14},children:e.jsx("div",{style:{background:"rgba(255,255,255,0.06)",borderRadius:"14px 14px 4px 14px",padding:"10px 16px",maxWidth:"80%",fontSize:13,color:"var(--ew-text-light)",lineHeight:1.5},children:"The people in your market who show up everywhere aren't better thinkers. They got their ideas out. Every week. On every channel. Without doing it alone."})}),e.jsx("div",{style:{display:"flex",justifyContent:"flex-start",marginBottom:16},children:e.jsxs("div",{style:{background:"rgba(245,198,66,0.06)",border:"1px solid rgba(245,198,66,0.1)",borderRadius:"14px 14px 14px 4px",padding:"10px 16px",maxWidth:"85%",fontSize:13,color:"var(--ew-text-light)",lineHeight:1.5},children:[e.jsx("strong",{style:{color:"var(--ew-gold)"},children:"Core thesis:"})," Infrastructure, not talent, separates visible thought leaders from invisible ones.",e.jsx("br",{}),e.jsx("br",{}),"Who specifically needs to hear this?"]})}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:12,borderTop:"1px solid var(--ew-border-dark)"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontSize:22,fontWeight:700,color:"var(--ew-gold)",fontVariantNumeric:"tabular-nums"},children:"86"}),e.jsx("span",{style:{fontSize:11,color:"var(--ew-text-light-dim)",fontWeight:500},children:"Impact Score"})]}),e.jsx("div",{style:{display:"flex",gap:6},children:["LinkedIn","Newsletter","Podcast"].map(t=>e.jsx("span",{style:{fontSize:11,fontWeight:600,padding:"4px 10px",borderRadius:20,background:"rgba(255,255,255,0.06)",border:"1px solid var(--ew-border-dark)",color:"var(--ew-text-light-dim)",letterSpacing:"0.02em"},children:t},t))})]})]})]})})}),e.jsx(a,{delay:200,children:e.jsx("p",{style:{fontSize:"clamp(20px, 3vw, 28px)",fontWeight:600,color:"var(--ew-gold)",margin:0,maxWidth:720,textAlign:"center",lineHeight:1.4,letterSpacing:"-0.01em"},children:"The people in your market who show up everywhere aren't better thinkers. They have better infrastructure."})})]})}),e.jsx("section",{"data-nav-theme":"light",style:{padding:R,background:"var(--ew-offwhite)"},children:e.jsx(a,{children:e.jsxs("div",{className:"xp-inner",children:[e.jsxs("div",{style:{textAlign:"center",marginBottom:i?36:56},children:[e.jsx("h2",{style:{fontSize:"clamp(28px, 3.5vw, 40px)",fontWeight:700,lineHeight:1.15,letterSpacing:"-0.02em",margin:"0 0 16px",textWrap:"balance",color:"var(--ew-text-dark)"},children:"The idea is in your head. Not in the world."}),e.jsx("p",{style:{color:"var(--ew-text-body)",maxWidth:540,margin:"0 auto"},children:"You've been carrying ideas that deserve an audience. The problem was never the thinking. It was the distance between having the thought and getting it out. In your voice, at the quality it deserves, on every channel that matters."})]}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:i?"1fr":"1fr 1fr",gap:20},children:[{label:"Sunday night",text:"The week is ending. You had three ideas worth writing about. None of them made it out."},{label:"On a plane",text:"You write two pages of thinking in a notebook. It never becomes anything."},{label:"Watching someone else",text:"You see someone on stage or in your feed saying something you've thought for years. They just got it out first."},{label:"After the conversation",text:"You just explained something perfectly to a client. Room changed. No one else will ever hear that version of it."}].map(t=>e.jsxs("div",{style:{background:"var(--ew-white)",border:"1px solid var(--ew-border-light)",borderRadius:8,padding:"28px 32px"},children:[e.jsx("div",{style:{fontSize:12,fontWeight:700,color:"var(--ew-blue)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8},children:t.label}),e.jsx("div",{style:{color:"var(--ew-text-body)",fontSize:16,lineHeight:1.6},children:t.text})]},t.label))})]})})}),e.jsx("section",{"data-nav-theme":"light",style:{padding:"100px 0",background:"var(--ew-offwhite)"},children:e.jsxs("div",{className:"xp-inner",children:[e.jsx(a,{children:e.jsxs("div",{style:{textAlign:"center",marginBottom:64},children:[e.jsx("div",{style:{fontSize:11,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",color:"var(--ew-blue)",marginBottom:16},children:"EVERYWHERE Studio"}),e.jsxs("h2",{style:{fontSize:"clamp(28px, 4vw, 44px)",fontWeight:700,lineHeight:1.15,letterSpacing:"-0.02em",textWrap:"balance",margin:"0 auto 28px",maxWidth:800,color:"var(--ew-text-dark)"},children:["You talk. Reed listens until he really gets it. Then ",W.specialistCount," specialists turn what you said into publication-ready content, in your voice, verified, every word traceable back to you."]}),e.jsxs("p",{style:{color:"var(--ew-text-body)",maxWidth:600,margin:"0 auto",textAlign:"center",fontSize:16,lineHeight:1.7},children:["You talk. They work. You publish. Every word sounds like you. Every claim is verified. Nothing ships without passing ",W.qualityCheckpoints," quality checkpoints."]})]})}),e.jsx("div",{style:{display:"flex",justifyContent:"center",alignItems:i?"center":"flex-start",flexDirection:i?"column":"row",gap:i?40:60,marginBottom:72},children:[{headline:"Always ready.",body:"Whenever you have something to say, a post, a brief, a board deck, a newsletter, Reed is there. You talk. It’s done."},{headline:"Every channel.",body:"Newsletter, LinkedIn, podcast, Substack, one idea, every format, native to each."},{headline:"Zero left to finish.",body:"You talk to Reed. What comes back is done."}].flatMap((t,r)=>{const o=e.jsx(a,{delay:r*150,children:e.jsxs("div",{style:{textAlign:"center",maxWidth:280},children:[e.jsx("div",{style:{fontSize:20,fontWeight:700,color:"var(--ew-text-dark)",marginBottom:8},children:t.headline}),e.jsx("div",{style:{fontSize:15,color:"var(--ew-text-body)",lineHeight:1.6},children:t.body})]})},t.headline);return!i&&r>0?[e.jsx("div",{style:{width:1,height:48,background:"var(--ew-border-light)",alignSelf:"center",flexShrink:0}},`d-${r}`),o]:[o]})}),e.jsx(a,{direction:"left",distance:40,delay:400,children:e.jsx("div",{style:{maxWidth:640,marginInline:"auto",textAlign:"left"},children:e.jsxs("blockquote",{style:{margin:0,padding:"0 0 0 24px",borderLeft:"3px solid var(--ew-blue)"},children:[e.jsxs("p",{style:{fontSize:"clamp(20px, 2.5vw, 28px)",fontWeight:400,lineHeight:1.4,color:"var(--ew-text-dark)",fontStyle:"normal",margin:"0 0 12px",letterSpacing:"-0.01em"},children:['"Better than what I was writing'," ",'myself."']}),e.jsx("p",{style:{fontSize:15,color:"var(--ew-text-body)",lineHeight:1.6,margin:"0 0 16px"},children:"Doug C. had a decade of thinking that never made it out. Now it does, in his voice."}),e.jsx("footer",{style:{fontSize:12,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--ew-text-body)"},children:"Doug C., Executive Coach"})]})})})]})}),e.jsx(N,{howRef:d}),e.jsx("section",{ref:x,"data-nav-theme":"light",style:{padding:"140px 0",background:"var(--ew-white)"},children:e.jsx("div",{style:{maxWidth:1080,margin:"0 auto",padding:"0 40px"},children:e.jsxs("div",{style:{marginLeft:i?0:"clamp(40px, 12vw, 160px)",maxWidth:680},children:[e.jsx(a,{direction:"up",distance:20,children:e.jsx("div",{style:{fontSize:11,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",color:"var(--ew-blue)",marginBottom:20},children:"Quality Standard"})}),e.jsx(a,{direction:"none",children:e.jsx("h2",{style:{fontSize:"clamp(32px, 5vw, 56px)",fontWeight:700,lineHeight:1.15,textWrap:"balance",letterSpacing:"-0.02em",margin:"0 0 28px",color:"var(--ew-text-dark)"},children:"Nothing ships unless it would fool a skeptic.".split(" ").map((t,r)=>e.jsx("span",{style:{display:"inline-block",animation:`xpWordUp 0.6s ${n} ${r*60}ms both`,marginRight:"0.25em"},children:t},r))})}),e.jsx(a,{direction:"up",distance:20,delay:600,children:e.jsx("p",{style:{color:"var(--ew-text-body)",maxWidth:520,fontSize:16,lineHeight:1.7},children:"Before any content reaches you, a hostile reader runs through it. Looking for AI patterns, assembled phrases, anything that doesn't sound like a human made a real decision. If it fails, it doesn't ship. Not once. Not ever. AI slop is everywhere. This is the only standard that keeps your name off it."})})]})})}),e.jsxs("section",{"data-nav-theme":"dark",style:{padding:"100px 0",background:"var(--ew-navy)",display:"flex",alignItems:"center",justifyContent:"center"},children:[e.jsxs("div",{style:{textAlign:"center",maxWidth:800,padding:"0 32px"},children:[e.jsx(a,{children:e.jsxs("p",{style:{fontSize:"clamp(24px, 3.5vw, 40px)",fontWeight:400,color:"rgba(255,255,255,0.5)",margin:"0 0 16px",lineHeight:1.2,letterSpacing:"-0.02em"},children:["Most AI writes for"," ","you."]})}),e.jsx(a,{delay:300,direction:"scale",distance:0,children:e.jsxs("p",{style:{fontSize:"clamp(24px, 3.5vw, 40px)",fontWeight:700,margin:"0 0 48px",lineHeight:1.2,letterSpacing:"-0.02em"},children:[e.jsx("span",{style:{color:"var(--ew-gold)"},children:"EVERYWHERE"})," ",e.jsxs("span",{style:{color:"var(--ew-white)"},children:["works for"," ","you."]})]})}),e.jsxs(a,{delay:500,children:[e.jsx("p",{style:{color:"var(--ew-text-light-dim)",maxWidth:560,margin:"0 auto 12px",textAlign:"center",fontSize:16,lineHeight:1.7},children:"You don't need more discipline. You need a system that carries the idea from your head to your audience, every week, without it sitting on your to-do list."}),e.jsx("p",{style:{color:"var(--ew-text-light-dim)",maxWidth:560,margin:"0 auto 12px",textAlign:"center",fontSize:16,lineHeight:1.7},children:"The output is yours because the input was yours."}),e.jsx("p",{style:{color:"var(--ew-gold)",maxWidth:560,margin:"0 auto 48px",textAlign:"center",fontWeight:500,fontSize:16,lineHeight:1.7},children:"There's a mountain between the idea and the audience. EVERYWHERE Studio carries the mountain."})]}),e.jsxs(a,{delay:700,direction:"up",distance:20,children:[e.jsxs("div",{style:{position:"relative",display:"inline-block",marginBottom:24},children:[e.jsx("div",{style:{position:"absolute",inset:-8,borderRadius:100,border:"1px solid var(--ew-gold)",animation:"xpSonarPing 3s ease-out infinite",pointerEvents:"none"}}),e.jsx("button",{onClick:()=>l("/auth?mode=signup"),style:{background:"var(--ew-gold)",color:"var(--ew-navy)",border:"none",borderRadius:100,padding:"18px 44px",fontWeight:700,fontSize:15,letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:"var(--font)",cursor:"pointer",position:"relative",zIndex:1,transition:`transform 0.35s ${n}, box-shadow 0.35s ${n}`},onMouseEnter:t=>{t.currentTarget.style.transform="scale(1.04)",t.currentTarget.style.boxShadow="0 12px 32px rgba(245,198,66,0.3)"},onMouseLeave:t=>{t.currentTarget.style.transform="scale(1)",t.currentTarget.style.boxShadow="none"},children:"Get Early Access"})]}),e.jsx("div",{children:e.jsxs("a",{href:"mailto:mark@coastalintelligence.ai",style:{color:"var(--ew-text-light-dim)",fontSize:13,textDecoration:"none",fontFamily:"var(--font)",display:"inline-block",position:"relative",paddingBottom:2},onMouseEnter:t=>{const r=t.currentTarget.querySelector("[data-underline]");r&&(r.style.width="100%")},onMouseLeave:t=>{const r=t.currentTarget.querySelector("[data-underline]");r&&(r.style.width="0")},children:["mark@coastalintelligence.ai",e.jsx("span",{"data-underline":"",style:{position:"absolute",bottom:0,left:0,height:1,width:0,background:"var(--ew-text-light-dim)",transition:`width 0.3s ${n}`}})]})})]})]}),e.jsx("style",{children:`
          @keyframes xpSonarPing {
            0% { transform: scale(1); opacity: 0.1; }
            70% { transform: scale(1.4); opacity: 0; }
            100% { transform: scale(1.4); opacity: 0; }
          }
        `})]}),e.jsxs("div",{style:{width:"100%",overflow:"hidden",padding:"40px 0",background:"var(--ew-offwhite)",pointerEvents:"none",userSelect:"none"},children:[e.jsx("div",{className:"xp-marquee-track",style:{display:"flex",whiteSpace:"nowrap",animation:"xpMarquee 40s linear infinite"},children:Array.from({length:8}).map((t,r)=>e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",fontSize:"clamp(80px, 12vw, 200px)",fontFamily:"var(--font)",textTransform:"uppercase",letterSpacing:"-0.02em",flexShrink:0,marginRight:"0.5em"},children:[e.jsx("span",{style:{fontWeight:800,color:"rgba(0,0,0,0.04)"},children:"EVERYWHERE"}),e.jsx("span",{style:{color:"rgba(245,198,66,0.08)",fontSize:"0.35em",margin:"0 0.15em",display:"inline-flex",alignItems:"center"},children:"●"}),e.jsx("span",{style:{fontWeight:300,color:"rgba(0,0,0,0.04)"},children:"STUDIO"})]},r))}),e.jsx("style",{children:`
          @keyframes xpMarquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `})]}),e.jsx("footer",{style:{background:"var(--ew-offwhite)",borderTop:"1px solid var(--ew-border-light)"},children:e.jsxs("div",{className:"xp-footer",children:[e.jsx(S,{size:"sm",variant:"light"}),e.jsx("span",{style:{color:"#AAAAAA",fontSize:11},children:"© 2026 Mixed Grill, LLC"})]})})]})}export{M as default};
