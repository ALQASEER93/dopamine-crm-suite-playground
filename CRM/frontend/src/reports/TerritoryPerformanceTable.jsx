import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/client';

const TerritoryPerformanceTable = ({ from, to, territoryId, accountType }) => {
  const { token } = useAuth();
  const [exportMessage, setExportMessage] = useState(null);

  const territoryQuery = useQuery({
    queryKey: ['reports', 'territory-performance', { from, to, territoryId, accountType }],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      if (territoryId) params.set('territory_id', territoryId);
      if (accountType) params.set('account_type', accountType);
      const { data } = await apiClient.get(`/reports/territory-performance?${params.toString()}`);
      return Array.isArray(data) ? data : data?.data || [];
    },
    enabled: !!token && !!from && !!to,
    keepPreviousData: true,
  });

  const rows = territoryQuery.data || [];

  const handleExport = async () => {
    if (!token) return;
    setExportMessage(null);
    try {
      const params = new URLSearchParams({ from, to });
      if (territoryId) params.set('territory_id', territoryId);
      if (accountType) params.set('account_type', accountType);
      const { data: blob, response } = await apiClient.get(
        `/reports/territory-performance/export?${params.toString()}`,
        { responseType: 'blob' },
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename =
        response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/\"/g, '') ||
        `territory-performance-${from || ''}-${to || ''}.csv`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setExportMessage({ type: 'success', text: 'تم بدء التصدير. سيبدأ التحميل قريباً.' });
    } catch (err) {
      setExportMessage({ type: 'error', text: err.message || 'تعذر تصدير ملف CSV.' });
    }
  };

  return (
    <section className="page-card">
      <div
        className="table-card__header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          <h2>أداء المناطق</h2>
          <p>الزيارات والتغطية والقيمة التجارية لكل منطقة.</p>
        </div>
        {rows.length > 0 && (
          <button type="button" className="btn btn-secondary" onClick={handleExport}>
            تصدير CSV
          </button>
        )}
      </div>

      {exportMessage && (
        <div
          style={{
            marginBottom: '8px',
            padding: '8px 12px',
            borderRadius: '4px',
            backgroundColor: exportMessage.type === 'error' ? '#fde8e8' : '#def7ec',
            color: exportMessage.type === 'error' ? '#b83232' : '#046c4e',
            fontSize: '13px',
          }}
        >
          {exportMessage.text}
        </div>
      )}

      {territoryQuery.error && (
        <div className="table-card__empty">تعذر تحميل أداء المناطق: {territoryQuery.error.message}</div>
      )}
      {territoryQuery.isLoading && !territoryQuery.error && (
        <div className="table-card__empty">جارٍ تحميل أداء المناطق...</div>
      )}

      {!territoryQuery.isLoading && !territoryQuery.error && rows.length === 0 && (
        <div className="table-card__empty">لا توجد بيانات للفترة المختارة.</div>
      )}

      {!territoryQuery.isLoading && !territoryQuery.error && rows.length > 0 && (
        <div className="table-card__table-wrapper">
          <table>
            <thead>
              <tr>
                <th>المنطقة</th>
                <th>إجمالي الزيارات</th>
                <th>المكتملة</th>
                <th>حسابات فريدة</th>
                <th>إجمالي الطلبات (JOD)</th>
                <th>متوسط الطلب (JOD)</th>
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
