/**
 * Ultra-Realistic AI Auctioneer Voice Commentary Engine.
 * Supports authentic Hinglish (हिंग्लिश), Hindi (हिन्दी), Indian English,
 * and British/US broadcast styles with neural voice ranking,
 * gavel sound effects, and human breathing prosody.
 */

import { playGavelStrike } from "./sounds";

export const VOICE_PROFILES = [
  {
    id: "hinglish_ipl_host",
    name: "Ananya / Neerja — IPL Hinglish Host (हिंग्लिश)",
    tagline: "Fast & energetic mix of Hindi + English stadium commentary",
    gender: "Female",
    accent: "Hinglish (India)",
    langMode: "hinglish",
    badge: "⚡ Hinglish Mix",
    defaultRate: 1.04,
    defaultPitch: 1.04,
    matchKeywords: [
      "neerja online (natural)", "neerja", "swara online (natural)", "swara", "heera", "aditi",
      "en-in", "hi-in", "india"
    ],
    fallbackLang: "en-IN",
  },
  {
    id: "hinglish_kabir_male",
    name: "Kabir / Prabhat — Desi Hinglish Hammer (दमदार हिंग्लिश)",
    tagline: "Bold, punchy stadium-filling Hinglish auctioneer voice",
    gender: "Male",
    accent: "Hinglish Male (India)",
    langMode: "hinglish",
    badge: "⚡ Hinglish Male",
    defaultRate: 1.02,
    defaultPitch: 0.96,
    matchKeywords: [
      "prabhat online (natural)", "prabhat", "madhur", "rishi (enhanced)", "rishi", "david",
      "male en-in", "en-in", "hi-in"
    ],
    fallbackLang: "en-IN",
  },
  {
    id: "hindi_swara_natural",
    name: "Swara / Neerja — Hindi Auctioneer (हिन्दी उद्घोषक)",
    tagline: "शुद्ध और उत्साहपूर्ण हिंदी बोली और आईपीएल स्टाइल नीलामी",
    gender: "Female",
    accent: "Hindi (हिन्दी)",
    langMode: "hi",
    badge: "🇮🇳 शुद्ध हिन्दी",
    defaultRate: 1.02,
    defaultPitch: 1.02,
    matchKeywords: [
      "swara online (natural)", "swara natural", "swara", "kalpana",
      "google हिन्दी", "hindi", "hi-in", "hi_in", "neerja"
    ],
    fallbackLang: "hi-IN",
  },
  {
    id: "hindi_madhur_male",
    name: "Madhur / Kabir — Hindi Stadium Hammer (दमदार हिंदी)",
    tagline: "गंभीर, दमदार आवाज में स्टेडियम जैसी हिंदी नीलामी",
    gender: "Male",
    accent: "Hindi Male (हिन्दी)",
    langMode: "hi",
    badge: "🇮🇳 दमदार हिन्दी",
    defaultRate: 1.0,
    defaultPitch: 0.95,
    matchKeywords: [
      "madhur online (natural)", "madhur natural", "hemant",
      "google हिन्दी", "hindi male", "male hi", "hi-in"
    ],
    fallbackLang: "hi-IN",
  },
  {
    id: "neerja_indian_natural",
    name: "Neerja / Priya — Indian English Pro",
    tagline: "Ultra-natural Indian English with crisp IPL broadcast cadence",
    gender: "Female",
    accent: "Indian English (Natural)",
    langMode: "en",
    badge: "✨ English (IN)",
    defaultRate: 1.02,
    defaultPitch: 1.02,
    matchKeywords: [
      "neerja online (natural)", "neerja natural", "swara online (natural)",
      "heera", "aditi", "raveena", "en-in", "india"
    ],
    fallbackLang: "en-IN",
  },
  {
    id: "jenny_broadcast_host",
    name: "Jenny / Samantha — Global TV Presenter",
    tagline: "Smooth, articulate broadcast television host delivery",
    gender: "Female",
    accent: "US English (Studio Natural)",
    langMode: "en",
    badge: "🎙️ English (US)",
    defaultRate: 1.04,
    defaultPitch: 1.04,
    matchKeywords: [
      "jenny online (natural)", "jenny natural", "ava natural", "samantha (enhanced)",
      "samantha natural", "zira natural", "google us natural", "en-us"
    ],
    fallbackLang: "en-US",
  },
  {
    id: "andrew_british_royal",
    name: "Andrew / Victoria — British Royal Auctioneer",
    tagline: "Prestigious Sotheby's & Lord's cricket club auctioneer tone",
    gender: "Male",
    accent: "British English (Natural)",
    langMode: "en",
    badge: "👑 English (UK)",
    defaultRate: 0.98,
    defaultPitch: 0.98,
    matchKeywords: [
      "andrew online (natural)", "brian online (natural)", "george online (natural)",
      "sonia online (natural)", "daniel (enhanced)", "en-gb", "british"
    ],
    fallbackLang: "en-GB",
  },
];

let allVoices = [];
let voicesLoaded = false;

// Initializes and caches available system voices with quality ranking
export function initVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];

  const list = window.speechSynthesis.getVoices();
  if (list && list.length > 0) {
    allVoices = [...list].sort((a, b) => {
      const aScore = getVoiceQualityScore(a);
      const bScore = getVoiceQualityScore(b);
      return bScore - aScore;
    });
    voicesLoaded = true;
  }
  return allVoices;
}

function getVoiceQualityScore(v) {
  const name = (v.name || "").toLowerCase();
  const lang = (v.lang || "").toLowerCase();
  let score = 0;
  if (name.includes("natural") || name.includes("neural") || name.includes("online")) score += 100;
  if (name.includes("enhanced") || name.includes("studio") || name.includes("premium")) score += 50;
  if (lang.startsWith("hi") || name.includes("हिन्दी") || name.includes("hindi")) score += 35;
  if (lang.startsWith("en-in") || lang.startsWith("en_in")) score += 25;
  if (lang.startsWith("en")) score += 10;
  return score;
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

export function getActiveProfileId() {
  if (typeof window === "undefined") return VOICE_PROFILES[0].id;
  return localStorage.getItem("aiAuctioneer_profileId") || VOICE_PROFILES[0].id;
}

export function setActiveProfileId(profileId) {
  if (typeof window === "undefined") return;
  localStorage.setItem("aiAuctioneer_profileId", profileId);
}

// Detects active language mode: 'hinglish' | 'hi' | 'en'
export function getActiveLanguageMode() {
  const customVoiceUri = typeof window !== "undefined" ? localStorage.getItem("aiAuctioneer_customVoiceUri") : null;
  if (customVoiceUri) {
    const voices = getAvailableSystemVoices();
    const v = voices.find((vox) => vox.voiceURI === customVoiceUri || vox.name === customVoiceUri);
    if (v) {
      const vLang = (v.lang || "").toLowerCase();
      const vName = (v.name || "").toLowerCase();
      if (vLang.startsWith("hi") || vName.includes("hindi") || vName.includes("हिन्दी")) {
        return "hi";
      }
    }
  }
  const profileId = getActiveProfileId();
  const profile = VOICE_PROFILES.find((p) => p.id === profileId) || VOICE_PROFILES[0];
  return profile.langMode || "hinglish";
}

// Finds the best SpeechSynthesisVoice object for a profile
export function resolveVoiceForProfile(profileId, customVoiceUri = null) {
  const voices = getAvailableSystemVoices();
  if (!voices || voices.length === 0) return null;

  if (customVoiceUri) {
    const direct = voices.find((v) => v.voiceURI === customVoiceUri || v.name === customVoiceUri);
    if (direct) return direct;
  }

  const profile = VOICE_PROFILES.find((p) => p.id === profileId) || VOICE_PROFILES[0];
  const isMaleProfile = profile.gender === "Male";

  for (const keyword of profile.matchKeywords) {
    const match = voices.find((v) => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      const matchesKeyword = name.includes(keyword) || lang.includes(keyword);
      if (!matchesKeyword) return false;

      if (isMaleProfile) {
        return !name.includes("female") && !name.includes("zira") && !name.includes("heera") && !name.includes("swara") && !name.includes("neerja") && !name.includes("kalpana");
      }
      return true;
    });
    if (match) return match;
  }

  const langMatch = voices.find((v) => v.lang.toLowerCase().startsWith(profile.fallbackLang.toLowerCase().slice(0, 2)));
  if (langMatch) return langMatch;

  return voices.find((v) => v.lang.startsWith("en") || v.lang.startsWith("hi")) || voices[0];
}

// Converts currency numbers to spoken words in Hinglish, Hindi, or English
export function formatRupeesSpeech(amount, langMode) {
  const mode = langMode || getActiveLanguageMode();
  const num = Number(amount) || 0;
  if (num === 0) {
    if (mode === "hi") return "शून्य रुपए";
    if (mode === "hinglish") return "Zero rupaye";
    return "Zero rupees";
  }

  if (mode === "hinglish") {
    if (num >= 10000000) {
      const cr = (num / 10000000).toFixed(num % 10000000 === 0 ? 0 : 1);
      return `${cr} crore rupaye`;
    }
    if (num >= 100000) {
      const lakh = (num / 100000).toFixed(num % 100000 === 0 ? 0 : 1);
      return `${lakh} lakh rupaye`;
    }
    if (num >= 1000) {
      const th = (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1);
      return `${th} thousand rupaye`;
    }
    return `${num} rupaye`;
  }

  if (mode === "hi") {
    if (num >= 10000000) {
      const cr = (num / 10000000).toFixed(num % 10000000 === 0 ? 0 : 1);
      return `${cr} करोड़ रुपए`;
    }
    if (num >= 100000) {
      const lakh = (num / 100000).toFixed(num % 100000 === 0 ? 0 : 1);
      return `${lakh} लाख रुपए`;
    }
    if (num >= 1000) {
      const th = (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1);
      return `${th} हज़ार रुपए`;
    }
    return `${num} रुपए`;
  }

  // English
  if (num >= 10000000) {
    const cr = (num / 10000000).toFixed(num % 10000000 === 0 ? 0 : 1);
    return `${cr} crore rupees`;
  }
  if (num >= 100000) {
    const lakh = (num / 100000).toFixed(num % 100000 === 0 ? 0 : 1);
    return `${lakh} lakh rupees`;
  }
  if (num >= 1000) {
    const th = (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1);
    return `${th} thousand rupees`;
  }
  return `${num} rupees`;
}

function getRoleHindi(role) {
  const r = (role || "").toLowerCase();
  if (r.includes("bat")) return "बल्लेबाज़";
  if (r.includes("bowl")) return "गेंदबाज़";
  if (r.includes("all") || r.includes("round")) return "ऑल-राउंडर";
  if (r.includes("keep") || r.includes("wk")) return "विकेट-कीपर";
  return "खिलाड़ी";
}

export function speak(text, options = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

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
    utterance.lang = voice.lang || profile.fallbackLang;
  }

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

// Plays sample phrase for auditioning
export function testVoiceSample(profileId, onEnd) {
  const profile = VOICE_PROFILES.find((p) => p.id === profileId) || VOICE_PROFILES[0];
  const mode = profile.langMode || "hinglish";

  let sampleText = "";
  if (mode === "hinglish") {
    sampleText = `Next player on the hammer — Virat Sharma! Base price 25 thousand rupaye... 30 thousand by Royal Strikers... Aur ye player SOLD!`;
  } else if (mode === "hi") {
    sampleText = `अगले खिलाड़ी — विराट शर्मा, बल्लेबाज़! बेस प्राइस 25 हज़ार रुपए... कौन लगाएगा पहली बोली? 30 हज़ार रुपए रॉयल स्ट्राइकर्स की तरफ से... और ये बिक गए!`;
  } else {
    sampleText = `On the hammer now! Here is Virat Sharma — explosive batsman! Category Diamond, starting at 25 thousand rupees... Who's opening the bid?`;
  }

  speak(sampleText, { profileId: profile.id, rate: profile.defaultRate, pitch: profile.defaultPitch, onEnd });
}

export function stopCommentary() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

// 1. Announce Player Introduction
export function announcePlayerIntroduction(player, category) {
  if (!player) return;
  const mode = getActiveLanguageMode();
  const name = player.name || "Next player";
  const role = player.playerType ? player.playerType.toLowerCase() : "player";
  const catName = category?.name ? `Category ${category.name}` : "";
  const basePrice = formatRupeesSpeech(player.basePrice, mode);

  if (mode === "hinglish") {
    const introPhrasesHing = [
      `Next player on the hammer — ${name}! Top quality ${role}। ${catName ? `${catName}। ` : ""}Base price starts at ${basePrice}। Kaun shuru karega bidding?`,
      `Table par agle player — ${name}! Shandaar ${role}। ${catName ? `${catName}। ` : ""}Starting bid hai ${basePrice}। Boli shuru kijiye!`,
      `Welcome to the table, ${name}! Shandaar ${role}। Starting price ${basePrice}... Kaun si team lagayegi pehli bid?`,
    ];
    speak(introPhrasesHing[Math.floor(Math.random() * introPhrasesHing.length)]);
    return;
  }

  if (mode === "hi") {
    const roleHi = getRoleHindi(role);
    const catHi = category?.name ? `${category.name} कैटेगरी। ` : "";
    const introPhrasesHi = [
      `अगले खिलाड़ी नीलामी के लिए — ${name}! ${roleHi}। ${catHi}बेस प्राइस है ${basePrice}... कौन लगाएगा पहली बोली?`,
      `हथौड़े पर अगले खिलाड़ी — ${name}! शानदार ${roleHi}। ${catHi}शुरुआती बोली ${basePrice}! बोली शुरू कीजिए!`,
      `स्वागत कीजिए ${name} का! बेहतरीन ${roleHi}। ${catHi}बेस प्राइस ${basePrice}... कौन सी टीम खोलेगी खाता?`,
    ];
    speak(introPhrasesHi[Math.floor(Math.random() * introPhrasesHi.length)]);
    return;
  }

  // English
  const introPhrasesEn = [
    `On the auction block now! Here is ${name} — ${role}! ${catName ? `${catName}. ` : ""}Base price starts at ${basePrice}... Who will open the bidding?`,
    `Next up on the hammer! It's ${name}, top quality ${role}! ${catName ? `${catName}. ` : ""}Starting at ${basePrice}! Any opening bids?`,
    `Welcome to the table, ${name}! Superb ${role}. ${catName ? `${catName}. ` : ""}Base price is ${basePrice}... Let's get this started!`,
  ];
  speak(introPhrasesEn[Math.floor(Math.random() * introPhrasesEn.length)]);
}

// 2. Announce New Highest Bid
export function announceBid(teamName, amount) {
  if (!teamName || amount === undefined) return;
  const mode = getActiveLanguageMode();
  const priceSpeech = formatRupeesSpeech(amount, mode);

  if (mode === "hinglish") {
    const bidPhrasesHing = [
      `${priceSpeech} by ${teamName}! Boli aage badhti hui!`,
      `${teamName} ne lagayi ${priceSpeech} ki bid! Kaun dega counter?`,
      `New highest bid! ${priceSpeech} with ${teamName}! Aur koi team?`,
      `${teamName} takes it to ${priceSpeech}! Leading the race!`,
    ];
    speak(bidPhrasesHing[Math.floor(Math.random() * bidPhrasesHing.length)]);
    return;
  }

  if (mode === "hi") {
    const bidPhrasesHi = [
      `${teamName} ने लगाई ${priceSpeech} की बोली!`,
      `${priceSpeech}, ${teamName} की तरफ से!`,
      `नई बोली! ${priceSpeech} ${teamName} के पास! कौन जाएगा ऊपर?`,
      `${teamName} की शानदार बोली — ${priceSpeech}!`,
    ];
    speak(bidPhrasesHi[Math.floor(Math.random() * bidPhrasesHi.length)]);
    return;
  }

  // English
  const bidPhrasesEn = [
    `${priceSpeech} by ${teamName}!`,
    `${teamName} takes it to ${priceSpeech}!`,
    `We have ${priceSpeech} from ${teamName}! Who wants to go higher?`,
    `New bid! ${priceSpeech} with ${teamName}!`,
    `${teamName} steps up with ${priceSpeech}!`,
  ];
  speak(bidPhrasesEn[Math.floor(Math.random() * bidPhrasesEn.length)]);
}

// 3. Announce 10-Second Warning
export function announceTenSecondWarning(teamName, amount, playerName, basePrice) {
  const mode = getActiveLanguageMode();

  if (teamName && amount) {
    const priceSpeech = formatRupeesSpeech(amount, mode);
    if (mode === "hinglish") {
      speak(`Current highest bid hai ${priceSpeech} with ${teamName}! Any last counter bid?`);
      return;
    }
    if (mode === "hi") {
      speak(`अभी सबसे बड़ी बोली है ${priceSpeech}, ${teamName} के नाम! क्या कोई और बोली है?`);
      return;
    }
    speak(`Current highest bid is ${priceSpeech} with ${teamName}! Any more bids in the room?`);
  } else {
    const name = playerName || "this player";
    const base = basePrice !== undefined ? formatRupeesSpeech(basePrice, mode) : "base price";
    if (mode === "hinglish") {
      speak(`${name} ke liye opening bid hai ${base}! Kaun karega shuruat?`);
      return;
    }
    if (mode === "hi") {
      speak(`${name} के लिए शुरुआती बोली ${base} चाहिए!`);
      return;
    }
    speak(`Looking for an opening bid of ${base} for ${name}!`);
  }
}

// 4. Announce Last 4 Seconds Warning
export function announceGoingOnceGoingTwice(teamName, amount, playerName) {
  const mode = getActiveLanguageMode();
  if (teamName && amount) {
    const priceSpeech = formatRupeesSpeech(amount, mode);
    if (mode === "hinglish") {
      speak(`Going once at ${priceSpeech}... Going twice to ${teamName}... Last chance dosto!`);
      return;
    }
    if (mode === "hi") {
      speak(`एक बार... दो बार... ${priceSpeech} ${teamName} के नाम... आखिरी मौका!`);
      return;
    }
    speak(`Going once at ${priceSpeech}... Going twice to ${teamName}... Fair warning!`);
  } else {
    const name = playerName || "this player";
    if (mode === "hinglish") {
      speak(`Going once... Going twice... Final call for ${name}!`);
      return;
    }
    if (mode === "hi") {
      speak(`एक बार... दो बार... ${name} के लिए आखिरी पुकार!`);
      return;
    }
    speak(`Going once... Going twice... Final call for ${name}!`);
  }
}

// 5. Announce Player SOLD with Gavel Strike
export function announceSold(playerName, teamName, amount) {
  const mode = getActiveLanguageMode();
  const name = playerName || "The player";
  const team = teamName || "the highest bidder";
  const priceSpeech = amount !== undefined ? formatRupeesSpeech(amount, mode) : "";

  playGavelStrike();

  if (mode === "hinglish") {
    const soldPhrasesHing = [
      `Hammer down! SOLD! ${name} is sold to ${team} for ${priceSpeech}! Zabardast signing!`,
      `Aur ye player SOLD! ${name} officially joins ${team} for ${priceSpeech}! Shandaar buy!`,
      `Sold, sold, sold! ${name} goes to ${team} for ${priceSpeech}!`,
    ];
    speak(soldPhrasesHing[Math.floor(Math.random() * soldPhrasesHing.length)]);
    return;
  }

  if (mode === "hi") {
    const soldPhrasesHi = [
      `बिक गए! ${name} बिके ${team} को ${priceSpeech} में! बहुत ही शानदार खरीद!`,
      `हथौड़ा गिर चुका है! ${name} अब आधिकारिक तौर पर ${team} के खिलाड़ी हैं, ${priceSpeech} में!`,
      `सोल्ड! ${name} जा रहे हैं ${team} के खेमे में ${priceSpeech} में!`,
    ];
    speak(soldPhrasesHi[Math.floor(Math.random() * soldPhrasesHi.length)]);
    return;
  }

  // English
  const soldPhrasesEn = [
    `Hammer down! SOLD! ${name} is SOLD to ${team} for ${priceSpeech}! What a signing!`,
    `SOLD! ${name} goes to ${team} for ${priceSpeech}! Fantastic buy!`,
    `Sold, sold, sold! ${name} officially joins ${team} for ${priceSpeech}!`,
  ];
  speak(soldPhrasesEn[Math.floor(Math.random() * soldPhrasesEn.length)]);
}

// 6. Announce Player UNSOLD
export function announceUnsold(playerName) {
  const mode = getActiveLanguageMode();
  const name = playerName || "Player";

  if (mode === "hinglish") {
    speak(`No bids in the room... ${name} remains unsold for this round, moving to Round 2!`);
    return;
  }

  if (mode === "hi") {
    const unsoldPhrasesHi = [
      `कोई बोली नहीं आई... ${name} इस राउंड में अनसोल्ड रहे!`,
      `${name} अनसोल्ड, दूसरे राउंड में फिर आएंगे!`,
      `पासिंग खिलाड़ी... ${name} फिलहाल अनसोल्ड हैं।`,
    ];
    speak(unsoldPhrasesHi[Math.floor(Math.random() * unsoldPhrasesHi.length)]);
    return;
  }

  // English
  const unsoldPhrasesEn = [
    `No bids in the room... ${name} is unsold, moving to the second chance pool!`,
    `And... ${name} is unsold for this round!`,
    `Passing player... ${name} remains unsold.`,
  ];
  speak(unsoldPhrasesEn[Math.floor(Math.random() * unsoldPhrasesEn.length)]);
}
