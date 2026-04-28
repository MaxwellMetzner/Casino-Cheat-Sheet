"use client";

import { useState } from "react";
import {
  BACCARAT_RULE_NOTES,
  BACCARAT_WAGERS,
  type RouletteComparisonRow,
  buildBaccaratBetMetricsTable,
  buildBankerDrawTable,
  buildCrapsBetMetrics,
  buildRouletteComparison,
  analyzeRouletteBets,
  casinoCatalog,
  CRAPS_ROLL_DISTRIBUTION,
  explainBaccaratDecision,
  resolveCrapsRoll,
  ROULETTE_RULES,
  type CrapsBet,
  type CrapsPhase,
  type CrapsPoint,
  type RouletteKind,
  type RoulettePlacedBet,
} from "casino-engine";
import {
  formatPercent,
  formatUnits,
  GamePageShell,
  PageSection,
} from "../casino-page-helpers";
import { DiceRollField, FieldLabel, HelpHint, ToggleField } from "../input-primitives";
import { RouletteBoardStage } from "../roulette-board-stage";
import styles from "../casino-dashboard.module.css";

interface CrapsScenarioOptions {
  phase: CrapsPhase;
  point: CrapsPoint;
  includePass: boolean;
  includeDontPass: boolean;
  includePassOdds: boolean;
  includeDontPassOdds: boolean;
  includeField: boolean;
  includeTravelCome: boolean;
  includeTravelDontCome: boolean;
  includeSettledCome: boolean;
  settledComePoint: CrapsPoint;
  includeSettledDontCome: boolean;
  settledDontComePoint: CrapsPoint;
  includeComeOdds: boolean;
  includeDontComeOdds: boolean;
  includePlace6: boolean;
  includePlace8: boolean;
  includeBuy4: boolean;
  includeHard8: boolean;
}

const GAME_BY_SLUG = Object.fromEntries(
  casinoCatalog.map((game) => [game.slug, game]),
);
const bankerDrawTable = buildBankerDrawTable();
const baccaratMetrics = buildBaccaratBetMetricsTable();
const crapsMetrics = buildCrapsBetMetrics();
const pointOptions: CrapsPoint[] = [4, 5, 6, 8, 9, 10];
const CRAPS_BET_HINTS: Record<string, string> = {
  includePass: "Wins on 7 or 11 on the come-out, then wins by making the point before a 7.",
  includeDontPass: "Wins on 2 or 3 on the come-out, pushes on 12, then wins if 7 appears before the point.",
  includePassOdds: "True-odds backing bet behind a Pass Line wager after a point is set.",
  includeDontPassOdds: "True-odds lay bet behind a Don't Pass wager after a point is set.",
  includeField: "One-roll wager covering 2, 3, 4, 9, 10, 11, and 12.",
  includeTravelCome: "Come bet before it has traveled to a point number.",
  includeTravelDontCome: "Don't Come bet before it has traveled behind a point.",
  includeSettledCome: "Come bet that has already moved to the selected point number.",
  includeSettledDontCome: "Don't Come bet that has already moved behind the selected point number.",
  includeComeOdds: "Odds attached to the settled Come bet on its point.",
  includeDontComeOdds: "Odds attached to the settled Don't Come bet on its point.",
  includePlace6: "Direct place bet on the 6, paid if 6 arrives before 7.",
  includePlace8: "Direct place bet on the 8, paid if 8 arrives before 7.",
  includeBuy4: "Buy bet on the 4 using true odds with commission built into the EV.",
  includeHard8: "Hardway bet that wins only on 4-4 before a 7 or easy 8.",
};

function buildCrapsScenario(options: CrapsScenarioOptions) {
  const bets: CrapsBet[] = [];

  if (options.includePass) bets.push({ id: "pass", label: "Pass line", kind: "pass", amount: 1 });
  if (options.includeDontPass) bets.push({ id: "dont-pass", label: "Don't Pass", kind: "dontPass", amount: 1 });
  if (options.includePassOdds) bets.push({ id: "pass-odds", label: "Pass odds", kind: "passOdds", amount: 1 });
  if (options.includeDontPassOdds) bets.push({ id: "dont-pass-odds", label: "Don't Pass odds", kind: "dontPassOdds", amount: 1 });
  if (options.includeField) bets.push({ id: "field", label: "Field", kind: "field", amount: 1 });
  if (options.includeTravelCome) bets.push({ id: "travel-come", label: "Come", kind: "come", amount: 1 });
  if (options.includeTravelDontCome) bets.push({ id: "travel-dont-come", label: "Don't Come", kind: "dontCome", amount: 1 });
  if (options.includeSettledCome) {
    bets.push({
      id: "settled-come",
      label: `Come on ${options.settledComePoint}`,
      kind: "come",
      amount: 1,
      point: options.settledComePoint,
    });
  }
  if (options.includeSettledDontCome) {
    bets.push({
      id: "settled-dont-come",
      label: `Don't Come on ${options.settledDontComePoint}`,
      kind: "dontCome",
      amount: 1,
      point: options.settledDontComePoint,
    });
  }
  if (options.includeComeOdds && options.includeSettledCome) {
    bets.push({
      id: "come-odds",
      label: `Come odds on ${options.settledComePoint}`,
      kind: "comeOdds",
      amount: 1,
      point: options.settledComePoint,
    });
  }
  if (options.includeDontComeOdds && options.includeSettledDontCome) {
    bets.push({
      id: "dont-come-odds",
      label: `Don't Come odds on ${options.settledDontComePoint}`,
      kind: "dontComeOdds",
      amount: 1,
      point: options.settledDontComePoint,
    });
  }
  if (options.includePlace6) bets.push({ id: "place-6", label: "Place 6", kind: "place6", amount: 1 });
  if (options.includePlace8) bets.push({ id: "place-8", label: "Place 8", kind: "place8", amount: 1 });
  if (options.includeBuy4) bets.push({ id: "buy-4", label: "Buy 4", kind: "buy4", amount: 1 });
  if (options.includeHard8) bets.push({ id: "hard-8", label: "Hard 8", kind: "hard8", amount: 1 });

  return {
    phase: options.phase,
    point: options.phase === "point" ? options.point : undefined,
    bets,
  };
}

export function RoulettePage() {
  const game = GAME_BY_SLUG.roulette;
  const [rouletteKind, setRouletteKind] = useState<RouletteKind>("european");
  const [bets, setBets] = useState<RoulettePlacedBet[]>([]);
  const rouletteTable = buildRouletteComparison(rouletteKind);
  const merged = analyzeRouletteBets(rouletteKind, bets);
  const referenceRows = rouletteTable.filter((row) => row.key !== "firstFiveAmerican");
  const topLineRow = rouletteTable.find((row) => row.key === "firstFiveAmerican") ?? null;

  function stakeForBet(id: string) {
    return bets.find((bet) => bet.id === id)?.stake ?? 0;
  }

  function addChip(nextBet: RoulettePlacedBet) {
    setBets((current) => {
      const existing = current.find((bet) => bet.id === nextBet.id);

      if (!existing) {
        return [...current, nextBet];
      }

      return current.map((bet) => bet.id === nextBet.id
        ? { ...bet, stake: Number((bet.stake + nextBet.stake).toFixed(2)) }
        : bet);
    });
  }

  function removeChip(id: string, amount = 1) {
    setBets((current) => current.flatMap((bet) => {
      if (bet.id !== id) {
        return [bet];
      }

      const nextStake = Number((bet.stake - amount).toFixed(2));
      return nextStake > 0 ? [{ ...bet, stake: nextStake }] : [];
    }));
  }

  function updateStake(id: string, nextStake: number) {
    setBets((current) => current.map((bet) => bet.id === id
      ? { ...bet, stake: Number.isFinite(nextStake) && nextStake > 0 ? nextStake : bet.stake }
      : bet));
  }

  function handleRouletteKindChange(nextKind: RouletteKind) {
    setRouletteKind(nextKind);

    if (nextKind === "american") {
      return;
    }
    setBets((current) => current.filter((bet) => !bet.pockets.includes("00") && bet.betKey !== "firstFiveAmerican"));
  }

  return (
    <GamePageShell
      game={game}
      helper={<p className={styles.dashboardHelper}>Build a full layout bet, edit individual stake sizes, and see the combined positive-outcome rate instead of a single generic bet family.</p>}
    >
      <PageSection
        eyebrow="Rules"
        title="Wheel math"
        description="Every roulette wager is just a set of covered pockets and a posted payout. The wheel size determines the rest."
      >
        <div className={styles.contentStack}>
          <div className={styles.segmentedControl}>
            {(["european", "american"] as RouletteKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                className={`${styles.segmentButton} ${rouletteKind === kind ? styles.segmentButtonActive : ""}`}
                onClick={() => handleRouletteKindChange(kind)}
              >
                {ROULETTE_RULES[kind].label}
              </button>
            ))}
          </div>
          <p>{ROULETTE_RULES[rouletteKind].note}</p>
          <ul className={styles.bulletList}>
            <li>European wheels use 37 pockets and keep the standard layout payouts.</li>
            <li>American wheels add 00, which raises the base edge on most wagers to 5.26%.</li>
            <li>The American 0-00-1-2-3 top line remains a separate outlier with a worse edge than the rest of the layout.</li>
          </ul>
        </div>
      </PageSection>

      <PageSection
        eyebrow="Reference"
        title="Single-bet odds table"
        description="This stays as the quick reference view. The analyzer below is where multiple simultaneous bets get merged into one exact profile."
      >
        <div className={styles.contentStack}>
          <div className={styles.fieldLabelHeader}>
            <span className={styles.cardStatusText}>How to read EV and net result</span>
            <HelpHint
              label="How EV and net result work"
              text="EV per unit is the average profit or loss on a 1-unit bet over many spins. In the merged layout analyzer below, net result means the realized profit on a specific landing pocket after subtracting every losing chip and paying each winning bet at payout-to-1 odds."
            />
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Bet</th>
                  <th>Payout</th>
                  <th>Win rate</th>
                  <th>EV / unit</th>
                  <th>House edge</th>
                </tr>
              </thead>
              <tbody>
                {referenceRows.map((row) => (
                  <tr key={row.key}>
                    <td>
                      <strong>{row.label}</strong>
                      <span>{row.description}</span>
                    </td>
                    <td>{row.payoutToOne}:1</td>
                    <td>{formatPercent(row.pWin)}</td>
                    <td>{formatUnits(row.evPerUnit)}</td>
                    <td>{formatPercent(row.houseEdge)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {topLineRow ? <AmericanTopLineNote row={topLineRow} /> : null}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Analyzer"
        title="Build a full roulette layout wager"
        description="Use the printed board itself to place chips on straight-ups, splits, corners, streets, six-lines, and outside bets, then fine-tune stake sizes in the active list."
      >
        <div className={styles.contentStack}>
          <p className={styles.helperText}>Click directly on the printed board to drop a 1u chip. Hover reveals the active hit area, right click removes a chip, and exact stake sizes can still be edited in the active bets list below.</p>

          <div className={styles.rouletteBoardCanvasShell}>
            <RouletteBoardStage
              rouletteKind={rouletteKind}
              stakeForBet={stakeForBet}
              addChip={addChip}
              removeChip={removeChip}
            />
          </div>

          <div className={styles.actionRow}>
            <button type="button" className={styles.actionButton} onClick={() => setBets([])} disabled={bets.length === 0}>
              Clear layout
            </button>
          </div>

          <div className={styles.metricGrid}>
            <div className={styles.metricCard}>
              <span>Total stake</span>
              <strong>{merged.totalStake.toFixed(2)}u</strong>
              <small>{bets.length} active bet(s)</small>
            </div>
            <div className={styles.metricCard}>
              <span>Positive outcome rate</span>
              <strong>{formatPercent(merged.winProbability)}</strong>
              <small>Any hit: {formatPercent(merged.anyHitProbability)}</small>
            </div>
            <div className={styles.metricCard}>
              <span>EV / unit</span>
              <strong>{formatUnits(merged.evPerUnit)}</strong>
              <small>Expected net: {formatUnits(merged.expectedNet)}</small>
            </div>
            <div className={styles.metricCard}>
              <span>House edge</span>
              <strong>{formatPercent(merged.houseEdge)}</strong>
              <small>Push rate: {formatPercent(merged.pushProbability)}</small>
            </div>
          </div>

          {bets.length > 0 ? (
            <div className={styles.contentStack}>
              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Active bet</th>
                      <th>Stake</th>
                      <th>Payout</th>
                      <th>Coverage</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bets.map((bet) => (
                      <tr key={bet.id}>
                        <td>
                          <strong>{bet.label}</strong>
                          <span>{bet.description}</span>
                        </td>
                        <td>
                          <input
                            className={styles.stakeInput}
                            type="number"
                            min={0.1}
                            step={0.1}
                            aria-label={`Stake for ${bet.label}`}
                            value={bet.stake}
                            onChange={(event) => updateStake(bet.id, Number(event.target.value))}
                          />
                        </td>
                        <td>{bet.payoutToOne}:1</td>
                        <td>{bet.pockets.join(", ")}</td>
                        <td>
                          <button type="button" className={styles.inlineAction} onClick={() => setBets((current) => current.filter((entry) => entry.id !== bet.id))}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Pocket</th>
                      <th>
                        <span className={styles.fieldLabelHeader}>
                          <span>Net result</span>
                          <HelpHint label="Net result explanation" text="Profit on that exact landing pocket after subtracting every losing chip and paying any winning bets at payout-to-1 odds. It does not include returning the winning chip itself." />
                        </span>
                      </th>
                      <th>Outcome rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {merged.outcomes
                      .filter((outcome) => outcome.net >= 0 || outcome.winningBetIds.length > 0)
                      .sort((left, right) => right.net - left.net)
                      .map((outcome) => (
                        <tr key={outcome.pocket}>
                          <td>{outcome.pocket}</td>
                          <td>{formatUnits(outcome.net)}</td>
                          <td>{formatPercent(outcome.probability)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className={styles.helperText}>Start by clicking a number or adding a common layout bet.</p>
          )}
        </div>
      </PageSection>
    </GamePageShell>
  );
}

export function BaccaratPage() {
  const game = GAME_BY_SLUG.baccarat;
  const [playerTotal, setPlayerTotal] = useState(4);
  const [bankerTotal, setBankerTotal] = useState(5);
  const [playerThirdCard, setPlayerThirdCard] = useState(6);
  const baccaratDecision = explainBaccaratDecision(
    playerTotal,
    bankerTotal,
    playerTotal <= 5 && playerTotal < 8 && bankerTotal < 8 ? playerThirdCard : null,
  );

  return (
    <GamePageShell game={game}>
      <PageSection
        eyebrow="Rules"
        title="Third-card rules"
        description="Baccarat stays deterministic once the two-card totals and the Player third card are known."
      >
        <div className={styles.contentStack}>
          <p>{game.rulesFocus}</p>
          <ul className={styles.bulletList}>
            {BACCARAT_RULE_NOTES.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
      </PageSection>

      <PageSection
        eyebrow="Analyzer"
        title="Explain the next baccarat draw decision"
        description="The controls and wager reference are compressed so the draw matrix stays in view."
      >
        <div className={styles.contentStack}>
          <div className={styles.controlGridWide}>
            <FieldLabel label="Player total" hint="The Player hand total modulo 10 after the first two cards.">
              <select aria-label="Player total" value={playerTotal} onChange={(event) => setPlayerTotal(Number(event.target.value))}>
                {Array.from({ length: 10 }, (_, total) => <option key={total} value={total}>{total}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Banker total" hint="The Banker hand total modulo 10 after the first two cards.">
              <select aria-label="Banker total" value={bankerTotal} onChange={(event) => setBankerTotal(Number(event.target.value))}>
                {Array.from({ length: 10 }, (_, total) => <option key={total} value={total}>{total}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Player third card" hint="Only matters when the Player rule calls for a draw. The Banker rule can depend on this value.">
              <select
                aria-label="Player third card"
                value={playerThirdCard}
                onChange={(event) => setPlayerThirdCard(Number(event.target.value))}
                disabled={!(playerTotal <= 5 && playerTotal < 8 && bankerTotal < 8)}
              >
                {Array.from({ length: 10 }, (_, total) => <option key={total} value={total}>{total}</option>)}
              </select>
            </FieldLabel>
            <div className={styles.metricCard}>
              <span>Current branch</span>
              <strong>{baccaratDecision.naturalStopsRound ? "Natural stop" : baccaratDecision.playerDraws ? "Player draws" : "Player stands"}</strong>
              <small>{baccaratDecision.playerInstruction}</small>
              <small>{baccaratDecision.bankerInstruction}</small>
            </div>
          </div>

          <div className={styles.metricGrid}>
            {baccaratMetrics.map((metric) => (
              <div className={styles.metricCard} key={metric.key}>
                <span>{metric.label}</span>
                <strong>{BACCARAT_WAGERS.find((wager) => wager.key === metric.key)?.payout}</strong>
                <small>{formatPercent(metric.winProbability)} win / {formatPercent(metric.pushProbability)} push</small>
                <small>EV {formatUnits(metric.evPerUnit)} | Edge {formatPercent(metric.houseEdge)}</small>
              </div>
            ))}
          </div>

          <div className={styles.metricGrid}>
            <div className={styles.metricCard}>
              <span>Natural stop</span>
              <strong>{baccaratDecision.naturalStopsRound ? "Yes" : "No"}</strong>
              <small>Any two-card 8 or 9 ends the round immediately.</small>
            </div>
            <div className={styles.metricCard}>
              <span>Player rule</span>
              <strong>{baccaratDecision.playerDraws ? "Draw" : "Stand"}</strong>
              <small>{baccaratDecision.playerInstruction}</small>
            </div>
            <div className={styles.metricCard}>
              <span>Banker rule</span>
              <strong>{baccaratDecision.bankerDraws === null ? "Needs card" : baccaratDecision.bankerDraws ? "Draw" : "Stand"}</strong>
              <small>{baccaratDecision.bankerInstruction}</small>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.matrixTable}>
              <thead>
                <tr>
                  <th>Bank total</th>
                  <th>Player stands</th>
                  {Array.from({ length: 10 }, (_, total) => <th key={total}>P3 {total}</th>)}
                </tr>
              </thead>
              <tbody>
                {bankerDrawTable.map((row) => (
                  <tr key={row.bankerTotal} className={row.bankerTotal === bankerTotal ? styles.highlightRow : ""}>
                    <td>{row.bankerTotal}</td>
                    <td>{row.playerStands ? "Draw" : "Stand"}</td>
                    {row.byPlayerThirdCard.map((entry) => (
                      <td key={entry.playerThirdCard} className={row.bankerTotal === bankerTotal && entry.playerThirdCard === playerThirdCard ? styles.highlightCell : ""}>
                        {entry.bankerDraws ? "D" : "S"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PageSection>
    </GamePageShell>
  );
}

export function CrapsPage() {
  const game = GAME_BY_SLUG.craps;
  const [crapsOptions, setCrapsOptions] = useState<CrapsScenarioOptions>({
    phase: "point",
    point: 6,
    includePass: true,
    includeDontPass: false,
    includePassOdds: true,
    includeDontPassOdds: false,
    includeField: true,
    includeTravelCome: true,
    includeTravelDontCome: false,
    includeSettledCome: true,
    settledComePoint: 8,
    includeSettledDontCome: false,
    settledDontComePoint: 5,
    includeComeOdds: true,
    includeDontComeOdds: false,
    includePlace6: true,
    includePlace8: false,
    includeBuy4: true,
    includeHard8: true,
  });
  const [dieOne, setDieOne] = useState(4);
  const [dieTwo, setDieTwo] = useState(4);
  const [crapsResolution, setCrapsResolution] = useState<ReturnType<typeof resolveCrapsRoll> | null>(null);
  const crapsScenario = buildCrapsScenario(crapsOptions);
  const selectedRoll = CRAPS_ROLL_DISTRIBUTION.find((roll) => roll.sum === dieOne + dieTwo)!;
  const toggleGroups = [
    {
      title: "Line and come bets",
      entries: [
        ["includePass", "Pass line"],
        ["includeDontPass", "Don't Pass"],
        ["includePassOdds", "Pass odds"],
        ["includeDontPassOdds", "Don't Pass odds"],
        ["includeTravelCome", "Travel Come"],
        ["includeTravelDontCome", "Travel Don't Come"],
        ["includeField", "Field"],
      ],
    },
    {
      title: "Working bets",
      entries: [
        ["includeSettledCome", "Settled Come"],
        ["includeSettledDontCome", "Settled Don't Come"],
        ["includeComeOdds", "Come odds"],
        ["includeDontComeOdds", "Don't Come odds"],
        ["includePlace6", "Place 6"],
        ["includePlace8", "Place 8"],
        ["includeBuy4", "Buy 4"],
        ["includeHard8", "Hard 8"],
      ],
    },
  ] as const;

  function setCrapsOption<Key extends keyof CrapsScenarioOptions>(key: Key, value: CrapsScenarioOptions[Key]) {
    setCrapsOptions((current) => ({ ...current, [key]: value }));
  }

  function handleCrapsRoll() {
    const sum = dieOne + dieTwo;
    const hard = (sum === 4 || sum === 6 || sum === 8 || sum === 10) && dieOne === dieTwo;
    setCrapsResolution(resolveCrapsRoll(crapsScenario, { sum, hard }));
  }

  return (
    <GamePageShell game={game}>
      <PageSection
        eyebrow="Rules"
        title="Craps as a state machine"
        description="Come-out rolls, points, traveling bets, and per-roll resolution are all deterministic once the table state is known."
      >
        <div className={styles.contentStack}>
          <p>{game.rulesFocus}</p>
          <ul className={styles.bulletList}>
            <li>Come-out rolls establish the point on 4, 5, 6, 8, 9, or 10.</li>
            <li>Pass and Come share the same underlying EV; Don&apos;t Pass and Don&apos;t Come mirror the opposite side.</li>
            <li>Persistent bets are modeled as bets racing their number against 7.</li>
          </ul>
        </div>
      </PageSection>

      <PageSection
        eyebrow="Analyzer"
        title="Preview a configured craps table"
        description="Build the table state first, choose the dice next, and keep the live preview above the reference table."
      >
        <div className={styles.contentStack}>
          <div className={styles.controlGridWide}>
            <FieldLabel label="Table phase" hint="Come-out means no point is established yet. Point means the table is already working on a point number.">
              <select aria-label="Table phase" value={crapsOptions.phase} onChange={(event) => setCrapsOption("phase", event.target.value as CrapsPhase)}>
                <option value="come-out">Come-out</option>
                <option value="point">Point</option>
              </select>
            </FieldLabel>
            <FieldLabel label="Table point" hint="The current point number when the table is in the point phase.">
              <select aria-label="Table point" value={crapsOptions.point} onChange={(event) => setCrapsOption("point", Number(event.target.value) as CrapsPoint)} disabled={crapsOptions.phase !== "point"}>
                {pointOptions.map((point) => <option key={point} value={point}>{point}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Settled Come point" hint="The number a Come bet has already traveled to and is now working on.">
              <select aria-label="Settled Come point" value={crapsOptions.settledComePoint} onChange={(event) => setCrapsOption("settledComePoint", Number(event.target.value) as CrapsPoint)}>
                {pointOptions.map((point) => <option key={point} value={point}>{point}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Settled Don't Come point" hint="The number a Don't Come bet is already working against.">
              <select aria-label="Settled Don't Come point" value={crapsOptions.settledDontComePoint} onChange={(event) => setCrapsOption("settledDontComePoint", Number(event.target.value) as CrapsPoint)}>
                {pointOptions.map((point) => <option key={point} value={point}>{point}</option>)}
              </select>
            </FieldLabel>
          </div>

          <div className={styles.contentStack}>
            {toggleGroups.map((group) => (
              <div className={styles.resultPanel} key={group.title}>
                <p className={styles.cardStatusText}>{group.title}</p>
                <div className={styles.toggleGrid}>
                  {group.entries.map(([key, label]) => (
                    <ToggleField
                      key={key}
                      label={label}
                      hint={CRAPS_BET_HINTS[key]}
                      checked={crapsOptions[key as keyof CrapsScenarioOptions] as boolean}
                      onChange={(checked) => setCrapsOption(key as keyof CrapsScenarioOptions, checked as CrapsScenarioOptions[keyof CrapsScenarioOptions])}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.metricGrid}>
            <div className={styles.metricCard}>
              <span>Current table</span>
              <strong>{crapsScenario.phase === "point" ? `Point ${crapsScenario.point}` : "Come-out"}</strong>
              <small>{crapsScenario.bets.length} configured bet(s)</small>
            </div>
            <div className={styles.metricCard}>
              <span>Scenario</span>
              <strong>{crapsScenario.bets.map((bet) => bet.label).join(", ") || "No bets"}</strong>
              <small>Persistent bets default to off on the come-out.</small>
            </div>
            <div className={styles.metricCard}>
              <span>Selected roll</span>
              <strong>{dieOne === dieTwo && (dieOne + dieTwo === 4 || dieOne + dieTwo === 6 || dieOne + dieTwo === 8 || dieOne + dieTwo === 10) ? `Hard ${dieOne + dieTwo}` : `${dieOne + dieTwo}`}</strong>
              <small>{selectedRoll.ways} ways, {formatPercent(selectedRoll.probability)}</small>
            </div>
          </div>

          <DiceRollField
            label="Dice roll"
            hint="Pick both dice directly. Hardways only apply when the dice are doubles on 4, 6, 8, or 10."
            dieOne={dieOne}
            dieTwo={dieTwo}
            onDieOneChange={setDieOne}
            onDieTwoChange={setDieTwo}
            onResolve={handleCrapsRoll}
          />

          {crapsResolution ? (
            <div className={styles.resultPanel}>
              <p className={styles.resultSummary}>{crapsResolution.summary}</p>
              <ul className={styles.eventList}>
                {crapsResolution.events.map((event) => (
                  <li key={`${event.betId}-${event.description}`}>
                    <strong>{event.label}</strong>
                    <span>{event.description}</span>
                    <small>{event.outcome.toUpperCase()} {event.net === 0 ? "0.000u" : formatUnits(event.net)}</small>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className={styles.helperText}>Choose two dice to preview how the configured state resolves.</p>
          )}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Reference"
        title="Core bet table"
        description="Keep the payout reference below the live preview so the configured table stays first."
      >
        <div className={styles.tableWrap}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Bet</th>
                <th>Payout</th>
                <th>Win / push</th>
                <th>EV / unit</th>
                <th>House edge</th>
              </tr>
            </thead>
            <tbody>
              {crapsMetrics.map((metric) => (
                <tr key={metric.key}>
                  <td>
                    <strong>{metric.label}</strong>
                    <span>{metric.note}</span>
                  </td>
                  <td>{metric.payout}</td>
                  <td>{formatPercent(metric.winProbability)} / {formatPercent(metric.pushProbability)}</td>
                  <td>{formatUnits(metric.evPerUnit)}</td>
                  <td>{formatPercent(metric.houseEdge)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>
    </GamePageShell>
  );
}
function AmericanTopLineNote({ row }: { row: RouletteComparisonRow }) {
  return (
    <div className={styles.helperText}>
      <strong>{row.label}</strong> is the American-only top-line outlier: it pays {row.payoutToOne}:1, wins {formatPercent(row.pWin)}, and carries a {formatPercent(row.houseEdge)} house edge.
    </div>
  );
}
