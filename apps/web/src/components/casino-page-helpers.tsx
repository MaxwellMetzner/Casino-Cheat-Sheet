"use client";

import Link from "next/link";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useState } from "react";
import { parseCardList, type CasinoGameEntry, type PokerEquityResult } from "casino-engine";
import { HelpHint } from "./input-primitives";
import styles from "./casino-dashboard.module.css";

interface ComputationState<T> {
  result: T | null;
  error: string;
  pending: boolean;
  setResult: Dispatch<SetStateAction<T | null>>;
  setError: Dispatch<SetStateAction<string>>;
  setPending: Dispatch<SetStateAction<boolean>>;
}

const FAMILY_LABELS: Record<CasinoGameEntry["family"], string> = {
  "exact-combinatorics": "Exact casino math",
  "equity-evaluator": "Poker equity lab",
  "research-mode": "Research mode",
};

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

export function formatUnits(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(3)}u`;
}

export function formatCardInputError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected analysis error.";
}

export function useComputationState<T>(): ComputationState<T> {
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return {
    result,
    error,
    pending,
    setResult,
    setError,
    setPending,
  };
}

export async function runAnalysisTask<T>(state: ComputationState<T>, task: () => Promise<T>) {
  state.setPending(true);
  state.setError("");

  try {
    state.setResult(await task());
  } catch (error) {
    state.setError(formatCardInputError(error));
    state.setResult(null);
  } finally {
    state.setPending(false);
  }
}

export function parseExactCards(rawValue: string, expectedCount: number, label: string) {
  const cards = parseCardList(rawValue);

  if (cards.length !== expectedCount) {
    throw new Error(`${label} must contain exactly ${expectedCount} cards.`);
  }

  return cards;
}

export function parseOptionalCards(rawValue: string, label: string, validCounts: number[]) {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return [];
  }

  const cards = parseCardList(trimmed);

  if (!validCounts.includes(cards.length)) {
    throw new Error(`${label} must contain ${validCounts.join(" or ")} cards.`);
  }

  return cards;
}

export function parseRangedCards(rawValue: string, label: string, minCount: number, maxCount: number) {
  const cards = parseCardList(rawValue);

  if (cards.length < minCount || cards.length > maxCount) {
    throw new Error(`${label} must contain between ${minCount} and ${maxCount} cards.`);
  }

  return cards;
}

export function normalizeInteger(value: number, fallback: number, minimum = 1, maximum?: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.max(minimum, Math.floor(value));

  if (maximum === undefined) {
    return normalized;
  }

  return Math.min(normalized, maximum);
}

export function GamePageShell({
  game,
  children,
  helper,
}: {
  game: CasinoGameEntry;
  children: ReactNode;
  helper?: ReactNode;
}) {
  return (
    <main className={styles.pageShell}>
      <section className={`${styles.hero} ${styles.pageHero}`}>
        <div className={styles.heroCopy}>
          <Link className={styles.backLink} href="/">
            Back to dashboard
          </Link>
          <p className={styles.eyebrow}>{FAMILY_LABELS[game.family]}</p>
          <h1>{game.title}</h1>
          <p className={styles.heroText}>{game.blurb}</p>
          <p className={styles.callout}>{game.firstMilestone}</p>
        </div>

        <div className={styles.heroPanel}>
          <div className={styles.statCard}>
            <div className={styles.fieldLabelHeader}>
              <span className={styles.statLabel}>Rules focus</span>
              <HelpHint text="The rule assumptions and model boundary this page uses for its calculations." label="Rules focus explanation" />
            </div>
            <strong>{game.rulesFocus}</strong>
          </div>
          <div className={styles.statCard}>
            <div className={styles.fieldLabelHeader}>
              <span className={styles.statLabel}>Outputs</span>
              <HelpHint text="The main numbers or result groups this page will produce after you run the analysis." label="Outputs explanation" />
            </div>
            <div className={styles.outputCluster}>
              {game.outputs.map((output) => (
                <span className={styles.outputChip} key={output}>
                  {output}
                </span>
              ))}
            </div>
          </div>
          {helper ? <div className={styles.statCard}>{helper}</div> : null}
        </div>
      </section>

      {children}
    </main>
  );
}

export function PageSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.moduleCard}>
      <div className={styles.pageSectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>{eyebrow}</p>
          <h2 className={styles.pageSectionTitle}>{title}</h2>
        </div>
        {description ? <p className={styles.pageSectionText}>{description}</p> : null}
      </div>
      <div className={styles.tabPanel}>{children}</div>
    </section>
  );
}

export function ResultState({ pending, error, emptyMessage }: { pending: boolean; error: string; emptyMessage: string }) {
  if (error) {
    return <p className={styles.errorText}>{error}</p>;
  }

  if (pending) {
    return <p className={styles.helperText}>Running analysis...</p>;
  }

  return <p className={styles.helperText}>{emptyMessage}</p>;
}

export function EquityResultView({ result }: { result: PokerEquityResult }) {
  return (
    <div className={styles.contentStack}>
      <div className={styles.metricGrid}> 
        <div className={styles.metricCard}>
          <span>Equity</span>
          <strong>{formatPercent(result.equity)}</strong>
          <small>{result.trials.toLocaleString()} trials</small>
        </div>
        <div className={styles.metricCard}>
          <span>Win / tie</span>
          <strong>{formatPercent(result.winProbability)}</strong>
          <small>Tie rate: {formatPercent(result.tieProbability)}</small>
        </div>
        <div className={styles.metricCard}>
          <span>Stage</span>
          <strong>{result.stageLabel}</strong>
          <small>{result.currentMadeHand ?? "No made hand locked yet"}</small>
        </div>
        <div className={styles.metricCard}>
          <span>Field</span>
          <strong>{result.opponentCount} opponent(s)</strong>
          <small>{result.fieldDescription}</small>
        </div>
        <div className={styles.metricCard}>
          <span>Pair / two pair+</span>
          <strong>{formatPercent(result.pairOrBetterProbability)}</strong>
          <small>Two pair+: {formatPercent(result.twoPairOrBetterProbability)}</small>
        </div>
        <div className={styles.metricCard}>
          <span>Straight+ / nut</span>
          <strong>{formatPercent(result.straightOrBetterProbability)}</strong>
          <small>
            {result.rangeComboCount
              ? `${result.rangeComboCount} range combos, nut potential ${formatPercent(result.nutPotential)}`
              : `Nut potential: ${formatPercent(result.nutPotential)}`}
          </small>
        </div>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Hero category</th>
              <th>Frequency</th>
            </tr>
          </thead>
          <tbody>
            {result.showdownDistribution.slice(0, 8).map((entry) => (
              <tr key={entry.category}>
                <td>{entry.category}</td>
                <td>{formatPercent(entry.probability)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}