import { combinations } from "./combinatorics";
import { remainingDeck, type Card } from "./cards";
import { evaluateFiveCardPoker } from "./poker-evaluator";

export type VideoPokerRank =
  | "nothing"
  | "jacks-or-better"
  | "two-pair"
  | "three-of-a-kind"
  | "straight"
  | "flush"
  | "full-house"
  | "four-of-a-kind"
  | "straight-flush"
  | "royal-flush";

export interface VideoPokerHoldOption {
  mask: number;
  keptCards: Card[];
  discarded: number;
  ev: number;
  expectedReturn: number;
  distribution: Partial<Record<VideoPokerRank, number>>;
}

export interface VideoPokerAnalysis {
  initialRank: VideoPokerRank;
  best: VideoPokerHoldOption;
  contenders: VideoPokerHoldOption[];
}

export const JACKS_OR_BETTER_PAYTABLE: Record<VideoPokerRank, number> = {
  nothing: 0,
  "jacks-or-better": 1,
  "two-pair": 2,
  "three-of-a-kind": 3,
  straight: 4,
  flush: 6,
  "full-house": 9,
  "four-of-a-kind": 25,
  "straight-flush": 50,
  "royal-flush": 800,
};

function isRoyalFlush(cards: Card[]) {
  const ranks = [...cards].map((card) => card.rankValue).sort((a, b) => b - a);
  return ranks.join(",") === "14,13,12,11,10";
}

export function classifyVideoPokerHand(cards: Card[]): VideoPokerRank {
  const evaluated = evaluateFiveCardPoker(cards);

  switch (evaluated.category) {
    case "straight-flush":
      return isRoyalFlush(cards) ? "royal-flush" : "straight-flush";
    case "four-of-a-kind":
      return "four-of-a-kind";
    case "full-house":
      return "full-house";
    case "flush":
      return "flush";
    case "straight":
      return "straight";
    case "three-of-a-kind":
      return "three-of-a-kind";
    case "two-pair":
      return "two-pair";
    case "pair":
      return evaluated.score[1]! >= 11 ? "jacks-or-better" : "nothing";
    default:
      return "nothing";
  }
}

export function analyzeVideoPokerHand(
  cards: Card[],
  paytable: Record<VideoPokerRank, number> = JACKS_OR_BETTER_PAYTABLE,
  contenderCount = 3,
): VideoPokerAnalysis {
  if (cards.length !== 5) {
    throw new Error(`Video poker analysis requires 5 cards, received ${cards.length}.`);
  }

  const deck = remainingDeck(cards);
  const options: VideoPokerHoldOption[] = [];

  for (let mask = 0; mask < 32; mask += 1) {
    const keptCards = cards.filter((_, index) => ((mask >> index) & 1) === 1);
    const discarded = 5 - keptCards.length;
    const counts: Partial<Record<VideoPokerRank, number>> = {};
    let totalPayout = 0;
    let outcomes = 0;

    for (const draw of combinations(deck, discarded)) {
      const finalHand = [...keptCards, ...draw];
      const rank = classifyVideoPokerHand(finalHand);
      counts[rank] = (counts[rank] ?? 0) + 1;
      totalPayout += paytable[rank] ?? 0;
      outcomes += 1;
    }

    const distribution = Object.fromEntries(
      Object.entries(counts).map(([rank, count]) => [rank, count / outcomes]),
    ) as Partial<Record<VideoPokerRank, number>>;

    options.push({
      mask,
      keptCards,
      discarded,
      ev: totalPayout / outcomes,
      expectedReturn: 1 + totalPayout / outcomes,
      distribution,
    });
  }

  options.sort((left, right) => right.ev - left.ev);

  return {
    initialRank: classifyVideoPokerHand(cards),
    best: options[0]!,
    contenders: options.slice(0, contenderCount),
  };
}