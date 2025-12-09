import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "@/routes/login/LoginPage";
import { AuthProvider } from "@/state/auth";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ pathname: "/login", state: undefined }),
  };
});

const loginFn = vi.fn().mockResolvedValue({
  access_token: "token",
  user: { id: "1", name: "Tester" },
});

vi.mock("@/api/client", () => ({
  login: (...args: any[]) => loginFn(...args),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    loginFn.mockClear();
  });

  it("submits credentials and redirects to today route", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("البريد الوظيفي"), { target: { value: "rep@test.com" } });
    fireEvent.change(screen.getByLabelText("كلمة المرور"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "دخول" }));

    await waitFor(() => expect(loginFn).toHaveBeenCalledWith({ email: "rep@test.com", password: "secret" }));
    expect(navigateMock).toHaveBeenCalledWith("/today-route", { replace: true });
  });
});
