import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/client';

const TerritoryPerformanceTable = ({ from, to }) => {
  const { token } = useAuth();

  const territoryQuery = useQuery({
    queryKey: ['reports', 'territory-performance', { from, to }],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      const { data } = await apiClient.get(`/reports/territory-performance?${params.toString()}`);
      return Array.isArray(data) ? data : data?.data || [];
    },
    enabled: !!token && !!from && !!to,
    keepPreviousData: true,
  });

  const rows = territoryQuery.data || [];

  return (
    <section className="page-card" data-testid="reports-territory-coverage">
      <h2>أداء الأقاليم</h2>
      <p>الزيارات والتغطية لكل إقليم.</p>

      {territoryQuery.error && (
        <div className="table-card__empty">تعذر تحميل أداء الأقاليم: {territoryQuery.error.message}</div>
      )}
      {territoryQuery.isLoading && !territoryQuery.error && (
        <div className="table-card__empty">جاري تحميل أداء الأقاليم...</div>
      )}

      {!territoryQuery.isLoading && !territoryQuery.error && rows.length === 0 && (
        <div className="table-card__empty">لا توجد بيانات للأقاليم في الفترة المختارة.</div>
      )}

      {!territoryQuery.isLoading && !territoryQuery.error && rows.length > 0 && (
        <div className="table-card__table-wrapper">
          <table>
            <thead>
              <tr>
                <th>الإقليم</th>
                <th>إجمالي الزيارات</th>
                <th>المكتملة</th>
                <th>الحسابات الفريدة</th>
                <th>متوسط التقييم</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.territoryId}>
                  <td>{row.territoryName || '-'}</td>
                  <td>{row.totalVisits}</td>
                  <td>{row.completedVisits}</td>
                  <td>{row.uniqueAccounts}</td>
                  <td>{row.avgRating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default TerritoryPerformanceTable;
