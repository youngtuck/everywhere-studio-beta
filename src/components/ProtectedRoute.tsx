import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

/** Wraps studio/onboarding routes; redirects to /auth when not signed in, and controls onboarding flow. Uses profile from AuthContext (refreshed by onboarding before redirect). */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile, profileLoaded, refreshProfile, signOut } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  const retrainParam = new URLSearchParams(location.search).get("retrain");
  const [profileLoadTimedOut, setProfileLoadTimedOut] = useState(false);
  const [googleAccessCodeVerified, setGoogleAccessCodeVerified] = useState(false);
  const [googleAccessCode, setGoogleAccessCode] = useState("");
  const [googleCodeError, setGoogleCodeError] = useState("");
  const [retryingProfile, setRetryingProfile] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setProfileLoadTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, []);

  const isNewGoogleUser = user && profileLoaded && profile === null;
  const showGoogleAccessCodeModal = isNewGoogleUser && (path.startsWith("/studio") || path === "/onboarding");

  useEffect(() => {
    if (!googleAccessCodeVerified || profile !== null) return;
    const maxRetries = 5;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      setRetryingProfile(true);
      await refreshProfile();
      setRetryingProfile(false);
      if (attempts >= maxRetries) clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
  }, [googleAccessCodeVerified, profile, refreshProfile]);

  const profileReady = user && (profile !== null || profileLoadTimedOut);
  const onboardingDone = !!profile?.voice_dna_completed || !!profile?.onboarding_complete;

  const handleGoogleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleCodeError("");
    try {
      const res = await fetch(`${API_BASE}/api/validate-access-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: googleAccessCode.trim(), email: user?.email || "" }),
      });
      const data = await res.json();
      if (!data.valid) {
        setGoogleCodeError(data.error || "Invalid access code.");
        signOut();
        return;
      }
      // Redeem the code
      if (data.codeId && user) {
        fetch(`${API_BASE}/api/redeem-access-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codeId: data.codeId, userId: user.id }),
        }).catch((err) => console.error("Failed to redeem access code:", err));
      }
    } catch {
      setGoogleCodeError("Could not verify access code. Please try again.");
      signOut();
      return;
    }
    setGoogleAccessCodeVerified(true);
    refreshProfile();
  };

  if (loading || (user && !profileReady && !showGoogleAccessCodeModal)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F4F2ED",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "2px solid #C8961A",
            borderTopColor: "transparent",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (showGoogleAccessCodeModal && !googleAccessCodeVerified) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07090f",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 400,
            background: "#0e1117",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 16,
            padding: 40,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.5)",
              textAlign: "center",
              marginBottom: 24,
              lineHeight: 1.6,
            }}
          >
            IdeasOut is in private Alpha.
          </p>
          <form onSubmit={handleGoogleAccessCodeSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "rgba(255,255,255,0.55)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: 6,
              }}
            >
              ACCESS CODE
            </label>
            <input
              type="text"
              placeholder="Enter your access code"
              value={googleAccessCode}
              onChange={(e) => setGoogleAccessCode(e.target.value)}
              required
              style={{
                width: "100%",
                background: "#0e1117",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                padding: "12px 14px",
                fontSize: 14,
                color: "#fff",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              type="submit"
              style={{
                width: "100%",
                background: "#C8961A",
                color: "#0A0A0A",
                border: "none",
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Continue
            </button>
            {googleCodeError && (
              <p style={{ fontSize: 12, color: "#e85d75", margin: 0 }}>{googleCodeError}</p>
            )}
          </form>
        </div>
      </div>
    );
  }

  if (showGoogleAccessCodeModal && googleAccessCodeVerified && profile === null) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F4F2ED",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              border: "2px solid #C8961A",
              borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
            {retryingProfile ? "Setting up your studio…" : "Loading…"}
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (path.startsWith("/studio")) {
    if (!onboardingDone) {
      return <Navigate to="/onboarding" replace />;
    }
    return <>{children}</>;
  }

  if (path === "/onboarding") {
    if (retrainParam) {
      return <>{children}</>; // Never redirect away when retrain param is present
    }
    if (onboardingDone) {
      return <Navigate to="/studio/dashboard" replace />;
    }
    return <>{children}</>;
  }

  return <>{children}</>;
}
