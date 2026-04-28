import Link from "next/link";
import { casinoCatalog, type CasinoGameEntry } from "casino-engine";
import styles from "./casino-dashboard.module.css";

const GAME_BY_SLUG = Object.fromEntries(
  casinoCatalog.map((game) => [game.slug, game]),
) as Record<string, CasinoGameEntry>;

const DASHBOARD_GROUPS = [
  {
    title: "Table Games",
    slugs: ["roulette", "baccarat", "craps"],
  },
  {
    title: "Casino Card Games",
    slugs: ["blackjack", "video-poker", "three-card-poker", "pai-gow-poker"],
  },
  {
    title: "Poker Variants",
    slugs: ["texas-holdem", "omaha", "seven-card-stud"],
  },
] as const;

export function DashboardHome() {
  return (
    <main className={styles.pageShell}>
      <section className={`${styles.hero} ${styles.dashboardHero}`}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Casino Cheat Sheet</p>
          <h1>Casino Cheat Sheet</h1>
          <p className={styles.heroText}>
            A static-friendly casino analysis site for exact table odds, practical EV, and browser-side poker equity.
          </p>
        </div>

        <div className={styles.heroPanel}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Mission</span>
            <strong>Fast, credible gambling math</strong>
            <p>Choose a game and work directly with exact odds, EV, and browser-side simulations.</p>
          </div>
        </div>
      </section>

      <section className={styles.dashboardGrid}>
        {DASHBOARD_GROUPS.map((group) => (
          <article className={styles.moduleCard} key={group.title}>
            <div className={styles.dashboardGroupHeader}>
              <h2 className={styles.pageSectionTitle}>{group.title}</h2>
              <span className={styles.dashboardGroupCount}>{group.slugs.length} pages</span>
            </div>
            <div className={styles.dashboardLinkList}>
              {group.slugs.map((slug) => {
                const game = GAME_BY_SLUG[slug];

                return (
                  <Link className={styles.dashboardLinkCard} href={`/${game.slug}`} key={game.slug}>
                    <div className={styles.dashboardLinkTopRow}>
                      <strong>{game.title}</strong>
                      <span className={styles.dashboardLinkCue}>Open page</span>
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