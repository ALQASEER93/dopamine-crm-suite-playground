import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const MedicalAffairsReportsPage = () => {
  const { token } = useAuth();

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
          <p className="page-subtitle">تفاعل KOL وحضور الفعاليات العلمية.</p>
        </div>
      </div>

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
