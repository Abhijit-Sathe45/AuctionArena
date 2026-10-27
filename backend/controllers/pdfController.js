const fs = require('fs');
const Team = require('../models/Team');
const Player = require('../models/Player');
const Organizer = require('../models/Organizer');
const { generateTeamSummaryPDF, generateAuctionHistoryPDF, generateRegisteredPlayersPDF } = require('../utils/pdfGenerator');

function safeUnlink(filepath) {
  if (!filepath) return;
  fs.unlink(filepath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('Error removing temporary PDF file:', err);
    }
  });
}

function getDownloadFilename(prefix, suffix) {
  const sanitized = (prefix || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  return sanitized ? `${sanitized}_${suffix}` : `tournament_${suffix}`;
}

// GET /api/pdf/team/:teamId
async function downloadTeamPDF(req, res) {
  let filepath = null;
  try {
    const organizer = await Organizer.findById(req.user.id);
    const team = await Team.findOne({ _id: req.params.teamId, organizer: req.user.id });
    if (!team) return res.status(404).json({ message: 'Team not found' });
    const players = await Player.find({ organizer: req.user.id, soldTo: team._id })
      .populate('category')
      .sort({ soldPrice: -1, name: 1 });

    filepath = await generateTeamSummaryPDF({ organizerName: organizer.tournamentName, team, players });
    const downloadFilename = getDownloadFilename(team.teamName, 'summary.pdf');

    res.download(filepath, downloadFilename, (err) => {
      if (err && !res.headersSent) {
        console.error('Download transmission error:', err);
      }
      safeUnlink(filepath);
    });
  } catch (err) {
    if (filepath) safeUnlink(filepath);
    console.error(err);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
}

// GET /api/pdf/all-teams  -- returns a list of team PDF download links
async function downloadAllTeamsInfo(req, res) {
  try {
    const teams = await Team.find({ organizer: req.user.id }).sort({ teamName: 1 });
    res.json(teams.map(t => ({ teamId: t._id, teamName: t.teamName, downloadUrl: `/api/pdf/team/${t._id}` })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load team list' });
  }
}

// GET /api/pdf/history
async function downloadHistoryPDF(req, res) {
  let filepath = null;
  try {
    const organizer = await Organizer.findById(req.user.id);
    const players = await Player.find({ organizer: req.user.id })
      .populate('category soldTo')
      .sort({ auctionStatus: 1, soldPrice: -1, name: 1 });
    const teams = await Team.find({ organizer: req.user.id }).sort({ teamName: 1 });

    filepath = await generateAuctionHistoryPDF({ organizerName: organizer.tournamentName, players, teams });
    const downloadFilename = getDownloadFilename(organizer.tournamentName, 'auction_history.pdf');

    res.download(filepath, downloadFilename, (err) => {
      if (err && !res.headersSent) {
        console.error('Download transmission error:', err);
      }
      safeUnlink(filepath);
    });
  } catch (err) {
    if (filepath) safeUnlink(filepath);
    console.error(err);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
}

// GET /api/pdf/players
async function downloadRegisteredPlayersPDF(req, res) {
  let filepath = null;
  try {
    const organizer = await Organizer.findById(req.user.id);
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const players = await Player.find({ organizer: req.user.id })
      .populate('category')
      .sort({ createdAt: 1, name: 1 });

    filepath = await generateRegisteredPlayersPDF({
      organizerName: organizer.tournamentName,
      players,
    });
    const downloadFilename = getDownloadFilename(organizer.tournamentName, 'registered_players.pdf');

    res.download(filepath, downloadFilename, (err) => {
      if (err && !res.headersSent) {
        console.error('Download transmission error:', err);
      }
      safeUnlink(filepath);
    });
  } catch (err) {
    if (filepath) safeUnlink(filepath);
    console.error('Error generating registered players PDF:', err);
    res.status(500).json({ message: 'Failed to generate registered players PDF' });
  }
}

module.exports = {
  downloadTeamPDF,
  downloadAllTeamsInfo,
  downloadHistoryPDF,
  downloadRegisteredPlayersPDF,
};