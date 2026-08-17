const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'generated-pdfs');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function drawHeader(doc, title, subtitle) {
  doc.fontSize(20).fillColor('#0B3D2E').text(title, { align: 'center' });
  if (subtitle) doc.fontSize(11).fillColor('#555').text(subtitle, { align: 'center' });
  doc.moveDown(1);
  doc.strokeColor('#0B3D2E').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(1);
}

// One PDF per team: their squad, prices paid, purse used/remaining
// Returns a Promise that resolves with the filepath ONLY once the file is fully written to disk.
function generateTeamSummaryPDF({ organizerName, team, players }) {
  return new Promise((resolve, reject) => {
    const filename = `team-${team._id}-${Date.now()}.pdf`;
    const filepath = path.join(OUT_DIR, filename);
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    drawHeader(doc, `${team.teamName}`, `${organizerName} — Auction Summary`);

    doc.fontSize(12).fillColor('#000');
    doc.text(`Owner: ${team.ownerName}`);
    doc.text(`Total Purse: Rs. ${team.totalPurse}`);
    doc.text(`Purse Remaining: Rs. ${team.purseRemaining}`);
    const totalExtra = (team.extraPointsReceived || []).reduce((s, e) => s + e.points, 0);
    if (totalExtra) doc.text(`Extra Points Received: Rs. ${totalExtra}`);
    doc.moveDown(1);

    doc.fontSize(14).fillColor('#0B3D2E').text('Players Bought', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(11).fillColor('#000');
    players.forEach((p, i) => {
      doc.text(`${i + 1}. ${p.name}  |  ${p.playerType}  |  Age ${p.age}  |  Sold: Rs. ${p.soldPrice}`);
    });

    if (players.length === 0) {
      doc.fontSize(11).fillColor('#888').text('No players purchased.');
    }

    doc.end();

    stream.on('finish', () => resolve(filepath));
    stream.on('error', reject);
  });
}

// Whole-auction history PDF: every player, their status and buyer
function generateAuctionHistoryPDF({ organizerName, players, teams }) {
  return new Promise((resolve, reject) => {
    const filename = `auction-history-${Date.now()}.pdf`;
    const filepath = path.join(OUT_DIR, filename);
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    drawHeader(doc, 'Full Auction History', organizerName);

    const teamMap = {};
    teams.forEach(t => { teamMap[t._id.toString()] = t.teamName; });

    doc.fontSize(11).fillColor('#000');
    players.forEach((p, i) => {
      const status = p.auctionStatus === 'SOLD'
        ? `SOLD to ${teamMap[p.soldTo?.toString()] || '-'} for Rs. ${p.soldPrice}`
        : p.auctionStatus;
      doc.text(`${i + 1}. ${p.name} (${p.playerType}) — ${status}`);
    });

    doc.moveDown(1);
    doc.fontSize(14).fillColor('#0B3D2E').text('Team-wise Purse Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#000');
    teams.forEach(t => {
      doc.text(`${t.teamName} — Spent: Rs. ${t.totalPurse - t.purseRemaining} | Remaining: Rs. ${t.purseRemaining}`);
    });

    doc.end();

    stream.on('finish', () => resolve(filepath));
    stream.on('error', reject);
  });
}

module.exports = { generateTeamSummaryPDF, generateAuctionHistoryPDF };