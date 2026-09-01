import React, { useState } from "react";
import api from "../api/axios";
import { compressImage } from "../utils/imageCompressor";

// Reusable optional image uploader with instant client-side compression
export default function ImageUpload({ label, onUploaded }) {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const rawFile = e.target.files[0];
    if (!rawFile) return;

    // Instant local preview
    setPreview(URL.createObjectURL(rawFile));
    setUploading(true);
    setError("");

    try {
      // Compress in browser (reduces 5MB photo -> 150KB in milliseconds)
      const optimizedFile = await compressImage(rawFile, 1000, 1000, 0.82);

      const formData = new FormData();
      formData.append("file", optimizedFile);

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
        {label} <span className="text-mauve font-normal">(optional)</span>
      </label>
      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
        {preview && (
          <img
            src={preview}
            alt="preview"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border border-sky/30 shrink-0 shadow-sm"
          />
        )}
        <div className="flex-1 min-w-[180px]">
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="text-xs sm:text-sm text-turf file:mr-2.5 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-mint/20 file:text-mint-dark hover:file:bg-mint/30 active:file:bg-mint/40 cursor-pointer w-full"
          />
        </div>
        {uploading && (
          <span className="text-xs text-mint-dark font-bold shrink-0 animate-pulse flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-mint animate-ping" />
            <span>Compressing & Uploading…</span>
          </span>
        )}
      </div>
      {error && <p className="text-xs text-rose mt-1 font-medium">{error}</p>}
    </div>
  );
}
