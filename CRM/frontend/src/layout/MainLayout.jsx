import { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './MainLayout.css';

const NAV_ITEMS = [
  { label: 'لوحة التحكم', path: '/dashboard' },
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
  { label: 'الإدارة', path: '/settings/users', roles: ['admin', 'sales_manager'] },
];

const MainLayout = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      const stored = window.localStorage?.getItem('theme');
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch (error) {
      console.warn('Theme storage unavailable', error);
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [isUserOverride, setIsUserOverride] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = window.localStorage?.getItem('theme');
      return stored === 'light' || stored === 'dark';
    } catch (error) {
      return false;
    }
  });
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

  const userInitial = (user?.name || user?.email || '?').charAt(0).toUpperCase();
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
  const themeLabel = theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (isUserOverride || typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = event => {
      setTheme(event.matches ? 'dark' : 'light');
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
    }
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [isUserOverride]);

  const handleThemeToggle = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    setIsUserOverride(true);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage?.setItem('theme', nextTheme);
      } catch (error) {
        console.warn('Unable to persist theme preference', error);
      }
    }
  };

  return (
    <div className="layout">
      <aside className={`layout__sidebar ${sidebarOpen ? 'layout__sidebar--open' : ''}`}>
        <div className="layout__brand">
          <span>DOPAMINE CRM</span>
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
            aria-label="تبديل القائمة"
          >
            القائمة
          </button>
          <div className="layout__header-info">
            <div>
              <span className="layout__header-app">DOPAMINE CRM</span>
              <span className="layout__header-role">{roleLabel}</span>
            </div>
            <div className="layout__header-user">
              <div className="layout__avatar">{userInitial}</div>
              <div className="layout__user-text">
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
              </div>
              <button type="button" className="btn btn-secondary layout__theme-toggle" onClick={handleThemeToggle}>
                {themeLabel}
              </button>
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
