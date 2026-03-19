const promptGroepen = [
  {
    label: "Incasso",
    prompts: ["Welke facturen staan open?", "Stuur herinneringen"],
  },
  {
    label: "Onderhoud",
    prompts: ["Openstaande onderhoudstickets?", "Maak een melding aan"],
  },
  {
    label: "Communicatie",
    prompts: ["Schrijf een bericht", "Recente communicaties?"],
  },
  {
    label: "Rapportage",
    prompts: ["Dagrapportage", "Bezettingsgraad?"],
  },
];

export function SuggestedPrompts({
  onSelect,
}: {
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="w-full space-y-3">
      {promptGroepen.map((groep) => (
        <div key={groep.label}>
          <p className="text-xs font-medium text-primary-400 mb-1.5">{groep.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {groep.prompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => onSelect(prompt)}
                className="rounded-full border border-primary-200 bg-white px-3 py-1.5 text-xs text-primary-600 transition-colors hover:border-accent hover:text-accent hover:bg-accent/5"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
