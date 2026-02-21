import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("../../src/pwa/api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
  API_BASE_URL: "http://127.0.0.1:8000/api/v1",
}));

describe("offline queue", () => {
  beforeEach(() => {
    localStorage.clear();
    apiFetchMock.mockReset();
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: false },
      configurable: true,
    });
  });

  it("deduplicates same mutation payload", async () => {
    const { enqueueMutation, getQueuedMutations } = await import("../../src/pwa/offline/queue");

    const first = await enqueueMutation({
      endpoint: "samples/request",
      method: "POST",
      payload: { sample_product_id: 1, quantity_requested: 2 },
      type: "visit",
    });
    const second = await enqueueMutation({
      endpoint: "samples/request",
      method: "POST",
      payload: { sample_product_id: 1, quantity_requested: 2 },
      type: "visit",
    });

    const queue = await getQueuedMutations();
    expect(first.queued).toBe(true);
    expect(second.queued).toBe(false);
    expect(queue).toHaveLength(1);
  });

  it("replays successful mutations and clears queue", async () => {
    const { enqueueMutation, replayQueuedMutations, getQueuedMutations } = await import(
      "../../src/pwa/offline/queue"
    );
    await enqueueMutation({
      endpoint: "samples/distribute",
      method: "POST",
      payload: { sample_product_id: 1, doctor_id: 10, quantity: 1 },
      type: "visit",
    });

    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: true },
      configurable: true,
    });
    apiFetchMock.mockResolvedValueOnce({ ok: true });

    const result = await replayQueuedMutations();
    const queue = await getQueuedMutations();
    expect(result.attempted).toBe(1);
    expect(result.pending).toBe(0);
    expect(queue).toHaveLength(0);
  });

  it("keeps failed mutations with exponential retry metadata", async () => {
    const { enqueueMutation, replayQueuedMutations, getQueuedMutations } = await import(
      "../../src/pwa/offline/queue"
    );
    await enqueueMutation({
      endpoint: "samples/request",
      method: "POST",
      payload: { sample_product_id: 1, quantity_requested: 1 },
      type: "visit",
    });

    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: true },
      configurable: true,
    });
    apiFetchMock.mockRejectedValueOnce(new Error("server error"));

    const result = await replayQueuedMutations();
    const queue = await getQueuedMutations();
    expect(result.attempted).toBe(1);
    expect(result.pending).toBe(1);
    expect(queue[0].retryCount).toBe(1);
    expect(typeof queue[0].nextRetryAt).toBe("string");
  });

  it("skips replay when nextRetryAt is in the future", async () => {
    const { replayQueuedMutations, getQueuedMutations } = await import("../../src/pwa/offline/queue");
    const future = new Date(Date.now() + 60_000).toISOString();
    const seeded = [
      {
        id: "q1",
        type: "visit",
        endpoint: "samples/request",
        method: "POST",
        payload: { sample_product_id: 1, quantity_requested: 1 },
        createdAt: new Date().toISOString(),
        idempotencyKey: "POST:samples/request:{\"sample_product_id\":1,\"quantity_requested\":1}",
        retryCount: 1,
        nextRetryAt: future,
      },
    ];
    localStorage.setItem("dpm-offline-queue", JSON.stringify(seeded));

    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: true },
      configurable: true,
    });

    const result = await replayQueuedMutations();
    const queue = await getQueuedMutations();
    expect(result.attempted).toBe(0);
    expect(result.pending).toBe(1);
    expect(queue).toHaveLength(1);
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("replays location pings against /pwa/tracking/pings", async () => {
    const { enqueueMutation, replayQueuedMutations } = await import("../../src/pwa/offline/queue");
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: true },
      configurable: true,
    });
    await enqueueMutation({
      endpoint: "pwa/tracking/pings",
      method: "POST",
      payload: { lat: 24.7136, lng: 46.6753, accuracy: 5 },
      type: "location",
    });
    apiFetchMock.mockResolvedValueOnce({ ok: true });

    const result = await replayQueuedMutations();
    expect(result.attempted).toBe(1);
    expect(result.pending).toBe(0);
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    expect(apiFetchMock.mock.calls[0]?.[0]).toBe("pwa/tracking/pings");
  });
});
