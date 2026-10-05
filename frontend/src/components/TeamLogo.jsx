import React, { useState, useEffect } from "react";

/**
 * TeamLogo - Renders a team's logo with crisp aspect ratio, fallback support,
 * and high-contrast badge background so transparent PNGs and shields never get clipped.
 */
export default function TeamLogo({
  src,
  teamLogoUrl,
  logoUrl,
  name = "",
  teamName = "",
  sizeClass = "w-8 h-8",
  className = "",
  fallbackClassName = "",
  shape = "circle", // "circle" or "rounded"
}) {
  const [errored, setErrored] = useState(false);
  const imageSrc = src || teamLogoUrl || logoUrl;
  const displayName = name || teamName || "Team";
  const size = className || sizeClass;
  const isCircle = shape === "circle";

  useEffect(() => {
    setErrored(false);
  }, [imageSrc]);

  if (!imageSrc || errored) {
    const fallback =
      fallbackClassName ||
      `${size} ${
        isCircle ? "rounded-full" : "rounded-xl"
      } bg-slate-900 border border-slate-700 text-amber-400 flex items-center justify-center text-xs font-black shadow-xs shrink-0 select-none`;
    return (
      <div className={fallback} title={displayName}>
        {displayName ? displayName.charAt(0).toUpperCase() : "🏏"}
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={displayName}
      onError={() => setErrored(true)}
      className={`${size} ${
        isCircle ? "rounded-full" : "rounded-xl"
      } object-contain p-0.5 bg-white border border-slate-200/80 shadow-2xs shrink-0`}
    />
  );
}
