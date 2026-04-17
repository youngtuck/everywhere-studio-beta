import { useEffect, useRef, useState } from "react";
import { Mic, Send } from "lucide-react";
import type { VoiceDNA } from "../../utils/voiceDNAProcessor";
import { useVoiceInput } from "../../hooks/useVoiceInput";
import { ReedProfileIcon } from "../studio/ReedProfileIcon";

interface QA {
  id: string;
  role: "system" | "user";
  content: string;
}

interface VoiceInterviewChatProps {
  onComplete: (result: {
    voiceDna: VoiceDNA;
    markdown: string;
    interviewResponses: Record<string, string>;
  }) => Promise<void> | void;
  onCancel?: () => void;
}

const INITIAL_PROMPT =
  "I am going to ask you a few questions to understand how you communicate. Not what you say, how you say it. Most people do not know what they sound like, but you know more than you think. Type anything to get started.";

const QUESTION_SEQUENCE: string[] = [
  "First thing: when people describe you, do they see you as more formal or more casual? Do you agree with them?",
  "When you are at your best in a conversation, how would you describe your energy?",
  "When you write something you are proud of, do the sentences tend to be short and punchy, long and flowing, or a mix?",
  "Do you tend to start with the point and then support it, or build up a story and arrive at the point?",
  "Are there words or phrases you find yourself using again and again? Things people associate with you?",
  "Are there words or phrases you hate? Things that make you cringe when AI writes them?",
  "How does humor show up in your communication, if it does at all?",
  "What do you believe about your field that most people get wrong?",
  "When you write or speak, who are you really talking to? Not the broadest audience, the specific person you imagine reading it?",
  "When you disagree with someone, how do you typically handle it in writing?",
  "If you were writing a LinkedIn post right now, how would you start it? Give me the first line.",
  "Last one. Read this sentence in your head: \"Innovation requires us to leverage synergies across our ecosystem.\" How does it make you feel, and why?",
];

function validateResponse(text: string): boolean {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);

  // Must have at least 2 words
  if (words.length < 2) return false;

  // Check word-to-character ratio (random strings have very long "words")
  const avgWordLen = trimmed.replace(/\s+/g, "").length / words.length;
  if (avgWordLen > 12) return false;

  // Check consonant density: real English has ~40-60% consonants
  const letters = trimmed.replace(/[^a-zA-Z]/g, "");
  if (letters.length > 0) {
    const vowels = letters.replace(/[^aeiouAEIOU]/g, "").length;
    const vowelRatio = vowels / letters.length;
    if (vowelRatio < 0.2) return false;
  }

  // Reject if the same character repeats 4+ times in a row (keyboard mashing)
  if (/(.)\1{3,}/i.test(trimmed)) return false;

  // Reject if more than 40% of characters are non-alphanumeric/space (random symbols)
  const alphaNum = trimmed.replace(/[^a-zA-Z0-9\s]/g, "").length;
  if (alphaNum / trimmed.length < 0.6) return false;

  // Require at least 2 unique words (not just "yes yes yes yes yes")
  const unique = new Set(words.map(w => w.toLowerCase()));
  if (unique.size < 2) return false;

  return true;
}

export function VoiceInterviewChat({ onComplete, onCancel }: VoiceInterviewChatProps) {
  const [messages, setMessages] = useState<QA[]>([
    { id: "sys-0", role: "system", content: INITIAL_PROMPT },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationWarning, setValidationWarning] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const questionIndexRef = useRef(0);

  const { isListening, isSupported: voiceSupported, toggleListening } = useVoiceInput((transcript) => {
    setInput(transcript);
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus textarea on mount and after every AI (system) message so typing lands in the field
  useEffect(() => {
    const el = inputRef.current;
    if (!el || loading) return;
    const last = messages[messages.length - 1];
    const justAddedAiMessage = last?.role === "system";
    if (messages.length <= 1 || justAddedAiMessage) {
      const t = requestAnimationFrame(() => {
        el.focus();
      });
      return () => cancelAnimationFrame(t);
    }
  }, [messages, loading]);

  const handleAnalyzeNow = async () => {
    const interviewResponses: Record<string, string> = {};
    let idx = 1;
    for (const m of messages) {
      if (m.role === "user") {
        interviewResponses[`answer_${idx}`] = m.content;
        idx += 1;
      }
    }
    setLoading(true);
    try {
      await onComplete({
        voiceDna: {
          voice_fidelity: 0,
          voice_layer: 0,
          value_layer: 0,
          personality_layer: 0,
          traits: {
            vocabulary_and_syntax: 0,
            tonal_register: 0,
            rhythm_and_cadence: 0,
            metaphor_patterns: 0,
            structural_habits: 0,
          },
          voice_description: "",
          value_description: "",
          personality_description: "",
          contraction_frequency: "",
          sentence_length_avg: "",
          signature_phrases: [],
          prohibited_words: [],
          emotional_register: "",
          has_dual_mode: false,
          method: "interview",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          interview_responses: interviewResponses,
        },
        markdown: "",
        interviewResponses,
      });
    } finally {
      setLoading(false);
    }
  };

  const askNextQuestion = () => {
    const idx = questionIndexRef.current;
    if (idx >= QUESTION_SEQUENCE.length) {
      handleAnalyzeNow();
      return;
    }
    const next = QUESTION_SEQUENCE[idx];
    questionIndexRef.current = idx + 1;
    setMessages(prev => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        role: "system",
        content: next,
      },
    ]);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Skip validation for the first response (warm-up "Ready?" question)
    const isFirstResponse = messages.length === 1 && messages[0].id === "sys-0";
    if (!isFirstResponse && !validateResponse(text)) {
      setValidationWarning(true);
      return;
    }

    setValidationWarning(false);
    setInput("");
    const userMsg: QA = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);

    // After each answer, ask the next question from the scripted interview.
    setTimeout(() => {
      askNextQuestion();
    }, 350);
  };

  const containerStyle = {
    maxWidth: 640,
    margin: "0 auto",
    minHeight: "calc(100vh - 140px)",
    display: "flex",
    flexDirection: "column" as const,
  };

  return (
    <div style={containerStyle}>
      <div
        style={{
          marginBottom: 18,
        }}
      >
        <div style={{ fontFamily: "'Afacad Flux', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Building your voice profile
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 4px 12px",
        }}
      >
        {messages.map(m => {
          if (m.role === "system") {
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  marginBottom: 20,
                }}
              >
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
                    maxWidth: 480,
                    fontFamily: "'Afacad Flux', sans-serif",
                    fontSize: 15,
                    color: "rgba(255,255,255,0.85)",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap" as const,
                  }}
                >
                  {m.content}
                </div>
              </div>
            );
          }
          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  maxWidth: 400,
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: "16px 16px 4px 16px",
                  padding: "12px 18px",
                  fontFamily: "'Afacad Flux', sans-serif",
                  fontSize: 15,
                  color: "#ffffff",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          padding: "16px 0 0",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(7,9,15,0.95)",
          backdropFilter: "blur(12px)",
        }}
      >
        {loading ? (
          <div
            style={{
              padding: "16px 0 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
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
            <p
              style={{
                fontFamily: "'Afacad Flux', sans-serif",
                fontSize: 13,
                color: "rgba(255,255,255,0.7)",
                margin: 0,
              }}
            >
              Analyzing your voice patterns...
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            <div style={{ position: "relative" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); if (validationWarning) setValidationWarning(false); }}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSend();
                  }
                }}
                placeholder={isListening ? "Listening..." : "Write how you would actually respond. Short or long is fine."}
                rows={2}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  padding: voiceSupported ? "14px 88px 14px 18px" : "14px 48px 14px 18px",
                  color: "#ffffff",
                  fontFamily: "'Afacad Flux', sans-serif",
                  fontSize: 15,
                  resize: "none",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}>
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: "none",
                      background: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      animation: isListening ? "micPulse 1s ease-in-out infinite" : "none",
                    }}
                  >
                    <Mic
                      size={18}
                      color={isListening ? "#D64545" : "rgba(255,255,255,0.35)"}
                    />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "none",
                    background: input.trim() && !loading ? "#C8961A" : "rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: input.trim() && !loading ? "pointer" : "default",
                    transition: "background 0.15s ease",
                  }}
                >
                  <Send
                    size={18}
                    color={input.trim() && !loading ? "#07090f" : "rgba(255,255,255,0.4)"}
                  />
                </button>
              </div>
              <style>{`@keyframes micPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }`}</style>
            </div>
            {validationWarning && (
              <p style={{
                margin: "8px 0 0",
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(200,150,26,0.1)",
                border: "1px solid rgba(200,150,26,0.25)",
                fontFamily: "'Afacad Flux', sans-serif",
                fontSize: 13,
                color: "rgba(255,255,255,0.7)",
                lineHeight: 1.4,
              }}>
                Could you say a bit more? Even a sentence or two helps Reed understand your voice.
              </p>
            )}
            <div
              style={{
                marginTop: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={handleAnalyzeNow}
                disabled={messages.filter(m => m.role === "user").length < 2 || loading}
                style={{
                  fontFamily: "'Afacad Flux', sans-serif",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  border: "none",
                  background: "none",
                  color:
                    messages.filter(m => m.role === "user").length >= 2 && !loading
                      ? "rgba(255,255,255,0.7)"
                      : "rgba(255,255,255,0.3)",
                  cursor:
                    messages.filter(m => m.role === "user").length >= 2 && !loading
                      ? "pointer"
                      : "default",
                }}
              >
                Analyze responses
              </button>
            </div>
            {messages.filter(m => m.role === "user").length < 2 && !loading && (
              <div
                style={{
                  marginTop: 4,
                  fontFamily: "'Afacad Flux', sans-serif",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.35)",
                  textAlign: "right",
                }}
              >
                Answer{" "}
                {2 - messages.filter(m => m.role === "user").length}
                {" "}more question
                {2 - messages.filter(m => m.role === "user").length === 1 ? "" : "s"}
                {" "}to continue
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

