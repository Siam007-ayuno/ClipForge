"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PlaySquare, Link2, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { RightsCheckbox, RIGHTS_LEGAL_TEXT } from "./RightsCheckbox";
import { apiRights, apiProjects, apiAuth } from "../lib/api";

export function UrlIngestion() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [rightsAgreed, setRightsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isValidUrl = (testUrl: string) => {
    try {
      const parsed = new URL(testUrl);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setErrorMessage("Please enter a valid video URL.");
      return;
    }
    if (!isValidUrl(url)) {
      setErrorMessage("Please enter a valid HTTP or HTTPS URL.");
      return;
    }
    if (!rightsAgreed) {
      setErrorMessage("You must acknowledge the rights and copyright declaration before importing.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      // Ensure user session is initialized
      await apiAuth.ensureAuthenticated();

      // 1. Mandatory Rights Confirmation Log
      const rightsRecord = await apiRights.confirm(
        "youtube",
        url.trim(),
        RIGHTS_LEGAL_TEXT
      );

      // 2. Import URL via backend ingestion provider
      const project = await apiProjects.importUrl(
        url.trim(),
        rightsRecord.id,
        projectTitle.trim() || undefined
      );

      router.push(`/projects/${project.id}`);
    } catch (err: any) {
      console.error(err);
      let msg = err.response?.data?.detail || "Failed to import video from URL. Please verify the URL and try again.";
      if (typeof msg === "string" && msg.includes("This video is unavailable")) {
        msg = "This YouTube video is unavailable or restricted by YouTube. Please test with another public video or upload a video file directly.";
      }
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleImport} className="space-y-6">
      {/* URL Input Box */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Video URL (YouTube or Direct Link)
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
            <PlaySquare className="h-5 w-5 text-red-500" />
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-3.5 pl-12 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50"
          />
        </div>
        <p className="text-xs text-zinc-500">
          Paste public YouTube videos, podcasts, or lectures to turn them into viral clips.
        </p>
      </div>

      {/* Project Title Input */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Project Title (Optional)
        </label>
        <input
          type="text"
          value={projectTitle}
          onChange={(e) => setProjectTitle(e.target.value)}
          disabled={isLoading}
          placeholder="Leave blank to use original video title"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50"
        />
      </div>

      {/* Mandatory Rights Checkbox */}
      <RightsCheckbox
        checked={rightsAgreed}
        onChange={setRightsAgreed}
        disabled={isLoading}
      />

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-900/50 bg-rose-950/30 p-3.5 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action Button */}
      <button
        type="submit"
        disabled={!url || !rightsAgreed || isLoading}
        className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 transition-all hover:opacity-95 disabled:pointer-events-none disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Downloading & Ingesting Video...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Import & Process Video
          </>
        )}
      </button>
    </form>
  );
}
