import Link from "next/link";
import { casinoCatalog, type CasinoGameEntry } from "casino-engine";
import styles from "./casino-dashboard.module.css";

const GAME_BY_SLUG = Object.fromEntries(
  casinoCatalog.map((game) => [game.slug, game]),
) as Record<string, CasinoGameEntry>;

const DASHBOARD_GROUPS = [
  {
    title: "Tables",
    summary: "Click the table state",
    slugs: ["roulette", "baccarat", "craps", "keno"],
  },
  {
    title: "Hands",
    summary: "Pick cards, get the decision",
    slugs: ["blackjack", "video-poker", "three-card-poker", "pai-gow-poker"],
  },
  {
    title: "Poker Equity",
    summary: "Run compact simulations",
    slugs: ["texas-holdem", "omaha", "seven-card-stud"],
  },
] as const;

export function DashboardHome() {
  return (
    <main className={styles.pageShell}>
      <header className={styles.dashboardHeader}>
        <div className={styles.dashboardHeaderGrid}>
          <div className={styles.dashboardHeaderCopy}>
            <h1 className={styles.dashboardTitle}>Choose a tool</h1>
            <p className={styles.dashboardBlurb}>
              Open the game, enter the current hand or table state, and run the calculator.
            </p>
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
            <div className={styles.dashboardToolList}>
              {group.slugs.map((slug) => {
                const game = GAME_BY_SLUG[slug];

                return (
                  <Link className={styles.dashboardToolLink} href={`/${game.slug}`} key={game.slug}>
                    <div className={styles.dashboardLinkTopRow}>
                      <strong>{game.title}</strong>
                      <span className={styles.dashboardLinkCue}>Open</span>
                    </div>
                    <span className={styles.dashboardToolSummary}>{game.analyzerFocus}</span>
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
