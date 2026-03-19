const stats = [
  { value: "3", label: "AI employees live" },
  { value: "24/7", label: "Beschikbaarheid" },
  { value: "<2s", label: "Gemiddelde responstijd" },
  { value: "6", label: "Custom skills actief" },
];

export function SocialProof() {
  return (
    <section className="py-24 bg-primary-100">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <p className="text-accent font-semibold text-xs uppercase tracking-widest">
              In productie
            </p>
          </div>
          <h2 className="text-3xl font-extrabold text-primary mb-4 tracking-tight">
            VDM Vastgoed draait op Nexus
          </h2>
          <p className="text-primary-500 max-w-lg mx-auto">
            Drie AI employees beheren een portefeuille van 5 panden en 10
            huurders. Huurincasso, onderhoud, communicatie, contractbeheer —
            volledig autonoom.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-4xl font-extrabold text-primary tracking-tight mb-1">
                {s.value}
              </p>
              <p className="text-sm text-primary-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
