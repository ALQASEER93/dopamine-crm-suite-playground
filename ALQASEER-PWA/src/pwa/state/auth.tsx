import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { User } from "../api/types";
import React, { ReactNode, useEffect } from "react";

type AuthState = {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  setSession: (token: string, user: User) => void;
  clearSession: () => void;
  markHydrated: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,
      setSession: (token, user) => set({ token, user }),
      clearSession: () => set({ token: null, user: null }),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "dpm-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  if (!hydrated) {
    return <div style={{ padding: 24, textAlign: "center" }}>...جاري التحميل</div>;
  }

  return <>{children}</>;
}
