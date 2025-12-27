import { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './MainLayout.css';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Doctors', path: '/doctors' },
  { label: 'Pharmacies', path: '/pharmacies' },
  { label: 'Products', path: '/products' },
  { label: 'Orders', path: '/orders' },
  { label: 'Visits', path: '/visits' },
  { label: 'Routes', path: '/routes' },
  { label: 'Stock', path: '/stock' },
  { label: 'Targets', path: '/targets' },
  { label: 'Collections', path: '/collections' },
  { label: 'Reports', path: '/reports', roles: ['admin', 'sales_manager'] },
  { label: 'Settings', path: '/settings' },
  { label: 'Admin', path: '/settings/users', roles: ['admin', 'sales_manager'] },
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

  const userInitial = (user?.name || user?.email || '?').charAt(0).toUpperCase();
  const roleLabel =
    roleSlug === 'sales_rep'
      ? 'Sales Representative'
      : roleSlug === 'sales_manager'
      ? 'Sales Manager'
      : roleSlug === 'admin'
      ? 'Admin'
      : roleSlug || 'Team Member';
  const navItems = useMemo(
    () => NAV_ITEMS.filter(item => !item.roles || item.roles.includes(roleSlug)),
    [roleSlug],
  );

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
            aria-label="Toggle navigation"
          >
            Menu
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
              <button type="button" className="btn btn-secondary layout__signout" onClick={handleSignOut}>
                Sign out
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
