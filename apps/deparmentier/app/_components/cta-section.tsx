import Link from "next/link";

export function CtaSection() {
  return (
    <section className="py-24 bg-primary-900">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Wil je dit ook voor jouw gebouw?
        </h2>
        <p className="text-primary-400 mb-8 max-w-lg mx-auto">
          VDM Nexus maakt het mogelijk om AI agents in te zetten voor elk
          type vastgoedbeheer. Van kantoorpanden tot wooncomplexen.
        </p>
        <Link
          href="https://vdmnexus.com/#waitlist"
          className="inline-flex items-center px-8 py-4 bg-accent text-white font-semibold rounded-lg hover:bg-accent-600 transition-colors"
        >
          Meld je aan voor de waitlist
        </Link>
      </div>
    </section>
  );
}
