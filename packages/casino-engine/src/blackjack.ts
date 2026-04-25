import type { Card } from "./cards";

export type BlackjackAction = "stand" | "hit" | "double" | "split" | "surrender";

export interface BlackjackRules {
  dealerHitsSoft17: boolean;
  blackjackPayout: number;
  surrender: boolean;
  doubleAfterSplit: boolean;
  splitAcesOneCardOnly: boolean;
}

export interface BlackjackSolveOptions extends Partial<BlackjackRules> {
  deckCount?: number;
  removedCards?: Card[];
}

export interface BlackjackDealerDistribution {
  bust: number;
  natural: number;
  totals: Partial<Record<17 | 18 | 19 | 20 | 21, number>>;
}

export interface BlackjackActionResult {
  action: BlackjackAction;
  ev: number;
}

export interface BlackjackSolution {
  bestAction: BlackjackAction;
  bestEv: number;
  actions: BlackjackActionResult[];
  playerTotal: number;
  soft: boolean;
  isPair: boolean;
  isNatural: boolean;
  dealerDistribution: BlackjackDealerDistribution;
  notes: string[];
  deckCount: number;
  removedCardCount: number;
  remainingCards: number;
}

interface BlackjackState {
  values: number[];
  canDouble: boolean;
  canSplit: boolean;
  fromSplit: boolean;
  splitAces: boolean;
}

interface DealerState {
  total: number;
  softAces: number;
}

interface BlackjackBranchSolution {
  bestAction: BlackjackAction;
  bestEv: number;
  actions: BlackjackActionResult[];
}

type ShoeCounts = number[] & { infinite?: boolean };

const SHOE_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const SHOE_VALUE_INDEX: Record<(typeof SHOE_VALUES)[number], number> = {
  2: 0,
  3: 1,
  4: 2,
  5: 3,
  6: 4,
  7: 5,
  8: 6,
  9: 7,
  10: 8,
  11: 9,
};

export const DEFAULT_BLACKJACK_RULES: BlackjackRules = {
  dealerHitsSoft17: false,
  blackjackPayout: 1.5,
  surrender: true,
  doubleAfterSplit: true,
  splitAcesOneCardOnly: true,
};

function normalizeRules(partialRules?: Partial<BlackjackRules>): BlackjackRules {
  return {
    ...DEFAULT_BLACKJACK_RULES,
    ...partialRules,
  };
}

function createStartingShoe(deckCount: number): ShoeCounts {
  if (!Number.isInteger(deckCount) || deckCount < 0 || deckCount > 8) {
    throw new Error(`Blackjack deck count must be an integer from 0 to 8, received ${deckCount}.`);
  }

  const shoe = [
    4 * (deckCount || 1),
    4 * (deckCount || 1),
    4 * (deckCount || 1),
    4 * (deckCount || 1),
    4 * (deckCount || 1),
    4 * (deckCount || 1),
    4 * (deckCount || 1),
    4 * (deckCount || 1),
    16 * (deckCount || 1),
    4 * (deckCount || 1),
  ] as ShoeCounts;

  if (deckCount === 0) {
    shoe.infinite = true;
  }

  return shoe;
}

function serializeShoe(shoe: ShoeCounts) {
  return `${shoe.infinite ? "inf" : "finite"}:${shoe.join(",")}`;
}

function shoeCardsRemaining(shoe: ShoeCounts) {
  return shoe.reduce((total, count) => total + count, 0);
}

function removeBlackjackValue(shoe: ShoeCounts, value: number) {
  const index = SHOE_VALUE_INDEX[value as keyof typeof SHOE_VALUE_INDEX];

  if (index === undefined) {
    throw new Error(`Unsupported blackjack value ${value}.`);
  }

  if (shoe.infinite) {
    return shoe;
  }

  if ((shoe[index] ?? 0) < 1) {
    throw new Error(`The shoe no longer contains a blackjack value of ${value}.`);
  }

  const nextShoe = [...shoe] as ShoeCounts;
  nextShoe[index] -= 1;
  return nextShoe;
}

function availableDraws(shoe: ShoeCounts) {
  const totalCards = shoeCardsRemaining(shoe);

  if (totalCards === 0) {
    return [] as Array<{ value: number; probability: number; nextShoe: ShoeCounts }>;
  }

  return SHOE_VALUES.flatMap((value) => {
    const count = shoe[SHOE_VALUE_INDEX[value]] ?? 0;

    if (count === 0) {
      return [];
    }

    return [{
      value,
      probability: count / totalCards,
      nextShoe: removeBlackjackValue(shoe, value),
    }];
  });
}

export function blackjackCardValue(card: Card) {
  if (card.rank === "A") {
    return 11;
  }

  return Math.min(card.rankValue, 10);
}

export function normalizeBlackjackHand(values: number[]) {
  let total = values.reduce((sum, value) => sum + value, 0);
  let softAces = values.filter((value) => value === 11).length;

  while (total > 21 && softAces > 0) {
    total -= 10;
    softAces -= 1;
  }

  return {
    total,
    soft: softAces > 0,
    softAces,
  };
}

function isBlackjackPair(values: number[]) {
  return values.length === 2 && values.every((value) => value === values[0]);
}

function isNaturalBlackjack(state: BlackjackState) {
  return !state.fromSplit && state.values.length === 2 && normalizeBlackjackHand(state.values).total === 21;
}

function mergeDealerDistributions(
  target: BlackjackDealerDistribution,
  addition: BlackjackDealerDistribution,
  weight: number,
) {
  target.bust += addition.bust * weight;
  target.natural += addition.natural * weight;

  for (const total of [17, 18, 19, 20, 21] as const) {
    target.totals[total] = (target.totals[total] ?? 0) + (addition.totals[total] ?? 0) * weight;
  }
}

function addBlackjackValue(total: number, softAces: number, value: number): DealerState {
  let nextTotal = total + value;
  let nextSoftAces = softAces + (value === 11 ? 1 : 0);

  while (nextTotal > 21 && nextSoftAces > 0) {
    nextTotal -= 10;
    nextSoftAces -= 1;
  }

  return {
    total: nextTotal,
    softAces: nextSoftAces,
  };
}

function dealerDistributionFromKnownState(
  shoe: ShoeCounts,
  dealerState: DealerState,
  rules: BlackjackRules,
  memo: Map<string, BlackjackDealerDistribution>,
): BlackjackDealerDistribution {
  const key = `${serializeShoe(shoe)}|${dealerState.total}|${dealerState.softAces}|${rules.dealerHitsSoft17 ? "h17" : "s17"}`;
  const cached = memo.get(key);

  if (cached) {
    return cached;
  }

  if (dealerState.total > 21) {
    const bustDistribution: BlackjackDealerDistribution = {
      bust: 1,
      natural: 0,
      totals: {},
    };
    memo.set(key, bustDistribution);
    return bustDistribution;
  }

  const soft = dealerState.softAces > 0;
  const shouldStand = dealerState.total > 17 || (dealerState.total === 17 && (!soft || !rules.dealerHitsSoft17));

  if (shouldStand) {
    const standingDistribution: BlackjackDealerDistribution = {
      bust: 0,
      natural: 0,
      totals: {
        [dealerState.total as 17 | 18 | 19 | 20 | 21]: 1,
      },
    };
    memo.set(key, standingDistribution);
    return standingDistribution;
  }

  const aggregate: BlackjackDealerDistribution = {
    bust: 0,
    natural: 0,
    totals: {},
  };

  for (const draw of availableDraws(shoe)) {
    const nextDealerState = addBlackjackValue(dealerState.total, dealerState.softAces, draw.value);
    const distribution = dealerDistributionFromKnownState(draw.nextShoe, nextDealerState, rules, memo);
    mergeDealerDistributions(aggregate, distribution, draw.probability);
  }

  memo.set(key, aggregate);
  return aggregate;
}

function standEvKnownDealer(
  state: BlackjackState,
  shoe: ShoeCounts,
  dealerState: DealerState,
  rules: BlackjackRules,
  dealerMemo: Map<string, BlackjackDealerDistribution>,
) {
  const player = normalizeBlackjackHand(state.values);

  if (player.total > 21) {
    return -1;
  }

  const dealerDistribution = dealerDistributionFromKnownState(shoe, dealerState, rules, dealerMemo);
  let ev = dealerDistribution.bust;

  for (const total of [17, 18, 19, 20, 21] as const) {
    const probability = dealerDistribution.totals[total] ?? 0;

    if (player.total > total) {
      ev += probability;
    } else if (player.total < total) {
      ev -= probability;
    }
  }

  return ev;
}

function splitContinuationEv(
  pairValue: number,
  openingValue: number,
  shoe: ShoeCounts,
  dealerState: DealerState,
  rules: BlackjackRules,
  stateMemo: Map<string, BlackjackBranchSolution>,
  dealerMemo: Map<string, BlackjackDealerDistribution>,
) {
  const splitState: BlackjackState = {
    values: [pairValue, openingValue],
    canDouble: rules.doubleAfterSplit,
    canSplit: false,
    fromSplit: true,
    splitAces: pairValue === 11,
  };

  if (pairValue === 11 && rules.splitAcesOneCardOnly) {
    return standEvKnownDealer(splitState, shoe, dealerState, rules, dealerMemo);
  }

  return solveKnownDealerState(splitState, shoe, dealerState, rules, stateMemo, dealerMemo).bestEv;
}

function approximateSplitEv(
  pairValue: number,
  shoe: ShoeCounts,
  dealerState: DealerState,
  rules: BlackjackRules,
  stateMemo: Map<string, BlackjackBranchSolution>,
  dealerMemo: Map<string, BlackjackDealerDistribution>,
) {
  let splitEv = 0;

  for (const firstDraw of availableDraws(shoe)) {
    for (const secondDraw of availableDraws(firstDraw.nextShoe)) {
      const jointProbability = firstDraw.probability * secondDraw.probability;
      const sharedPostOpeningShoe = secondDraw.nextShoe;
      const firstHandEv = splitContinuationEv(
        pairValue,
        firstDraw.value,
        sharedPostOpeningShoe,
        dealerState,
        rules,
        stateMemo,
        dealerMemo,
      );
      const secondHandEv = splitContinuationEv(
        pairValue,
        secondDraw.value,
        sharedPostOpeningShoe,
        dealerState,
        rules,
        stateMemo,
        dealerMemo,
      );

      splitEv += jointProbability * (firstHandEv + secondHandEv);
    }
  }

  return splitEv;
}

function solveKnownDealerState(
  state: BlackjackState,
  shoe: ShoeCounts,
  dealerState: DealerState,
  rules: BlackjackRules,
  stateMemo: Map<string, BlackjackBranchSolution>,
  dealerMemo: Map<string, BlackjackDealerDistribution>,
): BlackjackBranchSolution {
  const normalized = normalizeBlackjackHand(state.values);
  const key = `${[...state.values].sort((left, right) => left - right).join(",")}|${state.canDouble ? 1 : 0}|${state.canSplit ? 1 : 0}|${state.fromSplit ? 1 : 0}|${state.splitAces ? 1 : 0}|${dealerState.total}|${dealerState.softAces}|${serializeShoe(shoe)}|${rules.dealerHitsSoft17 ? 1 : 0}|${rules.doubleAfterSplit ? 1 : 0}|${rules.splitAcesOneCardOnly ? 1 : 0}|${rules.surrender ? 1 : 0}`;
  const cached = stateMemo.get(key);

  if (cached) {
    return cached;
  }

  const actions: BlackjackActionResult[] = [];
  actions.push({
    action: "stand",
    ev: standEvKnownDealer(state, shoe, dealerState, rules, dealerMemo),
  });

  if (normalized.total < 21 && !(state.splitAces && rules.splitAcesOneCardOnly)) {
    let hitEv = 0;

    for (const draw of availableDraws(shoe)) {
      const nextState: BlackjackState = {
        values: [...state.values, draw.value],
        canDouble: false,
        canSplit: false,
        fromSplit: state.fromSplit,
        splitAces: state.splitAces,
      };
      const nextHand = normalizeBlackjackHand(nextState.values);
      hitEv += draw.probability * (nextHand.total > 21
        ? -1
        : solveKnownDealerState(nextState, draw.nextShoe, dealerState, rules, stateMemo, dealerMemo).bestEv);
    }

    actions.push({ action: "hit", ev: hitEv });
  }

  if (state.canDouble && normalized.total < 21) {
    let doubleEv = 0;

    for (const draw of availableDraws(shoe)) {
      const nextState: BlackjackState = {
        values: [...state.values, draw.value],
        canDouble: false,
        canSplit: false,
        fromSplit: state.fromSplit,
        splitAces: state.splitAces,
      };
      const nextHand = normalizeBlackjackHand(nextState.values);
      doubleEv += draw.probability * (nextHand.total > 21
        ? -2
        : 2 * standEvKnownDealer(nextState, draw.nextShoe, dealerState, rules, dealerMemo));
    }

    actions.push({ action: "double", ev: doubleEv });
  }

  if (state.canSplit && state.values.length === 2 && isBlackjackPair(state.values)) {
    actions.push({
      action: "split",
      ev: approximateSplitEv(state.values[0]!, shoe, dealerState, rules, stateMemo, dealerMemo),
    });
  }

  if (rules.surrender && !state.fromSplit && state.values.length === 2) {
    actions.push({ action: "surrender", ev: -0.5 });
  }

  const best = actions.reduce((currentBest, action) => action.ev > currentBest.ev ? action : currentBest);
  const solution: BlackjackBranchSolution = {
    bestAction: best.action,
    bestEv: best.ev,
    actions: actions.sort((left, right) => right.ev - left.ev),
  };

  stateMemo.set(key, solution);
  return solution;
}

function rootActions(state: BlackjackState, rules: BlackjackRules) {
  const normalized = normalizeBlackjackHand(state.values);
  const actions: BlackjackAction[] = ["stand"];

  if (normalized.total < 21) {
    actions.push("hit");
  }

  if (state.canDouble && normalized.total < 21) {
    actions.push("double");
  }

  if (state.canSplit && state.values.length === 2 && isBlackjackPair(state.values)) {
    actions.push("split");
  }

  if (rules.surrender && !state.fromSplit && state.values.length === 2) {
    actions.push("surrender");
  }

  return actions;
}

export function solveBlackjackHand(
  playerCards: Card[],
  dealerUpCard: Card,
  options?: BlackjackSolveOptions,
) {
  if (playerCards.length !== 2) {
    throw new Error(`Blackjack analysis currently expects exactly 2 player cards, received ${playerCards.length}.`);
  }

  const deckCount = options?.deckCount ?? 6;
  const removedCards = options?.removedCards ?? [];
  const rules = normalizeRules(options);
  const initialState: BlackjackState = {
    values: playerCards.map(blackjackCardValue),
    canDouble: true,
    canSplit: true,
    fromSplit: false,
    splitAces: false,
  };
  const playerSummary = normalizeBlackjackHand(initialState.values);
  const dealerUpValue = blackjackCardValue(dealerUpCard);
  let shoe = createStartingShoe(deckCount);

  if (!shoe.infinite) {
    for (const knownCard of [...playerCards, dealerUpCard, ...removedCards]) {
      shoe = removeBlackjackValue(shoe, blackjackCardValue(knownCard));
    }
  }

  const remainingCards = shoe.infinite ? Number.POSITIVE_INFINITY : shoeCardsRemaining(shoe);

  if (!shoe.infinite && remainingCards < 1) {
    throw new Error("The blackjack shoe is exhausted after removing the known cards.");
  }

  const dealerMemo = new Map<string, BlackjackDealerDistribution>();
  const stateMemo = new Map<string, BlackjackBranchSolution>();
  const aggregateDealerDistribution: BlackjackDealerDistribution = {
    bust: 0,
    natural: 0,
    totals: {},
  };

  if (isNaturalBlackjack(initialState)) {
    for (const holeDraw of availableDraws(shoe)) {
      const dealerInitial = normalizeBlackjackHand([dealerUpValue, holeDraw.value]);

      if (dealerInitial.total === 21) {
        aggregateDealerDistribution.natural += holeDraw.probability;
        continue;
      }

      const dealerDistribution = dealerDistributionFromKnownState(
        holeDraw.nextShoe,
        { total: dealerInitial.total, softAces: dealerInitial.softAces },
        rules,
        dealerMemo,
      );
      mergeDealerDistributions(aggregateDealerDistribution, dealerDistribution, holeDraw.probability);
    }

    const naturalEv = rules.blackjackPayout * (1 - aggregateDealerDistribution.natural);

    return {
      bestAction: "stand",
      bestEv: naturalEv,
      actions: [{ action: "stand", ev: naturalEv }],
      playerTotal: playerSummary.total,
      soft: playerSummary.soft,
      isPair: isBlackjackPair(initialState.values),
      isNatural: true,
      dealerDistribution: aggregateDealerDistribution,
      notes: [
        deckCount === 0
          ? "Infinite or unknown shoe with neutral draw weighting. Visible cards do not deplete the composition."
          : `${deckCount}-deck finite shoe with exact dealer hole-card conditioning.`,
        deckCount === 0
          ? "Running-count or exposed-card adjustments are ignored in infinite-shoe mode."
          : removedCards.length > 0
            ? `${removedCards.length} additional removed card(s) were taken out of the shoe before solving.`
            : "Only the visible player cards and dealer upcard were removed from the shoe.",
        "Natural blackjacks resolve before any player action tree is explored.",
      ],
      deckCount,
      removedCardCount: removedCards.length,
      remainingCards,
    } satisfies BlackjackSolution;
  }

  const actionTotals = new Map<BlackjackAction, number>(
    rootActions(initialState, rules).map((action) => [action, 0]),
  );

  for (const holeDraw of availableDraws(shoe)) {
    const dealerInitial = normalizeBlackjackHand([dealerUpValue, holeDraw.value]);

    if (dealerInitial.total === 21) {
      aggregateDealerDistribution.natural += holeDraw.probability;

      for (const action of actionTotals.keys()) {
        actionTotals.set(action, (actionTotals.get(action) ?? 0) - holeDraw.probability);
      }

      continue;
    }

    const dealerState: DealerState = {
      total: dealerInitial.total,
      softAces: dealerInitial.softAces,
    };
    const branchDistribution = dealerDistributionFromKnownState(holeDraw.nextShoe, dealerState, rules, dealerMemo);
    mergeDealerDistributions(aggregateDealerDistribution, branchDistribution, holeDraw.probability);

    const branchSolution = solveKnownDealerState(initialState, holeDraw.nextShoe, dealerState, rules, stateMemo, dealerMemo);
    const branchActionMap = new Map(branchSolution.actions.map((action) => [action.action, action.ev]));

    for (const action of actionTotals.keys()) {
      const ev = branchActionMap.get(action);

      if (ev === undefined) {
        continue;
      }

      actionTotals.set(action, (actionTotals.get(action) ?? 0) + (holeDraw.probability * ev));
    }
  }

  const actions = [...actionTotals.entries()]
    .map(([action, ev]) => ({ action, ev }))
    .sort((left, right) => right.ev - left.ev);
  const best = actions[0]!;

  return {
    bestAction: best.action,
    bestEv: best.ev,
    actions,
    playerTotal: playerSummary.total,
    soft: playerSummary.soft,
    isPair: isBlackjackPair(initialState.values),
    isNatural: false,
    dealerDistribution: aggregateDealerDistribution,
    notes: [
      deckCount === 0
        ? "Infinite or unknown shoe with neutral draw weighting. Visible cards do not deplete the composition."
        : `${deckCount}-deck finite shoe with exact dealer hole-card weighting.`,
      deckCount === 0
        ? "Running-count or exposed-card adjustments are ignored in infinite-shoe mode."
        : removedCards.length > 0
          ? `${removedCards.length} additional removed card(s) were taken out of the shoe before solving.`
          : "Only the visible player cards and dealer upcard were removed from the shoe.",
      deckCount === 0
        ? "Stand, hit, double, and surrender use infinite-shoe probabilities once the dealer upcard is known."
        : "Stand, hit, double, and surrender are composition-dependent for the remaining shoe.",
      "Split EV removes both opening split cards exactly, then solves each branch independently for later draws.",
      rules.splitAcesOneCardOnly
        ? "Split aces are limited to one additional card."
        : "Split aces can continue under the current rule set.",
      rules.doubleAfterSplit
        ? "Double after split is enabled."
        : "Double after split is disabled.",
    ],
    deckCount,
    removedCardCount: removedCards.length,
    remainingCards,
  } satisfies BlackjackSolution;
}