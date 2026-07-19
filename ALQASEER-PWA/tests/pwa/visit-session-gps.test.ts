import { describe, expect, it } from "vitest";
import {
  geolocationErrorMessage,
  isValidPositionSnapshot,
} from "../../src/pwa/routes/visit-session/VisitSessionPage";

describe("visit-session GPS software validation", () => {
  it("maps browser permission, unavailable, and timeout failures honestly", () => {
    expect(geolocationErrorMessage({ code: 1 })).toContain("رفض إذن");
    expect(geolocationErrorMessage({ code: 2 })).toContain("غير متاح");
    expect(geolocationErrorMessage({ code: 3 })).toContain("مهلة");
    expect(geolocationErrorMessage(new Error("test"))).toContain("تعذر");
  });

  it("accepts valid test coordinates including zero", () => {
    expect(
      isValidPositionSnapshot({
        coords: { lat: 0, lng: 0 },
        accuracy: 5,
        timestamp: "2026-07-19T21:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("rejects invalid coordinate ranges, accuracy, and timestamps", () => {
    const base = {
      coords: { lat: 31.95, lng: 35.91 },
      accuracy: 5,
      timestamp: "2026-07-19T21:00:00.000Z",
    };
    expect(isValidPositionSnapshot({ ...base, coords: { lat: 91, lng: 35.91 } })).toBe(false);
    expect(isValidPositionSnapshot({ ...base, coords: { lat: 31.95, lng: 181 } })).toBe(false);
    expect(isValidPositionSnapshot({ ...base, accuracy: -1 })).toBe(false);
    expect(isValidPositionSnapshot({ ...base, timestamp: "invalid" })).toBe(false);
  });
});
