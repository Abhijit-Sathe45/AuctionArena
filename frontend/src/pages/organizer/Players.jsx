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

  const visible = players.filter(
    (p) => filter === "ALL" || p.auctionStatus === filter,
  );
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-3xl text-turf">Players</h1>
          <p className="text-black/50">
            Approve registrations, assign categories & base prices before
            auction. If a player's photo shows the fallback icon, click "Change"
            to upload a replacement. Nothing is saved until you click Save.
          </p>
        </div>
        <select
          className="input-field w-44"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="ALL">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="SOLD">Sold</option>
          <option value="UNSOLD">Unsold</option>
        </select>
      </div>

      {dirtyCount > 0 && (
        <div className="flex items-center justify-between bg-gold/10 border border-gold/40 rounded-lg px-4 py-3 mb-3">
          <p className="text-sm font-medium text-gold-dark">
            {dirtyCount} player{dirtyCount > 1 ? "s have" : " has"} unsaved
            changes
          </p>
          <button onClick={saveAll} className="btn-primary text-sm py-1.5 px-4">
            💾 Save All Changes
          </button>
        </div>
      )}

      <StatusMessage type={status.type} message={status.message} />

      {loading ? (
        <SkeletonTable rows={6} cols={10} />
      ) : (
        <div className="card overflow-x-auto mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-black/50 border-b border-black/10">
                <th className="py-2 pr-3">Photo</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Age</th>
                <th className="py-2 pr-3">Payment</th>
                <th className="py-2 pr-3">Approved</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Base Price</th>
                <th className="py-2 pr-3">Auction Status</th>
                <th className="py-2 pr-3"></th>
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
                    className={`border-b border-black/5 ${dirty ? "bg-gold/5" : ""}`}
                  >
                    <td className="py-2 pr-3">
                      <div className="flex flex-col items-center gap-1 w-16">
                        {e.photoUrl ? (
                          <img
                            src={e.photoUrl}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
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
                          className="text-[10px] text-turf font-semibold hover:underline cursor-pointer"
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
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.auctionStatus === "SOLD"
                            ? "bg-green-100 text-green-700"
                            : p.auctionStatus === "UNSOLD"
                              ? "bg-red-100 text-red-700"
                              : p.auctionStatus === "IN_AUCTION"
                                ? "bg-gold/20 text-gold-dark"
                                : "bg-black/5 text-black/50"
                        }`}
                      >
                        {p.auctionStatus}
                      </span>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveRow(p)}
                          disabled={!dirty || savingId === p._id}
                          className="btn-save"
                        >
                          {savingId === p._id ? "⏳ Saving…" : "💾 Save"}
                        </button>
                        <button
                          onClick={() => deletePlayer(p._id)}
                          className="text-clay text-xs hover:underline"
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
