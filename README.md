# Casino Cheat Sheet

Casino Cheat Sheet is a single educational website for casino-game analysis. The current build is structured around two engines under one UI:

- Exact combinatorics for rule-driven games such as roulette, baccarat, craps, blackjack, video poker, three card poker, and pai gow poker.
- Evaluator-backed equity tooling for poker formats such as Texas Hold'em, Omaha, and seven-card stud.

## Current state

The site now ships a lightweight dashboard homepage plus separate static-exported pages for the live analyzers:

- Roulette
- Baccarat
- Craps
- Blackjack with finite-shoe EV solving
- Video poker exact hold analysis
- Three Card Poker decision analysis
- Pai Gow Poker split simulation
- Texas Hold'em equity with exact hands, shorthand ranges, and multiway support
- Omaha equity with multiway support
- Seven-card stud equity with dead-card removal and multiway support

The old research-mode placeholder has been narrowed into a background-only Toy CFR research page rather than a main dashboard destination.

## Workspace layout

- `apps/web`: Next.js 16 App Router frontend
- `packages/casino-engine`: shared pure-function engine package consumed by the frontend

## Run locally

From the repository root:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

Root scripts forward into the Next.js app workspace, so `npm run build` and `npm run lint` also work from the repo root.

If you want to work directly inside the frontend package instead, the same scripts still exist in `apps/web`.

## GitHub Pages

The frontend is configured for static export and can be deployed to GitHub Pages.

- `next.config.ts` enables `output: "export"`.
- `.nojekyll` is copied into the exported site so `_next` assets are served correctly.
- `.github/workflows/deploy-pages.yml` builds `apps/web/out` and deploys it through GitHub Pages actions.
- The app uses pure client-side state and shared pure-function engines, so no server runtime is required.

For a project site, the workflow publishes under `/Casino-Cheat-Sheet` by default. If you deploy under a custom domain or a different repository path, set `BASE_PATH` or `NEXT_PUBLIC_BASE_PATH` accordingly at build time.

## Implementation notes

- Roulette now supports combined layout analysis, including multiple simultaneous bets with merged win-rate and EV math.
- Baccarat implements the deterministic Player and Banker third-card rules plus standard wager references.
- Craps is modeled as a reducer-style table-state engine with line bets, odds, field, place bets, buy bets, and hardways.
- Blackjack now solves against a composition-dependent finite shoe, with optional exposed-card removal and configurable split rules.
- Heavier analyzers run inside a browser worker so the static UI stays responsive while solving or simulating.
- Hold'em supports exact villain cards, shorthand ranges, and multi-opponent fields; Omaha and stud now support multiway fields as well.
- The frontend now uses a simple game dashboard at `/` and separate per-game pages for the live tools.
- The frontend is intentionally presentation-focused; game math lives in the shared engine package.