import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/client';

const ProductPerformanceTable = ({ from, to, accountType }) => {
  const { token } = useAuth();
  const [exportMessage, setExportMessage] = useState(null);

  const productQuery = useQuery({
    queryKey: ['reports', 'product-performance', { from, to, accountType }],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      if (accountType) params.set('account_type', accountType);
      const { data } = await apiClient.get(`/reports/product-performance?${params.toString()}`);
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data)) return data;
      return [];
    },
    enabled: !!token && !!from && !!to,
    keepPreviousData: true,
  });

  const rows = productQuery.data || [];

  const handleExport = async () => {
    if (!token) return;
    setExportMessage(null);
    try {
      const params = new URLSearchParams({ from, to });
      if (accountType) params.set('account_type', accountType);
      const { data: blob, response } = await apiClient.get(
        `/reports/product-performance/export?${params.toString()}`,
        { responseType: 'blob' },
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename =
        response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/\"/g, '') ||
        `product-performance-${from || ''}-${to || ''}.csv`;
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
          <h2>أداء المنتجات</h2>
          <p>بناءً على المنتجات المسجلة في الطلبات.</p>
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

      {productQuery.error && (
        <div className="table-card__empty">
          تعذر تحميل أداء المنتجات: {productQuery.error.message}
        </div>
      )}
      {productQuery.isLoading && !productQuery.error && (
        <div className="table-card__empty">جارٍ تحميل أداء المنتجات...</div>
      )}

      {!productQuery.isLoading && !productQuery.error && rows.length === 0 && (
        <div className="table-card__empty">لا توجد بيانات للفترة المختارة.</div>
      )}

      {!productQuery.isLoading && !productQuery.error && rows.length > 0 && (
        <div className="table-card__table-wrapper">
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>عدد الزيارات</th>
                <th>إجمالي الكمية</th>
                <th>متوسط الكمية/زيارة</th>
                <th>إجمالي الطلبات (JOD)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.productName}>
                  <td>{row.productName}</td>
                  <td>{row.visitsCount}</td>
                  <td>{row.totalQuantity}</td>
                  <td>{row.avgQuantityPerVisit}</td>
                  <td>{row.totalOrderValueJOD}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default ProductPerformanceTable;
