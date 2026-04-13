import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { generateBrandDNAFromConversation } from "../../utils/brandDNAProcessor";
import type { BrandDNAResponse } from "../../utils/brandDNAProcessor";
import { fetchWithRetry } from "../../lib/retry";
import { ReedProfileIcon } from "../studio/ReedProfileIcon";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

const OPENING_QUESTION =
  "Before we do anything else, tell me a little about what you are building. Not the features or the deliverables. The thing underneath that. What does this exist to do in the world?";

const BRAND_DNA_REED_SYSTEM = `You are Reed conducting a Brand DNA extraction for EVERYWHERE Studio. Your role is to have a natural conversation that uncovers the user's brand: what they are building, who it is for, what they are against, and how they want to sound.

RULES:
- Ask ONE question per response. Never ask multiple questions at once.
- Listen first. Use their words when you reflect back.
- Draw out what they mean, not just what they say.
- After each answer, ask a follow-up that fills a gap or goes deeper. Pick from the question bank when relevant, or ask a natural follow-up.
- Signature phrases: "Tell me more about that.", "What do you mean by that?", "Help me understand..."

QUESTION BANK (use these when they fit; don't ask all of them):
- "What is the thing happening in your industry right now that most people accept that you think is wrong?"
- "Who is this actually for? Not the buyer persona. The specific person you were picturing when you decided this had to exist."
- "If your brand disappeared tomorrow, what would the people who love it miss most? Not the product. The feeling."
- "What do you never want to be confused with?"
- "If your brand had to write a sentence it would never say, what would it be?"
- "What does success look like 3 years from now, in a specific scene, not metrics?"

Continue for 8-12 exchanges. When you have enough to build a Brand DNA profile, keep asking until the user clicks "Build My Brand DNA". Do not output READY_TO_GENERATE.`;


interface BrandDNAChatProps {
  userName: string;
  onComplete: (result: BrandDNAResponse) => Promise<void> | void;
  onAnalyzeStart?: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function BrandDNAChat({ userName, onComplete, onAnalyzeStart }: BrandDNAChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "opening", role: "assistant", content: OPENING_QUESTION },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, building]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el || loading || building) return;
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" || messages.length <= 1) {
      requestAnimationFrame(() => el.focus());
    }
  }, [messages, loading, building]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || building) return;
    setInput("");
    const userMsg: ChatMessage = { id: "u-" + Date.now(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const chatHistory = [...messages, userMsg].map((m) => ({
        role: m.role === "assistant" ? "reed" : "user",
        content: m.content,
      }));
      const res = await fetchWithRetry(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatHistory,
          outputType: "freestyle",
          systemPromptOverride: BRAND_DNA_REED_SYSTEM,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to get reply");
      }
      const { reply } = await res.json();
      setMessages((prev) => [...prev, { id: "w-" + Date.now(), role: "assistant", content: reply || "" }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { id: "err-" + Date.now(), role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleBuildBrandDNA = async () => {
    const userCount = messages.filter((m) => m.role === "user").length;
    if (userCount < 4 || building) return;
    onAnalyzeStart?.();
    setBuilding(true);
    try {
      const responses = messages.map((m) => ({ role: m.role, content: m.content }));
      const result = await generateBrandDNAFromConversation({ responses, userName });
      await onComplete(result);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { id: "err-" + Date.now(), role: "assistant", content: "We could not build your Brand DNA. Please try again." },
      ]);
    } finally {
      setBuilding(false);
    }
  };

  const userCount = messages.filter((m) => m.role === "user").length;
  const canBuild = userCount >= 4 && !building && !loading;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", height: "calc(100vh - 140px)", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontFamily: "'Afacad Flux', sans-serif",
            fontSize: 13,
            color: "rgba(255,255,255,0.7)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Building your brand profile
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 4px 12px" }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 20,
            }}
          >
            {m.role === "assistant" ? (
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", maxWidth: 480 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    flexShrink: 0,
                    width: 32,
                    paddingTop: 2,
                  }}
                >
                  <ReedProfileIcon size={24} title="Reed" />
                </div>
                <div
                  style={{
                    fontFamily: "'Afacad Flux', sans-serif",
                    fontSize: 15,
                    color: "rgba(255,255,255,0.85)",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    minWidth: 0,
                  }}
                >
                  {m.content}
                </div>
              </div>
            ) : (
              <div
                style={{
                  maxWidth: 400,
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: "16px 16px 4px 16px",
                  padding: "12px 18px",
                  fontFamily: "'Afacad Flux', sans-serif",
                  fontSize: 15,
                  color: "rgba(255,255,255,0.85)",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          padding: "16px 0 0",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(7,9,15,0.95)",
        }}
      >
        {building ? (
          <div style={{ padding: "16px 0 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                border: "2px solid rgba(200,150,26,0.6)",
                borderTopColor: "transparent",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p style={{ fontFamily: "'Afacad Flux', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.7)", margin: 0 }}>
              Building your Brand DNA...
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            <div style={{ position: "relative" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    sendMessage();
                  }
                }}
                placeholder="Tell Reed what you're building..."
                rows={2}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  padding: "14px 48px 14px 18px",
                  color: "#ffffff",
                  fontFamily: "'Afacad Flux', sans-serif",
                  fontSize: 15,
                  resize: "none",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                style={{
                  position: "absolute",
                  right: 8,
                  bottom: 8,
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "none",
                  background: input.trim() && !loading ? "var(--gold)" : "rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: input.trim() && !loading ? "pointer" : "default",
                }}
              >
                <Send size={18} color={input.trim() && !loading ? "var(--bg)" : "rgba(255,255,255,0.4)"} />
              </button>
            </div>
            <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
              <button
                type="button"
                onClick={handleBuildBrandDNA}
                disabled={!canBuild}
                style={{
                  fontFamily: "'Afacad Flux', sans-serif",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  border: "none",
                  background: canBuild ? "rgba(200,150,26,0.2)" : "transparent",
                  color: canBuild ? "var(--gold)" : "rgba(255,255,255,0.3)",
                  cursor: canBuild ? "pointer" : "default",
                  padding: "8px 12px",
                  borderRadius: 8,
                }}
              >
                Build My Brand DNA
              </button>
            </div>
            {userCount < 4 && !loading && !building && (
              <div
                style={{
                  marginTop: 4,
                  fontFamily: "'Afacad Flux', sans-serif",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.35)",
                  textAlign: "right",
                }}
              >
                {4 - userCount} more exchange{4 - userCount === 1 ? "" : "s"} to unlock
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
