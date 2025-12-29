import { apiFetch } from "../api/client";

type MutationType = "visit" | "visit-start" | "visit-end" | "order" | "location";

export type QueuedMutation = {
  id: string;
  type: MutationType;
  endpoint: string;
  method: "POST" | "PUT";
  payload: unknown;
  createdAt: string;
};

const STORAGE_KEY = "dpm-offline-queue";
const META_KEY = "dpm-offline-queue-meta";

type QueueMeta = {
  lastSyncAt?: string;
  lastAttemptAt?: string;
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

export function enqueueMutation(input: Omit<QueuedMutation, "id" | "createdAt">) {
  const queue = readQueue();
  const uid = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  queue.push({
    ...input,
    id: uid,
    createdAt: new Date().toISOString(),
  });
  writeQueue(queue);
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
  if (!queue.length) {
    setQueueMeta({ lastAttemptAt: now, lastSyncAt: now });
    return { attempted: 0, pending: 0 };
  }

  const remaining: QueuedMutation[] = [];

  for (const mutation of queue) {
    try {
      await apiFetch(mutation.endpoint, {
        method: mutation.method,
        body: JSON.stringify(mutation.payload),
      });
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      if (status && status >= 400 && status < 500) {
        console.warn("dropping mutation after client error", mutation.type, status);
        continue;
      }
      console.warn("failed to replay mutation", mutation.type, error);
      remaining.push(mutation);
    }
  }

  writeQueue(remaining);
  setQueueMeta({
    lastAttemptAt: now,
    lastSyncAt: remaining.length ? undefined : now,
  });
  return { attempted: queue.length, pending: remaining.length };
}
