import React, { useState } from "react";

export default function PlayerPhoto({
  src,
  alt = "",
  sizeClass = "w-40 h-40",
  dark = false,
}) {
  const [errored, setErrored] = useState(false);
  const fallbackBg = dark ? "bg-white/10" : "bg-turf/10";

  if (!src || errored) {
    return (
      <div
        className={`${sizeClass} rounded-xl ${fallbackBg} mx-auto mb-4 flex items-center justify-center text-4xl`}
      >
        🏏
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className={`${sizeClass} rounded-xl object-cover mx-auto mb-4`}
    />
  );
}
