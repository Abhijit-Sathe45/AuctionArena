import React from "react";

// Full-page loading indicator shown by React.lazy's <Suspense> while a code-split
// page chunk is being fetched (only happens once per page per session — cached after).
export default function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-turf/20 border-t-turf rounded-full animate-spin" />
        <p className="text-turf/60 text-sm">Loading…</p>
      </div>
    </div>
  );
}
