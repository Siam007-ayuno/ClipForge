"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Film,
  HardDrive,
  Clock,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Trash2,
  Loader2,
  FileText,
  Flame,
  Play,
  RefreshCw,
  Video,
  Download,
} from "lucide-react";
import { apiProjects, apiPipeline, apiAuth, apiExport } from "../../../lib/api";
import { Project, Clip } from "../../../types";
import { formatBytes, formatDuration } from "../../../lib/utils";
import { PipelineProgress } from "../../../components/PipelineProgress";
import { ClipCard } from "../../../components/ClipCard";
import { TranscriptViewer } from "../../../components/TranscriptViewer";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeTab, setActiveTab] = useState<"clips" | "transcript">("clips");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBatchRendering, setIsBatchRendering] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [durationPreset, setDurationPreset] = useState<"20-30" | "30-60" | "60-90">("20-30");

  const handleDownloadAllZip = async (resolution = "1080p") => {
    if (!projectId || !project) return;
    try {
      setIsDownloadingZip(true);
      await apiExport.downloadProjectZip(projectId, project.title, resolution);
    } catch (err: any) {
      alert("Failed to export ZIP: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleRenderAll = async () => {
    if (!projectId) return;
    try {
      setIsBatchRendering(true);
      await apiProjects.renderAll(projectId, "1080p");
      const updatedClips = await apiPipeline.getClips(projectId);
      setClips(updatedClips);
    } catch (err: any) {
      alert("Failed to queue batch rendering: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsBatchRendering(false);
    }
  };

  const loadProjectAndClips = async () => {
    if (!projectId) return;
    try {
      setIsLoading(true);
      await apiAuth.ensureAuthenticated();
      const data = await apiProjects.get(projectId);
      setProject(data);

      // Check if pipeline is currently running
      const isPipelineActive = [
        "uploading",
        "ingesting",
        "extracting_audio",
        "transcribing",
        "detecting_highlights",
      ].includes(data.status);
      setIsProcessing(isPipelineActive);

      // Fetch clips if ready
      if (data.status === "ready") {
        try {
          const clipsList = await apiPipeline.getClips(projectId);
          setClips(clipsList);
        } catch {
          // Clips may not be generated yet
        }
      }
    } catch (err: any) {
      console.warn("Could not load project:", err?.response?.data?.detail || err?.message);
      setErrorMessage(err?.response?.data?.detail || "Project not found or no longer available.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjectAndClips();
  }, [projectId]);

  const handleStartProcessing = async () => {
    if (!projectId) return;
    if (isPipelineRunning) return;
    if (!project?.source_video) {
      alert("Source video is still downloading or preparing. Please wait a moment.");
      return;
    }
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      const min_duration = durationPreset === "20-30" ? 20 : durationPreset === "30-60" ? 30 : 60;
      const max_duration = durationPreset === "20-30" ? 30 : durationPreset === "30-60" ? 60 : 90;
      const updated = await apiPipeline.triggerProcess(projectId, { min_duration, max_duration });
      setProject(updated);
    } catch (err: any) {
      console.error("Pipeline trigger error", err);
      setErrorMessage(err.response?.data?.detail || "Failed to start AI processing pipeline.");
      setIsProcessing(false);
    }
  };

  const handlePipelineCompleted = async () => {
    setIsProcessing(false);
    if (!projectId) return;
    try {
      const data = await apiProjects.get(projectId);
      setProject(data);
      const clipsList = await apiPipeline.getClips(projectId);
      setClips(clipsList);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!projectId) return;
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      await apiProjects.delete(projectId);
      router.push("/dashboard");
    } catch {
      alert("Failed to delete project");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-zinc-500 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
        <p className="text-sm">Loading project information...</p>
      </div>
    );
  }

  if (errorMessage && !project) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Project Not Found</h2>
        <p className="text-sm text-zinc-400">{errorMessage || "Unable to find the requested project."}</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const isPipelineRunning =
    isProcessing ||
    ["uploading", "ingesting", "extracting_audio", "transcribing", "detecting_highlights"].includes(project?.status || "");

  const hasClips = clips && clips.length > 0;

  return (
    <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <button
          onClick={handleDelete}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-rose-400 hover:border-rose-900/50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Project
        </button>
      </div>

      {/* Project Header Info */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 backdrop-blur-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                  project?.status === "ready"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : isPipelineRunning
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}
              >
                {project?.status === "ready" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : isPipelineRunning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Film className="h-3.5 w-3.5" />
                )}
                {project?.status.toUpperCase()}
              </span>

              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/20">
                <ShieldCheck className="h-3.5 w-3.5" />
                Rights Verified
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {project?.title}
            </h1>
          </div>

          {/* Action Trigger & Speed Controls */}
          {!isPipelineRunning && project?.source_video && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setDurationPreset("20-30")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    durationPreset === "20-30"
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  ⚡ 20-30s (Turbo Fast)
                </button>
                <button
                  type="button"
                  onClick={() => setDurationPreset("30-60")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    durationPreset === "30-60"
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  30-60s
                </button>
                <button
                  type="button"
                  onClick={() => setDurationPreset("60-90")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    durationPreset === "60-90"
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  60-90s
                </button>
              </div>

              <button
                onClick={handleStartProcessing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 via-amber-600 to-rose-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/20 hover:opacity-95 transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
              >
                <Sparkles className="h-4 w-4" />
                {hasClips ? "Re-Run AI Clipping" : "Extract Viral Clips"}
              </button>
            </div>
          )}
        </div>

        {/* Source Video Specs Grid */}
        {project?.source_video && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-zinc-800/80">
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Original File</p>
              <p className="text-sm font-semibold text-zinc-200 truncate">
                {project.source_video.original_filename}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">File Size</p>
              <p className="text-sm font-semibold text-zinc-200">
                {formatBytes(project.source_video.file_size_bytes)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Duration</p>
              <p className="text-sm font-semibold text-zinc-200">
                {project.source_video.duration_seconds
                  ? formatDuration(project.source_video.duration_seconds)
                  : "Auto-detected in pipeline"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Resolution & FPS</p>
              <p className="text-sm font-semibold text-zinc-200">
                {project.source_video.width && project.source_video.height
                  ? `${project.source_video.width}x${project.source_video.height} (${Math.round(
                      project.source_video.fps || 30
                    )}fps)`
                  : "Probed in pipeline"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Live Pipeline Progress Component */}
      {isPipelineRunning && (
        <PipelineProgress
          projectId={projectId}
          initialStatus={project?.status || "extracting_audio"}
          initialProgress={project?.progress || 10}
          onCompleted={handlePipelineCompleted}
        />
      )}

      {/* If No Clips yet and not running: Call to Action */}
      {!hasClips && !isPipelineRunning && (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 p-12 text-center space-y-4 max-w-xl mx-auto">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500/20 to-amber-500/20 text-rose-400">
            <Flame className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white">Extract Your Viral Clips</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Launch Whisper speech-to-text with Bengali/English auto-detect and LLM highlight scoring. 
              Top moments will be extracted with word timestamps and snapped to sentence boundaries.
            </p>
          </div>
          <button
            onClick={handleStartProcessing}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/20 hover:opacity-95 transition-all"
          >
            <Sparkles className="h-4 w-4" />
            Start AI Clipping Pipeline
          </button>
        </div>
      )}

      {/* Clips & Transcript Section */}
      {hasClips && (
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex border-b border-zinc-800 gap-4">
            <button
              onClick={() => setActiveTab("clips")}
              className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-bold transition-all ${
                activeTab === "clips"
                  ? "border-rose-500 text-rose-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Flame className="h-4 w-4 text-rose-500" />
              Viral Clips ({clips.length})
            </button>

            <button
              onClick={() => setActiveTab("transcript")}
              className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-bold transition-all ${
                activeTab === "transcript"
                  ? "border-rose-500 text-rose-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <FileText className="h-4 w-4 text-amber-500" />
              Word-Level Transcript
            </button>

            {activeTab === "clips" && (
              <div className="ml-auto mb-2 flex items-center gap-2">
                <button
                  onClick={() => handleDownloadAllZip("1080p")}
                  disabled={isDownloadingZip}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition-all shadow-sm disabled:opacity-50"
                  title="Download all clips and subtitles as ZIP archive"
                >
                  {isDownloadingZip ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                  ) : (
                    <Download className="h-3.5 w-3.5 text-amber-400" />
                  )}
                  Download All (ZIP)
                </button>

                <button
                  onClick={handleRenderAll}
                  disabled={isBatchRendering}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:opacity-90 px-4 py-1.5 text-xs font-bold text-white transition-all shadow-md shadow-rose-600/20 disabled:opacity-50"
                >
                  {isBatchRendering ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Video className="h-3.5 w-3.5" />
                  )}
                  Render All 9:16 Clips
                </button>
              </div>
            )}
          </div>

          {/* Tab 1: Clips Grid */}
          {activeTab === "clips" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clips.map((clip, index) => (
                <ClipCard key={clip.id} clip={clip} index={index} />
              ))}
            </div>
          )}

          {/* Tab 2: Transcript Viewer */}
          {activeTab === "transcript" && (
            <TranscriptViewer projectId={projectId} />
          )}
        </div>
      )}
    </div>
  );
}
