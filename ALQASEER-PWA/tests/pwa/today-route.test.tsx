import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TodayPage from "@/routes/today/TodayPage";

const todayRouteMock = vi.fn();

const visitsMock = vi.fn();
vi.mock("@/api/client", () => ({
  getTodayRoute: (...args: any[]) => todayRouteMock(...args),
  getVisits: (...args: any[]) => visitsMock(...args),
}));

describe("TodayPage", () => {
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
    visitsMock.mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("صيدلية الروضة")).toBeInTheDocument();
    });

  });
});
