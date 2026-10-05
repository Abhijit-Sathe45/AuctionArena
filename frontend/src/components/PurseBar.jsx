import React from 'react';
import TeamLogo from './TeamLogo';

export default function PurseBar({ team }) {
  const pct = Math.max(0, Math.min(100, (team.purseRemaining / team.totalPurse) * 100));
  return (
    <div className="card">
      <div className="flex items-center gap-2.5 mb-2 min-w-0">
        <TeamLogo
          src={team.teamLogoUrl || team.logoUrl}
          teamName={team.teamName}
          className="w-8 h-8 sm:w-9 sm:h-9"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate text-turf">{team.teamName}</p>
          <p className="text-xs text-mauve-dark truncate">{team.ownerName}</p>
        </div>
      </div>
      <div className="w-full h-2 bg-mauve/20 rounded-full overflow-hidden mb-1">
        <div className="h-full bg-gradient-to-r from-mint to-mint-dark transition-all duration-300 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-turf/70 font-medium truncate">
        Rs. {team.purseRemaining?.toLocaleString('en-IN')} left
      </p>
    </div>
  );
}
