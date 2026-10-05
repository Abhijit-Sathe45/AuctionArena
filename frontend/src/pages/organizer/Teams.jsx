import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../../api/axios";
import OrganizerLayout from "../../components/OrganizerLayout";
import StatusMessage from "../../components/StatusMessage";
import { SkeletonTable } from "../../components/Skeleton";
import ImageUpload from "../../components/ImageUpload";
import { compressImage } from "../../utils/imageCompressor";
import { useToast } from "../../context/ToastContext";
import { getSocket } from "../../socket";

export default function Teams() {
  const { showToast } = useToast();
  const [teams, setTeams] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadingFormLogo, setUploadingFormLogo] = useState(false);
  const [form, setForm] = useState({
    ownerName: "",
    teamName: "",
    ownerPlaysMatch: false,
    phone: "",
    teamLogoUrl: null,
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
    return edits[teamId] || { isApproved: false, biddingPin: "", teamLogoUrl: null };
  }
  function setEdit(teamId, patch) {
    setEdits((prev) => ({
      ...prev,
      [teamId]: { ...getEdit(teamId), ...patch },
    }));
  }
  function isDirty(team) {
    const e = getEdit(team._id);
    const logoDirty = e.teamLogoUrl !== undefined && e.teamLogoUrl !== (team.teamLogoUrl || null);
    return e.isApproved !== team.isApproved || (e.biddingPin && e.biddingPin !== team.biddingPin) || logoDirty;
  }

  async function handleLogoChange(team, file) {
    if (!file) return;
    setUploadingId(team._id);
    try {
      const optimizedFile = await compressImage(file, 1200, 1200, 0.85);
      const formData = new FormData();
      formData.append("file", optimizedFile);
      const { data } = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      setEdit(team._id, { teamLogoUrl: data.url });
      showToast("Team logo uploaded — click Save to apply.", "info");
    } catch (err) {
      showToast("Logo upload failed. Please try again.", "error");
    } finally {
      setUploadingId(null);
    }
  }

  async function saveRow(team) {
    setStatus({ type: "", message: "" });
    setSavingId(team._id);
    try {
      const e = getEdit(team._id);
      await api.put(`/organizer-admin/teams/${team._id}`, {
        isApproved: e.isApproved,
        biddingPin: e.biddingPin,
        teamLogoUrl: e.teamLogoUrl !== undefined ? e.teamLogoUrl : team.teamLogoUrl,
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
        teamLogoUrl: null,
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

  const [searchQuery, setSearchQuery] = useState("");
  const dirtyCount = teams.filter(isDirty).length;

  const visibleTeams = teams.filter((t) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (t.teamName || "").toLowerCase().includes(q);
      const ownerMatch = (t.ownerName || "").toLowerCase().includes(q);
      const phoneMatch = (t.phone || "").toLowerCase().includes(q);
      return nameMatch || ownerMatch || phoneMatch;
    }
    return true;
  });

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
          <p className="text-mauve-dark text-xs sm:text-sm mt-0.5">
            Approve teams and manage owners before auction starts.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <input
            type="text"
            placeholder="🔍 Search team, owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field w-full sm:w-48 text-xs py-2"
          />
          <button className="btn-primary text-xs sm:text-sm py-2 px-4 w-full sm:w-auto shrink-0 font-bold" onClick={() => setShowAdd((s) => !s)}>
            {showAdd ? "✕ Cancel" : "+ Add Team Manually"}
          </button>
        </div>
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
          <div className="col-span-1 sm:col-span-2">
            <ImageUpload
              label="Team Logo"
              shape="square"
              onUploaded={(url) => setForm((f) => ({ ...f, teamLogoUrl: url }))}
              onUploadingChange={setUploadingFormLogo}
            />
          </div>
          <button
            type="submit"
            disabled={uploadingFormLogo}
            className="btn-secondary col-span-1 sm:col-span-2 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploadingFormLogo ? "Uploading Logo…" : "Add Team"}
          </button>
        </form>
      )}

      {dirtyCount > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-emerald-50 border border-emerald-300 rounded-2xl px-4 py-3 mb-3 shadow-xs">
          <p className="text-xs sm:text-sm font-bold text-emerald-900">
            👥 {dirtyCount} franchise team{dirtyCount > 1 ? "s have" : " has"} unsaved changes
          </p>
          <button onClick={saveAll} className="btn-primary text-xs sm:text-sm py-2 px-5 w-full sm:w-auto font-bold shadow-xs">
            💾 Save All Changes
          </button>
        </div>
      )}

      <StatusMessage type={status.type} message={status.message} />

      {loading ? (
        <SkeletonTable rows={5} cols={7} />
      ) : (
        <div className="card overflow-x-auto mt-3 scroll-touch shadow-xs border-slate-200">
          <table className="w-full text-xs sm:text-sm min-w-[620px]">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2.5 pr-3 font-semibold">Franchise</th>
                <th className="py-2.5 pr-3 font-semibold">Owner</th>
                <th className="py-2.5 pr-3 font-semibold">Plays?</th>
                <th className="py-2.5 pr-3 font-semibold">Payment</th>
                <th className="py-2.5 pr-3 font-semibold">Approved</th>
                <th className="py-2.5 pr-3 font-semibold">Bidding PIN</th>
                <th className="py-2.5 pr-3 font-semibold">Purse Remaining</th>
                <th className="py-2.5 pr-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleTeams.map((t) => {
                const e = getEdit(t._id);
                const dirty = isDirty(t);
                const currentLogo = e.teamLogoUrl !== undefined && e.teamLogoUrl !== null ? e.teamLogoUrl : t.teamLogoUrl;
                const inputId = `team-logo-input-${t._id}`;
                return (
                  <tr
                    key={t._id}
                    className={`border-b border-slate-100 ${dirty ? "bg-emerald-50/50" : "hover:bg-slate-50/50"}`}
                  >
                    <td className="py-2.5 pr-3 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="relative group shrink-0">
                          {currentLogo ? (
                            <img
                              src={currentLogo}
                              className="w-9 h-9 rounded-full object-contain p-0.5 bg-white border border-slate-300 shadow-2xs"
                              alt=""
                              onError={(ev) => {
                                ev.target.style.display = "none";
                                if (ev.target.nextSibling) ev.target.nextSibling.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-9 h-9 rounded-full bg-[#0B1E3D] text-amber-300 items-center justify-center text-xs font-bold shadow-2xs ${
                              currentLogo ? "hidden" : "flex"
                            }`}
                          >
                            🏏
                          </div>
                          <input
                            id={inputId}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(ev) => handleLogoChange(t, ev.target.files[0])}
                          />
                          <label
                            htmlFor={inputId}
                            title="Click to upload/change team logo"
                            className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white cursor-pointer transition-opacity"
                          >
                            {uploadingId === t._id ? "…" : "📷"}
                          </label>
                        </div>
                        <span className="text-slate-900 font-bold">{t.teamName}</span>
                        {dirty && (
                          <span className="badge-unsaved">● unsaved</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-700 font-medium">{t.ownerName}</td>
                    <td className="py-2.5 pr-3 text-slate-600">
                      {t.ownerPlaysMatch ? "Yes" : "No"}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        t.paymentStatus === "PAID"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {t.paymentStatus}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded text-[#0F5132] accent-[#0F5132] cursor-pointer"
                        checked={e.isApproved}
                        onChange={(ev) =>
                          setEdit(t._id, { isApproved: ev.target.checked })
                        }
                      />
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          maxLength={6}
                          className="input-field py-0.5 px-2 text-xs font-mono font-bold w-16 text-center text-[#0F5132]"
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
                          className="text-[11px] p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                          title="Copy PIN"
                        >
                          📋
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 font-semibold text-slate-900 font-mono">
                      ₹{t.purseRemaining?.toLocaleString("en-IN")} /{" "}
                      <span className="text-slate-500 font-normal">₹{t.totalPurse?.toLocaleString("en-IN")}</span>
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
          {teams.length === 0 && (
            <p className="text-slate-400 text-sm py-6 text-center">
              No franchise teams registered yet.
            </p>
          )}
        </div>
      )}
    </OrganizerLayout>
  );
}
