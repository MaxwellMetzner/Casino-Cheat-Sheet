export const ROULETTE_RULES = {
  american: {
    key: "american",
    label: "American",
    wheelSize: 38,
    zeros: ["0", "00"],
    note: "Standard bets sit on a 38-pocket wheel, so most wagers carry a 5.26% house edge.",
  },
  european: {
    key: "european",
    label: "European",
    wheelSize: 37,
    zeros: ["0"],
    note: "Standard bets sit on a 37-pocket wheel, dropping the normal house edge to 2.70%.",
  },
} as const;

export type RouletteKind = keyof typeof ROULETTE_RULES;

export interface RouletteBetDefinition {
  key: string;
  label: string;
  covers: number;
  payoutToOne: number;
  description: string;
  availableIn?: RouletteKind[];
}

export const ROULETTE_BETS = {
  straightUp: {
    key: "straightUp",
    label: "Straight up",
    covers: 1,
    payoutToOne: 35,
    description: "A single number.",
  },
  split: {
    key: "split",
    label: "Split",
    covers: 2,
    payoutToOne: 17,
    description: "Two adjacent numbers.",
  },
  street: {
    key: "street",
    label: "Street",
    covers: 3,
    payoutToOne: 11,
    description: "Three numbers in a row.",
  },
  corner: {
    key: "corner",
    label: "Corner",
    covers: 4,
    payoutToOne: 8,
    description: "Four numbers sharing a corner.",
  },
  sixLine: {
    key: "sixLine",
    label: "Six line",
    covers: 6,
    payoutToOne: 5,
    description: "Two adjacent streets.",
  },
  dozen: {
    key: "dozen",
    label: "Dozen / column",
    covers: 12,
    payoutToOne: 2,
    description: "Any 12-number outside grouping.",
  },
  evenMoney: {
    key: "evenMoney",
    label: "Even-money outside",
    covers: 18,
    payoutToOne: 1,
    description: "Red/black, odd/even, or high/low.",
  },
  firstFiveAmerican: {
    key: "firstFiveAmerican",
    label: "0-00-1-2-3",
    covers: 5,
    payoutToOne: 6,
    description: "The American top-line bet with a worse edge than the rest of the layout.",
    availableIn: ["american"],
  },
} as const satisfies Record<string, RouletteBetDefinition>;

export type RouletteBetKey = keyof typeof ROULETTE_BETS;

export type RoulettePocket = `${number}` | "0" | "00";

export type RouletteOutsideSelection =
  | "red"
  | "black"
  | "odd"
  | "even"
  | "low"
  | "high";

export interface RoulettePlacedBet {
  id: string;
  kind: RouletteKind;
  betKey: RouletteBetKey;
  label: string;
  stake: number;
  payoutToOne: number;
  pockets: RoulettePocket[];
  description: string;
}

export interface RouletteMergedOutcome {
  pocket: RoulettePocket;
  probability: number;
  net: number;
  winningBetIds: string[];
}

export interface RouletteMergedMetrics {
  totalStake: number;
  coveredPockets: number;
  anyHitProbability: number;
  winProbability: number;
  pushProbability: number;
  lossProbability: number;
  expectedNet: number;
  evPerUnit: number;
  houseEdge: number;
  expectedReturn: number;
  outcomes: RouletteMergedOutcome[];
}

export interface RouletteMetrics {
  pWin: number;
  pLose: number;
  evPerUnit: number;
  houseEdge: number;
  expectedReturn: number;
  covers: number;
  payoutToOne: number;
}

export interface RouletteComparisonRow extends RouletteMetrics {
  key: RouletteBetKey;
  label: string;
  description: string;
}

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9,
  12, 14, 16, 18,
  19, 21, 23, 25, 27,
  30, 32, 34, 36,
]);

function buildNumberPockets() {
  return Array.from({ length: 36 }, (_, index) => String(index + 1) as RoulettePocket);
}

function buildWheelPockets(kind: RouletteKind): RoulettePocket[] {
  return kind === "american"
    ? ["0", "00", ...buildNumberPockets()]
    : ["0", ...buildNumberPockets()];
}

function sortPockets(kind: RouletteKind, pockets: RoulettePocket[]) {
  const wheelOrder = buildWheelPockets(kind);
  const indexByPocket = new Map(wheelOrder.map((pocket, index) => [pocket, index]));

  return [...new Set(pockets)].sort((left, right) => (indexByPocket.get(left) ?? 0) - (indexByPocket.get(right) ?? 0));
}

function assertNumericPocket(pocket: RoulettePocket, label: string) {
  const value = Number(pocket);

  if (!Number.isInteger(value) || value < 1 || value > 36) {
    throw new Error(`${label} must be a roulette number from 1 to 36.`);
  }

  return value;
}

function buildPlacedBet(
  kind: RouletteKind,
  betKey: RouletteBetKey,
  label: string,
  pockets: RoulettePocket[],
  stake = 1,
) {
  const definition = ROULETTE_BETS[betKey] as RouletteBetDefinition;

  if (definition.availableIn && !definition.availableIn.includes(kind)) {
    throw new Error(`${definition.label} is not available on ${ROULETTE_RULES[kind].label} roulette.`);
  }

  if (!Number.isFinite(stake) || stake <= 0) {
    throw new Error(`Roulette stake must be a positive number, received ${stake}.`);
  }

  return {
    id: `${betKey}:${label}`,
    kind,
    betKey,
    label,
    stake,
    payoutToOne: definition.payoutToOne,
    pockets: sortPockets(kind, pockets),
    description: definition.description,
  } satisfies RoulettePlacedBet;
}

function buildColumnPockets(column: 1 | 2 | 3) {
  return Array.from({ length: 12 }, (_, index) => String((index * 3) + column) as RoulettePocket);
}

function buildDozenPockets(dozen: 1 | 2 | 3) {
  const start = ((dozen - 1) * 12) + 1;
  return Array.from({ length: 12 }, (_, index) => String(start + index) as RoulettePocket);
}

function buildStreetPockets(rowStart: number) {
  return [rowStart, rowStart + 1, rowStart + 2].map((value) => String(value) as RoulettePocket);
}

function buildSixLinePockets(rowStart: number) {
  return [
    rowStart,
    rowStart + 1,
    rowStart + 2,
    rowStart + 3,
    rowStart + 4,
    rowStart + 5,
  ].map((value) => String(value) as RoulettePocket);
}

function buildCornerPockets(topLeft: number) {
  return [
    topLeft,
    topLeft + 1,
    topLeft + 3,
    topLeft + 4,
  ].map((value) => String(value) as RoulettePocket);
}

function buildOutsidePockets(selection: RouletteOutsideSelection) {
  const numbers = Array.from({ length: 36 }, (_, index) => index + 1);

  switch (selection) {
    case "red":
      return numbers.filter((number) => RED_NUMBERS.has(number)).map((number) => String(number) as RoulettePocket);
    case "black":
      return numbers.filter((number) => !RED_NUMBERS.has(number)).map((number) => String(number) as RoulettePocket);
    case "odd":
      return numbers.filter((number) => number % 2 === 1).map((number) => String(number) as RoulettePocket);
    case "even":
      return numbers.filter((number) => number % 2 === 0).map((number) => String(number) as RoulettePocket);
    case "low":
      return numbers.filter((number) => number <= 18).map((number) => String(number) as RoulettePocket);
    case "high":
      return numbers.filter((number) => number >= 19).map((number) => String(number) as RoulettePocket);
  }
}

export function buildRouletteWheelPockets(kind: RouletteKind) {
  return buildWheelPockets(kind);
}

export function roulettePocketColor(pocket: RoulettePocket) {
  if (pocket === "0" || pocket === "00") {
    return "green" as const;
  }

  return RED_NUMBERS.has(Number(pocket)) ? "red" as const : "black" as const;
}

export function createRouletteStraightUpBet(kind: RouletteKind, pocket: RoulettePocket, stake = 1) {
  if (!buildWheelPockets(kind).includes(pocket)) {
    throw new Error(`${pocket} is not available on ${ROULETTE_RULES[kind].label} roulette.`);
  }

  return buildPlacedBet(kind, "straightUp", pocket, [pocket], stake);
}

export function createRouletteSplitBet(
  kind: RouletteKind,
  firstPocket: RoulettePocket,
  secondPocket: RoulettePocket,
  stake = 1,
) {
  const first = assertNumericPocket(firstPocket, "Split start");
  const second = assertNumericPocket(secondPocket, "Split end");
  const difference = Math.abs(first - second);
  const sameStreet = Math.ceil(first / 3) === Math.ceil(second / 3);
  const sameColumn = first % 3 === second % 3;

  if (!((difference === 1 && sameStreet) || (difference === 3 && sameColumn))) {
    throw new Error(`Numbers ${firstPocket} and ${secondPocket} do not form a legal split.`);
  }

  const ordered = [first, second].sort((left, right) => left - right);
  return buildPlacedBet(kind, "split", `${ordered[0]}-${ordered[1]}`, [String(ordered[0]) as RoulettePocket, String(ordered[1]) as RoulettePocket], stake);
}

export function createRouletteStreetBet(kind: RouletteKind, rowStart: number, stake = 1) {
  if (rowStart < 1 || rowStart > 34 || rowStart % 3 !== 1) {
    throw new Error(`Street start must be 1, 4, 7, ... 34. Received ${rowStart}.`);
  }

  return buildPlacedBet(kind, "street", `${rowStart}-${rowStart + 2}`, buildStreetPockets(rowStart), stake);
}

export function createRouletteCornerBet(kind: RouletteKind, topLeft: number, stake = 1) {
  if (topLeft < 1 || topLeft > 32 || topLeft % 3 === 0) {
    throw new Error(`Corner top-left must be a legal interior number. Received ${topLeft}.`);
  }

  return buildPlacedBet(kind, "corner", `${topLeft}-${topLeft + 1}-${topLeft + 3}-${topLeft + 4}`, buildCornerPockets(topLeft), stake);
}

export function createRouletteSixLineBet(kind: RouletteKind, rowStart: number, stake = 1) {
  if (rowStart < 1 || rowStart > 31 || rowStart % 3 !== 1) {
    throw new Error(`Six-line start must be 1, 4, 7, ... 31. Received ${rowStart}.`);
  }

  return buildPlacedBet(kind, "sixLine", `${rowStart}-${rowStart + 5}`, buildSixLinePockets(rowStart), stake);
}

export function createRouletteDozenBet(kind: RouletteKind, dozen: 1 | 2 | 3, stake = 1) {
  return buildPlacedBet(kind, "dozen", `${((dozen - 1) * 12) + 1}-${dozen * 12}`, buildDozenPockets(dozen), stake);
}

export function createRouletteColumnBet(kind: RouletteKind, column: 1 | 2 | 3, stake = 1) {
  return buildPlacedBet(kind, "dozen", `Column ${column}`, buildColumnPockets(column), stake);
}

export function createRouletteOutsideBet(kind: RouletteKind, selection: RouletteOutsideSelection, stake = 1) {
  const labelBySelection: Record<RouletteOutsideSelection, string> = {
    red: "Red",
    black: "Black",
    odd: "Odd",
    even: "Even",
    low: "1-18",
    high: "19-36",
  };

  return buildPlacedBet(kind, "evenMoney", labelBySelection[selection], buildOutsidePockets(selection), stake);
}

export function createRouletteFirstFiveBet(stake = 1) {
  return buildPlacedBet("american", "firstFiveAmerican", "0-00-1-2-3", ["0", "00", "1", "2", "3"], stake);
}

export function analyzeRouletteBets(kind: RouletteKind, bets: RoulettePlacedBet[]): RouletteMergedMetrics {
  if (bets.length === 0) {
    return {
      totalStake: 0,
      coveredPockets: 0,
      anyHitProbability: 0,
      winProbability: 0,
      pushProbability: 0,
      lossProbability: 0,
      expectedNet: 0,
      evPerUnit: 0,
      houseEdge: 0,
      expectedReturn: 1,
      outcomes: buildWheelPockets(kind).map((pocket) => ({
        pocket,
        probability: 1 / ROULETTE_RULES[kind].wheelSize,
        net: 0,
        winningBetIds: [],
      })),
    };
  }

  const wheelPockets = buildWheelPockets(kind);
  const totalStake = bets.reduce((total, bet) => total + bet.stake, 0);
  const outcomes = wheelPockets.map((pocket) => {
    const winningBets = bets.filter((bet) => bet.pockets.includes(pocket));
    const winnings = winningBets.reduce((total, bet) => total + (bet.stake * bet.payoutToOne), 0);
    const losingStake = bets
      .filter((bet) => !bet.pockets.includes(pocket))
      .reduce((total, bet) => total + bet.stake, 0);

    return {
      pocket,
      probability: 1 / ROULETTE_RULES[kind].wheelSize,
      net: winnings - losingStake,
      winningBetIds: winningBets.map((bet) => bet.id),
    } satisfies RouletteMergedOutcome;
  });

  const expectedNet = outcomes.reduce((total, outcome) => total + (outcome.net * outcome.probability), 0);
  const coveredPockets = new Set(bets.flatMap((bet) => bet.pockets)).size;
  const anyHitProbability = outcomes
    .filter((outcome) => outcome.winningBetIds.length > 0)
    .reduce((total, outcome) => total + outcome.probability, 0);
  const winProbability = outcomes
    .filter((outcome) => outcome.net > 0)
    .reduce((total, outcome) => total + outcome.probability, 0);
  const pushProbability = outcomes
    .filter((outcome) => outcome.net === 0)
    .reduce((total, outcome) => total + outcome.probability, 0);
  const lossProbability = 1 - winProbability - pushProbability;
  const evPerUnit = expectedNet / totalStake;

  return {
    totalStake,
    coveredPockets,
    anyHitProbability,
    winProbability,
    pushProbability,
    lossProbability,
    expectedNet,
    evPerUnit,
    houseEdge: -evPerUnit,
    expectedReturn: 1 + evPerUnit,
    outcomes,
  };
}

export function listRouletteBets(kind: RouletteKind): RouletteBetDefinition[] {
  return Object.values(
    ROULETTE_BETS as Record<RouletteBetKey, RouletteBetDefinition>,
  ).filter((bet) => !bet.availableIn || bet.availableIn.includes(kind));
}

export function rouletteMetrics(
  kind: RouletteKind,
  betKey: RouletteBetKey,
): RouletteMetrics {
  const rule = ROULETTE_RULES[kind];
  const bet = (ROULETTE_BETS as Record<RouletteBetKey, RouletteBetDefinition>)[betKey];

  if (bet.availableIn && !bet.availableIn.includes(kind)) {
    throw new Error(`${bet.label} is not available on ${rule.label} roulette.`);
  }

  const pWin = bet.covers / rule.wheelSize;
  const pLose = 1 - pWin;
  const evPerUnit = pWin * bet.payoutToOne - pLose;

  return {
    pWin,
    pLose,
    evPerUnit,
    houseEdge: -evPerUnit,
    expectedReturn: 1 + evPerUnit,
    covers: bet.covers,
    payoutToOne: bet.payoutToOne,
  };
}

export function buildRouletteComparison(
  kind: RouletteKind,
): RouletteComparisonRow[] {
  return listRouletteBets(kind).map((bet) => ({
    key: bet.key as RouletteBetKey,
    label: bet.label,
    description: bet.description,
    ...rouletteMetrics(kind, bet.key as RouletteBetKey),
  }));
}