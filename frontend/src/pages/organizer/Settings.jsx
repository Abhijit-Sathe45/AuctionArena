import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import OrganizerLayout from "../../components/OrganizerLayout";
import StatusMessage from "../../components/StatusMessage";
import { useAuth } from "../../context/AuthContext";

export default function Settings() {
  const { organizer } = useAuth();
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
        <h1 className="font-display text-2xl sm:text-3xl text-turf">Auction Settings</h1>
        {isDirty && <span className="badge-unsaved self-start sm:self-auto">● unsaved changes</span>}
      </div>
      <p className="text-black/50 text-xs sm:text-sm mb-4 sm:mb-6">
        Configure limits, fees and purse rules for your tournament. Nothing is
        saved until you click Save Settings.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="card space-y-4">
          <h2 className="font-semibold text-sm sm:text-base">Registration Limits</h2>
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
          <h2 className="font-semibold text-sm sm:text-base">Registration Fees (Razorpay)</h2>
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
          <h2 className="font-semibold text-sm sm:text-base">Purse & Squad Rules</h2>
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

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm sm:text-base">Auction Countdown Settings</h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                settings.countdownEnabled
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-black/10 text-black/60"
              }`}
            >
              {settings.countdownEnabled ? "ON" : "OFF"}
            </span>
          </div>

          <Toggle
            label="Enable Auction Countdown Timer"
            checked={!!settings.countdownEnabled}
            onChange={(v) => update("countdownEnabled", v)}
          />

          {settings.countdownEnabled ? (
            <div className="space-y-3 pt-2 border-t border-black/5 animate-fade-in">
              <label className="label-text">Countdown Duration</label>
              <select
                className="input-field"
                value={
                  [15, 30, 45, 60, 90, 120].includes(settings.countdownDuration)
                    ? settings.countdownDuration
                    : "custom"
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "custom") {
                    if ([15, 30, 45, 60, 90, 120].includes(settings.countdownDuration)) {
                      update("countdownDuration", 75);
                    }
                  } else {
                    update("countdownDuration", Number(val));
                  }
                }}
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={45}>45 seconds</option>
                <option value={60}>60 seconds (1 minute)</option>
                <option value={90}>90 seconds (1.5 minutes)</option>
                <option value={120}>2 minutes (120 seconds)</option>
                <option value="custom">Custom Duration…</option>
              </select>

              {![15, 30, 45, 60, 90, 120].includes(settings.countdownDuration) && (
                <div>
                  <label className="label-text">Custom Duration (seconds)</label>
                  <input
                    type="number"
                    min="5"
                    max="600"
                    className="input-field"
                    value={settings.countdownDuration || 60}
                    onChange={(e) => update("countdownDuration", Math.max(5, Number(e.target.value)))}
                  />
                  <p className="text-xs text-black/50 mt-1">Enter duration between 5 and 600 seconds.</p>
                </div>
              )}

              <p className="text-xs text-turf-light/90 bg-turf/5 p-2.5 rounded-lg border border-turf/10">
                ⏱️ When bidding begins for a player, a{" "}
                <strong>{settings.countdownDuration || 60}s</strong> countdown will run automatically on the Watch Live spectator screen.
              </p>
            </div>
          ) : (
            <div className="pt-2 border-t border-black/5">
              <p className="text-xs text-black/50 italic bg-black/5 p-2.5 rounded-lg">
                Countdown is disabled. Bidding will proceed without a timer until the organizer manually selects Mark SOLD or Mark UNSOLD.
              </p>
            </div>
          )}
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold text-sm sm:text-base">Bid Increment Rules</h2>
          <p className="text-xs text-black/50">
            Bids increase by this much depending on the current price range.
          </p>
          {settings.bidIncrementRules.map((r, i) => (
            <div key={i} className="flex flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2 items-center text-xs sm:text-sm bg-turf/5 p-2 rounded-lg">
              <span className="text-black/70">Up to Rs.</span>
              <input
                type="number"
                className="input-field w-24 sm:w-28 py-1 text-xs"
                value={r.upTo}
                onChange={(e) => {
                  const rules = [...settings.bidIncrementRules];
                  rules[i].upTo = Number(e.target.value);
                  update("bidIncrementRules", rules);
                }}
              />
              <span className="text-black/70">→ +Rs.</span>
              <input
                type="number"
                className="input-field w-20 sm:w-24 py-1 text-xs"
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

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm sm:text-base">📱 Team Owner Mobile Bidding Remote</h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                settings.teamOwnerBiddingEnabled
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-black/10 text-black/60"
              }`}
            >
              {settings.teamOwnerBiddingEnabled ? "ON" : "OFF"}
            </span>
          </div>

          <Toggle
            label="Enable Team Owner Mobile Remote Bidding (/bid/:slug)"
            checked={!!settings.teamOwnerBiddingEnabled}
            onChange={(v) => update("teamOwnerBiddingEnabled", v)}
          />

          {settings.teamOwnerBiddingEnabled ? (
            <div className="space-y-3 pt-2 border-t border-black/5 animate-fade-in">
              <p className="text-xs text-black/70 leading-relaxed">
                When enabled, team owners can open the mobile remote link on their phones, choose their team, enter their secret <strong>4-digit PIN</strong>, and place bids live during the auction with purse shield protection.
              </p>

              {organizer?.slug && (
                <div className="bg-turf/5 border border-turf/15 rounded-xl p-3 space-y-2">
                  <span className="text-[11px] font-bold text-turf block">Team Owner Bidding Link:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/bid/${organizer.slug}`}
                      className="input-field py-1 text-xs font-mono bg-white select-all flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/bid/${organizer.slug}`);
                        alert("Team Bidding link copied to clipboard!");
                      }}
                      className="btn-secondary py-1 px-3 text-xs shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-[10px] text-black/50">
                    💡 View and edit individual team 4-digit PINs in the <strong>Teams</strong> tab.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="pt-2 border-t border-black/5">
              <p className="text-xs text-black/50 italic bg-black/5 p-2.5 rounded-lg">
                Remote bidding is disabled. Only the organizer can place bids from the Live Auction screen.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 sticky bottom-3 sm:bottom-4 p-3 bg-ivory/95 backdrop-blur-md rounded-xl border border-black/10 shadow-lg z-20">
        <button
          className="btn-primary py-2.5 px-5 text-sm sm:text-base disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
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
