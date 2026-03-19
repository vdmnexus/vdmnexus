import Link from "next/link";

export function Navbar() {
  return (
    <nav className="flex items-center justify-between px-6 sm:px-20 py-6">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-900">
          <span className="text-sm font-bold text-white">N</span>
        </div>
        <span className="text-base font-semibold text-primary">VDM Nexus</span>
      </Link>
      <div className="hidden sm:flex items-center gap-8">
        <Link href="#features" className="text-sm text-primary-500 hover:text-primary transition-colors">
          Features
        </Link>
        <Link href="#pricing" className="text-sm text-primary-500 hover:text-primary transition-colors">
          Pricing
        </Link>
        <Link
          href="https://deparmentier.vdmnexus.com"
          className="text-sm text-primary-500 hover:text-primary transition-colors"
        >
          Demo
        </Link>
        <Link
          href="#waitlist"
          className="inline-flex items-center px-5 py-2.5 bg-primary-900 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors"
        >
          Join Waitlist
        </Link>
      </div>
    </nav>
  );
}
