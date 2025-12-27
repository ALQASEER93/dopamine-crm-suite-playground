import { describe, it, expect } from "vitest";
import { buildGoogleMapsUrl, buildOpenStreetMapUrl } from "./mapLinks";

describe("mapLinks", () => {
  it("builds OpenStreetMap URL", () => {
    const url = buildOpenStreetMapUrl(31.95, 35.91);
    expect(url).toBe("https://www.openstreetmap.org/?mlat=31.95&mlon=35.91#map=18/31.95/35.91");
  });

  it("builds Google Maps URL", () => {
    const url = buildGoogleMapsUrl(31.95, 35.91);
    expect(url).toBe("https://www.google.com/maps?q=31.95,35.91");
  });
});
