import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  enqueueMutation,
  getQueuedMutations,
  replayQueuedMutations,
  resolveConflict,
} from "../../src/pwa/offline/queue";
import { apiFetch } from "../../src/pwa/api/client";

vi.mock("../../src/pwa/api/client", () => ({
  apiFetch: vi.fn(),
}));

const apiFetchMock = apiFetch as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  apiFetchMock.mockReset();
});

describe("offline queue", () => {
  it("deduplicates identical mutations", () => {
    enqueueMutation({
      type: "visit-start",
      endpoint: "visits/1/start",
      method: "POST",
      payload: { lat: 1, lng: 2 },
    });
    enqueueMutation({
      type: "visit-start",
      endpoint: "visits/1/start",
      method: "POST",
      payload: { lat: 1, lng: 2 },
    });

    expect(getQueuedMutations()).toHaveLength(1);
  });

  it("replays queued mutations and clears on success", async () => {
    apiFetchMock.mockResolvedValue({ ok: true });

    enqueueMutation({
      type: "visit",
      endpoint: "visits",
      method: "POST",
      payload: { notes: "test" },
    });
    enqueueMutation({
      type: "order",
      endpoint: "orders",
      method: "POST",
      payload: { items: [] },
    });

    const result = await replayQueuedMutations();

    expect(result).toEqual({ attempted: 2, pending: 0 });
    expect(getQueuedMutations()).toHaveLength(0);
  });

  it("marks conflicts and resolves them", async () => {
    apiFetchMock.mockRejectedValue(Object.assign(new Error("Conflict"), { status: 409 }));

    enqueueMutation({
      type: "visit-end",
      endpoint: "visits/1/end",
      method: "POST",
      payload: { lat: 1, lng: 2 },
    });

    const result = await replayQueuedMutations();
    expect(result).toEqual({ attempted: 1, pending: 1 });

    const queued = getQueuedMutations();
    expect(queued).toHaveLength(1);
    expect(queued[0]?.conflict).toBe(true);

    resolveConflict(queued[0].id);
    expect(getQueuedMutations()).toHaveLength(0);
  });
});
