import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { BottomNav } from "./components/navigation/BottomNav";
import { RequireAuth } from "./components/layout/RequireAuth";
import LoginPage from "./routes/login/LoginPage";
import TodayRoutePage from "./routes/today-route/TodayRoutePage";
import LiveMapPage from "./routes/live-map/LiveMapPage";
import VisitsPage from "./routes/visits/VisitsPage";
import OrdersPage from "./routes/orders/OrdersPage";
import CustomersPage from "./routes/customers/CustomersPage";
import AccountPage from "./routes/account/AccountPage";
import { registerServiceWorker } from "./offline/serviceWorkerRegistration";
import { replayQueuedMutations } from "./offline/queue";
import { useAuthStore } from "./state/auth";
import { readPreferences } from "./utils/preferences";

export default function App() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    registerServiceWorker();

    const handleOnline = async () => {
      setIsOnline(true);
      await replayQueuedMutations();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const preferences = readPreferences();
    const role = user?.role || preferences.roleTheme || "rep";
    const accents: Record<string, string> = {
      admin: "#f59e0b",
      supervisor: "#22d3ee",
      sales_manager: "#38bdf8",
      sales: "#38bdf8",
      rep: "#22c55e",
    };
    const fallback = "#22c55e";
    document.documentElement.dataset.role = role;
    document.documentElement.style.setProperty("--role-accent", accents[role] || fallback);
  }, [user?.role]);

  return (
    <div dir="rtl">
      <div className="app-shell">
        {!isOnline ? (
          <div className="offline-banner">لا يوجد اتصال بالإنترنت. سيتم حفظ الزيارات محليًا حتى تعود الشبكة.</div>
        ) : null}

        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Navigate to={token ? "/today-route" : "/login"} replace />} />
            <Route path="/today-route" element={<TodayRoutePage />} />
            <Route path="/live-map" element={<LiveMapPage />} />
            <Route path="/visits" element={<VisitsPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>
          <Route path="*" element={<Navigate to={token ? "/today-route" : "/login"} replace />} />
        </Routes>
      </div>

      {token ? <BottomNav /> : null}
    </div>
  );
}
