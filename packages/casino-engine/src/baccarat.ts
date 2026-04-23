export interface BaccaratWagerDefinition {
  key: "player" | "banker" | "tie";
  label: string;
  payout: string;
  payoutToOne: number;
  houseEdge: number;
  note: string;
}

export interface BaccaratBetMetrics {
  key: BaccaratWagerDefinition["key"];
  label: string;
  payoutToOne: number;
  winProbability: number;
  loseProbability: number;
  pushProbability: number;
  evPerUnit: number;
  houseEdge: number;
  expectedReturn: number;
}

export interface BaccaratDecision {
  naturalStopsRound: boolean;
  playerDraws: boolean;
  bankerDraws: boolean | null;
  playerInstruction: string;
  bankerInstruction: string;
}

export interface BankerDrawTableRow {
  bankerTotal: number;
  playerStands: boolean;
  byPlayerThirdCard: Array<{
    playerThirdCard: number;
    bankerDraws: boolean;
  }>;
}

export const BACCARAT_OUTCOME_PROBABILITIES = {
  player: 0.446247,
  banker: 0.458597,
  tie: 0.095156,
} as const;

export const BACCARAT_WAGERS: BaccaratWagerDefinition[] = [
  {
    key: "player",
    label: "Player",
    payout: "1:1",
    payoutToOne: 1,
    houseEdge: 0.0124,
    note: "Even money payout with a slightly worse edge than Banker.",
  },
  {
    key: "banker",
    label: "Banker",
    payout: "19:20",
    payoutToOne: 0.95,
    houseEdge: 0.0106,
    note: "The 5% commission keeps Banker strongest despite its higher hit rate.",
  },
  {
    key: "tie",
    label: "Tie",
    payout: "8:1",
    payoutToOne: 8,
    houseEdge: 0.1436,
    note: "High variance and expensive; useful as a cautionary example, not a main wager.",
  },
];

export const BACCARAT_RULE_NOTES = [
  "Naturals on 8 or 9 end the round immediately.",
  "Player draws on totals 0 through 5 and stands on 6 or 7.",
  "If Player stands, Banker draws on 0 through 5 and stands on 6 or 7.",
  "If Player draws, Banker follows the standard third-card table based on Bank total and Player third card.",
  "The standard wager probabilities below assume the common commission game and published eight-deck outcome frequencies.",
];

export function baccaratBetMetrics(
  wagerKey: BaccaratWagerDefinition["key"],
): BaccaratBetMetrics {
  const wager = BACCARAT_WAGERS.find((entry) => entry.key === wagerKey);

  if (!wager) {
    throw new Error(`Unsupported baccarat wager: ${wagerKey}`);
  }

  let winProbability = 0;
  let loseProbability = 0;
  let pushProbability = 0;

  switch (wagerKey) {
    case "player":
      winProbability = BACCARAT_OUTCOME_PROBABILITIES.player;
      loseProbability = BACCARAT_OUTCOME_PROBABILITIES.banker;
      pushProbability = BACCARAT_OUTCOME_PROBABILITIES.tie;
      break;
    case "banker":
      winProbability = BACCARAT_OUTCOME_PROBABILITIES.banker;
      loseProbability = BACCARAT_OUTCOME_PROBABILITIES.player;
      pushProbability = BACCARAT_OUTCOME_PROBABILITIES.tie;
      break;
    case "tie":
      winProbability = BACCARAT_OUTCOME_PROBABILITIES.tie;
      loseProbability =
        BACCARAT_OUTCOME_PROBABILITIES.player + BACCARAT_OUTCOME_PROBABILITIES.banker;
      pushProbability = 0;
      break;
  }

  const evPerUnit = winProbability * wager.payoutToOne - loseProbability;

  return {
    key: wager.key,
    label: wager.label,
    payoutToOne: wager.payoutToOne,
    winProbability,
    loseProbability,
    pushProbability,
    evPerUnit,
    houseEdge: -evPerUnit,
    expectedReturn: 1 + evPerUnit,
  };
}

export function buildBaccaratBetMetricsTable() {
  return BACCARAT_WAGERS.map((wager) => baccaratBetMetrics(wager.key));
}

export function hasBaccaratNatural(playerTotal: number, bankerTotal: number) {
  return playerTotal >= 8 || bankerTotal >= 8;
}

export function shouldPlayerDraw(playerTotal: number) {
  return playerTotal <= 5;
}

export function shouldBankerDraw(
  bankerTotal: number,
  playerThirdCard: number | null,
) {
  if (playerThirdCard === null) {
    return bankerTotal <= 5;
  }

  if (bankerTotal <= 2) return true;
  if (bankerTotal === 3) return playerThirdCard !== 8;
  if (bankerTotal === 4) return playerThirdCard >= 2 && playerThirdCard <= 7;
  if (bankerTotal === 5) return playerThirdCard >= 4 && playerThirdCard <= 7;
  if (bankerTotal === 6) return playerThirdCard === 6 || playerThirdCard === 7;
  return false;
}

export function explainBaccaratDecision(
  playerTotal: number,
  bankerTotal: number,
  playerThirdCard: number | null,
): BaccaratDecision {
  if (hasBaccaratNatural(playerTotal, bankerTotal)) {
    return {
      naturalStopsRound: true,
      playerDraws: false,
      bankerDraws: false,
      playerInstruction: "Natural 8/9 stops the round. Player stands.",
      bankerInstruction: "Natural 8/9 stops the round. Banker stands.",
    };
  }

  const playerDraws = shouldPlayerDraw(playerTotal);

  if (!playerDraws) {
    const bankerDraws = shouldBankerDraw(bankerTotal, null);
    return {
      naturalStopsRound: false,
      playerDraws,
      bankerDraws,
      playerInstruction: "Player stands on 6 or 7.",
      bankerInstruction: bankerDraws
        ? "Banker draws because Player stood and Banker total is 0 through 5."
        : "Banker stands because Player stood and Banker total is 6 or 7.",
    };
  }

  if (playerThirdCard === null) {
    return {
      naturalStopsRound: false,
      playerDraws,
      bankerDraws: null,
      playerInstruction: "Player draws on 0 through 5.",
      bankerInstruction:
        "Select Player's third card to resolve the Banker branch of the table.",
    };
  }

  const bankerDraws = shouldBankerDraw(bankerTotal, playerThirdCard);

  return {
    naturalStopsRound: false,
    playerDraws,
    bankerDraws,
    playerInstruction: `Player draws on ${playerTotal}.`,
    bankerInstruction: bankerDraws
      ? `Banker draws against Player third card ${playerThirdCard}.`
      : `Banker stands against Player third card ${playerThirdCard}.`,
  };
}

export function buildBankerDrawTable(): BankerDrawTableRow[] {
  return Array.from({ length: 8 }, (_, bankerTotal) => ({
    bankerTotal,
    playerStands: shouldBankerDraw(bankerTotal, null),
    byPlayerThirdCard: Array.from({ length: 10 }, (_, playerThirdCard) => ({
      playerThirdCard,
      bankerDraws: shouldBankerDraw(bankerTotal, playerThirdCard),
    })),
  }));
}