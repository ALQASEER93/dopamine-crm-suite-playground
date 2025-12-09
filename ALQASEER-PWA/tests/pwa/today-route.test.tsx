import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TodayRoutePage from "@/routes/today-route/TodayRoutePage";

vi.mock("@/components/map/GoogleMap", () => ({
  GoogleMapWidget: ({ markers }: any) => <div data-testid="map" data-count={markers?.length || 0} />,
}));

const todayRouteMock = vi.fn();

vi.mock("@/api/client", () => ({
  getTodayRoute: (...args: any[]) => todayRouteMock(...args),
}));

describe("TodayRoutePage", () => {
  it("renders stops from the API", async () => {
    todayRouteMock.mockResolvedValueOnce([
      {
        id: "1",
        customerId: "c1",
        customerName: "صيدلية الروضة",
        customerType: "pharmacy",
        status: "planned",
        location: { lat: 31.95, lng: 35.92 },
      },
      {
        id: "2",
        customerId: "c2",
        customerName: "د. لينا",
        customerType: "doctor",
        status: "done",
        location: { lat: 31.96, lng: 35.91 },
      },
    ]);

    render(
      <MemoryRouter>
        <TodayRoutePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("صيدلية الروضة")).toBeInTheDocument();
      expect(screen.getByText("د. لينا")).toBeInTheDocument();
    });

    const map = screen.getByTestId("map");
    expect(map.getAttribute("data-count")).toBe("2");
  });
});
