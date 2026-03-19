"use client";

import { useReducer } from "react";
import { onderhoudTickets, type Ticket } from "./mock-data";

type State = {
  phase: "idle" | "thinking" | "responding" | "complete";
  tickets: Ticket[];
  selectedTicket: string | null;
};

type Action =
  | { type: "SELECT"; id: string }
  | { type: "UPDATE_STATUS"; id: string; status: Ticket["status"] }
  | { type: "THINKING" }
  | { type: "DONE" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SELECT":
      return { ...state, selectedTicket: action.id };
    case "THINKING":
      return { ...state, phase: "thinking" };
    case "UPDATE_STATUS":
      return {
        ...state,
        phase: "responding",
        tickets: state.tickets.map((t) =>
          t.id === action.id ? { ...t, status: action.status } : t
        ),
      };
    case "DONE":
      return { ...state, phase: "complete" };
    default:
      return state;
  }
}

const priorityColors = {
  laag: "bg-blue-50 text-blue-700",
  gemiddeld: "bg-amber-50 text-amber-700",
  hoog: "bg-orange-50 text-orange-700",
  urgent: "bg-red-50 text-red-700",
};

const statusColors = {
  gemeld: "bg-primary-100 text-primary-600",
  in_behandeling: "bg-amber-50 text-amber-700",
  opgelost: "bg-accent-50 text-accent-700",
};

const statusLabels = {
  gemeld: "Gemeld",
  in_behandeling: "In behandeling",
  opgelost: "Opgelost",
};

const nextStatus: Record<Ticket["status"], Ticket["status"] | null> = {
  gemeld: "in_behandeling",
  in_behandeling: "opgelost",
  opgelost: null,
};

export function OnderhoudDemo() {
  const [state, dispatch] = useReducer(reducer, {
    phase: "idle",
    tickets: onderhoudTickets,
    selectedTicket: null,
  });

  function handleAdvance(id: string, currentStatus: Ticket["status"]) {
    const next = nextStatus[currentStatus];
    if (!next) return;

    dispatch({ type: "THINKING" });
    setTimeout(() => {
      dispatch({ type: "UPDATE_STATUS", id, status: next });
      setTimeout(() => dispatch({ type: "DONE" }), 300);
    }, 1000);
  }

  const selected = state.tickets.find((t) => t.id === state.selectedTicket);

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {state.tickets.map((ticket) => (
          <button
            key={ticket.id}
            onClick={() => dispatch({ type: "SELECT", id: ticket.id })}
            className={`w-full text-left p-4 rounded-xl border transition-all ${
              state.selectedTicket === ticket.id
                ? "border-accent bg-accent-50"
                : "border-primary-200 bg-white hover:border-primary-300"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-primary text-sm truncate">
                  {ticket.id}: {ticket.title}
                </p>
                <p className="text-white0 text-xs mt-1">
                  {ticket.location}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    priorityColors[ticket.priority]
                  }`}
                >
                  {ticket.priority}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    statusColors[ticket.status]
                  }`}
                >
                  {statusLabels[ticket.status]}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="bg-white rounded-xl p-5 border border-primary-200">
          <h4 className="font-semibold text-primary mb-2">{selected.title}</h4>
          <p className="text-primary-600 text-sm mb-4">
            {selected.description}
          </p>
          <div className="flex items-center gap-4 text-xs text-white0 mb-4">
            <span>Locatie: {selected.location}</span>
            <span>
              Gemeld:{" "}
              {new Date(selected.reportedAt).toLocaleDateString("nl-NL")}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {(["gemeld", "in_behandeling", "opgelost"] as const).map(
                (s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        (["gemeld", "in_behandeling", "opgelost"] as const).indexOf(
                          selected.status
                        ) >= i
                          ? "bg-accent"
                          : "bg-primary-200"
                      }`}
                    />
                    {i < 2 && (
                      <div
                        className={`w-8 h-0.5 ${
                          (["gemeld", "in_behandeling", "opgelost"] as const).indexOf(
                            selected.status
                          ) > i
                            ? "bg-accent"
                            : "bg-primary-200"
                        }`}
                      />
                    )}
                  </div>
                )
              )}
            </div>
            <span className="text-xs text-white0 ml-2">
              {statusLabels[selected.status]}
            </span>
          </div>

          {nextStatus[selected.status] && (
            <button
              onClick={() => handleAdvance(selected.id, selected.status)}
              disabled={state.phase === "thinking"}
              className="mt-4 px-4 py-2 bg-primary-900 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50"
            >
              {state.phase === "thinking"
                ? "Agent verwerkt..."
                : `Verplaats naar: ${statusLabels[nextStatus[selected.status]!]}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
