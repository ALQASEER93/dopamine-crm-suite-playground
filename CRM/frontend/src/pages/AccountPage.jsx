import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/client';
import {
  buildVersionMarker,
  getOfflineQueueStatus,
  normalizeCustomers,
  normalizeRoleSlug,
  roleLabel,
  summarizeGpsPermission,
} from './fieldRouteUtils';
import './FieldRoutePages.css';

const AccountPage = () => {
  const { user, token } = useAuth();
  const [gpsState, setGpsState] = useState('جارٍ الفحص');
  const offlineStatus = useMemo(() => getOfflineQueueStatus(), []);
  const roleSlug = normalizeRoleSlug(user);

  const customersQuery = useQuery({
    queryKey: ['field', 'account', 'customers'],
    queryFn: async () => {
      const { data } = await apiClient.get('/pwa/customers');
      return normalizeCustomers(data);
    },
    enabled: !!token,
  });

  const todayRouteQuery = useQuery({
    queryKey: ['field', 'account', 'today-route'],
    queryFn: async () => {
      const { data } = await apiClient.get('/routes/today');
      return Array.isArray(data) ? data : data?.data || [];
    },
    enabled: !!token,
  });

  useEffect(() => {
    let mounted = true;
    summarizeGpsPermission().then(value => {
      if (mounted) setGpsState(value);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const customers = customersQuery.data || [];
  const assignedCustomers = customers.filter(customer => customer.isAssignedToCurrentRep);
  const plannedStops = todayRouteQuery.data || [];
  const doctorCount = customers.filter(customer => customer.type === 'doctor').length;
  const pharmacyCount = customers.filter(customer => customer.type === 'pharmacy').length;
  const territories = [...new Set(customers.map(customer => customer.territory || customer.area).filter(Boolean))];

  return (
    <div className="field-shell">
      <header className="field-header">
        <div>
          <h1 className="page-heading">حسابي الميداني</h1>
          <p className="page-subtitle">ملخص المستخدم الحالي، الخطة، وحالة الجهاز بدون عرض أسرار.</p>
        </div>
        <span className="field-badge">Build {buildVersionMarker}</span>
      </header>

      <section className="field-grid">
        <article className="field-card">
          <h2>الهوية</h2>
          <div className="detail-facts">
            <div className="fact">
              <span>الاسم</span>
              <strong>{user?.name || 'غير متاح'}</strong>
            </div>
            <div className="fact">
              <span>الدور</span>
              <strong>{roleLabel(roleSlug)}</strong>
            </div>
            <div className="fact">
              <span>الإقليم / المنطقة</span>
              <strong>{user?.salesRep?.territoryName || user?.territoryName || 'غير متاح من /auth/me'}</strong>
            </div>
          </div>
        </article>

        <article className="field-card field-metric">
          <span className="field-muted">العملاء الظاهرون</span>
          <strong>{customers.length}</strong>
          <span>أطباء: {doctorCount} | صيدليات: {pharmacyCount}</span>
        </article>

        <article className="field-card field-metric">
          <span className="field-muted">عملاء مكلفون للمستخدم الحالي</span>
          <strong>{assignedCustomers.length}</strong>
          <span>{assignedCustomers.length ? 'حسب ربط المسارات الحالي' : 'لا يوجد تكليف مثبت في البيانات الحالية'}</span>
        </article>

        <article className="field-card field-metric">
          <span className="field-muted">خطة اليوم</span>
          <strong>{plannedStops.length}</strong>
          <span>{plannedStops.length ? 'محطات مخططة' : 'لا توجد محطات يومية للمستخدم الحالي'}</span>
        </article>
      </section>

      <section className="field-grid">
        <article className="field-card">
          <h2>المناطق والتكليف</h2>
          <div className="detail-facts">
            <div className="fact">
              <span>عدد المناطق الظاهرة</span>
              <strong>{territories.length || 'غير متاح'}</strong>
            </div>
            <div className="fact">
              <span>أولويات المتابعة</span>
              <strong>{customers.filter(customer => customer.dueStatus === 'overdue').length} متأخر / {customers.filter(customer => customer.dueStatus === 'completed').length} مكتمل</strong>
            </div>
          </div>
          <p className="field-muted">
            {territories.length ? territories.slice(0, 4).join('، ') : 'لا توجد مناطق مثبتة في بيانات العملاء الحالية.'}
          </p>
        </article>
        <article className="field-card">
          <h2>حالة GPS</h2>
          <p>{gpsState}</p>
        </article>
        <article className="field-card">
          <h2>المزامنة / Offline</h2>
          <p>{offlineStatus.label}</p>
          <p className="field-muted">
            {offlineStatus.supported ? 'فحص محلي للمتصفح فقط؛ لا يثبت نجاح service worker أو real-device offline.' : 'غير مدعوم في هذا السياق.'}
          </p>
        </article>
        <article className="field-card">
          <h2>الدعم و QA</h2>
          <div className="detail-facts">
            <div className="fact">
              <span>هوية المستخدم</span>
              <strong>{user?.id ? `User ${user.id}` : 'غير متاح بدون أسرار'}</strong>
            </div>
            <div className="fact">
              <span>البريد</span>
              <strong>{user?.email ? 'مخفي في الواجهة' : 'غير متاح'}</strong>
            </div>
            <div className="fact">
              <span>الإصدار</span>
              <strong>Build {buildVersionMarker}</strong>
            </div>
          </div>
          <p className="field-muted">لا تعرض هذه الصفحة كلمات مرور أو رموز جلسة أو متغيرات بيئة.</p>
        </article>
      </section>

      {(customersQuery.error || todayRouteQuery.error) && (
        <div className="field-empty">
          تعذر تحميل جزء من ملخص الحساب: {customersQuery.error?.message || todayRouteQuery.error?.message}
        </div>
      )}
    </div>
  );
};

export default AccountPage;
