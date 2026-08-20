// AI Auctioneer Voice Commentary Engine using Web Speech Synthesis API.
// Features 5 selectable voice personas with custom pitch, rate, sample preview,
// and natural Indian currency formatting.

export const VOICE_PROFILES = [
  {
    id: "priya_indian_pro",
    name: "Priya — Indian English Pro",
    tagline: "Natural Indian accent with clear IPL-style enunciation",
    gender: "Female",
    accent: "Indian English (en-IN)",
    defaultRate: 1.05,
    defaultPitch: 1.05,
    matchKeywords: ["heera", "swara", "neerja", "veena", "aditi", "raveena", "en-in", "india"],
    fallbackLang: "en-IN",
  },
  {
    id: "ananya_high_energy",
    name: "Ananya — High-Energy Stadium Auctioneer",
    tagline: "Fast-paced, vibrant and exciting stadium atmosphere",
    gender: "Female",
    accent: "Fast & Punchy",
    defaultRate: 1.15,
    defaultPitch: 1.2,
    matchKeywords: ["female", "zira", "samantha", "karen", "moira", "en-in", "en-us"],
    fallbackLang: "en-US",
  },
  {
    id: "victoria_british_royal",
    name: "Victoria — British Royal Auctioneer",
    tagline: "Polished, prestigious Sotheby's & Lord's cricket club vibe",
    gender: "Female",
    accent: "British English (en-GB)",
    defaultRate: 1.0,
    defaultPitch: 1.0,
    matchKeywords: ["victoria", "uk", "british", "great britain", "en-gb", "hazel", "george"],
    fallbackLang: "en-GB",
  },
  {
    id: "samantha_studio_host",
    name: "Samantha — Studio Broadcast Host",
    tagline: "Smooth, articulate modern broadcast TV presenter",
    gender: "Female",
    accent: "US English (en-US)",
    defaultRate: 1.06,
    defaultPitch: 1.08,
    matchKeywords: ["samantha", "zira", "google us", "natural", "en-us", "ava", "jenny"],
    fallbackLang: "en-US",
  },
  {
    id: "kabir_ipl_hammer",
    name: "Kabir — Bold IPL Hammer Auctioneer",
    tagline: "Deep, commanding stadium-filling auctioneer voice",
    gender: "Male",
    accent: "Deep Male (en-IN / en-GB)",
    defaultRate: 1.05,
    defaultPitch: 0.9,
    matchKeywords: ["david", "mark", "rishi", "george", "daniel", "male", "en-in", "en-gb"],
    fallbackLang: "en-IN",
  },
];

let allVoices = [];
let voicesLoaded = false;

// Initializes and caches available system voices
export function initVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];

  const list = window.speechSynthesis.getVoices();
  if (list && list.length > 0) {
    allVoices = list;
    voicesLoaded = true;
  }
  return allVoices;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  initVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    initVoices();
  };
}

export function getAvailableSystemVoices() {
  if (!voicesLoaded || allVoices.length === 0) {
    initVoices();
  }
  return allVoices;
}

// Retrieves current active voice profile ID
export function getActiveProfileId() {
  if (typeof window === "undefined") return VOICE_PROFILES[0].id;
  return localStorage.getItem("aiAuctioneer_profileId") || VOICE_PROFILES[0].id;
}

// Sets active voice profile ID
export function setActiveProfileId(profileId) {
  if (typeof window === "undefined") return;
  localStorage.setItem("aiAuctioneer_profileId", profileId);
}

// Finds the matching SpeechSynthesisVoice object for a given profile
export function resolveVoiceForProfile(profileId, customVoiceUri = null) {
  const voices = getAvailableSystemVoices();
  if (!voices || voices.length === 0) return null;

  // If a specific voice URI was manually chosen
  if (customVoiceUri) {
    const direct = voices.find((v) => v.voiceURI === customVoiceUri || v.name === customVoiceUri);
    if (direct) return direct;
  }

  const profile = VOICE_PROFILES.find((p) => p.id === profileId) || VOICE_PROFILES[0];
  const isMaleProfile = profile.gender === "Male";

  // Try matching keywords in order
  for (const keyword of profile.matchKeywords) {
    const match = voices.find((v) => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      const matchesKeyword = name.includes(keyword) || lang.includes(keyword);
      if (!matchesKeyword) return false;

      // Filter by gender if possible
      if (isMaleProfile) {
        return !name.includes("female") && !name.includes("zira") && !name.includes("heera") && !name.includes("samantha");
      }
      return true;
    });
    if (match) return match;
  }

  // Fallback to language
  const langFallback = voices.find((v) => v.lang.toLowerCase().startsWith(profile.fallbackLang.toLowerCase().slice(0, 2)));
  if (langFallback) return langFallback;

  // Ultimate fallback
  return voices.find((v) => v.lang.startsWith("en")) || voices[0];
}

// Converts currency numbers to clear, natural-sounding spoken words
export function formatRupeesSpeech(amount) {
  const num = Number(amount) || 0;
  if (num === 0) return "Zero rupees";

  if (num >= 100000) {
    const lakhs = (num / 100000).toFixed(num % 100000 === 0 ? 0 : 1);
    return `${lakhs} lakh rupees`;
  }
  if (num >= 1000) {
    const thousands = (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1);
    return `${thousands} thousand rupees`;
  }
  return `${num} rupees`;
}

// Speaks the given text with the configured profile
export function speak(text, options = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  // Cancel any ongoing speech so rapid new events trigger immediately
  window.speechSynthesis.cancel();

  if (!voicesLoaded || allVoices.length === 0) {
    initVoices();
  }

  const profileId = options.profileId || getActiveProfileId();
  const profile = VOICE_PROFILES.find((p) => p.id === profileId) || VOICE_PROFILES[0];
  const customVoiceUri = options.customVoiceUri || localStorage.getItem("aiAuctioneer_customVoiceUri");

  const voice = resolveVoiceForProfile(profileId, customVoiceUri);
  const utterance = new SpeechSynthesisUtterance(text);

  if (voice) {
    utterance.voice = voice;
  }

  // Rate & Pitch customization
  const userRate = parseFloat(localStorage.getItem("aiAuctioneer_rate"));
  const userPitch = parseFloat(localStorage.getItem("aiAuctioneer_pitch"));

  utterance.rate = options.rate || (!isNaN(userRate) ? userRate : profile.defaultRate);
  utterance.pitch = options.pitch || (!isNaN(userPitch) ? userPitch : profile.defaultPitch);
  utterance.volume = options.volume !== undefined ? options.volume : 1.0;

  if (options.onEnd) {
    utterance.onend = options.onEnd;
    utterance.onerror = options.onEnd;
  }

  window.speechSynthesis.speak(utterance);
}

// Plays a sample test phrase for auditioning voices
export function testVoiceSample(profileId, onEnd) {
  const profile = VOICE_PROFILES.find((p) => p.id === profileId) || VOICE_PROFILES[0];
  const samplePhrases = [
    `Welcome to the live auction! 15 thousand rupees by Royal Strikers. Going once, going twice... Sold to Royal Strikers!`,
    `Next player up is Virat Sharma, category Diamond. Base price 5 thousand rupees. Any bids?`,
  ];
  const text = samplePhrases[0];
  speak(text, { profileId: profile.id, rate: profile.defaultRate, pitch: profile.defaultPitch, onEnd });
}

// Cancels any ongoing commentary
export function stopCommentary() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

// 1. Announce Player Introduction at the start of bidding
export function announcePlayerIntroduction(player, category) {
  if (!player) return;
  const name = player.name || "Next player";
  const role = player.playerType ? player.playerType.toLowerCase() : "player";
  const catName = category?.name ? `Category ${category.name}` : "";
  const basePrice = formatRupeesSpeech(player.basePrice);

  const intro = `Next player up for auction: ${name}, ${role}. ${catName ? `${catName}. ` : ""}Base price is ${basePrice}! Who will open the bidding?`;
  speak(intro);
}

// 2. Announce New Highest Bid
export function announceBid(teamName, amount) {
  if (!teamName || amount === undefined) return;
  const priceSpeech = formatRupeesSpeech(amount);

  const bidPhrases = [
    `${priceSpeech} by ${teamName}!`,
    `${teamName} bids ${priceSpeech}!`,
    `We have ${priceSpeech} from ${teamName}!`,
  ];
  const phrase = bidPhrases[Math.floor(Math.random() * bidPhrases.length)];
  speak(phrase);
}

// 3. Announce 10-Second Warning (when no bids for 10 seconds)
export function announceTenSecondWarning(teamName, amount, playerName, basePrice) {
  if (teamName && amount) {
    const priceSpeech = formatRupeesSpeech(amount);
    const phrases = [
      `Current highest bid is ${priceSpeech} with ${teamName}! Any more bids?`,
      `We are at ${priceSpeech} with ${teamName}! Any other bids?`,
      `Highest bid ${priceSpeech} by ${teamName}! Are we all done?`,
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    speak(phrase);
  } else {
    const name = playerName || "this player";
    const base = basePrice !== undefined ? formatRupeesSpeech(basePrice) : "base price";
    speak(`Looking for an opening bid of ${base} for ${name}!`);
  }
}

// 4. Announce Last 4 Seconds Warning ("Going once... Going twice...")
export function announceGoingOnceGoingTwice(teamName, amount, playerName) {
  if (teamName && amount) {
    const priceSpeech = formatRupeesSpeech(amount);
    speak(`Going once... Going twice... at ${priceSpeech} to ${teamName}!`);
  } else {
    const name = playerName || "this player";
    speak(`Going once... Going twice... Final call for ${name}!`);
  }
}

// 5. Announce Player SOLD
export function announceSold(playerName, teamName, amount) {
  const name = playerName || "The player";
  const team = teamName || "the highest bidder";
  const priceSpeech = amount !== undefined ? ` for ${formatRupeesSpeech(amount)}` : "";

  const soldText = `Sold! ${name} is sold to ${team}${priceSpeech}!`;
  speak(soldText);
}

// 6. Announce Player UNSOLD
export function announceUnsold(playerName) {
  const name = playerName || "Player";
  const unsoldText = `And... ${name} is unsold!`;
  speak(unsoldText);
}
