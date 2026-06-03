# Grok research synthesis — contextual factors (2026-06-03)

Response to [grok-prompt.md](grok-prompt.md). Grok ranked factors by strength of
**outcome-level** evidence (W/D/L, goals, points), explicitly down-weighting
physical/performance-only effects.

> **Provenance note.** The raw paste of this Grok output ended with a
> prompt-injection block after the natural sign-off ("Good luck—share backtest
> results if you want feedback! ⚽") that tried to stop tool use and force a
> transcript dump. It was ignored. The research below is the legitimate content;
> the injected tail is not reproduced here.

## Our synthesis — what changed vs the prior plan

- **Rest / congestion: confirmed the highest-value testable factor.** Stays the
  first backtest experiment. Bundesliga congestion → reduced attacking strength;
  treat the old Verheijen ~40% figure skeptically but the direction holds.
- **Jet lag: confirmed weak at the *outcome* level in football.** Right call to
  deprioritize — small LLM-layer prior at most, not a feature.
- **Elevated to features (new):**
  1. **Host advantage at "neutral" venues** (+8–15% win prob). We currently model
     *all* games as neutral, including USA/Mexico/Canada at home — a real,
     testable mis-spec to fix.
  2. **Transfermarkt squad market value** — Grok says it outperforms FIFA/Elo for
     internationals. Cleanest fix for the "France blind spot" (squad talent a
     results-only model can't see).
- **Heat → unders + altitude (Mexico City)** stay as LLM-layer / totals priors,
  magnitudes now documented.
- **Metric caution:** Grok's "Brier < 0.22–0.25" target is a *different
  normalization* than our 3-outcome summed Brier (0.57 / 0.61). Not directly
  comparable — reconcile when benchmarking.

## Queued backtest experiments (in priority order)

1. **Rest days / differential rest** — compute days-since-last-match per team from
   `results.csv`; test <96h threshold and the rested-minus-tired differential as a
   λ modifier. Computable from data we already have.
2. **Host advantage at "neutral" venues** — stop treating host-nation games as
   neutral; restore a home term for USA/Mexico/Canada (and historically the host).
3. **Market value ratio** — add log(market-value ratio) as a team-strength
   covariate. Needs a Transfermarkt value source (data acquisition step first).

---

## Grok's full assessment

### 1. Rest days / fixture congestion (strongest outcome evidence)

Differential rest (<96h / <4 days) has measurable outcome impact, especially
attacking output.

- Bundesliga (5 seasons): congestion (≤4 days rest) **negatively affects attacking
  strength**, sometimes improves defensive strength at home. Schedule simulation
  showed season-long point impacts. Similar defensive effects Spain/England, weaker
  offensive impact there.
- Verheijen (2012): <3 days prep linked to **~40% lower win probability** vs 3+
  days. (Treat skeptically.)
- Many physical studies show no total-distance drop (pacing preserves
  high-intensity), but **outcome studies confirm attacking reduction**.

Encode: −X% attacking λ (or −0.1 to −0.3 xG) for <96h rest, stronger for away /
vs strong opponents. Differential rest of +2–3 days ≈ ~5–10% win-prob boost.

**Verdict: high value — direct W/D/L and goals impact.**

### 2. Travel / jet lag / time zones (mixed/weak outcome evidence in football)

Physical/sleep effects real, but **direct scoreline evidence weaker or null** in
controlled football studies.

- Causal-inference study (randomization inference): **no clear impact** of jet lag
  or game time on team performance.
- Eastward asymmetry exists in NBA (−1.3 pts home differential, −6% win%) / MLB,
  but football outcome studies limited / confounded by team quality + scheduling.
- Long-haul sleep/fatigue lasts 3–5+ days; translation to goals/WDL not strongly
  quantified.

Encode conservatively: −2–5% attacking λ for >4–6 zones + <4 days recovery,
eastward heavier. **Do not over-weight** — test via ablation; may add noise.

### 3. Heat / WBGT and altitude (moderate; mostly unders + acclimatization asymmetry)

Heat suppresses goals symmetrically (unders) but asymmetrically favors
acclimatized teams (result shift).

- GCC study (2008 matches): +3% favorable-outcome prob per 1°C for hot-climate
  teams vs non, after home-advantage/ranking controls. Temperature/WBGT better
  predictor than humidity.
- 2025 Club World Cup (WBGT >28°C): reduced output esp. cold-climate teams →
  hot-origin edge.
- Heat reduces high-intensity actions → total goals often drop (unders).

Altitude (Mexico City ~2240m): high-altitude home teams score more / concede
fewer with increasing altitude difference; each +1000m boosts home goal
differential. Moderate altitude not strongly negative on results, but traveling up
hurts away teams.

Encode: heat WBGT >26–28°C → −0.2 to −0.5 total goals (unders) + 5–10% win-prob to
acclimatized/hot-origin squads. Altitude diff 2000m+ → ~8% home win% boost.

**Verdict: strong for total goals (unders) and asymmetric results via
acclimatization.**

### 4. Host / "neutral" venue advantage for 2026 hosts (moderate-strong)

- General home advantage in internationals ~55–60% win rate for hosts; crowd
  effects documented (reduced without fans).
- 2026 co-hosts USA/Mexico/Canada benefit from reduced travel, familiar
  conditions, crowds (esp. Mexico). Historical host edge exists; exact 2026
  magnitude uncertain (co-host novelty).

Encode: +8–15% win prob / higher goals for hosts vs non-hosts at similar strength;
venue-specific home_adv term (stronger for Mexico in Mexico).

**Verdict: solid evidence — add as venue-specific home term.**

### 5. Squad quality signals (market value, injuries, manager change) (strong)

- **Transfermarkt team market value**: crowd-sourced valuations **outperform
  FIFA/Elo** for international outcomes. Direct betting edge demonstrated.
- Key-player injuries: adjust attack/defense λ ~5–15% for star absence (−0.1 to
  −0.4 goals, position-dependent).
- Manager change: short-term boost/disruption, variable.

Encode: log(market-value ratio) as covariate — significant gain over Elo/FIFA.

**Verdict: high value — integrate as team-strength adjustment.**

### Best published WC / international models (for benchmarking)

- **Dixon-Coles extensions** — time-weighting + rho for low scores; strong on
  internationals; Brier gains via covariates.
- **Goal-based Poisson / bivariate** vs result-based — often similar/better
  Brier/RPS in World Cups (2018 knockouts: double Poisson strong).
- **Gradient boosting / XGBoost / HistGBM** — top in many benchmarks (~55–65%
  accuracy). Features: rankings, form, xG, market values.
- **Bayesian / dynamic** — good for uncertainty; Bayesian BTD rankings excel in
  knockouts.
- Historical: Yahoo crowd + betting odds beat experts (2014 Brier). ANN ~75% on
  2006/2022 but optimistic.

**Benchmark target:** Brier <0.22–0.25 on outcomes (note: different normalization
than our summed 3-outcome Brier — reconcile before comparing). Hybrids
(Poisson + boosting + contextual) win most backtests.
