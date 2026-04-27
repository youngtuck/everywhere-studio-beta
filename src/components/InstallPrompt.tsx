import { useState, useEffect } from "react";

let deferredPrompt: any = null;

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      if (!sessionStorage.getItem("pwa-dismissed")) {
        setShowPrompt(true);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    sessionStorage.setItem("pwa-dismissed", "true");
  };

  if (!showPrompt || dismissed) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#1a1a1a",
        color: "#fff",
        padding: "14px 24px",
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        gap: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        zIndex: 9999,
        fontFamily: "'Inter', sans-serif",
        fontSize: 14,
        maxWidth: 420,
        animation: "slideUp 0.4s ease-out",
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>Install IdeasOut</div>
        <div style={{ fontSize: 12, opacity: 0.6 }}>Add to your home screen for the full experience</div>
      </div>
      <button
        onClick={handleInstall}
        style={{
          background: "#C8961A",
          color: "#1a1a1a",
          border: "none",
          padding: "8px 20px",
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
          whiteSpace: "nowrap",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Close install prompt"
        style={{
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.4)",
          cursor: "pointer",
          fontSize: 18,
          padding: "0 4px",
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
