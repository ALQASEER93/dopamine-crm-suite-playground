import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { AuthProvider, useAuthStore } from "@/state/auth";

describe("PWA auth persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, user: null, hydrated: false });
  });

  it("rehydrates a stored token instead of clearing the session", async () => {
    localStorage.setItem(
      "dpm-auth",
      JSON.stringify({
        state: {
          token: "persisted-token",
          user: { id: "1", name: "Rep User", email: "rep@example.com" },
        },
        version: 0,
      }),
    );

    render(
      <MemoryRouter initialEntries={["/today-route"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>login</div>} />
            <Route element={<RequireAuth />}>
              <Route path="/today-route" element={<div>today-route</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("today-route")).toBeInTheDocument());
    expect(useAuthStore.getState().token).toBe("persisted-token");
    expect(useAuthStore.getState().user?.name).toBe("Rep User");
  });
});
