import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import OrganizerLayout from "../../components/OrganizerLayout";
import StatusMessage from "../../components/StatusMessage";
import StreamOverlayModal from "../../components/StreamOverlayModal";
import { useAuth } from "../../context/AuthContext";

export default function Settings() {
  const { organizer } = useAuth();
  const [settings, setSettings] = useState(null);
  const [original, setOriginal] = useState(null); // last-saved snapshot, to detect unsaved changes
  const [status, setStatus] = useState({ type: "", message: "" });
  const [saving, setSaving] = useState(false);
  const [showOverlayModal, setShowOverlayModal] = useState(false);

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
        <p className="text-turf/70 font-medium">Loading…</p>
      </OrganizerLayout>
    );

  return (
    <OrganizerLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
        <h1 className="font-display text-2xl sm:text-3xl text-turf">Auction Settings</h1>
        {isDirty && <span className="badge-unsaved self-start sm:self-auto">● unsaved changes</span>}
      </div>
      <p className="text-mauve-dark text-xs sm:text-sm mb-4 sm:mb-6">
        Configure limits, fees and purse rules for your tournament. Nothing is
        saved until you click Save Settings.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="card space-y-4 shadow-sm border-mauve/20">
          <h2 className="font-semibold text-sm sm:text-base text-turf">Registration Limits</h2>
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

        <div className="card space-y-4 shadow-sm border-mauve/20">
          <h2 className="font-semibold text-sm sm:text-base text-turf">Registration Fees (Razorpay)</h2>
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

        <div className="card space-y-4 shadow-sm border-mauve/20">
          <h2 className="font-semibold text-sm sm:text-base text-turf">Purse & Squad Rules</h2>
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

        <div className="card space-y-4 shadow-sm border-mauve/20">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm sm:text-base text-turf">Auction Countdown Settings</h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                settings.countdownEnabled
                  ? "bg-mint/20 text-mint-dark border border-mint/40"
                  : "bg-black/10 text-mauve-dark"
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
                  <p className="text-xs text-mauve-dark mt-1">Enter duration between 5 and 600 seconds.</p>
                </div>
              )}

              <p className="text-xs text-turf bg-sky/15 p-2.5 rounded-xl border border-sky/30">
                ⏱️ When bidding begins for a player, a{" "}
                <strong>{settings.countdownDuration || 60}s</strong> countdown will run automatically on the Watch Live spectator screen.
              </p>
            </div>
          ) : (
            <div className="pt-2 border-t border-black/5">
              <p className="text-xs text-mauve-dark italic bg-black/5 p-2.5 rounded-xl">
                Countdown is disabled. Bidding will proceed without a timer until the organizer manually selects Mark SOLD or Mark UNSOLD.
              </p>
            </div>
          )}
        </div>

        <div className="card space-y-3 shadow-sm border-mauve/20">
          <h2 className="font-semibold text-sm sm:text-base text-turf">Bid Increment Rules</h2>
          <p className="text-xs text-mauve-dark">
            Bids increase by this much depending on the current price range.
          </p>
          {settings.bidIncrementRules.map((r, i) => (
            <div key={i} className="flex flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2 items-center text-xs sm:text-sm bg-sky/10 p-2.5 rounded-xl border border-sky/20">
              <span className="text-turf font-medium">Up to Rs.</span>
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
              <span className="text-turf font-medium">→ +Rs.</span>
              <input
                type="number"
                className="input-field w-20 sm:w-24 py-1 text-xs font-bold text-mint-dark"
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

        <div className="card space-y-4 shadow-sm border-mauve/20">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm sm:text-base text-turf">📱 Team Owner Mobile Bidding Remote</h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                settings.teamOwnerBiddingEnabled
                  ? "bg-mint/20 text-mint-dark border border-mint/40"
                  : "bg-black/10 text-mauve-dark"
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
              <p className="text-xs text-mauve-dark leading-relaxed">
                When enabled, team owners can open the mobile remote link on their phones, choose their team, enter their secret <strong>4-digit PIN</strong>, and place bids live during the auction with purse shield protection.
              </p>

              {organizer?.slug && (
                <div className="bg-sky/15 border border-sky/30 rounded-2xl p-3 space-y-2">
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
                  <p className="text-[10px] text-mauve-dark">
                    💡 View and edit individual team 4-digit PINs in the <strong>Teams</strong> tab.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="pt-2 border-t border-black/5">
              <p className="text-xs text-mauve-dark italic bg-black/5 p-2.5 rounded-xl">
                Remote bidding is disabled. Only the organizer can place bids from the Live Auction screen.
              </p>
            </div>
          )}
        </div>

        {/* OBS & Live Stream Broadcast Graphics Section */}
        <div className="card space-y-4 border-2 border-mint/40 bg-gradient-to-br from-mint/10 via-white to-white shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-turf flex items-center gap-2">
              <span>🎥</span> OBS & Live Stream Overlay Studio
            </h2>
            <span className="text-[10px] font-black uppercase tracking-wider bg-mint text-turf-dark px-2.5 py-0.5 rounded-full shadow-sm">
              YouTube & FB Live
            </span>
          </div>

          <p className="text-xs text-mauve-dark leading-relaxed">
            Generate transparent TV lower-thirds, side scorecards, and live countdown graphics directly inside <strong>OBS Studio</strong>, <strong>vMix</strong>, or <strong>Streamlabs</strong> for broadcast-quality auction live streams.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowOverlayModal(true)}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-sm"
            >
              <span>⚙️</span> Open OBS Overlay Link Generator & Preview
            </button>
            {organizer?.slug && (
              <a
                href={`${window.location.origin}/overlay/${organizer.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-turf font-bold hover:underline underline-offset-2 flex items-center gap-1 hover:text-mint-dark"
              >
                👁️ Preview Overlay in New Tab ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* OBS Stream Overlay Setup Modal */}
      {organizer?.slug && (
        <StreamOverlayModal
          isOpen={showOverlayModal}
          onClose={() => setShowOverlayModal(false)}
          slug={organizer.slug}
          tournamentName={organizer.tournamentName}
        />
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3 sticky bottom-3 sm:bottom-4 p-3 bg-ivory/95 backdrop-blur-md rounded-2xl border border-mauve/30 shadow-lg z-20">
        <button
          className="btn-primary py-2.5 px-6 text-sm sm:text-base font-bold shadow-md shadow-mint/25 disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
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
    <label className="flex items-center gap-2 text-sm text-turf font-medium cursor-pointer">
      <input
        type="checkbox"
        className="rounded text-mint accent-mint cursor-pointer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
