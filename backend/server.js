const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const { Server } = require('socket.io');

const { PORT, CLIENT_URL } = require('./config');
const connectDB = require('./db/connect');
const startExpiryCron = require('./utils/expiryCron');
const bootstrapSuperAdmin = require('./bootstrapSuperAdmin');

const authRoutes = require('./routes/authRoutes');
const organizerSignupRoutes = require('./routes/organizerSignupRoutes');
const publicRoutes = require('./routes/publicRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const organizerAdminRoutes = require('./routes/organizerAdminRoutes');
const auctionRoutes = require('./routes/auctionRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const registerAuctionSocketHandlers = require('./socket/auctionSocket');
const auctionTimerService = require('./services/auctionTimerService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
  pingTimeout: 10000,
  pingInterval: 5000,
});
app.set('io', io);
auctionTimerService.setIo(io);

// Safety net: log unexpected async errors instead of letting them crash the whole server.
// With asyncHandler wrapping every route, this should rarely fire — but it protects against
// anything that slips through (e.g. an error thrown outside a request, like a stray timer).
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection (server kept running):', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (server kept running):', err);
});

app.use(compression()); // gzip every response — smaller payloads, faster loads especially on mobile data
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => res.json({ status: 'Tennis Cricket Auction API is running' }));

app.use('/api/auth', authRoutes);
app.use('/api/organizer-signup', organizerSignupRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/organizer-admin', organizerAdminRoutes);
app.use('/api/auction', auctionRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/super-admin', superAdminRoutes);

// Socket.io: clients join a room per organizer to receive live auction updates.
// Fast-path bid/undo-bid actions (see socket/auctionSocket.js) also run here, bypassing
// a full HTTP request for the most latency-sensitive moments of a live auction.
io.on('connection', (socket) => {
  registerAuctionSocketHandlers(io, socket);
  socket.on('disconnect', () => {});
});

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

async function start() {
  await connectDB();
  await bootstrapSuperAdmin();
  startExpiryCron();
  await auctionTimerService.recoverActiveTimers();
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start();