import { useCallback, useEffect, useMemo, useState } from "react";
import { enqueueMutation, getQueueMeta, getQueuedMutations, replayQueuedMutations, QueuedMutation } from "../offline/queue";

type QueueSnapshot = {
  queueCount: number;
  failedCount: number;
  lastSyncAt: string | null;
  lastAttemptAt: string | null;
  lastConflictAt: string | null;
  droppedCount: number;
  isOnline: boolean;
  isSyncing: boolean;
};

const initialSnapshot: QueueSnapshot = {
  queueCount: 0,
  failedCount: 0,
  lastSyncAt: null,
  lastAttemptAt: null,
  lastConflictAt: null,
  droppedCount: 0,
  isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
  isSyncing: false,
};

export function useOfflineQueue() {
  const [snapshot, setSnapshot] = useState<QueueSnapshot>(initialSnapshot);

  const refresh = useCallback(async () => {
    const [queue, meta] = await Promise.all([getQueuedMutations(), getQueueMeta()]);
    setSnapshot((prev) => ({
      ...prev,
      queueCount: queue.length,
      failedCount: queue.filter((item) => Boolean(item.lastError)).length,
      lastSyncAt: meta.lastSyncAt || null,
      lastAttemptAt: meta.lastAttemptAt || null,
      lastConflictAt: meta.lastConflictAt || null,
      droppedCount: meta.droppedCount || 0,
      isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
    }));
  }, []);

  const syncNow = useCallback(async () => {
    setSnapshot((prev) => ({ ...prev, isSyncing: true }));
    try {
      const result = await replayQueuedMutations();
      await refresh();
      return result;
    } finally {
      setSnapshot((prev) => ({ ...prev, isSyncing: false }));
    }
  }, [refresh]);

  const enqueue = useCallback(
    async (input: Omit<QueuedMutation, "id" | "createdAt" | "idempotencyKey" | "retryCount" | "nextRetryAt" | "lastError">) => {
      const result = await enqueueMutation(input);
      await refresh();
      return result;
    },
    [refresh],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onOnline = () => {
      setSnapshot((prev) => ({ ...prev, isOnline: true }));
      void syncNow();
    };
    const onOffline = () => {
      setSnapshot((prev) => ({ ...prev, isOnline: false }));
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [syncNow]);

  const state = useMemo(() => snapshot, [snapshot]);
  return { ...state, refresh, syncNow, enqueue };
}
