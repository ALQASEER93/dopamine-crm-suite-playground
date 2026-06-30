import { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { applyDocumentLanguage, resolveInitialLanguage } from '../i18n/language';
import { normalizeRoleSlug, redactEmail, roleLabel as resolveRoleLabel } from '../pages/fieldRouteUtils';
import './MainLayout.css';

const NAV_ITEMS = [
  { label: 'حسابي', path: '/account' },
  { label: 'العملاء', path: '/customers' },
  { label: 'خطة اليوم', path: '/today-route' },
  { label: 'الخريطة الحية', path: '/live-map' },
  { label: 'لوحة التحكم', path: '/dashboard' },
  { label: 'الأطباء', path: '/doctors' },
  { label: 'الصيدليات', path: '/pharmacies' },
  { label: 'المنتجات', path: '/products' },
  { label: 'الزيارات', path: '/visits' },
  { label: 'المسارات', path: '/routes' },
  { label: 'الأهداف', path: '/targets' },
  { label: 'التقارير', path: '/reports', roles: ['admin', 'sales_manager'] },
  { label: 'بيانات العملاء', path: '/admin/customers', roles: ['admin'] },
  { label: 'مخطط التكليف', path: '/admin/assignment-planner', roles: ['admin'] },
  { label: 'الإعدادات', path: '/settings' },
  { label: 'الإدارة', path: '/settings/users', roles: ['admin', 'sales_manager'] },
];

const CRM_BUILD_MARKER = import.meta.env.VITE_APP_VERSION || 'crm-1.0.0-phase-a';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [language, setLanguage] = useState(resolveInitialLanguage);
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    try {
      const stored = window.localStorage?.getItem('theme');
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch (error) {
      console.warn('Theme storage unavailable', error);
    }
    return 'dark';
  });
  const [isUserOverride, setIsUserOverride] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = window.localStorage?.getItem('theme');
      return stored === 'light' || stored === 'dark' || !stored;
    } catch (error) {
      return true;
    }
  });
  const navigate = useNavigate();
  const location = useLocation();
  const roleSlug = useMemo(() => normalizeRoleSlug(user), [user]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const userInitial = (user?.name || user?.email || '?').charAt(0).toUpperCase();
  const roleLabel = resolveRoleLabel(roleSlug);
  const navItems = useMemo(
    () => NAV_ITEMS.filter(item => !item.roles || item.roles.includes(roleSlug)),
    [roleSlug],
  );
  const themeLabel = theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن';
  const nextLanguageLabel = language === 'ar' ? 'English' : 'العربية';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    applyDocumentLanguage(language);
    try {
      window.localStorage?.setItem('dpm.language', language);
    } catch (error) {
      console.warn('Unable to persist language preference', error);
    }
  }, [language]);

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

  const handleLanguageToggle = () => {
    setLanguage(prev => (prev === 'ar' ? 'en' : 'ar'));
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
              <span className="layout__header-build">Build {CRM_BUILD_MARKER}</span>
            </div>
            <div className="layout__header-user">
              <div className="layout__avatar">{userInitial}</div>
              <div className="layout__user-text">
                <strong>{user?.name}</strong>
                <span>{redactEmail(user?.email)}</span>
              </div>
              <button type="button" className="btn btn-secondary layout__theme-toggle" onClick={handleThemeToggle}>
                {themeLabel}
              </button>
              <button
                type="button"
                className="btn btn-secondary layout__language-toggle"
                onClick={handleLanguageToggle}
                aria-label={`تبديل اللغة إلى ${nextLanguageLabel} / Switch language to ${nextLanguageLabel}`}
                data-testid="language-toggle"
                data-language-current={language}
                data-language-next={language === 'ar' ? 'en' : 'ar'}
              >
                {nextLanguageLabel}
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
