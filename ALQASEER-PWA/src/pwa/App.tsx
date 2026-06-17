import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { BuildVersionStrip } from "./components/BuildVersionStrip";
import { BottomNav } from "./components/navigation/BottomNav";
import { RequireAuth } from "./components/layout/RequireAuth";
import LoginPage from "./routes/login/LoginPage";
import TodayRoutePage from "./routes/today-route/TodayRoutePage";
import LiveMapPage from "./routes/live-map/LiveMapPage";
import VisitsPage from "./routes/visits/VisitsPage";
import CustomersPage from "./routes/customers/CustomersPage";
import AccountPage from "./routes/account/AccountPage";
import CustomerProfilePage from "./routes/customers/CustomerProfilePage";
import VisitSessionPage from "./routes/visit-session/VisitSessionPage";
import ReportsPage from "./routes/reports/ReportsPage";
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
        {token ? <BuildVersionStrip /> : null}

        {/* Exactly one main landmark for a11y (axe: landmark-one-main). */}
        <main className="app-main">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<Navigate to={token ? "/today-route" : "/login"} replace />} />
              <Route path="/today-route" element={<TodayRoutePage />} />
              <Route path="/live-map" element={<LiveMapPage />} />
              <Route path="/visits" element={<VisitsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/:id" element={<CustomerProfilePage />} />
              <Route path="/customers/:customerType/:customerId" element={<CustomerProfilePage />} />
              <Route path="/visit-session/:visitId" element={<VisitSessionPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/account" element={<AccountPage />} />
            </Route>
            <Route path="*" element={<Navigate to={token ? "/today-route" : "/login"} replace />} />
          </Routes>
        </main>
      </div>

      {token ? <BottomNav /> : null}
    </div>
  );
}
