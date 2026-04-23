import { combinations } from "./combinatorics";
import type { Card } from "./cards";

export type PokerHandCategory =
  | "high-card"
  | "pair"
  | "two-pair"
  | "three-of-a-kind"
  | "straight"
  | "flush"
  | "full-house"
  | "four-of-a-kind"
  | "straight-flush";

export interface EvaluatedPokerHand {
  category: PokerHandCategory;
  label: string;
  score: number[];
  cards: Card[];
}

export type PaiGowLowCategory = "high-card" | "pair";

export interface EvaluatedPaiGowLowHand {
  category: PaiGowLowCategory;
  label: string;
  score: number[];
  cards: Card[];
}

const CATEGORY_VALUE: Record<PokerHandCategory, number> = {
  "high-card": 0,
  pair: 1,
  "two-pair": 2,
  "three-of-a-kind": 3,
  straight: 4,
  flush: 5,
  "full-house": 6,
  "four-of-a-kind": 7,
  "straight-flush": 8,
};

const CATEGORY_LABEL: Record<PokerHandCategory, string> = {
  "high-card": "High card",
  pair: "Pair",
  "two-pair": "Two pair",
  "three-of-a-kind": "Three of a kind",
  straight: "Straight",
  flush: "Flush",
  "full-house": "Full house",
  "four-of-a-kind": "Four of a kind",
  "straight-flush": "Straight flush",
};

function buildRankGroups(cards: Card[]) {
  const counts = new Map<number, number>();

  for (const card of cards) {
    counts.set(card.rankValue, (counts.get(card.rankValue) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => {
    const countDifference = right[1] - left[1];
    return countDifference !== 0 ? countDifference : right[0] - left[0];
  });
}

function getStraightHigh(cards: Card[]) {
  const uniqueRanks = [...new Set(cards.map((card) => card.rankValue))].sort((a, b) => b - a);

  if (uniqueRanks.length !== 5) {
    return null;
  }

  const isWheel =
    uniqueRanks[0] === 14 &&
    uniqueRanks[1] === 5 &&
    uniqueRanks[2] === 4 &&
    uniqueRanks[3] === 3 &&
    uniqueRanks[4] === 2;

  if (isWheel) {
    return 5;
  }

  for (let index = 0; index < uniqueRanks.length - 1; index += 1) {
    if (uniqueRanks[index] - 1 !== uniqueRanks[index + 1]) {
      return null;
    }
  }

  return uniqueRanks[0];
}

export function evaluateFiveCardPoker(cards: Card[]): EvaluatedPokerHand {
  if (cards.length !== 5) {
    throw new Error(`Five-card evaluation requires exactly 5 cards, received ${cards.length}.`);
  }

  const sortedRanks = [...cards].map((card) => card.rankValue).sort((a, b) => b - a);
  const flush = cards.every((card) => card.suit === cards[0]?.suit);
  const straightHigh = getStraightHigh(cards);
  const groups = buildRankGroups(cards);

  if (flush && straightHigh !== null) {
    return {
      category: "straight-flush",
      label: CATEGORY_LABEL["straight-flush"],
      score: [CATEGORY_VALUE["straight-flush"], straightHigh],
      cards,
    };
  }

  if (groups[0]?.[1] === 4 && groups[1]) {
    return {
      category: "four-of-a-kind",
      label: CATEGORY_LABEL["four-of-a-kind"],
      score: [CATEGORY_VALUE["four-of-a-kind"], groups[0][0], groups[1][0]],
      cards,
    };
  }

  if (groups[0]?.[1] === 3 && groups[1]?.[1] === 2) {
    return {
      category: "full-house",
      label: CATEGORY_LABEL["full-house"],
      score: [CATEGORY_VALUE["full-house"], groups[0][0], groups[1][0]],
      cards,
    };
  }

  if (flush) {
    return {
      category: "flush",
      label: CATEGORY_LABEL.flush,
      score: [CATEGORY_VALUE.flush, ...sortedRanks],
      cards,
    };
  }

  if (straightHigh !== null) {
    return {
      category: "straight",
      label: CATEGORY_LABEL.straight,
      score: [CATEGORY_VALUE.straight, straightHigh],
      cards,
    };
  }

  if (groups[0]?.[1] === 3) {
    const kickers = groups.slice(1).map(([rank]) => rank).sort((a, b) => b - a);
    return {
      category: "three-of-a-kind",
      label: CATEGORY_LABEL["three-of-a-kind"],
      score: [CATEGORY_VALUE["three-of-a-kind"], groups[0][0], ...kickers],
      cards,
    };
  }

  if (groups[0]?.[1] === 2 && groups[1]?.[1] === 2 && groups[2]) {
    const pairRanks = [groups[0][0], groups[1][0]].sort((a, b) => b - a);
    return {
      category: "two-pair",
      label: CATEGORY_LABEL["two-pair"],
      score: [CATEGORY_VALUE["two-pair"], pairRanks[0], pairRanks[1], groups[2][0]],
      cards,
    };
  }

  if (groups[0]?.[1] === 2) {
    const kickers = groups.slice(1).map(([rank]) => rank).sort((a, b) => b - a);
    return {
      category: "pair",
      label: CATEGORY_LABEL.pair,
      score: [CATEGORY_VALUE.pair, groups[0][0], ...kickers],
      cards,
    };
  }

  return {
    category: "high-card",
    label: CATEGORY_LABEL["high-card"],
    score: [CATEGORY_VALUE["high-card"], ...sortedRanks],
    cards,
  };
}

export function comparePokerHands(left: EvaluatedPokerHand, right: EvaluatedPokerHand) {
  const maxLength = Math.max(left.score.length, right.score.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = left.score[index] ?? 0;
    const rightValue = right.score[index] ?? 0;

    if (leftValue > rightValue) {
      return 1;
    }

    if (leftValue < rightValue) {
      return -1;
    }
  }

  return 0;
}

export function bestFiveCardPoker(cards: Card[]) {
  if (cards.length < 5) {
    throw new Error(`At least 5 cards are required, received ${cards.length}.`);
  }

  let best: EvaluatedPokerHand | null = null;

  for (const combo of combinations(cards, 5)) {
    const evaluated = evaluateFiveCardPoker(combo);

    if (!best || comparePokerHands(evaluated, best) > 0) {
      best = evaluated;
    }
  }

  if (!best) {
    throw new Error("Unable to evaluate best five-card hand.");
  }

  return best;
}

export function evaluateHoldemShowdown(holeCards: Card[], boardCards: Card[]) {
  return bestFiveCardPoker([...holeCards, ...boardCards]);
}

export function evaluateOmahaShowdown(holeCards: Card[], boardCards: Card[]) {
  if (holeCards.length !== 4) {
    throw new Error(`Omaha requires exactly 4 hole cards, received ${holeCards.length}.`);
  }

  if (boardCards.length < 3 || boardCards.length > 5) {
    throw new Error(`Omaha requires 3 to 5 board cards, received ${boardCards.length}.`);
  }

  let best: EvaluatedPokerHand | null = null;

  for (const holeCombo of combinations(holeCards, 2)) {
    for (const boardCombo of combinations(boardCards, 3)) {
      const evaluated = evaluateFiveCardPoker([...holeCombo, ...boardCombo]);

      if (!best || comparePokerHands(evaluated, best) > 0) {
        best = evaluated;
      }
    }
  }

  if (!best) {
    throw new Error("Unable to evaluate Omaha showdown.");
  }

  return best;
}

export function evaluateStudShowdown(cards: Card[]) {
  return bestFiveCardPoker(cards);
}

export function evaluatePaiGowLowHand(cards: Card[]): EvaluatedPaiGowLowHand {
  if (cards.length !== 2) {
    throw new Error(`Pai Gow low hand evaluation requires 2 cards, received ${cards.length}.`);
  }

  const ranks = [...cards].map((card) => card.rankValue).sort((a, b) => b - a);
  const pair = ranks[0] === ranks[1];

  return pair
    ? {
        category: "pair",
        label: "Pair",
        score: [1, ranks[0]],
        cards,
      }
    : {
        category: "high-card",
        label: "High card",
        score: [0, ranks[0], ranks[1]],
        cards,
      };
}

export function comparePaiGowLowHands(
  left: EvaluatedPaiGowLowHand,
  right: EvaluatedPaiGowLowHand,
) {
  const maxLength = Math.max(left.score.length, right.score.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = left.score[index] ?? 0;
    const rightValue = right.score[index] ?? 0;

    if (leftValue > rightValue) {
      return 1;
    }

    if (leftValue < rightValue) {
      return -1;
    }
  }

  return 0;
}