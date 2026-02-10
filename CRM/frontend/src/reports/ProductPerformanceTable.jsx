import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/client';

const ProductPerformanceTable = ({ from, to }) => {
  const { token } = useAuth();

  const productQuery = useQuery({
    queryKey: ['reports', 'product-performance', { from, to }],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      const { data } = await apiClient.get(`/reports/product-performance?${params.toString()}`);
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data)) return data;
      return [];
    },
    enabled: !!token && !!from && !!to,
    keepPreviousData: true,
  });

  const rows = productQuery.data || [];

  return (
    <section className="page-card">
      <h2>أداء المنتجات</h2>
      <p>بناءً على المنتجات المسجلة ضمن الزيارات.</p>

      {productQuery.error && (
        <div className="table-card__empty">
          تعذر تحميل أداء المنتجات: {productQuery.error.message}
        </div>
      )}
      {productQuery.isLoading && !productQuery.error && (
        <div className="table-card__empty">جاري تحميل أداء المنتجات...</div>
      )}

      {!productQuery.isLoading && !productQuery.error && rows.length === 0 && (
        <div className="table-card__empty">لا توجد بيانات للمنتجات في الفترة المختارة.</div>
      )}

      {!productQuery.isLoading && !productQuery.error && rows.length > 0 && (
        <div className="table-card__table-wrapper">
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>عدد الزيارات</th>
                <th>إجمالي الكمية</th>
                <th>متوسط الكمية / زيارة</th>
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
