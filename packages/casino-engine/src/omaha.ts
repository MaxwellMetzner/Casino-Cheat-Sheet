import { sampleWithoutReplacement } from "./combinatorics";
import { remainingDeck, type Card } from "./cards";
import { buildPokerEquityResult, type PokerEquityResult } from "./poker-equity";
import { comparePokerHands, evaluateOmahaShowdown } from "./poker-evaluator";

export interface OmahaSimulationInput {
  heroHoleCards: Card[];
  boardCards: Card[];
  villainHoleCards?: Card[];
  opponents?: number;
  trials?: number;
}

function omahaStageLabel(boardCount: number) {
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

function omahaFieldDescription(villainHoleCards: Card[], opponents: number) {
  if (villainHoleCards.length === 4) {
    return opponents === 1
      ? "Exact heads-up Omaha villain hand"
      : `1 exact Omaha hand plus ${opponents - 1} random opponent(s).`;
  }

  return opponents === 1 ? "Random unknown Omaha hand" : `Random ${opponents}-opponent Omaha field`;
}

export function simulateOmahaEquity({
  heroHoleCards,
  boardCards,
  villainHoleCards = [],
  opponents = villainHoleCards.length === 4 ? 1 : 1,
  trials = 3500,
}: OmahaSimulationInput): PokerEquityResult {
  if (heroHoleCards.length !== 4) {
    throw new Error(`Omaha requires exactly 4 hero hole cards, received ${heroHoleCards.length}.`);
  }

  if (villainHoleCards.length !== 0 && villainHoleCards.length !== 4) {
    throw new Error(`Omaha villain input must be 0 or 4 cards, received ${villainHoleCards.length}.`);
  }

  if (boardCards.length > 5) {
    throw new Error(`Omaha boards can contain at most 5 cards, received ${boardCards.length}.`);
  }

  const opponentCount = Math.max(opponents, villainHoleCards.length === 4 ? 1 : 1);

  const knownCards = [...heroHoleCards, ...boardCards, ...villainHoleCards];
  const deck = remainingDeck(knownCards);
  const boardNeeded = 5 - boardCards.length;
  const unknownOpponents = opponentCount - (villainHoleCards.length === 4 ? 1 : 0);
  const totalUnknownCards = boardNeeded + (villainHoleCards.length === 0 ? 4 : 0) + (unknownOpponents * 4);
  const actualTrials = totalUnknownCards === 0 ? 1 : trials;
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let equityUnits = 0;
  const categoryCounts: Partial<Record<string, number>> = {};

  for (let trial = 0; trial < actualTrials; trial += 1) {
    const usedCodes = new Set(knownCards.map((card) => card.code));
    const opponentHands: Card[][] = [];

    if (villainHoleCards.length === 4) {
      opponentHands.push(villainHoleCards);
    } else {
      const openingVillain = sampleWithoutReplacement(deck.filter((card) => !usedCodes.has(card.code)), 4);
      opponentHands.push(openingVillain);

      for (const card of openingVillain) {
        usedCodes.add(card.code);
      }
    }

    for (let index = 0; index < unknownOpponents; index += 1) {
      const sampledHand = sampleWithoutReplacement(deck.filter((card) => !usedCodes.has(card.code)), 4);
      opponentHands.push(sampledHand);

      for (const card of sampledHand) {
        usedCodes.add(card.code);
      }
    }

    const finalBoard = boardNeeded === 0
      ? boardCards
      : [...boardCards, ...sampleWithoutReplacement(deck.filter((card) => !usedCodes.has(card.code)), boardNeeded)];
    const heroHand = evaluateOmahaShowdown(heroHoleCards, finalBoard);
    categoryCounts[heroHand.category] = (categoryCounts[heroHand.category] ?? 0) + 1;

    let tiedOpponents = 0;
    let heroLost = false;

    for (const opponentHand of opponentHands) {
      const villainHand = evaluateOmahaShowdown(opponentHand, finalBoard);
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
      currentMadeHand: boardCards.length >= 3 ? evaluateOmahaShowdown(heroHoleCards, boardCards).label : undefined,
      opponentCount,
      fieldDescription: omahaFieldDescription(villainHoleCards, opponentCount),
      stageLabel: omahaStageLabel(boardCards.length),
    },
  );
}