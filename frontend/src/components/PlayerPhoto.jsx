import React, { useState, useEffect } from "react";

export default function PlayerPhoto({
  src,
  photoUrl,
  alt = "",
  name = "",
  sizeClass = "w-40 h-40",
  className = "",
  dark = false,
  fallbackClassName = "",
}) {
  const [errored, setErrored] = useState(false);
  let imageSrc = src || photoUrl;
  const imageAlt = alt || name || "Player";
  const size = className || sizeClass;

  if (imageSrc && typeof imageSrc === "string" && imageSrc.startsWith("/") && !imageSrc.startsWith("//")) {
    const rawApiUrl = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "").replace(/\/+$/, "");
    if (rawApiUrl) {
      imageSrc = `${rawApiUrl}${imageSrc}`;
    }
  }

  useEffect(() => {
    setErrored(false);
  }, [imageSrc]);

  if (!imageSrc || errored) {
    const fallback =
      fallbackClassName ||
      `${size} rounded-2xl ${dark ? "bg-white/10" : "bg-slate-100 border border-slate-200"} flex items-center justify-center text-3xl sm:text-4xl text-amber-500 shadow-inner`;
    return (
      <div className={fallback} title={imageAlt}>
        🏏
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={imageAlt}
      onError={() => setErrored(true)}
      className={`${size} rounded-2xl object-cover`}
    />
  );
}
