import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import VisitsSummaryCards from '../visits/VisitsSummaryCards';
import { apiClient } from '../api/client';
import './DashboardPage.css';

const formatDashboardError = error => {
  if (!error) return null;
  const status = typeof error.status === 'number' ? error.status : null;
  const payloadDetail =
    error?.payload && typeof error.payload === 'object'
      ? error.payload.detail || error.payload.message
      : null;
  const baseMessage = typeof payloadDetail === 'string' && payloadDetail.trim() ? payloadDetail : error.message;
  return status ? `${status}: ${baseMessage || 'Request failed'}` : baseMessage || 'Request failed';
};

const DashboardPage = () => {
  const { token } = useAuth();

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary', token ? 'auth' : 'guest'],
    queryFn: async () => {
      const { data } = await apiClient.get('/visits/summary');
      return data?.data ?? data;
    },
    enabled: !!token,
    staleTime: 60_000,
  });

  const recentVisitsQuery = useQuery({
    queryKey: ['dashboard', 'recentVisits', token ? 'auth' : 'guest'],
    queryFn: async () => {
      const { data } = await apiClient.get('/visits/latest?pageSize=5');
      return Array.isArray(data?.data) ? data.data : [];
    },
    enabled: !!token,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (token) {
      summaryQuery.refetch();
      recentVisitsQuery.refetch();
    }
  }, [recentVisitsQuery.refetch, summaryQuery.refetch, token]);

  const summaryErrorMessage = formatDashboardError(summaryQuery.error);
  const recentVisitsErrorMessage = formatDashboardError(recentVisitsQuery.error);
  const recentVisits = useMemo(() => recentVisitsQuery.data ?? [], [recentVisitsQuery.data]);

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">Dashboard</h1>
          <p className="page-subtitle">Monitor performance across teams and accounts.</p>
        </div>
        <Link to="/visits" className="btn btn-primary">
          Manage visits
        </Link>
      </div>

      <VisitsSummaryCards
        summary={summaryQuery.data}
        isLoading={summaryQuery.isLoading}
        error={summaryErrorMessage}
      />

      <section className="table-card">
        <div className="table-card__header">
          <div>
            <h2>Recent visits</h2>
            <p>Latest calls across all territories.</p>
          </div>
          <Link to="/visits" className="btn btn-secondary">
            View all
          </Link>
        </div>
        {recentVisitsQuery.error && (
          <div className="table-card__empty">Unable to load latest visits: {recentVisitsErrorMessage}</div>
        )}
        {!recentVisitsQuery.error && recentVisits.length === 0 && !recentVisitsQuery.isLoading && (
          <div className="table-card__empty">No visits recorded yet.</div>
        )}
        {recentVisitsQuery.isLoading ? (
          <div className="table-card__empty">Loading latest visits...</div>
        ) : (
          recentVisits.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Representative</th>
                  <th>HCP</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {recentVisits.map(visit => (
                  <tr key={visit.id}>
                    <td>{new Date(visit.visitDate).toLocaleDateString()}</td>
                    <td>{visit.rep?.name || '-'}</td>
                    <td>{visit.hcp?.name || '-'}</td>
                    <td>
                      <span className="badge">{visit.status.replace(/_/g, ' ')}</span>
                    </td>
                    <td>{visit.durationMinutes} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </section>
    </div>
  );
};

export default DashboardPage;
