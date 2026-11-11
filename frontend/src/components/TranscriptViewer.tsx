"use client";

import React, { useEffect, useState } from "react";
import { Languages, Loader2, Clock, FileText } from "lucide-react";
import { apiPipeline } from "../lib/api";
import { Transcript } from "../types";
import { formatDuration } from "../lib/utils";

interface TranscriptViewerProps {
  projectId: string;
}

export function TranscriptViewer({ projectId }: TranscriptViewerProps) {
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTranscript = async () => {
      try {
        setIsLoading(true);
        const data = await apiPipeline.getTranscript(projectId);
        setTranscript(data);
      } catch (err) {
        console.error("Failed to load transcript", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTranscript();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-500 space-y-2">
        <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
        <p className="text-xs">Loading word-level transcript...</p>
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 text-center text-zinc-400 text-xs">
        No transcript available yet. Please run the AI processing pipeline first.
      </div>
    );
  }

  const getLanguageName = (code: string) => {
    switch (code) {
      case "en":
        return "English";
      case "bn":
        return "Bengali (বাংলা)";
      case "es":
        return "Spanish";
      case "fr":
        return "French";
      default:
        return code.toUpperCase();
    }
  };

  return (
    <div className="space-y-6">
      {/* Transcript Meta Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
            <Languages className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Detected Language</p>
            <p className="text-sm font-bold text-white">
              {getLanguageName(transcript.language)}{" "}
              {transcript.language_probability && (
                <span className="text-xs font-normal text-emerald-400">
                  ({Math.round(transcript.language_probability * 100)}% confidence)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="text-xs text-zinc-500">
          Total segments: {transcript.segments?.length || 0}
        </div>
      </div>

      {/* Segments List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {transcript.segments && transcript.segments.length > 0 ? (
          transcript.segments.map((seg, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 hover:border-zinc-700 transition-all space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span className="font-mono text-zinc-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(seg.start)} - {formatDuration(seg.end)}
                </span>
                <span>Segment #{idx + 1}</span>
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed font-normal">{seg.text}</p>
              
              {/* Optional Word breakdown chips */}
              {seg.words && seg.words.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-800/50">
                  {seg.words.map((w, wIdx) => (
                    <span
                      key={wIdx}
                      className="inline-flex items-center gap-1 rounded bg-zinc-950 px-2 py-0.5 text-[11px] text-zinc-400 font-mono border border-zinc-800 hover:border-rose-500/40 hover:text-rose-300 transition-colors cursor-default"
                      title={`${w.start.toFixed(2)}s - ${w.end.toFixed(2)}s`}
                    >
                      {w.word}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-zinc-400 leading-relaxed p-4 bg-zinc-900/40 rounded-xl">
            {transcript.raw_text}
          </p>
        )}
      </div>
    </div>
  );
}
