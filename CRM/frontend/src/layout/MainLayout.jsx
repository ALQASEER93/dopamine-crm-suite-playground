import { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { applyDocumentLanguage, resolveInitialLanguage } from '../i18n/language';
import { normalizeRoleSlug, redactEmail, roleLabel as resolveRoleLabel } from '../pages/fieldRouteUtils';
import './MainLayout.css';

const NAV_ITEMS = [
  { ar: 'حسابي', en: 'My account', path: '/account' },
  { ar: 'العملاء', en: 'Customers', path: '/customers' },
  { ar: 'خطة اليوم', en: 'Today route', path: '/today-route' },
  { ar: 'الخريطة الحية', en: 'Live map', path: '/live-map' },
  { ar: 'لوحة التحكم', en: 'Dashboard', path: '/dashboard' },
  { ar: 'الأطباء', en: 'Doctors', path: '/doctors' },
  { ar: 'الصيدليات', en: 'Pharmacies', path: '/pharmacies' },
  { ar: 'المنتجات', en: 'Products', path: '/products' },
  { ar: 'الزيارات', en: 'Visits', path: '/visits' },
  { ar: 'المسارات', en: 'Routes', path: '/routes' },
  { ar: 'الأهداف', en: 'Targets', path: '/targets' },
  { ar: 'التقارير', en: 'Reports', path: '/reports', roles: ['admin', 'sales_manager'] },
  { ar: 'بيانات العملاء', en: 'Customer data', path: '/admin/customers', roles: ['admin'] },
  { ar: 'مخطط التكليف', en: 'Assignment planner', path: '/admin/assignment-planner', roles: ['admin'] },
  { ar: 'الإعدادات', en: 'Settings', path: '/settings' },
  { ar: 'الإدارة', en: 'User management', path: '/settings/users', roles: ['admin', 'sales_manager'] },
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
  const isArabic = language === 'ar';
  const themeLabel =
    theme === 'dark'
      ? isArabic
        ? 'الوضع الفاتح'
        : 'Light mode'
      : isArabic
        ? 'الوضع الداكن'
        : 'Dark mode';
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
              {isArabic ? item.ar : item.en}
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
            aria-label={isArabic ? 'تبديل القائمة' : 'Toggle menu'}
          >
            {isArabic ? 'القائمة' : 'Menu'}
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
                {isArabic ? 'تسجيل الخروج' : 'Sign out'}
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
