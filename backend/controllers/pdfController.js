const fs = require('fs');
const Team = require('../models/Team');
const Player = require('../models/Player');
const Organizer = require('../models/Organizer');
const { generateTeamSummaryPDF, generateAuctionHistoryPDF } = require('../utils/pdfGenerator');

function safeUnlink(filepath) {
  if (!filepath) return;
  fs.unlink(filepath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('Error removing temporary PDF file:', err);
    }
  });
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
    const downloadFilename = `${team.teamName.replace(/\s+/g, '_')}_summary.pdf`;

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
    const downloadFilename = `${organizer.tournamentName.replace(/\s+/g, '_')}_auction_history.pdf`;

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

module.exports = { downloadTeamPDF, downloadAllTeamsInfo, downloadHistoryPDF };