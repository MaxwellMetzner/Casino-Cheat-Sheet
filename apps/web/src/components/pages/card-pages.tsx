"use client";

import { useEffect, useState } from "react";
import {
  casinoCatalog,
  createCard,
  type BlackjackSolution,
  type Card,
  type PaiGowAnalysis,
  type ThreeCardPokerAnalysis,
  type VideoPokerAnalysis,
} from "casino-engine";
import { disposeCasinoWorker, runCasinoWorkerTask } from "../../lib/casino-worker-client";
import {
  formatPercent,
  formatUnits,
  GamePageShell,
  normalizeInteger,
  PageSection,
  parseExactCards,
  ResultState,
  runAnalysisTask,
  useComputationState,
} from "../casino-page-helpers";
import { blackjackValueLabel, CardPickerField, FieldLabel, ToggleField } from "../input-primitives";
import styles from "../casino-dashboard.module.css";

const GAME_BY_SLUG = Object.fromEntries(
  casinoCatalog.map((game) => [game.slug, game]),
);

const CARD_SUIT_SYMBOLS = {
  s: "\u2660",
  h: "\u2665",
  d: "\u2666",
  c: "\u2663",
} as const;
const BLACKJACK_HIGH_COUNT_SEQUENCE = [10, 10, 10, 10, 11] as const;
const BLACKJACK_LOW_COUNT_SEQUENCE = [2, 3, 4, 5, 6] as const;
const BLACKJACK_VALUE_SUITS = ["s", "h", "d", "c"] as const;
const BLACKJACK_RANK_BY_VALUE = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "T",
  11: "A",
} as const;
const BLACKJACK_DEALER_TILES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const BLACKJACK_HAND_GROUPS = [
  {
    title: "Hard",
    hands: [
      { label: "5", values: [3, 2] },
      { label: "6", values: [4, 2] },
      { label: "7", values: [5, 2] },
      { label: "8", values: [6, 2] },
      { label: "9", values: [7, 2] },
      { label: "10", values: [8, 2] },
      { label: "11", values: [9, 2] },
      { label: "12", values: [10, 2] },
      { label: "13", values: [10, 3] },
      { label: "14", values: [10, 4] },
      { label: "15", values: [10, 5] },
      { label: "16", values: [10, 6] },
      { label: "17", values: [10, 7] },
      { label: "18", values: [10, 8] },
      { label: "19", values: [10, 9] },
      { label: "20", values: [10, 10] },
    ],
  },
  {
    title: "Soft",
    hands: [
      { label: "A,2", values: [11, 2] },
      { label: "A,3", values: [11, 3] },
      { label: "A,4", values: [11, 4] },
      { label: "A,5", values: [11, 5] },
      { label: "A,6", values: [11, 6] },
      { label: "A,7", values: [11, 7] },
      { label: "A,8", values: [11, 8] },
      { label: "A,9", values: [11, 9] },
    ],
  },
  {
    title: "Pairs",
    hands: [
      { label: "A,A", values: [11, 11] },
      { label: "10,10", values: [10, 10] },
      { label: "9,9", values: [9, 9] },
      { label: "8,8", values: [8, 8] },
      { label: "7,7", values: [7, 7] },
      { label: "6,6", values: [6, 6] },
      { label: "5,5", values: [5, 5] },
      { label: "4,4", values: [4, 4] },
      { label: "3,3", values: [3, 3] },
      { label: "2,2", values: [2, 2] },
    ],
  },
] as const;

function useWorkerCleanup() {
  useEffect(() => () => {
    disposeCasinoWorker();
  }, []);
}

function createBlackjackCard(value: number, occurrence: number): Card {
  return createCard(BLACKJACK_RANK_BY_VALUE[value as keyof typeof BLACKJACK_RANK_BY_VALUE], BLACKJACK_VALUE_SUITS[occurrence % BLACKJACK_VALUE_SUITS.length]!);
}

function blackjackValuesToCards(values: number[], seenValues = new Map<number, number>()) {
  return values.map((value) => {
    const occurrence = seenValues.get(value) ?? 0;
    seenValues.set(value, occurrence + 1);
    return createBlackjackCard(value, occurrence);
  });
}

function approximateRemovedCardsFromRunningCount(runningCount: number, deckCount: number) {
  if (deckCount <= 0 || runningCount === 0) {
    return [] as Card[];
  }

  const sequence = runningCount > 0 ? BLACKJACK_LOW_COUNT_SEQUENCE : BLACKJACK_HIGH_COUNT_SEQUENCE;
  const magnitude = Math.min(Math.abs(Math.trunc(runningCount)), 20 * deckCount);
  const seenValues = new Map<number, number>();

  return Array.from({ length: magnitude }, (_, index) => {
    const value = sequence[index % sequence.length]!;
    const occurrence = seenValues.get(value) ?? 0;
    seenValues.set(value, occurrence + 1);
    return createBlackjackCard(value, occurrence);
  });
}

function ExactPlayingCard({ card }: { card: Card }) {
  const cardClass = [
    styles.playingCardButton,
    styles.playingCardCompact,
    card.suit === "h" || card.suit === "d" ? styles.playingCardRed : styles.playingCardBlack,
  ].join(" ");

  return (
    <span className={cardClass}>
      <span className={styles.playingCardRank}>{card.rank === "T" ? "10" : card.rank}</span>
      <span className={styles.playingCardSuit}>{CARD_SUIT_SYMBOLS[card.suit]}</span>
    </span>
  );
}

function ExactCardStrip({ cards, emptyLabel = "None" }: { cards: Card[]; emptyLabel?: string }) {
  if (cards.length === 0) {
    return <span className={styles.cardStatusText}>{emptyLabel}</span>;
  }

  return (
    <div className={styles.cardSlotRow}>
      {cards.map((card, index) => (
        <span className={styles.cardDeckButton} key={`${card.code}-${index}`}>
          <ExactPlayingCard card={card} />
        </span>
      ))}
    </div>
  );
}

function blackjackValueSignature(values: readonly number[]) {
  return [...values].sort((left, right) => left - right).join("-");
}

function formatBlackjackValues(values: readonly number[]) {
  return values.length > 0 ? values.map(blackjackValueLabel).join(" + ") : "None";
}

function BlackjackQuickTiles({
  playerValues,
  dealerValues,
  onPlayerValuesChange,
  onDealerValuesChange,
}: {
  playerValues: number[];
  dealerValues: number[];
  onPlayerValuesChange: (values: number[]) => void;
  onDealerValuesChange: (values: number[]) => void;
}) {
  const activePlayerSignature = blackjackValueSignature(playerValues);
  const activeDealerValue = dealerValues[0];

  return (
    <div className={styles.blackjackQuickPanel}>
      <div className={styles.compactPickerHeader}>
        <div>
          <strong>Quick hand table</strong>
          <p className={styles.cardDeckSummary}>
            {formatBlackjackValues(playerValues)} vs {formatBlackjackValues(dealerValues)}
          </p>
        </div>
      </div>

      <div className={styles.blackjackQuickGroups}>
        {BLACKJACK_HAND_GROUPS.map((group) => (
          <div className={styles.blackjackQuickGroup} key={group.title}>
            <span className={styles.cardSuitLabel}>{group.title}</span>
            <div className={styles.blackjackHandTileGrid}>
              {group.hands.map((hand) => {
                const active = activePlayerSignature === blackjackValueSignature(hand.values);

                return (
                  <button
                    type="button"
                    className={`${styles.blackjackQuickTile} ${active ? styles.boardButtonActive : ""}`}
                    key={`${group.title}-${hand.label}`}
                    aria-pressed={active}
                    onClick={() => onPlayerValuesChange([...hand.values])}
                  >
                    {hand.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className={styles.blackjackQuickGroup}>
          <span className={styles.cardSuitLabel}>Dealer</span>
          <div className={styles.blackjackDealerGrid}>
            {BLACKJACK_DEALER_TILES.map((value) => {
              const active = activeDealerValue === value;

              return (
                <button
                  type="button"
                  className={`${styles.blackjackQuickTile} ${active ? styles.boardButtonActive : ""}`}
                  key={value}
                  aria-pressed={active}
                  onClick={() => onDealerValuesChange([value])}
                >
                  {blackjackValueLabel(value)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function BlackjackSolverSidebar({
  result,
  pending,
  error,
  playerValues,
  dealerValues,
  normalizedDeckCount,
  normalizedRunningCount,
  trueCount,
  onSolve,
}: {
  result: BlackjackSolution | null;
  pending: boolean;
  error: string;
  playerValues: number[];
  dealerValues: number[];
  normalizedDeckCount: number;
  normalizedRunningCount: number;
  trueCount: number;
  onSolve: () => void;
}) {
  return (
    <aside className={`${styles.sidebarStack} ${styles.blackjackSolverSidebar}`}>
      <div className={styles.compactPanel}>
        <span className={styles.compactPanelTitle}>Current hand</span>
        <div className={styles.blackjackSelectionRows}>
          <div>
            <span>Player</span>
            <strong>{formatBlackjackValues(playerValues)}</strong>
          </div>
          <div>
            <span>Dealer</span>
            <strong>{formatBlackjackValues(dealerValues)}</strong>
          </div>
          <div>
            <span>Shoe</span>
            <strong>{normalizedDeckCount === 0 ? "Infinite" : `${normalizedDeckCount} deck${normalizedDeckCount === 1 ? "" : "s"}`}</strong>
          </div>
          <div>
            <span>Hi-Lo</span>
            <strong>{normalizedDeckCount === 0 ? "Off" : `${trueCount.toFixed(1)} true`}</strong>
          </div>
        </div>
      </div>

      <button type="button" className={styles.actionButton} onClick={onSolve} disabled={pending}>
        {pending ? "Solving..." : "Solve hand EV"}
      </button>

      {result ? (
        <div className={styles.blackjackMetricStack}>
          <div className={styles.metricCard}><span>Best action</span><strong>{result.bestAction}</strong><small>Best EV: {formatUnits(result.bestEv)}</small></div>
          <div className={styles.metricCard}><span>Player total</span><strong>{result.playerTotal}</strong><small>{result.soft ? "Soft" : "Hard"} hand</small></div>
          <div className={styles.metricCard}><span>Pair state</span><strong>{result.isPair ? "Pair" : "No pair"}</strong><small>{result.isNatural ? "Natural blackjack" : "Standard hand"}</small></div>
          <div className={styles.metricCard}><span>Dealer bust</span><strong>{formatPercent(result.dealerDistribution.bust)}</strong><small>Natural: {formatPercent(result.dealerDistribution.natural)}</small></div>
          <div className={styles.metricCard}><span>Hi-Lo</span><strong>{result.deckCount === 0 ? "Off" : trueCount.toFixed(1)}</strong><small>Running count {normalizedRunningCount}</small></div>
          <div className={styles.metricCard}><span>Shoe state</span><strong>{Number.isFinite(result.remainingCards) ? `${result.remainingCards} cards` : "Infinite"}</strong><small>{result.deckCount === 0 ? "Infinite or unknown" : `${result.deckCount}-deck estimate`}</small></div>
        </div>
      ) : (
        <ResultState pending={pending} error={error} emptyMessage="Select the hand, dealer upcard, shoe size, and count, then solve." />
      )}
    </aside>
  );
}

export function BlackjackPage() {
  useWorkerCleanup();

  const game = GAME_BY_SLUG.blackjack;
  const [blackjackInputs, setBlackjackInputs] = useState({
    playerValues: [11, 7],
    dealerValues: [6],
    deckCount: 6,
    runningCount: 0,
    dealerHitsSoft17: false,
    surrender: true,
    doubleAfterSplit: true,
    splitAcesOneCardOnly: true,
  });
  const blackjackAnalysis = useComputationState<BlackjackSolution>();
  const normalizedDeckCount = normalizeInteger(blackjackInputs.deckCount, 0, 0, 8);
  const normalizedRunningCount = Number.isFinite(blackjackInputs.runningCount) ? Math.trunc(blackjackInputs.runningCount) : 0;
  const trueCount = normalizedDeckCount > 0 ? normalizedRunningCount / normalizedDeckCount : 0;

  function runBlackjackAnalysis() {
    void runAnalysisTask(blackjackAnalysis, async () => {
      if (blackjackInputs.playerValues.length !== 2) {
        throw new Error("Blackjack player hand must contain exactly 2 values.");
      }

      if (blackjackInputs.dealerValues.length !== 1) {
        throw new Error("Dealer upcard must contain exactly 1 value.");
      }

      const visibleValueUsage = new Map<number, number>();
      const playerCards = blackjackValuesToCards(blackjackInputs.playerValues, visibleValueUsage);
      const dealerCards = blackjackValuesToCards(blackjackInputs.dealerValues, visibleValueUsage);
      const removedCards = approximateRemovedCardsFromRunningCount(normalizedRunningCount, normalizedDeckCount);

      return runCasinoWorkerTask("blackjack", {
        playerCards,
        dealerUpCard: dealerCards[0]!,
        options: {
          deckCount: normalizedDeckCount,
          removedCards: removedCards.length > 0 ? removedCards : undefined,
          dealerHitsSoft17: blackjackInputs.dealerHitsSoft17,
          surrender: blackjackInputs.surrender,
          doubleAfterSplit: blackjackInputs.doubleAfterSplit,
          splitAcesOneCardOnly: blackjackInputs.splitAcesOneCardOnly,
        },
      });
    });
  }

  const blackjackShoeHint = blackjackInputs.deckCount === 0
    ? "0 uses an infinite or unknown shoe model. Running-count adjustments are ignored in that mode."
    : "Hi-Lo uses the running count and estimated decks remaining. Exact counting would need the real exposed/discarded cards.";

  return (
    <GamePageShell game={game} helper={<div className={styles.callout}>{blackjackShoeHint}</div>}>
      <PageSection eyebrow="Analyzer" title="Solve a blackjack hand" description="Pick the hand values, set the shoe estimate, and compare the EV of every legal action.">
        <div className={styles.contentStack}>
          <div className={styles.boardFirstGrid}>
            <div className={`${styles.boardPrimary} ${styles.feltBoard} ${styles.blackjackControlSurface}`}>
              <BlackjackQuickTiles
                playerValues={blackjackInputs.playerValues}
                dealerValues={blackjackInputs.dealerValues}
                onPlayerValuesChange={(playerValues) => setBlackjackInputs((current) => ({ ...current, playerValues }))}
                onDealerValuesChange={(dealerValues) => setBlackjackInputs((current) => ({ ...current, dealerValues }))}
              />
              <div className={styles.blackjackOptionGrid}>
                <FieldLabel label="Decks remaining" hint="Use 0 for infinite or unknown. For card counting, enter your estimated decks left so the true count can be derived.">
                  <input
                    aria-label="Decks remaining"
                    type="number"
                    min={0}
                    max={8}
                    step={1}
                    value={blackjackInputs.deckCount}
                    onChange={(event) => setBlackjackInputs((current) => ({ ...current, deckCount: Number(event.target.value) }))}
                  />
                </FieldLabel>
                <FieldLabel label="Hi-Lo running count" hint="Positive counts mean more low cards are gone. Negative counts mean more tens and aces are gone.">
                  <input
                    aria-label="Hi-Lo running count"
                    type="number"
                    step={1}
                    value={blackjackInputs.runningCount}
                    onChange={(event) => setBlackjackInputs((current) => ({ ...current, runningCount: Number(event.target.value) }))}
                    disabled={blackjackInputs.deckCount === 0}
                  />
                </FieldLabel>
                <ToggleField label="Dealer hits soft 17" hint="If enabled, the dealer draws on soft 17 instead of standing." checked={blackjackInputs.dealerHitsSoft17} onChange={(dealerHitsSoft17) => setBlackjackInputs((current) => ({ ...current, dealerHitsSoft17 }))} />
                <ToggleField label="Late surrender" hint="Lets the player surrender after the dealer checks for blackjack." checked={blackjackInputs.surrender} onChange={(surrender) => setBlackjackInputs((current) => ({ ...current, surrender }))} />
                <ToggleField label="Double after split" hint="Allows doubling on hands created by a split." checked={blackjackInputs.doubleAfterSplit} onChange={(doubleAfterSplit) => setBlackjackInputs((current) => ({ ...current, doubleAfterSplit }))} />
                <ToggleField label="One card on split aces" hint="Common casino rule where split aces receive only one additional card each." checked={blackjackInputs.splitAcesOneCardOnly} onChange={(splitAcesOneCardOnly) => setBlackjackInputs((current) => ({ ...current, splitAcesOneCardOnly }))} />
              </div>
            </div>

            <BlackjackSolverSidebar
              result={blackjackAnalysis.result}
              pending={blackjackAnalysis.pending}
              error={blackjackAnalysis.error}
              playerValues={blackjackInputs.playerValues}
              dealerValues={blackjackInputs.dealerValues}
              normalizedDeckCount={normalizedDeckCount}
              normalizedRunningCount={normalizedRunningCount}
              trueCount={trueCount}
              onSolve={runBlackjackAnalysis}
            />
          </div>

          <p className={styles.helperText}>
            {blackjackInputs.deckCount === 0
              ? "Infinite or unknown mode uses neutral shoe composition and ignores the running count."
              : `True count estimate: ${trueCount.toFixed(1)} (${normalizedRunningCount} running count / ${normalizedDeckCount} deck${normalizedDeckCount === 1 ? "" : "s"} remaining). The solver converts that count into representative removed low or high cards, so actual discard composition is still better when known.`}
          </p>
          {blackjackAnalysis.result ? (
            <div className={styles.contentStack}>
              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead><tr><th>Action</th><th>EV</th></tr></thead>
                  <tbody>
                    {blackjackAnalysis.result.actions.map((action) => (
                      <tr key={action.action}><td>{action.action}</td><td>{formatUnits(action.ev)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className={styles.eventList}>
                {blackjackAnalysis.result.notes.map((note) => <li key={note}><span>{note}</span></li>)}
                {blackjackInputs.deckCount > 0 && blackjackInputs.runningCount !== 0 ? <li><span>Hi-Lo estimate: running count {normalizedRunningCount} converted into approximate low/high removals. For a sharper card-counting result, the missing information is the actual discard/exposed-card composition and decks remaining.</span></li> : null}
              </ul>
            </div>
          ) : null}
        </div>
      </PageSection>

      <PageSection eyebrow="Rules" title="Count-aware blackjack" description="This page favors fast hand entry and a practical Hi-Lo estimate over manually listing exposed cards.">
        <ul className={styles.bulletList}>
          <li>Player and dealer card entry is value-based, so suits are abstracted away for blackjack decisions.</li>
          <li>Finite shoes can be approximated from a Hi-Lo running count instead of enumerating exposed cards.</li>
          <li>A shoe value of 0 switches to an infinite or unknown composition model.</li>
        </ul>
      </PageSection>
    </GamePageShell>
  );
}

export function VideoPokerPage() {
  useWorkerCleanup();

  const game = GAME_BY_SLUG["video-poker"];
  const [videoPokerHand, setVideoPokerHand] = useState("Ah Kh Qh Jh Th");
  const videoPokerAnalysis = useComputationState<VideoPokerAnalysis>();

  function runVideoPokerAnalysis() {
    void runAnalysisTask(videoPokerAnalysis, async () => runCasinoWorkerTask(
      "videoPoker",
      { hand: parseExactCards(videoPokerHand, 5, "Video poker hand") },
    ));
  }

  return (
    <GamePageShell game={game}>
      <PageSection eyebrow="Analyzer" title="Find the best hold" description="Enter a five-card hand and compare the exact EV of the best draws.">
        <div className={styles.contentStack}>
          <div className={styles.feltBoard}>
            <CardPickerField label="Five-card hand" hint="Pick the exact five cards you were dealt before deciding what to hold." value={videoPokerHand} onChange={setVideoPokerHand} maxCards={5} presentation="dialog" />
            <div className={styles.actionRow}><button type="button" className={styles.actionButton} onClick={runVideoPokerAnalysis} disabled={videoPokerAnalysis.pending}>{videoPokerAnalysis.pending ? "Enumerating..." : "Analyze holds"}</button></div>
          </div>
          {videoPokerAnalysis.result ? (
            <div className={styles.contentStack}>
              <div className={styles.metricGrid}>
                <div className={styles.metricCard}><span>Initial rank</span><strong>{videoPokerAnalysis.result.initialRank}</strong><small>Current made hand before the draw</small></div>
                <div className={styles.metricCard}><span>Best hold</span><strong>{videoPokerAnalysis.result.best.keptCards.length === 0 ? "Draw five" : `${videoPokerAnalysis.result.best.keptCards.length} card(s)`}</strong><small>Mask {videoPokerAnalysis.result.best.mask}</small></div>
                <div className={styles.metricCard}><span>Exact EV</span><strong>{videoPokerAnalysis.result.best.ev.toFixed(4)}</strong><small>Expected return: {formatPercent(videoPokerAnalysis.result.best.expectedReturn)}</small></div>
              </div>
              <div className={styles.resultPanel}>
                <span className={styles.cardStatusText}>Best hold</span>
                <ExactCardStrip cards={videoPokerAnalysis.result.best.keptCards} emptyLabel="Draw five" />
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead><tr><th>Hold</th><th>Discard</th><th>EV</th></tr></thead>
                  <tbody>
                    {videoPokerAnalysis.result.contenders.map((option) => (
                      <tr key={option.mask}>
                        <td><ExactCardStrip cards={option.keptCards} emptyLabel="Draw five" /></td>
                        <td>{option.discarded}</td>
                        <td>{option.ev.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : <ResultState pending={videoPokerAnalysis.pending} error={videoPokerAnalysis.error} emptyMessage="Enter five cards to enumerate the exact hold EVs." />}
        </div>
      </PageSection>
      <PageSection eyebrow="Rules" title="Exact hold analysis" description="Video poker is a paytable plus draw enumeration, so every hold can be compared exactly.">
        <ul className={styles.bulletList}>
          <li>This analyzer enumerates every draw for every one of the 32 possible hold masks.</li>
          <li>The current implementation focuses on exact choice quality rather than chart memorization.</li>
        </ul>
      </PageSection>
    </GamePageShell>
  );
}

export function ThreeCardPokerPage() {
  useWorkerCleanup();

  const game = GAME_BY_SLUG["three-card-poker"];
  const [threeCardHand, setThreeCardHand] = useState("Qh 6c 4d");
  const threeCardAnalysis = useComputationState<ThreeCardPokerAnalysis>();

  function runThreeCardAnalysis() {
    void runAnalysisTask(threeCardAnalysis, async () => runCasinoWorkerTask(
      "threeCard",
      { hand: parseExactCards(threeCardHand, 3, "Three Card Poker hand") },
    ));
  }

  return (
    <GamePageShell game={game}>
      <PageSection eyebrow="Analyzer" title="Evaluate a Three Card Poker hand" description="Enter a hand and get the exact play-or-fold recommendation with side-bet context.">
        <div className={styles.contentStack}>
          <div className={styles.feltBoard}>
            <CardPickerField label="Three-card hand" hint="Pick the three cards in your hand to test the play-or-fold threshold." value={threeCardHand} onChange={setThreeCardHand} maxCards={3} presentation="dialog" />
            <div className={styles.actionRow}><button type="button" className={styles.actionButton} onClick={runThreeCardAnalysis} disabled={threeCardAnalysis.pending}>{threeCardAnalysis.pending ? "Enumerating..." : "Analyze decision"}</button></div>
          </div>
          {threeCardAnalysis.result ? (
            <div className={styles.contentStack}>
              <div className={styles.resultPanel}>
                <span className={styles.cardStatusText}>Current hand</span>
                <ExactCardStrip cards={threeCardAnalysis.result.hand.cards} />
              </div>
              <div className={styles.metricGrid}>
                <div className={styles.metricCard}><span>Hand</span><strong>{threeCardAnalysis.result.hand.label}</strong><small>{threeCardAnalysis.result.meetsRaiseThreshold ? "Q-6-4 or better" : "Below Q-6-4"}</small></div>
                <div className={styles.metricCard}><span>Optimal action</span><strong>{threeCardAnalysis.result.optimalAction}</strong><small>Play EV: {formatUnits(threeCardAnalysis.result.playEv)}</small></div>
                <div className={styles.metricCard}><span>Fold EV</span><strong>{formatUnits(threeCardAnalysis.result.foldEv)}</strong><small>Dealer qualifies: {formatPercent(threeCardAnalysis.result.dealerQualifyProbability)}</small></div>
                <div className={styles.metricCard}><span>Side-bet context</span><strong>{threeCardAnalysis.result.pairPlusPayout}:1</strong><small>Ante bonus: {threeCardAnalysis.result.anteBonusPayout}:1</small></div>
              </div>
            </div>
          ) : <ResultState pending={threeCardAnalysis.pending} error={threeCardAnalysis.error} emptyMessage="Enter a three-card hand to calculate exact Ante/Play EV." />}
        </div>
      </PageSection>
      <PageSection eyebrow="Rules" title="Ante/Play threshold" description="The base game is an exact raise-or-fold threshold problem.">
        <ul className={styles.bulletList}>
          <li>Ante/Play and Pair Plus are separate products with separate probabilities.</li>
          <li>The exact base-game decision is driven by the Q-6-4 threshold.</li>
        </ul>
      </PageSection>
    </GamePageShell>
  );
}

export function PaiGowPokerPage() {
  useWorkerCleanup();

  const game = GAME_BY_SLUG["pai-gow-poker"];
  const [paiGowInputs, setPaiGowInputs] = useState({ hand: "As Ah Kd Qs Jc 9h 7d", trials: 180 });
  const paiGowAnalysis = useComputationState<PaiGowAnalysis>();

  function runPaiGowAnalysis() {
    void runAnalysisTask(paiGowAnalysis, async () => runCasinoWorkerTask("paiGow", {
      hand: parseExactCards(paiGowInputs.hand, 7, "Pai Gow Poker hand"),
      trials: normalizeInteger(paiGowInputs.trials, 180, 60),
    }));
  }

  return (
    <GamePageShell game={game}>
      <PageSection eyebrow="Analyzer" title="Recommend a Pai Gow split" description="Enter one seven-card hand and compare the simulated strength of the leading splits.">
        <div className={styles.contentStack}>
          <div className={`${styles.controlGrid} ${styles.feltBoard}`}>
            <CardPickerField label="Seven-card hand" hint="Pick all seven cards before comparing the best Pai Gow splits." value={paiGowInputs.hand} onChange={(hand) => setPaiGowInputs((current) => ({ ...current, hand }))} maxCards={7} presentation="dialog" />
            <FieldLabel label="Simulation trials" hint="How many random dealer comparisons to run for each candidate split."><input aria-label="Simulation trials" type="number" min={60} step={20} value={paiGowInputs.trials} onChange={(event) => setPaiGowInputs((current) => ({ ...current, trials: Number(event.target.value) }))} /></FieldLabel>
          </div>
          <div className={styles.actionRow}><button type="button" className={styles.actionButton} onClick={runPaiGowAnalysis} disabled={paiGowAnalysis.pending}>{paiGowAnalysis.pending ? "Simulating..." : "Recommend split"}</button></div>
          {paiGowAnalysis.result ? (
            <div className={styles.contentStack}>
              <div className={styles.metricGrid}>
                <div className={styles.metricCard}><span>Recommended split</span><strong>{paiGowAnalysis.result.recommended.split.valid ? "Valid split" : "Review split"}</strong><small>{paiGowAnalysis.result.recommended.trials} trials</small></div>
                <div className={styles.metricCard}><span>Estimated EV</span><strong>{formatUnits(paiGowAnalysis.result.recommended.ev)}</strong><small>Win rate: {formatPercent(paiGowAnalysis.result.recommended.winProbability)}</small></div>
                <div className={styles.metricCard}><span>Push rate</span><strong>{formatPercent(paiGowAnalysis.result.recommended.pushProbability)}</strong><small>Loss rate: {formatPercent(paiGowAnalysis.result.recommended.lossProbability)}</small></div>
              </div>
              <div className={styles.resultPanel}>
                <span className={styles.cardStatusText}>Recommended split</span>
                <div className={styles.contentStack}>
                  <div>
                    <strong>Low hand</strong>
                    <ExactCardStrip cards={paiGowAnalysis.result.recommended.split.lowCards} />
                  </div>
                  <div>
                    <strong>High hand</strong>
                    <ExactCardStrip cards={paiGowAnalysis.result.recommended.split.highCards} />
                  </div>
                </div>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead><tr><th>Split</th><th>EV</th><th>Push</th></tr></thead>
                  <tbody>
                    {paiGowAnalysis.result.alternatives.map((option) => (
                      <tr key={option.split.label}>
                        <td>{option.split.label}</td>
                        <td>{formatUnits(option.ev)}</td>
                        <td>{formatPercent(option.pushProbability)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : <ResultState pending={paiGowAnalysis.pending} error={paiGowAnalysis.error} emptyMessage="Enter a seven-card Pai Gow hand to simulate split EV." />}
        </div>
      </PageSection>
      <PageSection eyebrow="Rules" title="Split-first Pai Gow guidance" description="This page is for hand-setting help around one seven-card input.">
        <ul className={styles.bulletList}>
          <li>The current version uses a best-split heuristic plus simulation against random dealer hands.</li>
          <li>Commission and banker-wins-ties behavior are already reflected in the estimated EV.</li>
        </ul>
      </PageSection>
    </GamePageShell>
  );
}
