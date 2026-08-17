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
      `This will PERMANENTLY delete "${organizer.tournamentName}" along with every registered player, team, category, and the full auction history. This cannot be undone.\n\nType the tournament name exactly to confirm:`,
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
    <div className="min-h-screen bg-ivory p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-turf">Super Admin Panel</h1>
          <p className="text-black/50 text-sm">
            Manage software pricing and organizer accounts.
          </p>
        </div>
        <button onClick={handleLogout} className="btn-secondary">
          Log out
        </button>
      </div>

      <StatusMessage type={status.type} message={status.message} />

      <div className="card mb-6 mt-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold">Software Pricing Plans</h2>
          {dirtyPlanCount > 0 && (
            <span className="badge-unsaved">● {dirtyPlanCount} unsaved</span>
          )}
        </div>
        <p className="text-xs text-black/40 mb-3">
          Changes are not applied until you click Save on each plan.
        </p>
        <div className="grid grid-cols-3 gap-4">
          {plans.map((plan) => {
            const e = getPlanEdit(plan._id);
            const dirty = isPlanDirty(plan);
            return (
              <div
                key={plan._id}
                className={`border-2 rounded-lg p-4 transition-colors ${dirty ? "border-gold bg-gold/5" : "border-black/10"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm">{plan.label}</p>
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
                  className="btn-primary text-sm w-full disabled:opacity-40 disabled:cursor-not-allowed"
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
            <p className="text-black/40 text-sm col-span-3">
              No pricing plans found.
            </p>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="font-semibold mb-3">Organizers</h2>
        <p className="text-xs text-black/40 mb-3">
          An organizer must be suspended before they can be permanently deleted
          — this is a safety gate against accidentally wiping an active
          tournament's data.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-2 pr-3">Tournament</th>
              <th className="py-2 pr-3">Organizer</th>
              <th className="py-2 pr-3">Plan</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Expiry</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {organizers.map((o) => (
              <tr key={o._id} className="border-b border-black/5">
                <td className="py-2 pr-3 font-medium">{o.tournamentName}</td>
                <td className="py-2 pr-3">
                  {o.organizerName} ({o.email})
                </td>
                <td className="py-2 pr-3">{o.planType?.replace("_", " ")}</td>
                <td className="py-2 pr-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      o.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : o.status === "EXPIRED"
                          ? "bg-red-100 text-red-700"
                          : "bg-black/10 text-black/50"
                    }`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="py-2 pr-3">
                  {o.passExpiryDate
                    ? new Date(o.passExpiryDate).toLocaleDateString("en-IN")
                    : "—"}
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => extend(o._id)} className="btn-save">
                      ⏱ Extend
                    </button>
                    {o.status === "SUSPENDED" ? (
                      <button
                        onClick={() => reactivate(o._id)}
                        className="text-green-700 text-xs font-semibold hover:underline"
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => suspend(o._id)}
                        className="text-clay text-xs font-semibold hover:underline"
                      >
                        Suspend
                      </button>
                    )}
                    {o.status === "SUSPENDED" && (
                      <button
                        onClick={() => deleteOrganizer(o)}
                        className="text-red-700 text-xs font-semibold hover:underline"
                      >
                        🗑 Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {organizers.length === 0 && (
          <p className="text-black/40 text-sm py-6 text-center">
            No organizers yet.
          </p>
        )}
      </div>
    </div>
  );
}
