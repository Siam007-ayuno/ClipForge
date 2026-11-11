"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, Mail, Send, CheckCircle2, AlertCircle, FileCheck, HelpCircle } from "lucide-react";
import { apiReports } from "../../lib/api";

export default function DmcaPage() {
  const [formData, setFormData] = useState({
    reporter_name: "",
    reporter_email: "",
    original_work_url: "",
    target_url: "",
    target_id: "",
    description: "",
    good_faith_statement: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.good_faith_statement) {
      setErrorMessage("You must affirm the good-faith statement under penalty of perjury.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const res = await apiReports.submit({
        report_type: "copyright_dmca",
        target_type: "clip",
        target_id: formData.target_id || undefined,
        target_url: formData.target_url || undefined,
        reporter_name: formData.reporter_name,
        reporter_email: formData.reporter_email,
        original_work_url: formData.original_work_url || undefined,
        description: formData.description,
        good_faith_statement: formData.good_faith_statement,
      });
      setSubmittedId(res.id);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || err?.message || "Failed to submit takedown request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 text-zinc-300 space-y-12">
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
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">DMCA & Copyright Takedown Policy</h1>
            <p className="text-sm text-zinc-400 mt-0.5">Designated Agent Information & Statutory Takedown Portal</p>
          </div>
        </div>
      </div>

      {/* Designated Agent Box */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold text-base">
          <Mail className="h-5 w-5 text-rose-500" />
          Designated Copyright Agent
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-400">
          <div>
            <p className="text-zinc-200 font-medium">Service Provider:</p>
            <p>ClipForge Technologies, Inc.</p>
            <p className="mt-2 text-zinc-200 font-medium">Designated Agent:</p>
            <p>Copyright Compliance Directorate</p>
          </div>
          <div>
            <p className="text-zinc-200 font-medium">Official Contact Email:</p>
            <p className="text-rose-400 font-mono">dmca@clipforge.ai</p>
            <p className="mt-2 text-zinc-200 font-medium">Response SLA:</p>
            <p>Takedowns reviewed & actioned within 24 business hours</p>
          </div>
        </div>
      </div>

      {/* Interactive Submission Form */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-rose-500" />
            Submit Formal DMCA Takedown Notice
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            If you are a copyright owner or authorized agent, complete this form to file a legally binding takedown notice pursuant to 17 U.S.C. § 512(c).
          </p>
        </div>

        {submittedId ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white">DMCA Takedown Notice Logged</h3>
            <p className="text-xs text-emerald-300/90 max-w-md mx-auto">
              Your takedown report has been logged with tracking reference:{" "}
              <code className="text-white bg-zinc-800 px-2 py-0.5 rounded font-mono">{submittedId}</code>.
              Our designated compliance team has received the notice for expedited review.
            </p>
            <button
              onClick={() => {
                setSubmittedId(null);
                setFormData({
                  reporter_name: "",
                  reporter_email: "",
                  original_work_url: "",
                  target_url: "",
                  target_id: "",
                  description: "",
                  good_faith_statement: true,
                });
              }}
              className="mt-2 text-xs text-zinc-400 hover:text-white underline"
            >
              Submit another notice
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3 text-xs text-rose-300">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Full Legal Name of Copyright Owner or Agent *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Connor / Warner Music Group"
                  value={formData.reporter_name}
                  onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Contact Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="legal@rightsowner.com"
                  value={formData.reporter_email}
                  onChange={(e) => setFormData({ ...formData, reporter_email: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Infringing Clipforge URL or Clip ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://clipforge.ai/share/..."
                  value={formData.target_url}
                  onChange={(e) => setFormData({ ...formData, target_url: e.target.value, target_id: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  URL to Original Copyrighted Work (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={formData.original_work_url}
                  onChange={(e) => setFormData({ ...formData, original_work_url: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Description of Copyrighted Work & Infringement Details *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Describe the copyrighted work, exact timestamps of infringed footage or audio, and why the use is unauthorized..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={formData.good_faith_statement}
                  onChange={(e) => setFormData({ ...formData, good_faith_statement: e.target.checked })}
                  className="mt-0.5 rounded border-zinc-700 bg-zinc-800 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs text-zinc-300 leading-relaxed">
                  I state under penalty of perjury that I have a good faith belief that use of the material is not authorized by the copyright owner, its agent, or the law, and that the information in this notification is accurate.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-rose-600/20 hover:opacity-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>Transmitting Notice...</>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Submit Formal DMCA Notice
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Statutory DMCA Info */}
      <div className="space-y-6 text-xs text-zinc-400 border-t border-zinc-800 pt-8">
        <h3 className="text-sm font-semibold text-white">DMCA Statutory Requirements & Counter-Notice</h3>
        <p>
          Under 17 U.S.C. § 512(g), users whose clips are disabled under an erroneous DMCA notice may submit a written Counter-Notification containing their legal name, address, phone number, consent to federal jurisdiction, and affirmation under penalty of perjury that the material was removed by mistake or misidentification.
        </p>
        <p>
          Repeat Infringers: In accordance with statutory safe-harbor standards, ClipForge terminates accounts of repeat infringers under appropriate circumstances.
        </p>
      </div>
    </div>
  );
}
