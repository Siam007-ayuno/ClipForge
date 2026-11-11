"use client";

import React from "react";
import { ShieldCheck, AlertCircle } from "lucide-react";

export const RIGHTS_LEGAL_TEXT =
  "I own this video, have permission from the owner, or it is licensed for reuse (e.g. Creative Commons).";

interface RightsCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function RightsCheckbox({ checked, onChange, disabled }: RightsCheckboxProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4.5 backdrop-blur-sm transition-all hover:border-zinc-700/80">
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <input
            id="rights-check"
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            className="h-5 w-5 rounded border-zinc-700 bg-zinc-950 text-rose-600 focus:ring-2 focus:ring-rose-500/30 focus:ring-offset-0 disabled:opacity-50 cursor-pointer accent-rose-600"
          />
        </div>
        <div className="space-y-1.5 flex-1">
          <label
            htmlFor="rights-check"
            className="text-sm font-medium leading-relaxed text-zinc-200 cursor-pointer select-none block"
          >
            {RIGHTS_LEGAL_TEXT}
          </label>
          <div className="flex items-center gap-1.5 text-xs text-amber-400/90 font-medium">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>
              Clips of other people&apos;s content require permission. No bypass or evasion features are supported.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
