import { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLE_ACCESS, isRoleAllowed, normalizeRole } from '../auth/roleAccess';
import './MainLayout.css';

const NAV_ITEMS = [
  { label: 'لوحة التحكم', path: '/dashboard', access: 'dashboard' },
  { label: 'الأطباء', path: '/doctors', access: 'doctors' },
  { label: 'الصيدليات', path: '/pharmacies', access: 'pharmacies' },
  { label: 'المنتجات', path: '/products', access: 'products' },
  { label: 'الطلبات', path: '/orders', access: 'orders' },
  { label: 'الزيارات', path: '/visits', access: 'visits' },
  { label: 'المسارات', path: '/routes', access: 'routes' },
  { label: 'المخزون', path: '/stock', access: 'stock' },
  { label: 'الأهداف', path: '/targets', access: 'targets' },
  { label: 'التحصيلات', path: '/collections', access: 'collections' },
  { label: 'التقارير', path: '/reports', access: 'reports' },
  { label: 'خريطة المندوبين', path: '/rep-live-map', access: 'repLiveMap' },
  { label: 'التزام الزيارات', path: '/visit-compliance', access: 'visitCompliance' },
  { label: 'الإعدادات', path: '/settings', access: 'settings' },
  { label: 'الإدارة', path: '/settings/users', access: 'adminUsers' },
];

const MainLayout = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const roleSlug = useMemo(() => normalizeRole(user?.role?.slug || user?.roleSlug || user?.role || ''), [user]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const userInitial = (user?.name || user?.email || '?').charAt(0).toUpperCase();
  const roleLabel =
    roleSlug === 'sales_rep'
      ? 'مندوب مبيعات'
      : roleSlug === 'sales_manager'
      ? 'مدير مبيعات'
      : roleSlug === 'admin'
      ? 'مدير النظام'
      : roleSlug || 'عضو فريق';
  const navItems = useMemo(
    () =>
      NAV_ITEMS.filter(item => {
        const allowed = ROLE_ACCESS[item.access] || ROLE_ACCESS.dashboard;
        return isRoleAllowed(roleSlug, allowed);
      }),
    [roleSlug],
  );

  return (
    <div className="layout" dir="rtl">
      <aside className={`layout__sidebar ${sidebarOpen ? 'layout__sidebar--open' : ''}`}>
        <div className="layout__brand">
          <span>دوپامين CRM</span>
        </div>
        <nav className="layout__nav">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `layout__nav-link${isActive ? ' is-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="layout__content">
        <header className="layout__header">
          <button
            type="button"
            className="layout__menu-button"
            onClick={() => setSidebarOpen(prev => !prev)}
            aria-label="Toggle navigation"
          >
            القائمة
          </button>
          <div className="layout__header-info">
            <div>
              <span className="layout__header-app">دوپامين CRM</span>
              <span className="layout__header-role">{roleLabel}</span>
            </div>
            <div className="layout__header-user">
              <div className="layout__avatar">{userInitial}</div>
              <div className="layout__user-text">
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
              </div>
              <button type="button" className="btn btn-secondary layout__signout" onClick={handleSignOut}>
                تسجيل الخروج
              </button>
            </div>
          </div>
        </header>
        <main className="layout__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
