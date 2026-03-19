import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-primary-50">
      {/* Topbar */}
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
          <Link href="/dashboard" className="text-primary-400 hover:text-primary transition-colors">
            Skills
          </Link>
          <Link href="/" className="text-primary-400 hover:text-primary transition-colors">
            Website
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
