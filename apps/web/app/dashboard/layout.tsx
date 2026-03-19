"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, logout, type User } from "../../lib/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.push("/login");
    } else {
      setUser(u);
    }
    setChecked(true);
  }, [router]);

  if (!checked || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50">
      <header className="flex h-14 items-center justify-between border-b border-primary-200 bg-white px-6">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-900">
            <span className="text-xs font-bold text-white">N</span>
          </div>
          <span className="text-sm font-semibold text-primary">VDM Nexus</span>
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/dashboard" className="text-primary-500 hover:text-primary transition-colors">
            Employees
          </Link>
          <span className="text-xs text-primary-400">{user.email}</span>
          <button
            onClick={logout}
            className="text-xs text-primary-400 hover:text-red-500 transition-colors"
          >
            Uitloggen
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
