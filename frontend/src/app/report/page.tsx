"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Flag, Send, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react";
import { apiReports } from "../../lib/api";

export default function ReportPage() {
  const [formData, setFormData] = useState({
    report_type: "copyright_dmca",
    target_type: "clip",
    target_url: "",
    reporter_name: "",
    reporter_email: "",
    original_work_url: "",
    description: "",
    good_faith_statement: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.good_faith_statement) {
      setErrorMessage("Please confirm that the information provided is accurate and submitted in good faith.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const res = await apiReports.submit({
        report_type: formData.report_type,
        target_type: formData.target_type,
        target_id: formData.target_url,
        target_url: formData.target_url,
        reporter_name: formData.reporter_name,
        reporter_email: formData.reporter_email,
        original_work_url: formData.original_work_url || undefined,
        description: formData.description,
        good_faith_statement: formData.good_faith_statement,
      });
      setSubmittedId(res.id);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || err?.message || "Failed to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 text-zinc-300 space-y-8">
      {/* Header */}
      <div className="space-y-4 border-b border-zinc-800 pb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <Flag className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Report Content or Violation</h1>
            <p className="text-sm text-zinc-400 mt-0.5">Report unauthorized copyright use, harmful material, or platform violations</p>
          </div>
        </div>
      </div>

      {submittedId ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Report Successfully Submitted</h2>
            <p className="text-xs text-emerald-300/90 max-w-md mx-auto">
              Reference Ticket: <code className="bg-zinc-800 px-2 py-0.5 rounded text-white font-mono">{submittedId}</code>
            </p>
          </div>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Our safety and compliance team reviews every submission promptly. If additional details are required, we will reach out to you at the email provided.
          </p>
          <button
            onClick={() => {
              setSubmittedId(null);
              setFormData({
                report_type: "copyright_dmca",
                target_type: "clip",
                target_url: "",
                reporter_name: "",
                reporter_email: "",
                original_work_url: "",
                description: "",
                good_faith_statement: true,
              });
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-xs font-semibold text-white transition-all border border-zinc-700"
          >
            Submit Another Report
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 space-y-6">
          {errorMessage && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3 text-xs text-rose-300">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Reason for Report *</label>
              <select
                value={formData.report_type}
                onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
              >
                <option value="copyright_dmca">Copyright / IP Infringement (DMCA)</option>
                <option value="unauthorized_use">Unauthorized Appearance or Likeness</option>
                <option value="inappropriate">Inappropriate or Explicit Content</option>
                <option value="misleading">Misleading or Deceptive Edits</option>
                <option value="other">Other Violation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">URL or Link to Infringing Clip *</label>
              <input
                type="text"
                required
                placeholder="https://clipforge.ai/share/... or Clip ID"
                value={formData.target_url}
                onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Your Full Name *</label>
              <input
                type="text"
                required
                placeholder="Full Name or Entity"
                value={formData.reporter_name}
                onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Your Contact Email *</label>
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={formData.reporter_email}
                onChange={(e) => setFormData({ ...formData, reporter_email: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Original Source Work URL (Optional)</label>
            <input
              type="url"
              placeholder="https://youtube.com/... or official website"
              value={formData.original_work_url}
              onChange={(e) => setFormData({ ...formData, original_work_url: e.target.value })}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Description of the Violation *</label>
            <textarea
              required
              rows={4}
              placeholder="Provide specific details about why this content should be reviewed or removed..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={formData.good_faith_statement}
                onChange={(e) => setFormData({ ...formData, good_faith_statement: e.target.checked })}
                className="mt-0.5 rounded border-zinc-700 bg-zinc-800 text-rose-600 focus:ring-rose-500"
              />
              <span className="text-xs text-zinc-300 leading-relaxed">
                I verify that this report is submitted in good faith and that all information provided is true and accurate.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-rose-600/20 hover:opacity-95 transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : (
              <>
                <Send className="h-3.5 w-3.5" />
                Submit Report for Review
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
