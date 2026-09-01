import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../../api/axios";
import OrganizerLayout from "../../components/OrganizerLayout";
import StatusMessage from "../../components/StatusMessage";
import PlayerPhoto from "../../components/PlayerPhoto";
import { SkeletonTable } from "../../components/Skeleton";
import { useToast } from "../../context/ToastContext";
import { getSocket } from "../../socket";

export default function Players() {
  const { showToast } = useToast();
  const [players, setPlayers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState("ALL");
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
      const formData = new FormData();
      formData.append("file", file);
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

  const visible = players.filter((p) => {
    if (filter !== "ALL" && p.auctionStatus !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (p.name || "").toLowerCase().includes(q);
      const phoneMatch = (p.phone || "").toLowerCase().includes(q);
      const typeMatch = (p.playerType || "").toLowerCase().includes(q);
      return nameMatch || phoneMatch || typeMatch;
    }
    return true;
  });
  const dirtyCount = visible.filter(isDirty).length;

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-turf">Players</h1>
          <p className="text-mauve-dark text-xs sm:text-sm mt-0.5">
            Approve registrations, assign categories & base prices before auction.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <input
            type="text"
            placeholder="🔍 Search name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field w-full sm:w-48 text-xs py-2"
          />
          <select
            className="input-field w-full sm:w-40 shrink-0 text-xs py-2"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="ALL">All ({players.length})</option>
            <option value="PENDING">Pending</option>
            <option value="SOLD">Sold</option>
            <option value="UNSOLD">Unsold</option>
          </select>
        </div>
      </div>

      {dirtyCount > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-mint/15 border border-mint/40 rounded-2xl px-4 py-3 mb-3 shadow-sm">
          <p className="text-xs sm:text-sm font-bold text-mint-dark">
            {dirtyCount} player{dirtyCount > 1 ? "s have" : " has"} unsaved
            changes
          </p>
          <button onClick={saveAll} className="btn-primary text-xs sm:text-sm py-2 px-5 w-full sm:w-auto font-bold shadow-md shadow-mint/20">
            💾 Save All Changes
          </button>
        </div>
      )}

      <StatusMessage type={status.type} message={status.message} />

      {loading ? (
        <SkeletonTable rows={6} cols={10} />
      ) : (
        <div className="card overflow-x-auto mt-3 scroll-touch shadow-sm border-mauve/20">
          <table className="w-full text-xs sm:text-sm min-w-[740px]">
            <thead>
              <tr className="text-left text-mauve-dark border-b border-mauve/20">
                <th className="py-2.5 pr-3">Photo</th>
                <th className="py-2.5 pr-3">Name</th>
                <th className="py-2.5 pr-3">Type</th>
                <th className="py-2.5 pr-3">Age</th>
                <th className="py-2.5 pr-3">Payment</th>
                <th className="py-2.5 pr-3">Approved</th>
                <th className="py-2.5 pr-3">Category</th>
                <th className="py-2.5 pr-3">Base Price</th>
                <th className="py-2.5 pr-3">Auction Status</th>
                <th className="py-2.5 pr-3 text-right">Actions</th>
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
                    className={`border-b border-black/5 ${dirty ? "bg-mint/5" : ""}`}
                  >
                    <td className="py-2 pr-3">
                      <div className="flex flex-col items-center gap-1 w-16">
                        {e.photoUrl ? (
                          <img
                            src={e.photoUrl}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover border border-sky/30"
                            onError={(ev) => {
                              ev.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-turf/10 flex items-center justify-center text-lg">
                            🏏
                          </div>
                        )}
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
                          className="text-[10px] text-turf font-bold hover:underline cursor-pointer hover:text-mint-dark"
                        >
                          {uploadingId === p._id ? "Uploading…" : "Change"}
                        </label>
                      </div>
                    </td>
                    <td className="py-2 pr-3 font-medium">
                      <div className="flex items-center gap-2">
                        {p.name}
                        {dirty && (
                          <span className="badge-unsaved">● unsaved</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-3">{p.playerType}</td>
                    <td className="py-2 pr-3">{p.age}</td>
                    <td className="py-2 pr-3">{p.paymentStatus}</td>
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={e.isApproved}
                        onChange={(ev) =>
                          setEdit(p._id, { isApproved: ev.target.checked })
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
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
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        className="input-field text-xs py-1 w-24"
                        value={e.basePrice}
                        onChange={(ev) =>
                          setEdit(p._id, { basePrice: ev.target.value })
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          p.auctionStatus === "SOLD"
                            ? "bg-mint/20 text-mint-dark border border-mint/40"
                            : p.auctionStatus === "UNSOLD"
                              ? "bg-rose/20 text-rose border border-rose/40"
                              : p.auctionStatus === "IN_AUCTION"
                                ? "bg-orchid/20 text-orchid-dark border border-orchid/40"
                                : "bg-sky/15 text-turf border border-sky/30"
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
                          className="text-rose text-xs hover:underline px-1.5 py-1 font-semibold"
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
            <p className="text-black/40 text-sm py-6 text-center">
              No players found.
            </p>
          )}
        </div>
      )}
    </OrganizerLayout>
  );
}
