import { get as getFromIdb, set as setInIdb } from "idb-keyval";
import { apiFetch } from "../api/client";
import type { Visit } from "../api/types";

type MutationType = "visit" | "visit-start" | "visit-note" | "visit-end" | "location";

export type QueuedMutation = {
  id: string;
  type: MutationType;
  endpoint: string;
  method: "POST" | "PUT";
  payload: unknown;
  createdAt: string;
  idempotencyKey: string;
  retryCount: number;
  nextRetryAt?: string;
  lastError?: string;
  localVisitId?: string;
  visitId?: string;
};

type OfflineVisitProjection = Visit & {
  localVisitId?: string;
};

type QueueMeta = {
  lastSyncAt?: string;
  lastAttemptAt?: string;
  lastConflictAt?: string;
  lastOfflineAt?: string;
  offlineSecondsByDay?: Record<string, number>;
  droppedCount?: number;
  localVisitIdMap?: Record<string, string>;
  storage?: "indexeddb" | "localStorage";
};

const STORAGE_KEY = "dpm-offline-queue-v2";
const META_KEY = "dpm-offline-queue-meta-v2";
const OFFLINE_VISITS_KEY = "dpm-offline-visits-v2";
const MAX_QUEUE_LENGTH = 200;
const MAX_OFFLINE_SECONDS_PER_DAY = 60 * 60;
const RETRY_BASE_MS = 15_000;
const RETRY_MAX_MS = 5 * 60_000;
export const OFFLINE_QUEUE_CHANGED_EVENT = "dpm-offline-queue-changed";

function notifyQueueChanged(count: number) {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_CHANGED_EVENT, { detail: { count } }));
  }
}

const supportsIndexedDb = () => typeof indexedDB !== "undefined";

async function readStoredValue<T>(key: string, fallback: T): Promise<T> {
  if (supportsIndexedDb()) {
    try {
      const stored = await getFromIdb<T>(key);
      if (stored != null) {
        return stored;
      }
    } catch (error) {
      console.warn("IndexedDB read failed, falling back to localStorage.", error);
    }
  }

  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeStoredValue<T>(key: string, value: T) {
  if (supportsIndexedDb()) {
    try {
      await setInIdb(key, value);
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore local cleanup failures.
      }
      return "indexeddb" as const;
    } catch (error) {
      console.warn("IndexedDB write failed, falling back to localStorage.", error);
    }
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Failed to persist offline state.", error);
  }
  return "localStorage" as const;
}

async function readQueue() {
  return readStoredValue<QueuedMutation[]>(STORAGE_KEY, []);
}

async function writeQueue(queue: QueuedMutation[]) {
  return writeStoredValue(STORAGE_KEY, queue);
}

async function readOfflineVisits() {
  return readStoredValue<OfflineVisitProjection[]>(OFFLINE_VISITS_KEY, []);
}

async function writeOfflineVisits(visits: OfflineVisitProjection[]) {
  return writeStoredValue(OFFLINE_VISITS_KEY, visits);
}

function generateQueueId() {
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    if (typeof crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    }
  }

  return `fallback-${Date.now()}-${new Date().toISOString()}`;
}

function stablePayloadFingerprint(payload: unknown) {
  let serialized: string;
  try {
    serialized = typeof payload === "string" ? payload : JSON.stringify(payload);
  } catch {
    serialized = "unserializable";
  }
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function buildIdempotencyKey(input: Omit<QueuedMutation, "id" | "createdAt" | "idempotencyKey" | "retryCount">) {
  const subject = input.localVisitId || input.visitId;
  if (subject) {
    return ["dpm", input.type, subject].join(":").replace(/[^a-zA-Z0-9:_-]/g, "-").slice(0, 200);
  }
  return ["dpm", input.type, input.method, input.endpoint, stablePayloadFingerprint(input.payload)]
    .join(":")
    .replace(/[^a-zA-Z0-9:_-]/g, "-")
    .slice(0, 200);
}

export function generateOfflineVisitId() {
  return `offline-visit-${generateQueueId()}`;
}

export async function getOfflineVisits() {
  return readOfflineVisits();
}

export async function upsertOfflineVisit(visit: OfflineVisitProjection) {
  const visits = await readOfflineVisits();
  const next = visits.filter((item) => item.id !== visit.id && item.localVisitId !== visit.localVisitId);
  next.unshift(visit);
  await writeOfflineVisits(next);
  return visit;
}

async function patchOfflineVisit(
  matcher: { id?: string; localVisitId?: string },
  updater: (visit: OfflineVisitProjection) => OfflineVisitProjection,
) {
  const visits = await readOfflineVisits();
  let changed = false;
  const next = visits.map((visit) => {
    const isMatch =
      (matcher.id && String(visit.id) === String(matcher.id)) ||
      (matcher.localVisitId && visit.localVisitId === matcher.localVisitId);
    if (!isMatch) {
      return visit;
    }
    changed = true;
    return updater(visit);
  });
  if (changed) {
    await writeOfflineVisits(next);
  }
}

export async function getQueueMeta(): Promise<QueueMeta> {
  return readStoredValue<QueueMeta>(META_KEY, {});
}

async function setQueueMeta(meta: QueueMeta) {
  const storage = await writeStoredValue(META_KEY, meta);
  return { ...meta, storage };
}

export async function getQueuedMutations() {
  return readQueue();
}

export async function enqueueMutation(
  input: Omit<QueuedMutation, "id" | "createdAt" | "idempotencyKey" | "retryCount">,
) {
  const meta = await getQueueMeta();
  const now = new Date();
  const dayKey = now.toISOString().slice(0, 10);
  const offlineSecondsByDay = { ...(meta.offlineSecondsByDay || {}) };
  const tracked = Math.floor(offlineSecondsByDay[dayKey] || 0);

  if (!navigator.onLine) {
    const lastOfflineAt = meta.lastOfflineAt ? Date.parse(meta.lastOfflineAt) : NaN;
    if (!Number.isNaN(lastOfflineAt)) {
      const deltaSec = Math.max(0, Math.floor((now.getTime() - lastOfflineAt) / 1000));
      offlineSecondsByDay[dayKey] = tracked + Math.min(deltaSec, 300);
    } else {
      offlineSecondsByDay[dayKey] = tracked;
    }
    if ((offlineSecondsByDay[dayKey] || 0) >= MAX_OFFLINE_SECONDS_PER_DAY) {
      await setQueueMeta({
        ...meta,
        lastOfflineAt: now.toISOString(),
        offlineSecondsByDay,
      });
      return { queued: false, reason: "offline_limit_reached" as const };
    }
  }

  const queue = await readQueue();
  const idempotencyKey = buildIdempotencyKey(input);
  if (queue.some((item) => item.idempotencyKey === idempotencyKey)) {
    await setQueueMeta({
      ...meta,
      lastOfflineAt: navigator.onLine ? undefined : now.toISOString(),
      offlineSecondsByDay,
    });
    return { queued: false, reason: "duplicate" as const };
  }

  queue.push({
    ...input,
    id: generateQueueId(),
    createdAt: now.toISOString(),
    idempotencyKey,
    retryCount: 0,
  });

  const trimmedQueue = queue.slice(-MAX_QUEUE_LENGTH);
  const droppedCount = (meta.droppedCount || 0) + Math.max(0, queue.length - trimmedQueue.length);
  const storage = await writeQueue(trimmedQueue);
  notifyQueueChanged(trimmedQueue.length);
  await setQueueMeta({
    ...meta,
    droppedCount,
    lastOfflineAt: navigator.onLine ? undefined : now.toISOString(),
    offlineSecondsByDay,
    storage,
  });
  return { queued: true as const, id: trimmedQueue[trimmedQueue.length - 1]?.id };
}

async function resolveVisitEndpoint(mutation: QueuedMutation, meta: QueueMeta) {
  const mappedVisitId =
    (mutation.localVisitId && meta.localVisitIdMap?.[mutation.localVisitId]) || mutation.visitId || null;
  if (mutation.type === "visit-start") {
    return mappedVisitId ? `visits/${mappedVisitId}/start` : null;
  }
  if (mutation.type === "visit-end") {
    return mappedVisitId ? `visits/${mappedVisitId}/end` : null;
  }
  if (mutation.type === "visit-note") {
    return mappedVisitId ? `visits/${mappedVisitId}` : null;
  }
  return mutation.endpoint;
}

async function pruneOfflineVisits(queue: QueuedMutation[], meta: QueueMeta) {
  const visits = await readOfflineVisits();
  const pendingVisitIds = new Set<string>();
  const pendingLocalIds = new Set<string>();

  for (const item of queue) {
    if (item.visitId) {
      pendingVisitIds.add(String(item.visitId));
    }
    if (item.localVisitId) {
      pendingLocalIds.add(item.localVisitId);
    }
  }

  const next = visits.filter((visit) => {
    const visitId = String(visit.id);
    const localVisitId = visit.localVisitId;
    if (pendingVisitIds.has(visitId)) {
      return true;
    }
    if (localVisitId && pendingLocalIds.has(localVisitId)) {
      return true;
    }
    if (localVisitId && meta.localVisitIdMap?.[localVisitId]) {
      return false;
    }
    return !visitId.startsWith("offline-visit-");
  });

  await writeOfflineVisits(next);
}

export async function replayQueuedMutations() {
  const queue = await readQueue();
  const now = new Date().toISOString();
  const nowMs = Date.now();
  if (!queue.length) {
    const meta = await getQueueMeta();
    await setQueueMeta({ ...meta, lastAttemptAt: now, lastSyncAt: now });
    notifyQueueChanged(0);
    return { attempted: 0, pending: 0 };
  }

  const remaining: QueuedMutation[] = [];
  let attempted = 0;
  let meta = await getQueueMeta();

  for (const mutation of queue) {
    const nextRetryAtMs = mutation.nextRetryAt ? Date.parse(mutation.nextRetryAt) : NaN;
    if (!Number.isNaN(nextRetryAtMs) && nextRetryAtMs > nowMs) {
      remaining.push(mutation);
      continue;
    }

    const endpoint = await resolveVisitEndpoint(mutation, meta);
    if ((mutation.type === "visit-start" || mutation.type === "visit-end") && !endpoint) {
      remaining.push(mutation);
      continue;
    }

    attempted += 1;
    try {
      const response = await apiFetch<{ id?: string | number }>(endpoint || mutation.endpoint, {
        method: mutation.method,
        headers: { "X-Idempotency-Key": buildIdempotencyKey(mutation) },
        body:
          typeof mutation.payload === "string"
            ? mutation.payload
            : JSON.stringify(mutation.payload),
      });

      if (mutation.type === "visit" && mutation.localVisitId && response?.id != null) {
        const resolvedVisitId = String(response.id);
        meta = {
          ...meta,
          localVisitIdMap: {
            ...(meta.localVisitIdMap || {}),
            [mutation.localVisitId]: resolvedVisitId,
          },
        };
        await patchOfflineVisit({ localVisitId: mutation.localVisitId }, (visit) => ({
          ...visit,
          id: resolvedVisitId,
          serverStatus: visit.serverStatus === "pending_create" ? "scheduled" : visit.serverStatus,
        }));
      }

      if (mutation.type === "visit-start") {
        const resolvedVisitId =
          mutation.visitId || (mutation.localVisitId ? meta.localVisitIdMap?.[mutation.localVisitId] : undefined);
        await patchOfflineVisit({ id: resolvedVisitId, localVisitId: mutation.localVisitId }, (visit) => ({
          ...visit,
          id: resolvedVisitId || visit.id,
          serverStatus: "in_progress",
        }));
      }

      if (mutation.type === "visit-note") {
        const resolvedVisitId =
          mutation.visitId || (mutation.localVisitId ? meta.localVisitIdMap?.[mutation.localVisitId] : undefined);
        const payload = mutation.payload as { notes?: string };
        await patchOfflineVisit({ id: resolvedVisitId, localVisitId: mutation.localVisitId }, (visit) => ({
          ...visit,
          id: resolvedVisitId || visit.id,
          notes: payload?.notes ?? visit.notes,
        }));
      }

      if (mutation.type === "visit-end") {
        const resolvedVisitId =
          mutation.visitId || (mutation.localVisitId ? meta.localVisitIdMap?.[mutation.localVisitId] : undefined);
        await patchOfflineVisit({ id: resolvedVisitId, localVisitId: mutation.localVisitId }, (visit) => ({
          ...visit,
          id: resolvedVisitId || visit.id,
          serverStatus: "completed",
        }));
      }
    } catch (error) {
      console.warn("Failed to replay mutation.", mutation.type, error);
      const retryCount = (mutation.retryCount || 0) + 1;
      const delayMs = Math.min(RETRY_BASE_MS * 2 ** (retryCount - 1), RETRY_MAX_MS);
      const status = typeof error === "object" && error && "status" in error ? Number(error.status) : null;
      remaining.push({
        ...mutation,
        retryCount,
        nextRetryAt: new Date(nowMs + delayMs).toISOString(),
        lastError: error instanceof Error ? error.message : String(error),
      });
      if (status === 400 || status === 409) {
        meta = { ...meta, lastConflictAt: now };
      }
    }
  }

  const storage = await writeQueue(remaining);
  notifyQueueChanged(remaining.length);
  meta = {
    ...meta,
    lastAttemptAt: now,
    lastSyncAt: remaining.length ? undefined : now,
    lastOfflineAt: navigator.onLine ? undefined : meta.lastOfflineAt,
    storage,
  };
  await pruneOfflineVisits(remaining, meta);
  await setQueueMeta(meta);
  return { attempted, pending: remaining.length };
}
