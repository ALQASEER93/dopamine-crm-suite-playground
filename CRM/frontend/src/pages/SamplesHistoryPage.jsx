import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const getRoleSlug = user => {
  const rawRole = user?.role?.slug || user?.roleSlug || user?.role || '';
  if (typeof rawRole === 'string') return rawRole.toLowerCase();
  if (rawRole && typeof rawRole === 'object' && rawRole.slug) return String(rawRole.slug).toLowerCase();
  return '';
};

const SamplesHistoryPage = () => {
  const { token, user } = useAuth();
  const roleSlug = useMemo(() => getRoleSlug(user), [user]);
  const canFilterByRep = roleSlug === 'admin' || roleSlug === 'sales_manager';

  const [filters, setFilters] = useState({
    rep_id: '',
    sample_product_id: '',
    from_date: '',
    to_date: '',
  });

  const repsQuery = useQuery({
    queryKey: ['samples', 'history', 'reps'],
    queryFn: async () => {
      const { data } = await apiClient.get('/reps');
      return Array.isArray(data) ? data : [];
    },
    enabled: !!token && canFilterByRep,
  });

  const productsQuery = useQuery({
    queryKey: ['samples', 'history', 'products'],
    queryFn: async () => {
      const { data } = await apiClient.get('/samples/products');
      return Array.isArray(data) ? data : [];
    },
    enabled: !!token,
  });

  const historyQuery = useQuery({
    queryKey: ['samples', 'history', filters],
    queryFn: async () => {
      const params = new URLSearchParams({ page: '1', page_size: '200' });
      if (filters.rep_id) params.set('rep_id', filters.rep_id);
      if (filters.sample_product_id) params.set('sample_product_id', filters.sample_product_id);
      if (filters.from_date) params.set('from_date', filters.from_date);
      if (filters.to_date) params.set('to_date', filters.to_date);
      const { data } = await apiClient.get(`/samples/history?${params.toString()}`);
      return Array.isArray(data?.data) ? data.data : [];
    },
    enabled: !!token,
  });

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">سجل توزيع العينات</h1>
          <p className="page-subtitle">تتبع كل عمليات التوزيع حسب التاريخ والمنتج والمندوب.</p>
        </div>
      </div>

      <section className="page-card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {canFilterByRep && (
            <label>
              <span>المندوب</span>
              <select
                className="input"
                value={filters.rep_id}
                onChange={event => setFilters(prev => ({ ...prev, rep_id: event.target.value }))}
              >
                <option value="">الكل</option>
                {(repsQuery.data || []).map(rep => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span>المنتج العيني</span>
            <select
              className="input"
              value={filters.sample_product_id}
              onChange={event => setFilters(prev => ({ ...prev, sample_product_id: event.target.value }))}
            >
              <option value="">الكل</option>
              {(productsQuery.data || []).map(item => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
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
        </div>
      </section>

      <section className="page-card">
        {historyQuery.error && <div className="table-card__empty">تعذر تحميل السجل: {historyQuery.error.message}</div>}
        {historyQuery.isLoading && !historyQuery.error && <div className="table-card__empty">جاري تحميل السجل...</div>}
        {!historyQuery.isLoading && !historyQuery.error && (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>المندوب</th>
                  <th>المنتج</th>
                  <th>الكمية</th>
                  <th>القناة</th>
                  <th>العميل</th>
                  <th>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {(historyQuery.data || []).length === 0 && (
                  <tr>
                    <td colSpan={7}>لا توجد نتائج.</td>
                  </tr>
                )}
                {(historyQuery.data || []).map(row => (
                  <tr key={row.id}>
                    <td>{row.distributed_at ? new Date(row.distributed_at).toLocaleString('ar-JO') : '-'}</td>
                    <td>{row.rep?.name || row.rep_id}</td>
                    <td>{row.sample_product?.name || row.sample_product_id}</td>
                    <td>{row.quantity}</td>
                    <td>{row.channel}</td>
                    <td>{row.doctor?.name || row.pharmacy?.name || '-'}</td>
                    <td>{row.notes || '-'}</td>
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

export default SamplesHistoryPage;
