import { useAuth } from './AuthContext';
import { isRoleAllowed } from './roleAccess';
import NotAuthorized from '../pages/NotAuthorized.jsx';

const RequireRole = ({ roles = [], children }) => {
  const { user } = useAuth();
  if (!roles || roles.length === 0) {
    return children;
  }

  if (!isRoleAllowed(user?.role || user?.roleSlug, roles)) {
    return <NotAuthorized />;
  }

  return children;
};

export default RequireRole;
