export const SUITS = ["c", "d", "h", "s"] as const;
export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];

export interface Card {
  rank: Rank;
  suit: Suit;
  rankValue: number;
  code: string;
}

export const RANK_VALUE: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

const SUIT_SET = new Set<string>(SUITS);
const RANK_SET = new Set<string>(RANKS);

export function createCard(rank: Rank, suit: Suit): Card {
  return {
    rank,
    suit,
    rankValue: RANK_VALUE[rank],
    code: `${rank}${suit}`,
  };
}

export const FULL_DECK: Card[] = SUITS.flatMap((suit) =>
  RANKS.map((rank) => createCard(rank, suit)),
);

export function normalizeCardCode(rawCode: string) {
  const trimmed = rawCode.trim();

  if (!trimmed) {
    throw new Error("Card codes cannot be empty.");
  }

  const upper = trimmed.toUpperCase().replace(/^10/, "T");

  if (upper.length !== 2) {
    throw new Error(`Invalid card code: ${rawCode}`);
  }

  return `${upper[0]}${upper[1].toLowerCase()}`;
}

export function parseCardCode(rawCode: string): Card {
  const code = normalizeCardCode(rawCode);
  const rank = code[0] as Rank;
  const suit = code[1] as Suit;

  if (!RANK_SET.has(rank) || !SUIT_SET.has(suit)) {
    throw new Error(`Invalid card code: ${rawCode}`);
  }

  return createCard(rank, suit);
}

export function parseCardList(rawList: string): Card[] {
  const tokens = rawList
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);

  const cards = tokens.map(parseCardCode);
  ensureUniqueCards(cards);
  return cards;
}

export function ensureUniqueCards(cards: Card[]) {
  const seen = new Set<string>();

  for (const card of cards) {
    if (seen.has(card.code)) {
      throw new Error(`Duplicate card detected: ${card.code}`);
    }

    seen.add(card.code);
  }
}

export function remainingDeck(excludedCards: Card[]) {
  const excluded = new Set(excludedCards.map((card) => card.code));
  return FULL_DECK.filter((card) => !excluded.has(card.code));
}

export function sortCardsDescending(cards: Card[]) {
  return [...cards].sort((left, right) => right.rankValue - left.rankValue);
}

export function formatCardList(cards: Card[]) {
  return cards.map((card) => card.code).join(" ");
}

export function cardFromBlackjackValue(value: number): Card {
  const rankByValue: Record<number, Rank> = {
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
    10: "T",
    11: "A",
  };

  const rank = rankByValue[value];

  if (!rank) {
    throw new Error(`Unsupported blackjack value: ${value}`);
  }

  return createCard(rank, "s");
}