try { require('../scripts/patch-fontkit'); } catch (e) {}
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'generated-pdfs');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Fonts supporting bilingual Latin (English & Numbers) + Devanagari (Marathi/Hindi)
const FONT_PATH_REG = path.join(__dirname, '..', 'fonts', 'Poppins-Regular.ttf');
const FONT_PATH_BOLD = path.join(__dirname, '..', 'fonts', 'Poppins-Bold.ttf');
const HAS_CUSTOM_FONTS = fs.existsSync(FONT_PATH_REG) && fs.existsSync(FONT_PATH_BOLD);

const FONT_REG = HAS_CUSTOM_FONTS ? 'AppFont' : 'Helvetica';
const FONT_BOLD = HAS_CUSTOM_FONTS ? 'AppFont-Bold' : 'Helvetica-Bold';

function setupDocFonts(doc) {
  if (HAS_CUSTOM_FONTS) {
    try {
      doc.registerFont('AppFont', FONT_PATH_REG);
      doc.registerFont('AppFont-Bold', FONT_PATH_BOLD);
      // Clear out PDFKit's default standard Helvetica cache so any Helvetica calls also use AppFont
      if (doc._fontFamilies) {
        delete doc._fontFamilies['Helvetica'];
        delete doc._fontFamilies['Helvetica-Bold'];
        delete doc._fontFamilies['Helvetica-Oblique'];
        delete doc._fontFamilies['Helvetica-BoldOblique'];
      }
      doc.registerFont('Helvetica', FONT_PATH_REG);
      doc.registerFont('Helvetica-Bold', FONT_PATH_BOLD);
      doc.registerFont('Helvetica-Oblique', FONT_PATH_REG);
      doc.registerFont('Helvetica-BoldOblique', FONT_PATH_BOLD);
      doc.font(FONT_REG);
    } catch (err) {
      console.error('Failed to register Unicode fonts in PDFKit:', err);
    }
  }
}

// Strip Unicode emojis / pictographs that lack glyphs in typography fonts and cause square boxes
function sanitizeForPdf(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
    .trim();
}

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
  const cleanTitle = sanitizeForPdf(title);
  const displayTitle = cleanTitle || 'CRICKET TOURNAMENT';
  const titleFontSize = displayTitle.length > 35 ? 11 : 13;
  doc.fillColor('#FFFFFF').fontSize(titleFontSize).font(FONT_BOLD).text(displayTitle, startX + 14, 46, { width: width - 150, ellipsis: true });
  doc.fillColor('#FDE68A').fontSize(8.5).font(FONT_REG).text(subtitle, startX + 14, 66, { width: width - 150, ellipsis: true });
  doc.fillColor('#E2E8F0').fontSize(8).font(FONT_BOLD).text(tagText, startX + width - 130, 47, { width: 116, align: 'right' });
  doc.fillColor('#CBD5E1').fontSize(7.5).font(FONT_REG).text(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), startX + width - 130, 63, { width: 116, align: 'right' });
}

function applyPageFooters(doc, startX, width, organizerName) {
  const cleanOrg = sanitizeForPdf(organizerName);
  const orgTitle = cleanOrg || 'Tournament';
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.strokeColor('#CBD5E1').lineWidth(0.5).moveTo(startX, doc.page.height - 30).lineTo(startX + width, doc.page.height - 30).stroke();
    doc.fillColor('#64748B').fontSize(7.5).font(FONT_REG).text(`Official AuctionArena Suite • ${orgTitle}`, startX, doc.page.height - 23, { width: 320, align: 'left', ellipsis: true });
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
    setupDocFonts(doc);
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    const startX = 36;
    const contentWidth = 523; // 595 - 72

    // 1. Top Banner
    drawHeaderBanner(doc, startX, contentWidth, organizerName, 'OFFICIAL FRANCHISE SQUAD & FINANCIAL SUMMARY', 'TEAM SQUAD CARD');

    // 2. Team Identity Header
    let currentY = 104;
    const cleanTeamName = sanitizeForPdf(team.teamName) || 'Cricket Team';
    const cleanOwnerName = sanitizeForPdf(team.ownerName) || 'Franchise Owner';
    
    // Attempt to embed team logo if stored locally
    try {
      let localLogoPath = null;
      if (team.teamLogoUrl) {
        if (team.teamLogoUrl.includes('/uploads/')) {
          const fname = team.teamLogoUrl.split('/uploads/').pop().split('?')[0];
          const p = path.join(__dirname, '..', 'uploads', fname);
          if (fs.existsSync(p)) localLogoPath = p;
        } else if (team.teamLogoUrl.startsWith('uploads/')) {
          const p = path.join(__dirname, '..', team.teamLogoUrl);
          if (fs.existsSync(p)) localLogoPath = p;
        }
      }
      if (localLogoPath) {
        doc.image(localLogoPath, startX + contentWidth - 46, currentY - 4, { fit: [44, 44], align: 'center', valign: 'center' });
      }
    } catch (imgErr) {
      // Safe fallback if logo cannot be read
    }

    doc.fillColor('#0F172A').fontSize(18).font(FONT_BOLD).text(cleanTeamName, startX, currentY, { width: contentWidth - 60 });
    const ownerLine = `Team Owner: ${cleanOwnerName}${team.phone ? `  •  Phone: ${team.phone}` : ''}  •  Squad Size: ${players.length} Players`;
    doc.fillColor('#475569').fontSize(9).font(FONT_REG).text(ownerLine, startX, currentY + 22, { width: contentWidth - 60 });

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
      doc.fillColor('#64748B').fontSize(7).font(FONT_BOLD).text(s.label, x + 8, currentY + 7);
      doc.fillColor(s.color).fontSize(11).font(FONT_BOLD).text(s.val, x + 8, currentY + 22);
    });

    if (totalExtra > 0) {
      currentY += cardHeight + 4;
      doc.fillColor('#B45309').fontSize(7.5).font(FONT_REG).text(`* Includes Rs. ${totalExtra.toLocaleString('en-IN')} in approved bonus/extra purse points granted by organizer.`, startX + 2, currentY);
      currentY += 10;
    } else {
      currentY += cardHeight + 14;
    }

    // 4. Section Title
    doc.fillColor('#0F5132').fontSize(11).font(FONT_BOLD).text('PURCHASED SQUAD ROSTER', startX, currentY);
    doc.fillColor('#64748B').fontSize(8).font(FONT_REG).text('Official list of cricketer acquisitions finalized during the live auction gavel.', startX, currentY + 14);

    // 5. Table of Players
    currentY += 28;
    const columns = [
      { label: '#', width: 24, align: 'center' },
      { label: 'PLAYER NAME', width: 120, align: 'left' },
      { label: 'JERSEY NAME', width: 90, align: 'left' },
      { label: 'NO.', width: 35, align: 'center' },
      { label: 'T-SHIRT', width: 54, align: 'center' },
      { label: 'PHONE', width: 75, align: 'left' },
      { label: 'ROLE', width: 55, align: 'left' },
      { label: 'SOLD PRICE', width: 70, align: 'right' },
    ];

    function renderTableHeader(y) {
      doc.roundedRect(startX, y, contentWidth, 22, 2).fill('#0F5132');
      let colX = startX;
      columns.forEach((c) => {
        doc.fillColor('#FFFFFF').fontSize(8).font(FONT_BOLD).text(c.label, colX + 4, y + 6, {
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
      doc.fillColor('#64748B').fontSize(9).font(FONT_REG).text('No players purchased by this franchise in the auction.', startX, currentY + 10, { width: contentWidth, align: 'center' });
      currentY += 32;
    } else {
      players.forEach((p, idx) => {
        const rowHeight = 22;

        // Auto Page Break
        if (currentY + rowHeight > doc.page.height - 45) {
          doc.addPage();
          currentY = 36;
          doc.fillColor('#0F5132').fontSize(10).font(FONT_BOLD).text(`${cleanTeamName.toUpperCase()} — SQUAD PLAYERS (CONTINUED)`, startX, currentY);
          currentY += 16;
          renderTableHeader(currentY);
          currentY += 22;
        }

        const isOdd = idx % 2 === 1;
        if (isOdd) {
          doc.rect(startX, currentY, contentWidth, rowHeight).fill('#F8FAFC');
        }
        doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(startX, currentY + rowHeight).lineTo(startX + contentWidth, currentY + rowHeight).stroke();

        let colX = startX;
        // 0: #
        doc.fillColor('#64748B').fontSize(8).font(FONT_BOLD).text(String(idx + 1), colX, currentY + 6, { width: columns[0].width, align: 'center' });
        colX += columns[0].width;

        // 1: Name (Preserves Marathi & English language exactly as entered)
        doc.fillColor('#0F172A').fontSize(8.5).font(FONT_BOLD).text(sanitizeForPdf(p.name) || 'Unnamed', colX + 4, currentY + 6, { width: columns[1].width - 8, align: 'left', ellipsis: true });
        colX += columns[1].width;

        // 2: Jersey Name
        const cleanJersey = sanitizeForPdf(p.jerseyName) || '-';
        doc.fillColor('#1E293B').fontSize(7.5).font(FONT_BOLD).text(cleanJersey, colX + 4, currentY + 6, { width: columns[2].width - 8, align: 'left', ellipsis: true });
        colX += columns[2].width;

        // 3: Jersey Number
        doc.fillColor('#0F5132').fontSize(8).font(FONT_BOLD).text(p.jerseyNumber ? String(p.jerseyNumber) : '-', colX, currentY + 6, { width: columns[3].width, align: 'center' });
        colX += columns[3].width;

        // 4: T-Shirt Size
        doc.fillColor('#334155').fontSize(7.5).font(FONT_BOLD).text(p.tShirtSize || '-', colX, currentY + 6, { width: columns[4].width, align: 'center' });
        colX += columns[4].width;

        // 5: Phone
        doc.fillColor('#64748B').fontSize(7.5).font(FONT_REG).text(p.phone || '-', colX + 4, currentY + 6, { width: columns[5].width - 8, align: 'left', ellipsis: true });
        colX += columns[5].width;

        // 6: Role
        const roleText = formatRole(p.playerType);
        doc.fillColor('#334155').fontSize(7.5).font(FONT_REG).text(roleText, colX + 4, currentY + 6, { width: columns[6].width - 8, align: 'left', ellipsis: true });
        colX += columns[6].width;

        // 7: Sold Price
        doc.fillColor('#0F5132').fontSize(8.5).font(FONT_BOLD).text(formatCurrency(p.soldPrice), colX + 4, currentY + 6, { width: columns[7].width - 8, align: 'right' });

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

    doc.fillColor('#1E293B').fontSize(8.5).font(FONT_BOLD).text(`TOTAL SQUAD EXPENDITURE (${players.length} PLAYERS)`, startX + 12, currentY + 7);
    doc.fillColor('#0F5132').fontSize(9.5).font(FONT_BOLD).text(formatCurrency(totalSpent), startX, currentY + 6, { width: contentWidth - 12, align: 'right' });
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

    doc.fillColor('#475569').fontSize(8).font(FONT_REG).text('Franchise Representative Signature', startX + 30, currentY + 33, { width: 150, align: 'center' });
    doc.fillColor('#475569').fontSize(8).font(FONT_REG).text('Tournament Commissioner / Auctioneer', startX + contentWidth - 180, currentY + 33, { width: 150, align: 'center' });

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
    setupDocFonts(doc);
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
      doc.fillColor('#64748B').fontSize(7).font(FONT_BOLD).text(s.label, x + 8, currentY + 7);
      doc.fillColor(s.color).fontSize(11).font(FONT_BOLD).text(s.val, x + 8, currentY + 22);
    });

    currentY += cardHeight + 16;

    // 3. Table 1: All Players Roster
    doc.fillColor('#0F5132').fontSize(11).font(FONT_BOLD).text('PLAYER AUCTION DISPOSITION ROSTER', startX, currentY);
    doc.fillColor('#64748B').fontSize(8).font(FONT_REG).text('Master record of all registered cricketers, winning bids, and acquisition status.', startX, currentY + 14);

    currentY += 28;

    const playerColumns = [
      { label: '#', width: 22, align: 'center' },
      { label: 'PLAYER NAME', width: 90, align: 'left' },
      { label: 'JERSEY & SIZE', width: 75, align: 'left' },
      { label: 'PHONE', width: 63, align: 'left' },
      { label: 'ROLE', width: 70, align: 'left' },
      { label: 'STATUS', width: 50, align: 'center' },
      { label: 'WINNING FRANCHISE', width: 85, align: 'left' },
      { label: 'FINAL PRICE', width: 68, align: 'right' },
    ];

    function renderPlayerTableHeader(y) {
      doc.roundedRect(startX, y, contentWidth, 22, 2).fill('#0F5132');
      let colX = startX;
      playerColumns.forEach((c) => {
        doc.fillColor('#FFFFFF').fontSize(8).font(FONT_BOLD).text(c.label, colX + 4, y + 6, {
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
      teamMap[t._id.toString()] = sanitizeForPdf(t.teamName);
    });

    players.forEach((p, idx) => {
      const rowHeight = 20;

      if (currentY + rowHeight > doc.page.height - 45) {
        doc.addPage();
        currentY = 36;
        doc.fillColor('#0F5132').fontSize(10).font(FONT_BOLD).text('PLAYER AUCTION DISPOSITION ROSTER (CONTINUED)', startX, currentY);
        currentY += 16;
        renderPlayerTableHeader(currentY);
        currentY += 22;
      }

      const isOdd = idx % 2 === 1;
      if (isOdd) doc.rect(startX, currentY, contentWidth, rowHeight).fill('#F8FAFC');
      doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(startX, currentY + rowHeight).lineTo(startX + contentWidth, currentY + rowHeight).stroke();

      let colX = startX;
      // 0: #
      doc.fillColor('#64748B').fontSize(7.5).font(FONT_BOLD).text(String(idx + 1), colX, currentY + 5, { width: playerColumns[0].width, align: 'center' });
      colX += playerColumns[0].width;

      // 1: Name (Bilingual Marathi / English)
      doc.fillColor('#0F172A').fontSize(8).font(FONT_BOLD).text(sanitizeForPdf(p.name) || 'Unnamed', colX + 4, currentY + 5, { width: playerColumns[1].width - 8, align: 'left', ellipsis: true });
      colX += playerColumns[1].width;

      // 2: Jersey & Size
      const kitParts = [];
      if (p.jerseyName) kitParts.push(sanitizeForPdf(p.jerseyName));
      if (p.jerseyNumber) kitParts.push(`#${p.jerseyNumber}`);
      if (p.tShirtSize) kitParts.push(`(${p.tShirtSize})`);
      const kitText = kitParts.length > 0 ? kitParts.join(' ') : '-';
      doc.fillColor('#1E293B').fontSize(7).font(FONT_BOLD).text(kitText, colX + 4, currentY + 5, { width: playerColumns[2].width - 8, align: 'left', ellipsis: true });
      colX += playerColumns[2].width;

      // 3: Phone
      doc.fillColor('#64748B').fontSize(7.5).font(FONT_REG).text(p.phone || '-', colX + 4, currentY + 5, { width: playerColumns[3].width - 8, align: 'left', ellipsis: true });
      colX += playerColumns[3].width;

      // 4: Role
      const roleText = formatRole(p.playerType);
      doc.fillColor('#475569').fontSize(7.5).font(FONT_REG).text(roleText, colX + 4, currentY + 5, { width: playerColumns[4].width - 8, align: 'left', ellipsis: true });
      colX += playerColumns[4].width;

      // 5: Status
      const isSold = p.auctionStatus === 'SOLD';
      const isUnsold = p.auctionStatus === 'UNSOLD';
      const statusColor = isSold ? '#15803D' : isUnsold ? '#DC2626' : '#64748B';
      doc.fillColor(statusColor).fontSize(7.5).font(FONT_BOLD).text(p.auctionStatus || 'PENDING', colX, currentY + 5, { width: playerColumns[5].width, align: 'center' });
      colX += playerColumns[5].width;

      // 6: Winning Team
      const buyerId = (p.soldTo?._id || p.soldTo)?.toString();
      const winningTeamName = isSold ? (sanitizeForPdf(p.soldTo?.teamName) || teamMap[buyerId] || 'Sold') : '-';
      doc.fillColor('#1E293B').fontSize(8).font(FONT_REG).text(winningTeamName, colX + 4, currentY + 5, { width: playerColumns[6].width - 8, align: 'left', ellipsis: true });
      colX += playerColumns[6].width;

      // 7: Final Price
      const priceText = isSold ? formatCurrency(p.soldPrice) : '-';
      doc.fillColor(isSold ? '#0F5132' : '#94A3B8').fontSize(8).font(isSold ? FONT_BOLD : FONT_REG).text(priceText, colX + 4, currentY + 5, { width: playerColumns[7].width - 8, align: 'right' });

      currentY += rowHeight;
    });

    currentY += 26;

    // 4. Table 2: Team Financial Leaderboard
    if (currentY + 80 > doc.page.height - 45) {
      doc.addPage();
      currentY = 36;
    }

    doc.fillColor('#0F5132').fontSize(11).font(FONT_BOLD).text('FRANCHISE FINANCIAL AUDIT & SQUAD LEADERBOARD', startX, currentY);
    doc.fillColor('#64748B').fontSize(8).font(FONT_REG).text('Official breakdown of squad size, allocated budgets, total expenditure, and remaining balances.', startX, currentY + 14);

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
        doc.fillColor('#FFFFFF').fontSize(8).font(FONT_BOLD).text(c.label, colX + 4, y + 6, {
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
        doc.fillColor('#0F5132').fontSize(10).font(FONT_BOLD).text('FRANCHISE FINANCIAL AUDIT (CONTINUED)', startX, currentY);
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
      doc.fillColor('#64748B').fontSize(7.5).font(FONT_BOLD).text(String(idx + 1), colX, currentY + 5, { width: teamColumns[0].width, align: 'center' });
      colX += teamColumns[0].width;

      // 1: Franchise Name
      doc.fillColor('#0F172A').fontSize(8).font(FONT_BOLD).text(sanitizeForPdf(t.teamName) || 'Team', colX + 4, currentY + 5, { width: teamColumns[1].width - 8, align: 'left', ellipsis: true });
      colX += teamColumns[1].width;

      // 2: Owner Name
      doc.fillColor('#475569').fontSize(7.5).font(FONT_REG).text(sanitizeForPdf(t.ownerName) || '-', colX + 4, currentY + 5, { width: teamColumns[2].width - 8, align: 'left', ellipsis: true });
      colX += teamColumns[2].width;

      // 3: Squad Count
      doc.fillColor('#0F172A').fontSize(8).font(FONT_BOLD).text(`${teamPlayers.length}`, colX, currentY + 5, { width: teamColumns[3].width, align: 'center' });
      colX += teamColumns[3].width;

      // 4: Total Purse
      doc.fillColor('#475569').fontSize(7.5).font(FONT_REG).text(formatCurrency(t.totalPurse), colX + 2, currentY + 5, { width: teamColumns[4].width - 4, align: 'right' });
      colX += teamColumns[4].width;

      // 5: Total Spent
      doc.fillColor('#D97706').fontSize(7.5).font(FONT_BOLD).text(formatCurrency(teamSpent), colX + 2, currentY + 5, { width: teamColumns[5].width - 4, align: 'right' });
      colX += teamColumns[5].width;

      // 6: Purse Remaining
      doc.fillColor('#15803D').fontSize(7.5).font(FONT_BOLD).text(formatCurrency(t.purseRemaining), colX + 2, currentY + 5, { width: teamColumns[6].width - 4, align: 'right' });

      currentY += rowHeight;
    });

    // 5. Global Page Footers
    applyPageFooters(doc, startX, contentWidth, organizerName);

    doc.end();

    stream.on('finish', () => resolve(filepath));
    stream.on('error', reject);
  });
}

// ============================================================================
// 3. Registered Players Master Roster PDF (Landscape): All registered player info
// ============================================================================
function generateRegisteredPlayersPDF({ organizerName, players = [] }) {
  return new Promise((resolve, reject) => {
    const filename = `registered-players-${Date.now()}.pdf`;
    const filepath = path.join(OUT_DIR, filename);
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36, bufferPages: true });
    setupDocFonts(doc);
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    const startX = 36;
    const contentWidth = 770; // 842 - 72 = 770

    // 1. Header Banner
    drawHeaderBanner(doc, startX, contentWidth, organizerName, 'OFFICIAL REGISTERED PLAYERS DIRECTORY & VERIFIED ROSTER', 'PLAYER ROSTER');

    // 2. Overview Stats Box
    let currentY = 104;
    const approvedPlayers = players.filter((p) => p.isApproved);
    const pendingPlayers = players.filter((p) => !p.isApproved);
    const paidPlayers = players.filter((p) => p.paymentStatus === 'PAID');
    const totalFeesCollected = players.reduce((sum, p) => sum + (p.registrationFeePaid || 0), 0);

    const cardGap = 10;
    const cardWidth = (contentWidth - 3 * cardGap) / 4;
    const cardHeight = 44;

    const summaryCards = [
      { label: 'TOTAL REGISTERED', val: `${players.length} Cricketers`, color: '#0F172A' },
      { label: 'APPROVED PLAYERS', val: `${approvedPlayers.length} Verified`, color: '#15803D' },
      { label: 'PENDING APPROVAL', val: `${pendingPlayers.length} Pending`, color: '#D97706' },
      { label: 'PAID REGISTRATIONS', val: `${paidPlayers.length} (${formatCurrency(totalFeesCollected)})`, color: '#0F5132' },
    ];

    summaryCards.forEach((s, idx) => {
      const x = startX + idx * (cardWidth + cardGap);
      doc.roundedRect(x, currentY, cardWidth, cardHeight, 4).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.fillColor('#64748B').fontSize(7).font(FONT_BOLD).text(s.label, x + 8, currentY + 7);
      doc.fillColor(s.color).fontSize(11).font(FONT_BOLD).text(s.val, x + 8, currentY + 22);
    });

    currentY += cardHeight + 14;

    // 3. Section Title
    doc.fillColor('#0F5132').fontSize(11).font(FONT_BOLD).text('REGISTERED CRICKETERS MASTER LIST', startX, currentY);
    doc.fillColor('#64748B').fontSize(8).font(FONT_REG).text('Comprehensive directory of registered cricketers with contact numbers, player roles, playing styles, apparel sizing, and approval statuses.', startX, currentY + 14);

    currentY += 28;

    const playerColumns = [
      { label: '#', width: 24, align: 'center' },
      { label: 'PLAYER NAME', width: 115, align: 'left' },
      { label: 'PHONE', width: 80, align: 'left' },
      { label: 'ROLE', width: 75, align: 'left' },
      { label: 'STYLE (BAT / BOWL)', width: 85, align: 'left' },
      { label: 'AGE', width: 32, align: 'center' },
      { label: 'VILLAGE / CITY', width: 90, align: 'left' },
      { label: 'T-SHIRT', width: 60, align: 'center' },
      { label: 'JERSEY (NO. & NAME)', width: 88, align: 'left' },
      { label: 'PAYMENT', width: 56, align: 'center' },
      { label: 'STATUS', width: 65, align: 'center' },
    ];

    function renderTableHeader(y) {
      doc.roundedRect(startX, y, contentWidth, 22, 2).fill('#0F5132');
      let colX = startX;
      playerColumns.forEach((c) => {
        doc.fillColor('#FFFFFF').fontSize(7.5).font(FONT_BOLD).text(c.label, colX + 4, y + 6, {
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
      doc.fillColor('#64748B').fontSize(9).font(FONT_REG).text('No registered players found in tournament database.', startX, currentY + 10, { width: contentWidth, align: 'center' });
      currentY += 32;
    } else {
      players.forEach((p, idx) => {
        const rowHeight = 20;

        if (currentY + rowHeight > doc.page.height - 45) {
          doc.addPage();
          currentY = 36;
          doc.fillColor('#0F5132').fontSize(10).font(FONT_BOLD).text('REGISTERED CRICKETERS MASTER LIST (CONTINUED)', startX, currentY);
          currentY += 16;
          renderTableHeader(currentY);
          currentY += 22;
        }

        const isOdd = idx % 2 === 1;
        if (isOdd) doc.rect(startX, currentY, contentWidth, rowHeight).fill('#F8FAFC');
        doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(startX, currentY + rowHeight).lineTo(startX + contentWidth, currentY + rowHeight).stroke();

        let colX = startX;
        // 0: #
        doc.fillColor('#64748B').fontSize(7.5).font(FONT_BOLD).text(String(idx + 1), colX, currentY + 5, { width: playerColumns[0].width, align: 'center' });
        colX += playerColumns[0].width;

        // 1: Name (Keeps Marathi names in Marathi, English names in English)
        doc.fillColor('#0F172A').fontSize(8).font(FONT_BOLD).text(sanitizeForPdf(p.name) || 'Unnamed', colX + 4, currentY + 5, { width: playerColumns[1].width - 8, align: 'left', ellipsis: true });
        colX += playerColumns[1].width;

        // 2: Phone
        doc.fillColor('#334155').fontSize(7.5).font(FONT_REG).text(p.phone || '-', colX + 4, currentY + 5, { width: playerColumns[2].width - 8, align: 'left', ellipsis: true });
        colX += playerColumns[2].width;

        // 3: Role
        doc.fillColor('#0F5132').fontSize(7.5).font(FONT_BOLD).text(formatRole(p.playerType), colX + 4, currentY + 5, { width: playerColumns[3].width - 8, align: 'left', ellipsis: true });
        colX += playerColumns[3].width;

        // 4: Style
        doc.fillColor('#475569').fontSize(7).font(FONT_REG).text(formatStyle(p.battingStyle, p.bowlingStyle), colX + 4, currentY + 5, { width: playerColumns[4].width - 8, align: 'left', ellipsis: true });
        colX += playerColumns[4].width;

        // 5: Age
        doc.fillColor('#334155').fontSize(7.5).font(FONT_REG).text(p.age ? String(p.age) : '-', colX, currentY + 5, { width: playerColumns[5].width, align: 'center' });
        colX += playerColumns[5].width;

        // 6: Village / City (Bilingual Marathi / English)
        doc.fillColor('#1E293B').fontSize(7.5).font(FONT_REG).text(sanitizeForPdf(p.villageCity) || '-', colX + 4, currentY + 5, { width: playerColumns[6].width - 8, align: 'left', ellipsis: true });
        colX += playerColumns[6].width;

        // 7: T-Shirt Size
        doc.fillColor('#334155').fontSize(7.5).font(FONT_BOLD).text(p.tShirtSize || '-', colX, currentY + 5, { width: playerColumns[7].width, align: 'center' });
        colX += playerColumns[7].width;

        // 8: Jersey (No. & Name)
        const jerseyParts = [];
        if (p.jerseyNumber) jerseyParts.push(`#${p.jerseyNumber}`);
        if (p.jerseyName) jerseyParts.push(sanitizeForPdf(p.jerseyName));
        const jerseyStr = jerseyParts.length > 0 ? jerseyParts.join(' • ') : '-';
        doc.fillColor('#1E293B').fontSize(7.5).font(FONT_REG).text(jerseyStr, colX + 4, currentY + 5, { width: playerColumns[8].width - 8, align: 'left', ellipsis: true });
        colX += playerColumns[8].width;

        // 9: Payment Status
        const payStatus = p.paymentStatus || 'FREE';
        let payColor = '#64748B';
        if (payStatus === 'PAID') payColor = '#15803D';
        else if (payStatus === 'FREE') payColor = '#0284C7';
        else if (payStatus === 'PENDING') payColor = '#D97706';
        else if (payStatus === 'FAILED') payColor = '#DC2626';
        doc.fillColor(payColor).fontSize(7.5).font(FONT_BOLD).text(payStatus, colX, currentY + 5, { width: playerColumns[9].width, align: 'center' });
        colX += playerColumns[9].width;

        // 10: Approval Status
        const isApp = !!p.isApproved;
        doc.fillColor(isApp ? '#15803D' : '#D97706').fontSize(7.5).font(FONT_BOLD).text(isApp ? 'APPROVED' : 'PENDING', colX, currentY + 5, { width: playerColumns[10].width, align: 'center' });

        currentY += rowHeight;
      });
    }

    // 4. Summary Row at the bottom of the table
    if (currentY + 24 > doc.page.height - 45) {
      doc.addPage();
      currentY = 36;
    }
    doc.rect(startX, currentY, contentWidth, 24).fill('#F1F5F9');
    doc.strokeColor('#0F5132').lineWidth(1.5).moveTo(startX, currentY).lineTo(startX + contentWidth, currentY).stroke();
    doc.strokeColor('#CBD5E1').lineWidth(0.5).moveTo(startX, currentY + 24).lineTo(startX + contentWidth, currentY + 24).stroke();

    doc.fillColor('#1E293B').fontSize(8.5).font(FONT_BOLD).text(`TOTAL ROSTER AUDIT: ${players.length} REGISTERED CRICKETERS`, startX + 12, currentY + 7);
    doc.fillColor('#0F5132').fontSize(8.5).font(FONT_BOLD).text(`${approvedPlayers.length} Approved  •  ${pendingPlayers.length} Pending Approval  •  ${paidPlayers.length} Paid`, startX, currentY + 7, { width: contentWidth - 12, align: 'right' });
    currentY += 36;

    // 5. Verification Signatures
    if (currentY + 55 > doc.page.height - 45) {
      doc.addPage();
      currentY = 36;
    }
    currentY += 10;
    doc.strokeColor('#94A3B8').lineWidth(0.75).dash(3, { space: 3 });
    doc.moveTo(startX + 40, currentY + 24).lineTo(startX + 220, currentY + 24).stroke();
    doc.moveTo(startX + contentWidth - 220, currentY + 24).lineTo(startX + contentWidth - 40, currentY + 24).stroke();
    doc.undash();

    doc.fillColor('#475569').fontSize(8).font(FONT_REG).text('Tournament Registration Committee Signature', startX + 40, currentY + 29, { width: 180, align: 'center' });
    doc.fillColor('#475569').fontSize(8).font(FONT_REG).text('Official Certification & Date Stamp', startX + contentWidth - 220, currentY + 29, { width: 180, align: 'center' });

    // 6. Global Page Footers
    applyPageFooters(doc, startX, contentWidth, organizerName);

    doc.end();

    stream.on('finish', () => resolve(filepath));
    stream.on('error', reject);
  });
}

module.exports = {
  generateTeamSummaryPDF,
  generateAuctionHistoryPDF,
  generateRegisteredPlayersPDF,
};