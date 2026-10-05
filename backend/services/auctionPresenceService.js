// In-memory presence manager for team owners connected to online remote auction bidding.
// Tracks which teams have an active team owner online on mobile/desktop remote.
// Structure: Map<organizerIdStr, Map<teamIdStr, Set<socketId>>>

const activeTeamRemotes = new Map();

function getOnlineTeams(organizerId) {
  if (!organizerId) return [];
  const orgIdStr = organizerId.toString();
  const teamMap = activeTeamRemotes.get(orgIdStr);
  if (!teamMap) return [];
  return Array.from(teamMap.keys());
}

function isTeamOnline(organizerId, teamId) {
  if (!organizerId || !teamId) return false;
  const orgIdStr = organizerId.toString();
  const teamIdStr = teamId.toString();
  const teamMap = activeTeamRemotes.get(orgIdStr);
  if (!teamMap) return false;
  const sockets = teamMap.get(teamIdStr);
  return !!(sockets && sockets.size > 0);
}

function registerTeamOnline(io, organizerId, teamId, socketId) {
  if (!organizerId || !teamId || !socketId) return [];
  const orgIdStr = organizerId.toString();
  const teamIdStr = teamId.toString();

  if (!activeTeamRemotes.has(orgIdStr)) {
    activeTeamRemotes.set(orgIdStr, new Map());
  }
  const teamMap = activeTeamRemotes.get(orgIdStr);
  if (!teamMap.has(teamIdStr)) {
    teamMap.set(teamIdStr, new Set());
  }
  teamMap.get(teamIdStr).add(socketId);

  const onlineTeamIds = Array.from(teamMap.keys());
  if (io) {
    io.to(`auction-${orgIdStr}`).emit('online-teams-update', { onlineTeamIds });
  }
  return onlineTeamIds;
}

function unregisterTeamOnline(io, socketId) {
  if (!socketId) return;
  for (const [orgIdStr, teamMap] of activeTeamRemotes.entries()) {
    let changed = false;
    for (const [teamIdStr, socketSet] of teamMap.entries()) {
      if (socketSet.has(socketId)) {
        socketSet.delete(socketId);
        if (socketSet.size === 0) {
          teamMap.delete(teamIdStr);
        }
        changed = true;
      }
    }
    if (changed) {
      const onlineTeamIds = Array.from(teamMap.keys());
      if (io) {
        io.to(`auction-${orgIdStr}`).emit('online-teams-update', { onlineTeamIds });
      }
    }
  }
}

module.exports = {
  getOnlineTeams,
  isTeamOnline,
  registerTeamOnline,
  unregisterTeamOnline,
};
