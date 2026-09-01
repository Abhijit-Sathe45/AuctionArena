import React, { useState } from "react";
import { useToast } from "../context/ToastContext";

export default function StreamOverlayModal({ isOpen, onClose, slug, tournamentName }) {
  const { showToast } = useToast();

  const [mode, setMode] = useState("lowerthird"); // 'lowerthird' | 'sidebar' | 'topbar'
  const [bg, setBg] = useState("transparent"); // 'transparent' | 'green' | 'blue' | 'dark'
  const [theme, setTheme] = useState("mint"); // 'mint' | 'orchid' | 'rose' | 'sky'
  const [sound, setSound] = useState(false);
  const [ticker, setTicker] = useState(true);

  if (!isOpen) return null;

  // Build the live overlay URL with active query parameters
  const baseUrl = `${window.location.origin}/overlay/${slug}`;
  const params = new URLSearchParams();
  if (mode !== "lowerthird") params.set("mode", mode);
  if (bg !== "transparent") params.set("bg", bg);
  if (theme !== "mint") params.set("theme", theme);
  if (sound) params.set("sound", "1");
  if (!ticker) params.set("ticker", "0");

  const queryString = params.toString();
  const fullOverlayUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;

  const obsCustomCss = `body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }`;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, "success");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-mauve/30 rounded-3xl w-full max-w-2xl text-turf shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-mauve/20 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-mint to-mint-dark flex items-center justify-center text-turf-dark font-black text-xl shadow-sm">
              🎥
            </div>
            <div>
              <h2 className="font-display text-2xl text-turf tracking-wide leading-tight font-bold">
                OBS & Live Stream Overlay Studio
              </h2>
              <p className="text-xs text-mint-dark font-bold">
                Broadcast TV graphics for YouTube Live, Facebook Live, & vMix
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-mauve hover:text-turf p-2 rounded-xl hover:bg-sky/20 transition text-lg leading-none font-bold"
          >
            ✕
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 scroll-touch bg-[#F7FAFE]">
          {/* 1. Layout Mode Selector */}
          <div>
            <label className="block text-xs font-bold text-turf uppercase tracking-wider mb-2">
              1. Choose Broadcast Layout
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setMode("lowerthird")}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between shadow-sm ${
                  mode === "lowerthird"
                    ? "bg-mint/20 border-2 border-mint text-mint-dark font-bold ring-1 ring-mint/40"
                    : "bg-white border-mauve/25 text-turf hover:border-sky-dark"
                }`}
              >
                <div className="font-display text-lg tracking-wide">Lower Third</div>
                <div className="text-[11px] text-mauve-dark mt-1 font-medium">TV-style bottom bar (Streamer Favorite)</div>
              </button>

              <button
                type="button"
                onClick={() => setMode("sidebar")}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between shadow-sm ${
                  mode === "sidebar"
                    ? "bg-mint/20 border-2 border-mint text-mint-dark font-bold ring-1 ring-mint/40"
                    : "bg-white border-mauve/25 text-turf hover:border-sky-dark"
                }`}
              >
                <div className="font-display text-lg tracking-wide">Side Scorecard</div>
                <div className="text-[11px] text-mauve-dark mt-1 font-medium">Docked right panel for camera view</div>
              </button>

              <button
                type="button"
                onClick={() => setMode("topbar")}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between shadow-sm ${
                  mode === "topbar"
                    ? "bg-mint/20 border-2 border-mint text-mint-dark font-bold ring-1 ring-mint/40"
                    : "bg-white border-mauve/25 text-turf hover:border-sky-dark"
                }`}
              >
                <div className="font-display text-lg tracking-wide">Top Bar Strip</div>
                <div className="text-[11px] text-mauve-dark mt-1 font-medium">Compact header for wide video feeds</div>
              </button>
            </div>
          </div>

          {/* 2. Background Chroma Key / Transparency */}
          <div>
            <label className="block text-xs font-bold text-turf uppercase tracking-wider mb-2">
              2. Background Chroma / Transparency
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "transparent", label: "Transparent (Alpha)", desc: "Best for OBS Browser Source", icon: "✨" },
                { id: "green", label: "Green (#00FF00)", desc: "Chroma Key Filter", icon: "🟢" },
                { id: "blue", label: "Blue (#0000FF)", desc: "Chroma Key Filter", icon: "🔵" },
                { id: "dark", label: "Dark Studio", desc: "Solid Dark Background", icon: "⬛" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBg(opt.id)}
                  className={`p-2.5 rounded-2xl border text-left transition shadow-sm ${
                    bg === opt.id
                      ? "bg-mint/20 border-2 border-mint text-mint-dark font-bold ring-1 ring-mint/40"
                      : "bg-white border-mauve/25 text-turf hover:border-sky-dark"
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>{opt.icon}</span> {opt.label}
                  </div>
                  <div className="text-[10px] text-mauve-dark mt-0.5 font-medium">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Color Theme & Feature Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-turf uppercase tracking-wider mb-2">
                3. Color Theme Palette
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "mint", label: "Mint Neon", color: "bg-mint" },
                  { id: "orchid", label: "Orchid Pink", color: "bg-orchid" },
                  { id: "rose", label: "Rose Coral", color: "bg-rose" },
                  { id: "sky", label: "Sky Periwinkle", color: "bg-sky" },
                ].map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setTheme(th.id)}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition shadow-sm ${
                      theme === th.id
                        ? "bg-mint/20 border-2 border-mint text-turf font-bold"
                        : "bg-white border-mauve/25 text-turf hover:border-sky-dark"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${th.color} shadow-sm`}></span>
                    <span className="text-xs font-semibold">{th.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-turf uppercase tracking-wider mb-2">
                4. Broadcast FX Toggles
              </label>
              <div className="space-y-2">
                <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-mauve/25 cursor-pointer hover:bg-sky/15 transition shadow-sm">
                  <div className="text-xs">
                    <span className="font-bold text-turf block">Bottom Marquee Ticker</span>
                    <span className="text-[10px] text-mauve-dark font-medium">Shows recent sales & team purse ticker</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={ticker}
                    onChange={(e) => setTicker(e.target.checked)}
                    className="w-4 h-4 rounded text-mint accent-mint cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-mauve/25 cursor-pointer hover:bg-sky/15 transition shadow-sm">
                  <div className="text-xs">
                    <span className="font-bold text-turf block">Sound FX in OBS</span>
                    <span className="text-[10px] text-mauve-dark font-medium">Play bid gong & sold sounds in stream</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={sound}
                    onChange={(e) => setSound(e.target.checked)}
                    className="w-4 h-4 rounded text-mint accent-mint cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Generated URL Display Box */}
          <div className="bg-mint/10 rounded-2xl p-4 border border-mint/40 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-mint-dark flex items-center gap-1.5">
                <span>🔗</span> OBS Browser Source URL
              </span>
              <span className="text-[11px] text-mauve-dark font-medium">Resolution: 1920 × 1080</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={fullOverlayUrl}
                className="w-full bg-white border border-mauve/30 rounded-xl px-3.5 py-2 text-xs font-mono text-turf font-bold select-all focus:outline-none shadow-sm"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(fullOverlayUrl, "OBS URL")}
                className="btn-primary text-xs py-2 px-4 shrink-0 font-bold flex items-center gap-1.5 shadow"
              >
                📋 Copy Link
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => copyToClipboard(obsCustomCss, "OBS CSS snippet")}
                className="text-[11px] text-turf hover:text-mint-dark font-medium underline underline-offset-2 flex items-center gap-1"
              >
                📋 Copy OBS Browser CSS snippet
              </button>

              <a
                href={fullOverlayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-mint-dark hover:underline font-bold flex items-center gap-1"
              >
                👁️ Test in New Tab ↗
              </a>
            </div>
          </div>

          {/* Step-by-step Setup Guide */}
          <div className="bg-white rounded-2xl p-4 border border-mauve/25 space-y-2 shadow-sm">
            <div className="text-xs font-bold text-turf uppercase tracking-wider flex items-center gap-2">
              <span>🚀</span> 3-Step Setup in OBS Studio / vMix:
            </div>
            <ol className="text-xs text-mauve-dark space-y-1.5 list-decimal list-inside leading-relaxed font-medium">
              <li>
                In OBS Studio Sources, click <strong>+ (Add Source)</strong> ➡️ Select <strong>Browser</strong>.
              </li>
              <li>
                Paste your copied URL and set <strong>Width: 1920</strong> and <strong>Height: 1080</strong>.
              </li>
              <li>
                Check <em>"Shutdown source when not visible"</em> and <em>"Refresh browser when scene becomes active"</em>, then click <strong>OK</strong>.
              </li>
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-mauve/20 bg-white flex items-center justify-between">
          <span className="text-xs text-mauve-dark font-medium">
            Powered by AuctionArena Realtime Engine
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs px-5 py-2 font-bold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
