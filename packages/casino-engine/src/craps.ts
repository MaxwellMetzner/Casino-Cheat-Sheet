export type CrapsPhase = "come-out" | "point";

export type CrapsPoint = 4 | 5 | 6 | 8 | 9 | 10;

export interface CrapsRules {
  fieldDoubleOn2: boolean;
  fieldTripleOn12: boolean;
  buyCommissionRate: number;
}

export interface CrapsRoll {
  sum: number;
  hard?: boolean;
}

export type CrapsBetKind =
  | "pass"
  | "dontPass"
  | "come"
  | "dontCome"
  | "passOdds"
  | "dontPassOdds"
  | "comeOdds"
  | "dontComeOdds"
  | "field"
  | "place4"
  | "place5"
  | "place6"
  | "place8"
  | "place9"
  | "place10"
  | "buy4"
  | "buy5"
  | "buy6"
  | "buy8"
  | "buy9"
  | "buy10"
  | "hard4"
  | "hard6"
  | "hard8"
  | "hard10";

export interface CrapsBet {
  id: string;
  label: string;
  kind: CrapsBetKind;
  amount: number;
  point?: CrapsPoint;
  workingOnComeOut?: boolean;
}

export interface CrapsState {
  phase: CrapsPhase;
  point?: CrapsPoint;
  bets: CrapsBet[];
  rules?: Partial<CrapsRules>;
}

export interface CrapsResolutionEvent {
  betId: string;
  label: string;
  outcome: "win" | "lose" | "push" | "travel" | "established";
  net: number;
  description: string;
}

export interface CrapsResolution {
  nextState: CrapsState;
  events: CrapsResolutionEvent[];
  summary: string;
}

export interface CrapsOddsReference {
  label: string;
  payout: string;
  houseEdge?: number;
  note: string;
}

export type CrapsMetricKey =
  | "pass"
  | "dontPass"
  | "come"
  | "dontCome"
  | "passOdds4"
  | "passOdds5"
  | "passOdds6"
  | "dontPassOdds4"
  | "dontPassOdds5"
  | "dontPassOdds6"
  | "field"
  | "place4"
  | "place5"
  | "place6"
  | "buy4"
  | "buy5"
  | "buy6"
  | "hard4"
  | "hard6";

export interface CrapsBetMetrics {
  key: CrapsMetricKey;
  label: string;
  payout: string;
  winProbability: number;
  loseProbability: number;
  pushProbability: number;
  evPerUnit: number;
  houseEdge: number;
  expectedReturn: number;
  note: string;
}

export const DEFAULT_CRAPS_RULES: CrapsRules = {
  fieldDoubleOn2: true,
  fieldTripleOn12: true,
  buyCommissionRate: 0.05,
};

export const CRAPS_ROLL_DISTRIBUTION = [
  { sum: 2, ways: 1, probability: 1 / 36 },
  { sum: 3, ways: 2, probability: 2 / 36 },
  { sum: 4, ways: 3, probability: 3 / 36 },
  { sum: 5, ways: 4, probability: 4 / 36 },
  { sum: 6, ways: 5, probability: 5 / 36 },
  { sum: 7, ways: 6, probability: 6 / 36 },
  { sum: 8, ways: 5, probability: 5 / 36 },
  { sum: 9, ways: 4, probability: 4 / 36 },
  { sum: 10, ways: 3, probability: 3 / 36 },
  { sum: 11, ways: 2, probability: 2 / 36 },
  { sum: 12, ways: 1, probability: 1 / 36 },
] as const;

export const CRAPS_ODDS_REFERENCE: CrapsOddsReference[] = [
  {
    label: "Pass / Come",
    payout: "1:1",
    houseEdge: 0.0141,
    note: "Core line bet that wins on naturals and then rides the point.",
  },
  {
    label: "Don't Pass / Don't Come",
    payout: "1:1",
    houseEdge: 0.0136,
    note: "Fades the shooter and bars 12 on the come-out.",
  },
  {
    label: "Odds bets",
    payout: "True odds",
    houseEdge: 0,
    note: "Requires a line bet and pays fair odds with no house edge.",
  },
  {
    label: "Field",
    payout: "1:1, 2:1 on 2, 3:1 on 12",
    note: "One-roll wager; exact edge depends on the table's 2 and 12 bonus schedule.",
  },
  {
    label: "Place 6 / 8",
    payout: "7:6",
    houseEdge: 0.0152,
    note: "Best of the standard place bets.",
  },
  {
    label: "Place 5 / 9",
    payout: "7:5",
    houseEdge: 0.04,
    note: "Middle-tier place bet with a noticeably larger edge.",
  },
  {
    label: "Place 4 / 10",
    payout: "9:5",
    houseEdge: 0.0667,
    note: "Highest-edge common place bet among the box numbers.",
  },
  {
    label: "Buy bets",
    payout: "True odds less 5% vig",
    note: "The effective edge varies by number and whether the commission is collected only on wins.",
  },
  {
    label: "Hard 4 / 10",
    payout: "7:1",
    houseEdge: 0.1111,
    note: "One of the higher-edge proposition families on the layout.",
  },
  {
    label: "Hard 6 / 8",
    payout: "9:1",
    houseEdge: 0.0909,
    note: "Still expensive, but slightly better than hard 4 or 10.",
  },
];

const PASS_ODDS_PAYOUT: Record<CrapsPoint, number> = {
  4: 2,
  5: 3 / 2,
  6: 6 / 5,
  8: 6 / 5,
  9: 3 / 2,
  10: 2,
};

const DONT_PASS_ODDS_PAYOUT: Record<CrapsPoint, number> = {
  4: 1 / 2,
  5: 2 / 3,
  6: 5 / 6,
  8: 5 / 6,
  9: 2 / 3,
  10: 1 / 2,
};

const PLACE_PAYOUT: Record<CrapsPoint, number> = {
  4: 9 / 5,
  5: 7 / 5,
  6: 7 / 6,
  8: 7 / 6,
  9: 7 / 5,
  10: 9 / 5,
};

const BUY_PAYOUT: Record<CrapsPoint, number> = {
  4: 2,
  5: 3 / 2,
  6: 6 / 5,
  8: 6 / 5,
  9: 3 / 2,
  10: 2,
};

const HARDWAY_PAYOUT: Record<4 | 6 | 8 | 10, number> = {
  4: 7,
  6: 9,
  8: 9,
  10: 7,
};

const POINT_WAYS: Record<CrapsPoint, number> = {
  4: 3,
  5: 4,
  6: 5,
  8: 5,
  9: 4,
  10: 3,
};

function pointWinBeforeSeven(point: CrapsPoint) {
  return POINT_WAYS[point] / (POINT_WAYS[point] + 6);
}

function pointLoseToSeven(point: CrapsPoint) {
  return 6 / (POINT_WAYS[point] + 6);
}

function pointEstablishProbability(point: CrapsPoint) {
  return POINT_WAYS[point] / 36;
}

function buildMetric(
  key: CrapsMetricKey,
  label: string,
  payout: string,
  winProbability: number,
  loseProbability: number,
  pushProbability: number,
  evPerUnit: number,
  note: string,
): CrapsBetMetrics {
  return {
    key,
    label,
    payout,
    winProbability,
    loseProbability,
    pushProbability,
    evPerUnit,
    houseEdge: -evPerUnit,
    expectedReturn: 1 + evPerUnit,
    note,
  };
}

export function buildCrapsBetMetrics(
  partialRules?: Partial<CrapsRules>,
): CrapsBetMetrics[] {
  const rules = mergeRules(partialRules);
  const passWin =
    8 / 36 +
    pointEstablishProbability(4) * pointWinBeforeSeven(4) +
    pointEstablishProbability(5) * pointWinBeforeSeven(5) +
    pointEstablishProbability(6) * pointWinBeforeSeven(6) +
    pointEstablishProbability(8) * pointWinBeforeSeven(8) +
    pointEstablishProbability(9) * pointWinBeforeSeven(9) +
    pointEstablishProbability(10) * pointWinBeforeSeven(10);
  const passLose = 1 - passWin;
  const dontPassPush = 1 / 36;
  const dontPassWin =
    3 / 36 +
    pointEstablishProbability(4) * pointLoseToSeven(4) +
    pointEstablishProbability(5) * pointLoseToSeven(5) +
    pointEstablishProbability(6) * pointLoseToSeven(6) +
    pointEstablishProbability(8) * pointLoseToSeven(8) +
    pointEstablishProbability(9) * pointLoseToSeven(9) +
    pointEstablishProbability(10) * pointLoseToSeven(10);
  const dontPassLose = 1 - dontPassWin - dontPassPush;
  const fieldEvenWays = 2 + 3 + 4 + 3 + 2;
  const fieldWinProbability = 16 / 36;
  const fieldLoseProbability = 20 / 36;
  const fieldEv =
    fieldEvenWays / 36 +
    (rules.fieldDoubleOn2 ? 2 : 1) / 36 +
    (rules.fieldTripleOn12 ? 3 : 2) / 36 -
    fieldLoseProbability;

  const place4Win = pointWinBeforeSeven(4);
  const place4Lose = pointLoseToSeven(4);
  const place5Win = pointWinBeforeSeven(5);
  const place5Lose = pointLoseToSeven(5);
  const place6Win = pointWinBeforeSeven(6);
  const place6Lose = pointLoseToSeven(6);
  const buy4Win = pointWinBeforeSeven(4);
  const buy4Lose = pointLoseToSeven(4);
  const buy5Win = pointWinBeforeSeven(5);
  const buy5Lose = pointLoseToSeven(5);
  const buy6Win = pointWinBeforeSeven(6);
  const buy6Lose = pointLoseToSeven(6);
  const hard4Win = 1 / 9;
  const hard4Lose = 8 / 9;
  const hard6Win = 1 / 11;
  const hard6Lose = 10 / 11;

  return [
    buildMetric(
      "pass",
      "Pass line",
      "1:1",
      passWin,
      passLose,
      0,
      passWin - passLose,
      "Exact line-bet EV from the come-out roll through the point cycle.",
    ),
    buildMetric(
      "dontPass",
      "Don't Pass",
      "1:1",
      dontPassWin,
      dontPassLose,
      dontPassPush,
      dontPassWin - dontPassLose,
      "Bars 12 on the come-out, which creates the small push probability.",
    ),
    buildMetric(
      "come",
      "Come",
      "1:1",
      passWin,
      passLose,
      0,
      passWin - passLose,
      "Once a Come bet is made, its EV matches the Pass line from that new come-out cycle.",
    ),
    buildMetric(
      "dontCome",
      "Don't Come",
      "1:1",
      dontPassWin,
      dontPassLose,
      dontPassPush,
      dontPassWin - dontPassLose,
      "Once a Don't Come bet is made, it mirrors Don't Pass math with the same bar-12 push.",
    ),
    buildMetric(
      "passOdds4",
      "Pass odds on 4 / 10",
      "2:1",
      pointWinBeforeSeven(4),
      pointLoseToSeven(4),
      0,
      pointWinBeforeSeven(4) * 2 - pointLoseToSeven(4),
      "True odds with zero house edge after the point is established.",
    ),
    buildMetric(
      "passOdds5",
      "Pass odds on 5 / 9",
      "3:2",
      pointWinBeforeSeven(5),
      pointLoseToSeven(5),
      0,
      pointWinBeforeSeven(5) * (3 / 2) - pointLoseToSeven(5),
      "True odds with zero house edge after the point is established.",
    ),
    buildMetric(
      "passOdds6",
      "Pass odds on 6 / 8",
      "6:5",
      pointWinBeforeSeven(6),
      pointLoseToSeven(6),
      0,
      pointWinBeforeSeven(6) * (6 / 5) - pointLoseToSeven(6),
      "True odds with zero house edge after the point is established.",
    ),
    buildMetric(
      "dontPassOdds4",
      "Don't Pass odds on 4 / 10",
      "1:2",
      pointLoseToSeven(4),
      pointWinBeforeSeven(4),
      0,
      pointLoseToSeven(4) * (1 / 2) - pointWinBeforeSeven(4),
      "True odds with zero house edge when fading 4 or 10.",
    ),
    buildMetric(
      "dontPassOdds5",
      "Don't Pass odds on 5 / 9",
      "2:3",
      pointLoseToSeven(5),
      pointWinBeforeSeven(5),
      0,
      pointLoseToSeven(5) * (2 / 3) - pointWinBeforeSeven(5),
      "True odds with zero house edge when fading 5 or 9.",
    ),
    buildMetric(
      "dontPassOdds6",
      "Don't Pass odds on 6 / 8",
      "5:6",
      pointLoseToSeven(6),
      pointWinBeforeSeven(6),
      0,
      pointLoseToSeven(6) * (5 / 6) - pointWinBeforeSeven(6),
      "True odds with zero house edge when fading 6 or 8.",
    ),
    buildMetric(
      "field",
      "Field",
      rules.fieldTripleOn12 ? "1:1, 2:1 on 2, 3:1 on 12" : "1:1, 2:1 on 2 and 12",
      fieldWinProbability,
      fieldLoseProbability,
      0,
      fieldEv,
      "One-roll wager whose edge depends on the table's bonus schedule for 2 and 12.",
    ),
    buildMetric(
      "place4",
      "Place 4 / 10",
      "9:5",
      place4Win,
      place4Lose,
      0,
      place4Win * (9 / 5) - place4Lose,
      "Persistent bet that wins when 4 or 10 rolls before 7.",
    ),
    buildMetric(
      "place5",
      "Place 5 / 9",
      "7:5",
      place5Win,
      place5Lose,
      0,
      place5Win * (7 / 5) - place5Lose,
      "Persistent bet that wins when 5 or 9 rolls before 7.",
    ),
    buildMetric(
      "place6",
      "Place 6 / 8",
      "7:6",
      place6Win,
      place6Lose,
      0,
      place6Win * (7 / 6) - place6Lose,
      "The strongest standard place-bet family on the table.",
    ),
    buildMetric(
      "buy4",
      "Buy 4 / 10",
      "True odds less vig",
      buy4Win,
      buy4Lose,
      0,
      buy4Win * (2 - rules.buyCommissionRate) - buy4Lose,
      "Assumes the commission is collected on wins, matching the reducer's current behavior.",
    ),
    buildMetric(
      "buy5",
      "Buy 5 / 9",
      "True odds less vig",
      buy5Win,
      buy5Lose,
      0,
      buy5Win * ((3 / 2) - rules.buyCommissionRate) - buy5Lose,
      "Assumes the commission is collected on wins, matching the reducer's current behavior.",
    ),
    buildMetric(
      "buy6",
      "Buy 6 / 8",
      "True odds less vig",
      buy6Win,
      buy6Lose,
      0,
      buy6Win * ((6 / 5) - rules.buyCommissionRate) - buy6Lose,
      "Assumes the commission is collected on wins, matching the reducer's current behavior.",
    ),
    buildMetric(
      "hard4",
      "Hard 4 / 10",
      "7:1",
      hard4Win,
      hard4Lose,
      0,
      hard4Win * 7 - hard4Lose,
      "Wins only on the hard combination before an easy total or 7 appears.",
    ),
    buildMetric(
      "hard6",
      "Hard 6 / 8",
      "9:1",
      hard6Win,
      hard6Lose,
      0,
      hard6Win * 9 - hard6Lose,
      "Wins only on the hard combination before an easy total or 7 appears.",
    ),
  ];
}

function mergeRules(rules?: Partial<CrapsRules>): CrapsRules {
  return {
    ...DEFAULT_CRAPS_RULES,
    ...rules,
  };
}

function isPointNumber(sum: number): sum is CrapsPoint {
  return sum === 4 || sum === 5 || sum === 6 || sum === 8 || sum === 9 || sum === 10;
}

function getTrackedPoint(kind: CrapsBetKind): CrapsPoint | undefined {
  switch (kind) {
    case "place4":
    case "buy4":
    case "hard4":
      return 4;
    case "place5":
    case "buy5":
      return 5;
    case "place6":
    case "buy6":
    case "hard6":
      return 6;
    case "place8":
    case "buy8":
    case "hard8":
      return 8;
    case "place9":
    case "buy9":
      return 9;
    case "place10":
    case "buy10":
    case "hard10":
      return 10;
    default:
      return undefined;
  }
}

function getHardwayPoint(kind: CrapsBetKind): 4 | 6 | 8 | 10 | undefined {
  const point = getTrackedPoint(kind);
  if (point === 4 || point === 6 || point === 8 || point === 10) {
    return point;
  }

  return undefined;
}

function isPlaceBet(kind: CrapsBetKind) {
  return kind.startsWith("place");
}

function isBuyBet(kind: CrapsBetKind) {
  return kind.startsWith("buy");
}

function isHardwayBet(kind: CrapsBetKind) {
  return kind.startsWith("hard");
}

function cloneBet(bet: CrapsBet): CrapsBet {
  return { ...bet };
}

function summarizeResolution(
  roll: CrapsRoll,
  nextState: CrapsState,
  events: CrapsResolutionEvent[],
) {
  const hardNote = roll.hard && [4, 6, 8, 10].includes(roll.sum) ? " hard" : "";
  const stateLabel = nextState.phase === "point" ? `Point ${nextState.point}` : "Come-out";
  return `Rolled ${roll.sum}${hardNote}. ${events.length} bet event${events.length === 1 ? "" : "s"}; next table state: ${stateLabel}.`;
}

export function resolveCrapsRoll(
  state: CrapsState,
  roll: CrapsRoll,
): CrapsResolution {
  const rules = mergeRules(state.rules);
  const events: CrapsResolutionEvent[] = [];
  const nextBets: CrapsBet[] = [];
  const nextState: CrapsState = {
    phase: state.phase,
    point: state.point,
    bets: [],
    rules,
  };

  const establishedPoint =
    state.phase === "come-out" && isPointNumber(roll.sum) ? roll.sum : undefined;
  const sevenOut = state.phase === "point" && roll.sum === 7;
  const pointMade = state.phase === "point" && roll.sum === state.point;

  if (establishedPoint) {
    nextState.phase = "point";
    nextState.point = establishedPoint;
    events.push({
      betId: "table-point",
      label: "Table point",
      outcome: "established",
      net: 0,
      description: `The point is established at ${establishedPoint}.`,
    });
  }

  if (sevenOut || pointMade) {
    nextState.phase = "come-out";
    delete nextState.point;
  }

  for (const bet of state.bets) {
    const currentPoint = state.point;

    switch (bet.kind) {
      case "pass": {
        if (state.phase === "come-out") {
          if (roll.sum === 7 || roll.sum === 11) {
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "win",
              net: bet.amount,
              description: "Pass line wins on a come-out natural.",
            });
          } else if (roll.sum === 2 || roll.sum === 3 || roll.sum === 12) {
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "lose",
              net: -bet.amount,
              description: "Pass line loses on craps numbers 2, 3, or 12.",
            });
          } else {
            nextBets.push(cloneBet(bet));
          }
        } else if (roll.sum === currentPoint) {
          events.push({
            betId: bet.id,
            label: bet.label,
            outcome: "win",
            net: bet.amount,
            description: `Pass line wins because the shooter made ${currentPoint}.`,
          });
        } else if (roll.sum === 7) {
          events.push({
            betId: bet.id,
            label: bet.label,
            outcome: "lose",
            net: -bet.amount,
            description: "Pass line loses on a seven-out.",
          });
        } else {
          nextBets.push(cloneBet(bet));
        }
        break;
      }

      case "dontPass": {
        if (state.phase === "come-out") {
          if (roll.sum === 2 || roll.sum === 3) {
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "win",
              net: bet.amount,
              description: "Don't Pass wins on a come-out 2 or 3.",
            });
          } else if (roll.sum === 12) {
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "push",
              net: 0,
              description: "Don't Pass bars 12 and stays up for the next come-out roll.",
            });
            nextBets.push(cloneBet(bet));
          } else if (roll.sum === 7 || roll.sum === 11) {
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "lose",
              net: -bet.amount,
              description: "Don't Pass loses on a come-out natural.",
            });
          } else {
            nextBets.push(cloneBet(bet));
          }
        } else if (roll.sum === 7) {
          events.push({
            betId: bet.id,
            label: bet.label,
            outcome: "win",
            net: bet.amount,
            description: "Don't Pass wins when seven shows before the point.",
          });
        } else if (roll.sum === currentPoint) {
          events.push({
            betId: bet.id,
            label: bet.label,
            outcome: "lose",
            net: -bet.amount,
            description: `Don't Pass loses because ${currentPoint} was made.`,
          });
        } else {
          nextBets.push(cloneBet(bet));
        }
        break;
      }

      case "come": {
        if (bet.point) {
          if (roll.sum === 7) {
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "lose",
              net: -bet.amount,
              description: `Come bet on ${bet.point} loses to a seven-out.`,
            });
          } else if (roll.sum === bet.point) {
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "win",
              net: bet.amount,
              description: `Come bet wins because ${bet.point} rolled before 7.`,
            });
          } else {
            nextBets.push(cloneBet(bet));
          }
        } else if (state.phase === "point") {
          if (roll.sum === 7 || roll.sum === 11) {
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "win",
              net: bet.amount,
              description: "Traveling Come bet wins on 7 or 11.",
            });
          } else if (roll.sum === 2 || roll.sum === 3 || roll.sum === 12) {
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "lose",
              net: -bet.amount,
              description: "Traveling Come bet loses on 2, 3, or 12.",
            });
          } else if (isPointNumber(roll.sum)) {
            nextBets.push({
              ...cloneBet(bet),
              point: roll.sum,
            });
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "travel",
              net: 0,
              description: `Come bet travels to ${roll.sum}.`,
            });
          } else {
            nextBets.push(cloneBet(bet));
          }
        } else {
          nextBets.push(cloneBet(bet));
        }
        break;
      }

      case "dontCome": {
        if (bet.point) {
          if (roll.sum === 7) {
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "win",
              net: bet.amount,
              description: `Don't Come bet on ${bet.point} wins because 7 arrived first.`,
            });
          } else if (roll.sum === bet.point) {
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "lose",
              net: -bet.amount,
              description: `Don't Come bet on ${bet.point} loses because its point was rolled.`,
            });
          } else {
            nextBets.push(cloneBet(bet));
          }
        } else if (state.phase === "point") {
          if (roll.sum === 2 || roll.sum === 3) {
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "win",
              net: bet.amount,
              description: "Traveling Don't Come bet wins on 2 or 3.",
            });
          } else if (roll.sum === 12) {
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "push",
              net: 0,
              description: "Don't Come bars 12 and stays up for another roll.",
            });
            nextBets.push(cloneBet(bet));
          } else if (roll.sum === 7 || roll.sum === 11) {
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "lose",
              net: -bet.amount,
              description: "Traveling Don't Come bet loses on 7 or 11.",
            });
          } else if (isPointNumber(roll.sum)) {
            nextBets.push({
              ...cloneBet(bet),
              point: roll.sum,
            });
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "travel",
              net: 0,
              description: `Don't Come bet travels behind ${roll.sum}.`,
            });
          } else {
            nextBets.push(cloneBet(bet));
          }
        } else {
          nextBets.push(cloneBet(bet));
        }
        break;
      }

      case "passOdds": {
        if (!currentPoint) {
          nextBets.push(cloneBet(bet));
        } else if (roll.sum === currentPoint) {
          events.push({
            betId: bet.id,
            label: bet.label,
            outcome: "win",
            net: bet.amount * PASS_ODDS_PAYOUT[currentPoint],
            description: `Pass odds pay true odds when ${currentPoint} is made.`,
          });
        } else if (roll.sum === 7) {
          events.push({
            betId: bet.id,
            label: bet.label,
            outcome: "lose",
            net: -bet.amount,
            description: "Pass odds lose on a seven-out.",
          });
        } else {
          nextBets.push(cloneBet(bet));
        }
        break;
      }

      case "dontPassOdds": {
        if (!currentPoint) {
          nextBets.push(cloneBet(bet));
        } else if (roll.sum === 7) {
          events.push({
            betId: bet.id,
            label: bet.label,
            outcome: "win",
            net: bet.amount * DONT_PASS_ODDS_PAYOUT[currentPoint],
            description: `Don't Pass odds pay true odds when 7 appears before ${currentPoint}.`,
          });
        } else if (roll.sum === currentPoint) {
          events.push({
            betId: bet.id,
            label: bet.label,
            outcome: "lose",
            net: -bet.amount,
            description: `Don't Pass odds lose because ${currentPoint} was made.`,
          });
        } else {
          nextBets.push(cloneBet(bet));
        }
        break;
      }

      case "comeOdds": {
        if (!bet.point) {
          nextBets.push(cloneBet(bet));
        } else if (roll.sum === bet.point) {
          events.push({
            betId: bet.id,
            label: bet.label,
            outcome: "win",
            net: bet.amount * PASS_ODDS_PAYOUT[bet.point],
            description: `Come odds pay true odds when ${bet.point} repeats before 7.`,
          });
        } else if (roll.sum === 7) {
          events.push({
            betId: bet.id,
            label: bet.label,
            outcome: "lose",
            net: -bet.amount,
            description: "Come odds lose on a seven-out.",
          });
        } else {
          nextBets.push(cloneBet(bet));
        }
        break;
      }

      case "dontComeOdds": {
        if (!bet.point) {
          nextBets.push(cloneBet(bet));
        } else if (roll.sum === 7) {
          events.push({
            betId: bet.id,
            label: bet.label,
            outcome: "win",
            net: bet.amount * DONT_PASS_ODDS_PAYOUT[bet.point],
            description: `Don't Come odds pay true odds when 7 arrives before ${bet.point}.`,
          });
        } else if (roll.sum === bet.point) {
          events.push({
            betId: bet.id,
            label: bet.label,
            outcome: "lose",
            net: -bet.amount,
            description: `Don't Come odds lose because ${bet.point} was made.`,
          });
        } else {
          nextBets.push(cloneBet(bet));
        }
        break;
      }

      case "field": {
        if ([3, 4, 9, 10, 11].includes(roll.sum)) {
          events.push({
            betId: bet.id,
            label: bet.label,
            outcome: "win",
            net: bet.amount,
            description: "Field bet wins even money on this total.",
          });
        } else if (roll.sum === 2) {
          events.push({
            betId: bet.id,
            label: bet.label,
            outcome: "win",
            net: bet.amount * (rules.fieldDoubleOn2 ? 2 : 1),
            description: rules.fieldDoubleOn2
              ? "Field bet wins double on 2."
              : "Field bet wins even money on 2 under the configured rule set.",
          });
        } else if (roll.sum === 12) {
          events.push({
            betId: bet.id,
            label: bet.label,
            outcome: "win",
            net: bet.amount * (rules.fieldTripleOn12 ? 3 : 2),
            description: rules.fieldTripleOn12
              ? "Field bet wins triple on 12."
              : "Field bet wins double on 12.",
          });
        } else {
          events.push({
            betId: bet.id,
            label: bet.label,
            outcome: "lose",
            net: -bet.amount,
            description: "Field bet loses on 5, 6, 7, or 8.",
          });
        }
        break;
      }

      default: {
        if (isPlaceBet(bet.kind)) {
          const point = getTrackedPoint(bet.kind);

          if (!point) {
            nextBets.push(cloneBet(bet));
            break;
          }

          if (state.phase === "come-out" && !bet.workingOnComeOut) {
            nextBets.push(cloneBet(bet));
          } else if (roll.sum === 7) {
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "lose",
              net: -bet.amount,
              description: `Place ${point} loses on 7.`,
            });
          } else if (roll.sum === point) {
            nextBets.push(cloneBet(bet));
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "win",
              net: bet.amount * PLACE_PAYOUT[point],
              description: `Place ${point} wins and stays up.`,
            });
          } else {
            nextBets.push(cloneBet(bet));
          }

          break;
        }

        if (isBuyBet(bet.kind)) {
          const point = getTrackedPoint(bet.kind);

          if (!point) {
            nextBets.push(cloneBet(bet));
            break;
          }

          if (state.phase === "come-out" && !bet.workingOnComeOut) {
            nextBets.push(cloneBet(bet));
          } else if (roll.sum === 7) {
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "lose",
              net: -bet.amount,
              description: `Buy ${point} loses on 7.`,
            });
          } else if (roll.sum === point) {
            nextBets.push(cloneBet(bet));
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "win",
              net: bet.amount * BUY_PAYOUT[point] - bet.amount * rules.buyCommissionRate,
              description: `Buy ${point} pays true odds minus the configured commission.`,
            });
          } else {
            nextBets.push(cloneBet(bet));
          }

          break;
        }

        if (isHardwayBet(bet.kind)) {
          const point = getHardwayPoint(bet.kind);

          if (!point) {
            nextBets.push(cloneBet(bet));
            break;
          }

          if (state.phase === "come-out" && !bet.workingOnComeOut) {
            nextBets.push(cloneBet(bet));
          } else if (roll.sum === 7) {
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "lose",
              net: -bet.amount,
              description: `Hard ${point} loses to 7.`,
            });
          } else if (roll.sum === point && roll.hard) {
            nextBets.push(cloneBet(bet));
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "win",
              net: bet.amount * HARDWAY_PAYOUT[point],
              description: `Hard ${point} wins because the roll was made the hard way.`,
            });
          } else if (roll.sum === point) {
            events.push({
              betId: bet.id,
              label: bet.label,
              outcome: "lose",
              net: -bet.amount,
              description: `Hard ${point} loses because the number was made easy.`,
            });
          } else {
            nextBets.push(cloneBet(bet));
          }

          break;
        }

        nextBets.push(cloneBet(bet));
      }
    }
  }

  nextState.bets = nextBets;

  return {
    nextState,
    events,
    summary: summarizeResolution(roll, nextState, events),
  };
}