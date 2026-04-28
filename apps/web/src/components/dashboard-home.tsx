import Link from "next/link";
import { casinoCatalog, type CasinoGameEntry } from "casino-engine";
import styles from "./casino-dashboard.module.css";

const GAME_BY_SLUG = Object.fromEntries(
  casinoCatalog.map((game) => [game.slug, game]),
) as Record<string, CasinoGameEntry>;

const DASHBOARD_GROUPS = [
  {
    title: "Table Games",
    summary: "Board-first layouts",
    slugs: ["roulette", "baccarat", "craps", "keno"],
  },
  {
    title: "Casino Card Games",
    summary: "Fast hand decisions",
    slugs: ["blackjack", "video-poker", "three-card-poker", "pai-gow-poker"],
  },
  {
    title: "Poker Variants",
    summary: "Equity and removal",
    slugs: ["texas-holdem", "omaha", "seven-card-stud"],
  },
] as const;

export function DashboardHome() {
  return (
    <main className={styles.pageShell}>
      <header className={styles.dashboardHeader}>
        <div className={styles.dashboardHeaderGrid}>
          <div className={styles.dashboardHeaderCopy}>
            <p className={styles.eyebrow}>Casino Cheat Sheet</p>
            <h1 className={styles.dashboardTitle}>Compact casino odds tools</h1>
            <p className={styles.dashboardBlurb}>
              Exact table math, card-hand decisions, and poker equity labs with the working boards first.
            </p>
          </div>

          <div className={styles.dashboardFactGrid}>
            <div className={styles.compactFact}>
              <span className={styles.statLabel}>Cards</span>
              <strong>Compact pickers for blackjack, video poker, and poker equity inputs.</strong>
            </div>
            <div className={styles.compactFact}>
              <span className={styles.statLabel}>Tables</span>
              <strong>Board-first controls for roulette, craps, baccarat, and keno.</strong>
            </div>
          </div>
        </div>
      </header>

      <section className={styles.dashboardGrid}>
        {DASHBOARD_GROUPS.map((group) => (
          <article className={styles.moduleCard} key={group.title}>
            <div className={styles.dashboardGroupHeader}>
              <h2 className={styles.pageSectionTitle}>{group.title}</h2>
              <span className={styles.dashboardGroupMeta}>{group.summary}</span>
            </div>
            <div className={styles.dashboardLinkList}>
              {group.slugs.map((slug) => {
                const game = GAME_BY_SLUG[slug];

                return (
                  <Link className={styles.dashboardLinkCard} href={`/${game.slug}`} key={game.slug}>
                    <div className={styles.dashboardLinkTopRow}>
                      <strong>{game.title}</strong>
                      <span className={styles.dashboardLinkCue}>Open</span>
                    </div>
                    <div className={styles.outputCluster}>
                      {game.outputs.slice(0, 2).map((output) => (
                        <span className={styles.outputChip} key={output}>
                          {output}
                        </span>
                      ))}
                    </div>
                  </Link>
                );
              })}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
