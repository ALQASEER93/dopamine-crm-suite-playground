import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const normalizeRole = roleValue => {
  if (!roleValue) {
    return '';
  }

  if (typeof roleValue === 'string') {
    return roleValue.toLowerCase();
  }

  if (typeof roleValue === 'object' && roleValue.slug) {
    return String(roleValue.slug).toLowerCase();
  }

  return '';
};

const RequireRole = ({ roles = [], children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!roles || roles.length === 0) {
    return children;
  }

  const activeRole = normalizeRole(user?.role || user?.roleSlug);
  const allowed = roles.some(role => normalizeRole(role) === activeRole);

  if (!allowed) {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  return children;
};

export default RequireRole;
