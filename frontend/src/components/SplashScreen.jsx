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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-turf-dark transition-opacity duration-[400ms] ${fadingOut ? "opacity-0" : "opacity-100"}`}
    >
      <img
        src="/auction-arena-logo.png"
        alt="Auction Arena"
        className="w-40 h-40 md:w-52 md:h-52 rounded-full shadow-2xl animate-[splashPop_0.6s_ease-out]"
      />
      <div className="mt-6 flex gap-1.5">
        <span
          className="w-2 h-2 rounded-full bg-gold animate-[splashDot_1.2s_ease-in-out_infinite]"
          style={{ animationDelay: "0s" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-gold animate-[splashDot_1.2s_ease-in-out_infinite]"
          style={{ animationDelay: "0.2s" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-gold animate-[splashDot_1.2s_ease-in-out_infinite]"
          style={{ animationDelay: "0.4s" }}
        />
      </div>
      <p className="mt-3 text-ivory/50 text-xs tracking-widest uppercase">
        Loading Auction Arena
      </p>
    </div>
  );
}
