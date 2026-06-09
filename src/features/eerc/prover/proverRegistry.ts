// Module-scope singleton connecting the snarkjs bridge (plain module, no React)
// to the ProverHost WebView (React). FIFO, one proof in flight; jobs queue until
// the page signals ready. Same module-cache pattern as features/eerc/session.ts.

export type ProverJob = {
  id: number;
  op: "fullProve" | "calldata";
  payload: unknown;
};

type ProverResult = {
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
};

type Pending = {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

// Proving a transfer takes seconds-to-minutes in the WebView; 5 minutes is the
// "something is actually wrong" line, not an expected duration.
const JOB_TIMEOUT_MS = 5 * 60 * 1000;

let nextId = 1;
let sendToHost: ((job: ProverJob) => void) | null = null;
let hostReady = false;
let inFlight: number | null = null;
const pending = new Map<number, Pending>();
const queue: ProverJob[] = [];

function pump(): void {
  if (inFlight !== null || !hostReady || !sendToHost) return;
  const job = queue.shift();
  if (!job) return;
  inFlight = job.id;
  sendToHost(job);
}

function settle(id: number): Pending | null {
  const entry = pending.get(id);
  if (!entry) return null;
  pending.delete(id);
  clearTimeout(entry.timer);
  if (inFlight === id) inFlight = null;
  return entry;
}

function failJob(id: number, err: Error): void {
  settle(id)?.reject(err);
  pump();
}

export function submitJob(op: ProverJob["op"], payload: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      failJob(id, new Error("Proof generation timed out — please try again."));
    }, JOB_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    queue.push({ id, op, payload });
    pump();
  });
}

export function deliverResult(msg: ProverResult): void {
  const entry = settle(msg.id);
  if (!entry) return;
  if (msg.ok) entry.resolve(msg.result);
  else entry.reject(new Error(msg.error ?? "Proof generation failed."));
  pump();
}

export function markProverReady(): void {
  hostReady = true;
  pump();
}

// The page is gone or reloading (crash recovery): hold new work until the
// fresh page posts "ready" again.
export function markProverNotReady(): void {
  hostReady = false;
}

export function failInFlight(err: Error): void {
  if (inFlight !== null) failJob(inFlight, err);
}

export function registerProverHost(send: (job: ProverJob) => void): void {
  sendToHost = send;
  hostReady = false; // the page signals readiness itself
}

export function unregisterProverHost(): void {
  sendToHost = null;
  hostReady = false;
  const err = new Error("Proof generation was interrupted — please try again.");
  for (const id of [...pending.keys()]) {
    settle(id)?.reject(err);
  }
  queue.length = 0;
  inFlight = null;
}
