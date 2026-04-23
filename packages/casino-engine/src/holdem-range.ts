import { combinations } from "./combinatorics";
import { RANKS, remainingDeck, type Card, type Rank } from "./cards";

type SuitedConstraint = "any" | "offsuit" | "suited";
type HoldemRangeMatcher = (cards: Card[]) => boolean;

const RANK_INDEX = Object.fromEntries(
  RANKS.map((rank, index) => [rank, index]),
) as Record<Rank, number>;

function normalizeRankOrder(left: Rank, right: Rank): [Rank, Rank] {
  return RANK_INDEX[left] >= RANK_INDEX[right] ? [left, right] : [right, left];
}

function comboDescriptor(cards: Card[]) {
  const [highCard, lowCard] = [...cards].sort((left, right) => right.rankValue - left.rankValue);

  return {
    highRank: highCard!.rank,
    lowRank: lowCard!.rank,
    suited: highCard!.suit === lowCard!.suit,
    pair: highCard!.rank === lowCard!.rank,
  };
}

function buildPairMatcher(startRank: Rank, endRank?: Rank): HoldemRangeMatcher {
  const startIndex = RANK_INDEX[startRank];
  const endIndex = endRank === undefined ? startIndex : RANK_INDEX[endRank];
  const minIndex = Math.min(startIndex, endIndex);
  const maxIndex = Math.max(startIndex, endIndex);

  return (cards) => {
    const descriptor = comboDescriptor(cards);
    return descriptor.pair && RANK_INDEX[descriptor.highRank] >= minIndex && RANK_INDEX[descriptor.highRank] <= maxIndex;
  };
}

function buildUnpairedMatcher(
  highRank: Rank,
  lowRank: Rank,
  suitedConstraint: SuitedConstraint,
): HoldemRangeMatcher {
  return (cards) => {
    const descriptor = comboDescriptor(cards);

    if (descriptor.pair) {
      return false;
    }

    if (descriptor.highRank !== highRank || descriptor.lowRank !== lowRank) {
      return false;
    }

    if (suitedConstraint === "suited") {
      return descriptor.suited;
    }

    if (suitedConstraint === "offsuit") {
      return !descriptor.suited;
    }

    return true;
  };
}

function buildUnpairedPlusMatcher(
  anchorHigh: Rank,
  anchorLow: Rank,
  suitedConstraint: SuitedConstraint,
): HoldemRangeMatcher {
  const highIndex = RANK_INDEX[anchorHigh];
  const lowStartIndex = RANK_INDEX[anchorLow];

  return (cards) => {
    const descriptor = comboDescriptor(cards);

    if (descriptor.pair || descriptor.highRank !== anchorHigh) {
      return false;
    }

    const descriptorLowIndex = RANK_INDEX[descriptor.lowRank];

    if (descriptorLowIndex < lowStartIndex || descriptorLowIndex >= highIndex) {
      return false;
    }

    if (suitedConstraint === "suited") {
      return descriptor.suited;
    }

    if (suitedConstraint === "offsuit") {
      return !descriptor.suited;
    }

    return true;
  };
}

function buildUnpairedRangeMatcher(
  leftHigh: Rank,
  leftLow: Rank,
  rightHigh: Rank,
  rightLow: Rank,
  suitedConstraint: SuitedConstraint,
): HoldemRangeMatcher {
  const leftHighIndex = RANK_INDEX[leftHigh];
  const leftLowIndex = RANK_INDEX[leftLow];
  const rightHighIndex = RANK_INDEX[rightHigh];
  const rightLowIndex = RANK_INDEX[rightLow];

  if (leftHigh === rightHigh) {
    const minLow = Math.min(leftLowIndex, rightLowIndex);
    const maxLow = Math.max(leftLowIndex, rightLowIndex);

    return (cards) => {
      const descriptor = comboDescriptor(cards);

      if (descriptor.pair || descriptor.highRank !== leftHigh) {
        return false;
      }

      const descriptorLowIndex = RANK_INDEX[descriptor.lowRank];

      if (descriptorLowIndex < minLow || descriptorLowIndex > maxLow) {
        return false;
      }

      if (suitedConstraint === "suited") {
        return descriptor.suited;
      }

      if (suitedConstraint === "offsuit") {
        return !descriptor.suited;
      }

      return true;
    };
  }

  if (leftLow === rightLow) {
    const minHigh = Math.min(leftHighIndex, rightHighIndex);
    const maxHigh = Math.max(leftHighIndex, rightHighIndex);

    return (cards) => {
      const descriptor = comboDescriptor(cards);

      if (descriptor.pair || descriptor.lowRank !== leftLow) {
        return false;
      }

      const descriptorHighIndex = RANK_INDEX[descriptor.highRank];

      if (descriptorHighIndex < minHigh || descriptorHighIndex > maxHigh) {
        return false;
      }

      if (suitedConstraint === "suited") {
        return descriptor.suited;
      }

      if (suitedConstraint === "offsuit") {
        return !descriptor.suited;
      }

      return true;
    };
  }

  throw new Error(
    `Unsupported Hold'em range token: ${leftHigh}${leftLow}-${rightHigh}${rightLow}. Use pair ranges, plus ranges, or connectors that share one rank.`,
  );
}

function parseSuitedConstraint(rawConstraint?: string): SuitedConstraint {
  if (rawConstraint === "s") {
    return "suited";
  }

  if (rawConstraint === "o") {
    return "offsuit";
  }

  return "any";
}

function parseHoldemRangeToken(token: string): HoldemRangeMatcher {
  if (token.toLowerCase() === "random") {
    return () => true;
  }

  const pairRange = token.match(/^([2-9TJQKA])\1-([2-9TJQKA])\2$/i);

  if (pairRange) {
    return buildPairMatcher(pairRange[1]!.toUpperCase() as Rank, pairRange[2]!.toUpperCase() as Rank);
  }

  const pairPlus = token.match(/^([2-9TJQKA])\1\+$/i);

  if (pairPlus) {
    return buildPairMatcher(pairPlus[1]!.toUpperCase() as Rank, "A");
  }

  const exactPair = token.match(/^([2-9TJQKA])\1$/i);

  if (exactPair) {
    return buildPairMatcher(exactPair[1]!.toUpperCase() as Rank);
  }

  const unpairedRange = token.match(/^([2-9TJQKA])([2-9TJQKA])(s|o)?-([2-9TJQKA])([2-9TJQKA])(s|o)?$/i);

  if (unpairedRange) {
    const leftConstraint = parseSuitedConstraint(unpairedRange[3]);
    const rightConstraint = parseSuitedConstraint(unpairedRange[6]);

    if (leftConstraint !== rightConstraint) {
      throw new Error(`Unsupported Hold'em range token: ${token}. Mixed suitedness ranges are ambiguous.`);
    }

    const [leftHigh, leftLow] = normalizeRankOrder(
      unpairedRange[1]!.toUpperCase() as Rank,
      unpairedRange[2]!.toUpperCase() as Rank,
    );
    const [rightHigh, rightLow] = normalizeRankOrder(
      unpairedRange[4]!.toUpperCase() as Rank,
      unpairedRange[5]!.toUpperCase() as Rank,
    );

    if (leftHigh === leftLow || rightHigh === rightLow) {
      throw new Error(`Unsupported Hold'em range token: ${token}. Pair ranges must use the pair shorthand.`);
    }

    return buildUnpairedRangeMatcher(leftHigh, leftLow, rightHigh, rightLow, leftConstraint);
  }

  const unpairedPlus = token.match(/^([2-9TJQKA])([2-9TJQKA])(s|o)?\+$/i);

  if (unpairedPlus) {
    const [highRank, lowRank] = normalizeRankOrder(
      unpairedPlus[1]!.toUpperCase() as Rank,
      unpairedPlus[2]!.toUpperCase() as Rank,
    );

    if (highRank === lowRank) {
      throw new Error(`Unsupported Hold'em range token: ${token}. Pair plus ranges should use the pair shorthand.`);
    }

    return buildUnpairedPlusMatcher(highRank, lowRank, parseSuitedConstraint(unpairedPlus[3]));
  }

  const exactUnpaired = token.match(/^([2-9TJQKA])([2-9TJQKA])(s|o)?$/i);

  if (exactUnpaired) {
    const [highRank, lowRank] = normalizeRankOrder(
      exactUnpaired[1]!.toUpperCase() as Rank,
      exactUnpaired[2]!.toUpperCase() as Rank,
    );

    if (highRank === lowRank) {
      throw new Error(`Unsupported Hold'em range token: ${token}. Pairs must use the pair shorthand.`);
    }

    return buildUnpairedMatcher(highRank, lowRank, parseSuitedConstraint(exactUnpaired[3]));
  }

  throw new Error(`Unsupported Hold'em range token: ${token}. Try forms like 22+, AJs+, KQo, or ATs-AQs.`);
}

export function describeHoldemRange(rangeText: string) {
  return rangeText.trim() || "random";
}

export function buildHoldemRangeCandidates(rangeText: string, excludedCards: Card[]) {
  const trimmed = rangeText.trim();
  const deck = remainingDeck(excludedCards);
  const allCombos = [...combinations(deck, 2)];

  if (!trimmed || trimmed.toLowerCase() === "random") {
    return allCombos;
  }

  const tokens = trimmed.split(/[\s,]+/).filter(Boolean);
  const matchers = tokens.map(parseHoldemRangeToken);
  const candidates = allCombos.filter((combo) => matchers.some((matcher) => matcher(combo)));

  if (candidates.length === 0) {
    throw new Error(`Hold'em range \"${rangeText}\" produced no legal combos after card removal.`);
  }

  return candidates;
}