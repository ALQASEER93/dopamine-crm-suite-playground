import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { hasTrustedCoordinates, normalizeCustomers, summarizeGpsPermission } from './fieldRouteUtils';
import './FieldRoutePages.css';

const LiveMapPage = () => {
  const [gpsState, setGpsState] = useState('جارٍ الفحص');

  const customersQuery = useQuery({
    queryKey: ['field', 'live-map', 'customers'],
    queryFn: async () => {
      const { data } = await apiClient.get('/pwa/customers');
      return normalizeCustomers(data);
    },
  });

  const visitsQuery = useQuery({
    queryKey: ['field', 'live-map', 'visits'],
    queryFn: async () => {
      const { data } = await apiClient.get('/pwa/visits?status=in_progress');
      return Array.isArray(data) ? data : [];
    },
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
  const trustedCustomers = useMemo(() => customers.filter(hasTrustedCoordinates), [customers]);
  const activeVisits = visitsQuery.data || [];
  const activeVisitsWithLocation = activeVisits.filter(visit => visit.coordinates?.lat && visit.coordinates?.lng);

  return (
    <div className="field-shell">
      <header className="field-header">
        <div>
          <h1 className="page-heading">الخريطة الحية</h1>
          <p className="page-subtitle">عرض تشغيلي حذر: لا تتبع حي ولا إحداثيات إلا إذا وفرها الـ API بثقة.</p>
        </div>
        <div className="field-badges">
          <span className="field-badge">GPS: {gpsState}</span>
          <span className="field-badge">{trustedCustomers.length} عملاء بإحداثيات موثوقة</span>
        </div>
      </header>

      <section className="map-panel">
        <div className="map-panel__message">
          <h2>لا توجد إحداثيات موثوقة كافية لرسم خريطة تشغيلية</h2>
          <p className="field-muted">
            العملاء الحاليون لا يقدمون `location` موثوقاً من الـ API، لذلك لا يتم تخمين نقاط على الخريطة ولا إنشاء مسار وهمي.
          </p>
          <div className="field-badges">
            <span className="field-badge field-badge--warning">no_trusted_coordinates</span>
            <span className="field-badge field-badge--warning">permission_state: {gpsState}</span>
            {!activeVisitsWithLocation.length && <span className="field-badge field-badge--warning">no_active_visit_location</span>}
          </div>
        </div>
      </section>

      <section className="field-grid">
        <article className="field-card">
          <h2>الزيارات النشطة</h2>
          <p>{activeVisits.length ? `${activeVisits.length} زيارة قيد التنفيذ` : 'لا توجد زيارات قيد التنفيذ للمستخدم الحالي.'}</p>
          <p className="field-muted">
            يتم عرض موقع الزيارة فقط إذا أرسل الخادم إحداثيات بداية موثوقة؛ غير ذلك تبقى فارغة.
          </p>
        </article>
        <article className="field-card">
          <h2>العملاء القريبون</h2>
          <p>{trustedCustomers.length ? `${trustedCustomers.length} عملاء لديهم إحداثيات` : 'غير مدعوم بالبيانات الحالية.'}</p>
          <p className="field-muted">لا توجد عملية geocoding أو تخمين إحداثيات في هذه الصفحة.</p>
        </article>
      </section>

      {(customersQuery.error || visitsQuery.error) && (
        <div className="field-empty">تعذر تحميل بيانات الخريطة: {customersQuery.error?.message || visitsQuery.error?.message}</div>
      )}
    </div>
  );
};

export default LiveMapPage;
