"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Undo2,
  Redo2,
  Save,
  Video,
  Sparkles,
  Type,
  Music,
  Scissors,
  Sliders,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Eye,
  RefreshCw,
  Layers,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Maximize2,
  Download,
  Share2,
  FileText,
  Copy,
} from "lucide-react";
import { apiClips, apiAuth, apiExport } from "../../../../lib/api";
import { ClipDetail, WordItem, CaptionStyle } from "../../../../types";
import { formatDuration } from "../../../../lib/utils";

const FONT_OPTIONS = [
  "Inter",
  "Montserrat",
  "Poppins",
  "Roboto",
  "Arial",
  "Impact",
];

const COLOR_PRESETS = [
  { name: "Yellow", hex: "#FFCC00" },
  { name: "Gold", hex: "#F59E0B" },
  { name: "Emerald", hex: "#10B981" },
  { name: "Cyan", hex: "#06B6D4" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Purple", hex: "#A855F7" },
  { name: "White", hex: "#FFFFFF" },
];

export default function ClipEditorPage() {
  const params = useParams();
  const clipId = params?.id as string;
  const router = useRouter();

  // Core State
  const [clip, setClip] = useState<ClipDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable Form State
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(60);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [reframeMode, setReframeMode] = useState<"auto_face" | "manual" | "blurred_fit" | "center">("auto_face");
  const [focusX, setFocusX] = useState(0.5);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>({
    font: "Inter",
    font_size: 32,
    primary_color: "#FFFFFF",
    highlight_color: "#FFCC00",
    position: "bottom",
  });
  const [words, setWords] = useState<WordItem[]>([]);
  const [titleOverlayText, setTitleOverlayText] = useState("");
  const [musicVolume, setMusicVolume] = useState(0.2);
  const [musicDucking, setMusicDucking] = useState(true);
  const [removeFillerWords, setRemoveFillerWords] = useState(false);
  const [removeSilence, setRemoveSilence] = useState(false);

  // Editor Tabs
  const [activeTab, setActiveTab] = useState<"reframe" | "captions" | "hook" | "audio" | "branding">("captions");

  // History Stack for Undo/Redo
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isHistoryAction = useRef(false);

  // Autosave Status
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("saved");
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Video Player State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Word Inline Editing
  const [editingWordIndex, setEditingWordIndex] = useState<number | null>(null);
  const [editWordText, setEditWordText] = useState("");

  // Re-Render Modal / Status
  const [isReRendering, setIsReRendering] = useState(false);
  const [reRenderProgress, setReRenderProgress] = useState(0);
  const [renderResolution, setRenderResolution] = useState<"1080p" | "720p">("1080p");
  const [showRenderModal, setShowRenderModal] = useState(false);

  // 1. Initial Load
  useEffect(() => {
    async function loadClip() {
      if (!clipId) return;
      try {
        setIsLoading(true);
        setError(null);
        await apiAuth.ensureAuthenticated();
        const data = await apiClips.getDetail(clipId);
        setClip(data);

        setTitle(data.title);
        setStartTime(data.start_time);
        setEndTime(data.end_time);
        setAspectRatio(data.aspect_ratio);
        setReframeMode(data.reframe_mode);
        setFocusX(data.focus_x);
        setCaptionsEnabled(data.captions_enabled);
        setCaptionStyle(data.caption_style || {
          font: "Inter",
          font_size: 32,
          primary_color: "#FFFFFF",
          highlight_color: "#FFCC00",
          position: "bottom",
        });
        setWords(data.words || []);
        setTitleOverlayText(data.title_overlay_text || "");
        setMusicVolume(data.music_volume || 0.2);
        setMusicDucking(data.music_ducking ?? true);
        setRemoveFillerWords(data.remove_filler_words ?? false);
        setRemoveSilence(data.remove_silence ?? false);

        // Push initial state to history
        const initialState = {
          title: data.title,
          startTime: data.start_time,
          endTime: data.end_time,
          aspectRatio: data.aspect_ratio,
          reframeMode: data.reframe_mode,
          focusX: data.focus_x,
          captionsEnabled: data.captions_enabled,
          captionStyle: data.caption_style,
          words: data.words || [],
          titleOverlayText: data.title_overlay_text || "",
          musicVolume: data.music_volume || 0.2,
          musicDucking: data.music_ducking ?? true,
          removeFillerWords: data.remove_filler_words ?? false,
          removeSilence: data.remove_silence ?? false,
        };
        setHistory([initialState]);
        setHistoryIndex(0);
      } catch (err: any) {
        console.error("Failed to load clip details", err);
        setError(err.response?.data?.detail || "Could not load clip details.");
      } finally {
        setIsLoading(false);
      }
    }
    loadClip();
  }, [clipId]);

  // Current State Snapshot
  const currentStateSnapshot = useMemo(() => ({
    title,
    startTime,
    endTime,
    aspectRatio,
    reframeMode,
    focusX,
    captionsEnabled,
    captionStyle,
    words,
    titleOverlayText,
    musicVolume,
    musicDucking,
    removeFillerWords,
    removeSilence,
  }), [
    title,
    startTime,
    endTime,
    aspectRatio,
    reframeMode,
    focusX,
    captionsEnabled,
    captionStyle,
    words,
    titleOverlayText,
    musicVolume,
    musicDucking,
    removeFillerWords,
    removeSilence,
  ]);

  // Push to history when state changes (debounced & filtered)
  const pushHistory = (newState: any) => {
    if (isHistoryAction.current) {
      isHistoryAction.current = false;
      return;
    }
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, newState];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      isHistoryAction.current = true;
      const target = history[historyIndex - 1];
      applySnapshot(target);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isHistoryAction.current = true;
      const target = history[historyIndex + 1];
      applySnapshot(target);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const applySnapshot = (s: any) => {
    setTitle(s.title);
    setStartTime(s.startTime);
    setEndTime(s.endTime);
    setAspectRatio(s.aspectRatio);
    setReframeMode(s.reframeMode);
    setFocusX(s.focusX);
    setCaptionsEnabled(s.captionsEnabled);
    setCaptionStyle(s.captionStyle);
    setWords(s.words);
    setTitleOverlayText(s.titleOverlayText);
    setMusicVolume(s.musicVolume);
    setMusicDucking(s.musicDucking);
    setRemoveFillerWords(s.removeFillerWords);
    setRemoveSilence(s.removeSilence);
  };

  // Debounced Autosave
  useEffect(() => {
    if (isLoading || !clip) return;

    setSaveStatus("saving");
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        await apiClips.updateEdit(clipId, {
          title,
          start_time: startTime,
          end_time: endTime,
          aspect_ratio: aspectRatio,
          reframe_mode: reframeMode,
          focus_x: focusX,
          captions_enabled: captionsEnabled,
          caption_style: captionStyle,
          words,
          title_overlay_text: titleOverlayText,
          music_volume: musicVolume,
          music_ducking: musicDucking,
          remove_filler_words: removeFillerWords,
          remove_silence: removeSilence,
        });
        setSaveStatus("saved");
      } catch (err) {
        console.error("Autosave failed", err);
        setSaveStatus("idle");
      }
    }, 1200);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    title,
    startTime,
    endTime,
    aspectRatio,
    reframeMode,
    focusX,
    captionsEnabled,
    captionStyle,
    words,
    titleOverlayText,
    musicVolume,
    musicDucking,
    removeFillerWords,
    removeSilence,
  ]);

  // Video Playhead Synchronization
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const seekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(seconds, videoDuration || 9999));
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Find active word currently being spoken
  const activeWord = useMemo(() => {
    return words.find(
      (w) => !w.deleted && currentTime >= (w.start - startTime) && currentTime <= (w.end - startTime)
    );
  }, [words, currentTime, startTime]);

  // Word Editing handlers
  const handleStartEditWord = (index: number) => {
    setEditingWordIndex(index);
    setEditWordText(words[index].word);
  };

  const handleSaveWord = (index: number) => {
    const updated = [...words];
    updated[index] = { ...updated[index], word: editWordText.trim() };
    setWords(updated);
    setEditingWordIndex(null);
    pushHistory({ ...currentStateSnapshot, words: updated });
  };

  const handleToggleDeleteWord = (index: number) => {
    const updated = [...words];
    updated[index] = { ...updated[index], deleted: !updated[index].deleted };
    setWords(updated);
    pushHistory({ ...currentStateSnapshot, words: updated });
  };

  // Trim snapping to nearest word
  const snapStartToNearestWord = () => {
    if (words.length === 0) return;
    const sorted = [...words].sort((a, b) => Math.abs(a.start - startTime) - Math.abs(b.start - startTime));
    if (sorted[0]) {
      setStartTime(sorted[0].start);
      pushHistory({ ...currentStateSnapshot, startTime: sorted[0].start });
    }
  };

  const snapEndToNearestWord = () => {
    if (words.length === 0) return;
    const sorted = [...words].sort((a, b) => Math.abs(a.end - endTime) - Math.abs(b.end - endTime));
    if (sorted[0]) {
      setEndTime(sorted[0].end);
      pushHistory({ ...currentStateSnapshot, endTime: sorted[0].end });
    }
  };

  // Re-Render Trigger
  const handleReRender = async () => {
    if (!clip) return;
    try {
      setShowRenderModal(true);
      setIsReRendering(true);
      setReRenderProgress(15);

      // Save edits immediately
      await apiClips.updateEdit(clip.id, {
        title,
        start_time: startTime,
        end_time: endTime,
        aspect_ratio: aspectRatio,
        reframe_mode: reframeMode,
        focus_x: focusX,
        captions_enabled: captionsEnabled,
        caption_style: captionStyle,
        words,
        title_overlay_text: titleOverlayText,
        music_volume: musicVolume,
        music_ducking: musicDucking,
        remove_filler_words: removeFillerWords,
        remove_silence: removeSilence,
      });

      // Dispatch re-render
      await apiClips.reRender(clip.id, renderResolution);

      // Poll status
      const pollTimer = setInterval(async () => {
        try {
          const statusData = await apiClips.getStatus(clip.id);
          setReRenderProgress(statusData.progress);
          if (statusData.status === "completed") {
            clearInterval(pollTimer);
            setIsReRendering(false);
            setReRenderProgress(100);
            // Refresh clip detail
            const updatedClip = await apiClips.getDetail(clip.id);
            setClip(updatedClip);
          } else if (statusData.status === "failed") {
            clearInterval(pollTimer);
            setIsReRendering(false);
            alert("Re-rendering failed: " + (statusData.error_message || "Unknown error"));
          }
        } catch {
          // Keep polling
        }
      }, 1500);
    } catch (err: any) {
      setIsReRendering(false);
      alert("Failed to start re-render: " + (err.response?.data?.detail || err.message));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500 mx-auto" />
          <p className="text-sm font-medium">Opening Clip Studio...</p>
        </div>
      </div>
    );
  }

  if (error || !clip) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400 p-6">
        <div className="text-center max-w-md space-y-4">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">Clip Not Found</h2>
          <p className="text-xs text-zinc-400">{error || "Could not load clip data."}</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Preview video source
  const videoStreamUrl = clip.rendered_video_url || clip.source_video_url || "";
  const calculatedDuration = Math.max(1, Math.round(endTime - startTime));

  return (
    <div className="flex flex-col min-h-screen bg-[#09090b] text-zinc-100">
      {/* Studio Top Navigation Bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${clip.project_id}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
            title="Back to Project"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => pushHistory(currentStateSnapshot)}
                className="bg-transparent font-semibold text-sm sm:text-base text-white border-b border-transparent hover:border-zinc-700 focus:border-rose-500 focus:outline-none transition-colors px-1"
                placeholder="Clip Title"
              />
            </div>
            <p className="text-[11px] text-zinc-400 px-1 truncate max-w-xs sm:max-w-md">
              {clip.project_title} • Segment: {formatDuration(startTime)} - {formatDuration(endTime)} ({calculatedDuration}s)
            </p>
          </div>
        </div>

        {/* Center: Undo / Redo & Autosave Status */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            {saveStatus === "saving" ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                <span className="text-[11px] text-amber-500/80">Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span className="text-[11px] text-zinc-500">Saved</span>
              </>
            )}
          </div>
        </div>

        {/* Right CTA: Re-render Action & Export Tools */}
        <div className="flex items-center gap-2">
          {clip.rendered_video_url && (
            <>
              <button
                onClick={async () => {
                  try {
                    await apiExport.downloadClipMp4(clip.id, title, renderResolution);
                  } catch {
                    alert("Failed to download clip MP4.");
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 transition-all shadow-sm"
                title="Download Rendered MP4"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                Download
              </button>

              <button
                onClick={async () => {
                  try {
                    const share = await apiExport.createShareLink(clip.id);
                    const full = `${window.location.origin}${share.share_url}`;
                    await navigator.clipboard.writeText(full);
                    alert(`Shareable 7-day preview link copied to clipboard!\n${full}`);
                  } catch {
                    alert("Failed to create share link.");
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 transition-all shadow-sm"
                title="Share 7-Day Preview Link"
              >
                <Share2 className="h-3.5 w-3.5 text-cyan-400" />
                Share
              </button>
            </>
          )}

          <select
            value={renderResolution}
            onChange={(e) => setRenderResolution(e.target.value as any)}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-300 focus:outline-none"
          >
            <option value="1080p">1080p HD</option>
            <option value="720p">720p Fast</option>
          </select>

          <button
            onClick={handleReRender}
            disabled={isReRendering}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-rose-600/20 hover:opacity-95 transition-all disabled:opacity-50"
          >
            {isReRendering ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Video className="h-3.5 w-3.5" />
            )}
            Re-Render Clip
          </button>
        </div>
      </header>

      {/* Main Studio Body: 3-Column Split */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left Column: Settings Panel (5 cols) */}
        <div className="lg:col-span-4 border-r border-zinc-800/80 bg-zinc-950/60 flex flex-col h-full overflow-y-auto">
          {/* Sub-Tabs Navigation */}
          <div className="flex border-b border-zinc-800 px-2 py-1 gap-1 text-xs overflow-x-auto">
            <button
              onClick={() => setActiveTab("reframe")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === "reframe"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Maximize2 className="h-3.5 w-3.5 text-rose-400" />
              Aspect & Framing
            </button>
            <button
              onClick={() => setActiveTab("captions")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === "captions"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Type className="h-3.5 w-3.5 text-amber-400" />
              Captions
            </button>
            <button
              onClick={() => setActiveTab("hook")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === "hook"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              Hook Banner
            </button>
            <button
              onClick={() => setActiveTab("audio")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === "audio"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Music className="h-3.5 w-3.5 text-cyan-400" />
              Audio & Cleanup
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="p-5 space-y-6 flex-1">
            {/* 1. ASPECT & FRAMING TAB */}
            {activeTab === "reframe" && (
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-2">
                    Target Aspect Ratio
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "9:16", label: "9:16 Vertical", desc: "TikTok / Reels / Shorts" },
                      { id: "1:1", label: "1:1 Square", desc: "Feed Posts" },
                      { id: "16:9", label: "16:9 Wide", desc: "YouTube / Landscape" },
                    ].map((ar) => (
                      <button
                        key={ar.id}
                        onClick={() => {
                          setAspectRatio(ar.id as any);
                          pushHistory({ ...currentStateSnapshot, aspectRatio: ar.id });
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          aspectRatio === ar.id
                            ? "border-rose-500 bg-rose-500/10 text-white shadow-sm"
                            : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <p className="font-semibold text-xs text-white">{ar.label}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{ar.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-2">
                    Reframing & Tracking Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "auto_face", label: "Auto Face Tracking", desc: "AI centers dynamic speaker" },
                      { id: "manual", label: "Manual Focus Point", desc: "Custom horizontal X coordinates" },
                      { id: "blurred_fit", label: "Blurred Fit", desc: "Padded background aesthetic" },
                      { id: "center", label: "Center Crop", desc: "Fixed 50% midpoint crop" },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => {
                          setReframeMode(mode.id as any);
                          pushHistory({ ...currentStateSnapshot, reframeMode: mode.id });
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          reframeMode === mode.id
                            ? "border-amber-500 bg-amber-500/10 text-white shadow-sm"
                            : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <p className="font-semibold text-xs text-white">{mode.label}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{mode.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {reframeMode === "manual" && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-300">Speaker Focus X</span>
                      <span className="text-rose-400 font-mono">{Math.round(focusX * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.01"
                      value={focusX}
                      onChange={(e) => setFocusX(parseFloat(e.target.value))}
                      onMouseUp={() => pushHistory({ ...currentStateSnapshot, focusX })}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                    <p className="text-[11px] text-zinc-500">
                      Drag to align the crop window with the speaker on 16:9 landscape footage.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 2. CAPTIONS TAB */}
            {activeTab === "captions" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <p className="text-xs font-semibold text-white">Burn-in Animated Captions</p>
                    <p className="text-[11px] text-zinc-400">Karaoke-style word highlighting</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={captionsEnabled}
                      onChange={(e) => {
                        setCaptionsEnabled(e.target.checked);
                        pushHistory({ ...currentStateSnapshot, captionsEnabled: e.target.checked });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>

                {captionsEnabled && (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-2">
                        Font Family
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {FONT_OPTIONS.map((f) => (
                          <button
                            key={f}
                            onClick={() => {
                              const updated = { ...captionStyle, font: f };
                              setCaptionStyle(updated);
                              pushHistory({ ...currentStateSnapshot, captionStyle: updated });
                            }}
                            className={`p-2 rounded-lg border text-xs font-medium text-center transition-all ${
                              captionStyle.font === f
                                ? "border-rose-500 bg-rose-500/10 text-white"
                                : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700"
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-zinc-300">Font Size</span>
                        <span className="text-rose-400 font-mono">{captionStyle.font_size}px</span>
                      </div>
                      <input
                        type="range"
                        min="22"
                        max="54"
                        value={captionStyle.font_size}
                        onChange={(e) => setCaptionStyle({ ...captionStyle, font_size: parseInt(e.target.value) })}
                        onMouseUp={() => pushHistory(currentStateSnapshot)}
                        className="w-full accent-rose-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-2">
                        Active Word Highlight Color
                      </label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {COLOR_PRESETS.map((color) => (
                          <button
                            key={color.hex}
                            onClick={() => {
                              const updated = { ...captionStyle, highlight_color: color.hex };
                              setCaptionStyle(updated);
                              pushHistory({ ...currentStateSnapshot, captionStyle: updated });
                            }}
                            className={`h-7 w-7 rounded-full border-2 transition-transform ${
                              captionStyle.highlight_color.toLowerCase() === color.hex.toLowerCase()
                                ? "scale-110 border-white shadow-md shadow-white/20"
                                : "border-transparent hover:scale-105"
                            }`}
                            style={{ backgroundColor: color.hex }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-2">
                        Screen Safe-Zone Position
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "bottom", label: "Lower Third (Default)" },
                          { id: "center", label: "Center Stage" },
                          { id: "top", label: "Upper Third" },
                        ].map((pos) => (
                          <button
                            key={pos.id}
                            onClick={() => {
                              const updated = { ...captionStyle, position: pos.id as any };
                              setCaptionStyle(updated);
                              pushHistory({ ...currentStateSnapshot, captionStyle: updated });
                            }}
                            className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                              captionStyle.position === pos.id
                                ? "border-rose-500 bg-rose-500/10 text-white"
                                : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700"
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 3. HOOK BANNER TAB */}
            {activeTab === "hook" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Opening Hook / Title Banner (First 3.5s)
                  </label>
                  <p className="text-[11px] text-zinc-400 mb-3">
                    Draw attention instantly with an overlaid bold banner during the first 3 seconds of the clip.
                  </p>
                  <textarea
                    rows={3}
                    value={titleOverlayText}
                    onChange={(e) => setTitleOverlayText(e.target.value)}
                    onBlur={() => pushHistory(currentStateSnapshot)}
                    placeholder="e.g. SURVIVING 24 HOURS ON MARS..."
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 text-[11px] text-zinc-400 flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Clips with strong opening question hooks experience up to <strong>3.2x higher retention</strong> in vertical short-form algorithms.
                  </span>
                </div>
              </div>
            )}

            {/* 4. AUDIO & CLEANUP TAB */}
            {activeTab === "audio" && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-zinc-300">Speech Cleanup</p>
                  <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 cursor-pointer">
                    <div>
                      <p className="text-xs font-medium text-white">Filter Filler Words</p>
                      <p className="text-[11px] text-zinc-400">Omit "um", "uh", "like" from generated captions</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={removeFillerWords}
                      onChange={(e) => {
                        setRemoveFillerWords(e.target.checked);
                        pushHistory({ ...currentStateSnapshot, removeFillerWords: e.target.checked });
                      }}
                      className="rounded border-zinc-700 text-rose-600 focus:ring-rose-500 h-4 w-4 bg-zinc-800"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 cursor-pointer">
                    <div>
                      <p className="text-xs font-medium text-white">Trim Long Silences</p>
                      <p className="text-[11px] text-zinc-400">Tighten pacing between sentences</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={removeSilence}
                      onChange={(e) => {
                        setRemoveSilence(e.target.checked);
                        pushHistory({ ...currentStateSnapshot, removeSilence: e.target.checked });
                      }}
                      className="rounded border-zinc-700 text-rose-600 focus:ring-rose-500 h-4 w-4 bg-zinc-800"
                    />
                  </label>
                </div>

                <div className="space-y-3 pt-3 border-t border-zinc-800">
                  <p className="text-xs font-semibold text-zinc-300">Background Music & Ducking</p>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-zinc-400">Music Volume</span>
                      <span className="text-rose-400 font-mono">{Math.round(musicVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.8"
                      step="0.05"
                      value={musicVolume}
                      onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                      onMouseUp={() => pushHistory(currentStateSnapshot)}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 cursor-pointer">
                    <div>
                      <p className="text-xs font-medium text-white">Audio Speech Ducking</p>
                      <p className="text-[11px] text-zinc-400">Automatically lower background music during active speech</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={musicDucking}
                      onChange={(e) => {
                        setMusicDucking(e.target.checked);
                        pushHistory({ ...currentStateSnapshot, musicDucking: e.target.checked });
                      }}
                      className="rounded border-zinc-700 text-rose-600 focus:ring-rose-500 h-4 w-4 bg-zinc-800"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Column: Live Video Preview Player (8 cols) */}
        <div className="lg:col-span-8 flex flex-col h-full bg-zinc-950/40">
          <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Aspect Ratio Container Frame */}
            <div
              className={`relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800/80 transition-all ${
                aspectRatio === "9:16"
                  ? "w-[290px] h-[515px] sm:w-[320px] sm:h-[570px]"
                  : aspectRatio === "1:1"
                  ? "w-[360px] h-[360px] sm:w-[460px] sm:h-[460px]"
                  : "w-full max-w-[620px] aspect-video"
              }`}
            >
              <video
                ref={videoRef}
                src={videoStreamUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-cover"
                playsInline
              />

              {/* Live Simulated Focus Point Guide (Manual Mode) */}
              {reframeMode === "manual" && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 border-l-2 border-dashed border-rose-500 pointer-events-none z-20"
                  style={{ left: `${focusX * 100}%` }}
                >
                  <span className="absolute top-2 -left-6 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    FOCUS
                  </span>
                </div>
              )}

              {/* Live Opening Hook Banner Overlay */}
              {titleOverlayText && currentTime <= 3.5 && (
                <div className="absolute top-6 left-4 right-4 z-30 pointer-events-none transition-all duration-300">
                  <div className="bg-black/85 backdrop-blur-md border border-amber-500/40 px-3.5 py-2 rounded-xl text-center shadow-xl">
                    <p className="font-extrabold text-xs sm:text-sm tracking-wide text-amber-300 uppercase">
                      {titleOverlayText}
                    </p>
                  </div>
                </div>
              )}

              {/* Live Karaoke Animated Captions Overlay */}
              {captionsEnabled && activeWord && (
                <div
                  className={`absolute left-4 right-4 z-20 pointer-events-none flex justify-center text-center transition-all ${
                    captionStyle.position === "top"
                      ? "top-14"
                      : captionStyle.position === "center"
                      ? "top-1/2 -translate-y-1/2"
                      : "bottom-14"
                  }`}
                >
                  <div className="px-4 py-2 bg-black/50 backdrop-blur-xs rounded-xl shadow-lg inline-block">
                    <span
                      style={{
                        fontFamily: captionStyle.font,
                        fontSize: `${Math.round(captionStyle.font_size * 0.75)}px`,
                        color: captionStyle.highlight_color,
                        textShadow: "0 2px 8px rgba(0,0,0,0.9)",
                        fontWeight: "800",
                      }}
                      className="tracking-wide uppercase animate-pulse"
                    >
                      {activeWord.word}
                    </span>
                  </div>
                </div>
              )}

              {/* Play Overlay Button */}
              {!isPlaying && (
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto h-14 w-14 rounded-full bg-rose-600/90 text-white flex items-center justify-center hover:scale-105 transition-transform shadow-xl backdrop-blur-sm"
                >
                  <Play className="h-6 w-6 ml-1 fill-white" />
                </button>
              )}
            </div>
          </div>

          {/* Player Playback Controls */}
          <div className="border-t border-zinc-800/80 bg-zinc-950/80 p-3 flex items-center justify-between text-xs px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>

              <button
                onClick={() => seekTo(0)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                title="Restart"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <span className="font-mono text-zinc-400">
                {formatDuration(currentTime)} / {formatDuration(videoDuration || calculatedDuration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500">Speed:</span>
              {[1, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() => {
                    setPlaybackRate(rate);
                    if (videoRef.current) videoRef.current.playbackRate = rate;
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    playbackRate === rate ? "bg-rose-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* Timeline & Word-Level Interactive Transcript Editor */}
          <div className="border-t border-zinc-800 bg-zinc-900/40 p-4 space-y-4">
            {/* Trim Handle Slider Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Scissors className="h-3.5 w-3.5 text-rose-500" />
                  <span className="font-semibold text-zinc-300">Trim Boundaries (Snaps to Sentences)</span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <button
                    onClick={snapStartToNearestWord}
                    className="text-rose-400 hover:underline"
                  >
                    Snap Start to Word
                  </button>
                  <button
                    onClick={snapEndToNearestWord}
                    className="text-rose-400 hover:underline"
                  >
                    Snap End to Word
                  </button>
                  <span className="bg-zinc-800 px-2 py-0.5 rounded text-white font-mono">
                    {calculatedDuration}s total
                  </span>
                </div>
              </div>

              {/* Start & End Dual Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5">
                  <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                    <span>Clip Start</span>
                    <span className="font-mono text-zinc-200">{formatDuration(startTime)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(1, endTime - 5)}
                    step="0.5"
                    value={startTime}
                    onChange={(e) => setStartTime(parseFloat(e.target.value))}
                    onMouseUp={() => pushHistory(currentStateSnapshot)}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5">
                  <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                    <span>Clip End</span>
                    <span className="font-mono text-zinc-200">{formatDuration(endTime)}</span>
                  </div>
                  <input
                    type="range"
                    min={startTime + 5}
                    max={clip.source_duration || (startTime + 180)}
                    step="0.5"
                    value={endTime}
                    onChange={(e) => setEndTime(parseFloat(e.target.value))}
                    onMouseUp={() => pushHistory(currentStateSnapshot)}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Interactive Word Transcript Stream */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-400">
                  Interactive Words ({words.filter((w) => !w.deleted).length}) • Click word to seek, double-click to fix spelling
                </span>
              </div>

              <div className="max-h-40 overflow-y-auto rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-3 flex flex-wrap gap-1.5 text-xs">
                {words.map((w, idx) => {
                  const isCurrent =
                    currentTime >= (w.start - startTime) && currentTime <= (w.end - startTime);
                  const isEditing = editingWordIndex === idx;

                  if (isEditing) {
                    return (
                      <span key={idx} className="inline-flex items-center gap-1 bg-zinc-800 rounded px-1.5 py-0.5 border border-rose-500">
                        <input
                          type="text"
                          value={editWordText}
                          onChange={(e) => setEditWordText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveWord(idx);
                            if (e.key === "Escape") setEditingWordIndex(null);
                          }}
                          className="w-20 bg-transparent text-white text-xs focus:outline-none"
                          autoFocus
                        />
                        <button onClick={() => handleSaveWord(idx)} className="text-emerald-400 hover:text-emerald-300">
                          <Check className="h-3 w-3" />
                        </button>
                        <button onClick={() => setEditingWordIndex(null)} className="text-zinc-500 hover:text-zinc-300">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  }

                  return (
                    <span
                      key={idx}
                      onClick={() => seekTo(w.start - startTime)}
                      onDoubleClick={() => handleStartEditWord(idx)}
                      className={`group relative cursor-pointer px-1.5 py-0.5 rounded transition-all select-none ${
                        w.deleted
                          ? "line-through text-zinc-600 bg-zinc-900/40"
                          : isCurrent
                          ? "bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40"
                          : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                      }`}
                      title={`${w.word} (${formatDuration(w.start)}) - Double click to edit`}
                    >
                      {w.word}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleDeleteWord(idx);
                        }}
                        className="hidden group-hover:inline-block ml-1 text-zinc-500 hover:text-rose-400"
                        title={w.deleted ? "Restore word" : "Omit word from captions"}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Re-Render Status Modal */}
      {showRenderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
              {isReRendering ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              )}
            </div>

            <div>
              <h3 className="text-base font-bold text-white">
                {isReRendering ? "Re-Rendering Clip with Custom Settings..." : "Clip Re-Render Complete!"}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                {isReRendering
                  ? `Applying ${aspectRatio} reframe, animated captions, and audio overlays (${reRenderProgress}%)...`
                  : "Your new customized clip is ready to stream and download."}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-rose-600 to-amber-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${reRenderProgress}%` }}
              />
            </div>

            <div className="pt-2 flex justify-center gap-3">
              {isReRendering ? (
                <p className="text-xs text-zinc-500">Please do not close this window while FFmpeg encodes.</p>
              ) : (
                <button
                  onClick={() => setShowRenderModal(false)}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 px-5 py-2 text-xs font-semibold text-white transition-all shadow-md shadow-rose-600/20"
                >
                  View Updated Clip
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
