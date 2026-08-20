import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../../api/axios";
import OrganizerLayout from "../../components/OrganizerLayout";
import StatusMessage from "../../components/StatusMessage";
import { SkeletonTable } from "../../components/Skeleton";
import { useToast } from "../../context/ToastContext";
import { getSocket } from "../../socket";

export default function Teams() {
  const { showToast } = useToast();
  const [teams, setTeams] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    ownerName: "",
    teamName: "",
    ownerPlaysMatch: false,
    phone: "",
  });
  // Local pending edits per team, keyed by team id. Nothing is sent to the server
  // until that row's "Save" button is clicked.
  const [edits, setEdits] = useState({});
  const [savingId, setSavingId] = useState(null);
  const refreshTimer = useRef(null);
  const info = JSON.parse(localStorage.getItem("organizerInfo") || "{}");

  const load = useCallback(async () => {
    const { data } = await api.get("/organizer-admin/teams");
    setTeams(data);
    // Preserve any in-progress edits instead of wiping them out on a live-triggered refresh
    setEdits((prev) => {
      const merged = {};
      data.forEach((t) => {
        merged[t._id] = prev[t._id] || { isApproved: t.isApproved, biddingPin: t.biddingPin || "" };
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
      if (payload?.kind === "team") {
        showToast("A new team just registered!", "info");
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

  function getEdit(teamId) {
    return edits[teamId] || { isApproved: false, biddingPin: "" };
  }
  function setEdit(teamId, patch) {
    setEdits((prev) => ({
      ...prev,
      [teamId]: { ...getEdit(teamId), ...patch },
    }));
  }
  function isDirty(team) {
    const e = getEdit(team._id);
    return e.isApproved !== team.isApproved || (e.biddingPin && e.biddingPin !== team.biddingPin);
  }

  async function saveRow(team) {
    setStatus({ type: "", message: "" });
    setSavingId(team._id);
    try {
      const e = getEdit(team._id);
      await api.put(`/organizer-admin/teams/${team._id}`, {
        isApproved: e.isApproved,
        biddingPin: e.biddingPin,
      });
      showToast(`Saved changes for ${team.teamName}.`, "success");
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

  async function deleteTeam(id) {
    if (!confirm("Remove this team?")) return;
    await api.delete(`/organizer-admin/teams/${id}`);
    showToast("Team removed.", "info");
    load();
  }
  async function addTeam(e) {
    e.preventDefault();
    try {
      await api.post("/organizer-admin/teams", form);
      setForm({
        ownerName: "",
        teamName: "",
        ownerPlaysMatch: false,
        phone: "",
      });
      setShowAdd(false);
      showToast(`${form.teamName} added.`, "success");
      load();
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.message || "Failed to add team",
      });
    }
  }

  const dirtyCount = teams.filter(isDirty).length;
  async function saveAll() {
    setStatus({ type: "", message: "" });
    const dirtyTeams = teams.filter(isDirty);
    for (const t of dirtyTeams) {
      await saveRow(t);
    }
    if (dirtyTeams.length > 0)
      showToast(
        `Saved ${dirtyTeams.length} team${dirtyTeams.length > 1 ? "s" : ""}.`,
        "success",
      );
  }

  return (
    <OrganizerLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-turf">Teams</h1>
          <p className="text-black/50 text-xs sm:text-sm mt-0.5">
            Approve teams and manage owners before auction starts. Nothing is
            saved until you click Save. Updates live as teams register.
          </p>
        </div>
        <button className="btn-primary text-xs sm:text-sm py-2 px-4 w-full sm:w-auto shrink-0" onClick={() => setShowAdd((s) => !s)}>
          {showAdd ? "✕ Cancel" : "+ Add Team Manually"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addTeam} className="card mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            required
            placeholder="Owner Name"
            className="input-field"
            value={form.ownerName}
            onChange={(e) =>
              setForm((f) => ({ ...f, ownerName: e.target.value }))
            }
          />
          <input
            required
            placeholder="Team Name"
            className="input-field"
            value={form.teamName}
            onChange={(e) =>
              setForm((f) => ({ ...f, teamName: e.target.value }))
            }
          />
          <input
            placeholder="Phone"
            className="input-field"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-xs sm:text-sm p-1">
            <input
              type="checkbox"
              className="w-4 h-4 rounded text-turf accent-turf"
              checked={form.ownerPlaysMatch}
              onChange={(e) =>
                setForm((f) => ({ ...f, ownerPlaysMatch: e.target.checked }))
              }
            />
            Owner also plays
          </label>
          <button className="btn-secondary col-span-1 sm:col-span-2 py-2.5">Add Team</button>
        </form>
      )}

      {dirtyCount > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-gold/10 border border-gold/40 rounded-xl px-4 py-3 mb-3">
          <p className="text-xs sm:text-sm font-semibold text-gold-dark">
            {dirtyCount} team{dirtyCount > 1 ? "s have" : " has"} unsaved
            changes
          </p>
          <button onClick={saveAll} className="btn-primary text-xs sm:text-sm py-2 px-4 w-full sm:w-auto">
            💾 Save All Changes
          </button>
        </div>
      )}

      <StatusMessage type={status.type} message={status.message} />

      {loading ? (
        <SkeletonTable rows={5} cols={7} />
      ) : (
        <div className="card overflow-x-auto mt-3 scroll-touch">
          <table className="w-full text-xs sm:text-sm min-w-[620px]">
            <thead>
              <tr className="text-left text-black/50 border-b border-black/10">
                <th className="py-2.5 pr-3">Team</th>
                <th className="py-2.5 pr-3">Owner</th>
                <th className="py-2.5 pr-3">Plays?</th>
                <th className="py-2.5 pr-3">Payment</th>
                <th className="py-2.5 pr-3">Approved</th>
                <th className="py-2.5 pr-3">Bidding PIN</th>
                <th className="py-2.5 pr-3">Purse Remaining</th>
                <th className="py-2.5 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => {
                const e = getEdit(t._id);
                const dirty = isDirty(t);
                return (
                  <tr
                    key={t._id}
                    className={`border-b border-black/5 ${dirty ? "bg-gold/5" : ""}`}
                  >
                    <td className="py-2 pr-3 font-medium">
                      <div className="flex items-center gap-2">
                        {t.teamLogoUrl && (
                          <img
                            src={t.teamLogoUrl}
                            className="w-7 h-7 rounded-full object-cover"
                            alt=""
                          />
                        )}
                        {t.teamName}
                        {dirty && (
                          <span className="badge-unsaved">● unsaved</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-3">{t.ownerName}</td>
                    <td className="py-2 pr-3">
                      {t.ownerPlaysMatch ? "Yes" : "No"}
                    </td>
                    <td className="py-2 pr-3">{t.paymentStatus}</td>
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={e.isApproved}
                        onChange={(ev) =>
                          setEdit(t._id, { isApproved: ev.target.checked })
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          maxLength={6}
                          className="input-field py-0.5 px-2 text-xs font-mono font-bold w-16 text-center"
                          value={e.biddingPin || ""}
                          onChange={(ev) => setEdit(t._id, { biddingPin: ev.target.value })}
                          title="4-digit secret bidding PIN"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(e.biddingPin || t.biddingPin);
                            showToast(`Copied PIN ${e.biddingPin || t.biddingPin} for ${t.teamName}`, "success");
                          }}
                          className="text-[11px] p-1 rounded bg-black/5 hover:bg-black/10 text-black/70"
                          title="Copy PIN"
                        >
                          📋
                        </button>
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      Rs. {t.purseRemaining?.toLocaleString("en-IN")} /{" "}
                      {t.totalPurse?.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => saveRow(t)}
                          disabled={!dirty || savingId === t._id}
                          className="btn-save"
                        >
                          {savingId === t._id ? "⏳ Saving…" : "💾 Save"}
                        </button>
                        <button
                          onClick={() => deleteTeam(t._id)}
                          className="text-clay text-xs hover:underline px-1.5 py-1"
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
          {teams.length === 0 && (
            <p className="text-black/40 text-sm py-6 text-center">
              No teams registered yet.
            </p>
          )}
        </div>
      )}
    </OrganizerLayout>
  );
}
