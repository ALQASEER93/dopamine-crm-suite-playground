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

export default function App() {
  const token = useAuthStore((s) => s.token);
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

  return (
    <div dir="rtl">
      <div className="app-shell">
        {!isOnline ? <div className="offline-banner">الاتصال مفقود، يتم استخدام البيانات المخزنة.</div> : null}

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
