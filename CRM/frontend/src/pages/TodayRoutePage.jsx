import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { CUSTOMER_TYPE_LABELS, buildVersionMarker, dueStatusLabel } from './fieldRouteUtils';
import './FieldRoutePages.css';

const TodayRoutePage = () => {
  const todayRouteQuery = useQuery({
    queryKey: ['field', 'today-route'],
    queryFn: async () => {
      const { data } = await apiClient.get('/routes/today');
      return Array.isArray(data) ? data : data?.data || [];
    },
  });

  const stops = todayRouteQuery.data || [];
  const overdueStops = stops.filter(stop => String(stop.dueStatus || stop.due_status || '').toLowerCase() === 'overdue').length;
  const plannedStops = stops.filter(stop => ['planned', 'scheduled'].includes(String(stop.status || 'planned').toLowerCase())).length;

  return (
    <div className="field-shell" data-testid="today-route-route" data-qa-route="today-route">
      <header className="field-header">
        <div>
          <h1 className="page-heading">خطة اليوم</h1>
          <p className="page-subtitle">محطات اليوم من المسار المربوط بالمستخدم الحالي.</p>
        </div>
        <div className="field-header__meta">
          <span className="field-badge">Build {buildVersionMarker}</span>
          <span className="field-badge">{stops.length} محطة</span>
          <span className="field-badge">مخطط {plannedStops}</span>
          <span className={overdueStops ? 'field-badge field-badge--warning' : 'field-badge'}>متأخر {overdueStops}</span>
        </div>
      </header>

      {todayRouteQuery.error && <div className="field-empty">تعذر تحميل خطة اليوم: {todayRouteQuery.error.message}</div>}
      {todayRouteQuery.isLoading && <div className="field-empty">جاري تحميل خطة اليوم...</div>}
      {!todayRouteQuery.isLoading && !stops.length && (
        <div className="field-empty">
          لا توجد زيارات مخططة اليوم للمستخدم الحالي. لم يتم إنشاء مسار أو ترتيب زيارات بديل.
        </div>
      )}

      <section className="field-list" data-testid="today-route-list">
        {stops.map((stop, index) => (
          <article className="route-stop" data-testid="today-route-stop" key={stop.id || `${stop.customerType}-${stop.customerId}`}>
            <div className="route-stop__top">
              <div>
                <strong>
                  {index + 1}. {stop.customerName || stop.customer_name || 'عميل بدون اسم'}
                </strong>
                <div className="field-muted">{CUSTOMER_TYPE_LABELS[stop.customerType || stop.customer_type]}</div>
              </div>
              <div className="field-badges">
                <span className="field-badge">{stop.status || 'planned'}</span>
                {!stop.location && <span className="field-badge field-badge--warning">no_trusted_coordinates</span>}
                {stop.monthlyFrequencyTarget && (
                  <span className="field-badge">هدف شهري {stop.monthlyFrequencyTarget}</span>
                )}
              </div>
            </div>
            <div className="customer-row__facts">
              <div className="fact">
                <span>ترتيب المسار</span>
                <strong>{stop.routeOrder || stop.route_order || index + 1}</strong>
              </div>
              <div className="fact">
                <span>الإقليم / المنطقة</span>
                <strong>{stop.territory || stop.territoryName || stop.area || stop.areaTag || 'غير متاح'}</strong>
              </div>
              <div className="fact">
                <span>العنوان / المنطقة</span>
                <strong>{stop.address || stop.textAddress || stop.city || 'غير متاح'}</strong>
              </div>
              <div className="fact">
                <span>التكرار</span>
                <strong>{stop.visitFrequency || 'غير محدد'}</strong>
              </div>
              <div className="fact">
                <span>الأولوية / الاستحقاق</span>
                <strong>{stop.priority || dueStatusLabel(stop.dueStatus || stop.due_status || (stop.monthlyFrequencyTarget ? 'planned' : ''))}</strong>
              </div>
              <div className="fact">
                <span>المندوب</span>
                <strong>{stop.repName || stop.rep_name || stop.assignedRepName || stop.assigned_rep_name || 'المستخدم الحالي أو غير متاح'}</strong>
              </div>
            </div>
            <div className="field-actions">
              <Link
                className="btn btn-secondary"
                data-testid="today-route-open-profile-action"
                aria-label={`فتح الملف / Open Profile - ${stop.customerName || stop.customer_name || 'عميل'}`}
                to={`/customers/${stop.customerType || stop.customer_type}/${stop.customerId || stop.customer_id}`}
              >
                Open Profile
              </Link>
              <Link
                className="btn btn-primary"
                data-testid="today-route-start-visit-action"
                aria-label={`بدء زيارة / Start Visit - ${stop.customerName || stop.customer_name || 'عميل'}`}
                to={`/visits?customerType=${stop.customerType || stop.customer_type}&customerId=${stop.customerId || stop.customer_id}`}
              >
                Start Visit
              </Link>
              <Link className="btn btn-secondary" to="/live-map">
                Map
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};

export default TodayRoutePage;
