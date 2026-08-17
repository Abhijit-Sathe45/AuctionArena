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
        merged[t._id] = prev[t._id] || { isApproved: t.isApproved };
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
    return edits[teamId] || { isApproved: false };
  }
  function setEdit(teamId, patch) {
    setEdits((prev) => ({
      ...prev,
      [teamId]: { ...getEdit(teamId), ...patch },
    }));
  }
  function isDirty(team) {
    return getEdit(team._id).isApproved !== team.isApproved;
  }

  async function saveRow(team) {
    setStatus({ type: "", message: "" });
    setSavingId(team._id);
    try {
      await api.put(`/organizer-admin/teams/${team._id}`, {
        isApproved: getEdit(team._id).isApproved,
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-3xl text-turf">Teams</h1>
          <p className="text-black/50">
            Approve teams and manage owners before auction starts. Nothing is
            saved until you click Save. Updates live as teams register.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd((s) => !s)}>
          {showAdd ? "Cancel" : "+ Add Team Manually"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addTeam} className="card mb-4 grid grid-cols-2 gap-3">
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.ownerPlaysMatch}
              onChange={(e) =>
                setForm((f) => ({ ...f, ownerPlaysMatch: e.target.checked }))
              }
            />
            Owner also plays
          </label>
          <button className="btn-secondary col-span-2">Add Team</button>
        </form>
      )}

      {dirtyCount > 0 && (
        <div className="flex items-center justify-between bg-gold/10 border border-gold/40 rounded-lg px-4 py-3 mb-3">
          <p className="text-sm font-medium text-gold-dark">
            {dirtyCount} team{dirtyCount > 1 ? "s have" : " has"} unsaved
            changes
          </p>
          <button onClick={saveAll} className="btn-primary text-sm py-1.5 px-4">
            💾 Save All Changes
          </button>
        </div>
      )}

      <StatusMessage type={status.type} message={status.message} />

      {loading ? (
        <SkeletonTable rows={5} cols={7} />
      ) : (
        <div className="card overflow-x-auto mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-black/50 border-b border-black/10">
                <th className="py-2 pr-3">Team</th>
                <th className="py-2 pr-3">Owner</th>
                <th className="py-2 pr-3">Plays?</th>
                <th className="py-2 pr-3">Payment</th>
                <th className="py-2 pr-3">Approved</th>
                <th className="py-2 pr-3">Purse Remaining</th>
                <th className="py-2 pr-3"></th>
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
                      Rs. {t.purseRemaining?.toLocaleString("en-IN")} /{" "}
                      {t.totalPurse?.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveRow(t)}
                          disabled={!dirty || savingId === t._id}
                          className="btn-save"
                        >
                          {savingId === t._id ? "⏳ Saving…" : "💾 Save"}
                        </button>
                        <button
                          onClick={() => deleteTeam(t._id)}
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
