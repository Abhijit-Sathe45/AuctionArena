const Team = require('../models/Team');
const Player = require('../models/Player');
const Organizer = require('../models/Organizer');
const { generateTeamSummaryPDF, generateAuctionHistoryPDF } = require('../utils/pdfGenerator');

// GET /api/pdf/team/:teamId
async function downloadTeamPDF(req, res) {
  try {
    const organizer = await Organizer.findById(req.user.id);
    const team = await Team.findOne({ _id: req.params.teamId, organizer: req.user.id });
    if (!team) return res.status(404).json({ message: 'Team not found' });
    const players = await Player.find({ organizer: req.user.id, soldTo: team._id });

    const filepath = await generateTeamSummaryPDF({ organizerName: organizer.tournamentName, team, players });
    res.download(filepath, `${team.teamName.replace(/\s+/g, '_')}_summary.pdf`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
}

// GET /api/pdf/all-teams  -- returns a list of team PDF download links
async function downloadAllTeamsInfo(req, res) {
  try {
    const teams = await Team.find({ organizer: req.user.id });
    res.json(teams.map(t => ({ teamId: t._id, teamName: t.teamName, downloadUrl: `/api/pdf/team/${t._id}` })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load team list' });
  }
}

// GET /api/pdf/history
async function downloadHistoryPDF(req, res) {
  try {
    const organizer = await Organizer.findById(req.user.id);
    const players = await Player.find({ organizer: req.user.id });
    const teams = await Team.find({ organizer: req.user.id });
    const filepath = await generateAuctionHistoryPDF({ organizerName: organizer.tournamentName, players, teams });
    res.download(filepath, `${organizer.tournamentName.replace(/\s+/g, '_')}_auction_history.pdf`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
}

module.exports = { downloadTeamPDF, downloadAllTeamsInfo, downloadHistoryPDF };