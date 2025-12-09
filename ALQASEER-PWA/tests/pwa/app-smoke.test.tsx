import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import App from "@/App";
import { useAuthStore } from "@/state/auth";

vi.mock("@/offline/serviceWorkerRegistration", () => ({
  registerServiceWorker: vi.fn(),
}));

vi.mock("@/offline/queue", () => ({
  replayQueuedMutations: vi.fn().mockResolvedValue(undefined),
}));

// Keep navigation light-weight for smoke testing.
vi.mock("@/components/navigation/BottomNav", () => ({
  BottomNav: () => <nav data-testid="bottom-nav-placeholder" />,
}));

describe("App shell", () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null, hydrated: true });
  });

  it("renders the login page when no session exists", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("login-page")).toBeInTheDocument();
    expect(screen.queryByTestId("bottom-nav-placeholder")).not.toBeInTheDocument();
  });
});
