import React from 'react';

export default function PurseBar({ team }) {
  const pct = Math.max(0, Math.min(100, (team.purseRemaining / team.totalPurse) * 100));
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-2">
        {team.logoUrl && <img src={team.logoUrl} className="w-9 h-9 rounded-full object-cover" alt="" />}
        <div>
          <p className="font-semibold text-sm">{team.teamName}</p>
          <p className="text-xs text-black/50">{team.ownerName}</p>
        </div>
      </div>
      <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
        <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs mt-1 text-black/60">
        Rs. {team.purseRemaining?.toLocaleString('en-IN')} left of Rs. {team.totalPurse?.toLocaleString('en-IN')}
      </p>
    </div>
  );
}
