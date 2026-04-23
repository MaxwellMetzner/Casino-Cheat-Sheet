import { combinations } from "./combinatorics";
import { remainingDeck, type Card } from "./cards";

export type ThreeCardCategory =
  | "high-card"
  | "pair"
  | "flush"
  | "straight"
  | "three-of-a-kind"
  | "straight-flush";

export interface ThreeCardHand {
  category: ThreeCardCategory;
  label: string;
  score: number[];
  cards: Card[];
}

export interface ThreeCardPokerAnalysis {
  hand: ThreeCardHand;
  optimalAction: "play" | "fold";
  meetsRaiseThreshold: boolean;
  playEv: number;
  foldEv: number;
  anteBonusPayout: number;
  pairPlusPayout: number;
  dealerQualifyProbability: number;
  playerWinProbability: number;
  dealerWinProbability: number;
  pushProbability: number;
}

const CATEGORY_VALUE: Record<ThreeCardCategory, number> = {
  "high-card": 0,
  pair: 1,
  flush: 2,
  straight: 3,
  "three-of-a-kind": 4,
  "straight-flush": 5,
};

const ANTE_BONUS: Partial<Record<ThreeCardCategory, number>> = {
  straight: 1,
  "three-of-a-kind": 4,
  "straight-flush": 5,
};

const PAIR_PLUS: Partial<Record<ThreeCardCategory, number>> = {
  pair: 1,
  flush: 3,
  straight: 6,
  "three-of-a-kind": 30,
  "straight-flush": 40,
};

function getStraightHigh(ranks: number[]) {
  const sorted = [...ranks].sort((a, b) => b - a);

  if (sorted[0] === 14 && sorted[1] === 3 && sorted[2] === 2) {
    return 3;
  }

  return sorted[0] - 1 === sorted[1] && sorted[1] - 1 === sorted[2] ? sorted[0] : null;
}

export function evaluateThreeCardPokerHand(cards: Card[]): ThreeCardHand {
  if (cards.length !== 3) {
    throw new Error(`Three Card Poker requires exactly 3 cards, received ${cards.length}.`);
  }

  const ranks = [...cards].map((card) => card.rankValue).sort((a, b) => b - a);
  const counts = new Map<number, number>();

  for (const rank of ranks) {
    counts.set(rank, (counts.get(rank) ?? 0) + 1);
  }

  const groups = [...counts.entries()].sort((left, right) => {
    const countDifference = right[1] - left[1];
    return countDifference !== 0 ? countDifference : right[0] - left[0];
  });
  const flush = cards.every((card) => card.suit === cards[0]?.suit);
  const straightHigh = getStraightHigh(ranks);

  if (flush && straightHigh !== null) {
    return {
      category: "straight-flush",
      label: "Straight flush",
      score: [CATEGORY_VALUE["straight-flush"], straightHigh],
      cards,
    };
  }

  if (groups[0]?.[1] === 3) {
    return {
      category: "three-of-a-kind",
      label: "Three of a kind",
      score: [CATEGORY_VALUE["three-of-a-kind"], groups[0][0]],
      cards,
    };
  }

  if (straightHigh !== null) {
    return {
      category: "straight",
      label: "Straight",
      score: [CATEGORY_VALUE.straight, straightHigh],
      cards,
    };
  }

  if (flush) {
    return {
      category: "flush",
      label: "Flush",
      score: [CATEGORY_VALUE.flush, ...ranks],
      cards,
    };
  }

  if (groups[0]?.[1] === 2) {
    return {
      category: "pair",
      label: "Pair",
      score: [CATEGORY_VALUE.pair, groups[0][0], groups[1]![0]],
      cards,
    };
  }

  return {
    category: "high-card",
    label: "High card",
    score: [CATEGORY_VALUE["high-card"], ...ranks],
    cards,
  };
}

export function compareThreeCardHands(left: ThreeCardHand, right: ThreeCardHand) {
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

function dealerQualifies(hand: ThreeCardHand) {
  return hand.category !== "high-card" || hand.score[1]! >= 12;
}

export function meetsThreeCardRaiseThreshold(hand: ThreeCardHand) {
  if (hand.category !== "high-card") {
    return true;
  }

  const threshold = [CATEGORY_VALUE["high-card"], 12, 6, 4];

  for (let index = 0; index < threshold.length; index += 1) {
    const current = hand.score[index] ?? 0;
    const target = threshold[index] ?? 0;

    if (current > target) {
      return true;
    }

    if (current < target) {
      return false;
    }
  }

  return true;
}

export function analyzeThreeCardPokerHand(playerCards: Card[]): ThreeCardPokerAnalysis {
  const playerHand = evaluateThreeCardPokerHand(playerCards);
  const deck = remainingDeck(playerCards);
  const anteBonusPayout = ANTE_BONUS[playerHand.category] ?? 0;
  const pairPlusPayout = PAIR_PLUS[playerHand.category] ?? 0;
  let total = 0;
  let playReturn = 0;
  let dealerQualify = 0;
  let playerWins = 0;
  let dealerWins = 0;
  let pushes = 0;

  for (const dealerCards of combinations(deck, 3)) {
    total += 1;
    const dealerHand = evaluateThreeCardPokerHand(dealerCards);
    const comparison = compareThreeCardHands(playerHand, dealerHand);

    if (dealerQualifies(dealerHand)) {
      dealerQualify += 1;

      if (comparison > 0) {
        playerWins += 1;
        playReturn += 2 + anteBonusPayout;
      } else if (comparison < 0) {
        dealerWins += 1;
        playReturn -= 2;
      } else {
        pushes += 1;
        playReturn += anteBonusPayout;
      }
    } else {
      playerWins += 1;
      playReturn += 1 + anteBonusPayout;
    }
  }

  const playEv = playReturn / total;
  const foldEv = -1;

  return {
    hand: playerHand,
    optimalAction: playEv >= foldEv ? "play" : "fold",
    meetsRaiseThreshold: meetsThreeCardRaiseThreshold(playerHand),
    playEv,
    foldEv,
    anteBonusPayout,
    pairPlusPayout,
    dealerQualifyProbability: dealerQualify / total,
    playerWinProbability: playerWins / total,
    dealerWinProbability: dealerWins / total,
    pushProbability: pushes / total,
  };
}