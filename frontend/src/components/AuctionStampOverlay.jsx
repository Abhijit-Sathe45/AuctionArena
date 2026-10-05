import React, { useEffect, useState } from "react";
import PlayerPhoto from "./PlayerPhoto";
import TeamLogo from "./TeamLogo";

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
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-opacity duration-300 ${
        shaking ? "animate-stamp-shake" : ""
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget && typeof onClose === "function") {
          onClose();
        }
      }}
    >
      <div className="relative max-w-lg w-full bg-turf-dark/95 border border-white/15 rounded-3xl p-6 sm:p-8 text-center shadow-2xl overflow-hidden">
        {/* Subtle radial background glow */}
        <div
          className={`absolute inset-0 pointer-events-none opacity-25 ${
            isSold
              ? "bg-[radial-gradient(circle_at_center,_#2CF6B3_0%,_transparent_70%)]"
              : "bg-[radial-gradient(circle_at_center,_#DE6C83_0%,_transparent_70%)]"
          }`}
        />

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-sky/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center text-sm transition-colors z-20"
            title="Close"
          >
            ✕
          </button>
        )}

        {/* Player mini header */}
        {player && (
          <div className="mb-4 flex items-center justify-center gap-3">
            <PlayerPhoto
              src={player.photoUrl}
              name={player.name}
              className="w-12 h-12 rounded-full border-2 border-sky/40"
            />
            <div className="text-left">
              <p className="font-display text-xl text-sky tracking-wide leading-tight">
                {player.name}
              </p>
              <p className="text-xs text-mauve">
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
            <p className="text-xs text-sky/70 uppercase tracking-wider font-medium">
              Acquired By
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <TeamLogo
                src={team.teamLogoUrl}
                teamName={team.teamName}
                className="w-8 h-8 rounded-full"
              />
              <span className="font-display text-2xl text-mint font-semibold tracking-wide">
                {team.teamName}
              </span>
            </div>

            {finalPrice !== undefined && (
              <div className="inline-block bg-white/10 px-4 py-1.5 rounded-full border border-white/10 mt-1">
                <span className="text-xs text-sky/80">Winning Bid: </span>
                <span className="text-sm font-bold text-mint font-display tracking-wide">
                  Rs. {Number(finalPrice).toLocaleString("en-IN")}
                </span>
              </div>
            )}
          </div>
        )}

        {!isSold && (
          <div className="mt-4 pt-4 border-t border-white/15 animate-fade-in space-y-1">
            <p className="text-sm text-rose font-semibold">
              No bids received
            </p>
            <p className="text-xs text-mauve">
              Player returned to pool for future rounds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
