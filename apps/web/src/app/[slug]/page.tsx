import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { casinoCatalog } from "casino-engine";
import { BlackjackPage, PaiGowPokerPage, ThreeCardPokerPage, VideoPokerPage } from "@/components/pages/card-pages";
import { BaccaratPage, CrapsPage, RoulettePage } from "@/components/pages/exact-pages";
import { HoldemPage, OmahaPage, StudPage, ToyCfrPage } from "@/components/pages/poker-pages";

const GAME_BY_SLUG = Object.fromEntries(
  casinoCatalog.map((game) => [game.slug, game]),
) as Record<string, (typeof casinoCatalog)[number]>;

const GAME_PAGE_BY_SLUG = {
  roulette: RoulettePage,
  baccarat: BaccaratPage,
  craps: CrapsPage,
  blackjack: BlackjackPage,
  "video-poker": VideoPokerPage,
  "three-card-poker": ThreeCardPokerPage,
  "pai-gow-poker": PaiGowPokerPage,
  "texas-holdem": HoldemPage,
  omaha: OmahaPage,
  "seven-card-stud": StudPage,
  "toy-gto-lab": ToyCfrPage,
} as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return casinoCatalog.map((game) => ({ slug: game.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const game = GAME_BY_SLUG[slug];

  if (!game) {
    return {
      title: "Not Found | Casino Cheat Sheet",
    };
  }

  return {
    title: `${game.title} | Casino Cheat Sheet`,
    description: game.blurb,
  };
}

export default async function GamePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const Component = GAME_PAGE_BY_SLUG[slug as keyof typeof GAME_PAGE_BY_SLUG];

  if (!Component) {
    notFound();
  }

  return <Component />;
}