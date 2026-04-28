"use client";

import { useMemo, useState } from "react";
import {
  BACCARAT_RULE_NOTES,
  BACCARAT_WAGERS,
  DEFAULT_KENO_PAYTABLES,
  KENO_MAX_SPOTS,
  type RouletteComparisonRow,
  analyzeKenoTicket,
  buildBaccaratBetMetricsTable,
  buildBankerDrawTable,
  buildCrapsBetMetrics,
  buildRouletteComparison,
  analyzeRouletteBets,
  casinoCatalog,
  CRAPS_ROLL_DISTRIBUTION,
  explainBaccaratDecision,
  resolveCrapsRoll,
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
import { DiceRollField, FieldLabel, ToggleField } from "../input-primitives";
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
const ROULETTE_LAYOUT_OPTIONS = [
  { kind: "european", label: "European", detail: "Single zero" },
  { kind: "american", label: "American", detail: "Double zero" },
] as const satisfies ReadonlyArray<{
  kind: RouletteKind;
  label: string;
  detail: string;
}>;
const KENO_NUMBERS = Array.from({ length: 80 }, (_, index) => index + 1);

function buildCrapsScenario(options: CrapsScenarioOptions) {
  const bets: CrapsBet[] = [];

  if (options.includePass) bets.push({ id: "pass", label: "Pass line", kind: "pass", amount: 1 });
  if (options.includeDontPass) bets.push({ id: "dont-pass", label: "Don't Pass", kind: "dontPass", amount: 1 });
  if (options.phase === "point" && options.includePass && options.includePassOdds) bets.push({ id: "pass-odds", label: "Pass odds", kind: "passOdds", amount: 1 });
  if (options.phase === "point" && options.includeDontPass && options.includeDontPassOdds) bets.push({ id: "dont-pass-odds", label: "Don't Pass odds", kind: "dontPassOdds", amount: 1 });
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
    <GamePageShell game={game}>
      <PageSection
        eyebrow="Analyzer"
        title="Build a full roulette layout wager"
        description="Click the printed layout directly; the sidebar updates combined stake, EV, and active chips."
      >
        <div className={styles.contentStack}>
          <div className={styles.boardFirstGrid}>
            <div className={`${styles.boardPrimary} ${styles.rouletteBoardPanel}`}>
              <div className={styles.rouletteBoardHeader}>
                <div className={styles.rouletteBoardHeaderCopy}>
                  <h3 className={styles.rouletteBoardHeaderTitle}>Roulette Betting Board</h3>
                  <p className={styles.rouletteBoardHeaderText}>Left click adds 1u. Right click or Delete removes 1u.</p>
                </div>

                <div className={`${styles.segmentedControl} ${styles.rouletteBoardModeSwitch}`}>
                  {ROULETTE_LAYOUT_OPTIONS.map((option) => (
                    <button
                      key={option.kind}
                      type="button"
                      className={[
                        styles.segmentButton,
                        styles.rouletteBoardModeButton,
                        rouletteKind === option.kind ? `${styles.segmentButtonActive} ${styles.rouletteBoardModeButtonActive}` : "",
                      ].filter(Boolean).join(" ")}
                      onClick={() => handleRouletteKindChange(option.kind)}
                    >
                      <span className={styles.rouletteBoardModeButtonLabel}>{option.label}</span>
                      <span className={styles.rouletteBoardModeButtonDetail}>{option.detail}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.rouletteBoardCanvasShell}>
                <RouletteBoardStage
                  rouletteKind={rouletteKind}
                  stakeForBet={stakeForBet}
                  addChip={addChip}
                  removeChip={removeChip}
                />
              </div>
            </div>

            <aside className={styles.sidebarStack}>
              <div className={styles.quickStats}>
                <div className={styles.metricCard}>
                  <span>Total stake</span>
                  <strong>{merged.totalStake.toFixed(2)}u</strong>
                  <small>{bets.length} active</small>
                </div>
                <div className={styles.metricCard}>
                  <span>Net-positive</span>
                  <strong>{formatPercent(merged.winProbability)}</strong>
                  <small>Any hit {formatPercent(merged.anyHitProbability)}</small>
                </div>
                <div className={styles.metricCard}>
                  <span>EV / unit</span>
                  <strong>{formatUnits(merged.evPerUnit)}</strong>
                  <small>Net {formatUnits(merged.expectedNet)}</small>
                </div>
                <div className={styles.metricCard}>
                  <span>House edge</span>
                  <strong>{formatPercent(merged.houseEdge)}</strong>
                  <small>Push {formatPercent(merged.pushProbability)}</small>
                </div>
              </div>

              <div className={styles.compactPanel}>
                <span className={styles.compactPanelTitle}>Active chips</span>
                {bets.length > 0 ? (
                  <div className={`${styles.tableWrap} ${styles.compactTable}`}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Bet</th>
                          <th>Stake</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {bets.map((bet) => (
                          <tr key={bet.id}>
                            <td>
                              <strong>{bet.label}</strong>
                              <span>{bet.payoutToOne}:1</span>
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
                ) : (
                  <p className={styles.cardStatusText}>No chips placed yet.</p>
                )}
                <button type="button" className={styles.actionButton} onClick={() => setBets([])} disabled={bets.length === 0}>
                  Clear layout
                </button>
              </div>
            </aside>
          </div>

          {bets.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Pocket</th>
                    <th>Net result</th>
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
          ) : (
            <p className={styles.helperText}>Start by clicking a number, split, corner, street, six-line, dozen, column, or even-money space.</p>
          )}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Reference"
        title="Single-bet odds table"
      >
        <div className={styles.contentStack}>
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
        eyebrow="Analyzer"
        title="Baccarat draw matrix"
        description="Set the current totals in the sidebar; the highlighted matrix cell shows the Banker branch."
      >
        <div className={styles.contentStack}>
          <div className={styles.boardFirstGrid}>
            <div className={`${styles.boardPrimary} ${styles.baccaratBoard}`}>
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

            <aside className={styles.sidebarStack}>
              <div className={styles.compactPanel}>
                <span className={styles.compactPanelTitle}>Hand totals</span>
                <div className={styles.controlGrid}>
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
                </div>
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
              </div>

              <div className={styles.quickStats}>
                <div className={styles.metricCard}>
                  <span>Branch</span>
                  <strong>{baccaratDecision.naturalStopsRound ? "Natural stop" : baccaratDecision.playerDraws ? "Player draws" : "Player stands"}</strong>
                  <small>{baccaratDecision.playerInstruction}</small>
                </div>
                <div className={styles.metricCard}>
                  <span>Banker rule</span>
                  <strong>{baccaratDecision.bankerDraws === null ? "Needs card" : baccaratDecision.bankerDraws ? "Draw" : "Stand"}</strong>
                  <small>{baccaratDecision.bankerInstruction}</small>
                </div>
              </div>

              <div className={styles.compactPanel}>
                <span className={styles.compactPanelTitle}>Wager reference</span>
                <div className={styles.quickStats}>
                  {baccaratMetrics.map((metric) => (
                    <div className={styles.metricCard} key={metric.key}>
                      <span>{metric.label}</span>
                      <strong>{BACCARAT_WAGERS.find((wager) => wager.key === metric.key)?.payout}</strong>
                      <small>{formatPercent(metric.winProbability)} win</small>
                      <small>Edge {formatPercent(metric.houseEdge)}</small>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </PageSection>

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
  const crapsScenario = buildCrapsScenario(crapsOptions);
  const selectedRoll = CRAPS_ROLL_DISTRIBUTION.find((roll) => roll.sum === dieOne + dieTwo)!;
  const selectedRollIsHard = (dieOne + dieTwo === 4 || dieOne + dieTwo === 6 || dieOne + dieTwo === 8 || dieOne + dieTwo === 10) && dieOne === dieTwo;
  const crapsResolution = resolveCrapsRoll(crapsScenario, { sum: dieOne + dieTwo, hard: selectedRollIsHard });
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

  return (
    <GamePageShell game={game}>
      <PageSection
        eyebrow="Analyzer"
        title="Configure the craps layout"
        description="Use the table board to set points and working bets, then choose dice in the sidebar for an immediate roll preview."
      >
        <div className={styles.contentStack}>
          <div className={styles.boardFirstGrid}>
            <div className={`${styles.boardPrimary} ${styles.crapsBoard}`}>
              <div className={styles.feltLaneHeader}>
                <span>{crapsScenario.phase === "point" ? `Point ${crapsScenario.point}` : "Come-out"}</span>
                <span>{crapsScenario.bets.length} bet(s)</span>
              </div>

              <div className={styles.crapsTableLayout}>
                <div className={styles.crapsPointBoxes}>
                  {pointOptions.map((point) => (
                    <button
                      type="button"
                      className={`${styles.boardButton} ${styles.crapsPointBox} ${crapsOptions.phase === "point" && crapsOptions.point === point ? styles.boardButtonActive : ""}`}
                      key={point}
                      onClick={() => setCrapsOptions((current) => ({ ...current, phase: "point", point }))}
                    >
                      <strong>{point}</strong>
                      <span>{point === 6 || point === 8 ? "5 ways" : point === 5 || point === 9 ? "4 ways" : "3 ways"}</span>
                    </button>
                  ))}
                </div>

                <div className={styles.crapsCenterTable}>
                  <button
                    type="button"
                    className={`${styles.boardButton} ${styles.crapsComeBox} ${crapsOptions.includeTravelCome ? styles.boardButtonActive : ""}`}
                    onClick={() => setCrapsOptions((current) => ({ ...current, includeTravelCome: !current.includeTravelCome }))}
                  >
                    <strong>Come</strong>
                    <span>Traveling bet</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.boardButton} ${styles.crapsFieldBox} ${crapsOptions.includeField ? styles.boardButtonActive : ""}`}
                    onClick={() => setCrapsOptions((current) => ({ ...current, includeField: !current.includeField }))}
                  >
                    <strong>Field</strong>
                    <span>2 3 4 9 10 11 12</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.boardButton} ${styles.crapsHardwayBox} ${crapsOptions.includeHard8 ? styles.boardButtonActive : ""}`}
                    onClick={() => setCrapsOptions((current) => ({ ...current, includeHard8: !current.includeHard8 }))}
                  >
                    <strong>Hard 8</strong>
                    <span>4-4 before easy 8 or 7</span>
                  </button>
                </div>

                <div className={styles.crapsWorkingRail}>
                  {[
                    ["includeSettledCome", `Come ${crapsOptions.settledComePoint}`, "Working"],
                    ["includeSettledDontCome", `Don't Come ${crapsOptions.settledDontComePoint}`, "Working"],
                    ["includePlace6", "Place 6", "7:6"],
                    ["includePlace8", "Place 8", "7:6"],
                    ["includeBuy4", "Buy 4", "True odds"],
                    ["includeTravelDontCome", "Don't Come", "Traveling"],
                  ].map(([key, label, detail]) => (
                    <button
                      type="button"
                      className={`${styles.boardButton} ${crapsOptions[key as keyof CrapsScenarioOptions] ? styles.boardButtonActive : ""}`}
                      key={key}
                      onClick={() => setCrapsOptions((current) => ({ ...current, [key]: !current[key as keyof CrapsScenarioOptions] }))}
                    >
                      <strong>{label}</strong>
                      <span>{detail}</span>
                    </button>
                  ))}
                </div>

                <div className={styles.crapsOddsRail}>
                  {[
                    ["includePassOdds", "Pass odds", "Behind line"],
                    ["includeDontPassOdds", "Don't Pass odds", "Lay odds"],
                    ["includeComeOdds", "Come odds", `On ${crapsOptions.settledComePoint}`],
                    ["includeDontComeOdds", "Don't Come odds", `On ${crapsOptions.settledDontComePoint}`],
                  ].map(([key, label, detail]) => (
                    <button
                      type="button"
                      className={`${styles.boardButton} ${crapsOptions[key as keyof CrapsScenarioOptions] ? styles.boardButtonActive : ""}`}
                      key={key}
                      onClick={() => setCrapsOptions((current) => ({ ...current, [key]: !current[key as keyof CrapsScenarioOptions] }))}
                    >
                      <strong>{label}</strong>
                      <span>{detail}</span>
                    </button>
                  ))}
                </div>

                <div className={styles.crapsLineRail}>
                  <button
                    type="button"
                    className={`${styles.boardButton} ${styles.crapsLineButton} ${crapsOptions.includePass ? styles.boardButtonActive : ""}`}
                    onClick={() => setCrapsOptions((current) => ({ ...current, includePass: !current.includePass }))}
                  >
                    <strong>Pass line</strong>
                    <span>Natural on come-out, point before 7</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.boardButton} ${styles.crapsLineButton} ${crapsOptions.includeDontPass ? styles.boardButtonActive : ""}`}
                    onClick={() => setCrapsOptions((current) => ({ ...current, includeDontPass: !current.includeDontPass }))}
                  >
                    <strong>Don&apos;t Pass</strong>
                    <span>Bar 12, then 7 before point</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                className={styles.boardButton}
                onClick={() => setCrapsOptions((current) => ({ ...current, phase: current.phase === "point" ? "come-out" : "point" }))}
              >
                <strong>{crapsOptions.phase === "point" ? "Move to come-out" : "Set point phase"}</strong>
                <span>Switch table phase</span>
              </button>
            </div>

            <aside className={styles.sidebarStack}>
              <div className={styles.quickStats}>
                <div className={styles.metricCard}>
                  <span>Selected roll</span>
                  <strong>{selectedRollIsHard ? `Hard ${dieOne + dieTwo}` : `${dieOne + dieTwo}`}</strong>
                  <small>{selectedRoll.ways} ways, {formatPercent(selectedRoll.probability)}</small>
                </div>
                <div className={styles.metricCard}>
                  <span>Scenario</span>
                  <strong>{crapsScenario.bets.length} bet(s)</strong>
                  <small>{crapsScenario.bets.map((bet) => bet.label).join(", ") || "No bets"}</small>
                </div>
              </div>

              <div className={styles.compactPanel}>
                <span className={styles.compactPanelTitle}>Roll selector</span>
                <DiceRollField
                  label="Dice roll"
                  hint="Pick both dice directly. Hardways only apply when the dice are doubles on 4, 6, 8, or 10."
                  dieOne={dieOne}
                  dieTwo={dieTwo}
                  onDieOneChange={setDieOne}
                  onDieTwoChange={setDieTwo}
                />
              </div>

              <div className={styles.compactPanel}>
                <span className={styles.compactPanelTitle}>Point controls</span>
                <div className={styles.controlGrid}>
                  <FieldLabel label="Settled Come" hint="The number a Come bet has already traveled to.">
                    <select aria-label="Settled Come point" value={crapsOptions.settledComePoint} onChange={(event) => setCrapsOption("settledComePoint", Number(event.target.value) as CrapsPoint)}>
                      {pointOptions.map((point) => <option key={point} value={point}>{point}</option>)}
                    </select>
                  </FieldLabel>
                  <FieldLabel label="Don't Come" hint="The number a Don't Come bet is already working against.">
                    <select aria-label="Settled Don't Come point" value={crapsOptions.settledDontComePoint} onChange={(event) => setCrapsOption("settledDontComePoint", Number(event.target.value) as CrapsPoint)}>
                      {pointOptions.map((point) => <option key={point} value={point}>{point}</option>)}
                    </select>
                  </FieldLabel>
                </div>
              </div>
            </aside>
          </div>

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
        </div>
      </PageSection>

      <PageSection
        eyebrow="Rules"
        title="Craps as a state machine"
        description="Come-out rolls, points, traveling bets, and per-roll resolution are deterministic once the table state is known."
      >
        <div className={styles.contentStack}>
          <p>{game.rulesFocus}</p>
          <ul className={styles.bulletList}>
            <li>Come-out rolls establish the point on 4, 5, 6, 8, 9, or 10.</li>
            <li>Pass and Come share the same underlying EV; Don&apos;t Pass and Don&apos;t Come mirror the opposite side.</li>
            <li>Odds bets are included only when the matching line bet and point phase make them valid.</li>
          </ul>
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

function formatWholeNumber(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

export function KenoPage() {
  const game = GAME_BY_SLUG.keno;
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([3, 12, 24, 38, 55]);
  const [payouts, setPayouts] = useState<Record<number, Record<number, number>>>(() => (
    Object.fromEntries(
      Object.entries(DEFAULT_KENO_PAYTABLES).map(([spots, table]) => [Number(spots), { ...table }]),
    )
  ));
  const spotCount = selectedNumbers.length;
  const activeSpotCount = Math.max(1, spotCount);
  const payoutEntries = useMemo(() => {
    const activePaytable = payouts[activeSpotCount] ?? {};

    return Array.from({ length: activeSpotCount + 1 }, (_, hits) => ({
      hits,
      payoutToOne: activePaytable[hits] ?? 0,
    }));
  }, [payouts, activeSpotCount]);
  const kenoAnalysis = spotCount > 0 ? analyzeKenoTicket(activeSpotCount, payoutEntries) : null;

  function toggleKenoNumber(number: number) {
    setSelectedNumbers((current) => {
      if (current.includes(number)) {
        return current.filter((entry) => entry !== number);
      }

      if (current.length >= KENO_MAX_SPOTS) {
        return current;
      }

      return [...current, number].sort((left, right) => left - right);
    });
  }

  function quickPick() {
    const pool = [...KENO_NUMBERS];

    for (let index = pool.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [pool[index], pool[swapIndex]] = [pool[swapIndex]!, pool[index]!];
    }

    setSelectedNumbers(pool.slice(0, 6).sort((left, right) => left - right));
  }

  function updatePayout(hits: number, payoutToOne: number) {
    setPayouts((current) => ({
      ...current,
      [activeSpotCount]: {
        ...(current[activeSpotCount] ?? {}),
        [hits]: Number.isFinite(payoutToOne) && payoutToOne >= 0 ? payoutToOne : 0,
      },
    }));
  }

  return (
    <GamePageShell game={game}>
      <PageSection
        eyebrow="Analyzer"
        title="Select a keno ticket"
        description="Pick 1 to 10 numbers on the 80-number board; the sidebar shows exact probability and paytable EV."
      >
        <div className={styles.contentStack}>
          <div className={styles.boardFirstGrid}>
            <div className={`${styles.boardPrimary} ${styles.numberBoard}`}>
              <div className={styles.kenoBoard}>
                {KENO_NUMBERS.map((number) => (
                  <button
                    type="button"
                    className={`${styles.kenoNumber} ${selectedNumbers.includes(number) ? styles.kenoNumberActive : ""}`}
                    key={number}
                    aria-pressed={selectedNumbers.includes(number)}
                    onClick={() => toggleKenoNumber(number)}
                  >
                    {number}
                  </button>
                ))}
              </div>
            </div>

            <aside className={styles.sidebarStack}>
              <div className={styles.quickStats}>
                <div className={styles.metricCard}>
                  <span>Spots</span>
                  <strong>{spotCount}</strong>
                  <small>{selectedNumbers.join(", ") || "Select numbers"}</small>
                </div>
                <div className={styles.metricCard}>
                  <span>Paid event</span>
                  <strong>{kenoAnalysis ? formatPercent(kenoAnalysis.hitProbability) : "0.00%"}</strong>
                  <small>20 drawn from 80</small>
                </div>
                <div className={styles.metricCard}>
                  <span>EV / ticket</span>
                  <strong>{kenoAnalysis ? formatUnits(kenoAnalysis.evPerUnit) : "0.000u"}</strong>
                  <small>Sample/editable pays</small>
                </div>
                <div className={styles.metricCard}>
                  <span>House edge</span>
                  <strong>{kenoAnalysis ? formatPercent(kenoAnalysis.houseEdge) : "0.00%"}</strong>
                  <small>Return {kenoAnalysis ? formatPercent(kenoAnalysis.expectedReturn) : "100.00%"}</small>
                </div>
              </div>

              <div className={styles.actionRow}>
                <button type="button" className={styles.actionButton} onClick={quickPick}>
                  Quick pick 6
                </button>
                <button type="button" className={styles.actionButton} onClick={() => setSelectedNumbers([])} disabled={spotCount === 0}>
                  Clear
                </button>
              </div>

              <div className={styles.compactPanel}>
                <span className={styles.compactPanelTitle}>Paytable</span>
                <div className={`${styles.tableWrap} ${styles.compactTable}`}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Hits</th>
                        <th>Pays to 1</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payoutEntries.map((entry) => (
                        <tr key={entry.hits}>
                          <td>{entry.hits}</td>
                          <td>
                            <input
                              className={styles.stakeInput}
                              aria-label={`Keno payout for ${entry.hits} hits`}
                              type="number"
                              min={0}
                              step={1}
                              value={entry.payoutToOne}
                              onChange={(event) => updatePayout(entry.hits, Number(event.target.value))}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </aside>
          </div>

          {kenoAnalysis ? (
            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Catch</th>
                    <th>Ways</th>
                    <th>Probability</th>
                    <th>Pays to 1</th>
                    <th>EV contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {kenoAnalysis.rows.map((row) => (
                    <tr key={row.hits} className={row.payoutToOne > 0 ? styles.highlightRow : ""}>
                      <td>{row.hits} of {kenoAnalysis.spotCount}</td>
                      <td>{formatWholeNumber(row.ways)}</td>
                      <td>{formatPercent(row.probability)}</td>
                      <td>{row.payoutToOne}:1</td>
                      <td>{formatUnits(row.evContribution)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.helperText}>Select at least one number to calculate the exact catch distribution.</p>
          )}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Reference"
        title="How the keno math works"
        description="The draw is exact combinatorics, while EV depends on the active payout schedule."
      >
        <ul className={styles.bulletList}>
          <li>A standard ticket chooses spots from 1 through 80, then the game draws 20 numbers without replacement.</li>
          <li>The probability of catching h numbers is C(spots, h) x C(80 - spots, 20 - h) divided by C(80, 20).</li>
          <li>Because real paytables vary, the payout column is editable and treated as net profit paid to one unit staked.</li>
        </ul>
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
