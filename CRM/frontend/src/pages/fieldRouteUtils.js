export const ROLE_LABELS = {
  admin: 'مدير النظام',
  sales_manager: 'مدير مبيعات',
  medical_rep: 'مندوب طبي',
  sales_rep: 'مندوب طبي',
  manager: 'مدير مبيعات',
};

export const CUSTOMER_TYPE_LABELS = {
  doctor: 'طبيب / HCP',
  pharmacy: 'صيدلية / HCO',
};

export const CUSTOMER_BADGE_LABELS = {
  missing_location: 'الموقع غير مكتمل',
  no_trusted_coordinates: 'لا توجد إحداثيات موثوقة',
  needs_review: 'بحاجة إلى مراجعة',
  pending_geocode: 'بانتظار مراجعة الموقع',
  profile_incomplete: 'الملف غير مكتمل',
  demo_seed: 'بيانات اختبار',
};

export const DUE_STATUS_LABELS = {
  due_status_unavailable: 'لا توجد بيانات كافية لحساب الاستحقاق',
};

export const normalizeRoleSlug = user => {
  const rawRole = user?.role?.slug || user?.roleSlug || user?.role || '';
  if (typeof rawRole === 'string') return rawRole.toLowerCase();
  if (rawRole && typeof rawRole === 'object' && rawRole.slug) return String(rawRole.slug).toLowerCase();
  return '';
};

export const roleLabel = roleSlug => ROLE_LABELS[roleSlug] || roleSlug || 'عضو الفريق';

export const formatMissing = value => {
  if (value === null || value === undefined || value === '') return 'غير متاح';
  return value;
};

export const formatCustomerBadge = badge => CUSTOMER_BADGE_LABELS[badge] || String(badge || '').replace(/_/g, ' ');

export const formatDueStatus = value => DUE_STATUS_LABELS[value] || value || 'لا توجد بيانات كافية لحساب الاستحقاق';

export const resolveAssignedRepLabel = customer => {
  const rep =
    customer?.assignedRep ||
    customer?.assigned_rep ||
    customer?.representative ||
    customer?.rep ||
    customer?.salesRep ||
    customer?.sales_rep ||
    null;
  const repName =
    customer?.assignedRepName ||
    customer?.assigned_rep_name ||
    customer?.representativeName ||
    customer?.representative_name ||
    customer?.repName ||
    customer?.rep_name ||
    customer?.salesRepName ||
    customer?.sales_rep_name ||
    rep?.name ||
    '';
  const repId =
    customer?.assignedRepId ||
    customer?.assigned_rep_id ||
    customer?.assignedRepUserId ||
    customer?.assigned_rep_user_id ||
    customer?.repId ||
    customer?.rep_id ||
    rep?.id ||
    '';

  if (repName && repId) return `${repName} (${repId})`;
  if (repName) return repName;
  if (repId) return `معرف المندوب ${repId}`;
  if (customer?.isAssignedToCurrentRep) return 'مكلف للمستخدم الحالي';
  return 'لا توجد هوية مندوب مثبتة في البيانات الحالية';
};

export const redactEmail = value => {
  if (!value || typeof value !== 'string' || !value.includes('@')) return 'غير متاح';
  const [name, domain] = value.split('@');
  const safeName = name ? `${name.slice(0, 1)}***` : '***';
  const domainParts = (domain || '').split('.');
  const safeDomain = domainParts.length > 1 ? `***.${domainParts.at(-1)}` : '***';
  return `${safeName}@${safeDomain}`;
};

export const hasTrustedCoordinates = customer => {
  const location = customer?.location || customer?.coordinates;
  return Number.isFinite(Number(location?.lat)) && Number.isFinite(Number(location?.lng));
};

export const extractTrustedLocation = value => {
  const location = value?.location || value?.coordinates || value?.startLocation || value?.start_location || null;
  const lat = location?.lat ?? value?.latitude ?? value?.lat ?? value?.start_lat ?? null;
  const lng = location?.lng ?? value?.longitude ?? value?.lng ?? value?.start_lng ?? null;
  if (lat === '' || lng === '') return null;
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return null;
  return {
    lat: Number(lat),
    lng: Number(lng),
    accuracy: location?.accuracy ?? value?.accuracy ?? value?.start_accuracy ?? null,
  };
};

export const dueStatusLabel = value => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'overdue') return 'متأخر';
  if (normalized === 'completed') return 'مكتمل';
  if (normalized === 'due') return 'مستحق';
  if (normalized === 'planned') return 'مخطط';
  return formatDueStatus(value || 'due_status_unavailable');
};

export const buildCustomerBadges = customer => {
  const badges = [];
  if (!customer?.address && !customer?.area && !customer?.city) badges.push('missing_location');
  if (!hasTrustedCoordinates(customer)) badges.push('no_trusted_coordinates');
  if (customer?.locationStatus && customer.locationStatus !== 'trusted') badges.push('pending_geocode');
  if (!customer?.phone || (!customer?.specialty && customer?.type === 'doctor')) badges.push('profile_incomplete');
  if (customer?.dataOrigin && customer.dataOrigin !== 'TRUSTED_SOURCE') badges.push('needs_review');
  if (customer?.isDemo) badges.push('demo_seed');
  return [...new Set(badges)];
};

export const normalizeCustomers = rows =>
  (Array.isArray(rows) ? rows : []).map(customer => ({
    ...customer,
    id: String(customer.id ?? customer.customerId ?? ''),
    type: customer.type || customer.customerType || 'doctor',
    name: customer.name || customer.customerName || 'عميل بدون اسم',
    address: customer.address || customer.textAddress || '',
    area: customer.area || customer.areaTag || '',
    city: customer.city || '',
    phone: customer.phone || customer.mobile || '',
    priority: customer.priority || customer.priorityLevel || customer.priority_level || '',
    territory: customer.territory || customer.territoryName || customer.territory_name || customer.areaTag || '',
    classification: customer.classification || customer.customerClass || customer.customer_class || '',
    locationStatus: customer.locationStatus || customer.location_status || '',
    dueStatus: customer.dueStatus || customer.due_status || '',
    monthlyFrequencyTarget: customer.monthlyFrequencyTarget ?? customer.monthly_frequency_target ?? null,
    visitFrequency: customer.visitFrequency || customer.visit_frequency || '',
    lastVisit: customer.lastVisit || customer.last_visit || null,
    visitsThisMonth: customer.visitsThisMonth ?? customer.visits_this_month ?? null,
    assignedRepName: customer.assignedRepName || customer.assigned_rep_name || customer.representativeName || customer.repName || '',
    assignedRepId: customer.assignedRepId || customer.assigned_rep_id || customer.assignedRepUserId || customer.repId || '',
  }));

export const customerProfilePath = customer => `/customers/${customer.type}/${customer.id}`;

export const getOfflineQueueStatus = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { supported: false, queueKeys: 0, label: 'غير معروف' };
  }
  try {
    const keys = Object.keys(window.localStorage).filter(key => /offline|queue|pending|visit/i.test(key));
    return {
      supported: true,
      queueKeys: keys.length,
      label: keys.length ? `${keys.length} مفاتيح محلية مرتبطة بالمزامنة` : 'لا توجد مفاتيح انتظار محلية ظاهرة',
    };
  } catch (_error) {
    return { supported: false, queueKeys: 0, label: 'غير متاح' };
  }
};

export const summarizeGpsPermission = async () => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return 'غير مدعوم في هذا المتصفح';
  }
  if (!navigator.permissions?.query) {
    return 'مدعوم، حالة الإذن غير معروفة';
  }
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    if (result.state === 'granted') return 'مسموح';
    if (result.state === 'denied') return 'مرفوض';
    return 'بانتظار موافقة المستخدم';
  } catch (_error) {
    return 'مدعوم، حالة الإذن غير معروفة';
  }
};

export const buildVersionMarker = import.meta.env.VITE_APP_VERSION || 'crm-phase-a-b-local';
