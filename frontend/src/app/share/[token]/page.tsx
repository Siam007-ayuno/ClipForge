"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Flame,
  Clock,
  Download,
  Share2,
  Calendar,
  CheckCircle2,
  Eye,
  AlertCircle,
  Loader2,
  Scissors,
  Sparkles,
  Flag,
} from "lucide-react";
import { apiExport } from "../../../lib/api";
import { formatDuration } from "../../../lib/utils";
import { ReportModal } from "../../../components/ReportModal";

export default function PublicSharePage() {
  const params = useParams();
  const token = params?.token as string;

  const [clip, setClip] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    async function loadSharedClip() {
      if (!token) return;
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiExport.getPublicShare(token);
        setClip(data);
      } catch (err: any) {
        console.error(err);
        setError(
          err.response?.data?.detail || "This share preview link is invalid or has expired."
        );
      } finally {
        setIsLoading(false);
      }
    }
    loadSharedClip();
  }, [token]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!clip?.video_url) return;
    const downloadUrl = `http://localhost:8000${clip.video_url}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", `${clip.title.replace(/[^\w\s-]/g, "")}.mp4`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500 mx-auto" />
          <p className="text-sm font-medium">Loading Shared Clip Preview...</p>
        </div>
      </div>
    );
  }

  if (error || !clip) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400 p-6">
        <div className="text-center max-w-md space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-white">Preview Link Expired or Not Found</h2>
          <p className="text-xs text-zinc-400">
            {error || "This temporary preview link has expired. Preview links remain valid for 7 days."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition-all shadow-md shadow-rose-600/20"
          >
            Create Your Own Clips with ClipForge
          </Link>
        </div>
      </div>
    );
  }

  const expiryDate = new Date(clip.expires_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const fullVideoUrl = clip.video_url
    ? (clip.video_url.startsWith("http") ? clip.video_url : `http://localhost:8000${clip.video_url}`)
    : "";

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col">
      {/* Public Share Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 px-6 py-4 backdrop-blur-md flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-violet-600 shadow-md shadow-rose-500/20">
            <Scissors className="h-4 w-4 text-white stroke-[2.5]" />
          </div>
          <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Clip<span className="text-rose-500">Forge</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
          >
            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
            {copied ? "Link Copied!" : "Copy Link"}
          </button>

          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-all shadow-md shadow-rose-600/20"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Make Viral Clips
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto max-w-4xl px-4 py-8 flex flex-col items-center">
        {/* 7-Day Expiry Notice */}
        <div className="w-full max-w-md mb-6 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 flex items-center justify-between text-xs text-amber-300">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-400" />
            Temporary Share Preview
          </span>
          <span className="text-[11px] text-amber-400/80">Expires {expiryDate}</span>
        </div>

        {/* Video Player Card */}
        <div className="w-full flex flex-col items-center space-y-6">
          <div
            className={`relative bg-black rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 transition-all ${
              clip.aspect_ratio === "1:1"
                ? "w-full max-w-[460px] aspect-square"
                : clip.aspect_ratio === "16:9"
                ? "w-full max-w-[640px] aspect-video"
                : "w-[300px] h-[533px] sm:w-[340px] sm:h-[604px]"
            }`}
          >
            {fullVideoUrl ? (
              <video
                src={fullVideoUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500 text-xs">
                Video stream unavailable
              </div>
            )}
          </div>

          {/* Details & Actions */}
          <div className="w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-400">
                <Flame className="h-3.5 w-3.5" />
                Virality Score: {clip.virality_score}/100
              </span>

              <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-zinc-500" />
                  {formatDuration(clip.duration)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-zinc-500" />
                  {clip.views_count} views
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-bold text-white tracking-tight">{clip.title}</h1>
              <p className="text-xs text-zinc-400">Source: {clip.project_title}</p>
            </div>

            {clip.hook_text && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-300">
                <span className="text-[11px] font-semibold text-amber-400 block mb-0.5">Opening Hook:</span>
                "{clip.hook_text}"
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-rose-600/20 hover:opacity-95 transition-all"
              >
                <Download className="h-4 w-4" />
                Download MP4 Clip
              </button>

              <button
                onClick={handleCopyLink}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
                title="Copy share link"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>

            {/* Safety & Report Link */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-900 text-[11px] text-zinc-500">
              <span>Strict Copyright Compliance</span>
              <button
                onClick={() => setShowReportModal(true)}
                className="hover:text-rose-400 transition-colors flex items-center gap-1 text-zinc-400"
              >
                <Flag className="h-3 w-3 text-rose-500" />
                Report Clip
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-4 text-center text-[11px] text-zinc-500">
        Created with <span className="text-zinc-300 font-medium">ClipForge</span> — AI Video Repurposing &amp; Viral Highlights.
      </footer>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        clipId={clip.clip_id || clip.id}
        clipTitle={clip.title}
        shareToken={token}
      />
    </div>
  );
}
