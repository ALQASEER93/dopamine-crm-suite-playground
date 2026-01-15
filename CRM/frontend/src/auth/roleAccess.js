export const ROLE_GROUPS = {
  admin: ['admin', 'sales_manager'],
  field: ['medical_rep', 'sales_rep'],
  all: ['admin', 'sales_manager', 'medical_rep', 'sales_rep'],
};

export const ROLE_ACCESS = {
  dashboard: ROLE_GROUPS.all,
  visits: ROLE_GROUPS.all,
  routes: ROLE_GROUPS.all,
  doctors: ROLE_GROUPS.all,
  pharmacies: ROLE_GROUPS.all,
  reps: ROLE_GROUPS.admin,
  products: ROLE_GROUPS.admin,
  orders: ROLE_GROUPS.all,
  stock: ROLE_GROUPS.admin,
  targets: ROLE_GROUPS.admin,
  collections: ROLE_GROUPS.all,
  reports: ROLE_GROUPS.admin,
  repLiveMap: ROLE_GROUPS.admin,
  visitCompliance: ROLE_GROUPS.admin,
  settings: ROLE_GROUPS.admin,
  adminUsers: ROLE_GROUPS.admin,
};

export const normalizeRole = roleValue => {
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

export const isRoleAllowed = (roleValue, allowedRoles) => {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const activeRole = normalizeRole(roleValue);
  return allowedRoles.some(role => normalizeRole(role) === activeRole);
};
