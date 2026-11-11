"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiAuth } from "../lib/api";
import { User } from "../types";
import { Scissors, PlusCircle, LogOut, User as UserIcon, Film } from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(apiAuth.getCurrentUser());
  }, []);

  const handleLogout = () => {
    apiAuth.logout();
    setUser(null);
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-white hover:opacity-90 transition-opacity">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-violet-600 shadow-md shadow-rose-500/20">
            <Scissors className="h-5 w-5 text-white stroke-[2.5]" />
          </div>
          <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Clip<span className="text-rose-500">Forge</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-3 md:gap-6">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Film className="h-4 w-4" />
                Projects
              </Link>
              <Link
                href="/projects/new"
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 px-3.5 py-1.5 text-xs md:text-sm font-semibold text-white shadow-sm transition-all"
              >
                <PlusCircle className="h-4 w-4" />
                New Project
              </Link>
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
                <span className="hidden sm:inline-block text-xs text-zinc-400 max-w-[140px] truncate">
                  {user.full_name || user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="rounded-lg p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-zinc-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-rose-600 hover:bg-rose-500 px-3.5 py-1.5 text-sm font-semibold text-white transition-all shadow-sm"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
