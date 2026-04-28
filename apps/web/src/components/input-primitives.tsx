"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";
import styles from "./casino-dashboard.module.css";

const CARD_RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"] as const;
const CARD_SUITS = [
  { code: "s", symbol: "", label: "spades", red: false },
  { code: "h", symbol: "", label: "hearts", red: true },
  { code: "d", symbol: "", label: "diamonds", red: true },
  { code: "c", symbol: "", label: "clubs", red: false },
] as const;
const CARD_SUIT_SYMBOLS: Record<(typeof CARD_SUITS)[number]["code"], string> = {
  s: "\u2660",
  h: "\u2665",
  d: "\u2666",
  c: "\u2663",
};
const CARD_RANK_LABELS: Record<(typeof CARD_RANKS)[number], string> = {
  A: "Ace",
  K: "King",
  Q: "Queen",
  J: "Jack",
  T: "Ten",
  9: "Nine",
  8: "Eight",
  7: "Seven",
  6: "Six",
  5: "Five",
  4: "Four",
  3: "Three",
  2: "Two",
};
const DIE_PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

type CardRank = (typeof CARD_RANKS)[number];
type CardSuit = (typeof CARD_SUITS)[number]["code"];
type VisualCardToken = `${CardRank}${CardSuit}`;
type CardPickerPresentation = "inline" | "dialog";

function normalizeCardToken(rawToken: string): VisualCardToken | null {
  const match = rawToken.trim().match(/^(A|K|Q|J|T|[2-9])([shdc])$/i);

  if (!match) {
    return null;
  }

  const [, rank, suit] = match;
  return `${rank.toUpperCase()}${suit.toLowerCase()}` as VisualCardToken;
}

function cardSuitMeta(token: VisualCardToken) {
  const suit = token.slice(1) as CardSuit;
  return CARD_SUITS.find((entry) => entry.code === suit)!;
}

function cardDisplayRank(token: VisualCardToken) {
  return token.startsWith("T") ? "10" : token[0]!;
}

function cardLabel(token: VisualCardToken) {
  const suit = cardSuitMeta(token);
  const rank = token[0]! as CardRank;
  return `${CARD_RANK_LABELS[rank]} of ${suit.label}`;
}

function formatRollDescriptor(dieOne: number, dieTwo: number) {
  const sum = dieOne + dieTwo;

  if ((sum === 4 || sum === 6 || sum === 8 || sum === 10) && dieOne === dieTwo) {
    return `Hard ${sum}`;
  }

  if (sum === 4 || sum === 6 || sum === 8 || sum === 10) {
    return `Easy ${sum}`;
  }

  return `Total ${sum}`;
}

function PlayingCard({
  token,
  empty,
  active,
  compact,
}: {
  token?: VisualCardToken;
  empty?: boolean;
  active?: boolean;
  compact?: boolean;
}) {
  const suit = token ? cardSuitMeta(token) : null;
  const cardClass = [
    styles.playingCardButton,
    compact ? styles.playingCardCompact : "",
    empty ? styles.playingCardEmpty : "",
    active ? styles.playingCardActive : "",
    suit?.red ? styles.playingCardRed : token ? styles.playingCardBlack : "",
  ].filter(Boolean).join(" ");

  return (
    <span className={cardClass}>
      {token && suit ? (
        <>
          <span className={styles.playingCardRank}>{cardDisplayRank(token)}</span>
          <span className={styles.playingCardSuit}>{CARD_SUIT_SYMBOLS[suit.code]}</span>
        </>
      ) : (
        <span className={styles.playingCardGhost}>Select</span>
      )}
    </span>
  );
}

function DieFace({ value }: { value: number }) {
  return (
    <span className={styles.dieFace} aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <span
          className={`${styles.diePip} ${DIE_PIPS[value]!.includes(index) ? styles.diePipActive : ""}`}
          key={index}
        />
      ))}
    </span>
  );
}

export function cardTokensFromInput(rawValue: string) {
  return rawValue
    .trim()
    .split(/\s+/)
    .map(normalizeCardToken)
    .filter((token): token is VisualCardToken => token !== null);
}

export function HelpHint({ text, label = "More information" }: { text: string; label?: string }) {
  const tooltipId = useId();

  return (
    <span className={styles.helpHintWrap}>
      <button
        type="button"
        className={styles.helpHint}
        aria-label={label}
        aria-describedby={tooltipId}
        onClick={(event) => event.preventDefault()}
      >
        ?
      </button>
      <span className={styles.helpTooltip} id={tooltipId} role="tooltip">
        {text}
      </span>
    </span>
  );
}

export function FieldLabel({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className={styles.fieldLabel}>
      <span className={styles.fieldLabelHeader}>
        <span>{label}</span>
        {hint ? <HelpHint text={hint} label={`${label} explanation`} /> : null}
      </span>
      {children}
    </label>
  );
}

export function ToggleField({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`${styles.toggleLabel} ${checked ? styles.toggleLabelActive : ""}`}>
      <input className={styles.toggleInput} type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className={styles.toggleContent}>
        <span>{label}</span>
        {hint ? <HelpHint text={hint} label={`${label} explanation`} /> : null}
      </span>
    </label>
  );
}

export function CardPickerField({
  label,
  hint,
  value,
  onChange,
  maxCards,
  unavailableCards = [],
  presentation = "inline",
  compact = true,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  maxCards: number;
  unavailableCards?: string[];
  presentation?: CardPickerPresentation;
  compact?: boolean;
}) {
  const selectedCards = cardTokensFromInput(value).slice(0, maxCards);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0);
  const slotCount = Math.min(maxCards, Math.max(selectedCards.length + (selectedCards.length < maxCards ? 1 : 0), 1));
  const normalizedActiveSlot = Math.min(activeSlot, Math.max(slotCount - 1, 0));
  const activeCard = selectedCards[normalizedActiveSlot];
  const blockedCards = new Set(
    unavailableCards
      .map(normalizeCardToken)
      .filter((token): token is VisualCardToken => token !== null),
  );

  selectedCards.forEach((card, index) => {
    if (index !== normalizedActiveSlot) {
      blockedCards.add(card);
    }
  });

  function commit(nextCards: VisualCardToken[]) {
    onChange(nextCards.join(" "));
  }

  function handleCardPick(token: VisualCardToken) {
    const nextCards = [...selectedCards];
    const targetIndex = normalizedActiveSlot < nextCards.length ? normalizedActiveSlot : nextCards.length;

    if (targetIndex >= maxCards) {
      return;
    }

    nextCards[targetIndex] = token;
    commit(nextCards);
    setActiveSlot(targetIndex >= selectedCards.length ? Math.min(targetIndex + 1, maxCards - 1) : targetIndex);
  }

  function handleRemoveActive() {
    if (!activeCard) {
      return;
    }

    const nextCards = selectedCards.filter((_, index) => index !== normalizedActiveSlot);
    commit(nextCards);
    setActiveSlot(Math.max(0, Math.min(normalizedActiveSlot, nextCards.length)));
  }

  const deckPanel = (
    <div className={presentation === "dialog" ? styles.pickerModalCard : styles.cardDeckPanel}>
      <div className={styles.cardFieldHeader}>
        <p className={styles.cardDeckSummary}>
          Active slot: {activeCard ? cardLabel(activeCard) : `Card ${normalizedActiveSlot + 1}`}. Cards already used elsewhere on the page are disabled.
        </p>
        {presentation === "dialog" ? (
          <button type="button" className={styles.pickerButton} onClick={() => setPickerOpen(false)}>
            Close picker
          </button>
        ) : null}
      </div>
      <div className={styles.cardDeckBySuit}>
        {CARD_SUITS.map((suit) => (
          <div className={styles.cardSuitSection} key={`${label}-${suit.code}`}>
            <span className={`${styles.cardSuitLabel} ${suit.red ? styles.playingCardRed : styles.playingCardBlack}`}>
              {CARD_SUIT_SYMBOLS[suit.code]} {suit.label}
            </span>
            <div className={styles.cardSuitRow}>
              {CARD_RANKS.map((rank) => {
                const token = `${rank}${suit.code}` as VisualCardToken;
                const disabled = blockedCards.has(token);

                return (
                  <button
                    type="button"
                    className={`${styles.cardDeckButton} ${suit.red ? styles.playingCardRed : styles.playingCardBlack}`}
                    key={`${label}-${token}`}
                    aria-label={cardLabel(token)}
                    disabled={disabled}
                    onClick={() => handleCardPick(token)}
                  >
                    <PlayingCard token={token} compact={compact} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={styles.cardField}>
      <div className={styles.fieldLabelHeader}>
        <span>{label}</span>
        {hint ? <HelpHint text={hint} label={`${label} explanation`} /> : null}
      </div>

      <div className={styles.cardFieldHeader}>
        <div className={styles.cardSlotRow}>
          {Array.from({ length: slotCount }, (_, index) => {
            const token = selectedCards[index];

            return (
              <button
                type="button"
                className={styles.cardSlotButton}
                key={`${label}-${index}`}
                aria-label={token ? `Edit ${cardLabel(token)}` : `Select card ${index + 1}`}
                onClick={() => {
                  setActiveSlot(index);
                  setPickerOpen(true);
                }}
              >
                <PlayingCard token={token} empty={!token} active={index === normalizedActiveSlot} compact={compact} />
              </button>
            );
          })}
        </div>

        <div className={styles.cardFieldActions}>
          <span className={styles.cardStatusText}>
            {selectedCards.length} selected{maxCards < 52 ? `, up to ${maxCards}` : ""}
          </span>
          <button type="button" className={styles.pickerButton} onClick={() => setPickerOpen((current) => !current)}>
            {pickerOpen ? (presentation === "dialog" ? "Close picker" : "Hide deck") : "Choose cards"}
          </button>
          <button type="button" className={styles.pickerButton} onClick={handleRemoveActive} disabled={!activeCard}>
            Remove active
          </button>
          <button type="button" className={styles.pickerButton} onClick={() => {
            onChange("");
            setActiveSlot(0);
          }} disabled={selectedCards.length === 0}>
            Clear
          </button>
        </div>
      </div>

      {pickerOpen ? (
        presentation === "dialog" ? (
          <div className={styles.pickerModalBackdrop} onClick={() => setPickerOpen(false)}>
            <div onClick={(event) => event.stopPropagation()}>
              {deckPanel}
            </div>
          </div>
        ) : (
          deckPanel
        )
      ) : null}
    </div>
  );
}

export function DiceRollField({
  label,
  hint,
  dieOne,
  dieTwo,
  onDieOneChange,
  onDieTwoChange,
  onResolve,
}: {
  label: string;
  hint?: string;
  dieOne: number;
  dieTwo: number;
  onDieOneChange: (value: number) => void;
  onDieTwoChange: (value: number) => void;
  onResolve: () => void;
}) {
  const diceOptions = Array.from({ length: 6 }, (_, index) => index + 1);

  return (
    <div className={styles.diceField}>
      <div className={styles.fieldLabelHeader}>
        <span>{label}</span>
        {hint ? <HelpHint text={hint} label={`${label} explanation`} /> : null}
      </div>

      <div className={styles.diceSelectorGrid}>
        {[
          { title: "Die one", value: dieOne, onChange: onDieOneChange },
          { title: "Die two", value: dieTwo, onChange: onDieTwoChange },
        ].map((die) => (
          <div className={styles.diceLane} key={die.title}>
            <span className={styles.cardStatusText}>{die.title}</span>
            <div className={styles.diceOptions}>
              {diceOptions.map((value) => (
                <button
                  type="button"
                  className={`${styles.dieButton} ${die.value === value ? styles.dieButtonActive : ""}`}
                  key={`${die.title}-${value}`}
                  aria-label={`${die.title} ${value}`}
                  onClick={() => die.onChange(value)}
                >
                  <DieFace value={value} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.selectedDiceSummary}>
        <div className={styles.selectedDicePair}>
          <span className={styles.selectedDieFace}><DieFace value={dieOne} /></span>
          <span className={styles.selectedDieFace}><DieFace value={dieTwo} /></span>
        </div>
        <div className={styles.selectedDiceMeta}>
          <strong>{formatRollDescriptor(dieOne, dieTwo)}</strong>
          <span>{dieOne} + {dieTwo} = {dieOne + dieTwo}</span>
        </div>
        <button type="button" className={styles.actionButton} onClick={onResolve}>
          Resolve selected roll
        </button>
      </div>
    </div>
  );
}
