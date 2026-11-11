"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Flame,
  Clock,
  Scissors,
  Play,
  Sparkles,
  MessageSquareQuote,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Video,
  Download,
  Share2,
  FileText,
  Copy,
  Check,
  ChevronDown,
  Flag,
} from "lucide-react";
import { Clip } from "../types";
import { formatDuration } from "../lib/utils";
import { apiClips, apiExport } from "../lib/api";
import { VideoPreviewModal } from "./VideoPreviewModal";
import { ReportModal } from "./ReportModal";

interface ClipCardProps {
  clip: Clip;
  index: number;
}

export function ClipCard({ clip: initialClip, index }: ClipCardProps) {
  const [clip, setClip] = useState<Clip>(initialClip);
  const [isRendering, setIsRendering] = useState(initialClip.status === "rendering");
  const [videoUrl, setVideoUrl] = useState<string | null>(
    initialClip.rendered_video_path
      ? `http://localhost:8000/api/v1/storage/files/${initialClip.rendered_video_path}`
      : null
  );
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [renderProgress, setRenderProgress] = useState(
    initialClip.status === "completed" ? 100 : 0
  );

  // Export & Share State
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRendering) {
      const poll = async () => {
        try {
          const statusData = await apiClips.getStatus(clip.id);
          setRenderProgress(statusData.progress);
          if (statusData.status === "completed") {
            setIsRendering(false);
            setClip((prev) => ({
              ...prev,
              status: "completed",
              rendered_video_path: statusData.video_url,
            }));
            if (statusData.video_url) {
              setVideoUrl(statusData.video_url);
            }
            return;
          }
          if (statusData.status === "failed") {
            setIsRendering(false);
            setClip((prev) => ({ ...prev, status: "failed" }));
            return;
          }
          timer = setTimeout(poll, 1500);
        } catch {
          timer = setTimeout(poll, 3000);
        }
      };
      poll();
    }
    return () => clearTimeout(timer);
  }, [isRendering, clip.id]);

  const handleTriggerRender = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsRendering(true);
      setRenderProgress(10);
      setClip((prev) => ({ ...prev, status: "rendering" }));
      await apiClips.render(clip.id, "1080p");
    } catch (err) {
      console.error(err);
      setIsRendering(false);
      alert("Failed to start rendering clip.");
    }
  };

  const handleDownloadMp4 = async (res = "1080p") => {
    try {
      setShowDownloadMenu(false);
      await apiExport.downloadClipMp4(clip.id, clip.title, res);
    } catch (err) {
      console.error(err);
      alert("Failed to download clip MP4. Make sure clip is rendered.");
    }
  };

  const handleDownloadSrt = async () => {
    try {
      setShowDownloadMenu(false);
      await apiExport.downloadClipSrt(clip.id, clip.title);
    } catch (err) {
      console.error(err);
      alert("Failed to download SRT captions.");
    }
  };

  const handleCopySocial = async () => {
    try {
      const social = await apiExport.getSocialCopy(clip.id);
      await navigator.clipboard.writeText(social.full_copy);
      setCopiedText("Copied Viral Copy!");
      setTimeout(() => setCopiedText(null), 2500);
    } catch (err) {
      console.error(err);
      alert("Failed to generate social copy.");
    }
  };

  const handleShareLink = async () => {
    try {
      const shareData = await apiExport.createShareLink(clip.id);
      const fullUrl = `${window.location.origin}${shareData.share_url}`;
      setShareUrl(fullUrl);
      await navigator.clipboard.writeText(fullUrl);
      setShowShareModal(true);
    } catch (err) {
      console.error(err);
      alert("Failed to create share preview link.");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    if (score >= 75) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  };

  const isRendered = clip.status === "completed" || !!videoUrl;

  return (
    <>
      <div className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur-sm transition-all hover:border-zinc-700 hover:bg-zinc-900/80 shadow-lg">
        <div className="space-y-4">
          {/* Top Badges */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border ${getScoreColor(
                clip.virality_score
              )}`}
            >
              <Flame className="h-3.5 w-3.5 fill-current" />
              Score: {clip.virality_score}/100
            </span>

            <span className="flex items-center gap-1 text-xs text-zinc-400 font-mono">
              <Clock className="h-3.5 w-3.5 text-zinc-500" />
              {formatDuration(clip.duration)}
            </span>
          </div>

          {/* Title & Hook */}
          <div className="space-y-1.5">
            <h3 className="font-semibold text-base text-zinc-100 group-hover:text-rose-400 transition-colors line-clamp-2">
              {clip.title}
            </h3>
            <p className="text-xs text-zinc-500 font-mono">
              Segment: {formatDuration(clip.start_time)} - {formatDuration(clip.end_time)}
            </p>
          </div>

          {/* Opening Hook Banner */}
          {clip.hook_text && (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-amber-400 font-medium text-[11px] uppercase tracking-wider">
                <MessageSquareQuote className="h-3.5 w-3.5" />
                Opening Hook (First 3s)
              </div>
              <p className="text-zinc-300 italic line-clamp-2">"{clip.hook_text}"</p>
            </div>
          )}

          {/* AI Virality Reason */}
          {clip.reason && (
            <div className="flex items-start gap-2 text-xs text-zinc-400">
              <Sparkles className="h-3.5 w-3.5 text-rose-400 mt-0.5 shrink-0" />
              <p className="line-clamp-2">{clip.reason}</p>
            </div>
          )}

          {/* Transcript Excerpt */}
          {clip.transcript_excerpt && (
            <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed border-t border-zinc-800/60 pt-3">
              {clip.transcript_excerpt}
            </p>
          )}

          {/* Rendering Progress Bar if active */}
          {isRendering && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1 text-rose-400 font-medium">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Rendering Reframe &amp; Captions...
                </span>
                <span className="font-mono">{renderProgress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-300"
                  style={{ width: `${renderProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="mt-5 pt-4 border-t border-zinc-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 font-mono text-[11px]">Rank #{index + 1}</span>

            {/* Quick Export Tools */}
            <div className="flex items-center gap-1">
              {/* Copy Social Metadata */}
              <button
                onClick={handleCopySocial}
                className="inline-flex items-center gap-1 rounded-lg p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                title="Copy Viral Title, Description & Hashtags"
              >
                {copiedText ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>

              {/* Share 7-Day Temporary Link */}
              <button
                onClick={handleShareLink}
                className="inline-flex items-center gap-1 rounded-lg p-1.5 text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                title="Create Shareable 7-Day Preview Link"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>

              {/* Report Content */}
              <button
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center gap-1 rounded-lg p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Report Clip (DMCA / Inappropriate)"
              >
                <Flag className="h-3.5 w-3.5" />
              </button>

              {/* Download Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  className="inline-flex items-center gap-1 rounded-lg p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  title="Download MP4 or SRT"
                >
                  <Download className="h-3.5 w-3.5" />
                  <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                </button>

                {showDownloadMenu && (
                  <div className="absolute right-0 bottom-full mb-1 w-44 rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl z-30 space-y-0.5 text-xs">
                    <button
                      onClick={() => handleDownloadMp4("1080p")}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-200 flex items-center justify-between"
                    >
                      <span>Download MP4</span>
                      <span className="text-[10px] text-rose-400 font-mono font-bold">1080p</span>
                    </button>
                    <button
                      onClick={() => handleDownloadMp4("720p")}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-200 flex items-center justify-between"
                    >
                      <span>Download MP4</span>
                      <span className="text-[10px] text-amber-400 font-mono">720p</span>
                    </button>
                    <div className="border-t border-zinc-800 my-1" />
                    <button
                      onClick={handleDownloadSrt}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-200 flex items-center gap-2"
                    >
                      <FileText className="h-3 w-3 text-cyan-400" />
                      <span>Download Captions (SRT)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Action Buttons */}
          <div className="flex items-center gap-2">
            {isRendered ? (
              <button
                onClick={() => setShowPreviewModal(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-rose-600/20 transition-all"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Preview Clip
              </button>
            ) : isRendering ? (
              <button
                disabled
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800/80 px-3.5 py-1.5 text-xs font-semibold text-zinc-400 border border-zinc-700/60"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                Rendering...
              </button>
            ) : (
              <button
                onClick={handleTriggerRender}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-rose-600/20 transition-all"
              >
                <Video className="h-3.5 w-3.5" />
                Render 9:16
              </button>
            )}

            <Link
              href={`/clips/${clip.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 border border-zinc-700/60 hover:border-zinc-600 transition-all shadow-sm"
              title="Open Clip Studio Editor"
            >
              <Scissors className="h-3.5 w-3.5 text-rose-400" />
              Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Video Preview Modal */}
      {showPreviewModal && videoUrl && (
        <VideoPreviewModal
          clip={clip}
          videoUrl={videoUrl}
          onClose={() => setShowPreviewModal(false)}
        />
      )}

      {/* Share Link Modal */}
      {showShareModal && shareUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Share2 className="h-4 w-4 text-rose-500" />
                Shareable Preview Link
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-zinc-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Anyone with this link can watch and download this clip without creating an account. Active for <strong>7 days</strong>.
            </p>

            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-2.5">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-transparent text-xs text-zinc-200 focus:outline-none font-mono"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  alert("Link copied to clipboard!");
                }}
                className="shrink-0 rounded-lg bg-rose-600 hover:bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Copy
              </button>
            </div>

            <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Expires automatically in 7 days.
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        clipId={clip.id}
        clipTitle={clip.title}
      />
    </>
  );
}
