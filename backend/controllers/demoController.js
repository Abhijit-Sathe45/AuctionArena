const Category = require('../models/Category');
const Team = require('../models/Team');
const Player = require('../models/Player');
const AuctionState = require('../models/AuctionState');
const AuctionLog = require('../models/AuctionLog');
const AuctionSettings = require('../models/AuctionSettings');

// Sample player photos from reliable royalty-free cricket/sports sources
const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1531415074868-036b1c5d53ec?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=200&auto=format&fit=crop&q=80',
];

// POST /api/organizer-admin/demo/seed -> 1-Click Seeds a full demo tournament
async function seedDemoData(req, res) {
  const organizerId = req.user.id;

  // 1. Clear existing records for clean demo setup
  await Promise.all([
    AuctionLog.deleteMany({ organizer: organizerId }),
    AuctionState.deleteMany({ organizer: organizerId }),
    Player.deleteMany({ organizer: organizerId }),
    Team.deleteMany({ organizer: organizerId }),
    Category.deleteMany({ organizer: organizerId }),
  ]);

  // 2. Seed 3 Categories
  const [cat1, cat2, cat3] = await Promise.all([
    Category.create({ organizer: organizerId, name: 'Icon & Marquee Stars', basePrice: 25000, order: 1 }),
    Category.create({ organizer: organizerId, name: 'All-Rounders & Power Hitters', basePrice: 15000, order: 2 }),
    Category.create({ organizer: organizerId, name: 'Specialist Bowlers & Spinners', basePrice: 10000, order: 3 }),
  ]);

  // 3. Seed 5 Demo Teams
  const teamsData = [
    { teamName: 'Mumbai Smashers (Demo)', ownerName: 'Rohit V.', purse: 500000, pin: '1111' },
    { teamName: 'Royal Super Kings (Demo)', ownerName: 'Suresh R.', purse: 500000, pin: '2222' },
    { teamName: 'Deccan Dynamos (Demo)', ownerName: 'Kiran K.', purse: 500000, pin: '3333' },
    { teamName: 'Delhi Daredevils (Demo)', ownerName: 'Virender G.', purse: 500000, pin: '4444' },
    { teamName: 'Kolkata Knights (Demo)', ownerName: 'Shahrukh J.', purse: 500000, pin: '5555' },
  ];

  const createdTeams = await Promise.all(
    teamsData.map((t, idx) =>
      Team.create({
        organizer: organizerId,
        teamName: t.teamName,
        ownerName: t.ownerName,
        phone: `987650000${idx + 1}`,
        totalPurse: t.purse,
        purseRemaining: t.purse,
        biddingPin: t.pin,
        isApproved: true,
        paymentStatus: 'FREE',
        teamLogoUrl: SAMPLE_PHOTOS[idx % SAMPLE_PHOTOS.length],
      })
    )
  );

  // 4. Seed 18 Demo Players (6 per category) with valid Mongoose enums
  // Batting: RIGHT_HANDED, LEFT_HANDED
  // Bowling: RIGHT_HANDED, LEFT_HANDED, NA
  // PlayerType: BATSMAN, BOWLER, ALLROUNDER
  const playersData = [
    // Category 1: Icon Stars (₹25,000)
    { name: 'Sachin Ramesh (Demo)', type: 'BATSMAN', bat: 'RIGHT_HANDED', bowl: 'NA', age: 24, cat: cat1._id, price: 25000 },
    { name: 'Virat K. (Demo)', type: 'BATSMAN', bat: 'RIGHT_HANDED', bowl: 'RIGHT_HANDED', age: 23, cat: cat1._id, price: 25000 },
    { name: 'MS Dhoni (Demo)', type: 'BATSMAN', bat: 'RIGHT_HANDED', bowl: 'NA', age: 26, cat: cat1._id, price: 25000 },
    { name: 'Rohit S. (Demo)', type: 'BATSMAN', bat: 'RIGHT_HANDED', bowl: 'RIGHT_HANDED', age: 25, cat: cat1._id, price: 25000 },
    { name: 'Yuvraj S. (Demo)', type: 'ALLROUNDER', bat: 'LEFT_HANDED', bowl: 'LEFT_HANDED', age: 24, cat: cat1._id, price: 25000 },
    { name: 'AB de Villiers (Demo)', type: 'BATSMAN', bat: 'RIGHT_HANDED', bowl: 'RIGHT_HANDED', age: 25, cat: cat1._id, price: 25000 },

    // Category 2: All-Rounders (₹15,000)
    { name: 'Hardik Pandya (Demo)', type: 'ALLROUNDER', bat: 'RIGHT_HANDED', bowl: 'RIGHT_HANDED', age: 22, cat: cat2._id, price: 15000 },
    { name: 'Ravindra Jadeja (Demo)', type: 'ALLROUNDER', bat: 'LEFT_HANDED', bowl: 'LEFT_HANDED', age: 24, cat: cat2._id, price: 15000 },
    { name: 'Ben Stokes (Demo)', type: 'ALLROUNDER', bat: 'LEFT_HANDED', bowl: 'RIGHT_HANDED', age: 25, cat: cat2._id, price: 15000 },
    { name: 'Andre Russell (Demo)', type: 'ALLROUNDER', bat: 'RIGHT_HANDED', bowl: 'RIGHT_HANDED', age: 26, cat: cat2._id, price: 15000 },
    { name: 'Suryakumar Yadav (Demo)', type: 'BATSMAN', bat: 'RIGHT_HANDED', bowl: 'RIGHT_HANDED', age: 23, cat: cat2._id, price: 15000 },
    { name: 'Glenn Maxwell (Demo)', type: 'ALLROUNDER', bat: 'RIGHT_HANDED', bowl: 'RIGHT_HANDED', age: 24, cat: cat2._id, price: 15000 },

    // Category 3: Bowlers (₹10,000)
    { name: 'Jasprit Bumrah (Demo)', type: 'BOWLER', bat: 'RIGHT_HANDED', bowl: 'RIGHT_HANDED', age: 22, cat: cat3._id, price: 10000 },
    { name: 'Rashid Khan (Demo)', type: 'BOWLER', bat: 'RIGHT_HANDED', bowl: 'RIGHT_HANDED', age: 21, cat: cat3._id, price: 10000 },
    { name: 'Mohammed Shami (Demo)', type: 'BOWLER', bat: 'RIGHT_HANDED', bowl: 'RIGHT_HANDED', age: 25, cat: cat3._id, price: 10000 },
    { name: 'Yuzvendra Chahal (Demo)', type: 'BOWLER', bat: 'RIGHT_HANDED', bowl: 'RIGHT_HANDED', age: 23, cat: cat3._id, price: 10000 },
    { name: 'Trent Boult (Demo)', type: 'BOWLER', bat: 'RIGHT_HANDED', bowl: 'LEFT_HANDED', age: 25, cat: cat3._id, price: 10000 },
    { name: 'Mitchell Starc (Demo)', type: 'BOWLER', bat: 'LEFT_HANDED', bowl: 'LEFT_HANDED', age: 26, cat: cat3._id, price: 10000 },
  ];

  const createdPlayers = await Promise.all(
    playersData.map((p, idx) =>
      Player.create({
        organizer: organizerId,
        name: p.name,
        playerType: p.type,
        battingStyle: p.bat,
        bowlingStyle: p.bowl,
        age: p.age,
        category: p.cat,
        basePrice: p.price,
        phone: `98765432${idx < 10 ? '0' + idx : idx}`,
        photoUrl: SAMPLE_PHOTOS[idx % SAMPLE_PHOTOS.length],
        isApproved: true,
        auctionStatus: 'PENDING',
        paymentStatus: 'FREE',
      })
    )
  );

  // 5. Initialize AuctionState with Category 1 and queued players
  const cat1Players = createdPlayers.filter(p => p.category.toString() === cat1._id.toString());
  await AuctionState.create({
    organizer: organizerId,
    status: 'NOT_STARTED',
    currentCategory: cat1._id,
    playerQueue: cat1Players.map(p => p._id),
    currentRound: 1,
    countdownEnabled: true,
    countdownDuration: 30,
  });

  // Enable team owner bidding in settings for full remote simulator support
  await AuctionSettings.findOneAndUpdate(
    { organizer: organizerId },
    {
      teamOwnerBiddingEnabled: true,
      countdownEnabled: true,
      countdownDuration: 30,
      minPlayersPerTeam: 3,
      maxPlayersPerTeam: 6,
      maxPursePerTeam: 500000,
    },
    { upsert: true }
  );

  // Notify socket room
  const io = req.app.get('io');
  if (io) {
    io.to(`auction-${organizerId}`).emit('auction-update', {
      event: 'DEMO_SEEDED',
      message: 'Demo tournament data loaded successfully!',
    });
  }

  res.json({
    message: 'Demo tournament seeded successfully! 5 teams and 18 players are ready for auction.',
    teamsCount: createdTeams.length,
    playersCount: createdPlayers.length,
    categoriesCount: 3,
  });
}

// POST /api/organizer-admin/demo/clear -> Clears demo players, teams, categories, logs & resets auction state
async function clearDemoData(req, res) {
  const organizerId = req.user.id;

  await Promise.all([
    Player.deleteMany({ organizer: organizerId }),
    Team.deleteMany({ organizer: organizerId }),
    Category.deleteMany({ organizer: organizerId }),
    AuctionLog.deleteMany({ organizer: organizerId }),
    AuctionState.deleteMany({ organizer: organizerId }),
  ]);

  // Create fresh blank auction state
  await AuctionState.create({ organizer: organizerId });

  // Notify socket room
  const io = req.app.get('io');
  if (io) {
    io.to(`auction-${organizerId}`).emit('auction-update', {
      event: 'DEMO_CLEARED',
      message: 'All demo tournament records cleared.',
    });
  }

  res.json({ message: 'All demo records cleared and tournament state reset.' });
}

module.exports = {
  seedDemoData,
  clearDemoData,
};
