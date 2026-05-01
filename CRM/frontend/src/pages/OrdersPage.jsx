import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DetailDrawer from '../components/DetailDrawer';
import { useAuth } from '../auth/AuthContext';
import { listOrders, orderKeys, createOrder } from '../api/orders';
import { listProducts, productKeys } from '../api/products';
import { listReps, repKeys } from '../api/reps';
import { listDoctors, doctorKeys } from '../api/endpoints/doctors';
import { listPharmacies, pharmacyKeys } from '../api/endpoints/pharmacies';
import './EntityListPage.css';

const PAGE_SIZE = 25;
const ORDER_STATUSES = ['draft', 'confirmed', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'partial', 'overdue'];

const today = () => new Date().toISOString().slice(0, 10);

const DEFAULT_ORDER = {
  order_date: today(),
  rep_id: '',
  status: 'draft',
  payment_status: 'pending',
  doctor_id: '',
  pharmacy_id: '',
  aljazeera_ref: '',
  lines: [{ product_id: '', quantity: 1, price: '', discount: 0, bonus: '' }],
};

const numberOrNull = value => (value === '' || value == null ? null : Number(value));

const OrderForm = ({ initialValues, products, reps, doctors, pharmacies, onSubmit, onCancel, submitting, error }) => {
  const [form, setForm] = useState(initialValues);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const updateLine = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      lines: prev.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, [field]: value } : line)),
    }));
  };

  const addLine = () => {
    setForm(prev => ({
      ...prev,
      lines: [...prev.lines, { product_id: '', quantity: 1, price: '', discount: 0, bonus: '' }],
    }));
  };

  const removeLine = index => {
    setForm(prev => ({
      ...prev,
      lines: prev.lines.filter((_, lineIndex) => lineIndex !== index),
    }));
  };

  const handleAccountTypeChange = value => {
    setForm(prev => ({
      ...prev,
      doctor_id: value === 'doctor' ? prev.doctor_id : '',
      pharmacy_id: value === 'pharmacy' ? prev.pharmacy_id : '',
    }));
  };

  const accountType = form.doctor_id ? 'doctor' : form.pharmacy_id ? 'pharmacy' : 'doctor';

  const handleSubmit = event => {
    event.preventDefault();
    onSubmit({
      order_date: form.order_date,
      rep_id: numberOrNull(form.rep_id),
      status: form.status,
      payment_status: form.payment_status,
      doctor_id: accountType === 'doctor' ? numberOrNull(form.doctor_id) : null,
      pharmacy_id: accountType === 'pharmacy' ? numberOrNull(form.pharmacy_id) : null,
      aljazeera_ref: form.aljazeera_ref || null,
      lines: form.lines
        .filter(line => line.product_id && line.price !== '')
        .map(line => ({
          product_id: Number(line.product_id),
          quantity: Number(line.quantity),
          price: Number(line.price),
          discount: Number(line.discount || 0),
          bonus: line.bonus === '' ? null : Number(line.bonus),
        })),
    });
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="form__label">
        تاريخ الطلب
        <input type="date" value={form.order_date} onChange={event => updateField('order_date', event.target.value)} required />
      </label>
      <label className="form__label">
        المندوب
        <select value={form.rep_id} onChange={event => updateField('rep_id', event.target.value)}>
          <option value="">بدون ربط</option>
          {reps.map(rep => (
            <option key={rep.id} value={rep.id}>
              {rep.name}
            </option>
          ))}
        </select>
      </label>
      <label className="form__label">
        حالة الطلب
        <select value={form.status} onChange={event => updateField('status', event.target.value)}>
          {ORDER_STATUSES.map(status => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className="form__label">
        حالة الدفع
        <select value={form.payment_status} onChange={event => updateField('payment_status', event.target.value)}>
          {PAYMENT_STATUSES.map(status => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className="form__label">
        نوع الحساب
        <select value={accountType} onChange={event => handleAccountTypeChange(event.target.value)}>
          <option value="doctor">طبيب</option>
          <option value="pharmacy">صيدلية</option>
        </select>
      </label>
      {accountType === 'doctor' ? (
        <label className="form__label">
          الطبيب
          <select value={form.doctor_id} onChange={event => updateField('doctor_id', event.target.value)} required>
            <option value="">اختر الطبيب</option>
            {doctors.map(doctor => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="form__label">
          الصيدلية
          <select value={form.pharmacy_id} onChange={event => updateField('pharmacy_id', event.target.value)} required>
            <option value="">اختر الصيدلية</option>
            {pharmacies.map(pharmacy => (
              <option key={pharmacy.id} value={pharmacy.id}>
                {pharmacy.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="form__label">
        مرجع الجزيرة
        <input type="text" value={form.aljazeera_ref} onChange={event => updateField('aljazeera_ref', event.target.value)} />
      </label>
      <div style={{ display: 'grid', gap: '12px' }}>
        <strong>بنود الطلب</strong>
        {form.lines.map((line, index) => (
          <div key={index} style={{ display: 'grid', gap: '8px', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
            <label className="form__label">
              المنتج
              <select value={line.product_id} onChange={event => updateLine(index, 'product_id', event.target.value)} required>
                <option value="">اختر المنتج</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form__label">
              الكمية
              <input type="number" min="1" value={line.quantity} onChange={event => updateLine(index, 'quantity', event.target.value)} required />
            </label>
            <label className="form__label">
              السعر
              <input type="number" min="0" step="0.01" value={line.price} onChange={event => updateLine(index, 'price', event.target.value)} required />
            </label>
            <label className="form__label">
              الخصم
              <input type="number" min="0" step="0.01" value={line.discount} onChange={event => updateLine(index, 'discount', event.target.value)} />
            </label>
            <label className="form__label">
              البونص
              <input type="number" min="0" value={line.bonus} onChange={event => updateLine(index, 'bonus', event.target.value)} />
            </label>
            {form.lines.length > 1 && (
              <button type="button" className="btn btn-secondary" onClick={() => removeLine(index)}>
                حذف البند
              </button>
            )}
          </div>
        ))}
        <button type="button" className="btn btn-secondary" onClick={addLine}>
          إضافة بند
        </button>
      </div>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'جارٍ الحفظ...' : 'حفظ الطلب'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          إلغاء
        </button>
      </div>
    </form>
  );
};

const formatMoney = value => {
  if (value == null || value === '') return '-';
  const amount = Number(value);
  return Number.isFinite(amount) ? `${amount.toFixed(2)}` : String(value);
};

const accountName = order => order.doctor?.name || order.pharmacy?.name || '-';

const OrdersPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status_filter: '', payment_status: '', date_from: '', date_to: '' });
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState(null);

  const ordersQuery = useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => listOrders({ ...filters, page: 1, page_size: PAGE_SIZE }),
    enabled: !!token,
  });
  const productsQuery = useQuery({ queryKey: productKeys.list({ page_size: 200 }), queryFn: () => listProducts({ page_size: 200 }), enabled: !!token });
  const repsQuery = useQuery({ queryKey: repKeys.list({}), queryFn: () => listReps(), enabled: !!token });
  const doctorsQuery = useQuery({ queryKey: doctorKeys.list({ page_size: 200 }), queryFn: () => listDoctors({ page_size: 200 }), enabled: !!token });
  const pharmaciesQuery = useQuery({ queryKey: pharmacyKeys.list({ page_size: 200 }), queryFn: () => listPharmacies({ page_size: 200 }), enabled: !!token });

  const createMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      setFormOpen(false);
      setFormError(null);
    },
    onError: error => setFormError(error.message || 'تعذر إنشاء الطلب'),
  });

  const orders = ordersQuery.data?.data || [];
  const totals = useMemo(() => {
    return orders.reduce(
      (summary, order) => {
        summary.amount += Number(order.total_amount || 0);
        summary.count += 1;
        if (order.payment_status === 'pending' || order.payment_status === 'overdue') summary.pending += 1;
        return summary;
      },
      { amount: 0, count: 0, pending: 0 },
    );
  }, [orders]);

  return (
    <div className="entity-page">
      <div className="entity-toolbar">
        <div>
          <h1 className="page-heading">الطلبات</h1>
          <p className="page-subtitle">لوحة تشغيل للطلبات المفتوحة، حالات الدفع، وإنشاء الطلبات الجديدة.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>
          طلب جديد
        </button>
      </div>

      <section className="table-card" style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div><strong>{totals.count}</strong><div className="page-subtitle">إجمالي الطلبات المعروضة</div></div>
        <div><strong>{formatMoney(totals.amount)}</strong><div className="page-subtitle">إجمالي القيمة</div></div>
        <div><strong>{totals.pending}</strong><div className="page-subtitle">طلبات تحتاج متابعة دفع</div></div>
      </section>

      <div className="entity-filters">
        <select className="input" value={filters.status_filter} onChange={event => setFilters(prev => ({ ...prev, status_filter: event.target.value }))}>
          <option value="">كل حالات الطلب</option>
          {ORDER_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
        </select>
        <select className="input" value={filters.payment_status} onChange={event => setFilters(prev => ({ ...prev, payment_status: event.target.value }))}>
          <option value="">كل حالات الدفع</option>
          {PAYMENT_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
        </select>
        <input className="input" type="date" value={filters.date_from} onChange={event => setFilters(prev => ({ ...prev, date_from: event.target.value }))} />
        <input className="input" type="date" value={filters.date_to} onChange={event => setFilters(prev => ({ ...prev, date_to: event.target.value }))} />
        <button type="button" className="btn btn-secondary" onClick={() => setFilters({ status_filter: '', payment_status: '', date_from: '', date_to: '' })}>مسح الفلاتر</button>
      </div>

      <section className="table-card entity-table">
        {ordersQuery.isLoading ? <div className="entity-empty">جاري تحميل الطلبات...</div> : null}
        {ordersQuery.error ? <div className="entity-empty">تعذر تحميل الطلبات: {ordersQuery.error.message}</div> : null}
        {!ordersQuery.isLoading && !ordersQuery.error && orders.length === 0 ? <div className="entity-empty">لا توجد طلبات للفلاتر الحالية.</div> : null}
        {!ordersQuery.isLoading && !ordersQuery.error && orders.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الحساب</th>
                <th>المندوب</th>
                <th>الحالة</th>
                <th>الدفع</th>
                <th>القيمة</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} onClick={() => setSelected(order)}>
                  <td>{order.order_date}</td>
                  <td>{accountName(order)}</td>
                  <td>{order.rep?.name || '-'}</td>
                  <td>{order.status}</td>
                  <td>{order.payment_status}</td>
                  <td>{formatMoney(order.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <DetailDrawer title={selected ? `الطلب #${selected.id}` : ''} isOpen={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="detail-grid">
            <p><strong>الحساب:</strong> {accountName(selected)}</p>
            <p><strong>المندوب:</strong> {selected.rep?.name || '-'}</p>
            <p><strong>حالة الطلب:</strong> {selected.status}</p>
            <p><strong>حالة الدفع:</strong> {selected.payment_status}</p>
            <p><strong>مرجع الجزيرة:</strong> {selected.aljazeera_ref || '-'}</p>
            <p><strong>القيمة:</strong> {formatMoney(selected.total_amount)}</p>
            <div>
              <strong>البنود:</strong>
              <ul>
                {(selected.lines || []).map(line => (
                  <li key={line.id || `${line.product_id}-${line.product?.id || ''}`}>
                    {line.product?.name || `منتج ${line.product_id}`} - {line.quantity} × {formatMoney(line.price)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </DetailDrawer>

      <DetailDrawer title="طلب جديد" isOpen={formOpen} onClose={() => setFormOpen(false)}>
        <OrderForm
          initialValues={DEFAULT_ORDER}
          products={productsQuery.data?.data || []}
          reps={repsQuery.data || []}
          doctors={doctorsQuery.data?.data || []}
          pharmacies={pharmaciesQuery.data?.data || []}
          onSubmit={payload => createMutation.mutate(payload)}
          onCancel={() => setFormOpen(false)}
          submitting={createMutation.isPending}
          error={formError}
        />
      </DetailDrawer>
    </div>
  );
};

export default OrdersPage;
