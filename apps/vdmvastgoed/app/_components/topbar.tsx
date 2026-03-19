"use client";

import { Building2, Settings, Bot } from "lucide-react";
import Link from "next/link";

export function Topbar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-primary-200 bg-white px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-2">
        <Building2 size={20} className="text-primary-600" />
        <span className="text-sm font-semibold text-primary">VDM Vastgoed</span>
      </Link>

      <div className="flex items-center gap-1.5">
        <Bot size={14} className="text-primary-400" />
        <span className="text-xs font-medium text-primary-500 hidden sm:inline">Nexus Agent</span>
        <span className="relative flex h-1.5 w-1.5 ml-1">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
        </span>
      </div>

      <Link
        href="/instellingen"
        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-primary-100"
      >
        <Settings size={16} className="text-primary-400" />
      </Link>
    </header>
  );
}
