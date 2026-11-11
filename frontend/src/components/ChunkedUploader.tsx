"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileVideo, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { RightsCheckbox, RIGHTS_LEGAL_TEXT } from "./RightsCheckbox";
import { apiRights, apiUpload, apiAuth } from "../lib/api";
import { formatBytes } from "../lib/utils";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB per chunk
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB

export function ChunkedUploader() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rightsAgreed, setRightsAgreed] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE) {
        setErrorMessage("File exceeds 2GB maximum limit.");
        return;
      }
      setSelectedFile(file);
      if (!projectTitle) {
        setProjectTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const startUpload = async () => {
    if (!selectedFile) {
      setErrorMessage("Please select a video file first.");
      return;
    }
    if (!rightsAgreed) {
      setErrorMessage("You must acknowledge the rights and copyright declaration before proceeding.");
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage(null);
      setUploadProgress(0);

      // Ensure user session is initialized
      await apiAuth.ensureAuthenticated();

      setUploadStatus("Logging rights confirmation...");

      // 1. Submit Rights Confirmation Log
      const rightsRecord = await apiRights.confirm(
        "upload",
        selectedFile.name,
        RIGHTS_LEGAL_TEXT
      );

      // 2. Initialize Chunked Upload
      setUploadStatus("Initializing upload session...");
      const totalChunks = Math.ceil(selectedFile.size / CHUNK_SIZE);
      const initData = await apiUpload.initUpload(
        selectedFile.name,
        selectedFile.size,
        totalChunks,
        selectedFile.type || "video/mp4"
      );

      // 3. Upload Chunks sequentially
      setUploadStatus("Uploading video chunks...");
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, selectedFile.size);
        const chunkBlob = selectedFile.slice(start, end);

        await apiUpload.uploadChunk(initData.upload_id, i, chunkBlob);
        const percent = Math.round(((i + 1) / totalChunks) * 90); // 0-90% for chunks
        setUploadProgress(percent);
      }

      // 4. Assemble & Complete
      setUploadStatus("Assembling and verifying video on server...");
      setUploadProgress(95);

      const completeRes = await apiUpload.completeUpload(
        initData.upload_id,
        selectedFile.name,
        totalChunks,
        rightsRecord.id,
        projectTitle || selectedFile.name
      );

      setUploadProgress(100);
      setUploadStatus("Upload complete! Redirecting to project...");

      // Redirect to Project detail
      setTimeout(() => {
        router.push(`/projects/${completeRes.project_id}`);
      }, 800);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || "Upload failed. Please check connection and try again.";
      setErrorMessage(msg);
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Dropzone */}
      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all cursor-pointer ${
          selectedFile
            ? "border-rose-500/50 bg-rose-950/10"
            : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/30"
        } ${isUploading ? "pointer-events-none opacity-80" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <FileVideo className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-zinc-100 max-w-sm truncate">{selectedFile.name}</p>
              <p className="text-xs text-zinc-400">
                {formatBytes(selectedFile.size)} • Click to choose a different video
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:scale-105 group-hover:text-zinc-200 transition-all">
              <Upload className="h-8 w-8 stroke-[1.75]" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-200">
                Click to browse or drag and drop your long video
              </p>
              <p className="text-xs text-zinc-500">
                MP4, MOV, MKV, WebM up to 2GB (processed in chunks)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Project Title Input */}
      {selectedFile && (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Project Title (Optional)
          </label>
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            disabled={isUploading}
            placeholder="e.g. Joe Rogan #2100 Highlights"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50"
          />
        </div>
      )}

      {/* Mandatory Rights Checkbox */}
      <RightsCheckbox
        checked={rightsAgreed}
        onChange={setRightsAgreed}
        disabled={isUploading}
      />

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-900/50 bg-rose-950/30 p-3.5 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Upload Progress Status */}
      {isUploading && (
        <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-zinc-300 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
              {uploadStatus}
            </span>
            <span className="text-rose-400 font-semibold">{uploadProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-rose-600 to-amber-500 transition-all duration-300 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        onClick={startUpload}
        disabled={!selectedFile || !rightsAgreed || isUploading}
        className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 transition-all hover:opacity-95 disabled:pointer-events-none disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading & Verifying...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Start Video Processing
          </>
        )}
      </button>
    </div>
  );
}
