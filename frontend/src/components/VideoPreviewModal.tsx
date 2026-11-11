"use client";

import React, { useEffect } from "react";
import { X, Download, Flame, Clock, Sparkles } from "lucide-react";
import { Clip } from "../types";
import { formatDuration } from "../lib/utils";

interface VideoPreviewModalProps {
  clip: Clip;
  videoUrl: string;
  onClose: () => void;
}

export function VideoPreviewModal({ clip, videoUrl, onClose }: VideoPreviewModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const fullVideoSrc = videoUrl.startsWith("http")
    ? videoUrl
    : `http://localhost:8000${videoUrl}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative flex flex-col md:flex-row items-center max-w-4xl w-full max-h-[92vh] rounded-3xl border border-zinc-800 bg-zinc-950/90 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-zinc-900/80 p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Close Preview"
        >
          <X className="h-5 w-5" />
        </button>

        {/* 9:16 Vertical Video Player */}
        <div className="relative flex items-center justify-center bg-black w-full md:w-[380px] h-[55vh] md:h-[80vh] shrink-0">
          <video
            src={fullVideoSrc}
            controls
            autoPlay
            playsInline
            className="w-full h-full object-contain aspect-[9/16] rounded-2xl"
          />
        </div>

        {/* Video Info & Controls Panel */}
        <div className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto w-full">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-400 border border-rose-500/20">
                <Flame className="h-3.5 w-3.5 text-rose-500 fill-current" />
                Score: {clip.virality_score}/100
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 bg-zinc-900 rounded-lg px-2.5 py-1 border border-zinc-800">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(clip.duration)}
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-white leading-snug">
              {clip.title}
            </h2>
          </div>

          {/* Hook box */}
          {clip.hook_text && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Opening Hook</p>
              <p className="text-xs text-zinc-200 italic">&ldquo;{clip.hook_text}&rdquo;</p>
            </div>
          )}

          {/* Virality Reason */}
          {clip.reason && (
            <div className="flex items-start gap-2 text-xs text-zinc-400">
              <Sparkles className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <p>{clip.reason}</p>
            </div>
          )}

          {/* Download Action */}
          <div className="pt-4 border-t border-zinc-800 flex flex-col gap-3">
            <a
              href={fullVideoSrc}
              download={`${clip.title.replace(/[^a-z0-9]/gi, "_")}.mp4`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/20 hover:opacity-95 transition-all"
            >
              <Download className="h-4 w-4" />
              Download Ready-to-Post MP4
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
