const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'generated-pdfs');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function formatCurrency(val) {
  return `Rs. ${Number(val || 0).toLocaleString('en-IN')}`;
}

function formatRole(role) {
  if (!role) return '-';
  const r = role.toUpperCase();
  if (r === 'BATSMAN') return 'Batsman';
  if (r === 'BOWLER') return 'Bowler';
  if (r === 'ALLROUNDER' || r === 'ALL_ROUNDER') return 'All-Rounder';
  if (r === 'WICKET_KEEPER') return 'Wicketkeeper';
  return role;
}

function formatStyle(bat, bowl) {
  const batMap = { RIGHT_HANDED: 'RHB', LEFT_HANDED: 'LHB' };
  const bowlMap = {
    RIGHT_ARM_FAST: 'RAF',
    RIGHT_ARM_MEDIUM: 'RAM',
    RIGHT_ARM_SPIN: 'Spin',
    LEFT_ARM_FAST: 'LAF',
    LEFT_ARM_MEDIUM: 'LAM',
    LEFT_ARM_SPIN: 'L-Spin',
  };
  const b = batMap[bat] || (bat && bat !== 'NA' ? bat : '');
  const w = bowlMap[bowl] || (bowl && bowl !== 'NA' ? bowl : '');
  if (b && w) return `${b} • ${w}`;
  return b || w || '-';
}

function drawHeaderBanner(doc, startX, width, title, subtitle, tagText = 'AUCTION REPORT') {
  doc.roundedRect(startX, 36, width, 54, 4).fill('#0F5132');
  doc.fillColor('#FFFFFF').fontSize(13).font('Helvetica-Bold').text((title || 'CRICKET TOURNAMENT').toUpperCase(), startX + 14, 46, { width: width - 150, ellipsis: true });
  doc.fillColor('#FDE68A').fontSize(8.5).font('Helvetica').text(subtitle, startX + 14, 66, { width: width - 150, ellipsis: true });
  doc.fillColor('#E2E8F0').fontSize(8).font('Helvetica-Bold').text(tagText, startX + width - 130, 47, { width: 116, align: 'right' });
  doc.fillColor('#CBD5E1').fontSize(7.5).font('Helvetica').text(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), startX + width - 130, 63, { width: 116, align: 'right' });
}

function applyPageFooters(doc, startX, width, organizerName) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.strokeColor('#CBD5E1').lineWidth(0.5).moveTo(startX, doc.page.height - 30).lineTo(startX + width, doc.page.height - 30).stroke();
    doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text(`Official AuctionArena Suite • ${organizerName || 'Tournament'}`, startX, doc.page.height - 23, { width: 320, align: 'left', ellipsis: true });
    doc.text(`Page ${i + 1} of ${range.count}`, startX + width - 120, doc.page.height - 23, { width: 120, align: 'right' });
  }
}

// ============================================================================
// 1. One PDF per team: their squad, prices paid, purse used/remaining in table format
// ============================================================================
function generateTeamSummaryPDF({ organizerName, team, players = [] }) {
  return new Promise((resolve, reject) => {
    const filename = `team-${team._id}-${Date.now()}.pdf`;
    const filepath = path.join(OUT_DIR, filename);
    const doc = new PDFDocument({ size: 'A4', margin: 36, bufferPages: true });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    const startX = 36;
    const contentWidth = 523; // 595 - 72

    // 1. Top Banner
    drawHeaderBanner(doc, startX, contentWidth, organizerName, 'OFFICIAL FRANCHISE SQUAD & FINANCIAL SUMMARY', 'TEAM SQUAD CARD');

    // 2. Team Identity Header
    let currentY = 104;
    doc.fillColor('#0F172A').fontSize(18).font('Helvetica-Bold').text(team.teamName.toUpperCase(), startX, currentY);
    const ownerLine = `Team Owner: ${team.ownerName || 'Franchise Owner'}${team.phone ? `  •  Phone: ${team.phone}` : ''}  •  Squad Size: ${players.length} Players`;
    doc.fillColor('#475569').fontSize(9).font('Helvetica').text(ownerLine, startX, currentY + 22);

    // 3. Financial KPI Stat Cards
    currentY += 40;
    const cardGap = 8;
    const cardWidth = (contentWidth - 3 * cardGap) / 4;
    const cardHeight = 44;

    const totalSpent = players.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
    const totalExtra = (team.extraPointsReceived || []).reduce((s, e) => s + (e.points || 0), 0);

    const stats = [
      { label: 'TOTAL PURSE', val: formatCurrency(team.totalPurse), color: '#0F172A' },
      { label: 'TOTAL SPENT', val: formatCurrency(totalSpent), color: '#D97706' },
      { label: 'PURSE REMAINING', val: formatCurrency(team.purseRemaining), color: '#15803D' },
      { label: 'SQUAD SIZE', val: `${players.length} Players`, color: '#0F5132' },
    ];

    stats.forEach((s, idx) => {
      const x = startX + idx * (cardWidth + cardGap);
      doc.roundedRect(x, currentY, cardWidth, cardHeight, 4).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.fillColor('#64748B').fontSize(7).font('Helvetica-Bold').text(s.label, x + 8, currentY + 7);
      doc.fillColor(s.color).fontSize(11).font('Helvetica-Bold').text(s.val, x + 8, currentY + 22);
    });

    if (totalExtra > 0) {
      currentY += cardHeight + 4;
      doc.fillColor('#B45309').fontSize(7.5).font('Helvetica').text(`* Includes Rs. ${totalExtra.toLocaleString('en-IN')} in approved bonus/extra purse points granted by organizer.`, startX + 2, currentY);
      currentY += 10;
    } else {
      currentY += cardHeight + 14;
    }

    // 4. Section Title
    doc.fillColor('#0F5132').fontSize(11).font('Helvetica-Bold').text('PURCHASED SQUAD ROSTER', startX, currentY);
    doc.fillColor('#64748B').fontSize(8).font('Helvetica').text('Official list of cricketer acquisitions finalized during the live auction gavel.', startX, currentY + 14);

    // 5. Table of Players
    currentY += 28;
    const columns = [
      { label: '#', width: 26, align: 'center' },
      { label: 'PLAYER NAME', width: 145, align: 'left' },
      { label: 'ROLE / CATEGORY', width: 110, align: 'left' },
      { label: 'STYLE (BAT • BOWL)', width: 110, align: 'left' },
      { label: 'BASE PRICE', width: 62, align: 'right' },
      { label: 'SOLD PRICE', width: 70, align: 'right' },
    ];

    function renderTableHeader(y) {
      doc.roundedRect(startX, y, contentWidth, 22, 2).fill('#0F5132');
      let colX = startX;
      columns.forEach((c) => {
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold').text(c.label, colX + 4, y + 6, {
          width: c.width - 8,
          align: c.align,
        });
        colX += c.width;
      });
    }

    renderTableHeader(currentY);
    currentY += 22;

    if (players.length === 0) {
      doc.rect(startX, currentY, contentWidth, 32).fill('#F8FAFC');
      doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(startX, currentY + 32).lineTo(startX + contentWidth, currentY + 32).stroke();
      doc.fillColor('#64748B').fontSize(9).font('Helvetica-Oblique').text('No players purchased by this franchise in the auction.', startX, currentY + 10, { width: contentWidth, align: 'center' });
      currentY += 32;
    } else {
      players.forEach((p, idx) => {
        const rowHeight = 22;

        // Auto Page Break
        if (currentY + rowHeight > doc.page.height - 45) {
          doc.addPage();
          currentY = 36;
          // Mini header on continuation page
          doc.fillColor('#0F5132').fontSize(10).font('Helvetica-Bold').text(`${team.teamName.toUpperCase()} — SQUAD PLAYERS (CONTINUED)`, startX, currentY);
          currentY += 16;
          renderTableHeader(currentY);
          currentY += 22;
        }

        const isOdd = idx % 2 === 1;
        if (isOdd) {
          doc.rect(startX, currentY, contentWidth, rowHeight).fill('#F8FAFC');
        }
        // Row divider
        doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(startX, currentY + rowHeight).lineTo(startX + contentWidth, currentY + rowHeight).stroke();

        let colX = startX;
        // 0: #
        doc.fillColor('#64748B').fontSize(8).font('Helvetica-Bold').text(String(idx + 1), colX, currentY + 6, { width: columns[0].width, align: 'center' });
        colX += columns[0].width;

        // 1: Name
        doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text(p.name, colX + 4, currentY + 6, { width: columns[1].width - 8, align: 'left', ellipsis: true });
        colX += columns[1].width;

        // 2: Role / Category
        const catName = p.category?.name || (typeof p.category === 'string' ? p.category : null);
        const roleCat = catName ? `${formatRole(p.playerType)} (${catName})` : formatRole(p.playerType);
        doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(roleCat, colX + 4, currentY + 6, { width: columns[2].width - 8, align: 'left', ellipsis: true });
        colX += columns[2].width;

        // 3: Style
        doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text(formatStyle(p.battingStyle, p.bowlingStyle), colX + 4, currentY + 6, { width: columns[3].width - 8, align: 'left', ellipsis: true });
        colX += columns[3].width;

        // 4: Base Price
        doc.fillColor('#64748B').fontSize(8).font('Helvetica').text(formatCurrency(p.basePrice), colX + 4, currentY + 6, { width: columns[4].width - 8, align: 'right' });
        colX += columns[4].width;

        // 5: Sold Price
        doc.fillColor('#0F5132').fontSize(8.5).font('Helvetica-Bold').text(formatCurrency(p.soldPrice), colX + 4, currentY + 6, { width: columns[5].width - 8, align: 'right' });

        currentY += rowHeight;
      });
    }

    // Table Summary Footer Row
    if (currentY + 24 > doc.page.height - 45) {
      doc.addPage();
      currentY = 36;
    }
    doc.rect(startX, currentY, contentWidth, 24).fill('#F1F5F9');
    doc.strokeColor('#0F5132').lineWidth(1.5).moveTo(startX, currentY).lineTo(startX + contentWidth, currentY).stroke();
    doc.strokeColor('#CBD5E1').lineWidth(0.5).moveTo(startX, currentY + 24).lineTo(startX + contentWidth, currentY + 24).stroke();

    doc.fillColor('#1E293B').fontSize(8.5).font('Helvetica-Bold').text(`TOTAL SQUAD EXPENDITURE (${players.length} PLAYERS)`, startX + 12, currentY + 7);
    doc.fillColor('#0F5132').fontSize(9.5).font('Helvetica-Bold').text(formatCurrency(totalSpent), startX, currentY + 6, { width: contentWidth - 12, align: 'right' });
    currentY += 36;

    // 6. Verification / Signature Lines
    if (currentY + 60 > doc.page.height - 45) {
      doc.addPage();
      currentY = 36;
    }
    currentY += 10;
    doc.strokeColor('#94A3B8').lineWidth(0.75).dash(3, { space: 3 });
    doc.moveTo(startX + 30, currentY + 28).lineTo(startX + 180, currentY + 28).stroke();
    doc.moveTo(startX + contentWidth - 180, currentY + 28).lineTo(startX + contentWidth - 30, currentY + 28).stroke();
    doc.undash();

    doc.fillColor('#475569').fontSize(8).font('Helvetica').text('Franchise Representative Signature', startX + 30, currentY + 33, { width: 150, align: 'center' });
    doc.fillColor('#475569').fontSize(8).font('Helvetica').text('Tournament Commissioner / Auctioneer', startX + contentWidth - 180, currentY + 33, { width: 150, align: 'center' });

    // 7. Global Page Footers
    applyPageFooters(doc, startX, contentWidth, organizerName);

    doc.end();

    stream.on('finish', () => resolve(filepath));
    stream.on('error', reject);
  });
}

// ============================================================================
// 2. Whole-auction history PDF: every player, their status, buyer & team-wise purse
// ============================================================================
function generateAuctionHistoryPDF({ organizerName, players = [], teams = [] }) {
  return new Promise((resolve, reject) => {
    const filename = `auction-history-${Date.now()}.pdf`;
    const filepath = path.join(OUT_DIR, filename);
    const doc = new PDFDocument({ size: 'A4', margin: 36, bufferPages: true });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    const startX = 36;
    const contentWidth = 523;

    // 1. Header Banner
    drawHeaderBanner(doc, startX, contentWidth, organizerName, 'COMPLETE TOURNAMENT AUCTION HISTORY & FINANCIAL LEDGER', 'OFFICIAL AUDIT');

    // 2. Overview Stats Box
    let currentY = 104;
    const soldPlayers = players.filter((p) => p.auctionStatus === 'SOLD');
    const unsoldPlayers = players.filter((p) => p.auctionStatus === 'UNSOLD');
    const totalExpenditure = soldPlayers.reduce((sum, p) => sum + (p.soldPrice || 0), 0);

    const cardGap = 8;
    const cardWidth = (contentWidth - 3 * cardGap) / 4;
    const cardHeight = 44;

    const summaryCards = [
      { label: 'TOTAL PLAYERS', val: `${players.length}`, color: '#0F172A' },
      { label: 'PLAYERS SOLD', val: `${soldPlayers.length}`, color: '#15803D' },
      { label: 'PLAYERS UNSOLD', val: `${unsoldPlayers.length}`, color: '#DC2626' },
      { label: 'TOTAL VOLUME', val: formatCurrency(totalExpenditure), color: '#D97706' },
    ];

    summaryCards.forEach((s, idx) => {
      const x = startX + idx * (cardWidth + cardGap);
      doc.roundedRect(x, currentY, cardWidth, cardHeight, 4).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.fillColor('#64748B').fontSize(7).font('Helvetica-Bold').text(s.label, x + 8, currentY + 7);
      doc.fillColor(s.color).fontSize(11).font('Helvetica-Bold').text(s.val, x + 8, currentY + 22);
    });

    currentY += cardHeight + 16;

    // 3. Table 1: All Players Roster
    doc.fillColor('#0F5132').fontSize(11).font('Helvetica-Bold').text('PLAYER AUCTION DISPOSITION ROSTER', startX, currentY);
    doc.fillColor('#64748B').fontSize(8).font('Helvetica').text('Master record of all registered cricketers, winning bids, and acquisition status.', startX, currentY + 14);

    currentY += 28;

    const playerColumns = [
      { label: '#', width: 25, align: 'center' },
      { label: 'PLAYER NAME', width: 140, align: 'left' },
      { label: 'ROLE / CAT', width: 95, align: 'left' },
      { label: 'STATUS', width: 55, align: 'center' },
      { label: 'WINNING FRANCHISE', width: 125, align: 'left' },
      { label: 'FINAL PRICE', width: 83, align: 'right' },
    ];

    function renderPlayerTableHeader(y) {
      doc.roundedRect(startX, y, contentWidth, 22, 2).fill('#0F5132');
      let colX = startX;
      playerColumns.forEach((c) => {
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold').text(c.label, colX + 4, y + 6, {
          width: c.width - 8,
          align: c.align,
        });
        colX += c.width;
      });
    }

    renderPlayerTableHeader(currentY);
    currentY += 22;

    const teamMap = {};
    teams.forEach((t) => {
      teamMap[t._id.toString()] = t.teamName;
    });

    players.forEach((p, idx) => {
      const rowHeight = 20;

      if (currentY + rowHeight > doc.page.height - 45) {
        doc.addPage();
        currentY = 36;
        doc.fillColor('#0F5132').fontSize(10).font('Helvetica-Bold').text('PLAYER AUCTION DISPOSITION ROSTER (CONTINUED)', startX, currentY);
        currentY += 16;
        renderPlayerTableHeader(currentY);
        currentY += 22;
      }

      const isOdd = idx % 2 === 1;
      if (isOdd) doc.rect(startX, currentY, contentWidth, rowHeight).fill('#F8FAFC');
      doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(startX, currentY + rowHeight).lineTo(startX + contentWidth, currentY + rowHeight).stroke();

      let colX = startX;
      // 0: #
      doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold').text(String(idx + 1), colX, currentY + 5, { width: playerColumns[0].width, align: 'center' });
      colX += playerColumns[0].width;

      // 1: Name
      doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(p.name, colX + 4, currentY + 5, { width: playerColumns[1].width - 8, align: 'left', ellipsis: true });
      colX += playerColumns[1].width;

      // 2: Role / Cat
      const catName = p.category?.name || (typeof p.category === 'string' ? p.category : null);
      const roleText = catName ? `${formatRole(p.playerType)} (${catName})` : formatRole(p.playerType);
      doc.fillColor('#475569').fontSize(7.5).font('Helvetica').text(roleText, colX + 4, currentY + 5, { width: playerColumns[2].width - 8, align: 'left', ellipsis: true });
      colX += playerColumns[2].width;

      // 3: Status
      const isSold = p.auctionStatus === 'SOLD';
      const isUnsold = p.auctionStatus === 'UNSOLD';
      const statusColor = isSold ? '#15803D' : isUnsold ? '#DC2626' : '#64748B';
      doc.fillColor(statusColor).fontSize(7.5).font('Helvetica-Bold').text(p.auctionStatus || 'PENDING', colX, currentY + 5, { width: playerColumns[3].width, align: 'center' });
      colX += playerColumns[3].width;

      // 4: Winning Team
      const buyerId = (p.soldTo?._id || p.soldTo)?.toString();
      const winningTeamName = isSold ? (p.soldTo?.teamName || teamMap[buyerId] || 'Sold') : '-';
      doc.fillColor('#1E293B').fontSize(8).font('Helvetica').text(winningTeamName, colX + 4, currentY + 5, { width: playerColumns[4].width - 8, align: 'left', ellipsis: true });
      colX += playerColumns[4].width;

      // 5: Final Price
      const priceText = isSold ? formatCurrency(p.soldPrice) : '-';
      doc.fillColor(isSold ? '#0F5132' : '#94A3B8').fontSize(8).font(isSold ? 'Helvetica-Bold' : 'Helvetica').text(priceText, colX + 4, currentY + 5, { width: playerColumns[5].width - 8, align: 'right' });

      currentY += rowHeight;
    });

    currentY += 26;

    // 4. Table 2: Team Financial Leaderboard
    if (currentY + 80 > doc.page.height - 45) {
      doc.addPage();
      currentY = 36;
    }

    doc.fillColor('#0F5132').fontSize(11).font('Helvetica-Bold').text('FRANCHISE FINANCIAL AUDIT & SQUAD LEADERBOARD', startX, currentY);
    doc.fillColor('#64748B').fontSize(8).font('Helvetica').text('Official breakdown of squad size, allocated budgets, total expenditure, and remaining balances.', startX, currentY + 14);

    currentY += 28;

    const teamColumns = [
      { label: '#', width: 25, align: 'center' },
      { label: 'FRANCHISE NAME', width: 140, align: 'left' },
      { label: 'OWNER NAME', width: 105, align: 'left' },
      { label: 'SQUAD', width: 55, align: 'center' },
      { label: 'TOTAL PURSE', width: 66, align: 'right' },
      { label: 'TOTAL SPENT', width: 66, align: 'right' },
      { label: 'PURSE REMAINING', width: 66, align: 'right' },
    ];

    function renderTeamTableHeader(y) {
      doc.roundedRect(startX, y, contentWidth, 22, 2).fill('#1E293B');
      let colX = startX;
      teamColumns.forEach((c) => {
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold').text(c.label, colX + 4, y + 6, {
          width: c.width - 8,
          align: c.align,
        });
        colX += c.width;
      });
    }

    renderTeamTableHeader(currentY);
    currentY += 22;

    teams.forEach((t, idx) => {
      const rowHeight = 20;
      if (currentY + rowHeight > doc.page.height - 45) {
        doc.addPage();
        currentY = 36;
        doc.fillColor('#0F5132').fontSize(10).font('Helvetica-Bold').text('FRANCHISE FINANCIAL AUDIT (CONTINUED)', startX, currentY);
        currentY += 16;
        renderTeamTableHeader(currentY);
        currentY += 22;
      }

      const teamPlayers = players.filter((p) => {
        const sid = (p.soldTo?._id || p.soldTo)?.toString();
        return sid === t._id.toString() && p.auctionStatus === 'SOLD';
      });
      const teamSpent = teamPlayers.reduce((s, p) => s + (p.soldPrice || 0), 0);

      const isOdd = idx % 2 === 1;
      if (isOdd) doc.rect(startX, currentY, contentWidth, rowHeight).fill('#F8FAFC');
      doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(startX, currentY + rowHeight).lineTo(startX + contentWidth, currentY + rowHeight).stroke();

      let colX = startX;
      // 0: #
      doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold').text(String(idx + 1), colX, currentY + 5, { width: teamColumns[0].width, align: 'center' });
      colX += teamColumns[0].width;

      // 1: Franchise Name
      doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(t.teamName, colX + 4, currentY + 5, { width: teamColumns[1].width - 8, align: 'left', ellipsis: true });
      colX += teamColumns[1].width;

      // 2: Owner Name
      doc.fillColor('#475569').fontSize(7.5).font('Helvetica').text(t.ownerName || '-', colX + 4, currentY + 5, { width: teamColumns[2].width - 8, align: 'left', ellipsis: true });
      colX += teamColumns[2].width;

      // 3: Squad Count
      doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(`${teamPlayers.length}`, colX, currentY + 5, { width: teamColumns[3].width, align: 'center' });
      colX += teamColumns[3].width;

      // 4: Total Purse
      doc.fillColor('#475569').fontSize(7.5).font('Helvetica').text(formatCurrency(t.totalPurse), colX + 2, currentY + 5, { width: teamColumns[4].width - 4, align: 'right' });
      colX += teamColumns[4].width;

      // 5: Total Spent
      doc.fillColor('#D97706').fontSize(7.5).font('Helvetica-Bold').text(formatCurrency(teamSpent), colX + 2, currentY + 5, { width: teamColumns[5].width - 4, align: 'right' });
      colX += teamColumns[5].width;

      // 6: Purse Remaining
      doc.fillColor('#15803D').fontSize(7.5).font('Helvetica-Bold').text(formatCurrency(t.purseRemaining), colX + 2, currentY + 5, { width: teamColumns[6].width - 4, align: 'right' });

      currentY += rowHeight;
    });

    // 5. Global Page Footers
    applyPageFooters(doc, startX, contentWidth, organizerName);

    doc.end();

    stream.on('finish', () => resolve(filepath));
    stream.on('error', reject);
  });
}

module.exports = { generateTeamSummaryPDF, generateAuctionHistoryPDF };