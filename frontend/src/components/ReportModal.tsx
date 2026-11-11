"use client";

import React, { useState } from "react";
import { X, Flag, Send, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react";
import { apiReports } from "../lib/api";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clipId?: string;
  clipTitle?: string;
  shareToken?: string;
}

export function ReportModal({
  isOpen,
  onClose,
  clipId,
  clipTitle,
  shareToken,
}: ReportModalProps) {
  const [reportType, setReportType] = useState("copyright_dmca");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [description, setDescription] = useState("");
  const [goodFaith, setGoodFaith] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goodFaith) {
      setError("Please affirm the good-faith compliance statement.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await apiReports.submit({
        report_type: reportType,
        target_type: shareToken ? "share_link" : "clip",
        target_id: clipId || shareToken,
        target_url: shareToken ? `/share/${shareToken}` : undefined,
        reporter_name: name,
        reporter_email: email,
        original_work_url: originalUrl || undefined,
        description: `Clip: ${clipTitle || clipId || "Unknown"}\n\n${description}`,
        good_faith_statement: goodFaith,
      });
      setSuccessId(res.id);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSuccessId(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Flag className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Report Clip Content</h3>
              <p className="text-xs text-zinc-400">
                {clipTitle ? `"${clipTitle.slice(0, 36)}..."` : "Content moderation & copyright"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {successId ? (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Report Successfully Received</h4>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Reference: <code className="text-rose-400 font-mono">{successId}</code>. Our safety team will review this clip immediately.
            </p>
            <button
              onClick={handleClose}
              className="mt-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-5 py-2 text-xs font-semibold text-white transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 flex items-center gap-2 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Reason for Report *</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
              >
                <option value="copyright_dmca">Copyright / IP Infringement</option>
                <option value="unauthorized_use">Unauthorized Appearance or Likeness</option>
                <option value="inappropriate">Inappropriate / Harmful Material</option>
                <option value="other">Other Violation</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Your Email *</label>
                <input
                  type="email"
                  required
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Original Work Link (Optional for DMCA)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Details *</label>
              <textarea
                required
                rows={3}
                placeholder="Briefly state why this clip violates copyright or policy..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <label className="flex items-start gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                required
                checked={goodFaith}
                onChange={(e) => setGoodFaith(e.target.checked)}
                className="mt-0.5 rounded border-zinc-700 bg-zinc-800 text-rose-600 focus:ring-rose-500"
              />
              <span className="text-[11px] text-zinc-400">
                I state under penalty of perjury that this report is submitted in good faith and accurate.
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Send Report
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
