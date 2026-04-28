import { sampleWithoutReplacement } from "./combinatorics";
import { remainingDeck, type Card } from "./cards";
import { buildPokerEquityResult, type PokerEquityResult } from "./poker-equity";
import { comparePokerHands, evaluateStudShowdown } from "./poker-evaluator";

export interface SevenCardStudSimulationInput {
  heroCards: Card[];
  villainCards?: Card[];
  deadCards?: Card[];
  opponents?: number;
  trials?: number;
}

function studStageLabel(cardCount: number) {
  const labels: Record<number, string> = {
    3: "Third street",
    4: "Fourth street",
    5: "Fifth street",
    6: "Sixth street",
    7: "Seventh street",
  };

  return labels[cardCount] ?? `${cardCount}-card stud state`;
}

function studFieldDescription(villainCards: Card[], deadCards: Card[], opponents: number) {
  const deadCardNote = deadCards.length > 0 ? ` with ${deadCards.length} dead card(s) removed` : "";

  if (villainCards.length > 0) {
    return opponents === 1
      ? `Exact stud villain hand${deadCardNote}`
      : `1 exact stud hand plus ${opponents - 1} random opponent(s)${deadCardNote}`;
  }

  return opponents === 1
    ? `Random stud opponent${deadCardNote}`
    : `Random ${opponents}-opponent stud field${deadCardNote}`;
}

export function simulateSevenCardStudEquity({
  heroCards,
  villainCards = [],
  deadCards = [],
  opponents = villainCards.length > 0 ? 1 : 1,
  trials = 3500,
}: SevenCardStudSimulationInput): PokerEquityResult {
  if (heroCards.length < 3 || heroCards.length > 7) {
    throw new Error(`Seven-card stud hero input must contain 3 to 7 cards, received ${heroCards.length}.`);
  }

  if (villainCards.length !== 0 && (villainCards.length < 3 || villainCards.length > 7)) {
    throw new Error(`Seven-card stud villain input must contain 0 or 3 to 7 cards, received ${villainCards.length}.`);
  }

  const opponentCount = Math.max(opponents, villainCards.length > 0 ? 1 : 1);

  const knownCards = [...heroCards, ...villainCards, ...deadCards];
  const deck = remainingDeck(knownCards);
  const heroNeeded = 7 - heroCards.length;
  const knownVillainNeeded = villainCards.length === 0 ? 0 : 7 - villainCards.length;
  const additionalOpponents = Math.max(0, opponentCount - 1);
  const totalUnknownCards = heroNeeded + knownVillainNeeded + (villainCards.length === 0 ? 7 : 0) + (additionalOpponents * 7);
  const actualTrials = totalUnknownCards === 0 ? 1 : trials;
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let equityUnits = 0;
  const categoryCounts: Partial<Record<string, number>> = {};

  for (let trial = 0; trial < actualTrials; trial += 1) {
    const usedCodes = new Set(knownCards.map((card) => card.code));
    const finalHero = heroNeeded === 0
      ? heroCards
      : [...heroCards, ...sampleWithoutReplacement(deck.filter((card) => !usedCodes.has(card.code)), heroNeeded)];

    for (const card of finalHero) {
      usedCodes.add(card.code);
    }

    const opponentHands: Card[][] = [];

    if (villainCards.length > 0) {
      const completedVillain = knownVillainNeeded === 0
        ? villainCards
        : [...villainCards, ...sampleWithoutReplacement(deck.filter((card) => !usedCodes.has(card.code)), knownVillainNeeded)];

      opponentHands.push(completedVillain);

      for (const card of completedVillain) {
        usedCodes.add(card.code);
      }
    } else {
      const sampledVillain = sampleWithoutReplacement(deck.filter((card) => !usedCodes.has(card.code)), 7);
      opponentHands.push(sampledVillain);

      for (const card of sampledVillain) {
        usedCodes.add(card.code);
      }
    }

    for (let index = 0; index < additionalOpponents; index += 1) {
      const sampledOpponent = sampleWithoutReplacement(deck.filter((card) => !usedCodes.has(card.code)), 7);
      opponentHands.push(sampledOpponent);

      for (const card of sampledOpponent) {
        usedCodes.add(card.code);
      }
    }

    const heroHand = evaluateStudShowdown(finalHero);
    categoryCounts[heroHand.category] = (categoryCounts[heroHand.category] ?? 0) + 1;

    let tiedOpponents = 0;
    let heroLost = false;

    for (const opponentHand of opponentHands) {
      const villainHand = evaluateStudShowdown(opponentHand);
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
      currentMadeHand: heroCards.length >= 5 ? evaluateStudShowdown(heroCards).label : undefined,
      opponentCount,
      fieldDescription: studFieldDescription(villainCards, deadCards, opponentCount),
      stageLabel: studStageLabel(heroCards.length),
    },
  );
}
