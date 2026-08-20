import React, { useState } from "react";
import api from "../api/axios";

// Reusable optional image uploader used across registration forms
export default function ImageUpload({ label, onUploaded }) {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      // Longer timeout than the app default — image uploads to Cloudinary can legitimately
      // take longer than a normal API call, especially on slower connections.
      const { data } = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      onUploaded(data.url);
    } catch (err) {
      setError("Upload failed. You can continue without a photo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="label-text">
        {label} <span className="text-black/40 font-normal">(optional)</span>
      </label>
      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
        {preview && (
          <img
            src={preview}
            alt="preview"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border border-black/10 shrink-0"
          />
        )}
        <div className="flex-1 min-w-[180px]">
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="text-xs sm:text-sm text-black/70 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-turf/10 file:text-turf hover:file:bg-turf/20 active:file:bg-turf/30 cursor-pointer w-full"
          />
        </div>
        {uploading && <span className="text-xs text-turf font-medium shrink-0 animate-pulse">Uploading…</span>}
      </div>
      {error && <p className="text-xs text-clay mt-1">{error}</p>}
    </div>
  );
}
