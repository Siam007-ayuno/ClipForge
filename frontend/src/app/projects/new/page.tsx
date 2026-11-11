"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, PlaySquare, Video, Sparkles, Key } from "lucide-react";
import { ChunkedUploader } from "../../../components/ChunkedUploader";
import { UrlIngestion } from "../../../components/UrlIngestion";
import { apiAuth } from "../../../lib/api";

export default function NewProjectPage() {
  const [activeTab, setActiveTab] = useState<"upload" | "url" | "oauth">("upload");

  useEffect(() => {
    // Proactively initialize session so uploads work without friction
    apiAuth.ensureAuthenticated().catch(console.error);
  }, []);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Create New Clipping Project
        </h1>
        <p className="text-sm text-zinc-400">
          Upload a high-resolution video file or import from YouTube to extract viral clips.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-zinc-800 gap-2">
        <button
          onClick={() => setActiveTab("upload")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all ${
            activeTab === "upload"
              ? "border-rose-500 text-rose-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Upload className="h-4 w-4" />
          Direct File Upload (up to 2GB)
        </button>

        <button
          onClick={() => setActiveTab("url")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all ${
            activeTab === "url"
              ? "border-rose-500 text-rose-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <PlaySquare className="h-4 w-4 text-red-500" />
          YouTube URL Import
        </button>

        <button
          onClick={() => setActiveTab("oauth")}
          className={`hidden sm:flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all ${
            activeTab === "oauth"
              ? "border-rose-500 text-rose-400"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Key className="h-4 w-4 text-amber-500" />
          Connect YouTube Channel
        </button>
      </div>

      {/* Tab Contents */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
        {activeTab === "upload" && <ChunkedUploader />}
        {activeTab === "url" && <UrlIngestion />}
        {activeTab === "oauth" && (
          <div className="space-y-4 text-center py-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
              <Key className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Official YouTube Channel Integration</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              Connect your Google account with YouTube Data API v3 read permissions to import videos directly from your own channel with 1-click.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => alert("Google OAuth client ID can be configured in .env for production YouTube channel sync.")}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-all"
              >
                Configure YouTube OAuth
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
