import React, { useEffect, useState } from "react";

// Branded splash screen shown once when the app first loads, before the very first
// page (Home/Login/whatever route was requested) appears. Logo fades/scales in, holds
// briefly with a loading indicator, then fades out to reveal the real app underneath.
export default function SplashScreen({ onFinish, duration = 3000 }) {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const fadeOutTimer = setTimeout(() => setFadingOut(true), duration - 400);
    const finishTimer = setTimeout(() => onFinish?.(), duration);
    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(finishTimer);
    };
  }, [duration, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-[#F0F5FF] via-[#FAF5FC] to-[#F2FCF8] transition-opacity duration-[400ms] ${fadingOut ? "opacity-0" : "opacity-100"}`}
    >
      <div className="relative">
        <div className="absolute -inset-4 bg-gradient-to-r from-mint/30 via-orchid/30 to-sky/40 rounded-full blur-2xl opacity-80" />
        <img
          src="/auction-arena-logo.png"
          alt="Auction Arena"
          className="relative w-40 h-40 md:w-52 md:h-52 rounded-full shadow-2xl animate-[splashPop_0.6s_ease-out] border-2 border-white"
        />
      </div>
      <div className="mt-7 flex gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full bg-mint shadow-[0_0_8px_#2CF6B3] animate-[splashDot_1.2s_ease-in-out_infinite]"
          style={{ animationDelay: "0s" }}
        />
        <span
          className="w-2.5 h-2.5 rounded-full bg-orchid shadow-[0_0_8px_#ECB0E1] animate-[splashDot_1.2s_ease-in-out_infinite]"
          style={{ animationDelay: "0.2s" }}
        />
        <span
          className="w-2.5 h-2.5 rounded-full bg-rose shadow-[0_0_8px_#DE6C83] animate-[splashDot_1.2s_ease-in-out_infinite]"
          style={{ animationDelay: "0.4s" }}
        />
      </div>
      <p className="mt-3.5 text-mauve-dark text-xs font-bold tracking-widest uppercase">
        Loading Auction Arena
      </p>
    </div>
  );
}
