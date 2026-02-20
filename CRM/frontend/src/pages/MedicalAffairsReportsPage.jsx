import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const MedicalAffairsReportsPage = () => {
  const { token } = useAuth();
  const [filters, setFilters] = useState({
    from_date: '',
    to_date: '',
  });

  const roiQuery = useQuery({
    queryKey: ['medical-affairs', 'reports', 'event-roi', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.from_date) params.set('from_date', new Date(filters.from_date).toISOString());
      if (filters.to_date) params.set('to_date', new Date(filters.to_date).toISOString());
      const path = params.toString()
        ? `/medical-affairs/reports/event-roi?${params.toString()}`
        : '/medical-affairs/reports/event-roi';
      const { data } = await apiClient.get(path);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!token,
  });

  const kolQuery = useQuery({
    queryKey: ['medical-affairs', 'reports', 'kol-engagement'],
    queryFn: async () => {
      const { data } = await apiClient.get('/medical-affairs/reports/kol-engagement');
      return Array.isArray(data) ? data : [];
    },
    enabled: !!token,
  });

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">تقارير الشؤون الطبية</h1>
          <p className="page-subtitle">ROI الفعاليات وتفاعل KOL.</p>
        </div>
      </div>

      <section className="page-card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <label>
            <span>من</span>
            <input
              className="input"
              type="datetime-local"
              value={filters.from_date}
              onChange={event => setFilters(prev => ({ ...prev, from_date: event.target.value }))}
            />
          </label>
          <label>
            <span>إلى</span>
            <input
              className="input"
              type="datetime-local"
              value={filters.to_date}
              onChange={event => setFilters(prev => ({ ...prev, to_date: event.target.value }))}
            />
          </label>
          <div style={{ alignSelf: 'end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => roiQuery.refetch()}>
              تحديث
            </button>
          </div>
        </div>
      </section>

      <section className="page-card">
        <h2 style={{ marginTop: 0 }}>عائد الفعاليات (ROI)</h2>
        {roiQuery.error && <div className="table-card__empty">تعذر تحميل التقرير: {roiQuery.error.message}</div>}
        {roiQuery.isLoading && !roiQuery.error && <div className="table-card__empty">جاري تحميل التقرير...</div>}
        {!roiQuery.isLoading && !roiQuery.error && (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>الفعالية</th>
                  <th>التاريخ</th>
                  <th>الحضور</th>
                  <th>التكلفة الفعلية</th>
                  <th>الأثر الإيرادي</th>
                  <th>ROI</th>
                  <th>ROI %</th>
                </tr>
              </thead>
              <tbody>
                {(roiQuery.data || []).length === 0 && (
                  <tr>
                    <td colSpan={7}>لا توجد بيانات.</td>
                  </tr>
                )}
                {(roiQuery.data || []).map(row => (
                  <tr key={row.event_id}>
                    <td>{row.title}</td>
                    <td>{row.starts_at ? new Date(row.starts_at).toLocaleString('ar-JO') : '-'}</td>
                    <td>{row.attendees_count}</td>
                    <td>{row.actual_cost}</td>
                    <td>{row.revenue_impact}</td>
                    <td>{row.roi_value}</td>
                    <td>{row.roi_percent ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="page-card">
        <h2 style={{ marginTop: 0 }}>تفاعل KOL</h2>
        {kolQuery.error && <div className="table-card__empty">تعذر تحميل التقرير: {kolQuery.error.message}</div>}
        {kolQuery.isLoading && !kolQuery.error && <div className="table-card__empty">جاري تحميل التقرير...</div>}
        {!kolQuery.isLoading && !kolQuery.error && (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>KOL</th>
                  <th>عدد الفعاليات</th>
                  <th>عدد الحضور</th>
                  <th>متوسط التقييم</th>
                </tr>
              </thead>
              <tbody>
                {(kolQuery.data || []).length === 0 && (
                  <tr>
                    <td colSpan={4}>لا توجد بيانات.</td>
                  </tr>
                )}
                {(kolQuery.data || []).map(row => (
                  <tr key={row.kol_id}>
                    <td>{row.kol_name}</td>
                    <td>{row.events_count}</td>
                    <td>{row.attended_count}</td>
                    <td>{row.avg_feedback_score ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default MedicalAffairsReportsPage;
