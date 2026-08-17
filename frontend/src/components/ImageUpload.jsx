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
      <div className="flex items-center gap-3">
        {preview && (
          <img
            src={preview}
            alt="preview"
            className="w-14 h-14 rounded-full object-cover border border-black/10"
          />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="text-sm"
        />
        {uploading && <span className="text-xs text-turf">Uploading…</span>}
      </div>
      {error && <p className="text-xs text-clay mt-1">{error}</p>}
    </div>
  );
}
