import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import LoginScreen from './auth/LoginScreen.jsx';
import RequireRole from './auth/RequireRole.jsx';
import MainLayout from './layout/MainLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import VisitsPage from './pages/VisitsPage.jsx';
import RoutesPage from './pages/RoutesPage.jsx';
import DoctorsPage from './pages/DoctorsPage.jsx';
import PharmaciesPage from './pages/PharmaciesPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import TargetsPage from './pages/TargetsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';
import AdminCustomerDataPage from './pages/AdminCustomerDataPage.jsx';
import RepsPage from './pages/RepsPage.jsx';
import SamplesDistributePage from './pages/SamplesDistributePage.jsx';
import SamplesHistoryPage from './pages/SamplesHistoryPage.jsx';
import MedicalEventsPage from './pages/MedicalEventsPage.jsx';
import KOLDirectoryPage from './pages/KOLDirectoryPage.jsx';
import ScientificMaterialsPage from './pages/ScientificMaterialsPage.jsx';
import MedicalAffairsReportsPage from './pages/MedicalAffairsReportsPage.jsx';

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
        <Route path="/reps" element={<RepsPage />} />
        <Route path="/doctors" element={<DoctorsPage />} />
        <Route path="/hcps" element={<Navigate to="/doctors" replace />} />
        <Route path="/pharmacies" element={<PharmaciesPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/samples/distribute" element={<SamplesDistributePage />} />
        <Route path="/samples/history" element={<SamplesHistoryPage />} />
        <Route path="/targets" element={<TargetsPage />} />
        <Route
          path="/medical/events"
          element={
            <RequireRole roles={['admin', 'sales_manager', 'medical_rep']}>
              <MedicalEventsPage />
            </RequireRole>
          }
        />
        <Route
          path="/medical/kols"
          element={
            <RequireRole roles={['admin', 'sales_manager', 'medical_rep']}>
              <KOLDirectoryPage />
            </RequireRole>
          }
        />
        <Route
          path="/medical/materials"
          element={
            <RequireRole roles={['admin', 'sales_manager', 'medical_rep']}>
              <ScientificMaterialsPage />
            </RequireRole>
          }
        />
        <Route
          path="/medical/reports"
          element={
            <RequireRole roles={['admin', 'sales_manager']}>
              <MedicalAffairsReportsPage />
            </RequireRole>
          }
        />
        <Route
          path="/reports"
          element={
            <RequireRole roles={['admin', 'sales_manager']}>
              <ReportsPage />
            </RequireRole>
          }
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="/admin/customers"
          element={
            <RequireRole roles={['admin']}>
              <AdminCustomerDataPage />
            </RequireRole>
          }
        />
        <Route
          path="/settings/users"
          element={
            <RequireRole roles={['admin', 'sales_manager']}>
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
    {/* TODO: Enable React Router v7 future flags (startTransition, relativeSplatPath) during the next router upgrade. */}
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
