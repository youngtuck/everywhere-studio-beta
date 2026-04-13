import React from "react";

/** Pointer tip in viewBox 0..24 for path starting M5 3; SVG 22px. */
const CURSOR_TIP_OFFSET_X = (5 / 24) * 22;
const CURSOR_TIP_OFFSET_Y = (3 / 24) * 22;
const CURSOR_CLICK_RING = 40;

/** x/y = hotspot (tip) in positioned parent coordinates. */
export function MarketingDemoCursor({ x, y, visible, click }: { x: number; y: number; visible: boolean; click?: boolean }) {
  if (!visible) return null;
  const half = CURSOR_CLICK_RING / 2;
  return (
    <div
      style={{
        position: "absolute",
        left: x - CURSOR_TIP_OFFSET_X,
        top: y - CURSOR_TIP_OFFSET_Y,
        width: 22,
        height: 22,
        pointerEvents: "none",
        zIndex: 60,
        transition: "left 0.55s cubic-bezier(0.16, 1, 0.3, 1), top 0.55s cubic-bezier(0.16, 1, 0.3, 1), transform 0.08s ease-out",
        transform: click ? "translateY(2px)" : "translateY(0)",
      }}
      aria-hidden
    >
      {click ? (
        <span
          style={{
            position: "absolute",
            left: CURSOR_TIP_OFFSET_X - half,
            top: CURSOR_TIP_OFFSET_Y - half,
            width: CURSOR_CLICK_RING,
            height: CURSOR_CLICK_RING,
            borderRadius: "50%",
            border: "2px solid rgba(200,169,110,0.65)",
            animation: "hiwDemoClickRing 0.38s ease-out forwards",
            pointerEvents: "none",
          }}
        />
      ) : null}
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))", display: "block" }}>
        <path
          d="M5 3l14 10.5-5.5 1.2L10.5 21 5 3z"
          fill="rgba(255,255,255,0.95)"
          stroke="rgba(0,0,0,0.28)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function marketingDemoClickRingKeyframes(): string {
  return `
    @keyframes hiwDemoClickRing {
      from { transform: scale(0.28); opacity: 0.95; }
      to { transform: scale(1.05); opacity: 0; }
    }
  `;
}
