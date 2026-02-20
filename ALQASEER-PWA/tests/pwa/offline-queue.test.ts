import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, unknown>();

vi.mock("idb-keyval", () => ({
  get: vi.fn(async (key: string) => storage.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    storage.set(key, value);
  }),
}));

vi.mock("../../src/pwa/api/client", () => ({
  API_BASE_URL: "http://127.0.0.1:8000/api/v1",
}));

vi.mock("../../src/pwa/state/auth", () => ({
  useAuthStore: {
    getState: () => ({ token: "test-token" }),
  },
}));

describe("offline queue", () => {
  beforeEach(() => {
    storage.clear();
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
      type: "sample-request",
    });
    const second = await enqueueMutation({
      endpoint: "samples/request",
      method: "POST",
      payload: { sample_product_id: 1, quantity_requested: 2 },
      type: "sample-request",
    });

    const queue = await getQueuedMutations();
    expect(first.queued).toBe(true);
    expect(second.queued).toBe(false);
    expect(queue).toHaveLength(1);
  });

  it("drops conflict responses with server-wins policy", async () => {
    const { enqueueMutation, replayQueuedMutations, getQueuedMutations } = await import("../../src/pwa/offline/queue");
    await enqueueMutation({
      endpoint: "samples/distribute",
      method: "POST",
      payload: { sample_product_id: 1, doctor_id: 10, quantity: 1 },
      type: "sample-distribution",
    });

    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: true },
      configurable: true,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("conflict", { status: 409 })),
    );

    const result = await replayQueuedMutations();
    const queue = await getQueuedMutations();
    expect(result.conflicts).toBe(1);
    expect(result.pending).toBe(0);
    expect(queue).toHaveLength(0);
  });

  it("keeps failed mutations with exponential retry metadata", async () => {
    const { enqueueMutation, replayQueuedMutations, getQueuedMutations } = await import("../../src/pwa/offline/queue");
    await enqueueMutation({
      endpoint: "samples/request",
      method: "POST",
      payload: { sample_product_id: 1, quantity_requested: 1 },
      type: "sample-request",
    });

    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: true },
      configurable: true,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("server error", { status: 500 })),
    );

    const result = await replayQueuedMutations();
    const queue = await getQueuedMutations();
    expect(result.pending).toBe(1);
    expect(queue[0].retryCount).toBe(1);
    expect(typeof queue[0].nextRetryAt).toBe("string");
    expect(result.dropped).toBe(0);
  });

  it("drops mutations after max retries to avoid infinite loops", async () => {
    const { enqueueMutation, replayQueuedMutations, getQueuedMutations } = await import("../../src/pwa/offline/queue");
    await enqueueMutation({
      endpoint: "samples/request",
      method: "POST",
      payload: { sample_product_id: 1, quantity_requested: 1 },
      type: "sample-request",
    });

    const current = await getQueuedMutations();
    current[0].retryCount = 8;
    storage.set("dpm-offline-queue", current);

    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: true },
      configurable: true,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("server error", { status: 500 })),
    );

    const result = await replayQueuedMutations();
    const queue = await getQueuedMutations();
    expect(result.dropped).toBe(1);
    expect(result.pending).toBe(0);
    expect(queue).toHaveLength(0);
  });

  it("replays location pings against /pwa/tracking/pings", async () => {
    const { enqueueMutation, replayQueuedMutations } = await import("../../src/pwa/offline/queue");
    await enqueueMutation({
      endpoint: "pwa/tracking/pings",
      method: "POST",
      payload: { lat: 24.7136, lng: 46.6753, accuracy: 5 },
      type: "location",
    });

    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: true },
      configurable: true,
    });
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await replayQueuedMutations();
    expect(result.pending).toBe(0);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe("http://127.0.0.1:8000/api/v1/pwa/tracking/pings");
  });
});
