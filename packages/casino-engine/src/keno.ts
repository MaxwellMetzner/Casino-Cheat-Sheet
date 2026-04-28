export interface KenoPaytableEntry {
  hits: number;
  payoutToOne: number;
}

export interface KenoAnalysisRow {
  hits: number;
  ways: number;
  probability: number;
  payoutToOne: number;
  evContribution: number;
}

export interface KenoAnalysis {
  spotCount: number;
  drawCount: number;
  totalCombinations: number;
  hitProbability: number;
  expectedNet: number;
  evPerUnit: number;
  houseEdge: number;
  expectedReturn: number;
  rows: KenoAnalysisRow[];
}

export const KENO_NUMBER_COUNT = 80;
export const KENO_DRAW_COUNT = 20;
export const KENO_MAX_SPOTS = 10;

export const DEFAULT_KENO_PAYTABLES: Record<number, Record<number, number>> = {
  1: { 1: 3 },
  2: { 2: 12 },
  3: { 2: 1, 3: 42 },
  4: { 2: 1, 3: 4, 4: 120 },
  5: { 3: 2, 4: 15, 5: 800 },
  6: { 3: 1, 4: 3, 5: 80, 6: 1500 },
  7: { 3: 1, 4: 2, 5: 12, 6: 400, 7: 7000 },
  8: { 4: 2, 5: 12, 6: 100, 7: 1650, 8: 10000 },
  9: { 4: 1, 5: 5, 6: 50, 7: 1000, 8: 4000, 9: 10000 },
  10: { 0: 5, 5: 2, 6: 20, 7: 80, 8: 1000, 9: 5000, 10: 100000 },
};

export function combinationsCount(n: number, k: number) {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n) {
    return 0;
  }

  const normalizedK = Math.min(k, n - k);
  let result = 1;

  for (let index = 1; index <= normalizedK; index += 1) {
    result = (result * (n - normalizedK + index)) / index;
  }

  return result;
}

export function kenoHitProbability(spotCount: number, hits: number, drawCount = KENO_DRAW_COUNT) {
  const total = combinationsCount(KENO_NUMBER_COUNT, drawCount);
  const ways = combinationsCount(spotCount, hits) * combinationsCount(KENO_NUMBER_COUNT - spotCount, drawCount - hits);

  return {
    ways,
    probability: total === 0 ? 0 : ways / total,
  };
}

export function normalizeKenoPaytable(spotCount: number, entries?: KenoPaytableEntry[]) {
  if (entries) {
    return Object.fromEntries(entries.map((entry) => [entry.hits, entry.payoutToOne]));
  }

  return DEFAULT_KENO_PAYTABLES[spotCount] ?? {};
}

export function analyzeKenoTicket(
  spotCount: number,
  entries?: KenoPaytableEntry[],
  drawCount = KENO_DRAW_COUNT,
): KenoAnalysis {
  if (!Number.isInteger(spotCount) || spotCount < 1 || spotCount > KENO_MAX_SPOTS) {
    throw new Error(`Keno spot count must be between 1 and ${KENO_MAX_SPOTS}.`);
  }

  const paytable = normalizeKenoPaytable(spotCount, entries);
  const totalCombinations = combinationsCount(KENO_NUMBER_COUNT, drawCount);
  const rows = Array.from({ length: spotCount + 1 }, (_, hits) => {
    const { ways, probability } = kenoHitProbability(spotCount, hits, drawCount);
    const payoutToOne = paytable[hits] ?? 0;
    const evContribution = probability * (payoutToOne > 0 ? payoutToOne : -1);

    return {
      hits,
      ways,
      probability,
      payoutToOne,
      evContribution,
    } satisfies KenoAnalysisRow;
  });
  const expectedNet = rows.reduce((total, row) => total + row.evContribution, 0);
  const hitProbability = rows
    .filter((row) => row.payoutToOne > 0)
    .reduce((total, row) => total + row.probability, 0);

  return {
    spotCount,
    drawCount,
    totalCombinations,
    hitProbability,
    expectedNet,
    evPerUnit: expectedNet,
    houseEdge: -expectedNet,
    expectedReturn: 1 + expectedNet,
    rows,
  };
}
