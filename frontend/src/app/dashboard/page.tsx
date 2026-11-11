"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Film,
  Clock,
  HardDrive,
  Trash2,
  ExternalLink,
  Loader2,
  Video,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { apiAuth, apiProjects } from "../../lib/api";
import { Project, User } from "../../types";
import { formatBytes, formatDuration } from "../../lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const currentUser = await apiAuth.ensureAuthenticated();
      setUser(currentUser);
      const list = await apiProjects.list();
      setProjects(list);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || err?.message || "Failed to load projects from server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm("Are you sure you want to delete this project and its source video files?")) {
      return;
    }
    try {
      setDeletingId(id);
      await apiProjects.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      if (err?.response?.status === 404) {
        // Project was already deleted, update local state
        setProjects((prev) => prev.filter((p) => p.id !== id));
      } else {
        console.warn("Failed to delete project", err);
        alert("Failed to delete project. Please try again.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Film className="h-7 w-7 text-rose-500" />
            Projects Dashboard
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage your ingested source videos and extracted viral clips
          </p>
        </div>

        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 hover:opacity-95 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <p className="text-xs font-medium text-zinc-400">Total Projects</p>
          <p className="text-2xl font-bold text-white mt-1">{projects.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <p className="text-xs font-medium text-zinc-400">Ready for AI Clipping</p>
          <p className="text-2xl font-bold text-rose-400 mt-1">
            {projects.filter((p) => p.status === "ready").length}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <p className="text-xs font-medium text-zinc-400">Rights Verified & Compliant</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">100%</p>
        </div>
      </div>

      {/* Projects List Section */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <p className="text-sm">Loading your video projects...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-900/40 bg-rose-950/20 p-8 text-center space-y-4 max-w-lg mx-auto">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">Could not load projects</h3>
            <p className="text-xs text-rose-300/80">{error}</p>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition-all shadow-md shadow-rose-600/20"
          >
            Retry Connection
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
            <Video className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white">No projects yet</h3>
            <p className="text-xs text-zinc-400">
              Upload your first podcast, lecture, or video to start generating viral short-form clips.
            </p>
          </div>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-5 py-2.5 text-xs font-semibold text-white transition-all shadow-md shadow-rose-600/20"
          >
            <PlusCircle className="h-4 w-4" />
            Create First Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur-sm transition-all hover:border-zinc-700 hover:bg-zinc-900/60"
            >
              <div className="space-y-3">
                {/* Header status badge & actions */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      project.status === "ready"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : project.status === "failed"
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {project.status.toUpperCase()}
                  </span>

                  <button
                    onClick={(e) => handleDelete(project.id, e)}
                    disabled={deletingId === project.id}
                    className="rounded-lg p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete Project"
                  >
                    {deletingId === project.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Title */}
                <Link href={`/projects/${project.id}`} className="block group-hover:text-rose-400 transition-colors">
                  <h3 className="font-semibold text-base text-zinc-100 line-clamp-2">
                    {project.title}
                  </h3>
                </Link>

                {/* Metadata */}
                {project.source_video && (
                  <div className="space-y-1.5 pt-1 text-xs text-zinc-400">
                    <div className="flex items-center gap-2 truncate">
                      <Film className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{project.source_video.original_filename}</span>
                    </div>
                    <div className="flex items-center gap-4 text-zinc-500">
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3.5 w-3.5" />
                        {formatBytes(project.source_video.file_size_bytes)}
                      </span>
                      {project.source_video.duration_seconds && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDuration(project.source_video.duration_seconds)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                <span className="text-zinc-500">
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
                <Link
                  href={`/projects/${project.id}`}
                  className="font-medium text-rose-400 hover:text-rose-300 inline-flex items-center gap-1"
                >
                  Open Project
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
