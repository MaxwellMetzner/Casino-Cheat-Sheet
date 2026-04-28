export type EngineFamily =
  | "exact-combinatorics"
  | "equity-evaluator"
  | "research-mode";

export type ReleaseStage = "live" | "planned" | "research";

export interface EngineTrack {
  key: EngineFamily;
  title: string;
  description: string;
  emphasis: string;
}

export interface CasinoGameEntry {
  slug: string;
  title: string;
  family: EngineFamily;
  stage: ReleaseStage;
  blurb: string;
  firstMilestone: string;
  rulesFocus: string;
  oddsFocus: string;
  analyzerFocus: string;
  outputs: string[];
}

export const engineTracks: EngineTrack[] = [
  {
    key: "exact-combinatorics",
    title: "Exact combinatorics engine",
    description:
      "Rule-driven casino games with deterministic payouts, cached tables, and exact expected-value math.",
    emphasis:
      "Roulette, baccarat, craps, blackjack, video poker, three card poker, and pai gow belong here.",
  },
  {
    key: "equity-evaluator",
    title: "Poker equity engine",
    description:
      "Evaluator-backed poker tools built for hand strength, range-vs-range equity, draw density, and percentile analysis.",
    emphasis:
      "Texas Hold'em, Omaha, and seven-card stud ship as browser-friendly analysis labs before any solver claims.",
  },
  {
    key: "research-mode",
    title: "Research mode",
    description:
      "Small imperfect-information experiments reserved for CFR-style toys and tightly scoped postflop studies.",
    emphasis:
      "This is where Kuhn, Leduc, and future limited betting-tree experiments live, not a day-one no-limit solver.",
  },
];

export const casinoCatalog: CasinoGameEntry[] = [
  {
    slug: "roulette",
    title: "Roulette",
    family: "exact-combinatorics",
    stage: "live",
    blurb:
      "Deterministic wheel math for American and European layouts, including the American first-five exception.",
    firstMilestone:
      "Ship exact per-bet probability, expected value, and house-edge tables for every common inside and outside bet.",
    rulesFocus:
      "Standard table bets are modeled as covered pockets plus a payout multiplier. Wheel size does the rest.",
    oddsFocus:
      "Win rate is covered numbers divided by wheel size, while EV follows directly from the posted payout-to-one.",
    analyzerFocus:
      "Interactive bet inspector with immediate win rate, loss rate, EV per unit, and expected return.",
    outputs: [
      "Win probability",
      "Loss probability",
      "EV per unit",
      "House edge",
    ],
  },
  {
    slug: "baccarat",
    title: "Baccarat",
    family: "exact-combinatorics",
    stage: "live",
    blurb:
      "Exact third-card logic with standard Player, Banker, and Tie payout references.",
    firstMilestone:
      "Expose the deterministic draw tree and make the commission-adjusted Banker edge easy to inspect.",
    rulesFocus:
      "Player and Banker actions are entirely rule-driven once the two-card totals and Player third card are known.",
    oddsFocus:
      "Standard wagers highlight why Banker is strongest despite the commission and why Tie is expensive.",
    analyzerFocus:
      "Decision-tree explainer that shows when the Player draws, when the Banker draws, and why.",
    outputs: [
      "Wager payout table",
      "House edge reference",
      "Player draw rule",
      "Banker draw rule",
    ],
  },
  {
    slug: "craps",
    title: "Craps",
    family: "exact-combinatorics",
    stage: "live",
    blurb:
      "Reducer-style table state with exact roll frequencies and bet-resolution logic across line, odds, place, buy, and hardways.",
    firstMilestone:
      "Model come-out, point, and per-roll bet resolution before layering in more niche proposition bets.",
    rulesFocus:
      "The table is a state machine: come-out rolls establish points, active bets travel, and every roll resolves against a known distribution.",
    oddsFocus:
      "Core bets surface published house edges while true odds remain explicitly zero-edge add-ons.",
    analyzerFocus:
      "One-roll state preview for a configured table, including travel events, wins, losses, pushes, and next table state.",
    outputs: [
      "Roll distribution",
      "Line bet outcomes",
      "Odds payout logic",
      "Next-state preview",
    ],
  },
  {
    slug: "keno",
    title: "Keno",
    family: "exact-combinatorics",
    stage: "live",
    blurb:
      "Exact 80-number ticket odds with editable spot selection, sample payouts, hit distribution, and EV.",
    firstMilestone:
      "Make the 80-number board usable first, then show hit probabilities and return by catch count.",
    rulesFocus:
      "A standard keno draw picks 20 numbers from 80; a ticket wins according to how many selected spots are caught.",
    oddsFocus:
      "Every hit count is a hypergeometric probability: chosen hits, missed chosen spots, and the remaining draw pool.",
    analyzerFocus:
      "Select 1 to 10 spots, compare the exact hit distribution, and read EV against the active paytable.",
    outputs: [
      "Hit probability",
      "EV per ticket",
      "House edge",
      "Catch distribution",
    ],
  },
  {
    slug: "blackjack",
    title: "Blackjack",
    family: "exact-combinatorics",
    stage: "live",
    blurb:
      "A rule-parameterized EV engine with recursive action search, cached dealer probabilities, and split-aware memoization.",
    firstMilestone:
      "Precompute common rule tables offline and keep a slower exact composition-dependent mode for advanced users.",
    rulesFocus:
      "Deck count, soft 17, DAS, RSA, surrender, penetration, and split caps need to be explicit inputs.",
    oddsFocus:
      "Every displayed basic-strategy move should be backed by exact stand, hit, double, split, and surrender EV.",
    analyzerFocus:
      "Show the best action, second-best action, EV gap, and dealer outcome distribution for the selected shoe state.",
    outputs: [
      "Best action",
      "EV by action",
      "Dealer distribution",
      "Rule sensitivity",
    ],
  },
  {
    slug: "video-poker",
    title: "Video Poker",
    family: "exact-combinatorics",
    stage: "live",
    blurb:
      "Exact hold/discard analysis over all 32 masks for a paytable-aware five-card draw decision.",
    firstMilestone:
      "Start with 9/6 Jacks or Better and expand outward by swapping only the paytable and ranking tables.",
    rulesFocus:
      "The entire product is the paytable plus final hand-ranking logic for each draw outcome.",
    oddsFocus:
      "Enumerate every draw for every hold mask and compare exact EV instead of relying on mnemonic charts.",
    analyzerFocus:
      "Recommend the best hold, list runner-up holds, and break down category frequencies after the draw.",
    outputs: [
      "Best hold mask",
      "Exact EV",
      "Runner-up holds",
      "Final rank distribution",
    ],
  },
  {
    slug: "three-card-poker",
    title: "Three Card Poker",
    family: "exact-combinatorics",
    stage: "live",
    blurb:
      "Exact threshold-based analysis for Pair Plus and Ante/Play decisions under standard base rules.",
    firstMilestone:
      "Expose the Q-6-4 raise threshold with exact outcome frequencies and optional side-bet references.",
    rulesFocus:
      "Ante/Play and Pair Plus are separate products with separate probabilities and should never be blended.",
    oddsFocus:
      "Base-game math emphasizes the raise threshold, dealer qualification, and the cost of chasing side bets.",
    analyzerFocus:
      "Turn a three-card hand into an exact play-or-fold recommendation with payout context.",
    outputs: [
      "Raise threshold check",
      "Dealer-qualify context",
      "Exact base-game EV",
      "Side-bet notes",
    ],
  },
  {
    slug: "pai-gow-poker",
    title: "Pai Gow Poker",
    family: "exact-combinatorics",
    stage: "live",
    blurb:
      "Hand-setting assistant that compares player splits against common house-way defaults and banker-copy rules.",
    firstMilestone:
      "Focus on reliable hand-setting recommendations before expanding into commission and banking-mode comparisons.",
    rulesFocus:
      "Copy hands, 5% commission, joker handling, and house way all affect the educational guidance.",
    oddsFocus:
      "The key question is whether a split improves win/push frequency under the house-way conventions in play.",
    analyzerFocus:
      "Suggest the strongest high-hand / low-hand split and explain when deviating from house way matters.",
    outputs: [
      "Recommended split",
      "House-way comparison",
      "Push frequency intuition",
      "Commission note",
    ],
  },
  {
    slug: "texas-holdem",
    title: "Texas Hold'em",
    family: "equity-evaluator",
    stage: "live",
    blurb:
      "Range-vs-range equity lab built on a fast evaluator, exhaustive enumeration where possible, and Monte Carlo elsewhere.",
    firstMilestone:
      "Launch as a browser equity tool, not a no-limit GTO solver, with showdown, draw, and percentile outputs.",
    rulesFocus:
      "Players can use any five of seven available cards, so evaluator speed and card-completion logic drive the UX.",
    oddsFocus:
      "Show equity, tie rate, made-hand rank, draw density, and percentile against a selected opponent range.",
    analyzerFocus:
      "Accept hole cards, board cards, and hand ranges, then return equity and hand-strength context by street.",
    outputs: [
      "Equity",
      "Tie frequency",
      "Draw completion rates",
      "Percentile",
    ],
  },
  {
    slug: "omaha",
    title: "Omaha",
    family: "equity-evaluator",
    stage: "live",
    blurb:
      "Evaluator-backed Omaha lab with the exact two-from-hand, three-from-board rule enforced at every comparison.",
    firstMilestone:
      "Use the Hold'em-style lab shell but swap in an Omaha-specific evaluator and range parser.",
    rulesFocus:
      "Every hand comparison must enforce exactly two hole cards and exactly three board cards.",
    oddsFocus:
      "Equity shifts much faster in Omaha, so nut potential and redraw frequency deserve first-class outputs.",
    analyzerFocus:
      "Compare equities, nut potential, redraw density, and board-coverage strength for selected hands or ranges.",
    outputs: [
      "Equity",
      "Nut potential",
      "Redraw frequency",
      "Board coverage",
    ],
  },
  {
    slug: "seven-card-stud",
    title: "Seven-Card Stud",
    family: "equity-evaluator",
    stage: "live",
    blurb:
      "Street-by-street stud analyzer for exposed-card effects, hand strength, and showdown equity.",
    firstMilestone:
      "Treat dead cards and visible upcards as first-class input so the analyzer feels like stud, not Hold'em with fewer boards.",
    rulesFocus:
      "There is no community board, so visible upcards and removal effects need dedicated UI and evaluator support.",
    oddsFocus:
      "Show live outs, equity shifts by street, and relative percentile against exposed-card states.",
    analyzerFocus:
      "Accept door cards, upcards, dead cards, and hidden cards, then report hand strength and draw health.",
    outputs: [
      "Street equity",
      "Live outs",
      "Removal effects",
      "Percentile",
    ],
  },
];
