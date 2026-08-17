import React from "react";

// Reusable pulsing placeholder blocks, shown while real data is loading — feels
// noticeably smoother than a plain "Loading…" text, especially on first page load.

export function SkeletonBlock({ className = "" }) {
  return (
    <div className={`bg-black/10 rounded-md animate-pulse ${className}`} />
  );
}

export function SkeletonStatCards({ count = 4 }) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card text-center space-y-2">
          <SkeletonBlock className="h-8 w-16 mx-auto" />
          <SkeletonBlock className="h-3 w-20 mx-auto" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }) {
  return (
    <div className="card overflow-x-auto mt-3">
      <table className="w-full text-sm">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-black/5">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="py-3 pr-3">
                  <SkeletonBlock className="h-4 w-full max-w-[120px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonCards({ count = 3 }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-3">
          <SkeletonBlock className="h-4 w-2/3" />
          <SkeletonBlock className="h-2 w-full" />
          <SkeletonBlock className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
