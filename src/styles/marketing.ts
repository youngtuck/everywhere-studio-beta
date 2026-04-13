export const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
export const EASE_SMOOTH = "cubic-bezier(0.4, 0, 0.2, 1)";

/**
 * Shared marketing design system (Explore + satellite pages).
 * Fonts load from index.html to avoid @import blocking inside injected <style>.
 */
export const MARKETING_CSS = `
:root {
  --xp-navy: #0C1A29;
  --xp-navy-deep: #060D14;
  --xp-gold: #C8A96E;
  --xp-blue: #4A90D9;
  --xp-white: #FFFFFF;
  --xp-off: #F8F9FA;
  --xp-text: #0A0A0A;
  --xp-sec: #6B7280;
  --xp-ter: #A1A1AA;
  --xp-on-dark: #F0EDE4;
  --xp-dim-dark: rgba(255,255,255,0.38);
  --xp-border: #E4E4E7;
  --xp-font: 'Instrument Sans', -apple-system, system-ui, sans-serif;
  --xp-mono: 'DM Mono', monospace;
  --xp-ease: ${EASE};
  --xp-ease-smooth: ${EASE_SMOOTH};
  --xp-glass-blur: 28px;
  --xp-glass-blur-strong: 36px;
  --xp-glass-sat: 1.75;
  --xp-glass-sat-card: 1.55;
  --xp-section-pad-y: 128px;
  --xp-section-pad-x: 48px;
  --xp-dur-fast: 0.18s;
  --xp-dur: 0.22s;
  --xp-dur-slow: 0.32s;
}

/* BASE */
.xp {
  font-family: var(--xp-font);
  font-size: 17px;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--xp-white);
  color: var(--xp-text);
  overflow: clip;
}
.xp a { color: inherit; text-decoration: none; }
.xp ::selection { background: var(--xp-gold); color: var(--xp-navy); }
.xp button:active { transform: scale(0.97) !important; transition-duration: 0.1s !important; }
.xp-mono { font-family: var(--xp-mono); }

/* Section rhythm + offscreen paint skip (scroll performance) */
section.xp-sect {
  content-visibility: auto;
  contain-intrinsic-size: auto 560px;
}

/* KEYFRAMES */
@keyframes xpSpin { from{transform:translate(-50%,-50%) rotate(0deg);} to{transform:translate(-50%,-50%) rotate(360deg);} }
@keyframes xpSpinR { from{transform:translate(-50%,-50%) rotate(0deg);} to{transform:translate(-50%,-50%) rotate(-360deg);} }
@keyframes xpDot { 0%,100%{opacity:.25;} 50%{opacity:1;} }
@keyframes xpGlow { 0%,100%{opacity:.03;} 50%{opacity:.07;} }
@keyframes xpSlideIn { from{opacity:0;transform:translate3d(40px,0,0);} to{opacity:1;transform:translate3d(0,0,0);} }
@keyframes xpFadeUp { from{opacity:0;transform:translate3d(0,20px,0);} to{opacity:1;transform:translate3d(0,0,0);} }
@keyframes xpGatePulse { 0%{box-shadow:0 0 0 0 rgba(200,169,110,0.3);} 70%{box-shadow:0 0 0 8px rgba(200,169,110,0);} 100%{box-shadow:0 0 0 0 rgba(200,169,110,0);} }
@keyframes xpHeroLabel { from{opacity:0;transform:translate3d(0,14px,0);} to{opacity:1;transform:translate3d(0,0,0);} }
@keyframes xpHeroHead { from{opacity:0;transform:translate3d(0,20px,0) scale(0.97);} to{opacity:1;transform:translate3d(0,0,0) scale(1);} }
@keyframes xpHeroLine { from{width:0;opacity:0;} to{width:64px;opacity:1;} }
@keyframes xpHeroSub { from{opacity:0;transform:translate3d(0,14px,0);} to{opacity:1;transform:translate3d(0,0,0);} }
@keyframes xpHeroCta { from{opacity:0;transform:translate3d(0,14px,0) scale(0.96);} to{opacity:1;transform:translate3d(0,0,0) scale(1);} }
@keyframes xpRingFloat { 0%,100%{transform:translate(-50%,-50%) scale(1);} 50%{transform:translate(-50%,-50%) scale(1.015);} }
@keyframes xpScrollHint { 0%,100%{transform:translate3d(0,0,0);opacity:.4;} 50%{transform:translate3d(0,8px,0);opacity:.9;} }

/* LIQUID GLASS — layered material: blur + static corner highlights (no sweeping shimmer) */
.xp-liquid-glass {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  isolation: isolate;
  transform: translateZ(0);
}
.xp-liquid-glass::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  backdrop-filter: blur(var(--xp-glass-blur)) saturate(var(--xp-glass-sat));
  -webkit-backdrop-filter: blur(var(--xp-glass-blur)) saturate(var(--xp-glass-sat));
  z-index: 1;
}
.xp-liquid-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  z-index: 2;
  pointer-events: none;
  background-image:
    radial-gradient(ellipse 78% 58% at 0% 0%, rgba(255,255,255,0.14), transparent 58%),
    radial-gradient(ellipse 72% 52% at 100% 0%, rgba(255,255,255,0.1), transparent 54%),
    radial-gradient(ellipse 62% 48% at 100% 100%, rgba(255,255,255,0.07), transparent 50%),
    radial-gradient(ellipse 58% 44% at 0% 100%, rgba(255,255,255,0.06), transparent 46%);
  background-size: 100% 100%;
  background-position: 0 0;
  background-repeat: no-repeat;
  opacity: 0.96;
  transition: opacity var(--xp-dur) var(--xp-ease-smooth);
  box-shadow:
    inset 0 0 48px rgba(255,255,255,0.05),
    inset 0 0 10px rgba(255,255,255,0.04),
    inset -1.5px -1.5px 1px rgba(255,255,255,0.11),
    inset 1.5px 1.5px 1px rgba(255,255,255,0.08),
    inset -1.5px -1.5px 0 rgba(50,50,50,0.06),
    inset 1.5px 1.5px 0 rgba(40,40,40,0.08);
}
.xp-liquid-glass:hover::before {
  opacity: 1;
}
.xp-liquid-glass > * {
  position: relative;
  z-index: 3;
}

/* Rim: crisp stroke + corner catchlights (static) */
.xp-liquid-glass-border {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 4;
  border: 1px solid rgba(255,255,255,0.11);
  box-shadow:
    inset 1px 1px 0 rgba(255,255,255,0.07),
    inset -1px -1px 0 rgba(0,0,0,0.18);
  transition: border-color var(--xp-dur) var(--xp-ease-smooth), box-shadow var(--xp-dur) var(--xp-ease-smooth);
}

/* LIQUID GLASS VARIANTS */
.xp-lg-dark {
  background: rgba(10,12,18,0.42);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
}
.xp-lg-dark::before {
  background-image:
    radial-gradient(ellipse 82% 60% at 0% 0%, rgba(255,255,255,0.1), transparent 56%),
    radial-gradient(ellipse 74% 54% at 100% 0%, rgba(255,255,255,0.07), transparent 52%),
    radial-gradient(ellipse 64% 48% at 100% 100%, rgba(255,255,255,0.055), transparent 48%),
    radial-gradient(ellipse 58% 42% at 0% 100%, rgba(255,255,255,0.045), transparent 44%);
  box-shadow:
    inset 0 0 44px rgba(255,255,255,0.04),
    inset 0 0 8px rgba(255,255,255,0.03),
    inset -1.5px -1.5px 1px rgba(255,255,255,0.08),
    inset 1.5px 1.5px 1px rgba(255,255,255,0.05),
    inset -1.5px -1.5px 0 rgba(0,0,0,0.18),
    inset 1.5px 1.5px 0 rgba(0,0,0,0.14);
}
.xp-lg-light {
  background: rgba(255,255,255,0.52);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.65);
}
.xp-lg-light::before {
  background-image:
    radial-gradient(ellipse 88% 62% at 0% 0%, rgba(255,255,255,0.5), transparent 56%),
    radial-gradient(ellipse 78% 56% at 100% 0%, rgba(255,255,255,0.32), transparent 52%),
    radial-gradient(ellipse 68% 50% at 100% 100%, rgba(255,255,255,0.18), transparent 48%),
    radial-gradient(ellipse 62% 46% at 0% 100%, rgba(255,255,255,0.12), transparent 44%);
  box-shadow:
    inset 0 0 40px rgba(255,255,255,0.22),
    inset 0 0 8px rgba(255,255,255,0.1),
    inset -1.5px -1.5px 1px rgba(255,255,255,0.38),
    inset 1.5px 1.5px 1px rgba(255,255,255,0.28),
    inset -1.5px -1.5px 0 rgba(0,0,0,0.02),
    inset 1.5px 1.5px 0 rgba(0,0,0,0.03);
}
.xp-lg-light .xp-liquid-glass-border {
  border-color: rgba(12, 26, 41, 0.09);
  box-shadow:
    inset 1px 1px 0 rgba(255,255,255,0.55),
    inset -1px -1px 0 rgba(12, 26, 41, 0.04);
}
.xp-lg-shadow { box-shadow: 0 8px 48px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04); }
.xp-lg-dark.xp-lg-shadow { box-shadow: 0 8px 48px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.15); }

/* GLASS NAV */
.xp-glass-nav {
  position: fixed;
  top: 12px; left: 16px; right: 16px;
  z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 28px; height: 52px;
  border-radius: 16px;
  background: rgba(12, 26, 41, 0.55);
  transition: background var(--xp-dur-slow) var(--xp-ease-smooth), box-shadow var(--xp-dur-slow) var(--xp-ease-smooth);
}
.xp-glass-nav.xp-liquid-glass { overflow: visible; isolation: auto; }
.xp-glass-nav.xp-liquid-glass::before,
.xp-glass-nav.xp-liquid-glass::after { border-radius: 16px; overflow: hidden; }
.xp-glass-nav.xp-liquid-glass::after {
  backdrop-filter: blur(22px) saturate(1.85);
  -webkit-backdrop-filter: blur(22px) saturate(1.85);
}
.xp-glass-nav.xp-lg-dark { background: rgba(10, 12, 18, 0.52); }
.xp-glass-nav.xp-lg-light {
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.06);
}
.xp-nav-link {
  font-size: 13px; font-weight: 500; cursor: pointer;
  background: none; border: none; font-family: var(--xp-font);
  border-radius: 8px;
  transition: color var(--xp-dur) var(--xp-ease-smooth), opacity var(--xp-dur) var(--xp-ease-smooth);
}
.xp-nav-link:hover { opacity: 1; }
.xp-nav-link:focus-visible {
  outline: 2px solid rgba(200, 169, 110, 0.55);
  outline-offset: 4px;
  border-radius: 4px;
}
.xp-nav-cta {
  font-size: 11px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase;
  padding: 10px 22px; border-radius: 999px; cursor: pointer;
  font-family: var(--xp-font);
  transition:
    background var(--xp-dur) var(--xp-ease-smooth),
    border-color var(--xp-dur) var(--xp-ease-smooth),
    color var(--xp-dur) var(--xp-ease-smooth),
    box-shadow var(--xp-dur) var(--xp-ease-smooth);
}
.xp-nav-cta:hover {
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}
.xp-nav-cta:active {
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
}

/* GLASS CARD */
.xp-glass-card {
  position: relative;
  border-radius: 22px;
  overflow: hidden;
  isolation: isolate;
  background: rgba(255,255,255,0.46);
  transition: box-shadow var(--xp-dur-slow) var(--xp-ease-smooth), border-color var(--xp-dur-slow) var(--xp-ease-smooth);
  box-shadow: 0 4px 28px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  transform: translateZ(0);
  border: 1px solid rgba(255,255,255,0.52);
}
.xp-glass-card::before {
  content: '';
  position: absolute; inset: 0;
  border-radius: inherit;
  z-index: 1;
  pointer-events: none;
  background-image:
    radial-gradient(ellipse 85% 58% at 0% 0%, rgba(255,255,255,0.42), transparent 55%),
    radial-gradient(ellipse 78% 52% at 100% 0%, rgba(255,255,255,0.22), transparent 52%),
    radial-gradient(ellipse 70% 48% at 100% 100%, rgba(255,255,255,0.14), transparent 48%),
    radial-gradient(ellipse 64% 44% at 0% 100%, rgba(255,255,255,0.1), transparent 44%);
  background-size: 100% 100%;
  background-position: 0 0;
  background-repeat: no-repeat;
  transition: opacity var(--xp-dur) var(--xp-ease-smooth);
  opacity: 0.98;
  box-shadow:
    inset 0 0 32px rgba(255,255,255,0.14),
    inset 0 0 6px rgba(255,255,255,0.08),
    inset -1px -1px 0.5px rgba(255,255,255,0.26),
    inset 1px 1px 0.5px rgba(255,255,255,0.2);
}
.xp-glass-card::after {
  content: '';
  position: absolute; inset: 0;
  border-radius: inherit;
  backdrop-filter: blur(18px) saturate(var(--xp-glass-sat-card));
  -webkit-backdrop-filter: blur(18px) saturate(var(--xp-glass-sat-card));
  z-index: 0;
}
.xp-glass-card > * { position: relative; z-index: 2; }
.xp-glass-card:hover {
  box-shadow: 0 12px 44px rgba(0,0,0,0.08), 0 2px 6px rgba(74, 144, 217, 0.06);
  border-color: rgba(255,255,255,0.72);
}
.xp-glass-card:hover::before {
  opacity: 1;
}
.xp-glass-card:active {
  box-shadow: 0 6px 28px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
  transition-duration: var(--xp-dur-fast);
}

/* Dark glass card variant */
.xp-glass-card-dark {
  position: relative;
  border-radius: 22px;
  overflow: hidden;
  isolation: isolate;
  background: rgba(10,12,18,0.42);
  border: 1px solid rgba(255,255,255,0.08);
  transition: box-shadow var(--xp-dur-slow) var(--xp-ease-smooth), background var(--xp-dur-slow) var(--xp-ease-smooth), border-color var(--xp-dur-slow) var(--xp-ease-smooth);
  box-shadow: 0 4px 28px rgba(0,0,0,0.16), 0 1px 2px rgba(0,0,0,0.08);
  transform: translateZ(0);
}
.xp-glass-card-dark::before {
  content: '';
  position: absolute; inset: 0;
  border-radius: inherit;
  z-index: 1;
  pointer-events: none;
  background-image:
    radial-gradient(ellipse 80% 56% at 0% 0%, rgba(255,255,255,0.09), transparent 56%),
    radial-gradient(ellipse 74% 50% at 100% 0%, rgba(255,255,255,0.06), transparent 52%),
    radial-gradient(ellipse 66% 46% at 100% 100%, rgba(255,255,255,0.05), transparent 48%),
    radial-gradient(ellipse 60% 42% at 0% 100%, rgba(255,255,255,0.04), transparent 44%);
  background-size: 100% 100%;
  background-position: 0 0;
  background-repeat: no-repeat;
  transition: opacity var(--xp-dur) var(--xp-ease-smooth);
  opacity: 0.97;
  box-shadow:
    inset 0 0 30px rgba(255,255,255,0.035),
    inset 0 0 6px rgba(255,255,255,0.025),
    inset -1px -1px 0.5px rgba(255,255,255,0.07),
    inset 1px 1px 0.5px rgba(255,255,255,0.045);
}
.xp-glass-card-dark::after {
  content: '';
  position: absolute; inset: 0;
  border-radius: inherit;
  backdrop-filter: blur(18px) saturate(1.45);
  -webkit-backdrop-filter: blur(18px) saturate(1.45);
  z-index: 0;
}
.xp-glass-card-dark > * { position: relative; z-index: 2; }
.xp-glass-card-dark:hover {
  background: rgba(200, 169, 110, 0.1);
  border-color: rgba(200, 169, 110, 0.22);
  box-shadow: 0 12px 40px rgba(200, 169, 110, 0.07), 0 2px 5px rgba(0,0,0,0.14), inset 0 0 24px rgba(200, 169, 110, 0.04);
}
.xp-glass-card-dark:hover::before {
  opacity: 1;
}
.xp-glass-card-dark:hover .xp-mono {
  color: var(--xp-gold) !important;
}

/* BUTTONS */
.xp-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 14px 30px; font-family: var(--xp-font);
  font-size: 12px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase;
  border: none; border-radius: 999px; cursor: pointer;
  transition:
    background var(--xp-dur) var(--xp-ease-smooth),
    color var(--xp-dur) var(--xp-ease-smooth),
    box-shadow var(--xp-dur) var(--xp-ease-smooth),
    border-color var(--xp-dur) var(--xp-ease-smooth);
}
.xp-btn-w { background: var(--xp-white); color: var(--xp-navy); }
.xp-btn-w:hover { background: var(--xp-gold); color: var(--xp-navy); }
.xp-btn-n { background: var(--xp-navy); color: var(--xp-white); }
.xp-btn-n:hover { background: #15283d; }
.xp-btn-glass {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.12);
  color: var(--xp-on-dark);
  border-radius: 14px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.xp-btn-glass:hover {
  background: rgba(255,255,255,0.16);
  border-color: rgba(255,255,255,0.2);
  box-shadow: 0 4px 18px rgba(0,0,0,0.12);
}
.xp-btn-liquid {
  position: relative;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.18);
  color: var(--xp-on-dark);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  overflow: hidden;
}
.xp-btn-liquid::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image:
    radial-gradient(ellipse 100% 80% at 0% 0%, rgba(255,255,255,0.18), transparent 62%),
    radial-gradient(ellipse 90% 70% at 100% 100%, rgba(255,255,255,0.08), transparent 55%);
  background-size: 100% 100%;
  background-position: 0 0;
  transition: opacity var(--xp-dur) var(--xp-ease-smooth);
  opacity: 0.95;
  box-shadow:
    inset 0 0 20px rgba(255,255,255,0.05),
    inset -1px -1px 0.5px rgba(255,255,255,0.1),
    inset 1px 1px 0.5px rgba(255,255,255,0.07);
  pointer-events: none;
}
.xp-btn-liquid:hover {
  background: rgba(255,255,255,0.19);
  border-color: rgba(255,255,255,0.26);
  box-shadow: 0 6px 26px rgba(0,0,0,0.14);
}
.xp-btn-liquid:hover::before {
  opacity: 1;
}
.xp-btn-liquid:active {
  box-shadow: 0 3px 14px rgba(0,0,0,0.12);
}

/* Footer links (avoid inline hover handlers) */
.xp-footer-link {
  font-size: 12px;
  color: var(--xp-ter);
  cursor: pointer;
  background: none;
  border: none;
  font-family: var(--xp-font);
  transition: color 0.2s var(--xp-ease-smooth);
}
.xp-footer-link:hover { color: var(--xp-text); }
.xp-footer-link:focus-visible {
  outline: 2px solid rgba(200, 169, 110, 0.5);
  outline-offset: 3px;
  border-radius: 4px;
}

/* Focus: designed rings (keyboard) */
.xp-btn:focus-visible,
.xp-nav-cta:focus-visible {
  outline: 2px solid rgba(200, 169, 110, 0.55);
  outline-offset: 3px;
}

/* RESPONSIVE */
@media(max-width:900px) {
  .xp-glass-nav { left: 8px; right: 8px; top: 8px; padding: 0 20px; height: 48px; border-radius: 14px; }
  .xp-nav-links-desktop { display: none !important; }
  .xp-sect { padding-left: 24px !important; padding-right: 24px !important; }
  .xp-glass-cards-row { flex-direction: column !important; }
}
@media(max-width:600px) {
  .xp-sect { padding-left: 20px !important; padding-right: 20px !important; }
  .xp-glass-nav { left: 6px; right: 6px; top: 6px; padding: 0 16px; }
}

/* Typography */
.xp p, .xp h1, .xp h2, .xp h3 {
  text-wrap: pretty;
}

/* Checkpoint grid */
.checkpoint-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.checkpoint-grid > *:last-child:nth-child(3n+1) {
  grid-column: 2;
}
@media(max-width: 900px) {
  .checkpoint-grid {
    grid-template-columns: 1fr !important;
  }
  .checkpoint-grid > *:last-child:nth-child(3n+1) {
    grid-column: auto;
  }
}

/* Reduced motion */
@media(prefers-reduced-motion: reduce) {
  .xp-liquid-glass::before,
  .xp-glass-card::before,
  .xp-glass-card-dark::before,
  .xp-btn-liquid::before {
    transition: none !important;
  }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;
