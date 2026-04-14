import React from "react";

const CTA_BODY =
  "You're not a marketer. You're not a content creator. You're a practitioner with something important to say. You've been waiting too long for the system to catch up to the thinking. EVERYWHERE Studio was built for you.";

export interface MarketingBuiltForCtaProps {
  onRequestAccess: () => void;
  onSignIn: () => void;
}

/** Shared bottom CTA: centered headline, centered body, consistent across marketing pages. */
export default function MarketingBuiltForCta({ onRequestAccess, onSignIn }: MarketingBuiltForCtaProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        padding: "0 20px",
        boxSizing: "border-box",
      }}
    >
      <h2
        style={{
          fontSize: "clamp(24px, 5vw, 56px)",
          fontWeight: 600,
          letterSpacing: "-0.04em",
          lineHeight: 1.12,
          color: "var(--xp-on-dark)",
          margin: "0 0 24px",
          textAlign: "center",
          maxWidth: "100%",
        }}
      >
        Built for one kind of person.
      </h2>
      <p
        style={{
          fontSize: 16,
          lineHeight: 1.7,
          color: "var(--xp-dim-dark)",
          maxWidth: 560,
          width: "100%",
          margin: "0 0 48px",
          textAlign: "center",
        }}
      >
        {CTA_BODY}
      </p>
      <button type="button" className="xp-btn xp-btn-liquid" onClick={onSignIn} style={{ marginBottom: 16 }}>
        Sign In
      </button>
      <div style={{ marginTop: 40 }}>
        <a href="mailto:beta@everywherestudio.ai" className="xp-mono" style={{ fontSize: 12, color: "var(--xp-dim-dark)", textDecoration: "none" }}>
          beta@everywherestudio.ai
        </a>
      </div>
    </div>
  );
}
