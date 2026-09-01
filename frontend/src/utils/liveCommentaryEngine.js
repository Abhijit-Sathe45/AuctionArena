// Cricbuzz / ESPNcricinfo Style Real-Time Auction Commentary Engine

export function formatPrice(amount) {
  if (!amount && amount !== 0) return "₹0";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

export function formatTime(timestamp) {
  const date = timestamp ? new Date(timestamp) : new Date();
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

// Generate Player Introduction commentary
export function createIntroCommentary(player, category) {
  if (!player) return null;
  const catName = category?.name ? `[${category.name}] ` : "";
  const role = player.playerType || "Player";
  const bat = player.battingStyle && player.battingStyle !== "NA" ? ` · ${player.battingStyle.replace("_", " ")}` : "";
  const bowl = player.bowlingStyle && player.bowlingStyle !== "NA" ? ` · ${player.bowlingStyle.replace("_", " ")}` : "";

  return {
    id: `intro-${player._id || player.name}-${Date.now()}`,
    type: "INTRO",
    timestamp: new Date(),
    title: `UP NEXT: ${player.name.toUpperCase()}`,
    text: `🎙️ ${catName}The auctioneer puts ${player.name} (${role}${bat}${bowl}) on the podium! Base price locked at ${formatPrice(player.basePrice)}. Let the bidding begin!`,
    player: { name: player.name, photoUrl: player.photoUrl, playerType: player.playerType },
    amount: player.basePrice,
    badge: "🎙️ INTRO",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  };
}

// Generate Bid Placement commentary with dynamic excitement levels
export function createBidCommentary(player, team, amount, bidCount = 1, previousTeam = null) {
  const teamName = team?.teamName || "Team";
  const playerName = player?.name || "the player";
  const formattedAmt = formatPrice(amount);

  let text = "";
  let badge = "⚡ BID";
  let badgeColor = "bg-blue-500/20 text-blue-300 border-blue-500/40";
  let isWar = false;

  if (bidCount === 1) {
    text = `🏏 Opening bid! ${teamName} kicks off the contest with a ${formattedAmt} bid for ${playerName}.`;
  } else if (bidCount >= 6 && previousTeam && previousTeam !== teamName) {
    isWar = true;
    badge = "🔥 BID WAR";
    badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse";
    text = `🔥 Bidding duel heating up! ${teamName} strikes back immediately against ${previousTeam}, raising the stakes to ${formattedAmt}!`;
  } else if (amount >= 50000 && bidCount % 3 === 0) {
    badge = "💰 BIG BID";
    badgeColor = "bg-amber-400/25 text-amber-300 border-amber-400/50";
    text = `💰 High-value bid! ${teamName} pushes ${playerName}'s price tag to a massive ${formattedAmt}!`;
  } else {
    const phrases = [
      `⚡ ${teamName} raises their paddle to ${formattedAmt}.`,
      `⚡ Next increment from ${teamName} — bid now stands at ${formattedAmt}.`,
      `⚡ ${teamName} is determined, locking in ${formattedAmt} for ${playerName}.`,
    ];
    text = phrases[bidCount % phrases.length];
  }

  return {
    id: `bid-${team?._id || teamName}-${amount}-${Date.now()}`,
    type: isWar ? "BID_WAR" : "BID",
    timestamp: new Date(),
    title: `${teamName} ➡️ ${formattedAmt}`,
    text,
    player: player ? { name: player.name, photoUrl: player.photoUrl } : null,
    team: { teamName: team?.teamName, teamLogoUrl: team?.teamLogoUrl },
    amount,
    badge,
    badgeColor,
  };
}

// Generate 10s / 4s Warning commentary
export function createWarningCommentary(player, team, amount, seconds) {
  const teamName = team?.teamName || "Current Leader";
  const playerName = player?.name || "the player";
  const formattedAmt = formatPrice(amount);

  if (seconds <= 4) {
    return {
      id: `warn-4-${Date.now()}`,
      type: "WARNING",
      timestamp: new Date(),
      title: `GOING TWICE!`,
      text: `⏱️ Going once... Going twice! Last call for ${playerName} at ${formattedAmt} to ${teamName}! Any last-moment paddles from the floor?`,
      amount,
      badge: "⏱️ 4 SECONDS",
      badgeColor: "bg-red-500/25 text-red-300 border-red-500/50 animate-timer-heartbeat",
    };
  }

  return {
    id: `warn-10-${Date.now()}`,
    type: "WARNING",
    timestamp: new Date(),
    title: `10 SECOND WARNING`,
    text: `⏱️ 10 seconds on the clock! ${teamName} holds the winning bid of ${formattedAmt} for ${playerName}.`,
    amount,
    badge: "⏱️ 10s WARNING",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  };
}

// Generate SOLD celebration commentary
export function createSoldCommentary(player, team, finalPrice, bidCount = 0) {
  const teamName = team?.teamName || "Winning Team";
  const playerName = player?.name || "Player";
  const formattedPrice = formatPrice(finalPrice);

  return {
    id: `sold-${player?._id || playerName}-${Date.now()}`,
    type: "SOLD",
    timestamp: new Date(),
    title: `🎉 SOLD TO ${teamName.toUpperCase()}!`,
    text: `🔨 GAVEL DOWN! SOLD! ${playerName} officially joins ${teamName} for a winning purse of ${formattedPrice}${
      bidCount > 0 ? ` after ${bidCount} competitive bids` : ""
    }! Massive signing for ${teamName}!`,
    player: { name: player?.name, photoUrl: player?.photoUrl, playerType: player?.playerType },
    team: { teamName: team?.teamName, teamLogoUrl: team?.teamLogoUrl },
    amount: finalPrice,
    badge: "🏆 SOLD",
    badgeColor: "bg-emerald-500/25 text-emerald-300 border-emerald-400/60 font-black",
  };
}

// Generate UNSOLD commentary
export function createUnsoldCommentary(player) {
  const playerName = player?.name || "Player";
  const base = formatPrice(player?.basePrice || 0);

  return {
    id: `unsold-${player?._id || playerName}-${Date.now()}`,
    type: "UNSOLD",
    timestamp: new Date(),
    title: `UNSOLD: ${playerName.toUpperCase()}`,
    text: `🚫 Gavel falls with no bids from the room. ${playerName} passes UNSOLD at base price of ${base} and will enter the re-auction pool.`,
    player: { name: player?.name, photoUrl: player?.photoUrl },
    amount: player?.basePrice || 0,
    badge: "🚫 UNSOLD",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  };
}

// Generate Custom Organizer Live Announcement commentary
export function createAnnouncementCommentary(message, author = "Auctioneer") {
  return {
    id: `announcement-${Date.now()}`,
    type: "ANNOUNCEMENT",
    timestamp: new Date(),
    title: `📢 ${author.toUpperCase()} ANNOUNCEMENT`,
    text: `📢 [${author}]: ${message}`,
    badge: "📢 ANNOUNCEMENT",
    badgeColor: "bg-amber-400 text-slate-950 border-amber-300 font-bold",
  };
}

// Generate Re-Auction Round start commentary
export function createRoundCommentary(round = 1) {
  return {
    id: `round-${round}-${Date.now()}`,
    type: "ROUND",
    timestamp: new Date(),
    title: `🔄 ROUND ${round} UNDERWAY`,
    text: `🔄 Round ${round} is now active! All unsold players are back in the active queue for second-chance bidding.`,
    badge: `ROUND ${round}`,
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  };
}

// Helper to construct initial historical timeline from server data
export function buildHistoricalTimeline(recentSales = [], currentBidHistory = [], currentPlayer = null) {
  const timeline = [];

  // 1. Add recent sales (oldest to newest)
  if (recentSales && recentSales.length > 0) {
    const reversed = [...recentSales].reverse();
    reversed.forEach((sale) => {
      timeline.push({
        id: `hist-sale-${sale._id}`,
        type: "SOLD",
        timestamp: sale.createdAt ? new Date(sale.createdAt) : new Date(Date.now() - 300000),
        title: `🎉 SOLD TO ${(sale.finalTeam?.teamName || "Team").toUpperCase()}!`,
        text: `🔨 GAVEL DOWN! ${sale.player?.name || "Player"} was acquired by ${sale.finalTeam?.teamName || "Team"} for ${formatPrice(sale.finalPrice)}.`,
        player: sale.player,
        team: sale.finalTeam,
        amount: sale.finalPrice,
        badge: "🏆 SOLD",
        badgeColor: "bg-emerald-500/25 text-emerald-300 border-emerald-400/60 font-black",
      });
    });
  }

  // 2. Add current player intro if active
  if (currentPlayer) {
    timeline.push(createIntroCommentary(currentPlayer, null));

    // 3. Add existing bids on current player
    if (currentBidHistory && currentBidHistory.length > 0) {
      currentBidHistory.forEach((b, idx) => {
        const prevTeam = idx > 0 ? currentBidHistory[idx - 1]?.team?.teamName : null;
        timeline.push(createBidCommentary(currentPlayer, b.team, b.amount, idx + 1, prevTeam));
      });
    }
  }

  return timeline;
}
