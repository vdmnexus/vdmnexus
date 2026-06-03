# Grok research prompt — contextual factors for WC2026 match prediction

Prompt used to extract *bettable*, outcome-level research from Grok. It forces
effect sizes, citations, and the outcome-vs-performance distinction (the trap in
earlier answers: physical/running effects that don't move the scoreline).

```
I'm building a quantitative model to predict international football match
outcomes and price prop bets (match result / total goals / BTTS) for the
2026 World Cup, for value betting against market prices. My core is a
time-weighted Dixon-Coles / Poisson team-strength model fit on ~49k
historical internationals. I want to know which CONTEXTUAL factors are
worth adding, with evidence strong enough to bet on.

Critical framing: I care about effects on MATCH OUTCOME — win/draw/loss
probability and total goals scored — NOT physical/running performance.
Most sports-science papers measure distance covered, high-speed running,
or injury risk. Those are necessary but NOT sufficient: a factor that cuts
sprint distance but doesn't measurably shift the scoreline is useless to me.
For every claim, explicitly state whether the cited evidence is OUTCOME-level
(W/D/L, goals, points) or only PERFORMANCE-level (physical metrics), and give
a quantified effect size I could encode (e.g. "−X% win probability",
"−Y goals per match", "+Z% chance of under 2.5") with the study/source.

Cover these factors, ranked by strength of OUTCOME evidence:

1. Rest days / fixture congestion: effect on RESULT and on GOALS (not just
   fatigue). Is the <96h threshold visible in actual results? Differential
   rest (one team more rested than the other) — measured outcome impact?

2. Travel / jet lag / time zones: outcome evidence (not just sleep/wellness),
   eastward vs westward asymmetry, magnitude per time zone crossed, and any
   football-specific (vs NBA/MLB) result-level findings.

3. Heat / WBGT: separate the effect on TOTAL GOALS vs on WHO WINS. Does heat
   symmetrically suppress both teams (→ unders) or asymmetrically favor
   heat-acclimatized squads (→ shifts the result)? Quantify both. Altitude
   (e.g. Mexico City ~2240m) — effect on outcome and goals?

4. Host / "neutral" venue advantage: at a World Cup, how much does crowd
   support move the result for the three 2026 hosts (USA, Mexico, Canada)
   playing in their own country? Quantified.

5. Squad quality signals the strength model can't see from results alone:
   market value (Transfermarkt), key-player availability/injuries, manager
   change. Measured outcome impact and effect size.

Separately: list the best published World Cup / international match
prediction models (academic or well-documented), the exact features each
used, and their reported out-of-sample accuracy / Brier / RPS — so I can
benchmark. Prioritize peer-reviewed sources and give citations/links.

Be skeptical and quantitative. If a factor has real physical evidence but
weak or no OUTCOME evidence, say so plainly — that's the most useful thing
you can tell me.
```

Workflow when answers come back: each quantified, outcome-level claim becomes a
hypothesis run through the backtest (`backtest_wc.py`), rest-days first since it's
computable from `results.csv` alone. Performance-only claims get filed as
LLM-layer priors, not model parameters.
