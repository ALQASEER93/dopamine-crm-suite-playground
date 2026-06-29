import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { CUSTOMER_TYPE_LABELS } from './fieldRouteUtils';
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

  return (
    <div className="field-shell">
      <header className="field-header">
        <div>
          <h1 className="page-heading">خطة اليوم</h1>
          <p className="page-subtitle">محطات اليوم من المسار المربوط بالمستخدم الحالي.</p>
        </div>
        <span className="field-badge">{stops.length} محطة</span>
      </header>

      {todayRouteQuery.error && <div className="field-empty">تعذر تحميل خطة اليوم: {todayRouteQuery.error.message}</div>}
      {todayRouteQuery.isLoading && <div className="field-empty">جاري تحميل خطة اليوم...</div>}
      {!todayRouteQuery.isLoading && !stops.length && (
        <div className="field-empty">
          لا توجد زيارات مخططة اليوم للمستخدم الحالي. لم يتم إنشاء مسار أو ترتيب زيارات بديل.
        </div>
      )}

      <section className="field-list">
        {stops.map((stop, index) => (
          <article className="route-stop" key={stop.id || `${stop.customerType}-${stop.customerId}`}>
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
                <span>العنوان / المنطقة</span>
                <strong>{stop.address || 'غير متاح'}</strong>
              </div>
              <div className="fact">
                <span>التكرار</span>
                <strong>{stop.visitFrequency || 'غير محدد'}</strong>
              </div>
              <div className="fact">
                <span>الأولوية / الاستحقاق</span>
                <strong>{stop.monthlyFrequencyTarget ? 'ضمن خطة التكرار' : 'غير محسوب'}</strong>
              </div>
            </div>
            <div className="field-actions">
              <Link className="btn btn-secondary" to={`/customers/${stop.customerType || stop.customer_type}/${stop.customerId || stop.customer_id}`}>
                Open Profile
              </Link>
              <Link className="btn btn-primary" to={`/visits?customerType=${stop.customerType || stop.customer_type}&customerId=${stop.customerId || stop.customer_id}`}>
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
