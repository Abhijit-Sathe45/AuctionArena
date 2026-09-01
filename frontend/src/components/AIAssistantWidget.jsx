import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { queryAIAssistant } from "../utils/aiAssistantEngine";

const INITIAL_MESSAGES = [
  {
    sender: "ai",
    text: `👋 **Hi! I'm your Auction Arena AI Copilot.**

I have complete knowledge of every module in the application. Ask me anything or tap a quick question below!`,
    suggestions: [
      "How to connect OBS Studio?",
      "How do team PINs work?",
      "How to start Round 2 Re-Auction?",
      "How to customize AI Voice & Timer?",
      "How to run live auction step by step?",
      "Draft WhatsApp invite message"
    ],
  },
];

export default function AIAssistantWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Do not render on OBS stream overlay views
  if (
    location.pathname.startsWith("/overlay") ||
    location.pathname.startsWith("/stream-overlay")
  ) {
    return null;
  }

  // Listen for sidebar toggle events
  useEffect(() => {
    function handleToggle() {
      setIsOpen((prev) => !prev);
    }
    function handleOpen() {
      setIsOpen(true);
    }
    window.addEventListener("toggle-ai-assistant", handleToggle);
    window.addEventListener("open-ai-assistant", handleOpen);
    return () => {
      window.removeEventListener("toggle-ai-assistant", handleToggle);
      window.removeEventListener("open-ai-assistant", handleOpen);
    };
  }, []);

  const isOrganizerPage = location.pathname.startsWith("/organizer");

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  function handleSend(textToSend) {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    // Add user message
    const userMsg = { sender: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // Simulate natural AI thinking delay (250ms)
    setTimeout(() => {
      const response = queryAIAssistant(text);
      const aiMsg = {
        sender: "ai",
        title: response.title,
        text: response.text,
        suggestions: response.suggestions,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 280);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleCopy(text, index) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  function handleClearChat() {
    setMessages(INITIAL_MESSAGES);
  }

  // Format simple markdown into bold and linebreaks
  function renderFormattedText(txt) {
    if (!txt) return null;
    const lines = txt.split("\n");
    return (
      <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
        {lines.map((line, idx) => {
          let trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1" />;

          // Heading 3
          if (trimmed.startsWith("### ")) {
            return (
              <h4 key={idx} className="font-bold text-sm text-turf pt-1.5 pb-0.5 border-b border-mauve/20">
                {trimmed.replace("### ", "")}
              </h4>
            );
          }
          // Heading 4
          if (trimmed.startsWith("#### ")) {
            return (
              <h5 key={idx} className="font-bold text-xs text-turf pt-1 text-mint-dark">
                {trimmed.replace("#### ", "")}
              </h5>
            );
          }
          // Code block indicator
          if (trimmed.startsWith("```")) {
            return null;
          }
          // Blockquote
          if (trimmed.startsWith("> ")) {
            return (
              <blockquote key={idx} className="border-l-2 border-mint pl-2 text-mauve-dark italic my-1 bg-mint/5 py-1 rounded-r">
                {trimmed.replace("> ", "")}
              </blockquote>
            );
          }
          // Bullet point
          if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1.5">
                <span className="text-mint-dark font-bold">•</span>
                <span>{renderInlineFormatting(trimmed.replace(/^[\*\-]\s+/, ""))}</span>
              </div>
            );
          }
          // Numbered item
          if (/^\d+\.\s/.test(trimmed)) {
            const num = trimmed.match(/^(\d+)\.\s/)[1];
            const content = trimmed.replace(/^\d+\.\s+/, "");
            return (
              <div key={idx} className="flex items-start gap-2 pl-1 my-1">
                <span className="w-5 h-5 rounded-full bg-sky/30 text-turf font-bold text-[11px] flex items-center justify-center shrink-0">
                  {num}
                </span>
                <span className="flex-1">{renderInlineFormatting(content)}</span>
              </div>
            );
          }

          return <p key={idx}>{renderInlineFormatting(trimmed)}</p>;
        })}
      </div>
    );
  }

  function renderInlineFormatting(str) {
    // Replace **bold** with <strong>
    const parts = str.split(/(\*\*.*?\*\*|\`.*?\`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-bold text-turf">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-sky/20 font-mono text-[11px] text-turf border border-sky/30">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  }

  return (
    <>
      {/* 1. Left Corner Round Floating AI Button */}
      <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className={`group relative flex items-center gap-2.5 p-3 sm:px-4 sm:py-3 rounded-full shadow-2xl transition-all duration-300 active:scale-95 border-2 ${
            isOpen
              ? "bg-turf-dark text-white border-mint ring-4 ring-mint/20 scale-105"
              : "bg-white text-turf border-mint/70 hover:border-mint hover:shadow-mint/25 hover:scale-105"
          }`}
          title="Auction Arena AI Assistant"
        >
          {/* Animated Glowing Ring Pulse */}
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-mint via-sky to-orchid opacity-40 blur-sm group-hover:opacity-75 animate-pulse transition duration-500 pointer-events-none" />

          {/* AI Robot / Sparkle Avatar */}
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-mint to-sky flex items-center justify-center text-lg sm:text-xl shadow-inner shrink-0">
            <span>🤖</span>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-mint rounded-full ring-2 ring-white animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-mint rounded-full ring-2 ring-white" />
          </div>

          {/* Text Label */}
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold text-turf flex items-center gap-1">
              <span>AI Assistant</span>
              <span className="text-[9px] bg-mint text-turf-dark px-1.5 py-0.2 rounded font-black">
                HELP
              </span>
            </span>
            <span className="text-[10px] text-mauve-dark font-medium leading-none">
              Always Online
            </span>
          </div>
        </button>
      </div>

      {/* 2. Floating AI Assistant Chat Window on the SAME LEFT SIDE */}
      {isOpen && (
        <div
          className={`fixed z-50 w-[92vw] max-w-[420px] h-[550px] max-h-[82vh] bg-white/95 backdrop-blur-xl rounded-3xl border-2 border-mint/40 shadow-2xl flex flex-col overflow-hidden animate-fade-in text-turf ${
            isOrganizerPage
              ? "bottom-20 md:bottom-10 left-4 sm:left-6 md:left-64"
              : "bottom-24 left-4 sm:left-6"
          }`}
          style={{ boxShadow: "0 20px 45px -10px rgba(34, 25, 41, 0.2), 0 0 25px rgba(44, 246, 179, 0.2)" }}
        >
          {/* Chat Window Header */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-sky/30 via-white to-mint/20 border-b border-mauve/20 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-mint to-sky flex items-center justify-center text-lg shadow-sm shrink-0">
                🤖
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-sm text-turf truncate flex items-center gap-1.5">
                  <span>Auction Arena AI Copilot</span>
                </h3>
                <p className="text-[10px] text-mauve-dark font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
                  <span>Instant Answers for All Features</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleClearChat}
                className="p-1.5 rounded-xl hover:bg-sky/20 text-mauve-dark hover:text-turf text-xs font-bold transition"
                title="Clear Conversation"
              >
                🗑️
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-xl hover:bg-rose/20 text-mauve-dark hover:text-rose flex items-center justify-center text-sm font-bold transition"
                title="Close Window"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Chat Messages Timeline */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 scroll-touch">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                {/* Message Bubble */}
                <div
                  className={`max-w-[88%] rounded-2xl p-3 sm:p-3.5 shadow-sm text-xs sm:text-sm ${
                    msg.sender === "user"
                      ? "bg-mint text-turf-dark rounded-br-xs font-semibold"
                      : "bg-gradient-to-b from-sky/15 to-white border border-sky/30 text-turf rounded-bl-xs"
                  }`}
                >
                  {msg.sender === "ai" ? (
                    <div className="space-y-2">
                      {msg.title && (
                        <div className="font-bold text-xs text-mint-dark flex items-center justify-between gap-2 border-b border-sky/25 pb-1">
                          <span>{msg.title}</span>
                          <button
                            onClick={() => handleCopy(msg.text, idx)}
                            className="text-[10px] bg-white px-2 py-0.5 rounded-md border border-mauve/25 hover:bg-sky/20 text-turf font-bold transition"
                          >
                            {copiedIndex === idx ? "✓ Copied" : "📋 Copy"}
                          </button>
                        </div>
                      )}
                      {renderFormattedText(msg.text)}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  )}
                </div>

                {/* AI Follow-up Suggestion Chips */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-2 pl-1 max-w-[92%]">
                    {msg.suggestions.map((chip, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => handleSend(chip)}
                        className="text-[10px] px-2.5 py-1 rounded-full bg-white hover:bg-mint/20 border border-mauve/30 text-turf font-bold transition active:scale-95 shadow-xs flex items-center gap-1"
                      >
                        <span>💡</span>
                        <span>{chip}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* AI Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-sky/15 border border-sky/30 w-24">
                <span className="w-2 h-2 rounded-full bg-mint animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-mint animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-mint animate-bounce [animation-delay:0.4s]" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 bg-white border-t border-mauve/20 shrink-0 space-y-2">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about OBS, PINs, Voice, Rules..."
                className="input-field text-xs sm:text-sm py-2 px-3 flex-1 rounded-xl"
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isTyping}
                className="btn-primary text-xs sm:text-sm p-2 sm:px-3.5 rounded-xl font-bold shadow-sm disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center"
              >
                <span>➤</span>
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-mauve font-medium px-1">
              <span>⚡ 100% Offline & Instant</span>
              <span>Auction Arena Co-Pilot</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
