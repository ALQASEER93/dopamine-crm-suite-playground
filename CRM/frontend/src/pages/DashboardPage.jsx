import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import VisitsSummaryCards from '../visits/VisitsSummaryCards';
import { apiClient } from '../api/client';
import { normalizeVisit } from '../api/visits';
import './DashboardPage.css';

const formatDashboardError = error => {
  if (!error) return null;
  const status = typeof error.status === 'number' ? error.status : error?.response?.status ?? null;
  const payloadDetail =
    error?.payload && typeof error.payload === 'object'
      ? error.payload.detail || error.payload.message
      : null;
  const baseMessage =
    typeof payloadDetail === 'string' && payloadDetail.trim() ? payloadDetail : error.message || 'Unable to load data';
  return status ? `${baseMessage} (${status})` : baseMessage;
};

const logValidationError = (error, label) => {
  if (error?.status === 422) {
    const detail = error.payload?.detail || error.payload;
    console.error(`${label} validation error`, detail);
  }
};

const DashboardPage = () => {
  const { token, user } = useAuth();

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary', token || user?.id || null],
    queryFn: async () => {
      const { data } = await apiClient.get('/visits/summary', { token });
      return data?.data ?? data;
    },
    enabled: !!token,
    staleTime: 60_000,
  });

  const recentVisitsQuery = useQuery({
    queryKey: ['dashboard', 'recentVisits', token || user?.id || null],
    queryFn: async () => {
      const { data } = await apiClient.get('/visits/latest?pageSize=5', { token });
      const raw = Array.isArray(data?.data) ? data.data : [];
      return raw.map(normalizeVisit).filter(Boolean);
    },
    enabled: !!token,
    staleTime: 30_000,
  });

  useEffect(() => {
    logValidationError(summaryQuery.error, 'Visits summary');
  }, [summaryQuery.error]);

  useEffect(() => {
    logValidationError(recentVisitsQuery.error, 'Recent visits');
  }, [recentVisitsQuery.error]);

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

      {summaryQuery.data?.lastActivityAt && (
        <div className="table-card__empty" style={{ textAlign: 'left' }}>
          Last activity: {new Date(summaryQuery.data.lastActivityAt).toLocaleString()}
        </div>
      )}

      <section className="table-card">
        <div className="table-card__header">
          <div>
            <h2>Visits per rep</h2>
            <p>Completion rate and average duration by representative.</p>
          </div>
        </div>
        {summaryQuery.isLoading ? (
          <div className="table-card__empty">Loading rep metrics...</div>
        ) : Array.isArray(summaryQuery.data?.visitsByRep) && summaryQuery.data.visitsByRep.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Rep</th>
                <th>Total</th>
                <th>Completed</th>
                <th>Avg duration</th>
                <th>Last visit</th>
              </tr>
            </thead>
            <tbody>
              {summaryQuery.data.visitsByRep.map(rep => (
                <tr key={rep.repId}>
                  <td>{rep.repName}</td>
                  <td>{rep.totalVisits}</td>
                  <td>{rep.completedVisits}</td>
                  <td>{rep.avgDurationMinutes != null ? `${rep.avgDurationMinutes} min` : 'N/A'}</td>
                  <td>{rep.lastVisitAt ? new Date(rep.lastVisitAt).toLocaleString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="table-card__empty">No rep metrics available yet.</div>
        )}
      </section>

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
                  <th>Account</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {recentVisits.map(visit => (
                  <tr key={visit.id}>
                    <td>{visit.visitDate ? new Date(visit.visitDate).toLocaleString() : '-'}</td>
                    <td>{visit.rep?.name || visit.rep?.email || '-'}</td>
                    <td>{visit.doctor?.name || visit.pharmacy?.name || '-'}</td>
                    <td>
                      <span className="badge">{(visit.status || 'scheduled').replace(/_/g, ' ')}</span>
                    </td>
                    <td>{visit.durationMinutes != null ? `${visit.durationMinutes} min` : 'N/A'}</td>
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
