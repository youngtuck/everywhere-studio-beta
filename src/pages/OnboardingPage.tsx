import { useEffect, useState, useRef, useCallback } from "react";
import { MessageSquare, FileUp } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { ProgressIndicator } from "../components/onboarding/ProgressIndicator";
import { VoiceInterviewChat } from "../components/onboarding/VoiceInterviewChat";
import { VoiceUpload } from "../components/onboarding/VoiceUpload";
import { VoiceDNAReview } from "../components/onboarding/VoiceDNAReview";
import { BrandDNAChat } from "../components/onboarding/BrandDNAChat";
import { BrandDnaUrlEnrichment } from "../components/onboarding/BrandDnaUrlEnrichment";
import type { VoiceDNA, VoiceDNAResponse } from "../utils/voiceDNAProcessor";
import { generateVoiceDNAFromInterview, generateVoiceDNAFromWritingSamples } from "../utils/voiceDNAProcessor";
import type { BrandDNAResponse } from "../utils/brandDNAProcessor";
import { fetchWithRetry } from "../lib/retry";
import { useMobile } from "../hooks/useMobile";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type Method = "interview" | "upload" | null;

const VOICE_STATUS_MESSAGES = [
  "Listening to how you speak...",
  "Mapping your sentence patterns...",
  "Identifying your signature phrases...",
  "Calibrating your voice layer...",
  "Building your Voice DNA profile...",
];
const BRAND_STATUS_MESSAGES = [
  "Reading your brand signals...",
  "Identifying your category position...",
  "Mapping your brand voice...",
  "Synthesizing your core promise...",
  "Finalizing your Brand DNA...",
];

export default function OnboardingPage() {
  const { user, session, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const isMobile = useMobile();

  const [step, setStep] = useState<Step>(0);
  const [method, setMethod] = useState<Method>(null);
  const [processing, setProcessing] = useState(false);
  const [voiceDNA, setVoiceDNA] = useState<VoiceDNA | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Profile step state
  const [profileName, setProfileName] = useState("");
  const [profileRole, setProfileRole] = useState("");
  const [profileAudience, setProfileAudience] = useState("");

  // Watch topics step state
  const [watchTopics, setWatchTopics] = useState<string[]>([]);
  const [watchInput, setWatchInput] = useState("");

  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayType, setOverlayType] = useState<"voice" | "brand">("voice");
  const [overlayComplete, setOverlayComplete] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const pendingBrandResultRef = useRef<BrandDNAResponse | null>(null);
  const [brandUrl, setBrandUrl] = useState("");
  const [brandUrlLoading, setBrandUrlLoading] = useState(false);
  const [brandUrlError, setBrandUrlError] = useState<string | null>(null);
  /** After URL analyze succeeds: review, optional enrichment, then save. */
  const [brandFromUrlDraft, setBrandFromUrlDraft] = useState<BrandDNAResponse | null>(null);

  useEffect(() => {
    if (!overlayVisible) return;
    const id = setInterval(() => setStatusIndex((i) => (i + 1) % 5), 2000);
    return () => clearInterval(id);
  }, [overlayVisible]);

  useEffect(() => {
    if (!overlayComplete) return;
    const id = setTimeout(() => {
      setOverlayVisible(false);
      setOverlayComplete(false);
      setStatusIndex(0);
      if (overlayType === "voice") {
        setStep(3);
        setProcessing(false);
      }
      if (overlayType === "brand" && pendingBrandResultRef.current) {
        const result = pendingBrandResultRef.current;
        pendingBrandResultRef.current = null;
        runBrandDnaSave(result);
      }
    }, 500);
    return () => clearTimeout(id);
  }, [overlayComplete, overlayType]);

  // Retrain param takes precedence: stay on onboarding and go to the right step. Otherwise resume from saved progress.
  useEffect(() => {
    if (!user) return;
    // Pre-fill profile name from auth metadata
    const authName = (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || "";
    if (authName && !profileName) setProfileName(authName);

    const retrain = searchParams.get("retrain");
    if (retrain) {
      if (retrain === "voice" || retrain === "1") {
        setStep(2);
        setMethod("interview");
      }
      if (retrain === "brand") setStep(4);
      if (retrain === "method") setStep(5);
      return;
    }
    supabase
      .from("profiles")
      .select("voice_dna_completed, brand_dna_completed, onboarding_complete, voice_dna, full_name, sentinel_topics")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        if (data.onboarding_complete) {
          window.location.href = "/studio/dashboard";
          return;
        }
        // Resume from the furthest completed step
        if (data.voice_dna_completed && data.voice_dna) {
          setVoiceDNA(data.voice_dna as VoiceDNA);
          if (data.brand_dna_completed) {
            // Voice + Brand done, resume at Watch topics (step 5)
            setStep(5);
          } else {
            // Voice done, show review (step 3) so user can continue to Brand
            setStep(3);
          }
        } else if (data.full_name) {
          // Profile saved, resume at method selection (step 1)
          setProfileName(data.full_name);
          setStep(1);
        }
        // else: start from step 0
      });
  }, [user, searchParams]);

  const goToDashboard = () => {
    window.location.href = "/studio/dashboard";
  };

  const handleProfileSave = async () => {
    if (!user || !profileName.trim()) return;
    setErrorMessage(null);
    try {
      await supabase.from("profiles").update({
        full_name: profileName.trim(),
      }).eq("id", user.id);
    } catch (e) {
      // Non-blocking: profile save failure shouldn't stop onboarding
    }
    setStep(1);
  };

  const handleWatchTopicsSave = async () => {
    if (!user) return;
    setErrorMessage(null);
    try {
      await supabase.from("profiles").update({
        sentinel_topics: watchTopics,
        onboarding_complete: true,
      }).eq("id", user.id);
      await refreshProfile();
    } catch (e) {
      // Try just marking complete
      try {
        await supabase.from("profiles").update({ onboarding_complete: true }).eq("id", user.id);
        await refreshProfile();
      } catch {}
    }
    setStep(6);
  };

  const handleSkipToComplete = async () => {
    if (!user) return;
    try {
      await supabase.from("profiles").update({ onboarding_complete: true }).eq("id", user.id);
      await refreshProfile();
    } catch {}
    setStep(6);
  };

  const handleMethodSelect = (value: Method) => {
    setMethod(value);
    setErrorMessage(null);
    setStep(2);
  };

  const handleInterviewComplete = async (payload: {
    interviewResponses: Record<string, string>;
  }) => {
    if (!user) return;
    setProcessing(true);
    setErrorMessage(null);
    setOverlayVisible(true);
    setOverlayType("voice");
    setOverlayComplete(false);
    setStatusIndex(0);
    try {
      let accessToken = session?.access_token ?? null;
      if (!accessToken) {
        const { data } = await supabase.auth.getSession();
        accessToken = data.session?.access_token ?? null;
      }
      if (!accessToken) {
        setOverlayVisible(false);
        setErrorMessage("Your session expired. Please sign in again, then continue Voice DNA.");
        setProcessing(false);
        return;
      }
      const fullName = (user.user_metadata?.full_name as string | undefined) || user.email || "the user";
      const result: VoiceDNAResponse = await generateVoiceDNAFromInterview({
        responses: payload.interviewResponses,
        userName: fullName,
        accessToken,
      });
      const finalVoiceDna: VoiceDNA = {
        ...result.voiceDna,
        method: "interview",
        interview_responses: payload.interviewResponses,
      };
      setVoiceDNA(finalVoiceDna);

      await supabase
        .from("profiles")
        .update({
          voice_dna: finalVoiceDna,
          voice_dna_md: result.markdown,
          voice_dna_completed: true,
          voice_dna_completed_at: new Date().toISOString(),
          voice_dna_method: "interview",
        })
        .eq("id", user.id);

      setOverlayComplete(true);
    } catch (err) {
      console.error("Voice DNA interview processing failed", err);
      setOverlayVisible(false);
      const fallback = "We could not analyze your responses. Please try again in a moment.";
      const msg = err instanceof Error ? err.message.trim() : "";
      setErrorMessage(msg && msg.length < 400 ? msg : fallback);
      setProcessing(false);
    }
  };

  const handleWritingSamplesAnalysis = async (payload: {
    combinedText: string;
    pdfAttachments?: { filename: string; base64: string }[];
  }) => {
    if (!user) return;
    setProcessing(true);
    setErrorMessage(null);
    setOverlayVisible(true);
    setOverlayType("voice");
    setOverlayComplete(false);
    setStatusIndex(0);
    try {
      let accessToken = session?.access_token ?? null;
      if (!accessToken) {
        const { data } = await supabase.auth.getSession();
        accessToken = data.session?.access_token ?? null;
      }
      if (!accessToken) {
        setOverlayVisible(false);
        setErrorMessage("Your session expired. Please sign in again, then continue Voice DNA.");
        setProcessing(false);
        return;
      }
      const fullName = (user.user_metadata?.full_name as string | undefined) || user.email || "the user";
      const result: VoiceDNAResponse = await generateVoiceDNAFromWritingSamples({
        combinedText: payload.combinedText,
        pdfAttachments: payload.pdfAttachments,
        userName: fullName,
        accessToken,
      });
      const finalVoiceDna: VoiceDNA = {
        ...result.voiceDna,
        method: "upload",
      };
      setVoiceDNA(finalVoiceDna);

      await supabase
        .from("profiles")
        .update({
          voice_dna: finalVoiceDna,
          voice_dna_md: result.markdown,
          voice_dna_completed: true,
          voice_dna_completed_at: new Date().toISOString(),
          voice_dna_method: "upload",
        })
        .eq("id", user.id);

      setOverlayComplete(true);
    } catch (err) {
      console.error("Voice DNA upload processing failed", err);
      setOverlayVisible(false);
      const fallback = "We could not analyze your writing samples. Please try again.";
      const msg = err instanceof Error ? err.message.trim() : "";
      setErrorMessage(msg && msg.length < 400 ? msg : fallback);
      setProcessing(false);
    }
  };

  const confirmVoiceDna = () => {
    setStep(4);
  };

  const runBrandDnaSave = async (result: BrandDNAResponse) => {
    if (!user) {
      setStep(5);
      return;
    }
    const fullUpdate = {
      brand_dna: result.brandDna,
      brand_dna_md: result.markdown,
      brand_dna_completed: true,
      brand_dna_completed_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("profiles")
      .update(fullUpdate)
      .eq("id", user.id);

    if (error) {
      // Try minimal save
      await supabase.from("profiles").update({
        brand_dna: result.brandDna,
        brand_dna_md: result.markdown,
      }).eq("id", user.id);
    }
    setStep(5); // Go to Watch Topics
  };

  const handleBrandDnaComplete = async (result: BrandDNAResponse) => {
    pendingBrandResultRef.current = result;
    setOverlayComplete(true);
  };

  const resolveAccessToken = useCallback(async () => {
    let t = session?.access_token ?? null;
    if (!t) {
      const { data } = await supabase.auth.getSession();
      t = data.session?.access_token ?? null;
    }
    return t;
  }, [session?.access_token]);

  const handleBrandUrlAnalyze = async () => {
    if (!brandUrl.trim() || !brandUrl.startsWith("http")) {
      setBrandUrlError("Enter a valid URL (must start with http or https).");
      return;
    }
    setBrandUrlError(null);
    setOverlayVisible(true);
    setOverlayType("brand");
    setOverlayComplete(false);
    setStatusIndex(0);
    setBrandUrlLoading(true);
    try {
      const res = await fetchWithRetry(`${API_BASE}/api/brand-dna-from-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: brandUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Could not analyze that URL.");
      }
      const result: BrandDNAResponse = {
        brandDna: data.brandDna ?? data.brand_dna ?? {},
        markdown: data.markdown ?? "",
      };
      setBrandFromUrlDraft(result);
      setOverlayVisible(false);
      setOverlayComplete(false);
      setBrandUrlLoading(false);
    } catch (err) {
      console.error("Brand DNA URL analysis failed", err);
      setOverlayVisible(false);
      setOverlayComplete(false);
      setStatusIndex(0);
      setBrandUrlLoading(false);
      setBrandUrlError(
        err instanceof Error ? err.message : "We could not analyze that site. Try a different URL."
      );
    }
  };

  const handleSkipBrandDna = async () => {
    setStep(5); // Go to Watch Topics instead of completing
  };

  const brandStepUserName =
    (user?.user_metadata?.full_name as string | undefined) || user?.email || "the user";

  const firstName =
    profileName.split(" ")[0] ||
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    (user?.email ? user.email.split("@")[0] : "there");

  const showStep0 = step === 0; // Profile
  const showStep1 = step === 1; // Voice method selection
  const showStep2Interview = step === 2 && method === "interview";
  const showStep2Upload = step === 2 && method === "upload";
  const showStep3 = step === 3 && voiceDNA; // Voice DNA review
  const showStep4 = step === 4; // Brand DNA (Reed conversation)
  const showStep5 = step === 5; // Watch topics
  const showStep6 = step === 6; // Complete

  return (
    <div
      style={{
        height: "100vh",
        background: "#07090f",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 20px 40px",
        overflow: "hidden",
        backgroundImage: "radial-gradient(ellipse at 30% 40%, rgba(74,144,217,0.04) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(200,169,110,0.03) 0%, transparent 45%)",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Afacad+Flux:wght@100..900&display=swap');
        body { background: #07090f; }
        @keyframes onboarding-progress-voice {
          from { width: 0%; }
          to { width: 95%; }
        }
        @keyframes onboarding-progress-brand {
          from { width: 0%; }
          to { width: 95%; }
        }
        .onboarding-progress-bar-voice {
          animation: onboarding-progress-voice 8s ease-in-out forwards;
        }
        .onboarding-progress-bar-brand {
          animation: onboarding-progress-brand 6s ease-in-out forwards;
        }
      `}</style>

      {overlayVisible && (
        <div
          role="dialog"
          aria-busy="true"
          aria-live="polite"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(7,9,15,0.45)",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            boxShadow: "0 8px 48px rgba(0,0,0,0.3), inset 0 0 20px rgba(255,255,255,0.03), inset -1px -1px 0.5px rgba(255,255,255,0.06), inset 1px 1px 0.5px rgba(255,255,255,0.04)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            opacity: overlayComplete ? 0 : 1,
            transition: "opacity 500ms ease-out",
            pointerEvents: overlayVisible ? "auto" : "none",
          }}
        >
          <div
            style={{
              background: "#F0EDE4",
              borderRadius: 16,
              padding: "40px 48px",
              maxWidth: 440,
              width: "100%",
              boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <span style={{ letterSpacing: "-1px", fontFamily: "'Afacad Flux', sans-serif", display: "inline-flex", alignItems: "baseline" }}>
                <span style={{ color: "#4A90D9", fontWeight: 700, fontSize: 14, lineHeight: 1, textTransform: "uppercase" }}>EVERYWHERE</span>
                <span style={{ color: "#0D1B2A", fontWeight: 300, fontSize: 14, lineHeight: 1 }}>Studio<span style={{ color: "#0D1B2A", fontSize: 7, verticalAlign: "top", marginLeft: 2 }}>™</span></span>
              </span>
            </div>
            <div
              style={{
                height: 3,
                background: "#F0EDE4",
                borderRadius: 2,
                overflow: "hidden",
                marginBottom: 24,
              }}
            >
              <div
                className={overlayType === "voice" ? "onboarding-progress-bar-voice" : "onboarding-progress-bar-brand"}
                style={{
                  height: "100%",
                  background: "#C8961A",
                  borderRadius: 2,
                  ...(overlayComplete ? { width: "100%", transition: "width 300ms ease-out" } : {}),
                }}
              />
            </div>
            <p
              style={{
                fontFamily: "'Afacad Flux', sans-serif",
                fontSize: 14,
                color: "rgba(0,0,0,0.65)",
                margin: "0 0 8px",
                textAlign: "center",
              }}
            >
              {overlayType === "voice" ? VOICE_STATUS_MESSAGES[statusIndex] : BRAND_STATUS_MESSAGES[statusIndex]}
            </p>
            <p
              style={{
                fontFamily: "'Afacad Flux', sans-serif",
                fontSize: 12,
                color: "rgba(0,0,0,0.4)",
                margin: 0,
                textAlign: "center",
              }}
            >
              This takes about 10–15 seconds
            </p>
          </div>
        </div>
      )}

      <div style={{ width: "100%", maxWidth: 640, marginBottom: 16 }}>
        <button
          onClick={() => {
            if (step === 0) {
              nav("/studio/dashboard");
            } else if (step === 2) {
              if (window.confirm("Going back will restart the voice capture. Continue?")) {
                setStep(1);
              }
            } else {
              setStep((prev) => Math.max(0, prev - 1) as Step);
            }
          }}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.45)",
            fontSize: 13,
            fontFamily: "'Afacad Flux', sans-serif",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: 0,
            transition: "color 0.15s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>&larr;</span> {step === 0 ? "Back to Studio" : "Back"}
        </button>
      </div>

      <ProgressIndicator currentStep={Math.min(step, 5)} totalSteps={5} />

      <main style={{ width: "100%", maxWidth: 640, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {errorMessage && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid rgba(220,38,38,0.6)",
              background: "rgba(220,38,38,0.12)",
              fontFamily: "'Afacad Flux', sans-serif",
              fontSize: 13,
              color: "#fee2e2",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span>{errorMessage}</span>
              {errorMessage.includes("save your progress") && (
                <button
                  type="button"
                  onClick={goToDashboard}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.4)",
                    background: "rgba(255,255,255,0.1)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Continue to studio anyway
                </button>
              )}
            </div>
          </div>
        )}
        {/* ── STEP 0: PROFILE ──────────────────────── */}
        {showStep0 && (
          <section style={{ minHeight: "60vh", display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 480 }}>
            <h1 style={{ fontFamily: "'Afacad Flux', sans-serif", fontSize: 32, fontWeight: 700, color: "#ffffff", margin: "0 0 8px" }}>
              Welcome to EVERYWHERE Studio
            </h1>
            <p style={{ fontFamily: "'Afacad Flux', sans-serif", fontSize: 16, color: "rgba(255,255,255,0.55)", marginBottom: 32, lineHeight: 1.6 }}>
              Let's set up your studio. This takes about 10 minutes.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontFamily: "'Afacad Flux', sans-serif", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Your name"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(8px) saturate(140%)", WebkitBackdropFilter: "blur(8px) saturate(140%)", color: "#fff", fontFamily: "'Afacad Flux', sans-serif", fontSize: 15, outline: "none" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "'Afacad Flux', sans-serif", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>
                  What do you do?
                </label>
                <input
                  type="text"
                  value={profileRole}
                  onChange={(e) => setProfileRole(e.target.value)}
                  placeholder="Executive coach, consultant, keynote speaker..."
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(8px) saturate(140%)", WebkitBackdropFilter: "blur(8px) saturate(140%)", color: "#fff", fontFamily: "'Afacad Flux', sans-serif", fontSize: 15, outline: "none" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "'Afacad Flux', sans-serif", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>
                  Who is your audience?
                </label>
                <input
                  type="text"
                  value={profileAudience}
                  onChange={(e) => setProfileAudience(e.target.value)}
                  placeholder="Senior leaders, entrepreneurs, HR executives..."
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(8px) saturate(140%)", WebkitBackdropFilter: "blur(8px) saturate(140%)", color: "#fff", fontFamily: "'Afacad Flux', sans-serif", fontSize: 15, outline: "none" }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleProfileSave}
              disabled={!profileName.trim()}
              style={{
                marginTop: 32,
                padding: "14px 32px",
                borderRadius: 8,
                border: profileName.trim() ? "1px solid rgba(245, 198, 66, 0.3)" : "none",
                background: profileName.trim() ? "rgba(245, 198, 66, 0.2)" : "rgba(255,255,255,0.1)",
                color: profileName.trim() ? "#F5C642" : "rgba(255,255,255,0.3)",
                backdropFilter: profileName.trim() ? "blur(12px)" : undefined,
                WebkitBackdropFilter: profileName.trim() ? "blur(12px)" : undefined,
                fontFamily: "'Afacad Flux', sans-serif",
                fontSize: 15,
                fontWeight: 700,
                cursor: profileName.trim() ? "pointer" : "default",
                alignSelf: "flex-start",
              }}
            >
              Continue
            </button>
          </section>
        )}

        {/* ── STEP 1: VOICE METHOD SELECTION ──────── */}
        {showStep1 && (
          <section
            style={{
              minHeight: "60vh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <h1
              style={{
                fontFamily: "'Afacad Flux', sans-serif",
                fontSize: 36,
                fontWeight: 600,
                color: "#ffffff",
                margin: 0,
              }}
            >
              Nice to meet you, {firstName}. Let us capture your voice.
            </h1>
            <p
              style={{
                marginTop: 12,
                fontFamily: "'Afacad Flux', sans-serif",
                fontSize: 16,
                fontStyle: "normal",
                color: "rgba(255,255,255,0.55)",
              }}
            >
              This works because you already know your voice. You just have not seen it written down yet.
            </p>

            <p
              style={{
                marginTop: 40,
                fontFamily: "'Afacad Flux', sans-serif",
                fontSize: 20,
                fontWeight: 600,
                color: "#ffffff",
              }}
            >
              How should we capture it?
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(0, 1fr))",
                gap: 16,
                marginTop: 24,
              }}
            >
              <button
                type="button"
                onClick={() => handleMethodSelect("interview")}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: "32px 24px",
                  textAlign: "center",
                  cursor: "pointer",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                <MessageSquare size={28} color="#C8961A" />
                <div
                  style={{
                    marginTop: 16,
                    fontFamily: "'Afacad Flux', sans-serif",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#ffffff",
                  }}
                >
                  Answer a few questions
                </div>
                <p
                  style={{
                    marginTop: 8,
                    fontFamily: "'Afacad Flux', sans-serif",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.55)",
                  }}
                >
                  Best if you do not have much writing to share. We will draw out your voice through conversation.
                </p>
                <p
                  style={{
                    marginTop: 12,
                    fontFamily: "'Afacad Flux', sans-serif",
                    fontSize: 12,
                    color: "#C8961A",
                  }}
                >
                  ~10 minutes
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleMethodSelect("upload")}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: "32px 24px",
                  textAlign: "center",
                  cursor: "pointer",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                <FileUp size={28} color="#C8961A" />
                <div
                  style={{
                    marginTop: 16,
                    fontFamily: "'Afacad Flux', sans-serif",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#ffffff",
                  }}
                >
                  Upload your writing
                </div>
                <p
                  style={{
                    marginTop: 8,
                    fontFamily: "'Afacad Flux', sans-serif",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.55)",
                  }}
                >
                  Best if you already write articles, posts, or documents. We will extract your voice from samples.
                </p>
                <p
                  style={{
                    marginTop: 12,
                    fontFamily: "'Afacad Flux', sans-serif",
                    fontSize: 12,
                    color: "#C8961A",
                  }}
                >
                  ~3 minutes
                </p>
              </button>
            </div>

            <p
              style={{
                marginTop: 32,
                fontFamily: "'Afacad Flux', sans-serif",
                fontSize: 14,
                color: "rgba(255,255,255,0.35)",
                textAlign: "center",
              }}
            >
              You can always do both later.
            </p>
          </section>
        )}

        {showStep2Interview && (
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <VoiceInterviewChat
              onComplete={({ interviewResponses }) => handleInterviewComplete({ interviewResponses })}
            />
          </div>
        )}

        {showStep2Upload && (
          <VoiceUpload onComplete={handleWritingSamplesAnalysis} />
        )}

        {showStep3 && voiceDNA && (
          <VoiceDNAReview
            data={voiceDNA}
            onConfirm={confirmVoiceDna}
            onRefine={() => {
              setStep(2);
            }}
            onUploadMore={() => {
              setMethod("upload");
              setStep(2);
            }}
          />
        )}

        {showStep4 && brandFromUrlDraft ? (
          <BrandDnaUrlEnrichment
            draft={brandFromUrlDraft}
            getAccessToken={resolveAccessToken}
            onBack={() => setBrandFromUrlDraft(null)}
            onComplete={async result => {
              await runBrandDnaSave(result);
              setBrandFromUrlDraft(null);
            }}
          />
        ) : null}

        {showStep4 && !brandFromUrlDraft ? (
          <section>
            <div
              style={{
                marginBottom: 20,
                padding: 16,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(7,9,15,0.45)",
                backdropFilter: "blur(20px) saturate(160%)",
                WebkitBackdropFilter: "blur(20px) saturate(160%)",
                boxShadow: "0 8px 48px rgba(0,0,0,0.3), inset 0 0 20px rgba(255,255,255,0.03), inset -1px -1px 0.5px rgba(255,255,255,0.06), inset 1px 1px 0.5px rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{
                  fontFamily: "'Afacad Flux', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.85)",
                  marginBottom: 8,
                }}
              >
                Preferred: paste your website URL
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="url"
                  value={brandUrl}
                  onChange={(e) => setBrandUrl(e.target.value)}
                  placeholder="https://example.com"
                  style={{
                    flex: 1,
                    minWidth: 220,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(7,9,15,0.9)",
                    backdropFilter: "blur(8px) saturate(140%)",
                    WebkitBackdropFilter: "blur(8px) saturate(140%)",
                    color: "#ffffff",
                    fontFamily: "'Afacad Flux', sans-serif",
                    fontSize: 13,
                  }}
                />
                <button
                  type="button"
                  onClick={handleBrandUrlAnalyze}
                  disabled={brandUrlLoading}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: brandUrlLoading ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.12)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    color: "#ffffff",
                    fontFamily: "'Afacad Flux', sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: brandUrlLoading ? "wait" : "pointer",
                  }}
                >
                  {brandUrlLoading ? "Analyzing…" : "Analyze site"}
                </button>
              </div>
              {brandUrlError && (
                <p
                  style={{
                    fontFamily: "'Afacad Flux', sans-serif",
                    fontSize: 12,
                    color: "#FCA5A5",
                    marginTop: 6,
                    marginBottom: 0,
                  }}
                >
                  {brandUrlError}
                </p>
              )}
            </div>

            <BrandDNAChat
              userName={brandStepUserName}
              onComplete={handleBrandDnaComplete}
              onAnalyzeStart={() => {
                setOverlayVisible(true);
                setOverlayType("brand");
                setOverlayComplete(false);
                setStatusIndex(0);
              }}
            />
            <div style={{ marginTop: 16, textAlign: "center" }}>
              <button
                type="button"
                onClick={handleSkipBrandDna}
                style={{
                  fontFamily: "'Afacad Flux', sans-serif",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.4)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Skip for now
              </button>
            </div>
          </section>
        ) : null}

        {/* ── STEP 5: WATCH TOPICS ──────────────────── */}
        {showStep5 && (
          <section style={{ minHeight: "50vh", display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 520 }}>
            <h2 style={{ fontFamily: "'Afacad Flux', sans-serif", fontSize: 28, fontWeight: 700, color: "#ffffff", margin: "0 0 8px" }}>
              What should Sentinel watch?
            </h2>
            <p style={{ fontFamily: "'Afacad Flux', sans-serif", fontSize: 15, color: "rgba(255,255,255,0.55)", marginBottom: 24, lineHeight: 1.6 }}>
              Add 3-8 topics for your daily intelligence briefing. These can be industries, trends, competitors, or areas of{"\u00A0"}expertise.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {watchTopics.map((topic, i) => (
                <span key={`${topic}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: "'Afacad Flux', sans-serif" }}>
                  {topic}
                  <button type="button" onClick={() => setWatchTopics(prev => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 16, lineHeight: 1 }}>x</button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                value={watchInput}
                onChange={(e) => setWatchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && watchInput.trim()) { e.preventDefault(); setWatchTopics(prev => [...prev, watchInput.trim()]); setWatchInput(""); } }}
                placeholder="Type a topic and press Enter"
                style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(8px) saturate(140%)", WebkitBackdropFilter: "blur(8px) saturate(140%)", color: "#fff", fontFamily: "'Afacad Flux', sans-serif", fontSize: 14, outline: "none" }}
              />
              <button type="button" onClick={() => { if (watchInput.trim()) { setWatchTopics(prev => [...prev, watchInput.trim()]); setWatchInput(""); } }} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "#fff", fontFamily: "'Afacad Flux', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Add
              </button>
            </div>
            {profileRole && watchTopics.length === 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>Suggested based on your role:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["thought leadership", "content strategy", "executive communication", "industry trends", "audience growth"].map(s => (
                    <button key={s} type="button" onClick={() => setWatchTopics(prev => [...prev, s])} style={{ padding: "5px 10px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer", fontFamily: "'Afacad Flux', sans-serif" }}>+ {s}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button
                type="button"
                onClick={handleWatchTopicsSave}
                disabled={watchTopics.length < 3}
                style={{
                  padding: "14px 32px",
                  borderRadius: 8,
                  border: watchTopics.length >= 3 ? "1px solid rgba(245, 198, 66, 0.3)" : "none",
                  background: watchTopics.length >= 3 ? "rgba(245, 198, 66, 0.2)" : "rgba(255,255,255,0.1)",
                  color: watchTopics.length >= 3 ? "#F5C642" : "rgba(255,255,255,0.3)",
                  backdropFilter: watchTopics.length >= 3 ? "blur(12px)" : undefined,
                  WebkitBackdropFilter: watchTopics.length >= 3 ? "blur(12px)" : undefined,
                  fontFamily: "'Afacad Flux', sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: watchTopics.length >= 3 ? "pointer" : "default",
                }}
              >
                Finish Setup
              </button>
              <button
                type="button"
                onClick={handleSkipToComplete}
                style={{ padding: "14px 20px", borderRadius: 8, border: "none", background: "transparent", color: "rgba(255,255,255,0.4)", fontFamily: "'Afacad Flux', sans-serif", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
              >
                Skip for now
              </button>
            </div>
          </section>
        )}

        {/* ── STEP 6: COMPLETE ──────────────────────── */}
        {showStep6 && (
          <section style={{ minHeight: "50vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(245,198,66,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 28 }}>&#10003;</span>
            </div>
            <h2 style={{ fontFamily: "'Afacad Flux', sans-serif", fontSize: 28, fontWeight: 700, color: "#ffffff", margin: "0 0 8px" }}>
              Your studio is ready
            </h2>
            <p style={{ fontFamily: "'Afacad Flux', sans-serif", fontSize: 15, color: "rgba(255,255,255,0.55)", marginBottom: 32, lineHeight: 1.6, maxWidth: 400 }}>
              Voice DNA captured. {watchTopics.length > 0 ? `Sentinel watching ${watchTopics.length} topics. ` : ""}You can refine everything in{"\u00A0"}Settings.
            </p>
            <button
              type="button"
              onClick={goToDashboard}
              style={{
                padding: "14px 40px",
                borderRadius: 8,
                border: "1px solid rgba(245, 198, 66, 0.3)",
                background: "rgba(245, 198, 66, 0.2)",
                color: "#F5C642",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                fontFamily: "'Afacad Flux', sans-serif",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
                transition: "opacity 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              Enter Your Studio
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

