import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary-50 py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <p className="text-accent font-semibold mb-4 tracking-widest uppercase text-sm">
            Powered by VDM Nexus
          </p>
          <h1 className="text-5xl md:text-6xl font-extrabold text-primary leading-tight mb-6">
            De Parmentier.{" "}
            <span className="text-accent">Slimmer beheerd.</span>
          </h1>
          <p className="text-xl text-primary-600 mb-10 max-w-2xl">
            Drie AI agents draaien 24/7 voor gebouwbeheer: receptie,
            onderhoud en communicatie. Volledig geautomatiseerd,
            altijd beschikbaar.
          </p>
          <div className="flex gap-4">
            <Link
              href="#demos"
              className="inline-flex items-center px-8 py-4 bg-primary-900 text-white font-semibold rounded-lg hover:bg-primary-800 transition-colors"
            >
              Bekijk de demo&apos;s
            </Link>
            <Link
              href="https://vdmnexus.com"
              className="inline-flex items-center px-8 py-4 border border-primary-300 text-primary font-semibold rounded-lg hover:bg-primary-100 transition-colors"
            >
              Over VDM Nexus
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
