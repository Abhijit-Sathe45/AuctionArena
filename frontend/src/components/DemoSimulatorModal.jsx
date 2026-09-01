import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useToast } from "../context/ToastContext";

export default function DemoSimulatorModal({ isOpen, onClose, onDataChanged }) {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  if (!isOpen) return null;

  const handleSeedDemo = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/organizer-admin/demo/seed");
      showToast(data.message || "Demo tournament data created successfully!", "success");
      if (onDataChanged) onDataChanged();
      onClose();
      // Navigate to live auction so organizer can immediately practice
      navigate("/organizer/live-auction");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to seed demo data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleClearDemo = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/organizer-admin/demo/clear");
      showToast(data.message || "All demo records cleared.", "info");
      setShowConfirmClear(false);
      if (onDataChanged) onDataChanged();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to clear demo data", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white border border-mauve/30 rounded-3xl w-full max-w-xl text-turf shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-mauve/20 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-mint to-mint-dark flex items-center justify-center text-turf-dark font-black text-2xl shadow-sm">
              🎮
            </div>
            <div>
              <h2 className="font-display text-2xl text-turf tracking-wide leading-tight font-bold">
                Auction Practice Simulator
              </h2>
              <p className="text-xs text-mint-dark font-bold">
                Test bidding, timers, sound, OBS & commentary hands-free
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 bg-[#F7FAFE]">
          {/* Info Card */}
          <div className="bg-mint/10 rounded-2xl p-4 border border-mint/30 space-y-2">
            <div className="text-xs font-bold text-mint-dark uppercase tracking-wider flex items-center gap-1.5">
              <span>⚡</span> What does Practice Mode include?
            </div>
            <ul className="text-xs text-turf/90 space-y-1.5 list-disc list-inside leading-relaxed font-medium">
              <li>
                <strong>5 Demo Teams:</strong> Mumbai Smashers, Royal Super Kings, Deccan Dynamos, etc. with ₹5,00,000 purse and 4-digit PINs.
              </li>
              <li>
                <strong>3 Categories & 18 Players:</strong> Icon stars, All-rounders & Bowlers with base prices & avatars.
              </li>
              <li>
                <strong>🤖 AI Auto-Bidding Bots:</strong> Realistic bots place simulated bids during live auction so you can rehearse hands-free.
              </li>
            </ul>
          </div>

          {!showConfirmClear ? (
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleSeedDemo}
                disabled={loading}
                className="w-full btn-primary py-3.5 px-5 text-sm font-bold flex items-center justify-center gap-2 rounded-2xl shadow-lg hover:scale-[1.01] active:scale-[0.98] transition"
              >
                <span>{loading ? "⏳ Setting up Demo..." : "🚀 Load Demo Data & Start Practice Simulator"}</span>
              </button>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmClear(true)}
                  className="text-xs text-rose hover:text-rose-dark underline underline-offset-2 flex items-center gap-1 font-bold"
                >
                  <span>🗑️</span> Reset / Clear Demo Tournament Data
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary text-xs px-4 py-2 font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-rose/10 border border-rose/30 rounded-2xl space-y-3 animate-fade-in">
              <div className="text-xs font-bold text-rose uppercase tracking-wider flex items-center gap-1.5">
                <span>⚠️</span> Confirm Clear Tournament Data
              </div>
              <p className="text-xs text-mauve-dark leading-relaxed font-medium">
                This will delete all demo players, teams, categories, and auction logs to give you a clean slate for your real tournament.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmClear(false)}
                  className="btn-secondary text-xs px-3 py-1.5 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearDemo}
                  disabled={loading}
                  className="btn-danger text-xs px-4 py-1.5 font-bold"
                >
                  {loading ? "Clearing…" : "Yes, Clear All Data"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
