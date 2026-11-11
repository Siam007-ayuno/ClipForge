"use client";

import React, { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Sparkles, RefreshCw, Volume2, Mic, Flame, Download } from "lucide-react";
import { apiPipeline } from "../lib/api";

interface PipelineProgressProps {
  projectId: string;
  initialStatus: string;
  initialProgress: number;
  onCompleted: () => void;
}

export function PipelineProgress({
  projectId,
  initialStatus,
  initialProgress,
  onCompleted,
}: PipelineProgressProps) {
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(initialProgress);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout;

    const poll = async () => {
      try {
        const data = await apiPipeline.getProgress(projectId);
        if (!isMounted) return;

        setStatus(data.status);
        setProgress(data.progress);
        if (data.error_message) {
          setErrorMessage(data.error_message);
        }

        if (data.status === "ready") {
          onCompleted();
          return;
        }

        if (data.status === "failed") {
          return;
        }

        // Continue polling every 1500ms while active
        timer = setTimeout(poll, 1500);
      } catch (err) {
        console.error("Polling error", err);
        timer = setTimeout(poll, 3000);
      }
    };

    if (status !== "ready" && status !== "failed") {
      poll();
    }

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [projectId, status, onCompleted]);

  const handleRetry = async () => {
    setErrorMessage(null);
    setStatus("extracting_audio");
    setProgress(5);
    try {
      await apiPipeline.triggerProcess(projectId);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || "Retry failed.");
      setStatus("failed");
    }
  };

  const getStageInfo = () => {
    switch (status) {
      case "uploading":
      case "ingesting":
        return {
          title: "Downloading Source Video",
          desc: "Streaming high-definition video from link into processing workspace...",
          icon: <Download className="h-5 w-5 text-rose-400 animate-bounce" />,
        };
      case "extracting_audio":
        return {
          title: "Extracting Studio Audio",
          desc: "Converting video stream into 16kHz mono audio with FFmpeg...",
          icon: <Volume2 className="h-5 w-5 text-amber-400 animate-pulse" />,
        };
      case "transcribing":
        return {
          title: "Transcribing Speech with Whisper",
          desc: "Extracting word-level timestamps with auto language detection (Bengali & English)...",
          icon: <Mic className="h-5 w-5 text-rose-400 animate-bounce" />,
        };
      case "detecting_highlights":
        return {
          title: "LLM Virality Scoring",
          desc: "AI is analyzing emotional hooks, complete thoughts, and surprise factors...",
          icon: <Flame className="h-5 w-5 text-amber-500 animate-pulse" />,
        };
      case "ready":
        return {
          title: "Clips Extracted & Ready",
          desc: "Best moments found and snapped strictly to sentence boundaries.",
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
        };
      case "failed":
        return {
          title: "Processing Error",
          desc: errorMessage || "The AI pipeline encountered an issue.",
          icon: <AlertCircle className="h-5 w-5 text-rose-500" />,
        };
      default:
        return {
          title: "Preparing Video",
          desc: "Initializing AI pipeline...",
          icon: <Loader2 className="h-5 w-5 text-rose-400 animate-spin" />,
        };
    }
  };

  const stage = getStageInfo();

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/80 border border-zinc-700/60">
            {stage.icon}
          </div>
          <div>
            <h3 className="font-semibold text-white text-base flex items-center gap-2">
              {stage.title}
              {status !== "ready" && status !== "failed" && (
                <span className="text-xs font-normal text-rose-400">({progress}%)</span>
              )}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">{stage.desc}</p>
          </div>
        </div>

        {status === "failed" && (
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-all shadow-md shadow-rose-600/20"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry Pipeline
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {status !== "failed" && (
        <div className="space-y-1.5 pt-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(5, progress)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-zinc-500 font-medium">
            <span>Audio Probing</span>
            <span>Whisper Words</span>
            <span>LLM Virality</span>
            <span>Complete</span>
          </div>
        </div>
      )}
    </div>
  );
}
