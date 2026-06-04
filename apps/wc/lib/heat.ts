// Display-only heat context for the 16 host cities.
//
// IMPORTANT: this is NOT a model input. Heat was backtested as both a symmetric
// and a differential covariate on USA '94 + Brazil '14 and failed the gate
// (see agents/polymarket/PIPELINE.md and the methodology page). The badge below
// is purely informational venue context — typical afternoon-kickoff highs for
// the Jun 11 – Jul 19 window — and never touches scores.json or the simulation.
//
// Threshold of 28 °C follows Climate Central's World Cup heat analysis:
// https://www.climatecentral.org/climate-matters/world-cup-matches

const VENUE_TEMP_C: Record<string, number> = {
  Monterrey: 35,
  Dallas: 35,
  Houston: 34,
  Miami: 32,
  Atlanta: 31,
  "Kansas City": 31,
  Philadelphia: 30,
  Guadalajara: 28,
  "New York New Jersey": 28,
  Boston: 26,
  Toronto: 26,
  "Los Angeles": 26,
  "San Francisco Bay Area": 24,
  "Mexico City": 24,
  Seattle: 22,
  Vancouver: 21,
};

export const CLIMATE_CENTRAL_URL =
  "https://www.climatecentral.org/climate-matters/world-cup-matches";

export type HeatTier = "extreme" | "high";

export type HeatContext = {
  tempC: number;
  tier: HeatTier;
  label: string;
};

// Returns null below the 28 °C threshold (no badge) or for unknown cities.
export function heatContext(city: string): HeatContext | null {
  const tempC = VENUE_TEMP_C[city];
  if (tempC === undefined || tempC < 28) return null;
  const tier: HeatTier = tempC >= 32 ? "extreme" : "high";
  return {
    tempC,
    tier,
    label: tier === "extreme" ? "Extreme heat" : "High heat",
  };
}
