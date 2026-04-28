import type {
  CasinoWorkerRequest,
  CasinoWorkerRequestMap,
  CasinoWorkerResponse,
  CasinoWorkerResponseMap,
  CasinoWorkerTask,
} from "./casino-worker-types";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

let workerInstance: Worker | null = null;
let nextRequestId = 1;
const pendingRequests = new Map<number, PendingRequest>();

function rejectAllPending(message: string) {
  for (const pending of pendingRequests.values()) {
    pending.reject(new Error(message));
  }

  pendingRequests.clear();
}

function handleWorkerMessage(event: MessageEvent<CasinoWorkerResponse>) {
  const pending = pendingRequests.get(event.data.id);

  if (!pending) {
    return;
  }

  pendingRequests.delete(event.data.id);

  if (event.data.ok) {
    pending.resolve(event.data.result);
    return;
  }

  pending.reject(new Error(event.data.error));
}

function handleWorkerError(event: ErrorEvent) {
  const message = event.message || "Casino worker execution failed.";

  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }

  rejectAllPending(message);
}

function getWorker() {
  if (typeof window === "undefined") {
    throw new Error("Casino analysis workers are only available in the browser.");
  }

  if (!workerInstance) {
    workerInstance = new Worker(new URL("../workers/casino-worker.ts", import.meta.url), { type: "module" });
    workerInstance.addEventListener("message", handleWorkerMessage);
    workerInstance.addEventListener("error", handleWorkerError);
  }

  return workerInstance;
}

export function runCasinoWorkerTask<K extends CasinoWorkerTask>(
  type: K,
  payload: CasinoWorkerRequestMap[K],
) {
  return new Promise<CasinoWorkerResponseMap[K]>((resolve, reject) => {
    const worker = getWorker();
    const id = nextRequestId;

    nextRequestId += 1;
    pendingRequests.set(id, { resolve: resolve as (value: unknown) => void, reject });

    const request: CasinoWorkerRequest<K> = {
      id,
      type,
      payload,
    };

    worker.postMessage(request);
  });
}

export function disposeCasinoWorker() {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }

  rejectAllPending("Casino worker was disposed before the analysis completed.");
}