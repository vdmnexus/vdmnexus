export function Footer() {
  return (
    <footer className="bg-primary-900 border-t border-primary-800 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <p className="text-white font-bold text-lg">De Parmentier</p>
            <p className="text-white0 text-sm">
              AI-Powered Gebouwbeheer — by{" "}
              <a
                href="https://vdmnexus.com"
                className="text-accent hover:underline"
              >
                VDM Nexus
              </a>
            </p>
          </div>
          <p className="text-primary-600 text-sm">
            &copy; {new Date().getFullYear()} VDM Nexus. Alle rechten
            voorbehouden.
          </p>
        </div>
      </div>
    </footer>
  );
}
