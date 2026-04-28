"use client";

import { useEffect, useState } from "react";
import { casinoCatalog, parseCardList, type PokerEquityResult } from "casino-engine";
import { disposeCasinoWorker, runCasinoWorkerTask } from "../../lib/casino-worker-client";
import {
  EquityResultView,
  GamePageShell,
  normalizeInteger,
  PageSection,
  parseExactCards,
  parseOptionalCards,
  parseRangedCards,
  ResultState,
  runAnalysisTask,
  useComputationState,
} from "../casino-page-helpers";
import { cardTokensFromInput, CardPickerField, FieldLabel } from "../input-primitives";
import styles from "../casino-dashboard.module.css";

const GAME_BY_SLUG = Object.fromEntries(
  casinoCatalog.map((game) => [game.slug, game]),
);

function useWorkerCleanup() {
  useEffect(() => () => {
    disposeCasinoWorker();
  }, []);
}

export function HoldemPage() {
  useWorkerCleanup();

  const game = GAME_BY_SLUG["texas-holdem"];
  const [holdemInputs, setHoldemInputs] = useState({
    hero: "Ah Kh",
    board: "Qh Jh 2c",
    villain: "",
    villainRange: "",
    opponents: 1,
    trials: 2800,
  });
  const holdemAnalysis = useComputationState<PokerEquityResult>();
  const holdemHeroUnavailable = [...cardTokensFromInput(holdemInputs.board), ...cardTokensFromInput(holdemInputs.villain)];
  const holdemBoardUnavailable = [...cardTokensFromInput(holdemInputs.hero), ...cardTokensFromInput(holdemInputs.villain)];
  const holdemVillainUnavailable = [...cardTokensFromInput(holdemInputs.hero), ...cardTokensFromInput(holdemInputs.board)];

  function runHoldemAnalysis() {
    void runAnalysisTask(holdemAnalysis, async () => runCasinoWorkerTask("holdem", {
      heroHoleCards: parseExactCards(holdemInputs.hero, 2, "Hold'em hero hand"),
      boardCards: parseOptionalCards(holdemInputs.board, "Hold'em board", [0, 3, 4, 5]),
      villainHoleCards: parseOptionalCards(holdemInputs.villain, "Hold'em villain hand", [2]),
      villainRange: holdemInputs.villainRange.trim() || undefined,
      opponents: normalizeInteger(holdemInputs.opponents, 1),
      trials: normalizeInteger(holdemInputs.trials, 2800, 250),
    }));
  }

  return (
    <GamePageShell game={game}>
      <PageSection eyebrow="Rules" title="Hold'em equity, not solver claims" description="This page is explicitly an equity lab. It estimates showdown strength and draw health without pretending to be a no-limit GTO product.">
        <ul className={styles.bulletList}>
          <li>Hold&apos;em now supports exact villain cards, shorthand villain ranges, and multi-opponent fields from any street.</li>
          <li>The current output focuses on equity, tie rate, made-hand frequency, and percentile context.</li>
        </ul>
      </PageSection>
      <PageSection eyebrow="Analyzer" title="Run the Hold'em lab" description="Enter hero cards, optional board cards, and either an exact villain hand or a shorthand range.">
        <div className={styles.contentStack}>
          <div className={styles.controlGridWide}>
            <CardPickerField label="Hero hole cards" hint="Your two private cards in Hold'em." value={holdemInputs.hero} onChange={(hero) => setHoldemInputs((current) => ({ ...current, hero }))} maxCards={2} unavailableCards={holdemHeroUnavailable} />
            <CardPickerField label="Board cards" hint="Community cards. Use either 0, 3, 4, or 5 cards for preflop through river states." value={holdemInputs.board} onChange={(board) => setHoldemInputs((current) => ({ ...current, board }))} maxCards={5} unavailableCards={holdemBoardUnavailable} />
            <CardPickerField label="Exact villain hand" hint="Use this when you know the opponent's two private cards. Leave blank to simulate from a range or random holdings." value={holdemInputs.villain} onChange={(villain) => setHoldemInputs((current) => ({ ...current, villain }))} maxCards={2} unavailableCards={holdemVillainUnavailable} />
            <FieldLabel label="Villain range" hint="Poker shorthand for the opponent's possible hands, such as QQ+, AKs, or AQo+. This is only used when exact villain cards are not fixed."><input value={holdemInputs.villainRange} onChange={(event) => setHoldemInputs((current) => ({ ...current, villainRange: event.target.value }))} placeholder="QQ+,AKs,AQo+" /></FieldLabel>
            <FieldLabel label="Opponents" hint="How many opposing hands to simulate against the hero."><input aria-label="Opponents" type="number" min={1} step={1} value={holdemInputs.opponents} onChange={(event) => setHoldemInputs((current) => ({ ...current, opponents: Number(event.target.value) }))} /></FieldLabel>
            <FieldLabel label="Trials" hint="The number of random deals to sample when exhaustive enumeration is not being used. Higher values reduce noise but take longer."><input aria-label="Trials" type="number" min={500} step={250} value={holdemInputs.trials} onChange={(event) => setHoldemInputs((current) => ({ ...current, trials: Number(event.target.value) }))} /></FieldLabel>
          </div>
          <div className={styles.actionRow}><button type="button" className={styles.actionButton} onClick={runHoldemAnalysis} disabled={holdemAnalysis.pending}>{holdemAnalysis.pending ? "Simulating..." : "Run Hold'em lab"}</button></div>
          {holdemAnalysis.result ? <EquityResultView result={holdemAnalysis.result} /> : <ResultState pending={holdemAnalysis.pending} error={holdemAnalysis.error} emptyMessage="Enter hero cards plus any exact villain cards, a range, and optional multiway context to estimate equity." />}
        </div>
      </PageSection>
    </GamePageShell>
  );
}

export function OmahaPage() {
  useWorkerCleanup();

  const game = GAME_BY_SLUG.omaha;
  const [omahaInputs, setOmahaInputs] = useState({
    hero: "Ah Kh Qh Jh",
    board: "Th 2c 3d",
    villain: "",
    opponents: 1,
    trials: 2800,
  });
  const omahaAnalysis = useComputationState<PokerEquityResult>();
  const omahaHeroUnavailable = [...cardTokensFromInput(omahaInputs.board), ...cardTokensFromInput(omahaInputs.villain)];
  const omahaBoardUnavailable = [...cardTokensFromInput(omahaInputs.hero), ...cardTokensFromInput(omahaInputs.villain)];
  const omahaVillainUnavailable = [...cardTokensFromInput(omahaInputs.hero), ...cardTokensFromInput(omahaInputs.board)];

  function runOmahaAnalysis() {
    void runAnalysisTask(omahaAnalysis, async () => runCasinoWorkerTask("omaha", {
      heroHoleCards: parseExactCards(omahaInputs.hero, 4, "Omaha hero hand"),
      boardCards: parseOptionalCards(omahaInputs.board, "Omaha board", [0, 3, 4, 5]),
      villainHoleCards: parseOptionalCards(omahaInputs.villain, "Omaha villain hand", [4]),
      opponents: normalizeInteger(omahaInputs.opponents, 1),
      trials: normalizeInteger(omahaInputs.trials, 2800, 250),
    }));
  }

  return (
    <GamePageShell game={game}>
      <PageSection eyebrow="Rules" title="Strict Omaha construction" description="Omaha needs its own page because the exact two-from-hand, three-from-board rule changes both the evaluator and the shape of useful outputs.">
        <ul className={styles.bulletList}>
          <li>The evaluator still enforces Omaha hand construction on every comparison.</li>
          <li>The lab now handles flop, turn, river, and multi-opponent fields.</li>
        </ul>
      </PageSection>
      <PageSection eyebrow="Analyzer" title="Run the Omaha lab" description="Enter four hero cards plus any known board or exact villain cards.">
        <div className={styles.contentStack}>
          <div className={styles.controlGridWide}>
            <CardPickerField label="Hero hole cards" hint="Your four private Omaha cards." value={omahaInputs.hero} onChange={(hero) => setOmahaInputs((current) => ({ ...current, hero }))} maxCards={4} unavailableCards={omahaHeroUnavailable} />
            <CardPickerField label="Board cards" hint="Community cards. Use either 0, 3, 4, or 5 cards depending on the street." value={omahaInputs.board} onChange={(board) => setOmahaInputs((current) => ({ ...current, board }))} maxCards={5} unavailableCards={omahaBoardUnavailable} />
            <CardPickerField label="Exact villain hand" hint="Known opposing four-card Omaha holding. Leave blank for random opponents." value={omahaInputs.villain} onChange={(villain) => setOmahaInputs((current) => ({ ...current, villain }))} maxCards={4} unavailableCards={omahaVillainUnavailable} />
            <FieldLabel label="Opponents" hint="How many opposing Omaha hands to simulate against."><input aria-label="Opponents" type="number" min={1} step={1} value={omahaInputs.opponents} onChange={(event) => setOmahaInputs((current) => ({ ...current, opponents: Number(event.target.value) }))} /></FieldLabel>
            <FieldLabel label="Trials" hint="The number of simulation runs to use when the board or villain cards are not fully fixed."><input aria-label="Trials" type="number" min={500} step={250} value={omahaInputs.trials} onChange={(event) => setOmahaInputs((current) => ({ ...current, trials: Number(event.target.value) }))} /></FieldLabel>
          </div>
          <div className={styles.actionRow}><button type="button" className={styles.actionButton} onClick={runOmahaAnalysis} disabled={omahaAnalysis.pending}>{omahaAnalysis.pending ? "Simulating..." : "Run Omaha lab"}</button></div>
          {omahaAnalysis.result ? <EquityResultView result={omahaAnalysis.result} /> : <ResultState pending={omahaAnalysis.pending} error={omahaAnalysis.error} emptyMessage="Enter four hero cards plus any known board, exact villain cards, and optional multiway context to estimate equity." />}
        </div>
      </PageSection>
    </GamePageShell>
  );
}

export function StudPage() {
  useWorkerCleanup();

  const game = GAME_BY_SLUG["seven-card-stud"];
  const [studInputs, setStudInputs] = useState({
    hero: "Ah Kh Qh",
    villain: "",
    dead: "",
    opponents: 1,
    trials: 2800,
  });
  const studAnalysis = useComputationState<PokerEquityResult>();
  const studHeroUnavailable = [...cardTokensFromInput(studInputs.villain), ...cardTokensFromInput(studInputs.dead)];
  const studVillainUnavailable = [...cardTokensFromInput(studInputs.hero), ...cardTokensFromInput(studInputs.dead)];
  const studDeadUnavailable = [...cardTokensFromInput(studInputs.hero), ...cardTokensFromInput(studInputs.villain)];

  function runStudAnalysis() {
    void runAnalysisTask(studAnalysis, async () => runCasinoWorkerTask("stud", {
      heroCards: parseRangedCards(studInputs.hero, "Stud hero cards", 3, 7),
      villainCards: parseOptionalCards(studInputs.villain, "Stud villain cards", [3, 4, 5, 6, 7]),
      deadCards: studInputs.dead.trim() ? parseCardList(studInputs.dead) : [],
      opponents: normalizeInteger(studInputs.opponents, 1),
      trials: normalizeInteger(studInputs.trials, 2800, 250),
    }));
  }

  return (
    <GamePageShell game={game}>
      <PageSection eyebrow="Rules" title="Stud-specific removal effects" description="Stud deserves its own route because exposed cards and dead-card removal are core inputs, not side notes. ">
        <ul className={styles.bulletList}>
          <li>Dead-card removal, partial street states, and multi-opponent stud fields are modeled directly in the simulation deck.</li>
          <li>The output tracks street-aware equity rather than pretending everything is just a Hold&apos;em board substitute.</li>
        </ul>
      </PageSection>
      <PageSection eyebrow="Analyzer" title="Run the stud lab" description="Enter 3 to 7 hero cards, optional villain cards, and any dead-card information.">
        <div className={styles.contentStack}>
          <div className={styles.controlGridWide}>
            <CardPickerField label="Hero cards" hint="Your exposed and hidden stud cards. Use between 3 and 7 cards depending on the street." value={studInputs.hero} onChange={(hero) => setStudInputs((current) => ({ ...current, hero }))} maxCards={7} unavailableCards={studHeroUnavailable} />
            <CardPickerField label="Villain cards" hint="Known opposing stud cards. Leave blank if the villain's hand is unknown." value={studInputs.villain} onChange={(villain) => setStudInputs((current) => ({ ...current, villain }))} maxCards={7} unavailableCards={studVillainUnavailable} />
            <CardPickerField label="Dead cards" hint="Cards already folded or visibly out of play. These affect removal and live-out calculations." value={studInputs.dead} onChange={(dead) => setStudInputs((current) => ({ ...current, dead }))} maxCards={20} unavailableCards={studDeadUnavailable} />
            <FieldLabel label="Opponents" hint="How many additional stud opponents to simulate."><input aria-label="Opponents" type="number" min={1} step={1} value={studInputs.opponents} onChange={(event) => setStudInputs((current) => ({ ...current, opponents: Number(event.target.value) }))} /></FieldLabel>
            <FieldLabel label="Trials" hint="The number of random stud runouts to sample for the current street state."><input aria-label="Trials" type="number" min={500} step={250} value={studInputs.trials} onChange={(event) => setStudInputs((current) => ({ ...current, trials: Number(event.target.value) }))} /></FieldLabel>
          </div>
          <div className={styles.actionRow}><button type="button" className={styles.actionButton} onClick={runStudAnalysis} disabled={studAnalysis.pending}>{studAnalysis.pending ? "Simulating..." : "Run stud lab"}</button></div>
          {studAnalysis.result ? <EquityResultView result={studAnalysis.result} /> : <ResultState pending={studAnalysis.pending} error={studAnalysis.error} emptyMessage="Enter 3 to 7 hero cards, optional villain cards, dead cards, and any multiway context to estimate stud equity." />}
        </div>
      </PageSection>
    </GamePageShell>
  );
}

export function ToyCfrPage() {
  const game = GAME_BY_SLUG["toy-gto-lab"];

  return (
    <GamePageShell
      game={game}
      helper={<p className={styles.dashboardHelper}>CFR means counterfactual regret minimization: a family of algorithms for learning strategies in imperfect-information games.</p>}
    >
      <PageSection eyebrow="What this is" title="A research placeholder, not a live solver" description="This page exists to explain the old research-mode card you were seeing on the dashboard.">
        <div className={styles.contentStack}>
          <p>
            The old research page was meant as a home for tiny counterfactual regret minimization experiments in very small games such as Kuhn poker or Leduc,
            where the entire betting tree can fit inside a browser-friendly educational tool.
          </p>
          <ul className={styles.bulletList}>
            <li>It is not a real no-limit Hold&apos;em solver.</li>
            <li>It is not production-ready poker guidance.</li>
            <li>It currently has little functionality because the serious work would require offline abstractions and much larger solve pipelines.</li>
          </ul>
          <p className={styles.callout}>
            I left this route available as background context, but it is intentionally no longer a main dashboard destination.
          </p>
        </div>
      </PageSection>
    </GamePageShell>
  );
}