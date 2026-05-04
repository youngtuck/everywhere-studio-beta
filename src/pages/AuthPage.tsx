// NOTE: Public signup is gated by access code "OneIdea" (case-insensitive).
// To fully disable public signup at the infrastructure level:
// Supabase Dashboard > Authentication > Settings > Disable "Enable email signup"
// This is recommended before any public launch.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";
import Logo from "../components/Logo";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

/** Explore page hero background (CLAUDE.md) */
const NAVY_DEEP = "#060D14";
const NAVY = "#0C1A29";
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

const AuthPage = () => {
  const [mode, setMode] = useState<"signin" | "signup">(() =>
    new URLSearchParams(window.location.search).get("mode") === "signup" ? "signup" : "signin"
  );
  const [reveal, setReveal] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [name, setName] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReveal(true)));
    return () => cancelAnimationFrame(id);
  }, [mode]);

  const switchMode = () => {
    setReveal(false);
    setSubmitError("");
    setResetSent(false);
    setMode(m => m === "signin" ? "signup" : "signin");
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setSubmitError("Enter your email above first.");
      return;
    }
    setSubmitError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) {
      setSubmitError(error.message);
      return;
    }
    setResetSent(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (mode === "signup") {
      try {
        const codeRes = await fetch(`${API_BASE}/api/validate-access-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: accessCode.trim(), email: email.trim() }),
        });
        const codeData = await codeRes.json();
        if (!codeData.valid) {
          setSubmitError(codeData.error || "Invalid access code.");
          return;
        }
        window.__ewCodeId = codeData.codeId;
      } catch {
        setSubmitError("Could not verify access code. Please try again.");
        return;
      }
      if (password !== confirmPassword) {
        setSubmitError("Passwords don't match.");
        return;
      }
    }

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setSubmitError(error.message); return; }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        });
        if (error) { setSubmitError(error.message); return; }
        const codeId = window.__ewCodeId;
        if (codeId) {
          fetch(`${API_BASE}/api/redeem-access-code`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ codeId }),
          }).catch((err) => console.error("Failed to redeem access code:", err));
          delete window.__ewCodeId;
        }
        setSubmitError("Check your email to confirm your account.");
        return;
      }
      const { data: authed } = await supabase.auth.getUser();
      const authedUser = authed.user;
      if (!authedUser) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("voice_dna_completed, onboarding_complete")
        .eq("id", authedUser.id)
        .single();

      if (!profile?.voice_dna_completed && !profile?.onboarding_complete) navigate("/onboarding");
      else navigate("/studio/dashboard");
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    }
  };

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/studio/dashboard` }
    });
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "rgba(240,237,228,0.42)",
    display: "block",
    marginBottom: 8,
    fontFamily: "'DM Mono', ui-monospace, monospace",
  };

  const dividerLine = (
    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
  );

  return (
    <div
      className="auth-page-root"
      style={{
        minHeight: "100vh",
        background: NAVY_DEEP,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'Inter', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `
            radial-gradient(ellipse 95% 65% at 50% -5%, rgba(107, 127, 242, 0.09) 0%, transparent 52%),
            radial-gradient(ellipse 45% 35% at 88% 92%, rgba(200, 169, 110, 0.07) 0%, transparent 48%),
            radial-gradient(ellipse 55% 40% at 8% 75%, rgba(74, 144, 217, 0.06) 0%, transparent 42%),
            linear-gradient(180deg, ${NAVY_DEEP} 0%, ${NAVY} 48%, ${NAVY_DEEP} 100%)
          `,
        }}
      />

      <style>{`
        body { background: ${NAVY_DEEP}; }
        .auth-modal-glass {
          position: relative;
          isolation: isolate;
          border-radius: 22px;
          overflow: hidden;
          transform: translateZ(0);
          background: rgba(10, 12, 18, 0.48);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow:
            0 32px 96px rgba(0, 0, 0, 0.55),
            0 12px 40px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            inset 1px 1px 0 rgba(255,255,255,0.05),
            inset -1px -1px 0 rgba(0,0,0,0.2);
        }
        .auth-modal-glass::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          z-index: 0;
          pointer-events: none;
          backdrop-filter: blur(32px) saturate(1.8);
          -webkit-backdrop-filter: blur(32px) saturate(1.8);
        }
        .auth-modal-glass::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          z-index: 1;
          pointer-events: none;
          background-image:
            radial-gradient(ellipse 82% 58% at 0% 0%, rgba(255,255,255,0.11), transparent 56%),
            radial-gradient(ellipse 76% 52% at 100% 0%, rgba(255,255,255,0.07), transparent 52%),
            radial-gradient(ellipse 68% 48% at 100% 100%, rgba(255,255,255,0.055), transparent 48%),
            radial-gradient(ellipse 62% 44% at 0% 100%, rgba(255,255,255,0.04), transparent 44%);
          background-size: 100% 100%;
          background-position: 0 0;
          background-repeat: no-repeat;
          transition: opacity 0.22s ${EASE};
          opacity: 0.97;
          box-shadow:
            inset 0 0 48px rgba(255,255,255,0.035),
            inset 0 0 10px rgba(255,255,255,0.025),
            inset -1px -1px 0.5px rgba(255,255,255,0.09),
            inset 1px 1px 0.5px rgba(255,255,255,0.055);
        }
        .auth-modal-glass:hover::before {
          opacity: 1;
        }
        .auth-modal-body {
          position: relative;
          z-index: 3;
        }
        .auth-segment-wrap {
          display: flex;
          gap: 4px;
          padding: 5px;
          margin: 20px 20px 0;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .auth-segment {
          flex: 1;
          border: none;
          border-radius: 11px;
          padding: 11px 14px;
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          letter-spacing: -0.01em;
          cursor: pointer;
          color: rgba(240, 237, 228, 0.45);
          background: transparent;
          transition: background 0.22s ${EASE}, color 0.22s ${EASE}, box-shadow 0.22s ${EASE};
        }
        .auth-segment-active {
          color: #F0EDE4;
          background: rgba(255, 255, 255, 0.1);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.14),
            0 1px 8px rgba(0,0,0,0.12);
        }
        .auth-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 13px 15px;
          font-size: 15px;
          color: #F0EDE4;
          outline: none;
          font-family: inherit;
          backdrop-filter: blur(16px) saturate(1.55);
          -webkit-backdrop-filter: blur(16px) saturate(1.55);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
          transition: background 0.2s ${EASE}, border-color 0.2s ${EASE}, box-shadow 0.2s ${EASE};
        }
        .auth-input::placeholder {
          color: rgba(240, 237, 228, 0.32);
        }
        .auth-input:focus {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(245, 198, 66, 0.45);
          box-shadow:
            0 0 0 3px rgba(245, 198, 66, 0.12),
            inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .auth-input:focus-visible {
          outline: 2px solid rgba(245, 198, 66, 0.55);
          outline-offset: 2px;
        }
        .auth-google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: #F0EDE4;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          backdrop-filter: blur(18px) saturate(1.5);
          -webkit-backdrop-filter: blur(18px) saturate(1.5);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
          transition: background 0.2s ${EASE}, border-color 0.2s ${EASE}, box-shadow 0.2s ${EASE};
        }
        .auth-google-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.18);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 18px rgba(0,0,0,0.15);
        }
        .auth-submit-btn {
          margin-top: 8px;
          width: 100%;
          border: 1px solid rgba(245, 198, 66, 0.35);
          border-radius: 12px;
          padding: 14px 16px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-family: inherit;
          cursor: pointer;
          color: #F0EDE4;
          background: rgba(245, 198, 66, 0.14);
          backdrop-filter: blur(16px) saturate(1.5);
          -webkit-backdrop-filter: blur(16px) saturate(1.5);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.12),
            0 4px 24px rgba(0,0,0,0.2);
          transition: background 0.2s ${EASE}, border-color 0.2s ${EASE}, box-shadow 0.2s ${EASE};
        }
        .auth-submit-btn:hover {
          background: rgba(245, 198, 66, 0.24);
          border-color: rgba(245, 198, 66, 0.5);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.18),
            0 8px 28px rgba(245, 198, 66, 0.14);
        }
        .auth-submit-btn:focus-visible {
          outline: 2px solid rgba(245, 198, 66, 0.55);
          outline-offset: 3px;
        }
        .auth-google-btn:focus-visible {
          outline: 2px solid rgba(245, 198, 66, 0.45);
          outline-offset: 2px;
        }
        .auth-segment:focus-visible {
          outline: 2px solid rgba(245, 198, 66, 0.45);
          outline-offset: 2px;
        }
        .auth-link-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 12px;
          color: #C8A96E;
          padding: 0;
          font-family: inherit;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-modal-glass::before { transition: none !important; }
        }
      `}</style>

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <Logo size={20} variant="dark" onClick={() => navigate("/explore")} />
        </div>

        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <span
            style={{
              display: "inline-block",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--gold-bright, #F5C642)",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Out of your head and into the world
          </span>
        </div>

        <div className="auth-modal-glass">
          <div className="auth-modal-body">
            <div className="auth-segment-wrap" role="tablist" aria-label="Account">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signin"}
                className={`auth-segment${mode === "signin" ? " auth-segment-active" : ""}`}
                onClick={() => {
                  setReveal(false);
                  setSubmitError("");
                  setResetSent(false);
                  setMode("signin");
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signup"}
                className={`auth-segment${mode === "signup" ? " auth-segment-active" : ""}`}
                onClick={() => {
                  setReveal(false);
                  setSubmitError("");
                  setMode("signup");
                }}
              >
                Create Account
              </button>
            </div>

            <div style={{ padding: "32px 32px 36px" }} key={mode}>
              <div
                style={{
                  opacity: reveal ? 1 : 0,
                  transform: reveal ? "translate3d(0,0,0)" : "translate3d(0,10px,0)",
                  transition: `opacity 0.32s ${EASE}, transform 0.32s ${EASE}`,
                }}
              >
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                  <p
                    style={{
                      marginBottom: 10,
                      fontSize: 11,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "rgba(240,237,228,0.4)",
                      fontWeight: 400,
                      fontFamily: "'DM Mono', ui-monospace, monospace",
                    }}
                  >
                    {mode === "signin" ? "Welcome back" : "Create your studio"}
                  </p>
                  <h1
                    style={{
                      fontSize: "clamp(24px, 3.2vw, 30px)",
                      fontWeight: 600,
                      color: "#F0EDE4",
                      letterSpacing: "-0.03em",
                      margin: 0,
                      lineHeight: 1.15,
                    }}
                  >
                    {mode === "signin" ? "Sign in" : "Join the Studio"}
                  </h1>
                </div>

                {resetSent && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "#C8A96E",
                      marginBottom: 16,
                      textAlign: "center",
                    }}
                  >
                    Check your email for a reset link.
                  </p>
                )}

                {mode === "signup" && (
                  <>
                    <button type="button" className="auth-google-btn" onClick={handleGoogleSignIn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Sign up with Google
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "14px 0" }}>
                      {dividerLine}
                      <span
                        style={{
                          fontSize: 11,
                          color: "rgba(240,237,228,0.38)",
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          fontFamily: "'DM Mono', ui-monospace, monospace",
                        }}
                      >
                        or
                      </span>
                      {dividerLine}
                    </div>
                  </>
                )}

                <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {mode === "signup" && (
                    <div>
                      <label style={labelStyle}>Full name</label>
                      <input
                        className="auth-input"
                        type="text"
                        placeholder="Your name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                      />
                    </div>
                  )}
                  {mode === "signup" && (
                    <div>
                      <label style={labelStyle}>Access code</label>
                      <input
                        className="auth-input"
                        type="text"
                        placeholder="Enter your access code"
                        value={accessCode}
                        onChange={e => setAccessCode(e.target.value)}
                        required
                      />
                      <p
                        style={{
                          fontSize: 11,
                          color: "rgba(240,237,228,0.36)",
                          marginTop: 8,
                          marginBottom: 0,
                          lineHeight: 1.55,
                        }}
                      >
                        Access codes are provided during onboarding.{" "}
                        <a
                          href="mailto:mark@coastalintelligence.ai?subject=EVERYWHERE%20Studio%20Access%20Code%20Request"
                          style={{ color: "#C8A96E", textDecoration: "none" }}
                        >
                          Request one here.
                        </a>
                      </p>
                    </div>
                  )}
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      className="auth-input"
                      type="email"
                      placeholder="you@yourcompany.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Password</label>
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <input
                        className="auth-input"
                        type={showPassword ? "text" : "password"}
                        placeholder={mode === "signin" ? "Enter your password" : "Create a password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        style={{ paddingRight: 48 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        style={{
                          position: "absolute",
                          right: 12,
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 8,
                          cursor: "pointer",
                          color: "rgba(240,237,228,0.5)",
                          padding: 6,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  {mode === "signup" && (
                    <div>
                      <label style={labelStyle}>Confirm password</label>
                      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                        <input
                          className="auth-input"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          required
                          style={{ paddingRight: 48 }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          style={{
                            position: "absolute",
                            right: 12,
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 8,
                            cursor: "pointer",
                            color: "rgba(240,237,228,0.5)",
                            padding: 6,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  )}
                  {mode === "signin" && (
                    <div style={{ marginTop: -6 }}>
                      <button type="button" className="auth-link-btn" onClick={handleForgotPassword}>
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <button type="submit" className="auth-submit-btn">
                    {mode === "signin" ? "Sign In" : "Join the Studio"}
                  </button>
                  {submitError && (
                    <p
                      style={{
                        fontSize: 13,
                        color: "#f0a0a8",
                        marginTop: 4,
                        marginBottom: 0,
                        textAlign: "center",
                        lineHeight: 1.45,
                      }}
                    >
                      {submitError}
                    </p>
                  )}
                </form>

                {mode === "signup" && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(240,237,228,0.42)",
                      textAlign: "center",
                      marginTop: 22,
                      lineHeight: 1.65,
                    }}
                  >
                    <Logo size={13} variant="dark" /> is in private Alpha.
                    <br />
                    Contact mark@coastalintelligence.ai for access.
                  </p>
                )}

                {mode === "signin" && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0 14px" }}>
                      {dividerLine}
                      <span
                        style={{
                          fontSize: 11,
                          color: "rgba(240,237,228,0.38)",
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          fontFamily: "'DM Mono', ui-monospace, monospace",
                        }}
                      >
                        or
                      </span>
                      {dividerLine}
                    </div>
                    <button type="button" className="auth-google-btn" onClick={handleGoogleSignIn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Continue with Google
                    </button>
                  </>
                )}

                {mode === "signup" && (
                  <p
                    style={{
                      textAlign: "center",
                      marginTop: 26,
                      fontSize: 13,
                      color: "rgba(240,237,228,0.5)",
                    }}
                  >
                    Already have a studio?{" "}
                    <button
                      type="button"
                      onClick={switchMode}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#C8A96E",
                        fontFamily: "inherit",
                        textDecoration: "underline",
                        textUnderlineOffset: "3px",
                      }}
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
