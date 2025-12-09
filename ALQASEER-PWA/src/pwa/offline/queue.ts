import { apiFetch } from "../api/client";

type MutationType = "visit" | "order" | "location";

export type QueuedMutation = {
  id: string;
  type: MutationType;
  endpoint: string;
  method: "POST" | "PUT";
  payload: unknown;
  createdAt: string;
};

const STORAGE_KEY = "dpm-offline-queue";

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

export async function replayQueuedMutations() {
  const queue = readQueue();
  if (!queue.length) return { attempted: 0, pending: 0 };

  const remaining: QueuedMutation[] = [];

  for (const mutation of queue) {
    try {
      await apiFetch(mutation.endpoint, {
        method: mutation.method,
        body: JSON.stringify(mutation.payload),
      });
    } catch (error) {
      console.warn("failed to replay mutation", mutation.type, error);
      remaining.push(mutation);
    }
  }

  writeQueue(remaining);
  return { attempted: queue.length, pending: remaining.length };
}
