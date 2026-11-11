import React from "react";
import Link from "next/link";
import { ShieldCheck, Scale, FileText, Flag, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950/80 backdrop-blur text-zinc-400 py-8 px-4 text-xs">
      <div className="container mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Rights Badge */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">ClipForge</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">Automated Video Intelligence</span>
          </div>
          <span className="hidden sm:inline text-zinc-700">•</span>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Strict Copyright Compliance & 30-Day Auto-Purge
          </div>
        </div>

        {/* Policy Links */}
        <div className="flex flex-wrap items-center justify-center gap-5">
          <Link
            href="/terms"
            className="hover:text-white transition-colors flex items-center gap-1"
          >
            <Scale className="h-3.5 w-3.5 text-zinc-500" />
            Terms of Service
          </Link>
          <Link
            href="/dmca"
            className="hover:text-white transition-colors flex items-center gap-1"
          >
            <FileText className="h-3.5 w-3.5 text-zinc-500" />
            DMCA & Takedown
          </Link>
          <Link
            href="/report"
            className="hover:text-rose-400 transition-colors flex items-center gap-1 text-zinc-400"
          >
            <Flag className="h-3.5 w-3.5 text-rose-500" />
            Report Content
          </Link>
          <a
            href="http://localhost:8000/api/v1/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors flex items-center gap-1"
          >
            <span>API Docs</span>
            <ExternalLink className="h-3 w-3 text-zinc-600" />
          </a>
        </div>
      </div>
      <div className="container mx-auto max-w-7xl mt-4 pt-4 border-t border-zinc-900 text-center text-[11px] text-zinc-500">
        © 2026 ClipForge AI. All rights reserved. Zero-tolerance policy against copyright evasion, speed manipulation, and unauthorized scraping.
      </div>
    </footer>
  );
}
