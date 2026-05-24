import "server-only";

import { reindexAll, type ReindexResult } from "./reindex";

export type ReindexJobStatus = "idle" | "running" | "succeeded" | "failed";

export type ReindexJobSnapshot = {
  jobId: string | null;
  status: ReindexJobStatus;
  startedAt: number | null;
  finishedAt: number | null;
  durationMs: number | null;
  startedByAdminId: number | null;
  result: ReindexResult | null;
  error: string | null;
};

type ReindexJobState = ReindexJobSnapshot & {
  runner: Promise<void> | null;
};

declare global {
  var __reindexJobState: ReindexJobState | undefined;
}

function getState(): ReindexJobState {
  if (!globalThis.__reindexJobState) {
    globalThis.__reindexJobState = {
      jobId: null,
      status: "idle",
      startedAt: null,
      finishedAt: null,
      durationMs: null,
      startedByAdminId: null,
      result: null,
      error: null,
      runner: null,
    };
  }
  return globalThis.__reindexJobState;
}

function snapshot(state: ReindexJobState): ReindexJobSnapshot {
  return {
    jobId: state.jobId,
    status: state.status,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    durationMs: state.durationMs,
    startedByAdminId: state.startedByAdminId,
    result: state.result,
    error: state.error,
  };
}

export function getReindexJobSnapshot(): ReindexJobSnapshot {
  return snapshot(getState());
}

export type StartReindexJobResult =
  | { started: true; snapshot: ReindexJobSnapshot }
  | { started: false; reason: "already-running"; snapshot: ReindexJobSnapshot };

export function startReindexJob(adminId: number): StartReindexJobResult {
  const state = getState();
  if (state.status === "running" && state.runner) {
    return { started: false, reason: "already-running", snapshot: snapshot(state) };
  }

  const jobId = `reindex_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  state.jobId = jobId;
  state.status = "running";
  state.startedAt = Date.now();
  state.finishedAt = null;
  state.durationMs = null;
  state.startedByAdminId = adminId;
  state.result = null;
  state.error = null;

  state.runner = reindexAll()
    .then((result) => {
      state.result = result;
      state.status = "succeeded";
    })
    .catch((err) => {
      state.error = err instanceof Error ? err.message : String(err);
      state.status = "failed";
    })
    .finally(() => {
      state.finishedAt = Date.now();
      state.durationMs = state.startedAt ? state.finishedAt - state.startedAt : null;
      state.runner = null;
    });

  return { started: true, snapshot: snapshot(state) };
}
