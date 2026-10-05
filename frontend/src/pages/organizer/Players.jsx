import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../../api/axios";
import OrganizerLayout from "../../components/OrganizerLayout";
import StatusMessage from "../../components/StatusMessage";
import PlayerPhoto from "../../components/PlayerPhoto";
import { SkeletonTable } from "../../components/Skeleton";
import { compressImage } from "../../utils/imageCompressor";
import { useToast } from "../../context/ToastContext";
import { getSocket } from "../../socket";

export default function Players() {
  const { showToast } = useToast();
  const [players, setPlayers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [approvalFilter, setApprovalFilter] = useState("ALL");
  const [auctionFilter, setAuctionFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const refreshTimer = useRef(null);
  const info = JSON.parse(localStorage.getItem("organizerInfo") || "{}");

  const load = useCallback(async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      api.get("/organizer-admin/players"),
      api.get("/organizer-admin/categories"),
    ]);
    setPlayers(p);
    setCategories(c);
    setEdits((prev) => {
      const merged = {};
      p.forEach((pl) => {
        merged[pl._id] = prev[pl._id] || {
          isApproved: pl.isApproved,
          category: pl.category?._id || "",
          basePrice: pl.basePrice,
          photoUrl: pl.photoUrl || null,
        };
      });
      return merged;
    });
    setLoading(false);
  }, []);

  const scheduleRefresh = useCallback(
    (delay = 400) => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(load, delay);
    },
    [load],
  );

  useEffect(() => {
    load();
    const socket = getSocket();
    socket.connect();
    socket.emit("join-auction", info.id);
    socket.on("registration-update", (payload) => {
      if (payload?.kind === "player") {
        showToast("A new player just registered!", "info");
        scheduleRefresh();
      }
    });
    return () => {
      socket.off("registration-update");
      socket.disconnect();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
    // eslint-disable-next-line
  }, []);

  function getEdit(playerId) {
    return (
      edits[playerId] || {
        isApproved: false,
        category: "",
        basePrice: 0,
        photoUrl: null,
      }
    );
  }
  function setEdit(playerId, patch) {
    setEdits((prev) => ({
      ...prev,
      [playerId]: { ...getEdit(playerId), ...patch },
    }));
  }
  function isDirty(player) {
    const e = getEdit(player._id);
    return (
      e.isApproved !== player.isApproved ||
      e.category !== (player.category?._id || "") ||
      Number(e.basePrice) !== player.basePrice ||
      e.photoUrl !== (player.photoUrl || null)
    );
  }

  function handleCategoryChange(player, categoryId) {
    const category = categories.find((c) => c._id === categoryId);
    setEdit(player._id, {
      category: categoryId,
      basePrice: category ? category.basePrice : getEdit(player._id).basePrice,
    });
  }

  async function handlePhotoChange(player, file) {
    if (!file) return;
    setUploadingId(player._id);
    try {
      const optimizedFile = await compressImage(file, 1200, 1200, 0.85);
      const formData = new FormData();
      formData.append("file", optimizedFile);
      const { data } = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      setEdit(player._id, { photoUrl: data.url });
      showToast("Photo uploaded — click Save to apply it.", "info");
    } catch (err) {
      showToast("Photo upload failed. Please try again.", "error");
    } finally {
      setUploadingId(null);
    }
  }

  async function saveRow(player) {
    setStatus({ type: "", message: "" });
    setSavingId(player._id);
    try {
      const e = getEdit(player._id);
      await api.put(`/organizer-admin/players/${player._id}`, {
        isApproved: e.isApproved,
        category: e.category || null,
        basePrice: Number(e.basePrice),
        photoUrl: e.photoUrl,
      });
      showToast(`Saved changes for ${player.name}.`, "success");
      await load();
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.message || "Save failed",
      });
    } finally {
      setSavingId(null);
    }
  }

  async function deletePlayer(id) {
    if (!confirm("Remove this player?")) return;
    await api.delete(`/organizer-admin/players/${id}`);
    showToast("Player removed.", "info");
    load();
  }

  // Normalizes role matching for flexible inputs
  const matchesRole = useCallback((playerType, targetRole) => {
    if (!targetRole || targetRole === "ALL") return true;
    const t = (playerType || "").trim().toUpperCase();
    if (targetRole === "BATSMAN") return t === "BATSMAN";
    if (targetRole === "BOWLER") return t === "BOWLER";
    if (targetRole === "ALLROUNDER") return t === "ALLROUNDER" || t === "ALL_ROUNDER";
    if (targetRole === "WICKET_KEEPER") return t === "WICKET_KEEPER" || t === "WICKETKEEPER" || t === "WK";
    return t === targetRole.toUpperCase();
  }, []);

  // Safe approval matching that preserves unsaved toggle visibility while editing
  const isPlayerMatchApproval = useCallback((p, filterVal) => {
    if (!filterVal || filterVal === "ALL") return true;
    const currentEdit = edits[p._id]?.isApproved;
    const effective = currentEdit !== undefined ? currentEdit : Boolean(p.isApproved);
    if (filterVal === "APPROVED") {
      return effective || Boolean(p.isApproved);
    }
    if (filterVal === "UNAPPROVED") {
      return !effective || !Boolean(p.isApproved);
    }
    return true;
  }, [edits]);

  // Aggregate counts for quick tabs and filter labels
  const batsmanCount = players.filter((p) => matchesRole(p.playerType, "BATSMAN")).length;
  const bowlerCount = players.filter((p) => matchesRole(p.playerType, "BOWLER")).length;
  const allrounderCount = players.filter((p) => matchesRole(p.playerType, "ALLROUNDER")).length;
  const wicketKeeperCount = players.filter((p) => matchesRole(p.playerType, "WICKET_KEEPER")).length;
  const approvedCount = players.filter((p) => Boolean(edits[p._id]?.isApproved ?? p.isApproved)).length;
  const unapprovedCount = players.filter((p) => !Boolean(edits[p._id]?.isApproved ?? p.isApproved)).length;

  const visible = players.filter((p) => {
    // Role filter
    if (roleFilter !== "ALL" && !matchesRole(p.playerType, roleFilter)) return false;

    // Approval filter (Approved vs Unapproved)
    if (approvalFilter !== "ALL" && !isPlayerMatchApproval(p, approvalFilter)) return false;

    // Auction status filter
    if (auctionFilter !== "ALL" && p.auctionStatus !== auctionFilter) return false;

    // Search player feature: search using player name (with phone fallback)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const nameMatch = (p.name || "").toLowerCase().includes(q);
      const phoneMatch = (p.phone || "").toLowerCase().includes(q);
      return nameMatch || phoneMatch;
    }
    return true;
  });

  const dirtyCount = visible.filter(isDirty).length;
  const hasActiveFilters = searchQuery.trim() !== "" || roleFilter !== "ALL" || approvalFilter !== "ALL" || auctionFilter !== "ALL";

  function resetAllFilters() {
    setSearchQuery("");
    setRoleFilter("ALL");
    setApprovalFilter("ALL");
    setAuctionFilter("ALL");
  }

  function renderRoleBadge(role) {
    const r = (role || "").toUpperCase();
    if (r === "BATSMAN") {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-semibold text-xs inline-flex items-center gap-1 shadow-2xs">
          🏏 Batsman
        </span>
      );
    }
    if (r === "BOWLER") {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200 font-semibold text-xs inline-flex items-center gap-1 shadow-2xs">
          🎯 Bowler
        </span>
      );
    }
    if (r === "ALLROUNDER" || r === "ALL_ROUNDER") {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold text-xs inline-flex items-center gap-1 shadow-2xs">
          ⚡ All-Rounder
        </span>
      );
    }
    if (r === "WICKET_KEEPER" || r === "WICKETKEEPER" || r === "WK") {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-900 border border-purple-200 font-semibold text-xs inline-flex items-center gap-1 shadow-2xs">
          🧤 Wicket Keeper
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-700 text-xs inline-flex items-center gap-1">
        🏏 {role || "Player"}
      </span>
    );
  }

  async function saveAll() {
    setStatus({ type: "", message: "" });
    const dirtyPlayers = visible.filter(isDirty);
    for (const p of dirtyPlayers) {
      await saveRow(p);
    }
    if (dirtyPlayers.length > 0)
      showToast(
        `Saved ${dirtyPlayers.length} player${dirtyPlayers.length > 1 ? "s" : ""}.`,
        "success",
      );
  }

  return (
    <OrganizerLayout>
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-turf">Players</h1>
          <p className="text-mauve-dark text-xs sm:text-sm mt-0.5">
            Approve registrations, filter by role/approval, assign categories & base prices before auction.
          </p>
        </div>

        {/* Filter and Search Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full lg:w-auto">
          {/* Player Name Search Input */}
          <div className="relative w-full sm:w-56 shrink-0">
            <input
              type="text"
              placeholder="🔍 Search player by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full text-xs py-2 pr-7 pl-3 rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs w-4 h-4 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                title="Clear player search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Role Filter Dropdown */}
          <select
            className="input-field w-full sm:w-44 shrink-0 text-xs py-2 rounded-xl"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            title="Filter players by role"
          >
            <option value="ALL">All Roles ({players.length})</option>
            <option value="BATSMAN">🏏 Batsman ({batsmanCount})</option>
            <option value="BOWLER">🎯 Bowler ({bowlerCount})</option>
            <option value="ALLROUNDER">⚡ All-Rounder ({allrounderCount})</option>
            <option value="WICKET_KEEPER">🧤 Wicket Keeper ({wicketKeeperCount})</option>
          </select>

          {/* Approval Filter Dropdown */}
          <select
            className="input-field w-full sm:w-36 shrink-0 text-xs py-2 rounded-xl"
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            title="Filter by approval status"
          >
            <option value="ALL">All Approvals ({players.length})</option>
            <option value="APPROVED">✅ Approved ({approvedCount})</option>
            <option value="UNAPPROVED">⏳ Unapproved ({unapprovedCount})</option>
          </select>

          {/* Auction Status Filter Dropdown */}
          <select
            className="input-field w-full sm:w-32 shrink-0 text-xs py-2 rounded-xl"
            value={auctionFilter}
            onChange={(e) => setAuctionFilter(e.target.value)}
            title="Filter by auction status"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="SOLD">Sold</option>
            <option value="UNSOLD">Unsold</option>
          </select>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="text-xs text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-2 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 shadow-2xs"
              title="Reset all search and filters"
            >
              <span>↺</span>
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Filter Pill Chips for One-Click Filtering */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scroll-touch">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
          Quick Filters:
        </span>

        {/* All Players Pill */}
        <button
          onClick={() => {
            setRoleFilter("ALL");
            setApprovalFilter("ALL");
          }}
          className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
            roleFilter === "ALL" && approvalFilter === "ALL"
              ? "bg-slate-900 text-white shadow-xs font-bold"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All ({players.length})
        </button>

        {/* Batsman Pill */}
        <button
          onClick={() => setRoleFilter(roleFilter === "BATSMAN" ? "ALL" : "BATSMAN")}
          className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
            roleFilter === "BATSMAN"
              ? "bg-amber-600 text-white shadow-xs font-bold"
              : "bg-amber-50 text-amber-900 border border-amber-200/70 hover:bg-amber-100"
          }`}
        >
          <span>🏏 Batsmen</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              roleFilter === "BATSMAN" ? "bg-amber-800 text-white" : "bg-amber-200 text-amber-900"
            }`}
          >
            {batsmanCount}
          </span>
        </button>

        {/* Bowler Pill */}
        <button
          onClick={() => setRoleFilter(roleFilter === "BOWLER" ? "ALL" : "BOWLER")}
          className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
            roleFilter === "BOWLER"
              ? "bg-blue-600 text-white shadow-xs font-bold"
              : "bg-blue-50 text-blue-900 border border-blue-200/70 hover:bg-blue-100"
          }`}
        >
          <span>🎯 Bowlers</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              roleFilter === "BOWLER" ? "bg-blue-800 text-white" : "bg-blue-200 text-blue-900"
            }`}
          >
            {bowlerCount}
          </span>
        </button>

        {/* All-Rounder Pill */}
        <button
          onClick={() => setRoleFilter(roleFilter === "ALLROUNDER" ? "ALL" : "ALLROUNDER")}
          className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
            roleFilter === "ALLROUNDER"
              ? "bg-emerald-700 text-white shadow-xs font-bold"
              : "bg-emerald-50 text-emerald-900 border border-emerald-200/70 hover:bg-emerald-100"
          }`}
        >
          <span>⚡ All-Rounders</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              roleFilter === "ALLROUNDER" ? "bg-emerald-900 text-white" : "bg-emerald-200 text-emerald-900"
            }`}
          >
            {allrounderCount}
          </span>
        </button>

        {/* Wicket Keeper Pill */}
        <button
          onClick={() => setRoleFilter(roleFilter === "WICKET_KEEPER" ? "ALL" : "WICKET_KEEPER")}
          className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
            roleFilter === "WICKET_KEEPER"
              ? "bg-purple-700 text-white shadow-xs font-bold"
              : "bg-purple-50 text-purple-900 border border-purple-200/70 hover:bg-purple-100"
          }`}
        >
          <span>🧤 Wicket Keepers</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              roleFilter === "WICKET_KEEPER" ? "bg-purple-900 text-white" : "bg-purple-200 text-purple-900"
            }`}
          >
            {wicketKeeperCount}
          </span>
        </button>

        <div className="h-4 w-px bg-slate-300 shrink-0 mx-1" />

        {/* Approved Pill */}
        <button
          onClick={() => setApprovalFilter(approvalFilter === "APPROVED" ? "ALL" : "APPROVED")}
          className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
            approvalFilter === "APPROVED"
              ? "bg-teal-700 text-white shadow-xs font-bold"
              : "bg-teal-50 text-teal-900 border border-teal-200/70 hover:bg-teal-100"
          }`}
        >
          <span>✅ Approved</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              approvalFilter === "APPROVED" ? "bg-teal-900 text-white" : "bg-teal-200 text-teal-900"
            }`}
          >
            {approvedCount}
          </span>
        </button>

        {/* Unapproved Pill */}
        <button
          onClick={() => setApprovalFilter(approvalFilter === "UNAPPROVED" ? "ALL" : "UNAPPROVED")}
          className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
            approvalFilter === "UNAPPROVED"
              ? "bg-rose-600 text-white shadow-xs font-bold"
              : "bg-rose-50 text-rose-900 border border-rose-200/70 hover:bg-rose-100"
          }`}
        >
          <span>⏳ Unapproved</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              approvalFilter === "UNAPPROVED" ? "bg-rose-800 text-white" : "bg-rose-200 text-rose-900"
            }`}
          >
            {unapprovedCount}
          </span>
        </button>
      </div>

      {/* Results summary bar when filtering or searching */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2 px-1">
          <div>
            Showing <strong className="text-slate-800 font-bold">{visible.length}</strong> of{" "}
            <strong className="text-slate-800 font-bold">{players.length}</strong> players
            {searchQuery && (
              <span> matching &ldquo;<span className="text-turf font-bold">{searchQuery}</span>&rdquo;</span>
            )}
          </div>
        </div>
      )}

      {dirtyCount > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-emerald-50 border border-emerald-300 rounded-2xl px-4 py-3 mb-3 shadow-xs">
          <p className="text-xs sm:text-sm font-bold text-emerald-900">
            🏏 {dirtyCount} cricket player{dirtyCount > 1 ? "s have" : " has"} unsaved changes
          </p>
          <button onClick={saveAll} className="btn-primary text-xs sm:text-sm py-2 px-5 w-full sm:w-auto font-bold shadow-xs">
            💾 Save All Changes
          </button>
        </div>
      )}

      <StatusMessage type={status.type} message={status.message} />

      {loading ? (
        <SkeletonTable rows={6} cols={10} />
      ) : (
        <div className="card overflow-x-auto mt-3 scroll-touch shadow-xs border-slate-200">
          <table className="w-full text-xs sm:text-sm min-w-[740px]">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2.5 pr-3 font-semibold">Photo</th>
                <th className="py-2.5 pr-3 font-semibold">Cricketer</th>
                <th className="py-2.5 pr-3 font-semibold">Role</th>
                <th className="py-2.5 pr-3 font-semibold">Age</th>
                <th className="py-2.5 pr-3 font-semibold">Payment</th>
                <th className="py-2.5 pr-3 font-semibold">Approved</th>
                <th className="py-2.5 pr-3 font-semibold">Category</th>
                <th className="py-2.5 pr-3 font-semibold">Base Price</th>
                <th className="py-2.5 pr-3 font-semibold">Auction Status</th>
                <th className="py-2.5 pr-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const e = getEdit(p._id);
                const dirty = isDirty(p);
                const inputId = `photo-input-${p._id}`;
                return (
                  <tr
                    key={p._id}
                    className={`border-b border-slate-100 ${dirty ? "bg-emerald-50/50" : "hover:bg-slate-50/50"}`}
                  >
                    <td className="py-2.5 pr-3">
                      <div className="flex flex-col items-center gap-1 w-16">
                        {e.photoUrl ? (
                          <img
                            src={e.photoUrl}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover border border-slate-300 shadow-2xs bg-slate-100"
                            onError={(ev) => {
                              ev.target.style.display = "none";
                              if (ev.target.nextElementSibling) {
                                ev.target.nextElementSibling.style.display = "flex";
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-10 h-10 rounded-full bg-slate-100 border border-slate-200 items-center justify-center text-lg ${
                            e.photoUrl ? "hidden" : "flex"
                          }`}
                        >
                          🏏
                        </div>
                        <input
                          id={inputId}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(ev) =>
                            handlePhotoChange(p, ev.target.files[0])
                          }
                        />
                        <label
                          htmlFor={inputId}
                          className="text-[10px] text-slate-700 font-bold hover:underline cursor-pointer hover:text-[#0F5132]"
                        >
                          {uploadingId === p._id ? "Uploading…" : "Change"}
                        </label>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        {p.name}
                        {dirty && (
                          <span className="badge-unsaved">● unsaved</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      {renderRoleBadge(p.playerType)}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">{p.age || "—"}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        p.paymentStatus === "PAID"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-[#0F5132] accent-[#0F5132] cursor-pointer"
                          checked={e.isApproved}
                          onChange={(ev) =>
                            setEdit(p._id, { isApproved: ev.target.checked })
                          }
                        />
                        <span
                          className={`text-[11px] font-bold ${
                            e.isApproved ? "text-emerald-700" : "text-slate-400"
                          }`}
                        >
                          {e.isApproved ? "Approved" : "Pending"}
                        </span>
                      </label>
                    </td>
                    <td className="py-2.5 pr-3">
                      <select
                        className="input-field text-xs py-1"
                        value={e.category}
                        onChange={(ev) =>
                          handleCategoryChange(p, ev.target.value)
                        }
                      >
                        <option value="">—</option>
                        {categories.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-xs">₹</span>
                        <input
                          type="number"
                          className="input-field text-xs py-1 w-24 font-mono font-semibold"
                          value={e.basePrice}
                          onChange={(ev) =>
                            setEdit(p._id, { basePrice: ev.target.value })
                          }
                        />
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          p.auctionStatus === "SOLD"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : p.auctionStatus === "UNSOLD"
                              ? "bg-red-100 text-red-800 border border-red-300"
                              : p.auctionStatus === "IN_AUCTION"
                                ? "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                                : "bg-slate-100 text-slate-700 border border-slate-300"
                        }`}
                      >
                        {p.auctionStatus}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => saveRow(p)}
                          disabled={!dirty || savingId === p._id}
                          className="btn-save"
                        >
                          {savingId === p._id ? "⏳ Saving…" : "💾 Save"}
                        </button>
                        <button
                          onClick={() => deletePlayer(p._id)}
                          className="text-red-600 hover:text-red-800 text-xs hover:underline px-1.5 py-1 font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className="py-12 px-4 text-center">
              <div className="text-3xl mb-2">🏏</div>
              <p className="text-slate-700 font-bold text-sm">
                No cricket players match your search or filter criteria
              </p>
              <p className="text-slate-400 text-xs mt-1">
                Try searching for a different player name or adjusting your role and approval filters.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={resetAllFilters}
                  className="mt-3 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-2xs"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </OrganizerLayout>
  );
}
