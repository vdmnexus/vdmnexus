import { Settings } from "lucide-react";

export default function InstellingenPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
          <Settings size={28} className="text-primary-400" />
        </div>
        <h2 className="text-xl font-semibold text-primary">Instellingen</h2>
        <p className="mt-2 text-sm text-primary-400">
          Binnenkort beschikbaar
        </p>
      </div>
    </div>
  );
}
