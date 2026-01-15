import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/client';

const ReportsOverview = ({ from, to, repId, territoryId, accountType }) => {
  const { token } = useAuth();

  const overviewQuery = useQuery({
    queryKey: ['reports', 'overview', { from, to, repId, territoryId, accountType }],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      if (repId) params.set('rep_id', repId);
      if (territoryId) params.set('territory_id', territoryId);
      if (accountType) params.set('account_type', accountType);
      const { data: payload } = await apiClient.get(`/reports/overview?${params.toString()}`);
      return payload?.data ?? payload;
    },
    enabled: !!token && !!from && !!to,
    keepPreviousData: true,
  });

  const data = overviewQuery.data || {};

  return (
    <section className="page-card" style={{ marginBottom: '16px' }}>
      <h2>نظرة عامة</h2>
      <p>مؤشرات الأداء الأساسية.</p>
      {overviewQuery.error && (
        <div className="table-card__empty">تعذر تحميل النظرة العامة: {overviewQuery.error.message}</div>
      )}
      {overviewQuery.isLoading && !overviewQuery.error && (
        <div className="table-card__empty">جارٍ تحميل النظرة العامة...</div>
      )}
      {!overviewQuery.isLoading && !overviewQuery.error && (
        <div className="overview-grid">
          <div className="overview-card">
            <p className="label">إجمالي الزيارات</p>
            <p className="value">{data.totalVisits ?? '-'}</p>
          </div>
          <div className="overview-card">
            <p className="label">الزيارات المكتملة</p>
            <p className="value">{data.successfulVisits ?? '-'}</p>
          </div>
          <div className="overview-card">
            <p className="label">عدد الطلبات</p>
            <p className="value">{data.ordersCount ?? '-'}</p>
          </div>
          <div className="overview-card">
            <p className="label">إجمالي الطلبات (JOD)</p>
            <p className="value">{data.ordersTotal ?? '-'}</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default ReportsOverview;
