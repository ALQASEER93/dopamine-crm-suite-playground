import { apiFetch } from "../api/client";

type MutationType = "visit" | "visit-start" | "visit-end" | "order" | "location";

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
};

const STORAGE_KEY = "dpm-offline-queue";
const META_KEY = "dpm-offline-queue-meta";
const MAX_QUEUE_LENGTH = 200;
const MAX_OFFLINE_SECONDS_PER_DAY = 60 * 60;
const RETRY_BASE_MS = 15_000;
const RETRY_MAX_MS = 5 * 60_000;

type QueueMeta = {
  lastSyncAt?: string;
  lastAttemptAt?: string;
  lastOfflineAt?: string;
  offlineSecondsByDay?: Record<string, number>;
};

function readQueue(): QueuedMutation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedMutation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("failed to persist offline queue", error);
  }
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

export function enqueueMutation(input: Omit<QueuedMutation, "id" | "createdAt">) {
  const meta = getQueueMeta();
  const now = new Date();
  const dayKey = now.toISOString().slice(0, 10);
  const offlineSecondsByDay = { ...(meta.offlineSecondsByDay || {}) };
  const tracked = Math.floor(offlineSecondsByDay[dayKey] || 0);

  if (!navigator.onLine) {
    if (input.type !== "visit") {
      return { queued: false, reason: "online_required" as const };
    }
    const lastOfflineAt = meta.lastOfflineAt ? Date.parse(meta.lastOfflineAt) : NaN;
    if (!Number.isNaN(lastOfflineAt)) {
      const deltaSec = Math.max(0, Math.floor((now.getTime() - lastOfflineAt) / 1000));
      offlineSecondsByDay[dayKey] = tracked + Math.min(deltaSec, 300);
    } else {
      offlineSecondsByDay[dayKey] = tracked;
    }
    if ((offlineSecondsByDay[dayKey] || 0) >= MAX_OFFLINE_SECONDS_PER_DAY) {
      setQueueMeta({
        ...meta,
        lastOfflineAt: now.toISOString(),
        offlineSecondsByDay,
      });
      return { queued: false, reason: "offline_limit_reached" as const };
    }
  }

  const queue = readQueue();
  const payloadRaw =
    typeof input.payload === "string"
      ? input.payload
      : (() => {
          try {
            return JSON.stringify(input.payload);
          } catch {
            return String(input.payload);
          }
        })();
  const idempotencyKey = `${input.method}:${input.endpoint}:${payloadRaw}`;
  const hasDuplicate = queue.some((item) => item.idempotencyKey === idempotencyKey);
  if (hasDuplicate) {
    setQueueMeta({
      ...meta,
      lastOfflineAt: navigator.onLine ? undefined : now.toISOString(),
      offlineSecondsByDay,
    });
    return { queued: false, reason: "duplicate" as const };
  }

  const uid = generateQueueId();
  queue.push({
    ...input,
    id: uid,
    createdAt: now.toISOString(),
    idempotencyKey,
    retryCount: 0,
  });
  if (queue.length > MAX_QUEUE_LENGTH) {
    queue.splice(0, queue.length - MAX_QUEUE_LENGTH);
  }
  writeQueue(queue);
  setQueueMeta({
    ...meta,
    lastOfflineAt: navigator.onLine ? undefined : now.toISOString(),
    offlineSecondsByDay,
  });
  return { queued: true as const, id: uid };
}

export function getQueuedMutations() {
  return readQueue();
}

export function getQueueMeta(): QueueMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as QueueMeta) : {};
  } catch {
    return {};
  }
}

function setQueueMeta(meta: QueueMeta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch (error) {
    console.error("failed to persist queue metadata", error);
  }
}

export async function replayQueuedMutations() {
  const queue = readQueue();
  const now = new Date().toISOString();
  const nowMs = Date.now();
  if (!queue.length) {
    setQueueMeta({ ...getQueueMeta(), lastAttemptAt: now, lastSyncAt: now });
    return { attempted: 0, pending: 0 };
  }

  const remaining: QueuedMutation[] = [];
  let attempted = 0;

  for (const mutation of queue) {
    const nextRetryAtMs = mutation.nextRetryAt ? Date.parse(mutation.nextRetryAt) : NaN;
    if (!Number.isNaN(nextRetryAtMs) && nextRetryAtMs > nowMs) {
      remaining.push(mutation);
      continue;
    }

    attempted += 1;
    try {
      await apiFetch(mutation.endpoint, {
        method: mutation.method,
        headers: { "X-Idempotency-Key": mutation.idempotencyKey },
        body: mutation.payload,
      });
    } catch (error) {
      console.warn("failed to replay mutation", mutation.type, error);
      const retryCount = (mutation.retryCount || 0) + 1;
      const delayMs = Math.min(RETRY_BASE_MS * 2 ** (retryCount - 1), RETRY_MAX_MS);
      remaining.push({
        ...mutation,
        retryCount,
        nextRetryAt: new Date(nowMs + delayMs).toISOString(),
        lastError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  writeQueue(remaining);
  const previousMeta = getQueueMeta();
  setQueueMeta({
    ...previousMeta,
    lastAttemptAt: now,
    lastSyncAt: remaining.length ? undefined : now,
    lastOfflineAt: navigator.onLine ? undefined : previousMeta.lastOfflineAt,
  });
  return { attempted, pending: remaining.length };
}
