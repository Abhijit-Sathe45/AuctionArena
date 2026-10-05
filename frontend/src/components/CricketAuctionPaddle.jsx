import React from "react";
import TeamLogo from "./TeamLogo";

export default function CricketAuctionPaddle({
  team,
  index = 0,
  isHighestBidder = false,
  isPending = false,
  hasPassed = false,
  isTeamOnline = false,
  isPurseFinished = false,
  disabled = false,
  onClick,
}) {
  const paddleNumber = (index + 1).toString().padStart(2, "0");
  const purseFinished = Boolean(
    isPurseFinished ||
    (team?.purseRemaining !== undefined && team?.purseRemaining !== null && Number(team.purseRemaining) <= 0)
  );
  const isEffectiveDisabled = disabled || purseFinished;

  let tooltip = `Raise paddle to bid for ${team.teamName}`;
  if (purseFinished) {
    tooltip = `${team.teamName}'s bidding purse is finished (₹${(team.purseRemaining || 0).toLocaleString("en-IN")} left). Cannot place bid.`;
  } else if (isTeamOnline) {
    tooltip = `${team.teamName} owner is connected online and placing bids directly.`;
  } else if (isHighestBidder) {
    tooltip = `${team.teamName} is already the leading highest bidder.`;
  } else if (hasPassed) {
    tooltip = `${team.teamName} has passed on this player.`;
  }

  return (
    <div className="flex flex-col items-center select-none group my-0.5">
      {/* Round / Circular Red Bidding Paddle Disc */}
      <button
        type="button"
        onClick={purseFinished ? undefined : onClick}
        disabled={isEffectiveDisabled}
        title={tooltip}
        className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-2 flex flex-col items-center justify-between border-[2.5px] transition-all duration-200 shadow-lg overflow-hidden z-10 ${
          isEffectiveDisabled
            ? "cursor-not-allowed"
            : "cursor-pointer group-hover:-translate-y-1.5 group-hover:scale-105 group-hover:shadow-2xl active:scale-95"
        } ${
          isHighestBidder
            ? "bg-gradient-to-b from-[#10B981] via-[#059669] to-[#047857] border-[#F59E0B] ring-4 ring-amber-400/50 shadow-emerald-600/50"
            : purseFinished
            ? "bg-gradient-to-b from-slate-800 via-slate-900 to-black border-red-500/70 shadow-red-950/40 opacity-85"
            : isTeamOnline
            ? "bg-gradient-to-b from-[#2563EB] via-[#1D4ED8] to-[#1E40AF] border-[#93C5FD] opacity-95"
            : hasPassed
            ? "bg-gradient-to-b from-slate-600 to-slate-800 border-slate-500 opacity-60 grayscale-[50%]"
            : "bg-gradient-to-b from-[#EF4444] via-[#DC2626] to-[#991B1B] border-[#FECACA]/60 hover:border-amber-300"
        }`}
      >
        {/* Subtle Inner Gloss Sheen */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 rounded-t-full pointer-events-none"></div>

        {/* Purse Finished Prominent Overlay Message over paddle */}
        {purseFinished && !isHighestBidder && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-1.5 text-center pointer-events-none rounded-full border-2 border-red-500/80 shadow-inner">
            <span className="text-base sm:text-lg mb-0.5 filter drop-shadow">🚫</span>
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-600 text-white border border-red-300 shadow-md whitespace-nowrap leading-tight animate-pulse">
              PURSE FINISHED
            </span>
            <span className="text-[8px] font-bold text-red-200 mt-1">
              ₹{(team.purseRemaining || 0).toLocaleString("en-IN")} Left
            </span>
          </div>
        )}

        {/* Top: Paddle Number Badge & Remote / Status Tag */}
        <div className="flex items-center justify-center gap-1 w-full z-10 mt-0.5">
          <span className="text-[8px] sm:text-[9px] font-black uppercase px-2 py-0.2 rounded-full bg-slate-950/85 text-amber-300 border border-amber-400/40 shadow-xs tracking-wider">
            #{paddleNumber}
          </span>
          {purseFinished && (
            <span className="text-[7.5px] sm:text-[8px] font-extrabold px-1.5 py-0.2 rounded-full bg-red-900 text-white border border-red-400 flex items-center gap-0.5">
              <span>FINISHED</span>
            </span>
          )}
          {isTeamOnline && !purseFinished && (
            <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded-full bg-blue-900/90 text-white border border-blue-300/80 flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse"></span>
              <span>LIVE</span>
            </span>
          )}
          {hasPassed && !purseFinished && (
            <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded-full bg-slate-900 text-slate-300">
              PASS
            </span>
          )}
        </div>

        {/* Center: Team Logo / Avatar & Team Name */}
        <div className="flex flex-col items-center justify-center -my-0.5 z-10 w-full px-1">
          <TeamLogo
            src={team.teamLogoUrl}
            teamName={team.teamName}
            className="w-8 h-8 sm:w-9 sm:h-9"
          />
          <p className="font-display font-black text-[10px] sm:text-[11px] text-white uppercase truncate max-w-[92px] drop-shadow-sm mt-0.5 leading-tight text-center">
            {team.teamName}
          </p>
        </div>

        {/* Bottom: Purse Value / Highest Bidder Banner */}
        <div className="w-full z-10 mb-0.5 flex flex-col items-center">
          {isHighestBidder ? (
            <span className="text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-sm uppercase tracking-wider animate-pulse flex items-center gap-1">
              <span>👑</span>
              <span>LEADING</span>
            </span>
          ) : isPending ? (
            <span className="text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-full bg-white text-emerald-900 uppercase animate-bounce">
              ⚡ BIDDING…
            </span>
          ) : purseFinished ? (
            <div className="bg-red-950/90 border border-red-500/80 text-red-200 px-2 py-0.5 rounded-full shadow-inner flex items-center justify-center gap-1 max-w-[105px]">
              <span className="text-[8px]">🚫</span>
              <span className="font-scoreboard font-black text-[9px] sm:text-[10px] text-red-300 uppercase tracking-tight truncate">
                PURSE FINISHED
              </span>
            </div>
          ) : isTeamOnline ? (
            <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-200 border border-blue-400/40 truncate max-w-[95px]">
              📱 OWNER
            </span>
          ) : (
            <div className="bg-slate-950/80 border border-white/20 text-amber-300 px-2 py-0.2 rounded-full shadow-inner flex items-center justify-center gap-0.5 max-w-[98px]">
              <span className="text-[8px] text-amber-400/80 font-bold">₹</span>
              <span className="font-scoreboard font-black text-[11px] sm:text-xs text-amber-300 truncate">
                {team.purseRemaining?.toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>
      </button>

      {/* Realistic Wooden Paddle Handle Grip */}
      <div className={`w-4 sm:w-5 h-4 sm:h-5 -mt-1 bg-gradient-to-b from-amber-800 via-amber-900 to-amber-950 rounded-b-sm shadow-md border-x border-amber-950 flex flex-col justify-evenly items-center py-0.5 z-0 ${purseFinished ? "opacity-60 grayscale-[40%]" : ""}`}>
        <span className="w-2.5 sm:w-3 h-[1.5px] bg-amber-700/60 rounded-full"></span>
        <span className="w-2.5 sm:w-3 h-[1.5px] bg-amber-700/60 rounded-full"></span>
      </div>
    </div>
  );
}
