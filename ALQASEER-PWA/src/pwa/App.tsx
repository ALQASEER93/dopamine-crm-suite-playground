import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { NavigationShell } from "./components/navigation/NavigationShell";
import { RequireAuth } from "./components/layout/RequireAuth";
import { ErrorBoundary } from "./components/system/ErrorBoundary";
import LoginPage from "./routes/login/LoginPage";
import TodayPage from "./routes/today/TodayPage";
import RoutePage from "./routes/route/RoutePage";
import MapPage from "./routes/map/MapPage";
import VisitsPage from "./routes/visits/VisitsPage";
import VisitActionPage from "./routes/visits/VisitActionPage";
import OrdersPage from "./routes/orders/OrdersPage";
import AccountsPage from "./routes/accounts/AccountsPage";
import TargetsPage from "./routes/targets/TargetsPage";
import NotificationsPage from "./routes/notifications/NotificationsPage";
import SyncQueuePage from "./routes/sync/SyncQueuePage";
import SettingsPage from "./routes/settings/SettingsPage";
import AccountPage from "./routes/account/AccountPage";
import { registerServiceWorker } from "./offline/serviceWorkerRegistration";
import { replayQueuedMutations } from "./offline/queue";
import { useAuthStore } from "./state/auth";
import {
  configureNativeTelemetry,
  startNativeTelemetry,
  stopNativeTelemetry,
} from "./native/telemetry";

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

  useEffect(() => {
    if (token) {
      void configureNativeTelemetry(token);
      void startNativeTelemetry(token);
    } else {
      void stopNativeTelemetry();
    }
  }, [token]);

  return (
    <div dir="rtl" className="app-root">
      {!isOnline ? <div className="offline-banner">الاتصال مفقود، يتم استخدام البيانات المخزنة.</div> : null}
      <div className="app-frame">
        {token ? <NavigationShell /> : null}
        <div className="app-shell">
          <ErrorBoundary>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RequireAuth />}>
                <Route path="/" element={<Navigate to={token ? "/today" : "/login"} replace />} />
                <Route path="/today" element={<TodayPage />} />
                <Route path="/route" element={<RoutePage />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/visits" element={<VisitsPage />} />
                <Route path="/visits/:visitId/start" element={<VisitActionPage mode="start" />} />
                <Route path="/visits/:visitId/end" element={<VisitActionPage mode="end" />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/targets" element={<TargetsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/sync" element={<SyncQueuePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/today-route" element={<Navigate to="/today" replace />} />
                <Route path="/live-map" element={<Navigate to="/map" replace />} />
                <Route path="/customers" element={<Navigate to="/accounts" replace />} />
              </Route>
              <Route path="*" element={<Navigate to={token ? "/today" : "/login"} replace />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
