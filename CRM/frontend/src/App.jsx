import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import LoginScreen from './auth/LoginScreen.jsx';
import RequireRole from './auth/RequireRole.jsx';
import { ROLE_ACCESS } from './auth/roleAccess.js';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ToastProvider from './components/ToastProvider.jsx';
import MainLayout from './layout/MainLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import VisitsPage from './pages/VisitsPage.jsx';
import RoutesPage from './pages/RoutesPage.jsx';
import DoctorsPage from './pages/DoctorsPage.jsx';
import PharmaciesPage from './pages/PharmaciesPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import StockPage from './pages/StockPage.jsx';
import TargetsPage from './pages/TargetsPage.jsx';
import CollectionsPage from './pages/CollectionsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import RepLiveMapPage from './pages/RepLiveMapPage.jsx';
import VisitCompliancePage from './pages/VisitCompliancePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';
import RepsPage from './pages/RepsPage.jsx';

const AppRoutes = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/visits" element={<VisitsPage />} />
        <Route path="/routes" element={<RoutesPage />} />
        <Route
          path="/reps"
          element={
            <RequireRole roles={ROLE_ACCESS.reps}>
              <RepsPage />
            </RequireRole>
          }
        />
        <Route path="/doctors" element={<DoctorsPage />} />
        <Route path="/hcps" element={<Navigate to="/doctors" replace />} />
        <Route path="/pharmacies" element={<PharmaciesPage />} />
        <Route
          path="/products"
          element={
            <RequireRole roles={ROLE_ACCESS.products}>
              <ProductsPage />
            </RequireRole>
          }
        />
        <Route path="/orders" element={<OrdersPage />} />
        <Route
          path="/stock"
          element={
            <RequireRole roles={ROLE_ACCESS.stock}>
              <StockPage />
            </RequireRole>
          }
        />
        <Route
          path="/targets"
          element={
            <RequireRole roles={ROLE_ACCESS.targets}>
              <TargetsPage />
            </RequireRole>
          }
        />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route
          path="/reports"
          element={
            <RequireRole roles={ROLE_ACCESS.reports}>
              <ReportsPage />
            </RequireRole>
          }
        />
        <Route
          path="/rep-live-map"
          element={
            <RequireRole roles={ROLE_ACCESS.repLiveMap}>
              <RepLiveMapPage />
            </RequireRole>
          }
        />
        <Route
          path="/visit-compliance"
          element={
            <RequireRole roles={ROLE_ACCESS.visitCompliance}>
              <VisitCompliancePage />
            </RequireRole>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireRole roles={ROLE_ACCESS.settings}>
              <SettingsPage />
            </RequireRole>
          }
        />
        <Route
          path="/settings/users"
          element={
            <RequireRole roles={ROLE_ACCESS.adminUsers}>
              <AdminUsersPage />
            </RequireRole>
          }
        />
        <Route path="/admin/users" element={<Navigate to="/settings/users" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App = () => (
  <AuthProvider>
    <ToastProvider>
      {/* TODO: Enable React Router v7 future flags (startTransition, relativeSplatPath) during the next router upgrade. */}
      <BrowserRouter>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </BrowserRouter>
    </ToastProvider>
  </AuthProvider>
);

export default App;
