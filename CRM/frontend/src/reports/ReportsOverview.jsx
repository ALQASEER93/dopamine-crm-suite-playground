import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/client';

const ReportsOverview = ({ from, to }) => {
  const { token } = useAuth();

  const overviewQuery = useQuery({
    queryKey: ['reports', 'overview', { from, to }],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      const { data: payload } = await apiClient.get(`/reports/overview?${params.toString()}`);
      return payload?.data ?? payload;
    },
    enabled: !!token && !!from && !!to,
    keepPreviousData: true,
  });

  const data = overviewQuery.data || {};

  return (
    <section className="page-card" style={{ marginBottom: '16px' }} data-testid="reports-overview">
      <h2>نظرة عامة</h2>
      <p>مؤشرات الأداء الرئيسية.</p>
      {overviewQuery.error && (
        <div className="table-card__empty">تعذر تحميل النظرة العامة: {overviewQuery.error.message}</div>
      )}
      {overviewQuery.isLoading && !overviewQuery.error && (
        <div className="table-card__empty">جاري تحميل النظرة العامة...</div>
      )}
      {!overviewQuery.isLoading && !overviewQuery.error && (
        <div className="overview-grid">
          <div className="overview-card">
            <p className="label">إجمالي الزيارات</p>
            <p className="value">{data.totalVisits ?? '-'}</p>
          </div>
          <div className="overview-card">
            <p className="label">الزيارات الناجحة</p>
            <p className="value">{data.successfulVisits ?? '-'}</p>
          </div>
          <div className="overview-card" data-testid="reports-planned-vs-completed">
            <p className="label">المخطط مقابل المكتمل</p>
            <p className="value">{data.scheduledVisits ?? '-'} / {data.successfulVisits ?? '-'}</p>
          </div>
          <div className="overview-card" data-testid="reports-due-overdue">
            <p className="label">المستحق مقابل المتأخر</p>
            <p className="value">غير متاح من API التقارير الحالي</p>
          </div>
          <div className="overview-card" data-testid="reports-frequency-attainment">
            <p className="label">تحقيق التكرار الشهري</p>
            <p className="value">غير متاح من API التقارير الحالي</p>
          </div>
          <div className="overview-card" data-testid="reports-gps-compliance">
            <p className="label">التزام GPS</p>
            <p className="value">يعرض فقط عند وجود GPS موثوق في سجلات الزيارات</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default ReportsOverview;
