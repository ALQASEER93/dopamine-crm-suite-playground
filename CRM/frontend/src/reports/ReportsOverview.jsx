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
    <section className="page-card" style={{ marginBottom: '16px' }}>
      <h2>Overview</h2>
      <p>High-level performance metrics.</p>
      {overviewQuery.error && (
        <div className="table-card__empty">Unable to load overview: {overviewQuery.error.message}</div>
      )}
      {overviewQuery.isLoading && !overviewQuery.error && (
        <div className="table-card__empty">Loading overview...</div>
      )}
      {!overviewQuery.isLoading && !overviewQuery.error && (
        <div className="overview-grid">
          <div className="overview-card">
            <p className="label">Total visits</p>
            <p className="value">{data.totalVisits ?? '-'}</p>
          </div>
          <div className="overview-card">
            <p className="label">Successful visits</p>
            <p className="value">{data.successfulVisits ?? '-'}</p>
          </div>
          <div className="overview-card">
            <p className="label">Orders (count)</p>
            <p className="value">{data.ordersCount ?? '-'}</p>
          </div>
          <div className="overview-card">
            <p className="label">Orders total (JOD)</p>
            <p className="value">{data.ordersTotal ?? '-'}</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default ReportsOverview;
