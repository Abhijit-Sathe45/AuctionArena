import React, { useState, useEffect } from "react";
import {
  VOICE_PROFILES,
  getActiveProfileId,
  setActiveProfileId,
  getAvailableSystemVoices,
  testVoiceSample,
  stopCommentary,
  speak,
} from "../utils/commentaryService";
import { unlockAudio } from "../utils/sounds";

export default function VoiceSettingsModal({ isOpen, onClose }) {
  const [selectedId, setSelectedId] = useState(getActiveProfileId());
  const [playingId, setPlayingId] = useState(null);
  const [systemVoices, setSystemVoices] = useState([]);
  const [customVoiceUri, setCustomVoiceUri] = useState(
    () => localStorage.getItem("aiAuctioneer_customVoiceUri") || ""
  );
  const [rate, setRate] = useState(() => {
    const r = parseFloat(localStorage.getItem("aiAuctioneer_rate"));
    return !isNaN(r) ? r : 1.08;
  });
  const [pitch, setPitch] = useState(() => {
    const p = parseFloat(localStorage.getItem("aiAuctioneer_pitch"));
    return !isNaN(p) ? p : 1.05;
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [langFilter, setLangFilter] = useState("all");

  useEffect(() => {
    if (isOpen) {
      const activeId = getActiveProfileId();
      setSelectedId(activeId);
      const activeProf = VOICE_PROFILES.find((p) => p.id === activeId);
      if (activeProf?.langMode) {
        setLangFilter(activeProf.langMode);
      }
      const voices = getAvailableSystemVoices();
      setSystemVoices(voices);
    } else {
      stopCommentary();
      setPlayingId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredProfiles = VOICE_PROFILES.filter((p) => {
    if (langFilter === "all") return true;
    return p.langMode === langFilter;
  });

  function handlePlaySample(profileId) {
    unlockAudio();
    if (playingId === profileId) {
      stopCommentary();
      setPlayingId(null);
      return;
    }

    setPlayingId(profileId);
    testVoiceSample(profileId, () => {
      setPlayingId(null);
    });
  }

  function handleSelectProfile(profileId) {
    setSelectedId(profileId);
    setActiveProfileId(profileId);
    localStorage.removeItem("aiAuctioneer_customVoiceUri");
    setCustomVoiceUri("");
  }

  function handleSave() {
    setActiveProfileId(selectedId);
    if (customVoiceUri) {
      localStorage.setItem("aiAuctioneer_customVoiceUri", customVoiceUri);
    } else {
      localStorage.removeItem("aiAuctioneer_customVoiceUri");
    }
    localStorage.setItem("aiAuctioneer_rate", rate.toString());
    localStorage.setItem("aiAuctioneer_pitch", pitch.toString());
    stopCommentary();
    onClose();
  }

  function handleTestCustom() {
    unlockAudio();
    let phrase = "Welcome to the live auction! 25 thousand rupees by Royal Strikers. Sold!";
    if (customVoiceUri) {
      const v = systemVoices.find((vox) => vox.voiceURI === customVoiceUri || vox.name === customVoiceUri);
      if (v && (v.lang.toLowerCase().startsWith("hi") || v.name.toLowerCase().includes("hindi") || v.name.toLowerCase().includes("हिन्दी"))) {
        phrase = "लाइव नीलामी में आपका स्वागत है! 25 हज़ार रुपए रॉयल स्ट्राइकर्स की तरफ से... और ये खिलाड़ी बिक गए!";
      }
    } else {
      const p = VOICE_PROFILES.find((prof) => prof.id === selectedId);
      if (p?.langMode === "hi") {
        phrase = "लाइव नीलामी में आपका स्वागत है! 25 हज़ार रुपए रॉयल स्ट्राइकर्स की तरफ से... और ये खिलाड़ी बिक गए!";
      } else if (p?.langMode === "hinglish") {
        phrase = "Welcome to the live auction! 25 thousand rupaye by Royal Strikers... Aur ye player SOLD!";
      }
    }

    speak(phrase, {
      profileId: selectedId,
      customVoiceUri: customVoiceUri || undefined,
      rate,
      pitch,
      onEnd: () => setPlayingId(null),
    });
    setPlayingId("custom");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-mauve/30 rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col text-turf overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-mauve/20 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎙️</span>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold tracking-wide text-turf">
                Choose AI Auctioneer Voice
              </h2>
              <p className="text-xs text-mauve-dark font-medium">
                Select your preferred tone, language, and auctioneer style
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-sky/20 hover:bg-sky/40 text-turf flex items-center justify-center transition-colors font-bold"
          >
            ✕
          </button>
        </div>

        {/* Language Tabs */}
        <div className="px-4 sm:px-5 pt-3 pb-1 bg-[#FAF4FA] border-b border-mauve/20 flex items-center gap-1.5 overflow-x-auto scroll-touch">
          <span className="text-[11px] font-bold text-mauve-dark uppercase mr-1">Language:</span>
          <button
            type="button"
            onClick={() => setLangFilter("all")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              langFilter === "all"
                ? "bg-mint text-turf shadow-sm"
                : "bg-white text-mauve-dark hover:bg-sky/20"
            }`}
          >
            All ({VOICE_PROFILES.length})
          </button>
          <button
            type="button"
            onClick={() => setLangFilter("hinglish")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              langFilter === "hinglish"
                ? "bg-orchid-dark text-white shadow-sm"
                : "bg-white text-orchid-dark hover:bg-orchid/15"
            }`}
          >
            <span>⚡</span>
            <span>Hinglish (हिंग्लिश)</span>
          </button>
          <button
            type="button"
            onClick={() => setLangFilter("hi")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              langFilter === "hi"
                ? "bg-turf text-white shadow-sm"
                : "bg-white text-turf hover:bg-sky/20"
            }`}
          >
            <span>🇮🇳</span>
            <span>हिन्दी (Hindi)</span>
          </button>
          <button
            type="button"
            onClick={() => setLangFilter("en")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              langFilter === "en"
                ? "bg-sky-dark text-white shadow-sm"
                : "bg-white text-turf hover:bg-sky/20"
            }`}
          >
            <span>🌐</span>
            <span>English</span>
          </button>
        </div>

        {/* Voice Option Cards */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 scroll-touch bg-[#F7FAFE]">
          {filteredProfiles.map((profile, idx) => {
            const isSelected = selectedId === profile.id && !customVoiceUri;
            const isPlaying = playingId === profile.id;

            return (
              <div
                key={profile.id}
                onClick={() => handleSelectProfile(profile.id)}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 shadow-sm ${
                  isSelected
                    ? "bg-mint/20 border-mint shadow-md ring-2 ring-mint/40"
                    : "bg-white border-mauve/25 hover:bg-sky/15 hover:border-sky-dark"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="pt-0.5">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "border-mint bg-mint" : "border-mauve/50 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-turf" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-bold text-sm sm:text-base text-turf">
                        {idx + 1}. {profile.name}
                      </span>
                      {profile.badge && (
                        <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-mint/30 text-turf-dark border border-mint">
                          {profile.badge}
                        </span>
                      )}
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orchid/20 text-orchid-dark border border-orchid/30">
                        {profile.accent}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky/30 text-turf">
                        {profile.gender}
                      </span>
                    </div>
                    <p className="text-xs text-mauve-dark line-clamp-2 font-medium">
                      {profile.tagline}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlaySample(profile.id);
                  }}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all duration-150 active:scale-95 shadow-sm ${
                    isPlaying
                      ? "bg-rose hover:bg-rose-dark text-white animate-pulse"
                      : "bg-white hover:bg-sky/20 text-turf border border-mauve/30"
                  }`}
                >
                  <span>{isPlaying ? "⏹" : "▶"}</span>
                  <span>{isPlaying ? "Stop" : "Audition"}</span>
                </button>
              </div>
            );
          })}

          {/* Advanced Fine-Tuning Accordion */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-bold text-mint-dark hover:underline flex items-center gap-1 transition-colors"
            >
              <span>{showAdvanced ? "▼" : "▶"}</span>
              <span>Advanced Voice & Speed Controls</span>
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3.5 bg-white rounded-2xl border border-mauve/25 space-y-3.5 text-xs shadow-sm">
                {/* Speech Speed */}
                <div>
                  <div className="flex justify-between mb-1 text-turf font-semibold">
                    <span>Speed / Tempo:</span>
                    <span className="font-mono text-mint-dark font-black">{rate.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.4"
                    step="0.05"
                    value={rate}
                    onChange={(e) => setRate(parseFloat(e.target.value))}
                    className="w-full accent-mint h-1.5 bg-mauve/30 rounded cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-mauve-dark mt-0.5 font-medium">
                    <span>Slower (0.8x)</span>
                    <span>Normal (1.0x)</span>
                    <span>Fast Auction (1.4x)</span>
                  </div>
                </div>

                {/* Pitch */}
                <div>
                  <div className="flex justify-between mb-1 text-turf font-semibold">
                    <span>Tone / Pitch:</span>
                    <span className="font-mono text-mint-dark font-black">{pitch.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.7"
                    max="1.4"
                    step="0.05"
                    value={pitch}
                    onChange={(e) => setPitch(parseFloat(e.target.value))}
                    className="w-full accent-mint h-1.5 bg-mauve/30 rounded cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-mauve-dark mt-0.5 font-medium">
                    <span>Deep (0.7)</span>
                    <span>Medium (1.0)</span>
                    <span>High (1.4)</span>
                  </div>
                </div>

                {/* Direct Browser Voice List */}
                {systemVoices.length > 0 && (
                  <div>
                    <label className="block text-turf font-semibold mb-1">
                      Direct System Voice Override:
                    </label>
                    <select
                      value={customVoiceUri}
                      onChange={(e) => {
                        setCustomVoiceUri(e.target.value);
                      }}
                      className="w-full bg-white border border-mauve/35 rounded-xl p-2 text-turf text-xs focus:ring-1 focus:ring-mint font-medium"
                    >
                      <option value="">-- Use Curated Preset Above --</option>
                      {systemVoices.map((v) => (
                        <option key={v.voiceURI || v.name} value={v.voiceURI || v.name}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleTestCustom}
                    className="btn-secondary text-xs py-1.5 px-3 rounded-lg font-bold flex items-center gap-1"
                  >
                    <span>▶ Test Current Settings</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-mauve/20 bg-white flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-sky/20 hover:bg-sky/30 text-turf transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary text-xs sm:text-sm py-2 px-5 font-bold shadow-md shadow-mint/25"
          >
            Apply & Save Voice
          </button>
        </div>
      </div>
    </div>
  );
}
