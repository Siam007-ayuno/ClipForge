import React from "react";
import Link from "next/link";
import { ShieldAlert, FileText, CheckCircle, AlertTriangle, ArrowLeft, Scale, Lock, RefreshCw } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 text-zinc-300 space-y-10">
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
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Terms of Service & Acceptable Use</h1>
            <p className="text-sm text-zinc-400 mt-0.5">Last updated: November 2026 • Effective immediately</p>
          </div>
        </div>
      </div>

      {/* Strict Anti-Evasion Callout Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 space-y-3">
        <div className="flex items-center gap-2.5 text-amber-400 font-semibold text-base">
          <ShieldAlert className="h-5 w-5 flex-shrink-0" />
          Strict Zero-Tolerance Policy: No Copyright Evasion
        </div>
        <p className="text-sm text-amber-200/90 leading-relaxed">
          ClipForge is built for legitimate content creators, podcasters, educators, and authorized marketing teams.{" "}
          <strong className="text-white">
            We strictly prohibit and do not provide any mechanisms for bypassing Content ID or automated copyright fingerprinting
          </strong>{" "}
          (including audio pitch shifting, speed modulation, visual flipping/mirroring, or noise evasion filters).
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-8 text-sm leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-rose-400">1</span>
            Content Ownership & User Representations
          </h2>
          <p>
            By uploading, importing, or processing any video content on ClipForge, you represent and warrant that:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-zinc-400">
            <li>You are the original creator and exclusive copyright holder of the ingested footage, OR</li>
            <li>You possess explicit written permission, authorization, or commercial license from the rights holder, OR</li>
            <li>The content is published under an open license (such as Creative Commons CC-BY) authorizing derivative short-form adaptations.</li>
          </ul>
          <p className="text-zinc-400">
            You agree to defend, indemnify, and hold harmless ClipForge against any third-party claims, liabilities, or damages arising from content you upload or distribute.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-rose-400">2</span>
            Prohibited Activities
          </h2>
          <p>Users may NOT use ClipForge to:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-1">
              <p className="font-semibold text-white text-xs">Piracy & Unauthorized Syndication</p>
              <p className="text-xs text-zinc-400">Republishing movies, pay-per-view broadcasts, or creator videos without affirmative license.</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-1">
              <p className="font-semibold text-white text-xs">Circumvention of Rights Protection</p>
              <p className="text-xs text-zinc-400">Attempting to spoof metadata, alter acoustic fingerprints, or dodge YouTube Content ID.</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-1">
              <p className="font-semibold text-white text-xs">Harassment & Defamation</p>
              <p className="text-xs text-zinc-400">Distorting statements out of context to defame, harass, or mislead audiences about any individual.</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-1">
              <p className="font-semibold text-white text-xs">Automated Abuse & Scraping</p>
              <p className="text-xs text-zinc-400">Flooding the transcription or rendering workers beyond rate limits or scraping platform data.</p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-rose-400">3</span>
            30-Day Storage & Data Retention Policy
          </h2>
          <p>
            To conserve infrastructure and protect privacy:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-zinc-400">
            <li>
              <strong className="text-white">Raw Source Videos:</strong> Source video files imported or uploaded are retained for <strong className="text-white">30 calendar days</strong>. After 30 days, source files are permanently deleted via automated cleanup jobs.
            </li>
            <li>
              <strong className="text-white">Generated Short Clips:</strong> Rendered clips remain stored in your workspace until you manually delete them or close your account.
            </li>
            <li>
              <strong className="text-white">Temporary Share Links:</strong> Public preview share links expire automatically after <strong className="text-white">7 days</strong>.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-rose-400">4</span>
            DMCA Compliance & Repeat Infringer Policy
          </h2>
          <p>
            ClipForge complies with the Digital Millennium Copyright Act (17 U.S.C. § 512). We respond expeditiously to verified notices of alleged infringement. Upon receiving a compliant takedown notice, we immediately disable access to the disputed clip or project.
          </p>
          <p className="text-zinc-400">
            In accordance with the DMCA, ClipForge maintains a repeat infringer policy terminating account privileges for users who repeatedly infringe copyright.
          </p>
          <div className="pt-2 flex flex-wrap gap-4">
            <Link
              href="/dmca"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-xs font-semibold text-white transition-all border border-zinc-700"
            >
              <FileText className="h-4 w-4 text-rose-400" />
              View DMCA & Copyright Policy
            </Link>
            <Link
              href="/report"
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 px-4 py-2 text-xs font-semibold transition-all"
            >
              <ShieldAlert className="h-4 w-4" />
              Report Infringing Content
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
