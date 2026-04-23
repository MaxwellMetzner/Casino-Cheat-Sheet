import { sampleWithoutReplacement } from "./combinatorics";
import { remainingDeck, type Card } from "./cards";
import { buildHoldemRangeCandidates, describeHoldemRange } from "./holdem-range";
import { buildPokerEquityResult, type PokerEquityResult } from "./poker-equity";
import { comparePokerHands, evaluateHoldemShowdown } from "./poker-evaluator";

export interface HoldemSimulationInput {
  heroHoleCards: Card[];
  boardCards: Card[];
  villainHoleCards?: Card[];
  villainRange?: string;
  opponents?: number;
  trials?: number;
}

function sampleRangeCombo(rangeCandidates: Card[][], usedCodes: Set<string>) {
  const available = rangeCandidates.filter((combo) => combo.every((card) => !usedCodes.has(card.code)));

  if (available.length === 0) {
    throw new Error("No legal villain combos remain after card removal for the selected Hold'em range.");
  }

  return available[Math.floor(Math.random() * available.length)]!;
}

function holdemStageLabel(boardCount: number) {
  switch (boardCount) {
    case 0:
      return "Preflop";
    case 3:
      return "Flop";
    case 4:
      return "Turn";
    case 5:
      return "River";
    default:
      return `${boardCount} board cards`;
  }
}

function holdemFieldDescription(
  villainHoleCards: Card[],
  villainRange: string | undefined,
  opponents: number,
  rangeComboCount?: number,
) {
  const trimmedRange = villainRange?.trim();

  if (villainHoleCards.length === 2) {
    if (opponents === 1) {
      return "Exact heads-up villain hand";
    }

    return trimmedRange
      ? `1 exact hand plus ${opponents - 1} range opponent(s) from ${describeHoldemRange(trimmedRange)}.`
      : `1 exact hand plus ${opponents - 1} random opponent(s).`;
  }

  if (trimmedRange) {
    const comboCountNote = rangeComboCount ? ` (${rangeComboCount} combos)` : "";
    return `${describeHoldemRange(trimmedRange)} across ${opponents} opponent(s)${comboCountNote}.`;
  }

  return opponents === 1 ? "Random unknown villain hand" : `Random ${opponents}-opponent field`;
}

export function simulateHoldemEquity({
  heroHoleCards,
  boardCards,
  villainHoleCards = [],
  villainRange,
  opponents = villainHoleCards.length === 2 ? 1 : 1,
  trials = 3500,
}: HoldemSimulationInput): PokerEquityResult {
  if (heroHoleCards.length !== 2) {
    throw new Error(`Texas Hold'em requires exactly 2 hero hole cards, received ${heroHoleCards.length}.`);
  }

  if (villainHoleCards.length !== 0 && villainHoleCards.length !== 2) {
    throw new Error(`Texas Hold'em villain input must be 0 or 2 cards, received ${villainHoleCards.length}.`);
  }

  if (boardCards.length > 5) {
    throw new Error(`Texas Hold'em boards can contain at most 5 cards, received ${boardCards.length}.`);
  }

  const opponentCount = Math.max(opponents, villainHoleCards.length === 2 ? 1 : 1);

  const knownCards = [...heroHoleCards, ...boardCards, ...villainHoleCards];
  const deck = remainingDeck(knownCards);
  const rangeCandidates = villainRange?.trim()
    ? buildHoldemRangeCandidates(villainRange, knownCards)
    : [];
  const boardNeeded = 5 - boardCards.length;
  const unknownOpponents = opponentCount - (villainHoleCards.length === 2 ? 1 : 0);
  const totalUnknownCards = boardNeeded + (villainHoleCards.length === 0 && rangeCandidates.length === 0 ? 2 : 0) + (unknownOpponents * 2);
  const actualTrials = totalUnknownCards === 0 && rangeCandidates.length === 0 ? 1 : trials;
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let equityUnits = 0;
  const categoryCounts: Partial<Record<string, number>> = {};

  for (let trial = 0; trial < actualTrials; trial += 1) {
    const usedCodes = new Set(knownCards.map((card) => card.code));
    const opponentHands: Card[][] = [];

    if (villainHoleCards.length === 2) {
      opponentHands.push(villainHoleCards);
    }

    if (villainHoleCards.length === 0) {
      const openingVillain = rangeCandidates.length > 0
        ? sampleRangeCombo(rangeCandidates, usedCodes)
        : sampleWithoutReplacement(deck.filter((card) => !usedCodes.has(card.code)), 2);

      opponentHands.push(openingVillain);

      for (const card of openingVillain) {
        usedCodes.add(card.code);
      }
    }

    for (let index = 0; index < unknownOpponents; index += 1) {
      const sampledHand = rangeCandidates.length > 0
        ? sampleRangeCombo(rangeCandidates, usedCodes)
        : sampleWithoutReplacement(deck.filter((card) => !usedCodes.has(card.code)), 2);

      opponentHands.push(sampledHand);

      for (const card of sampledHand) {
        usedCodes.add(card.code);
      }
    }

    const finalBoard = boardNeeded === 0
      ? boardCards
      : [...boardCards, ...sampleWithoutReplacement(deck.filter((card) => !usedCodes.has(card.code)), boardNeeded)];
    const heroHand = evaluateHoldemShowdown(heroHoleCards, finalBoard);
    categoryCounts[heroHand.category] = (categoryCounts[heroHand.category] ?? 0) + 1;

    let tiedOpponents = 0;
    let heroLost = false;

    for (const opponentHand of opponentHands) {
      const villainHand = evaluateHoldemShowdown(opponentHand, finalBoard);
      const comparison = comparePokerHands(heroHand, villainHand);

      if (comparison < 0) {
        heroLost = true;
        break;
      }

      if (comparison === 0) {
        tiedOpponents += 1;
      }
    }

    if (heroLost) {
      losses += 1;
    } else if (tiedOpponents > 0) {
      ties += 1;
      equityUnits += 1 / (tiedOpponents + 1);
    } else {
      wins += 1;
      equityUnits += 1;
    }
  }

  return buildPokerEquityResult(
    actualTrials,
    wins,
    losses,
    ties,
    equityUnits,
    categoryCounts,
    {
      currentMadeHand: boardCards.length >= 3 ? evaluateHoldemShowdown(heroHoleCards, boardCards).label : undefined,
      opponentCount,
      fieldDescription: holdemFieldDescription(villainHoleCards, villainRange, opponentCount, rangeCandidates.length || undefined),
      rangeComboCount: rangeCandidates.length || undefined,
      stageLabel: holdemStageLabel(boardCards.length),
    },
  );
}