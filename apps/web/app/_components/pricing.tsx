import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: "€99",
    period: "/maand",
    description: "Voor makers die hun eerste AI employees willen bouwen en testen",
    features: [
      "2 AI employees",
      "5 pre-built skills",
      "Soul memory",
      "2.000 interacties/mnd",
      "1 LLM model",
      "Community support",
    ],
    cta: "Start met Starter",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "€299",
    period: "/maand",
    description: "Voor teams die AI employees op schaal willen inzetten",
    features: [
      "10 AI employees",
      "Custom skills builder",
      "Alle LLM modellen",
      "20.000 interacties/mnd",
      "Knowledge base uploads",
      "Alle kanalen",
      "Priority support",
    ],
    cta: "Start met Growth",
    highlighted: true,
  },
  {
    name: "Scale",
    price: "Custom",
    period: "",
    description: "Voor enterprises die het platform willen white-labelen of on-premise draaien",
    features: [
      "Alles in Growth",
      "Onbeperkt employees",
      "White-label opties",
      "Dedicated infra",
      "Custom skill development",
      "SLA + dedicated support",
    ],
    cta: "Neem contact op",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <p className="text-accent font-semibold text-xs uppercase tracking-widest">
              Pricing
            </p>
          </div>
          <h2 className="text-3xl font-extrabold text-primary mb-4 tracking-tight">
            Simpele, voorspelbare prijzen
          </h2>
          <p className="text-primary-500 max-w-md mx-auto">
            Inclusief interacties, infra en LLM kosten. Geen verrassingen.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 border ${
                plan.highlighted
                  ? "border-accent bg-primary-900 text-white ring-2 ring-accent"
                  : "border-primary-200 bg-white"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-accent">
                {plan.name}
              </p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                {plan.period && (
                  <span
                    className={
                      plan.highlighted ? "text-primary-400 text-sm" : "text-primary-400 text-sm"
                    }
                  >
                    {plan.period}
                  </span>
                )}
              </div>
              <p
                className={`text-sm mb-8 ${
                  plan.highlighted ? "text-primary-400" : "text-primary-500"
                }`}
              >
                {plan.description}
              </p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span className="text-accent">&#10003;</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="#waitlist"
                className={`block w-full text-center py-3.5 rounded-xl font-semibold transition-colors text-sm ${
                  plan.highlighted
                    ? "bg-accent text-white hover:bg-accent-600"
                    : "bg-primary-900 text-white hover:bg-primary-800"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
