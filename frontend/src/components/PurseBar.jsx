import React from 'react';

export default function PurseBar({ team }) {
  const pct = Math.max(0, Math.min(100, (team.purseRemaining / team.totalPurse) * 100));
  return (
    <div className="card">
      <div className="flex items-center gap-2.5 mb-2 min-w-0">
        {team.logoUrl ? (
          <img src={team.logoUrl} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0" alt="" />
        ) : (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-turf/10 text-turf flex items-center justify-center text-sm shrink-0">
            🏏
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{team.teamName}</p>
          <p className="text-xs text-black/50 truncate">{team.ownerName}</p>
        </div>
      </div>
      <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden mb-1">
        <div className="h-full bg-gold transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-black/60 truncate">
        Rs. {team.purseRemaining?.toLocaleString('en-IN')} left
      </p>
    </div>
  );
}
