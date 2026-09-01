import React, { useState, useRef, useEffect } from "react";
import { formatPrice, formatTime } from "../utils/liveCommentaryEngine";
import { useToast } from "../context/ToastContext";

export default function LiveCommentaryFeed({
  items = [],
  onPostAnnouncement = null,
  isOrganizer = false,
  tournamentName = "Tournament",
}) {
  const { showToast } = useToast();
  const [filter, setFilter] = useState("ALL"); // 'ALL' | 'BIDS' | 'SALES' | 'ANNOUNCEMENTS'
  const [searchQuery, setSearchQuery] = useState("");
  const [announcementText, setAnnouncementText] = useState("");
  const [posting, setPosting] = useState(false);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [hasNewItems, setHasNewItems] = useState(false);

  const containerRef = useRef(null);
  const prevCountRef = useRef(items.length);

  // Filter items based on active tab and search query
  const filteredItems = items.filter((item) => {
    if (!item) return false;

    // Filter tab condition
    if (filter === "BIDS" && item.type !== "BID" && item.type !== "BID_WAR") return false;
    if (filter === "SALES" && item.type !== "SOLD" && item.type !== "UNSOLD") return false;
    if (filter === "ANNOUNCEMENTS" && item.type !== "ANNOUNCEMENT") return false;

    // Search query condition
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = (item.text || "").toLowerCase().includes(q);
      const matchTitle = (item.title || "").toLowerCase().includes(q);
      const matchPlayer = (item.player?.name || "").toLowerCase().includes(q);
      const matchTeam = (item.team?.teamName || "").toLowerCase().includes(q);
      return matchText || matchTitle || matchPlayer || matchTeam;
    }

    return true;
  });

  // Check if new items arrive
  useEffect(() => {
    if (items.length > prevCountRef.current) {
      if (isAutoScroll && containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setHasNewItems(true);
      }
    }
    prevCountRef.current = items.length;
  }, [items.length, isAutoScroll]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop } = containerRef.current;
    if (scrollTop < 40) {
      setIsAutoScroll(true);
      setHasNewItems(false);
    } else {
      setIsAutoScroll(false);
    }
  };

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      setIsAutoScroll(true);
      setHasNewItems(false);
    }
  };

  // Share to WhatsApp
  const shareToWhatsApp = (item) => {
    const text = encodeURIComponent(
      `🏏 *${tournamentName} - Live Auction Update*\n\n${item.title ? `*${item.title}*\n` : ""}${item.text}\n\n🔗 Watch live at: ${window.location.href}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  // Copy commentary snippet
  const copyCommentary = (item) => {
    const text = `${item.title ? `${item.title}\n` : ""}${item.text}`;
    navigator.clipboard.writeText(text);
    showToast("Commentary update copied to clipboard!", "success");
  };

  // Handle post custom announcement
  const handleSubmitAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementText.trim() || !onPostAnnouncement) return;
    setPosting(true);
    try {
      await onPostAnnouncement(announcementText.trim());
      setAnnouncementText("");
      showToast("Announcement broadcasted live to all spectators!", "success");
    } catch (err) {
      showToast(err.message || "Failed to post announcement", "error");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/95 backdrop-blur-md rounded-3xl border border-mauve/25 overflow-hidden shadow-md text-turf">
      {/* Header Bar with Live Indicator */}
      <div className="p-3.5 sm:p-4 border-b border-mauve/20 bg-white flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose"></span>
          </span>
          <h3 className="font-display text-lg sm:text-xl text-turf font-bold tracking-wide flex items-center gap-1.5">
            <span>📜 Live Commentary Feed</span>
          </h3>
          <span className="text-[10px] bg-orchid/20 text-orchid-dark font-bold px-2 py-0.5 rounded-full border border-orchid/30">
            {filteredItems.length} {filteredItems.length === 1 ? "Update" : "Updates"}
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[140px] sm:min-w-[180px]">
          <input
            type="text"
            placeholder="Search player, team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-sky/10 border border-mauve/30 rounded-xl px-2.5 py-1 text-xs text-turf placeholder-mauve-dark focus:outline-none focus:border-mint transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-mauve hover:text-turf text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-2 px-3 border-b border-mauve/20 bg-[#F7FAFE] overflow-x-auto scroll-touch">
        {[
          { id: "ALL", label: "All Updates", icon: "🌐" },
          { id: "BIDS", label: "⚡ Bids & Wars", icon: "⚡" },
          { id: "SALES", label: "🏆 Sold / Unsold", icon: "🏆" },
          { id: "ANNOUNCEMENTS", label: "📢 Announcements", icon: "📢" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
              filter === tab.id
                ? "bg-mint text-turf-dark shadow-sm font-extrabold"
                : "bg-white text-turf border border-mauve/25 hover:bg-sky/20"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Organizer Live Announcement Box (Only rendered if organizer) */}
      {isOrganizer && onPostAnnouncement && (
        <form onSubmit={handleSubmitAnnouncement} className="p-2.5 sm:p-3 bg-orchid/15 border-b border-orchid/25 flex gap-2">
          <input
            type="text"
            placeholder="📢 Broadcast live auctioneer note to all screens..."
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            className="flex-1 bg-white border border-orchid/40 rounded-xl px-3 py-1.5 text-xs text-turf placeholder-mauve-dark focus:outline-none focus:border-mint font-medium shadow-sm"
          />
          <button
            type="submit"
            disabled={posting || !announcementText.trim()}
            className="btn-primary text-xs py-1.5 px-3.5 rounded-xl disabled:opacity-50 shrink-0 font-bold shadow-sm"
          >
            {posting ? "Posting…" : "Post Live 🚀"}
          </button>
        </form>
      )}

      {/* Timeline Stream (Scrollable) */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 scroll-touch relative"
        style={{ minHeight: "260px", maxHeight: "420px" }}
      >
        {/* Floating "New Updates" badge when user scrolled down */}
        {hasNewItems && (
          <button
            onClick={scrollToTop}
            className="sticky top-2 left-1/2 -translate-x-1/2 z-20 bg-mint text-turf-dark text-xs font-extrabold px-3.5 py-1 rounded-full shadow-md border border-mint/40 animate-bounce flex items-center gap-1.5 mx-auto"
          >
            <span>⬆ New live commentary updates</span>
          </button>
        )}

        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-mauve-dark">
            <p className="text-2xl mb-1">🏏</p>
            <p className="font-bold text-sm text-turf">No commentary events found</p>
            <p className="text-xs text-mauve-dark mt-1 font-medium">
              Live updates will stream here automatically as bids are placed.
            </p>
          </div>
        ) : (
          filteredItems.map((item, idx) => (
            <div
              key={item.id || idx}
              className={`rounded-2xl p-3 sm:p-3.5 border transition-all duration-200 shadow-sm ${
                item.type === "SOLD"
                  ? "bg-mint/15 border-mint/50"
                  : item.type === "UNSOLD"
                  ? "bg-rose/15 border-rose/50"
                  : item.type === "BID_WAR"
                  ? "bg-orchid/15 border-orchid/50"
                  : item.type === "ANNOUNCEMENT"
                  ? "bg-sky/20 border-sky-dark/40"
                  : "bg-white border-mauve/25 hover:border-mint/50"
              }`}
            >
              {/* Top metadata line */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      item.type === "SOLD"
                        ? "bg-mint/20 text-mint-dark border-mint/40 font-black"
                        : item.type === "UNSOLD"
                        ? "bg-rose/20 text-rose border-rose/40 font-black"
                        : item.type === "BID_WAR"
                        ? "bg-orchid/20 text-orchid-dark border-orchid/40 font-black"
                        : "bg-sky/20 text-turf border-sky-dark/40 font-black"
                    }`}
                  >
                    {item.badge || item.type}
                  </span>
                  <span className="text-[11px] text-mauve-dark font-mono font-medium">
                    {formatTime(item.timestamp)}
                  </span>
                </div>

                {/* Actions: Share to WhatsApp & Copy */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => shareToWhatsApp(item)}
                    title="Share to WhatsApp"
                    className="p-1 rounded-lg text-mint-dark hover:bg-mint/20 transition text-xs flex items-center gap-1"
                  >
                    <span>📲</span>
                  </button>
                  <button
                    onClick={() => copyCommentary(item)}
                    title="Copy update"
                    className="p-1 rounded-lg text-mauve hover:text-turf hover:bg-sky/20 transition text-xs"
                  >
                    <span>📋</span>
                  </button>
                </div>
              </div>

              {/* Title if available */}
              {item.title && (
                <div className="font-display text-base sm:text-lg text-turf font-bold tracking-wide mb-1 leading-tight">
                  {item.title}
                </div>
              )}

              {/* Commentary Narrative */}
              <p className="text-xs sm:text-sm text-turf/90 leading-relaxed font-sans font-medium">
                {item.text}
              </p>

              {/* Player or Team Mini Capsule for Sold/Bid events */}
              {item.type === "SOLD" && item.player && (
                <div className="mt-2.5 pt-2 border-t border-mint/30 flex items-center justify-between text-xs font-semibold">
                  <span className="text-mint-dark truncate">
                    👤 {item.player.name}
                  </span>
                  <span className="font-display text-sm text-mint-dark font-black">
                    {formatPrice(item.amount)}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
