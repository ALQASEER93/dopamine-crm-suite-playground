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
    <section className="page-card">
      <h2>Territory performance</h2>
      <p>Visits, coverage and commercial value per territory.</p>

      {territoryQuery.error && (
        <div className="table-card__empty">Unable to load territory performance: {territoryQuery.error.message}</div>
      )}
      {territoryQuery.isLoading && !territoryQuery.error && (
        <div className="table-card__empty">Loading territory performance...</div>
      )}

      {!territoryQuery.isLoading && !territoryQuery.error && rows.length === 0 && (
        <div className="table-card__empty">No territory data for selected period.</div>
      )}

      {!territoryQuery.isLoading && !territoryQuery.error && rows.length > 0 && (
        <div className="table-card__table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Territory</th>
                <th>Total visits</th>
                <th>Completed</th>
                <th>Unique accounts</th>
                <th>Total order (JOD)</th>
                <th>Avg order (JOD)</th>
                <th>Avg rating</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.territoryId}>
                  <td>{row.territoryName || '-'}</td>
                  <td>{row.totalVisits}</td>
                  <td>{row.completedVisits}</td>
                  <td>{row.uniqueAccounts}</td>
                  <td>{row.totalOrderValueJOD}</td>
                  <td>{row.avgOrderValueJOD}</td>
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
