import React, { useState, useEffect, useRef } from "react";
import api from "../api/axios";
import { compressImage } from "../utils/imageCompressor";

// Reusable image uploader with instant client-side compression and parent upload tracking
export default function ImageUpload({
  label,
  value = null,
  onUploaded,
  onUploadingChange,
  shape = "circle", // "circle" or "square"
  required = false,
}) {
  const [preview, setPreview] = useState(value || null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(Boolean(value));
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (value) {
      setPreview(value);
      setUploadSuccess(true);
    }
  }, [value]);

  async function handleFile(e) {
    const rawFile = e.target.files[0];
    if (!rawFile) return;

    // Instant local preview
    const localUrl = URL.createObjectURL(rawFile);
    setPreview(localUrl);
    setUploading(true);
    setUploadSuccess(false);
    setError("");
    onUploadingChange?.(true);

    try {
      // Compress in browser (preserves PNG transparency for logos!)
      const optimizedFile = await compressImage(rawFile, 1200, 1200, 0.85);

      const formData = new FormData();
      formData.append("file", optimizedFile);

      const { data } = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });

      setPreview(data.url);
      setUploadSuccess(true);
      setError("");
      onUploaded(data.url);
    } catch (err) {
      console.error("Upload error:", err);
      setError(
        err.response?.data?.message ||
          "Upload failed. Please try a different image or retry."
      );
      setUploadSuccess(false);
      onUploaded(null);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  }

  function handleRemove() {
    setPreview(null);
    setUploadSuccess(false);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
    onUploaded(null);
    onUploadingChange?.(false);
  }

  const isSquare = shape === "square";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="label-text mb-0">
          {label}{" "}
          {!required && (
            <span className="text-mauve font-normal text-xs">(optional)</span>
          )}
        </label>
        {preview && !uploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold underline cursor-pointer"
          >
            Remove
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap bg-slate-800/40 p-2.5 rounded-2xl border border-slate-700/60">
        {preview ? (
          <div className="relative shrink-0">
            <img
              src={preview}
              alt="preview"
              className={`w-12 h-12 sm:w-14 sm:h-14 ${
                isSquare ? "rounded-xl" : "rounded-full"
              } object-contain p-0.5 bg-white border border-slate-300 shadow-sm`}
            />
            {uploadSuccess && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shadow-xs">
                ✓
              </span>
            )}
          </div>
        ) : (
          <div
            className={`w-12 h-12 sm:w-14 sm:h-14 ${
              isSquare ? "rounded-xl" : "rounded-full"
            } bg-slate-800 border border-dashed border-slate-600 flex items-center justify-center text-slate-400 text-lg shrink-0`}
          >
            📷
          </div>
        )}

        <div className="flex-1 min-w-[170px]">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg,image/*"
            onChange={handleFile}
            className="text-xs sm:text-sm text-slate-300 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-mint/20 file:text-mint-dark hover:file:bg-mint/30 active:file:bg-mint/40 cursor-pointer w-full"
          />
        </div>

        {uploading && (
          <span className="text-xs text-mint-dark font-bold shrink-0 animate-pulse flex items-center gap-1.5 bg-mint/10 px-2.5 py-1 rounded-full border border-mint/20">
            <span className="w-2 h-2 rounded-full bg-mint animate-ping" />
            <span>Uploading…</span>
          </span>
        )}

        {uploadSuccess && !uploading && (
          <span className="text-[11px] text-emerald-400 font-bold shrink-0 flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            <span>✓</span> Ready
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs text-rose mt-1.5 font-medium flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
}
