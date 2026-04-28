import {
  analyzePaiGowHand,
  analyzeThreeCardPokerHand,
  analyzeVideoPokerHand,
  simulateHoldemEquity,
  simulateOmahaEquity,
  simulateSevenCardStudEquity,
  solveBlackjackHand,
} from "casino-engine";
import type {
  AnyCasinoWorkerRequest,
  CasinoWorkerErrorResponse,
  CasinoWorkerRequest,
  CasinoWorkerResponseMap,
  CasinoWorkerSuccessResponse,
  CasinoWorkerTask,
} from "../lib/casino-worker-types";

function success<K extends CasinoWorkerTask>(
  request: CasinoWorkerRequest<K>,
  result: CasinoWorkerResponseMap[K],
): CasinoWorkerSuccessResponse<K> {
  return {
    id: request.id,
    type: request.type,
    ok: true,
    result,
  };
}

function failure<K extends CasinoWorkerTask>(request: CasinoWorkerRequest<K>, error: string): CasinoWorkerErrorResponse<K> {
  return {
    id: request.id,
    type: request.type,
    ok: false,
    error,
  };
}

function handleRequest(request: AnyCasinoWorkerRequest) {
  switch (request.type) {
    case "blackjack":
      return success(
        request,
        solveBlackjackHand(request.payload.playerCards, request.payload.dealerUpCard, request.payload.options),
      );
    case "videoPoker":
      return success(request, analyzeVideoPokerHand(request.payload.hand));
    case "threeCard":
      return success(request, analyzeThreeCardPokerHand(request.payload.hand));
    case "paiGow":
      return success(request, analyzePaiGowHand(request.payload.hand, request.payload.trials));
    case "holdem":
      return success(request, simulateHoldemEquity(request.payload));
    case "omaha":
      return success(request, simulateOmahaEquity(request.payload));
    case "stud":
      return success(request, simulateSevenCardStudEquity(request.payload));
  }
}

globalThis.addEventListener("message", (event: MessageEvent<AnyCasinoWorkerRequest>) => {
  const request = event.data;

  try {
    globalThis.postMessage(handleRequest(request));
  } catch (error) {
    globalThis.postMessage(
      failure(
        request,
        error instanceof Error ? error.message : "Casino analysis worker failed.",
      ),
    );
  }
});

export {};