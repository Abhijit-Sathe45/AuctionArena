import React, { useEffect, useState } from "react";

export default function AuctionStampOverlay({
  result, // 'SOLD' | 'UNSOLD'
  player,
  team,
  finalPrice,
  onClose,
  autoDismissTime = 6000,
}) {
  const [shaking, setShaking] = useState(true);

  useEffect(() => {
    // Screen impact vibration lasts 400ms
    const shakeTimer = setTimeout(() => setShaking(false), 450);

    // Auto dismiss after configured seconds
    let dismissTimer;
    if (autoDismissTime > 0) {
      dismissTimer = setTimeout(() => {
        if (typeof onClose === "function") onClose();
      }, autoDismissTime);
    }

    return () => {
      clearTimeout(shakeTimer);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [onClose, autoDismissTime]);

  if (!result) return null;

  const isSold = result === "SOLD";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
        shaking ? "animate-stamp-shake" : ""
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget && typeof onClose === "function") {
          onClose();
        }
      }}
    >
      <div className="relative max-w-lg w-full bg-turf-dark/95 border border-white/20 rounded-3xl p-6 sm:p-8 text-center shadow-2xl overflow-hidden">
        {/* Subtle radial background glow */}
        <div
          className={`absolute inset-0 pointer-events-none opacity-20 ${
            isSold
              ? "bg-[radial-gradient(circle_at_center,_#10b981_0%,_transparent_70%)]"
              : "bg-[radial-gradient(circle_at_center,_#ef4444_0%,_transparent_70%)]"
          }`}
        />

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center text-sm transition-colors z-20"
            title="Close"
          >
            ✕
          </button>
        )}

        {/* Player mini header */}
        {player && (
          <div className="mb-4 flex items-center justify-center gap-3">
            {player.photoUrl ? (
              <img
                src={player.photoUrl}
                alt=""
                className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xl">
                🏏
              </div>
            )}
            <div className="text-left">
              <p className="font-display text-xl text-ivory tracking-wide leading-tight">
                {player.name}
              </p>
              <p className="text-xs text-ivory/60">
                {player.playerType} {player.age ? `· Age ${player.age}` : ""}
              </p>
            </div>
          </div>
        )}

        {/* 3D Stamp Section */}
        <div className="py-4 my-2 flex items-center justify-center">
          {isSold ? (
            <div className="animate-stamp-sold select-none">
              <div className="stamp-sold-3d px-6 sm:px-10 py-3 sm:py-4 rounded-2xl inline-block">
                <span className="font-display text-5xl sm:text-7xl font-black tracking-widest block uppercase">
                  SOLD
                </span>
              </div>
            </div>
          ) : (
            <div className="animate-stamp-unsold select-none">
              <div className="stamp-unsold-3d px-6 sm:px-10 py-3 sm:py-4 rounded-2xl inline-block">
                <span className="font-display text-5xl sm:text-7xl font-black tracking-widest block uppercase">
                  UNSOLD
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Winning Details (SOLD) or Pass Notice (UNSOLD) */}
        {isSold && team && (
          <div className="mt-4 pt-4 border-t border-white/15 animate-fade-in space-y-2">
            <p className="text-xs text-ivory/60 uppercase tracking-wider font-medium">
              Acquired By
            </p>
            <div className="flex items-center justify-center gap-2.5">
              {team.teamLogoUrl ? (
                <img
                  src={team.teamLogoUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover border border-gold/40"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center text-xs">
                  🏆
                </div>
              )}
              <span className="font-display text-2xl text-gold font-semibold tracking-wide">
                {team.teamName}
              </span>
            </div>

            {finalPrice !== undefined && (
              <div className="inline-block bg-white/10 px-4 py-1.5 rounded-full border border-white/10 mt-1">
                <span className="text-xs text-ivory/80">Winning Bid: </span>
                <span className="text-sm font-bold text-emerald-400 font-display tracking-wide">
                  Rs. {Number(finalPrice).toLocaleString("en-IN")}
                </span>
              </div>
            )}
          </div>
        )}

        {!isSold && (
          <div className="mt-4 pt-4 border-t border-white/15 animate-fade-in space-y-1">
            <p className="text-sm text-red-400 font-semibold">
              No bids received
            </p>
            <p className="text-xs text-ivory/50">
              Player returned to pool for future rounds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
