import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import OrganizerLayout from "../../components/OrganizerLayout";
import StatusMessage from "../../components/StatusMessage";

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [original, setOriginal] = useState(null); // last-saved snapshot, to detect unsaved changes
  const [status, setStatus] = useState({ type: "", message: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/organizer-admin/settings").then(({ data }) => {
      setSettings(data);
      setOriginal(data);
    });
  }, []);

  function update(field, value) {
    setSettings((s) => ({ ...s, [field]: value }));
  }

  const isDirty =
    settings &&
    original &&
    JSON.stringify(settings) !== JSON.stringify(original);

  async function save() {
    setSaving(true);
    setStatus({ type: "", message: "" });
    try {
      const { data } = await api.put("/organizer-admin/settings", settings);
      setSettings(data);
      setOriginal(data);
      setStatus({ type: "success", message: "Settings saved." });
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.message || "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!settings)
    return (
      <OrganizerLayout>
        <p>Loading…</p>
      </OrganizerLayout>
    );

  return (
    <OrganizerLayout>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-3xl text-turf">Auction Settings</h1>
        {isDirty && <span className="badge-unsaved">● unsaved changes</span>}
      </div>
      <p className="text-black/50 mb-6">
        Configure limits, fees and purse rules for your tournament. Nothing is
        saved until you click Save Settings.
      </p>

      <div className="grid grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h2 className="font-semibold">Registration Limits</h2>
          <Field
            label="Max Players Allowed"
            value={settings.maxPlayers}
            onChange={(v) => update("maxPlayers", v)}
          />
          <Field
            label="Max Teams Allowed"
            value={settings.maxTeams}
            onChange={(v) => update("maxTeams", v)}
          />
          <Toggle
            label="Player Registration Open"
            checked={settings.playerRegistrationOpen}
            onChange={(v) => update("playerRegistrationOpen", v)}
          />
          <Toggle
            label="Team Registration Open"
            checked={settings.teamRegistrationOpen}
            onChange={(v) => update("teamRegistrationOpen", v)}
          />
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Registration Fees (Razorpay)</h2>
          <Field
            label="Player Registration Fee (Rs.)"
            value={settings.playerRegistrationFee}
            onChange={(v) => update("playerRegistrationFee", v)}
          />
          <Field
            label="Team Registration Fee (Rs.)"
            value={settings.teamRegistrationFee}
            onChange={(v) => update("teamRegistrationFee", v)}
          />
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Purse & Squad Rules</h2>
          <Field
            label="Max Purse per Team (Rs.)"
            value={settings.maxPursePerTeam}
            onChange={(v) => update("maxPursePerTeam", v)}
          />
          <Field
            label="Min Players per Team"
            value={settings.minPlayersPerTeam}
            onChange={(v) => update("minPlayersPerTeam", v)}
          />
          <Field
            label="Max Players per Team"
            value={settings.maxPlayersPerTeam}
            onChange={(v) => update("maxPlayersPerTeam", v)}
          />
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold">Bid Increment Rules</h2>
          <p className="text-xs text-black/50">
            Bids increase by this much depending on the current price range.
          </p>
          {settings.bidIncrementRules.map((r, i) => (
            <div key={i} className="flex gap-2 items-center text-sm">
              <span>Up to Rs.</span>
              <input
                type="number"
                className="input-field w-28"
                value={r.upTo}
                onChange={(e) => {
                  const rules = [...settings.bidIncrementRules];
                  rules[i].upTo = Number(e.target.value);
                  update("bidIncrementRules", rules);
                }}
              />
              <span>→ increment by Rs.</span>
              <input
                type="number"
                className="input-field w-24"
                value={r.increment}
                onChange={(e) => {
                  const rules = [...settings.bidIncrementRules];
                  rules[i].increment = Number(e.target.value);
                  update("bidIncrementRules", rules);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 sticky bottom-4">
        <button
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={save}
          disabled={!isDirty || saving}
        >
          {saving ? "⏳ Saving…" : "💾 Save Settings"}
        </button>
        <StatusMessage type={status.type} message={status.message} />
      </div>
    </OrganizerLayout>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="label-text">{label}</label>
      <input
        type="number"
        className="input-field"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
