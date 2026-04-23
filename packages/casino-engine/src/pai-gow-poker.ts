import { combinations, compareScoreArrays, sampleWithoutReplacement } from "./combinatorics";
import { formatCardList, remainingDeck, type Card } from "./cards";
import {
  bestFiveCardPoker,
  comparePaiGowLowHands,
  comparePokerHands,
  evaluatePaiGowLowHand,
  type EvaluatedPaiGowLowHand,
  type EvaluatedPokerHand,
} from "./poker-evaluator";

export interface PaiGowSplit {
  highCards: Card[];
  lowCards: Card[];
  highHand: EvaluatedPokerHand;
  lowHand: EvaluatedPaiGowLowHand;
  valid: boolean;
  label: string;
}

export interface PaiGowSimulation {
  split: PaiGowSplit;
  ev: number;
  winProbability: number;
  lossProbability: number;
  pushProbability: number;
  trials: number;
}

export interface PaiGowAnalysis {
  recommended: PaiGowSimulation;
  alternatives: PaiGowSimulation[];
  notes: string[];
}

function compareHighAgainstLow(highHand: EvaluatedPokerHand, lowHand: EvaluatedPaiGowLowHand) {
  return compareScoreArrays(highHand.score, lowHand.score);
}

export function enumeratePaiGowSplits(cards: Card[]) {
  if (cards.length !== 7) {
    throw new Error(`Pai Gow Poker requires 7 cards, received ${cards.length}.`);
  }

  return [...combinations(cards, 2)].map((lowCards) => {
    const lowCodes = new Set(lowCards.map((card) => card.code));
    const highCards = cards.filter((card) => !lowCodes.has(card.code));
    const highHand = bestFiveCardPoker(highCards);
    const lowHand = evaluatePaiGowLowHand(lowCards);
    const valid = compareHighAgainstLow(highHand, lowHand) > 0;

    return {
      highCards,
      lowCards,
      highHand,
      lowHand,
      valid,
      label: `Low ${formatCardList(lowCards)} | High ${formatCardList(highCards)}`,
    } satisfies PaiGowSplit;
  });
}

function splitPriority(split: PaiGowSplit) {
  return [...split.highHand.score, ...split.lowHand.score];
}

export function recommendPaiGowSplit(cards: Card[]) {
  const validSplits = enumeratePaiGowSplits(cards).filter((split) => split.valid);

  if (validSplits.length === 0) {
    throw new Error("No valid Pai Gow split could be generated for the supplied cards.");
  }

  validSplits.sort((left, right) => compareScoreArrays(splitPriority(right), splitPriority(left)));
  return validSplits[0]!;
}

function simulateSingleSplit(split: PaiGowSplit, trials: number, commissionRate: number) {
  const deck = remainingDeck([...split.highCards, ...split.lowCards]);
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let total = 0;

  for (let trial = 0; trial < trials; trial += 1) {
    const dealerCards = sampleWithoutReplacement(deck, 7);
    const dealerSplit = recommendPaiGowSplit(dealerCards);
    const highComparison = comparePokerHands(split.highHand, dealerSplit.highHand);
    const lowComparison = comparePaiGowLowHands(split.lowHand, dealerSplit.lowHand);
    const highOutcome = highComparison > 0 ? 1 : -1;
    const lowOutcome = lowComparison > 0 ? 1 : -1;

    if (highOutcome === 1 && lowOutcome === 1) {
      wins += 1;
      total += 1 - commissionRate;
    } else if (highOutcome === -1 && lowOutcome === -1) {
      losses += 1;
      total -= 1;
    } else {
      pushes += 1;
    }
  }

  return {
    split,
    ev: total / trials,
    winProbability: wins / trials,
    lossProbability: losses / trials,
    pushProbability: pushes / trials,
    trials,
  } satisfies PaiGowSimulation;
}

export function analyzePaiGowHand(
  cards: Card[],
  trials = 240,
  commissionRate = 0.05,
) {
  const candidateSplits = enumeratePaiGowSplits(cards).filter((split) => split.valid);
  const simulations = candidateSplits
    .map((split) => simulateSingleSplit(split, trials, commissionRate))
    .sort((left, right) => {
      const evDifference = right.ev - left.ev;
      return evDifference !== 0
        ? evDifference
        : compareScoreArrays(splitPriority(right.split), splitPriority(left.split));
    });

  return {
    recommended: simulations[0]!,
    alternatives: simulations.slice(0, 3),
    notes: [
      "Monte Carlo estimate against a random seven-card dealer hand.",
      "Dealer ties count as banker wins on individual hands.",
      "The split recommender is a best-split heuristic, not a casino-specific house way implementation.",
    ],
  } satisfies PaiGowAnalysis;
}