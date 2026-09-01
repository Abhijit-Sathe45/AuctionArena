/**
 * Comprehensive Knowledge Base & Conversational AI Engine for Auction Arena.
 * Fully trained on 100% of the application's features, login procedures,
 * tournament rules, OBS streaming, mobile PIN bidding, AI voice studio,
 * and live auction management.
 */

const KNOWLEDGE_TOPICS = [
  {
    id: "login_guide",
    triggers: [
      "login", "log in", "how to login", "sign in", "signin", "password", "account",
      "credentials", "how do i log in", "where to login", "forgot password",
      "organizer login", "super admin login", "team login", "user login", "portal", "access account"
    ],
    title: "🔐 How to Log In to Auction Arena (Organizer, Teams & Admin)",
    summary: "Complete guide on login methods for Organizers, Team Owners with PINs, and Admins.",
    content: `
### 🔐 How to Log In to Auction Arena

Auction Arena has dedicated, secure login portals tailored for each role:

---

#### 1. 🏆 Tournament Organizer Login
* **URL:** \`/organizer/login\` (or click **"Login"** on the top navigation bar).
* **Credentials:**
  * **Email:** The email address you used when creating your tournament account or purchasing your Pass.
  * **Password:** Your secure account password.
* **Access Granted:** Full access to **Dashboard, Players, Teams, Categories, Settings, Live Auction, and History**.

---

#### 2. 📱 Team Owner Mobile Remote Login (No Password Needed)
* **URL:** \`/bid/YOUR_TOURNAMENT_SLUG\`
* **Credentials:**
  * **Step 1:** Select your **Team Name** from the dropdown.
  * **Step 2:** Enter your team's **4-Digit Bidding PIN** (e.g. \`4829\`).
  * *(Organizers can find and edit all team PINs in the **Teams** tab of the Organizer panel).*
* **Access Granted:** Live mobile handheld bidding pad with one-tap bid button and real-time purse balance.

---

#### 3. 🛡️ Super Admin Login
* **URL:** \`/super-admin/login\`
* **Credentials:** Master Administrator email and password.
* **Access Granted:** Global overview of all tournaments, organizer pass statuses, revenue, and system settings.

---

#### 4. 🏏 Do Players Need to Log In?
* **No!** Players **do not need an account or password**.
* Players simply submit the public registration form once at:  
  \`/register/player/YOUR_TOURNAMENT_SLUG\`
`
  },
  {
    id: "how_to_auction",
    triggers: [
      "how to auction", "how to do auction", "how to run", "start auction", "conduct auction",
      "auctioneer", "bidding rules", "live bidding", "step by step auction", "organizer guide",
      "next player", "mark sold", "mark unsold", "undo bid", "live auction"
    ],
    title: "🔨 Complete Step-by-Step Guide to Running a Live Auction",
    summary: "The full workflow from category selection to declaring winners.",
    content: `
### 🔨 Step-by-Step Guide to Conducting a Live Auction

Follow this step-by-step master workflow:

1. **Step 1 — Pre-Auction Setup:**
   * In **Settings**, define your **Total Team Purse** (e.g. ₹50,000) and **Squad Quotas** (e.g. 11–15 players).
   * In **Categories & Points**, create tiers (e.g., *Diamond = ₹5,000, Gold = ₹2,000, Silver = ₹1,000*).
   * In **Players**, approve registered players and assign each player to a Category.
   * In **Teams**, approve teams and note their 4-digit bidding PINs.

2. **Step 2 — Launch Live Auction Console:**
   * Click **Live Auction** from the organizer sidebar (or **"🚀 Launch Live Auction"** on Dashboard).

3. **Step 3 — Pick Category & Shuffle Queue:**
   * Select the category to auction first (e.g. *Diamond Icon Players*).
   * Click **🔀 Shuffle Queue** (optional) to randomize the player order for fairness.

4. **Step 4 — Call Next Player:**
   * Click **▶ Next Player**. The player’s photo, role, stats, and base price appear on all screens (Live Auction, Spectator \`/watch/:slug\`, and OBS Stream Overlay).

5. **Step 5 — Accept Bids:**
   * Place bids using the **Team Bid Buttons** on your screen, or have team captains bid from their phones at \`/bid/:slug\`.
   * The countdown timer automatically resets on every bid.

6. **Step 6 — Finalize Sale:**
   * Click **🔨 Mark Sold** (or let the countdown timer reach 00:00).
   * A 3D rubber stamp **SOLD!** animates with sound, the player is assigned to the winning team, and purse balances deduct automatically.
   * If nobody bids, click **✕ Mark Unsold**.

7. **Step 7 — Exports & PDF Reports:**
   * When all players are auctioned, visit **History & Downloads** to download official PDF team squads and financial ledgers!
`
  },
  {
    id: "obs_studio",
    triggers: [
      "obs", "obs studio", "stream", "overlay", "broadcast", "youtube", "twitch", "facebook live",
      "video source", "browser source", "lower third", "tv graphics", "connect obs", "stream overlay",
      "how to stream", "stream graphics", "obs setup"
    ],
    title: "🎥 How to Connect OBS Studio to the Stream Overlay",
    summary: "Complete step-by-step guide to connect Auction Arena live graphics to OBS Studio or vMix.",
    content: `
### 🎥 Connecting OBS Studio to Auction Arena Live Stream Overlay

Broadcast TV-quality cricket/tennis auction graphics directly to YouTube or Facebook Live:

1. **Copy Your Stream Overlay URL:**
   * Open **Dashboard** or **Settings** in the Organizer panel.
   * Click **🎥 OBS Stream Overlay** or **⚙️ Configure & Copy Link**.
   * Your unique broadcast link is:  
     \`http://your-domain.com/overlay/YOUR_TOURNAMENT_SLUG\`

2. **Add Browser Source in OBS Studio:**
   * Open **OBS Studio** on your laptop/streaming PC.
   * In the **Sources** dock at the bottom, click **\`+\` (Add)**.
   * Select **Browser** and name it \`Auction Arena Overlay\`.

3. **Configure Browser Properties:**
   * **URL:** Paste your copied overlay link.
   * **Width:** \`1920\`
   * **Height:** \`1080\`
   * **FPS:** \`60\` (recommended for smooth 3D stamp animations).
   * Check **"Shutdown source when not visible"** and **"Refresh browser when scene becomes active"**.

4. **100% Transparency Built-in:**
   * The overlay has a transparent canvas by default. Place your camera/video feed source **beneath** the browser source in OBS to display live lower-thirds and scoreboard overlays over your video!
`
  },
  {
    id: "team_pins_remote",
    triggers: [
      "pin", "team pin", "bidding remote", "mobile bid", "team login",
      "handheld", "how do team owners log in", "remote pad", "phone bidding",
      "captain bid", "team password", "4 digit pin"
    ],
    title: "🔑 How Team Owners Log into the Mobile Bidding Remote with PINs",
    summary: "Guide to 4-digit bidding PINs, team logins, and handheld bidding pads.",
    content: `
### 🔑 Team Remote Bidding & 4-Digit PIN Guide

Team owners and captains can place bids directly from their mobile phones:

1. **Where to Find Team PINs:**
   * In the Organizer panel, click the **Teams** tab.
   * Every approved team has an auto-generated **4-Digit Bidding PIN** (e.g. \`4829\`).
   * Organizers can view, edit, or customize any team's PIN and click **Save**.

2. **Sharing the Remote Bidding Link:**
   * Share the public remote URL with team owners:  
     \`http://your-domain.com/bid/YOUR_TOURNAMENT_SLUG\`

3. **How Team Owners Log In:**
   * The owner opens the link on their smartphone.
   * Selects their **Team Name** from the list.
   * Enters their **4-digit PIN** and taps **"Unlock Bidding Remote"**.

4. **Remote Handheld Bidding Features:**
   * **Giant BID Button:** Sub-second instant WebSocket bidding.
   * **Live Purse Meter:** Updates in real-time as points are spent.
   * **Smart Protection:** Automatically disables when the team is out of purse or already holding the highest bid.
   * **Haptic Vibration & Sounds:** Phones vibrate and chime on successful bids!
`
  },
  {
    id: "re_auction_unsold",
    triggers: [
      "re-auction", "re auction", "unsold", "round 2", "second round",
      "bring back unsold", "how to re-auction", "unsold players", "un-sold", "second chance"
    ],
    title: "🔄 How to Start a Round 2 Re-Auction for Unsold Players",
    summary: "Steps to bring back all unsold players for rapid secondary bidding.",
    content: `
### 🔄 Starting a Round 2 Re-Auction for Unsold Players

Give unsold players a second chance with 1 click:

1. **Open Live Auction:**
   * Navigate to the **Live Auction** tab in the organizer sidebar.

2. **Click Re-Auction Unsold:**
   * Once regular categories are completed, locate the **"🔄 Re-Auction Unsold Players"** button in the category header or controls bar.

3. **What Happens Automatically:**
   * All players with status \`UNSOLD\` are re-queued as \`PENDING\` in a special **Round 2 Queue**.
   * Their original base prices remain intact (you can also adjust base prices in the **Players** tab if you wish to lower them before starting).
   * Click **🔀 Shuffle Queue** and **▶ Next Player** to start Round 2 bidding!

4. **Live Spectator & Cricbuzz Feed:**
   * Spectators on \`/watch/:slug\` will automatically see a **"ROUND 2: RE-AUCTION"** banner on the live commentary feed and hear the AI announce the round!
`
  },
  {
    id: "voice_and_timer",
    triggers: [
      "voice", "ai voice", "commentary", "timer", "countdown", "seconds",
      "priya", "ananya", "victoria", "samantha", "kabir", "speech", "accent", "pitch",
      "speed", "auctioneer voice", "audio announcements"
    ],
    title: "🎙️ How to Customize the AI Voice Persona & Countdown Timer",
    summary: "Configuring 5 auctioneer voices, speech rates, pitch, and countdown auto-sold rules.",
    content: `
### 🎙️ Customizing AI Voice Commentary & Countdown Timers

#### 1. AI Voice Studio (5 Personas):
* In **Live Auction** or **Watch Live**, click **⚙️ Voice Settings** (or the Voice icon).
* Choose from 5 distinct commentary voices:
  1. **Priya (Indian English Pro):** Authentic IPL auctioneer style with crisp cadence.
  2. **Ananya (High-Energy Stadium):** Punchy, dynamic delivery ideal for fast-paced leagues.
  3. **Victoria (British Royal):** Sophisticated, formal tournament tone.
  4. **Samantha (Studio Host):** Smooth broadcast television delivery.
  5. **Kabir (Bold Male):** Deep authoritative auctioneer presence.
* **Tuning Controls:** Adjust **Speech Speed** (0.8x to 1.4x) and **Pitch** to match your room acoustics!

#### 2. Synchronized Countdown Timer:
* Go to **Settings** in the organizer sidebar.
* Under **Auction Countdown Timer Rules**:
  * Toggle **Enable Timer** ON or OFF.
  * Set **Timer Duration** (e.g., \`15s\`, \`30s\`, or \`45s\`).
* **Auto-Reset Behavior:** Every new bid placed resets the countdown clock back to full duration automatically.
* **Auto-Sold on 00:00:** When the clock hits zero, the player is automatically stamped **SOLD** to the highest bidder!
`
  },
  {
    id: "pass_and_renew",
    triggers: [
      "buy software", "pass", "tournament pass", "1 month pass", "renew", "price",
      "payment", "razorpay", "how much", "cost", "subscription", "activate pass",
      "expired pass", "buy pass", "software license"
    ],
    title: "💳 Tournament Pass, Pricing & Renewals",
    summary: "How to purchase, activate, or renew your 1-Month Tournament Pass.",
    content: `
### 💳 Tournament Pass & Software Activation

Auction Arena offers simple, transparent tournament licensing:

1. **1-Month Tournament Pass:**
   * Full access to all features (unlimited players, unlimited teams, live bidding, AI voice commentary, OBS overlay, and PDF reports) for **30 days**.
   * Accessible at \`/get-started\` or by clicking **"Get Started"** on the home page.

2. **Renewing an Expired Pass:**
   * If your tournament pass expires, log in to your organizer account.
   * You will be directed to \`/organizer/renew\`.
   * Complete payment via **Razorpay (UPI, Credit/Debit Card, NetBanking)** for instant 30-day reactivation.

3. **Data Preservation Guarantee:**
   * All your players, teams, categories, photos, and bid history remain 100% saved and intact even when a pass expires!
`
  },
  {
    id: "player_registration",
    triggers: [
      "register player", "player registration", "add player", "approve player",
      "player photo", "player fee", "player list", "how to add player",
      "how players register", "player category", "player base price"
    ],
    title: "👥 Player Registrations, Approvals & Category Assignments",
    summary: "How players sign up, pay fees, and how organizers approve them.",
    content: `
### 👥 Player Registration & Approval Workflow

1. **Public Registration Link:**
   * Share with players: \`http://your-domain.com/register/player/YOUR_SLUG\`
   * Players enter Name, Age, Phone, Role (Batsman, Bowler, All-Rounder), Batting/Bowling Style, and upload their photo (automatically compressed in browser!).
   * If you set a Registration Fee in **Settings**, players pay via Razorpay before submission.

2. **Organizers Approving Players:**
   * Go to **Players** tab in the Organizer panel.
   * Check the **Approve** checkbox for each player.
   * Assign a **Category** from the dropdown (Base price auto-populates).
   * Click **💾 Save All Changes** (or Save on individual rows).
`
  },
  {
    id: "team_registration",
    triggers: [
      "register team", "team registration", "add team", "approve team",
      "team logo", "team fee", "how to add team", "team quota", "team purse", "purse balance"
    ],
    title: "🛡️ Team Registration, Approvals & Purse Setup",
    summary: "How team owners register, submit logos, and get approved.",
    content: `
### 🛡️ Team Registration & Management

1. **Public Team Registration:**
   * Share: \`http://your-domain.com/register/team/YOUR_SLUG\`
   * Team owners enter Team Name, Owner Name, Phone, upload Team Logo, and indicate if the Owner plays in matches.

2. **Adding Teams Manually:**
   * Go to **Teams** tab in Organizer panel.
   * Click **+ Add Team Manually** to register a team directly without public link.

3. **Approving Teams & Initial Purse:**
   * Approved teams automatically receive the tournament's **Max Team Purse** (configured in **Settings**, e.g. ₹50,000).
   * Note the team's **4-Digit Bidding PIN** for mobile bidding on auction day.
`
  },
  {
    id: "categories_points",
    triggers: [
      "category", "categories", "base price", "diamond", "gold", "silver",
      "point set", "extra points", "bonus purse", "retention", "point rules"
    ],
    title: "💎 Categories, Base Prices & Retention Points",
    summary: "How to tier players and grant extra retention point sets.",
    content: `
### 💎 Categories & Point Sets Guide

1. **Creating Categories:**
   * Go to **Categories & Points** tab.
   * Enter a Category Name (e.g. \`Diamond Icon\`, \`Grade A\`) and Base Price (e.g. \`₹5,000\`).
   * Order categories so high-tier players are auctioned first.

2. **Extra Point Sets & Retention:**
   * Scroll to **Extra Point Sets** on the same page.
   * Create bonus allocations (e.g., \`Captain Retention Bonus (+₹10,000)\`).
   * Select a team and click **Grant Points** to immediately expand their purse!
`
  },
  {
    id: "settings_rules",
    triggers: [
      "settings", "rules", "max purse", "purse limit", "min players", "max players",
      "squad quota", "registration fee", "turn off registration", "close registration",
      "countdown duration", "bid increment"
    ],
    title: "⚙️ Tournament Settings & Rule Configurations",
    summary: "Configuring purse caps, squad quotas, fees, and timers.",
    content: `
### ⚙️ Tournament Settings & Rules

Manage all rules from the **Settings** tab in the Organizer panel:

* **Player / Team Registration Switch:** Turn ON to accept registrations or OFF to lock entries before auction day.
* **Max Team Purse:** Starting purse for all teams (e.g. ₹50,000).
* **Squad Size Quotas:** Set Minimum (e.g. 11) and Maximum (e.g. 15) players per team.
* **Registration Fees:** Set ₹ entry fees for player or team signups (or ₹0 for free).
* **Countdown Timer:** Enable/disable timer and set duration (e.g. 30 seconds).
* **Team Owner Remote Bidding:** Toggle whether team owners can bid from mobile phones.
`
  },
  {
    id: "reports_pdf",
    triggers: [
      "pdf", "download", "report", "roster", "history", "audit", "ledger",
      "export", "summary pdf", "print", "financial ledger"
    ],
    title: "📜 Downloading PDF Rosters & Financial Ledgers",
    summary: "Exporting official tournament audit trails and team squad rosters.",
    content: `
### 📜 PDF Reports & Audit Downloads

Download print-ready tournament summaries from **History & Downloads**:

1. **Full Auction History PDF:**
   * Click **📥 Download Full Auction History (PDF)**.
   * Contains complete chronological record of every bid, winning team, final price, and unsold list.

2. **Per-Team Squad Roster PDFs:**
   * Click any individual team button (e.g. \`Royal Strikers PDF\`).
   * Generates a squad sheet listing acquired players, roles, ages, purchase prices, and remaining purse.

3. **Tournament Financial Ledger:**
   * Shows initial starting purse, total money spent, and balance remaining for all franchises.
`
  },
  {
    id: "simulator_demo",
    triggers: [
      "simulator", "demo", "practice", "mock auction", "ai bot", "test bidding",
      "bot bidders", "rehearse", "seed data", "test mode", "mock mode"
    ],
    title: "🎮 Practice & Demo Auction Simulator",
    summary: "1-Click seed mock teams and players to rehearse before the live event.",
    content: `
### 🎮 Practice & Demo Auction Simulator

Rehearse your auction before the real event without touching real data:

1. **Open Simulator:**
   * On **Dashboard** or **Live Auction**, click **🚀 Open Practice Simulator**.

2. **1-Click Seed:**
   * Click **"🌱 Seed Realistic Tournament Data"** to generate 4 teams and 12 categorized players with photos.

3. **Simulated AI Bot Bidders:**
   * In **Live Auction**, activate **🤖 AI Bot Bidder** to watch simulated franchises engage in realistic bidding wars with voice commentary.

4. **1-Click Clean Reset:**
   * Click **"🗑️ Clear Practice Data"** in the simulator modal when done.
`
  },
  {
    id: "whatsapp_invite",
    triggers: [
      "whatsapp", "message", "invite", "share", "draft", "social media",
      "announcement", "text template", "promo", "flyer"
    ],
    title: "📲 Ready-to-Copy WhatsApp Registration Announcement Template",
    summary: "Pre-formatted WhatsApp message ready to copy & paste into groups.",
    content: `
### 📲 Ready-to-Copy WhatsApp Announcement Template

Copy and paste this message into your WhatsApp groups:

\`\`\`text
🏏 *OFFICIAL TOURNAMENT ANNOUNCEMENT* 🏏
🏆 *[Your Tournament Name 2026]*

Registrations are officially OPEN! Don't miss your chance to be part of the grand player auction.

👉 *Player Registration Link:*
https://your-domain.com/register/player/[slug]

👉 *Team Owner Registration Link:*
https://your-domain.com/register/team/[slug]

📺 *Watch the Live Auction Broadcast:*
https://your-domain.com/watch/[slug]

⚡ Features: Real-time Live Bidding, AI Voice Commentary & TV Stream Overlay!
📅 *Auction Date:* [Date]
📍 *Venue:* [Ground / Online]
\`\`\`
`
  }
];

/**
 * Intelligent question analysis and dynamic response generation.
 */
export function queryAIAssistant(userQuery, context = {}) {
  if (!userQuery || !userQuery.trim()) {
    return {
      title: "How can I help you?",
      text: "Ask me anything about setting up tournaments, OBS overlays, team PINs, AI commentary, login methods, or bidding rules!",
      suggestions: [
        "How to login to my account?",
        "How to connect OBS Studio?",
        "How do team PINs work?",
        "How to run live auction step by step?",
        "How to start Round 2 Re-Auction?"
      ]
    };
  }

  const query = userQuery.toLowerCase().trim();

  // 1. Check for purse / math calculation queries (e.g. "I have 25000 purse and need 4 players...")
  const mathMatch = query.match(/(\d[\d,]*)\s*(?:purse|budget|points|rs|inr).*?(\d+)\s*(?:player|players|slot|slots)/i) ||
                    query.match(/(\d+)\s*(?:player|players|slot|slots).*?(\d[\d,]*)\s*(?:purse|budget|points|rs|inr)/i);
  if (mathMatch) {
    let purseVal = parseInt(mathMatch[1].replace(/,/g, ""), 10);
    let playerVal = parseInt(mathMatch[2], 10);
    if (purseVal < playerVal) {
      const temp = purseVal;
      purseVal = playerVal;
      playerVal = temp;
    }
    const minReservePerPlayer = 500;
    const remainingSlotsNeeded = Math.max(1, playerVal - 1);
    const reservedAmount = remainingSlotsNeeded * minReservePerPlayer;
    const maxSafeBid = Math.max(0, purseVal - reservedAmount);

    return {
      title: "🧮 Purse & Max Bid Calculation",
      text: `
### 🧮 Max Bid Strategy Calculation

* **Total Remaining Purse:** ₹${purseVal.toLocaleString("en-IN")}
* **Players Needed:** ${playerVal}
* **Reserved for Remaining ${remainingSlotsNeeded} Slot(s):** ₹${reservedAmount.toLocaleString("en-IN")} *(assuming ₹${minReservePerPlayer} base price)*

🎯 **Maximum Safe Bid for this Player:**
**₹${maxSafeBid.toLocaleString("en-IN")}**

> 💡 *Tip: If your tournament has a higher minimum base price (e.g., ₹1,000 or ₹2,000), multiply the remaining ${remainingSlotsNeeded} slot(s) by that base price to ensure you don't run out of funds!*
      `,
      suggestions: ["How do team PINs work?", "How to login to my account?", "OBS Studio setup"]
    };
  }

  // 2. Score matching topics based on word tokens and trigger keywords
  const queryTokens = query.split(/\s+/).filter(w => w.length > 2);
  let bestTopic = null;
  let highestScore = 0;

  for (const topic of KNOWLEDGE_TOPICS) {
    let score = 0;
    for (const trigger of topic.triggers) {
      // Exact substring match
      if (query.includes(trigger)) {
        score += trigger.length * 3;
      }
      // Word token match
      for (const token of queryTokens) {
        if (trigger.includes(token)) {
          score += token.length;
        }
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestTopic = topic;
    }
  }

  if (bestTopic && highestScore > 0) {
    return {
      title: bestTopic.title,
      text: bestTopic.content.trim(),
      suggestions: KNOWLEDGE_TOPICS.filter(t => t.id !== bestTopic.id).slice(0, 3).map(t => t.title.split(" — ")[0].replace(/^[^\w]+/, ""))
    };
  }

  // 3. Fallback smart generic guide
  return {
    title: "🤖 Auction Arena Knowledge Base",
    text: `
Here are the most common guides for **Auction Arena**:

* **🔐 How to Log In:** Organizers log in at \`/organizer/login\` with Email & Password. Team owners use 4-digit PINs at \`/bid/:slug\`.
* **🎥 OBS Studio Overlay:** Add a Browser Source with \`1920x1080\` pointing to \`/overlay/:slug\`.
* **🔑 Team Bidding Remote:** Share 4-digit PINs from the **Teams** tab so owners can bid on smartphones.
* **🔄 Round 2 Re-Auction:** Click "Re-Auction Unsold" in the Live Auction console to restart bidding for unsold players.
* **🎙️ AI Voice Commentary:** Choose from 5 voices (Priya, Ananya, Victoria, Samantha, Kabir) in Voice Settings.
* **📜 Download Rosters:** Export team rosters and financial ledgers in **History & Downloads**.

Type any question above to see the full detailed tutorial!
    `,
    suggestions: [
      "How to login to my account?",
      "How to connect OBS Studio?",
      "How do team PINs work?",
      "How to run live auction step by step?"
    ]
  };
}
