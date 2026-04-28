import type {
  BlackjackSolution,
  BlackjackSolveOptions,
  Card,
  HoldemSimulationInput,
  OmahaSimulationInput,
  PaiGowAnalysis,
  PokerEquityResult,
  SevenCardStudSimulationInput,
  ThreeCardPokerAnalysis,
  VideoPokerAnalysis,
} from "casino-engine";

export interface CasinoWorkerRequestMap {
  blackjack: {
    playerCards: Card[];
    dealerUpCard: Card;
    options?: BlackjackSolveOptions;
  };
  videoPoker: {
    hand: Card[];
  };
  threeCard: {
    hand: Card[];
  };
  paiGow: {
    hand: Card[];
    trials: number;
  };
  holdem: HoldemSimulationInput;
  omaha: OmahaSimulationInput;
  stud: SevenCardStudSimulationInput;
}

export interface CasinoWorkerResponseMap {
  blackjack: BlackjackSolution;
  videoPoker: VideoPokerAnalysis;
  threeCard: ThreeCardPokerAnalysis;
  paiGow: PaiGowAnalysis;
  holdem: PokerEquityResult;
  omaha: PokerEquityResult;
  stud: PokerEquityResult;
}

export type CasinoWorkerTask = keyof CasinoWorkerRequestMap;

export type CasinoWorkerRequest<K extends CasinoWorkerTask = CasinoWorkerTask> = {
  id: number;
  type: K;
  payload: CasinoWorkerRequestMap[K];
};

export type CasinoWorkerSuccessResponse<K extends CasinoWorkerTask = CasinoWorkerTask> = {
  id: number;
  type: K;
  ok: true;
  result: CasinoWorkerResponseMap[K];
};

export type CasinoWorkerErrorResponse<K extends CasinoWorkerTask = CasinoWorkerTask> = {
  id: number;
  type: K;
  ok: false;
  error: string;
};

export type CasinoWorkerResponse<K extends CasinoWorkerTask = CasinoWorkerTask> =
  | CasinoWorkerSuccessResponse<K>
  | CasinoWorkerErrorResponse<K>;

export type AnyCasinoWorkerRequest = {
  [K in CasinoWorkerTask]: CasinoWorkerRequest<K>;
}[CasinoWorkerTask];

export type AnyCasinoWorkerResponse = {
  [K in CasinoWorkerTask]: CasinoWorkerResponse<K>;
}[CasinoWorkerTask];