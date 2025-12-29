import { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './MainLayout.css';

const NAV_ITEMS = [
  { label: 'لوحة المتابعة', path: '/dashboard' },
  { label: 'الأطباء', path: '/doctors' },
  { label: 'الصيدليات', path: '/pharmacies' },
  { label: 'المنتجات', path: '/products' },
  { label: 'الطلبات', path: '/orders' },
  { label: 'الزيارات', path: '/visits' },
  { label: 'المسارات', path: '/routes' },
  { label: 'المخزون', path: '/stock' },
  { label: 'الأهداف', path: '/targets' },
  { label: 'التحصيلات', path: '/collections' },
  { label: 'التقارير', path: '/reports', roles: ['admin', 'sales_manager'] },
  { label: 'الإعدادات', path: '/settings' },
  { label: 'إدارة المستخدمين', path: '/settings/users', roles: ['admin', 'sales_manager'] },
];

const MainLayout = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const roleSlug = useMemo(() => {
    const rawRole = user?.role?.slug || user?.roleSlug || user?.role || '';
    if (typeof rawRole === 'string') {
      return rawRole.toLowerCase();
    }
    if (rawRole && typeof rawRole === 'object' && rawRole.slug) {
      return String(rawRole.slug).toLowerCase();
    }
    return '';
  }, [user]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const userInitial = (user?.name || user?.email || '?').charAt(0);
  const roleLabel =
    roleSlug === 'sales_rep'
      ? 'مندوب مبيعات'
      : roleSlug === 'sales_manager'
      ? 'مدير مبيعات'
      : roleSlug === 'admin'
      ? 'مدير النظام'
      : roleSlug || 'عضو الفريق';
  const navItems = useMemo(
    () => NAV_ITEMS.filter(item => !item.roles || item.roles.includes(roleSlug)),
    [roleSlug],
  );

  return (
    <div className="layout">
      <aside className={`layout__sidebar ${sidebarOpen ? 'layout__sidebar--open' : ''}`}>
        <div className="layout__brand">
          <span>دوبامين CRM</span>
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
            aria-label="إظهار القائمة"
          >
            القائمة
          </button>
          <div className="layout__header-info">
            <div>
              <span className="layout__header-app">نظام دوبامين للعمليات</span>
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
