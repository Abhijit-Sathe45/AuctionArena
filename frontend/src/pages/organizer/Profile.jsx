import React, { useEffect, useState, useRef } from "react";
import api from "../../api/axios";
import OrganizerLayout from "../../components/OrganizerLayout";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { compressImage } from "../../utils/imageCompressor";

export default function Profile() {
  const { organizer, updateOrganizer } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    tournamentName: "",
    organizerName: "",
    phone: "",
    tournamentDate: "",
    logoUrl: null,
    slug: "",
    loginId: "",
    email: "",
    planType: "",
    passExpiryDate: null,
  });

  const [original, setOriginal] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    try {
      const { data } = await api.get("/organizer-admin/profile");
      const dateFormatted = data.tournamentDate
        ? new Date(data.tournamentDate).toISOString().split("T")[0]
        : "";

      const initialData = {
        tournamentName: data.tournamentName || "",
        organizerName: data.organizerName || "",
        phone: data.phone || "",
        tournamentDate: dateFormatted,
        logoUrl: data.logoUrl || null,
        slug: data.slug || "",
        loginId: data.loginId || "",
        email: data.email || "",
        planType: data.planType || "",
        passExpiryDate: data.passExpiryDate || null,
      };

      setForm(initialData);
      setOriginal(initialData);
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to load tournament profile",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const isDirty =
    original &&
    (form.tournamentName !== original.tournamentName ||
      form.organizerName !== original.organizerName ||
      form.phone !== original.phone ||
      form.tournamentDate !== original.tournamentDate ||
      form.logoUrl !== original.logoUrl);

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please upload a valid image file (PNG, JPG, WEBP, SVG)", "error");
      return;
    }

    setUploadingLogo(true);
    showToast("Compressing & uploading official logo...", "info");

    try {
      const optimizedFile = await compressImage(file, 1000, 1000, 0.9);
      const formData = new FormData();
      formData.append("file", optimizedFile);

      const { data } = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 90000,
      });

      if (data?.url) {
        updateField("logoUrl", data.url);
        showToast("Logo uploaded! Remember to click Save Changes.", "success");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to upload logo image", "error");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleRemoveLogo() {
    updateField("logoUrl", null);
    showToast("Logo removed. Click Save Changes to apply.", "info");
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();

    if (!form.tournamentName.trim()) {
      showToast("Tournament name cannot be empty", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tournamentName: form.tournamentName.trim(),
        organizerName: form.organizerName.trim(),
        phone: form.phone.trim(),
        tournamentDate: form.tournamentDate || null,
        logoUrl: form.logoUrl,
      };

      const { data } = await api.put("/organizer-admin/profile", payload);

      // Instantly update session auth state so Header, Sidebar, and Live Desk reflect changes
      updateOrganizer({
        tournamentName: data.tournamentName,
        logoUrl: data.logoUrl,
      });

      const dateFormatted = data.tournamentDate
        ? new Date(data.tournamentDate).toISOString().split("T")[0]
        : "";

      const updatedState = {
        ...form,
        tournamentName: data.tournamentName,
        organizerName: data.organizerName || "",
        phone: data.phone || "",
        tournamentDate: dateFormatted,
        logoUrl: data.logoUrl || null,
      };

      setForm(updatedState);
      setOriginal(updatedState);
      showToast("Tournament Profile & Logo updated successfully!", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save profile changes", "error");
    } finally {
      setSaving(false);
    }
  }

  function handleCopy(text, label) {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, "success");
  }

  if (loading) {
    return (
      <OrganizerLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-slate-600 font-semibold text-sm">Loading tournament profile…</p>
        </div>
      </OrganizerLayout>
    );
  }

  const origin = window.location.origin;
  const playerRegUrl = `${origin}/register/player/${form.slug}`;
  const teamRegUrl = `${origin}/register/team/${form.slug}`;
  const watchUrl = `${origin}/watch/${form.slug}`;

  return (
    <OrganizerLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl text-turf font-bold">
                Tournament Profile & Branding
              </h1>
              {isDirty && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 border border-amber-400 animate-pulse">
                  ● Unsaved changes
                </span>
              )}
            </div>
            <p className="text-mauve-dark text-xs sm:text-sm mt-0.5">
              Update your official tournament name, logo badge, match schedule, and organizer contact details.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs px-3 py-1 bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 rounded-full font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Verified Organizer
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Official Logo & Identity Banner */}
          <div className="card bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-display text-lg text-turf flex items-center gap-2 font-bold">
                <span>🛡️</span> Official Tournament Logo
              </h2>
              <span className="text-[11px] font-medium text-slate-500">
                Recommended: 500×500 px (Square PNG/JPG/WEBP)
              </span>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Logo Preview Avatar */}
              <div className="relative group shrink-0">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-slate-50 border-2 border-dashed border-emerald-500/40 flex items-center justify-center overflow-hidden p-2 shadow-sm transition-all group-hover:border-emerald-600">
                  {form.logoUrl ? (
                    <img
                      src={form.logoUrl}
                      alt="Tournament Logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <span className="text-4xl sm:text-5xl">🏏</span>
                      <span className="text-[10px] text-slate-500 font-bold mt-1">No Logo Set</span>
                    </div>
                  )}
                </div>

                {uploadingLogo && (
                  <div className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white backdrop-blur-2xs">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-1"></div>
                    <span className="text-[10px] font-bold">Uploading...</span>
                  </div>
                )}
              </div>

              {/* Action Buttons & Details */}
              <div className="flex-1 space-y-3 text-center md:text-left">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                    Change Tournament Emblem
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    This official logo appears on player registration cards, team rosters, live auction gavel display, PDF certificates, and live stream TV overlays.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    disabled={uploadingLogo}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-2 shadow-sm disabled:opacity-60"
                  >
                    <span>📁</span>
                    <span>{form.logoUrl ? "Upload New Logo" : "Choose Logo Image"}</span>
                  </button>

                  {form.logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      disabled={uploadingLogo}
                      className="btn-secondary py-2 px-3 text-xs font-bold text-rose-700 border-rose-300 hover:bg-rose-50 flex items-center gap-1.5"
                    >
                      <span>🗑️</span>
                      <span>Remove Logo</span>
                    </button>
                  )}
                </div>

                {/* Live Preview Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center gap-3 text-left">
                  <span className="text-xs font-bold text-slate-500 shrink-0">Navbar Preview:</span>
                  <div className="flex items-center gap-2 bg-[#0B1E3D] px-2.5 py-1.5 rounded-lg text-white text-xs shadow-xs">
                    {form.logoUrl ? (
                      <img
                        src={form.logoUrl}
                        alt="Logo"
                        className="w-5 h-5 rounded object-contain bg-white p-0.5"
                      />
                    ) : (
                      <span className="text-xs">🏏</span>
                    )}
                    <span className="font-bold truncate max-w-[150px] sm:max-w-[200px]">
                      {form.tournamentName || "Tournament Name"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Tournament Name & Schedule */}
          <div className="card bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="font-display text-lg text-turf flex items-center gap-2 font-bold">
                <span>🏆</span> Tournament Name & Schedule
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Supports Marathi (उदा. 🏆 नारायणडोहो चॅम्पियन लीग – पर्व ३ रे 🏆) or English (e.g. Premier League 2026).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Tournament Name Input */}
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="label-text font-bold text-slate-800 text-xs sm:text-sm">
                    Tournament Title / Name <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {form.tournamentName.length} characters
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={form.tournamentName}
                  onChange={(e) => updateField("tournamentName", e.target.value)}
                  placeholder="e.g. 🏆 नारायणडोहो चॅम्पियन लीग – पर्व ३ रे 🏆 or Premier League 2026"
                  className="input-field text-sm sm:text-base font-medium py-2.5 px-3.5 border-slate-300 focus:border-emerald-600"
                />
                <p className="text-[11px] text-slate-500">
                  💡 This name will appear on all player certificates, registration forms, team owner remote bidding consoles, and PDF reports.
                </p>
              </div>

              {/* Tournament Date */}
              <div className="space-y-1.5">
                <label className="label-text font-bold text-slate-800 text-xs sm:text-sm">
                  Tournament / Auction Date
                </label>
                <input
                  type="date"
                  value={form.tournamentDate}
                  onChange={(e) => updateField("tournamentDate", e.target.value)}
                  className="input-field text-sm py-2 px-3 border-slate-300 focus:border-emerald-600"
                />
                <p className="text-[11px] text-slate-400">
                  Date when live auction gavel bidding or tournament matches take place.
                </p>
              </div>

              {/* Organizer Contact Person */}
              <div className="space-y-1.5">
                <label className="label-text font-bold text-slate-800 text-xs sm:text-sm">
                  Organizer Contact Person Name
                </label>
                <input
                  type="text"
                  value={form.organizerName}
                  onChange={(e) => updateField("organizerName", e.target.value)}
                  placeholder="e.g. Abhijit Sathe"
                  className="input-field text-sm py-2 px-3 border-slate-300 focus:border-emerald-600"
                />
                <p className="text-[11px] text-slate-400">
                  Name shown to players and team owners as tournament coordinator.
                </p>
              </div>

              {/* Organizer Phone Number */}
              <div className="space-y-1.5">
                <label className="label-text font-bold text-slate-800 text-xs sm:text-sm">
                  Official Phone / WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="input-field text-sm py-2 px-3 border-slate-300 focus:border-emerald-600 font-mono"
                />
                <p className="text-[11px] text-slate-400">
                  Helpline number displayed on registration receipts and team owner helpdesk.
                </p>
              </div>

              {/* Registered Email (Read-only) */}
              <div className="space-y-1.5">
                <label className="label-text font-bold text-slate-800 text-xs sm:text-sm">
                  Registered Account Email (Read-Only)
                </label>
                <input
                  type="email"
                  readOnly
                  disabled
                  value={form.email}
                  className="input-field text-sm py-2 px-3 bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200"
                />
                <p className="text-[11px] text-slate-400">
                  Email linked to your software subscription and payment receipts.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Public Registration & Live Arena Links */}
          <div className="card bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="font-display text-lg text-turf flex items-center gap-2 font-bold">
                <span>🔗</span> Public Links & Registration Hub
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Share these dedicated links with players, team franchise owners, and live spectators.
              </p>
            </div>

            <div className="space-y-3">
              {/* Player Registration Link */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">🏏 Player Registration Link</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black uppercase">
                      Public
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono truncate mt-0.5 select-all">
                    {playerRegUrl}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(playerRegUrl, "Player Registration link")}
                    className="btn-secondary py-1.5 px-3 text-xs font-bold"
                  >
                    📋 Copy Link
                  </button>
                  <a
                    href={playerRegUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-xs text-slate-600 hover:text-emerald-700"
                    title="Open in new tab"
                  >
                    ↗
                  </a>
                </div>
              </div>

              {/* Team Registration Link */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">👥 Franchise Team Registration</span>
                    <span className="text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-black uppercase">
                      Owners
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono truncate mt-0.5 select-all">
                    {teamRegUrl}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(teamRegUrl, "Team Registration link")}
                    className="btn-secondary py-1.5 px-3 text-xs font-bold"
                  >
                    📋 Copy Link
                  </button>
                  <a
                    href={teamRegUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-xs text-slate-600 hover:text-emerald-700"
                    title="Open in new tab"
                  >
                    ↗
                  </a>
                </div>
              </div>

              {/* Spectator Live Arena Link */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">📺 Spectator Live Arena & Leaderboard</span>
                    <span className="text-[9px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-black uppercase">
                      Live Stream
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono truncate mt-0.5 select-all">
                    {watchUrl}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(watchUrl, "Spectator Live link")}
                    className="btn-secondary py-1.5 px-3 text-xs font-bold"
                  >
                    📋 Copy Link
                  </button>
                  <a
                    href={watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-xs text-slate-600 hover:text-emerald-700"
                    title="Open in new tab"
                  >
                    ↗
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Account Credentials & Pass Summary (Read-Only) */}
          <div className="card bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-md space-y-4 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-display text-base sm:text-lg text-amber-300 flex items-center gap-2 font-bold">
                <span>🔐</span> Account ID & Software Pass Details
              </h2>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500 text-slate-950">
                Active Pass
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Login ID</span>
                <span className="text-xs sm:text-sm font-mono font-bold text-white mt-1 block truncate">
                  {form.loginId || "-"}
                </span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">URL Slug</span>
                <span className="text-xs sm:text-sm font-mono font-bold text-amber-300 mt-1 block truncate">
                  {form.slug || "-"}
                </span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Plan Tier</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-400 mt-1 block truncate">
                  {form.planType ? form.planType.replace("_", " ") : "STANDARD"}
                </span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Pass Validity</span>
                <span className="text-xs sm:text-sm font-bold text-slate-200 mt-1 block truncate">
                  {form.passExpiryDate
                    ? new Date(form.passExpiryDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "Lifetime"}
                </span>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="sticky bottom-3 sm:bottom-4 p-3.5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl flex flex-wrap items-center justify-between gap-3 z-30">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!isDirty || saving}
                className="btn-primary py-2.5 px-6 text-xs sm:text-sm font-bold shadow-md shadow-mint/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Save Changes</span>
                  </>
                )}
              </button>

              {isDirty && (
                <button
                  type="button"
                  onClick={() => setForm(original)}
                  disabled={saving}
                  className="btn-secondary py-2.5 px-4 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Discard Changes
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span>⚡</span>
              <span>All changes sync immediately to live spectators & players.</span>
            </div>
          </div>
        </form>
      </div>
    </OrganizerLayout>
  );
}
