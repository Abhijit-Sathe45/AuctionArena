import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import StatusMessage from "../../components/StatusMessage";
import { useAuth } from "../../context/AuthContext";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { logoutSuperAdmin } = useAuth();
  const [plans, setPlans] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [planEdits, setPlanEdits] = useState({});
  const [savingPlanId, setSavingPlanId] = useState(null);

  async function load() {
    try {
      const [{ data: p }, { data: o }] = await Promise.all([
        api.get("/super-admin/pricing-plans"),
        api.get("/super-admin/organizers"),
      ]);
      setPlans(p);
      setOrganizers(o);
      const initial = {};
      p.forEach((plan) => {
        initial[plan._id] = {
          price: plan.price,
          durationInDays: plan.durationInDays,
        };
      });
      setPlanEdits(initial);
    } catch (err) {
      setStatus({
        type: "error",
        message:
          err.response?.data?.message || "Failed to load dashboard data.",
      });
    }
  }
  useEffect(() => {
    load();
  }, []);

  function getPlanEdit(planId) {
    return planEdits[planId] || { price: 0, durationInDays: 0 };
  }
  function setPlanEdit(planId, patch) {
    setPlanEdits((prev) => ({
      ...prev,
      [planId]: { ...getPlanEdit(planId), ...patch },
    }));
  }
  function isPlanDirty(plan) {
    const e = getPlanEdit(plan._id);
    return (
      Number(e.price) !== plan.price ||
      Number(e.durationInDays) !== plan.durationInDays
    );
  }

  async function savePlan(plan) {
    setStatus({ type: "", message: "" });
    setSavingPlanId(plan._id);
    try {
      const e = getPlanEdit(plan._id);
      await api.post("/super-admin/pricing-plans", {
        ...plan,
        price: Number(e.price),
        durationInDays: Number(e.durationInDays),
      });
      setStatus({ type: "success", message: `${plan.label} updated.` });
      await load();
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.message || "Failed to save plan.",
      });
    } finally {
      setSavingPlanId(null);
    }
  }

  async function suspend(id) {
    await api.post(`/super-admin/organizers/${id}/suspend`);
    load();
  }
  async function reactivate(id) {
    await api.post(`/super-admin/organizers/${id}/reactivate`);
    load();
  }
  async function extend(id) {
    const days = prompt("Extend pass by how many days?", "30");
    if (!days) return;
    await api.post(`/super-admin/organizers/${id}/extend`, {
      days: Number(days),
    });
    load();
  }

  async function deleteOrganizer(organizer) {
    const confirmation = prompt(
      `This will PERMANENTLY delete "${organizer.tournamentName}" along with all uploaded images (Cloudinary), registered players, teams, categories, and auction history. This cannot be undone.\n\nType the tournament name exactly to confirm:`,
    );
    if (confirmation !== organizer.tournamentName) {
      if (confirmation !== null)
        setStatus({
          type: "error",
          message: "Deletion cancelled — the tournament name did not match.",
        });
      return;
    }
    setStatus({ type: "", message: "" });
    try {
      const { data } = await api.delete(
        `/super-admin/organizers/${organizer._id}`,
      );
      setStatus({ type: "success", message: data.message });
      await load();
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.message || "Failed to delete organizer.",
      });
    }
  }

  function handleLogout() {
    logoutSuperAdmin();
    navigate("/super-admin/login");
  }

  const dirtyPlanCount = plans.filter(isPlanDirty).length;

  return (
    <div className="min-h-screen bg-ivory p-3.5 sm:p-6 text-turf">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-turf">Super Admin Panel</h1>
          <p className="text-mauve-dark text-xs sm:text-sm">
            Manage software pricing and organizer accounts.
          </p>
        </div>
        <button onClick={handleLogout} className="btn-secondary text-xs sm:text-sm py-2 px-4 w-full sm:w-auto shrink-0">
          Log out
        </button>
      </div>

      <StatusMessage type={status.type} message={status.message} />

      <div className="card mb-6 mt-3 shadow-sm border-mauve/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
          <h2 className="font-semibold text-sm sm:text-base text-turf">Software Pricing Plans</h2>
          {dirtyPlanCount > 0 && (
            <span className="badge-unsaved self-start sm:self-auto">● {dirtyPlanCount} unsaved</span>
          )}
        </div>
        <p className="text-xs text-mauve-dark mb-3">
          Changes are not applied until you click Save on each plan.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {plans.map((plan) => {
            const e = getPlanEdit(plan._id);
            const dirty = isPlanDirty(plan);
            return (
              <div
                key={plan._id}
                className={`border-2 rounded-2xl p-3.5 sm:p-4 transition-all ${dirty ? "border-mint bg-mint/10 shadow-sm" : "border-mauve/25 hover:border-mint/50"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-sm text-turf">{plan.label}</p>
                  {dirty && <span className="badge-unsaved">● unsaved</span>}
                </div>
                <label className="label-text">Price (Rs.)</label>
                <input
                  type="number"
                  className="input-field mb-2"
                  value={e.price}
                  onChange={(ev) =>
                    setPlanEdit(plan._id, { price: ev.target.value })
                  }
                />
                <label className="label-text">Duration (days)</label>
                <input
                  type="number"
                  className="input-field mb-3"
                  value={e.durationInDays}
                  onChange={(ev) =>
                    setPlanEdit(plan._id, { durationInDays: ev.target.value })
                  }
                />
                <button
                  onClick={() => savePlan(plan)}
                  disabled={!dirty || savingPlanId === plan._id}
                  className="btn-primary text-xs sm:text-sm w-full py-2 font-bold shadow-sm shadow-mint/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {savingPlanId === plan._id
                    ? "⏳ Saving…"
                    : dirty
                      ? "💾 Save Changes"
                      : "✓ Saved"}
                </button>
              </div>
            );
          })}
          {plans.length === 0 && (
            <p className="text-mauve text-sm col-span-full">
              No pricing plans found.
            </p>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto scroll-touch shadow-sm border-mauve/20">
        <h2 className="font-semibold text-sm sm:text-base mb-1 text-turf">Organizers</h2>
        <p className="text-xs text-mauve-dark mb-3">
          Manage organizer accounts. Deleting an organizer permanently removes all registered players, teams, auction logs, and all uploaded photos/logos from Cloudinary.
        </p>
        <table className="w-full text-xs sm:text-sm min-w-[680px]">
          <thead>
            <tr className="text-left text-mauve-dark border-b border-mauve/20">
              <th className="py-2.5 pr-3">Tournament</th>
              <th className="py-2.5 pr-3">Organizer</th>
              <th className="py-2.5 pr-3">Plan</th>
              <th className="py-2.5 pr-3">Status</th>
              <th className="py-2.5 pr-3">Expiry</th>
              <th className="py-2.5 pr-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {organizers.map((o) => (
              <tr key={o._id} className="border-b border-black/5">
                <td className="py-2 pr-3 font-bold text-turf">{o.tournamentName}</td>
                <td className="py-2 pr-3 text-mauve-dark">
                  {o.organizerName} ({o.email})
                </td>
                <td className="py-2 pr-3 font-medium">{o.planType?.replace("_", " ")}</td>
                <td className="py-2 pr-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      o.status === "ACTIVE"
                        ? "bg-mint/20 text-mint-dark border border-mint/40"
                        : o.status === "EXPIRED"
                          ? "bg-rose/20 text-rose border border-rose/40"
                          : "bg-black/10 text-mauve-dark"
                    }`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="py-2 pr-3 text-mauve-dark font-mono text-xs">
                  {o.passExpiryDate
                    ? new Date(o.passExpiryDate).toLocaleDateString("en-IN")
                    : "—"}
                </td>
                <td className="py-2.5 pr-3 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => extend(o._id)} className="btn-save">
                      ⏱ Extend
                    </button>
                    {o.status === "SUSPENDED" ? (
                      <button
                        onClick={() => reactivate(o._id)}
                        className="text-mint-dark text-xs font-bold hover:underline px-1.5 py-1"
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => suspend(o._id)}
                        className="text-amber-700 text-xs font-semibold hover:underline px-1.5 py-1"
                      >
                        Suspend
                      </button>
                    )}
                    <button
                      onClick={() => deleteOrganizer(o)}
                      className="text-rose text-xs font-bold hover:underline px-1.5 py-1"
                      title="Permanently delete organizer and all Cloudinary images"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {organizers.length === 0 && (
          <p className="text-mauve text-sm py-6 text-center">
            No organizers yet.
          </p>
        )}
      </div>
    </div>
  );
}
