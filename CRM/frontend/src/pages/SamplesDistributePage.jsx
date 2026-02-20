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

const SamplesDistributePage = () => {
  const { token, user } = useAuth();
  const roleSlug = useMemo(() => getRoleSlug(user), [user]);
  const canApproveRequests = roleSlug === 'admin' || roleSlug === 'sales_manager';

  const [distributionForm, setDistributionForm] = useState({
    sample_product_id: '',
    customer_type: 'doctor',
    customer_id: '',
    quantity: 1,
    rep_id: '',
    notes: '',
  });
  const [requestForm, setRequestForm] = useState({
    sample_product_id: '',
    quantity_requested: 1,
    notes: '',
  });
  const [notice, setNotice] = useState(null);

  const repsQuery = useQuery({
    queryKey: ['samples', 'reps', 'distribute'],
    queryFn: async () => {
      const { data } = await apiClient.get('/reps');
      return Array.isArray(data) ? data : [];
    },
    enabled: !!token && canApproveRequests,
  });

  const productsQuery = useQuery({
    queryKey: ['samples', 'products', 'distribute'],
    queryFn: async () => {
      const { data } = await apiClient.get('/samples/products');
      return Array.isArray(data) ? data : [];
    },
    enabled: !!token,
  });

  const doctorsQuery = useQuery({
    queryKey: ['samples', 'doctors'],
    queryFn: async () => {
      const { data } = await apiClient.get('/doctors?page_size=200');
      return Array.isArray(data?.data) ? data.data : [];
    },
    enabled: !!token,
  });

  const pharmaciesQuery = useQuery({
    queryKey: ['samples', 'pharmacies'],
    queryFn: async () => {
      const { data } = await apiClient.get('/pharmacies?page_size=200');
      return Array.isArray(data?.data) ? data.data : [];
    },
    enabled: !!token,
  });

  const requestsQuery = useQuery({
    queryKey: ['samples', 'requests', 'pending'],
    queryFn: async () => {
      const { data } = await apiClient.get('/samples/request?page_size=50&status=pending');
      return Array.isArray(data?.data) ? data.data : [];
    },
    enabled: !!token,
  });

  const handleDistribute = async event => {
    event.preventDefault();
    setNotice(null);
    try {
      const payload = {
        sample_product_id: Number(distributionForm.sample_product_id),
        quantity: Number(distributionForm.quantity),
        notes: distributionForm.notes || null,
      };
      if (distributionForm.customer_type === 'doctor') {
        payload.doctor_id = Number(distributionForm.customer_id);
      } else {
        payload.pharmacy_id = Number(distributionForm.customer_id);
      }
      if (canApproveRequests && distributionForm.rep_id) {
        payload.rep_id = Number(distributionForm.rep_id);
      }

      await apiClient.post('/samples/distribute', { body: payload });
      setNotice({ type: 'success', text: 'تم تسجيل التوزيع بنجاح.' });
      setDistributionForm(prev => ({ ...prev, customer_id: '', quantity: 1, notes: '' }));
      await requestsQuery.refetch();
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'تعذر تسجيل التوزيع.' });
    }
  };

  const handleRequest = async event => {
    event.preventDefault();
    setNotice(null);
    try {
      await apiClient.post('/samples/request', {
        body: {
          sample_product_id: Number(requestForm.sample_product_id),
          quantity_requested: Number(requestForm.quantity_requested),
          notes: requestForm.notes || null,
        },
      });
      setNotice({ type: 'success', text: 'تم إرسال طلب العينات.' });
      setRequestForm(prev => ({ ...prev, quantity_requested: 1, notes: '' }));
      await requestsQuery.refetch();
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'تعذر إرسال الطلب.' });
    }
  };

  const handleRequestStatus = async (requestId, newStatus) => {
    try {
      await apiClient.patch(`/samples/request/${requestId}/status`, {
        body: {
          status: newStatus,
          decision_notes: 'تم التحديث من شاشة إدارة العينات',
        },
      });
      setNotice({ type: 'success', text: 'تم تحديث حالة الطلب.' });
      await requestsQuery.refetch();
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'تعذر تحديث حالة الطلب.' });
    }
  };

  const customerOptions = distributionForm.customer_type === 'doctor' ? doctorsQuery.data || [] : pharmaciesQuery.data || [];

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">توزيع العينات</h1>
          <p className="page-subtitle">توزيع مباشر على الطبيب/الصيدلية مع إدارة طلبات العينات.</p>
        </div>
      </div>

      <section className="page-card">
        <h2 style={{ marginTop: 0 }}>توزيع جديد</h2>
        <form
          onSubmit={handleDistribute}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}
        >
          <label>
            <span>المنتج العيني</span>
            <select
              className="input"
              value={distributionForm.sample_product_id}
              onChange={event => setDistributionForm(prev => ({ ...prev, sample_product_id: event.target.value }))}
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
            <span>نوع العميل</span>
            <select
              className="input"
              value={distributionForm.customer_type}
              onChange={event =>
                setDistributionForm(prev => ({ ...prev, customer_type: event.target.value, customer_id: '' }))
              }
            >
              <option value="doctor">طبيب</option>
              <option value="pharmacy">صيدلية</option>
            </select>
          </label>

          <label>
            <span>{distributionForm.customer_type === 'doctor' ? 'الطبيب' : 'الصيدلية'}</span>
            <select
              className="input"
              value={distributionForm.customer_id}
              onChange={event => setDistributionForm(prev => ({ ...prev, customer_id: event.target.value }))}
              required
            >
              <option value="">اختر</option>
              {customerOptions.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          {canApproveRequests && (
            <label>
              <span>المندوب</span>
              <select
                className="input"
                value={distributionForm.rep_id}
                onChange={event => setDistributionForm(prev => ({ ...prev, rep_id: event.target.value }))}
              >
                <option value="">المستخدم الحالي</option>
                {(repsQuery.data || []).map(rep => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            <span>الكمية</span>
            <input
              type="number"
              min="1"
              className="input"
              value={distributionForm.quantity}
              onChange={event => setDistributionForm(prev => ({ ...prev, quantity: event.target.value }))}
              required
            />
          </label>

          <label style={{ gridColumn: '1 / -1' }}>
            <span>ملاحظات</span>
            <input
              className="input"
              value={distributionForm.notes}
              onChange={event => setDistributionForm(prev => ({ ...prev, notes: event.target.value }))}
            />
          </label>

          <div>
            <button type="submit" className="btn btn-primary">
              تسجيل التوزيع
            </button>
          </div>
        </form>
      </section>

      <section className="page-card">
        <h2 style={{ marginTop: 0 }}>طلب عينات</h2>
        <form
          onSubmit={handleRequest}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}
        >
          <label>
            <span>المنتج العيني</span>
            <select
              className="input"
              value={requestForm.sample_product_id}
              onChange={event => setRequestForm(prev => ({ ...prev, sample_product_id: event.target.value }))}
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
            <span>الكمية المطلوبة</span>
            <input
              className="input"
              type="number"
              min="1"
              value={requestForm.quantity_requested}
              onChange={event => setRequestForm(prev => ({ ...prev, quantity_requested: event.target.value }))}
              required
            />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            <span>ملاحظات</span>
            <input
              className="input"
              value={requestForm.notes}
              onChange={event => setRequestForm(prev => ({ ...prev, notes: event.target.value }))}
            />
          </label>
          <div>
            <button type="submit" className="btn btn-secondary">
              إرسال الطلب
            </button>
          </div>
        </form>
      </section>

      {notice && (
        <section className="page-card">
          <p style={{ margin: 0, color: notice.type === 'error' ? 'var(--color-error-text)' : 'var(--color-text)' }}>{notice.text}</p>
        </section>
      )}

      <section className="page-card">
        <h2 style={{ marginTop: 0 }}>الطلبات المعلقة</h2>
        {requestsQuery.error && <div className="table-card__empty">تعذر تحميل الطلبات: {requestsQuery.error.message}</div>}
        {requestsQuery.isLoading && !requestsQuery.error && <div className="table-card__empty">جاري تحميل الطلبات...</div>}
        {!requestsQuery.isLoading && !requestsQuery.error && (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>المندوب</th>
                  <th>المنتج</th>
                  <th>الكمية</th>
                  <th>الحالة</th>
                  <th>تاريخ الطلب</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {(requestsQuery.data || []).length === 0 && (
                  <tr>
                    <td colSpan={6}>لا توجد طلبات معلقة.</td>
                  </tr>
                )}
                {(requestsQuery.data || []).map(request => (
                  <tr key={request.id}>
                    <td>{request.rep?.name || request.rep_id}</td>
                    <td>{request.sample_product?.name || request.sample_product_id}</td>
                    <td>{request.quantity_requested}</td>
                    <td>{request.status}</td>
                    <td>{request.requested_at ? new Date(request.requested_at).toLocaleString('ar-JO') : '-'}</td>
                    <td>
                      {!canApproveRequests && '-'}
                      {canApproveRequests && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button type="button" className="btn btn-secondary" onClick={() => handleRequestStatus(request.id, 'approved')}>
                            اعتماد
                          </button>
                          <button type="button" className="btn btn-secondary" onClick={() => handleRequestStatus(request.id, 'fulfilled')}>
                            تنفيذ
                          </button>
                          <button type="button" className="btn btn-secondary" onClick={() => handleRequestStatus(request.id, 'rejected')}>
                            رفض
                          </button>
                        </div>
                      )}
                    </td>
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

export default SamplesDistributePage;
