import {
  CreditCard,
  MessageSquare,
  Wrench,
  FileBarChart,
} from "lucide-react";
import { agentActivities, type AgentActivity } from "../../lib/agent-activities";

const typeConfig: Record<
  AgentActivity["type"],
  { icon: typeof CreditCard; color: string; bg: string }
> = {
  incasso: { icon: CreditCard, color: "text-green-600", bg: "bg-green-100" },
  communicatie: { icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-100" },
  onderhoud: { icon: Wrench, color: "text-orange-600", bg: "bg-orange-100" },
  rapport: { icon: FileBarChart, color: "text-purple-600", bg: "bg-purple-100" },
};

const statusConfig: Record<AgentActivity["status"], { label: string; kleur: string }> = {
  voltooid: { label: "Voltooid", kleur: "bg-green-100 text-green-700" },
  in_uitvoering: { label: "In uitvoering", kleur: "bg-blue-100 text-blue-700" },
  gepland: { label: "Gepland", kleur: "bg-yellow-100 text-yellow-700" },
};

export function ActivityFeed() {
  return (
    <div className="rounded-xl border border-primary-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-primary mb-4">Recente activiteit</h3>
      <div className="space-y-4">
        {agentActivities.map((activity, index) => {
          const config = typeConfig[activity.type];
          const status = statusConfig[activity.status];
          const Icon = config.icon;

          return (
            <div key={activity.id} className="flex gap-3">
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${config.bg}`}
                >
                  <Icon size={14} className={config.color} />
                </div>
                {index < agentActivities.length - 1 && (
                  <div className="w-px flex-1 bg-primary-200 mt-1" />
                )}
              </div>

              {/* Content */}
              <div className="pb-4">
                <p className="text-sm text-primary leading-snug">
                  {activity.beschrijving}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-primary-400">{activity.tijdstip}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${status.kleur}`}
                  >
                    {status.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
