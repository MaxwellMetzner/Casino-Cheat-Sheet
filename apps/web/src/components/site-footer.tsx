import styles from "./casino-dashboard.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.siteFooter}>
      <span>Casino Cheat Sheet</span>
      <a href="https://maxwellmetzner.github.io" rel="noopener noreferrer">
        maxwellmetzner.github.io
      </a>
    </footer>
  );
}
