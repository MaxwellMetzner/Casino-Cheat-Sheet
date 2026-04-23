import type { PokerHandCategory } from "./poker-evaluator";

export interface PokerCategoryFrequency {
  category: PokerHandCategory;
  probability: number;
}

export interface PokerEquityBuildOptions {
  currentMadeHand?: string;
  opponentCount?: number;
  fieldDescription?: string;
  rangeComboCount?: number;
  stageLabel?: string;
}

export interface PokerEquityResult {
  trials: number;
  winProbability: number;
  lossProbability: number;
  tieProbability: number;
  equity: number;
  percentileEstimate: number;
  nutPotential: number;
  pairOrBetterProbability: number;
  twoPairOrBetterProbability: number;
  straightOrBetterProbability: number;
  opponentCount: number;
  fieldDescription: string;
  stageLabel: string;
  rangeComboCount?: number;
  showdownDistribution: PokerCategoryFrequency[];
  currentMadeHand?: string;
}

export function buildPokerEquityResult(
  trials: number,
  wins: number,
  losses: number,
  ties: number,
  equityUnits: number,
  categoryCounts: Partial<Record<PokerHandCategory, number>>,
  {
    currentMadeHand,
    opponentCount = 1,
    fieldDescription = "Random unknown field",
    rangeComboCount,
    stageLabel = "Showdown",
  }: PokerEquityBuildOptions = {},
): PokerEquityResult {
  const showdownDistribution = Object.entries(categoryCounts)
    .map(([category, count]) => ({
      category: category as PokerHandCategory,
      probability: (count ?? 0) / trials,
    }))
    .sort((left, right) => right.probability - left.probability);

  const nutPotential = showdownDistribution
    .filter((entry) => ["straight", "flush", "full-house", "four-of-a-kind", "straight-flush"].includes(entry.category))
    .reduce((total, entry) => total + entry.probability, 0);

  const pairOrBetterProbability = showdownDistribution
    .filter((entry) => entry.category !== "high-card")
    .reduce((total, entry) => total + entry.probability, 0);

  const twoPairOrBetterProbability = showdownDistribution
    .filter((entry) => ["two-pair", "three-of-a-kind", "straight", "flush", "full-house", "four-of-a-kind", "straight-flush"].includes(entry.category))
    .reduce((total, entry) => total + entry.probability, 0);

  const straightOrBetterProbability = showdownDistribution
    .filter((entry) => ["straight", "flush", "full-house", "four-of-a-kind", "straight-flush"].includes(entry.category))
    .reduce((total, entry) => total + entry.probability, 0);

  return {
    trials,
    winProbability: wins / trials,
    lossProbability: losses / trials,
    tieProbability: ties / trials,
    equity: equityUnits / trials,
    percentileEstimate: equityUnits / trials,
    nutPotential,
    pairOrBetterProbability,
    twoPairOrBetterProbability,
    straightOrBetterProbability,
    opponentCount,
    fieldDescription,
    stageLabel,
    rangeComboCount,
    showdownDistribution,
    currentMadeHand,
  };
}