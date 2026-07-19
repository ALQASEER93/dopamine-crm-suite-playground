import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/client';

const RepPerformanceTable = ({ from, to }) => {
  const { user, token } = useAuth();
  const userRole = user?.role?.slug;
  const [exportMessage, setExportMessage] = useState(null);

  const repQuery = useQuery({
    queryKey: ['reports', 'rep-performance', { from, to }],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      const { data } = await apiClient.get(`/reports/rep-performance?${params.toString()}`);
      return Array.isArray(data) ? data : data?.data || [];
    },
    enabled: !!token && !!from && !!to,
    keepPreviousData: true,
  });

  const rows = repQuery.data || [];
  const canExport = useMemo(() => ['sales_manager', 'admin'].includes(userRole), [userRole]);

  const handleExport = async () => {
    if (!token || !canExport) return;
    setExportMessage(null);
    try {
      const params = new URLSearchParams({ from, to });
      const { data: blob, response } = await apiClient.get(
        `/reports/rep-performance/export?${params.toString()}`,
        {
          responseType: 'blob',
          headers: { Accept: 'text/csv' },
        },
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename =
        response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') ||
        `rep-performance-${from || ''}-${to || ''}.csv`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setExportMessage({ type: 'success', text: 'تم بدء التصدير. سيبدأ التنزيل قريبًا.' });
    } catch (err) {
      setExportMessage({ type: 'error', text: err.message || 'تعذر تصدير ملف CSV.' });
    }
  };

  return (
    <section className="page-card" data-testid="reports-rep-activity">
      <div
        className="table-card__header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          <h2>أداء المندوبين</h2>
          <p>الزيارات والجودة لكل مندوب.</p>
        </div>
        {canExport && rows.length > 0 ? (
          <button type="button" className="btn btn-secondary" onClick={handleExport} data-testid="reports-export-csv" aria-label="تصدير CSV حقيقي / Export genuine CSV">
            تصدير CSV
          </button>
        ) : (
          <span className="field-badge field-badge--warning" data-testid="reports-export-unavailable">
            التصدير غير متاح بدون صفوف أو صلاحية مناسبة
          </span>
        )}
      </div>

      {exportMessage && (
        <div
          style={{
            marginBottom: '8px',
            padding: '8px 12px',
            borderRadius: '4px',
            backgroundColor: exportMessage.type === 'error' ? 'var(--color-error-bg)' : 'var(--color-badge-bg)',
            color: exportMessage.type === 'error' ? 'var(--color-error-text)' : 'var(--color-text)',
            fontSize: '13px',
          }}
        >
          {exportMessage.text}
        </div>
      )}

      {repQuery.error && <div className="table-card__empty">تعذر تحميل أداء المندوبين: {repQuery.error.message}</div>}
      {repQuery.isLoading && !repQuery.error && <div className="table-card__empty">جاري تحميل أداء المندوبين...</div>}

      {!repQuery.isLoading && !repQuery.error && rows.length === 0 && (
        <div className="table-card__empty">لا توجد بيانات للفترة المختارة.</div>
      )}

      {!repQuery.isLoading && !repQuery.error && rows.length > 0 && (
        <div className="table-card__table-wrapper">
          <table>
            <thead>
              <tr>
                <th>المندوب</th>
                <th>الأقاليم</th>
                <th>إجمالي الزيارات</th>
                <th>المكتملة</th>
                <th>المجدولة</th>
                <th>الملغاة</th>
                <th>الحسابات الفريدة</th>
                <th>متوسط التقييم</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.repId}>
                  <td>
                    <div>{row.repName || '-'}</div>
                    <div className="text-muted">{row.repEmail || ''}</div>
                  </td>
                  <td>{Array.isArray(row.territoryNames) ? row.territoryNames.join(', ') : ''}</td>
                  <td>{row.totalVisits}</td>
                  <td>{row.completedVisits}</td>
                  <td>{row.scheduledVisits}</td>
                  <td>{row.cancelledVisits}</td>
                  <td>{row.uniqueAccounts}</td>
                  <td>{row.avgRating ?? 'غير متاح'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default RepPerformanceTable;
