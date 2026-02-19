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

const SamplesInventoryPage = () => {
  const { user, token } = useAuth();
  const roleSlug = useMemo(() => getRoleSlug(user), [user]);
  const canAdjust = roleSlug === 'admin' || roleSlug === 'sales_manager';

  const [selectedRepId, setSelectedRepId] = useState('');
  const [form, setForm] = useState({
    sample_product_id: '',
    location_type: 'warehouse',
    rep_id: '',
    delta: 0,
    reorder_level: '',
  });
  const [notice, setNotice] = useState(null);

  const repsQuery = useQuery({
    queryKey: ['samples', 'reps'],
    queryFn: async () => {
      const { data } = await apiClient.get('/reps');
      return Array.isArray(data) ? data : [];
    },
    enabled: !!token && canAdjust,
  });

  const productsQuery = useQuery({
    queryKey: ['samples', 'products'],
    queryFn: async () => {
      const { data } = await apiClient.get('/samples/products');
      return Array.isArray(data) ? data : [];
    },
    enabled: !!token,
  });

  const inventoryQuery = useQuery({
    queryKey: ['samples', 'inventory', { selectedRepId, roleSlug }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRepId) params.set('rep_id', selectedRepId);
      const path = params.toString() ? `/samples/inventory?${params.toString()}` : '/samples/inventory';
      const { data } = await apiClient.get(path);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!token,
  });

  const handleAdjust = async event => {
    event.preventDefault();
    setNotice(null);
    try {
      const payload = {
        sample_product_id: Number(form.sample_product_id),
        location_type: form.location_type,
        rep_id: form.location_type === 'rep' ? Number(form.rep_id) : null,
        delta: Number(form.delta),
      };
      if (form.reorder_level !== '') payload.reorder_level = Number(form.reorder_level);

      await apiClient.post('/samples/inventory/adjust', { body: payload });
      setNotice({ type: 'success', text: 'تم تعديل المخزون بنجاح.' });
      setForm(prev => ({ ...prev, delta: 0 }));
      await inventoryQuery.refetch();
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'تعذر تعديل المخزون.' });
    }
  };

  const inventoryRows = inventoryQuery.data || [];

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">مخزون العينات</h1>
          <p className="page-subtitle">متابعة رصيد العينات بالمستودع والمندوبين.</p>
        </div>
      </div>

      {canAdjust && (
        <section className="page-card">
          <h2 style={{ marginTop: 0 }}>تعديل المخزون</h2>
          <form
            onSubmit={handleAdjust}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}
          >
            <label>
              <span>المنتج العيني</span>
              <select
                className="input"
                value={form.sample_product_id}
                onChange={event => setForm(prev => ({ ...prev, sample_product_id: event.target.value }))}
                required
              >
                <option value="">اختر المنتج</option>
                {(productsQuery.data || []).map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>نوع الموقع</span>
              <select
                className="input"
                value={form.location_type}
                onChange={event => setForm(prev => ({ ...prev, location_type: event.target.value }))}
              >
                <option value="warehouse">المستودع</option>
                <option value="rep">مندوب</option>
              </select>
            </label>

            {form.location_type === 'rep' && (
              <label>
                <span>المندوب</span>
                <select
                  className="input"
                  value={form.rep_id}
                  onChange={event => setForm(prev => ({ ...prev, rep_id: event.target.value }))}
                  required
                >
                  <option value="">اختر المندوب</option>
                  {(repsQuery.data || []).map(rep => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              <span>التغير (+/-)</span>
              <input
                className="input"
                type="number"
                value={form.delta}
                onChange={event => setForm(prev => ({ ...prev, delta: event.target.value }))}
                required
              />
            </label>

            <label>
              <span>حد إعادة الطلب</span>
              <input
                className="input"
                type="number"
                min="0"
                value={form.reorder_level}
                onChange={event => setForm(prev => ({ ...prev, reorder_level: event.target.value }))}
              />
            </label>

            <div style={{ alignSelf: 'end' }}>
              <button type="submit" className="btn btn-primary">
                حفظ
              </button>
            </div>
          </form>
          {notice && (
            <p style={{ marginBottom: 0, color: notice.type === 'error' ? 'var(--color-error-text)' : 'var(--color-text)' }}>
              {notice.text}
            </p>
          )}
        </section>
      )}

      <section className="page-card">
        <div className="page-header" style={{ marginBottom: '12px' }}>
          <h2 style={{ margin: 0 }}>الرصيد الحالي</h2>
          {canAdjust && (
            <label style={{ minWidth: '220px' }}>
              <span>تصفية حسب المندوب</span>
              <select className="input" value={selectedRepId} onChange={event => setSelectedRepId(event.target.value)}>
                <option value="">الكل</option>
                {(repsQuery.data || []).map(rep => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {inventoryQuery.error && <div className="table-card__empty">تعذر تحميل المخزون: {inventoryQuery.error.message}</div>}
        {inventoryQuery.isLoading && !inventoryQuery.error && <div className="table-card__empty">جاري تحميل البيانات...</div>}

        {!inventoryQuery.isLoading && !inventoryQuery.error && (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>الموقع</th>
                  <th>المندوب</th>
                  <th>الكمية</th>
                  <th>حد إعادة الطلب</th>
                  <th>آخر تحديث</th>
                </tr>
              </thead>
              <tbody>
                {inventoryRows.length === 0 && (
                  <tr>
                    <td colSpan={6}>لا توجد بيانات.</td>
                  </tr>
                )}
                {inventoryRows.map(row => (
                  <tr key={row.id}>
                    <td>{row.sample_product?.name || row.sample_product_id}</td>
                    <td>{row.location_type === 'warehouse' ? 'مستودع' : 'مندوب'}</td>
                    <td>{row.rep?.name || '-'}</td>
                    <td>{row.quantity_on_hand}</td>
                    <td>{row.reorder_level}</td>
                    <td>{row.updated_at ? new Date(row.updated_at).toLocaleString('ar-JO') : '-'}</td>
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

export default SamplesInventoryPage;
