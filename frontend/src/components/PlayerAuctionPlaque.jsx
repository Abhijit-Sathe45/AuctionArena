import React from "react";

export default function PlayerAuctionPlaque({
  name = "Player Name",
  lotNumber = "01",
  role = "",
  league = "IPL",
  variant = "hero", // 'hero' | 'standard' | 'compact'
  className = "",
}) {
  const formattedLot = (lotNumber || "1").toString().padStart(3, "0");
  const isCompact = variant === "compact";

  if (isCompact) {
    return (
      <div className={`relative flex items-center select-none w-full my-0.5 ${className}`}>
        {/* Scalloped Red Wood Backing Layer */}
        <div className="absolute inset-0 -my-0.5 flex items-center justify-around pointer-events-none z-0 px-2">
          <span className="w-5 h-5 rounded-full bg-gradient-to-b from-[#A51D1D] to-[#580B0B] border border-[#3E0606] shadow-xs"></span>
          <span className="w-7 h-7 rounded-full bg-gradient-to-b from-[#A51D1D] to-[#580B0B] border border-[#3E0606] shadow-xs"></span>
          <span className="w-8 h-8 rounded-full bg-gradient-to-b from-[#A51D1D] to-[#580B0B] border border-[#3E0606] shadow-xs"></span>
          <span className="w-7 h-7 rounded-full bg-gradient-to-b from-[#A51D1D] to-[#580B0B] border border-[#3E0606] shadow-xs"></span>
          <span className="w-5 h-5 rounded-full bg-gradient-to-b from-[#A51D1D] to-[#580B0B] border border-[#3E0606] shadow-xs"></span>
        </div>

        {/* Front Wooden Plaque Bar */}
        <div className="relative z-10 w-full rounded-full bg-gradient-to-b from-[#F5C26B] via-[#E8A546] to-[#CF8120] border-[1.5px] border-[#5E2606] px-2.5 py-1.5 shadow-sm flex items-center justify-between gap-1.5 overflow-hidden">
          {/* Subtle Wood Grain Overlay */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent, transparent 30px, rgba(0,0,0,0.15) 35px, transparent 40px)",
            }}
          ></div>

          {/* Left Lot # */}
          <div className="flex items-center gap-0.5 shrink-0 z-10">
            <span
              className="text-[10px] font-black text-[#261406] tracking-tight font-scoreboard"
              style={{ textShadow: "0 1px 0 rgba(255,255,255,0.4), 0 -1px 0 rgba(0,0,0,0.6)" }}
            >
              {formattedLot}
            </span>
          </div>

          {/* Center Engraved Name */}
          <div className="truncate text-center flex-1 px-1 z-10">
            <span
              className="font-display text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#1F1206] block truncate"
              style={{
                textShadow:
                  "0 1px 0 rgba(255,255,255,0.45), 0 -1px 0 rgba(0,0,0,0.85), 1px 0 0 rgba(0,0,0,0.5)",
              }}
            >
              {name}
            </span>
          </div>

          {/* Right Role / League */}
          <div className="shrink-0 flex items-center gap-1 z-10">
            {role && (
              <span className="text-[8px] font-extrabold uppercase px-1 py-0.2 rounded bg-[#4A1E06]/85 text-amber-200 border border-amber-500/40">
                {role}
              </span>
            )}
            <span className="text-[10px]" title="Cricket Auction">🏏</span>
          </div>
        </div>
      </div>
    );
  }

  // Hero / Presentation Plaque (Scaled for clean proportions inside player card)
  return (
    <div className={`relative flex flex-col items-center select-none w-full max-w-sm sm:max-w-md mx-auto py-1.5 sm:py-2.5 ${className}`}>
      {/* 1. Scalloped Rich Cherry/Mahogany Wood Backing Arches */}
      <div className="absolute top-0.5 sm:top-1 w-full max-w-[92%] flex items-center justify-between pointer-events-none z-0 px-2 sm:px-3">
        <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-[#A51D1D] via-[#7B1010] to-[#450707] border border-[#330505] shadow-sm -translate-y-1.5"></span>
        <span className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-[#A51D1D] via-[#7B1010] to-[#450707] border border-[#330505] shadow-sm -translate-y-2"></span>
        <span className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gradient-to-b from-[#A51D1D] via-[#7B1010] to-[#450707] border border-[#330505] shadow-md -translate-y-2.5"></span>
        <span className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-[#A51D1D] via-[#7B1010] to-[#450707] border border-[#330505] shadow-sm -translate-y-2"></span>
        <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-[#A51D1D] via-[#7B1010] to-[#450707] border border-[#330505] shadow-sm -translate-y-1.5"></span>
      </div>

      {/* Bottom Scallops */}
      <div className="absolute bottom-3 sm:bottom-4 w-full max-w-[90%] flex items-center justify-between pointer-events-none z-0 px-3 sm:px-4">
        <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-t from-[#A51D1D] to-[#450707] border border-[#330505] shadow-2xs translate-y-0.5"></span>
        <span className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-t from-[#A51D1D] to-[#450707] border border-[#330505] shadow-2xs translate-y-1"></span>
        <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-t from-[#A51D1D] to-[#450707] border border-[#330505] shadow-2xs translate-y-1"></span>
        <span className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-t from-[#A51D1D] to-[#450707] border border-[#330505] shadow-2xs translate-y-1"></span>
        <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-t from-[#A51D1D] to-[#450707] border border-[#330505] shadow-2xs translate-y-0.5"></span>
      </div>

      {/* 2. Main Golden Teak Wood Plaque Bar */}
      <div className="relative z-10 w-full rounded-full bg-gradient-to-b from-[#FAD282] via-[#E8A546] to-[#C97B1A] border-2 border-[#5E2606] px-3 sm:px-4 py-1.5 sm:py-2 shadow-lg flex items-center justify-between gap-1.5 overflow-hidden">
        {/* Subtle Horizontal Wood Texture Grain */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 35px, rgba(0,0,0,0.12) 40px, transparent 45px)",
          }}
        ></div>
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-white/40 pointer-events-none"></div>

        {/* Left Side: Sunburst Rays & Lot # */}
        <div className="flex items-center gap-1 shrink-0 z-10">
          <div className="flex flex-col gap-0.5 opacity-80">
            <span className="w-2 sm:w-2.5 h-[1.5px] bg-[#3B1703] rounded-full rotate-[-25deg]"></span>
            <span className="w-2.5 sm:w-3 h-[1.5px] bg-[#3B1703] rounded-full"></span>
            <span className="w-2 sm:w-2.5 h-[1.5px] bg-[#3B1703] rounded-full rotate-[25deg]"></span>
          </div>
          <span
            className="font-scoreboard text-xs sm:text-base font-black text-[#1F1004] tracking-tight"
            style={{
              textShadow:
                "0 1px 0 rgba(255,255,255,0.45), 0 -1px 0 rgba(0,0,0,0.8), 1px 0 0 rgba(0,0,0,0.5)",
            }}
          >
            {formattedLot}
          </span>
        </div>

        {/* Center: Laser Engraved 3D Player Name */}
        <div className="flex-1 px-1 text-center z-10 min-w-0">
          <h2
            className="font-display text-xs sm:text-sm md:text-base font-black uppercase tracking-wider text-[#1A0E04] truncate leading-tight"
            style={{
              textShadow:
                "0 1px 1px rgba(255,255,255,0.5), 0 -1px 1px rgba(0,0,0,0.85), 1px 1px 0 rgba(0,0,0,0.6), -1px -1px 0 rgba(255,255,255,0.2)",
            }}
          >
            {name}
          </h2>
        </div>

        {/* Right Side: Cricket Logo & Sunburst Rays */}
        <div className="flex items-center gap-1 shrink-0 z-10">
          <div className="flex items-center gap-0.5 text-[#1A0E04]">
            <span className="text-xs sm:text-sm">🏏</span>
            <span
              className="font-display font-black text-[10px] sm:text-xs tracking-tighter"
              style={{
                textShadow: "0 1px 0 rgba(255,255,255,0.45), 0 -1px 0 rgba(0,0,0,0.8)",
              }}
            >
              {league || "IPL"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 opacity-80">
            <span className="w-2 sm:w-2.5 h-[1.5px] bg-[#3B1703] rounded-full rotate-[25deg]"></span>
            <span className="w-2.5 sm:w-3 h-[1.5px] bg-[#3B1703] rounded-full"></span>
            <span className="w-2 sm:w-2.5 h-[1.5px] bg-[#3B1703] rounded-full rotate-[-25deg]"></span>
          </div>
        </div>
      </div>

      {/* 3. Transparent Acrylic Stand Legs with Glass Reflections */}
      <div className="relative w-full max-w-[70%] flex items-center justify-between -mt-1.5 z-20 pointer-events-none px-6 sm:px-10">
        <div className="flex flex-col items-center">
          <div className="w-4 sm:w-5 h-4 sm:h-5 rounded-b-xs bg-white/30 backdrop-blur-md border border-white/60 shadow-xs flex flex-col justify-between p-0.5">
            <div className="w-full h-0.5 bg-white/80 rounded-xs"></div>
            <div className="w-full h-0.5 bg-white/40 rounded-xs"></div>
          </div>
          <div className="w-6 sm:w-8 h-1 rounded-full bg-slate-900/20 blur-[0.5px]"></div>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-4 sm:w-5 h-4 sm:h-5 rounded-b-xs bg-white/30 backdrop-blur-md border border-white/60 shadow-xs flex flex-col justify-between p-0.5">
            <div className="w-full h-0.5 bg-white/80 rounded-xs"></div>
            <div className="w-full h-0.5 bg-white/40 rounded-xs"></div>
          </div>
          <div className="w-6 sm:w-8 h-1 rounded-full bg-slate-900/20 blur-[0.5px]"></div>
        </div>
      </div>
    </div>
  );
}
