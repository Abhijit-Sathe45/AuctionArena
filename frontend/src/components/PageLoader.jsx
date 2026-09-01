import React from "react";

// Full-page loading indicator shown by React.lazy's <Suspense> while a code-split
// page chunk is being fetched.
export default function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-mauve/20" />
          <div className="absolute inset-0 rounded-full border-4 border-mint border-t-transparent animate-spin" />
        </div>
        <p className="text-turf/70 font-medium text-sm">Loading…</p>
      </div>
    </div>
  );
}
