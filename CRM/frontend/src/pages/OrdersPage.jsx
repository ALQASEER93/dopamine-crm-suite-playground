import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import DataTable from '../components/DataTable';
import DetailDrawer from '../components/DetailDrawer';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/ToastProvider';
import { listDoctors } from '../api/endpoints/doctors';
import { listPharmacies } from '../api/endpoints/pharmacies';
import { listProducts } from '../api/endpoints/products';
import {
  createOrder,
  deleteOrder,
  exportOrders,
  listOrders,
  orderKeys,
  updateOrder,
} from '../api/endpoints/orders';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const STATUS_OPTIONS = ['draft', 'confirmed', 'invoiced', 'cancelled'];
const PAYMENT_OPTIONS = ['pending', 'paid', 'overdue'];

const DEFAULT_FORM = {
  order_date: new Date().toISOString().slice(0, 10),
  status: 'draft',
  payment_status: 'pending',
  account_type: 'doctor',
  account_id: '',
  aljazeera_ref: '',
  lines: [],
};

const OrdersPage = () => {
  const { token, user } = useAuth();
  const roleSlug = user?.role?.slug;
  const canManage = roleSlug === 'admin' || roleSlug === 'sales_manager' || roleSlug === 'medical_rep';
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [searchStatus, setSearchStatus] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  const [selected, setSelected] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const queryParams = useMemo(
    () => ({
      page,
      page_size: pageSize,
      status: searchStatus,
      payment_status: paymentFilter,
      date_from: fromDate || undefined,
      date_to: toDate || undefined,
    }),
    [fromDate, page, pageSize, paymentFilter, searchStatus, toDate],
  );

  const ordersQuery = useQuery({
    queryKey: orderKeys.list(queryParams),
    queryFn: () => listOrders(queryParams),
    enabled: !!token,
    keepPreviousData: true,
    select: data => {
      const rows = Array.isArray(data?.data) ? data.data : [];
      const pagination = data?.pagination || data?.meta;
      const total = pagination?.total ?? rows.length;
      return { rows, total };
    },
  });

  const doctorsQuery = useQuery({
    queryKey: ['orders', 'doctors'],
    queryFn: () => listDoctors({ page: 1, page_size: 500 }),
    enabled: !!token,
    select: data => data?.data ?? [],
  });

  const pharmaciesQuery = useQuery({
    queryKey: ['orders', 'pharmacies'],
    queryFn: () => listPharmacies({ page: 1, page_size: 500 }),
    enabled: !!token,
    select: data => data?.data ?? [],
  });

  const productsQuery = useQuery({
    queryKey: ['orders', 'products'],
    queryFn: () => listProducts({ page: 1, page_size: 500, is_active: true }),
    enabled: !!token,
    select: data => data?.data ?? [],
  });

  const createMutation = useMutation({
    mutationFn: payload => createOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      closeForm();
      pushToast({ type: 'success', title: 'تم الحفظ', message: 'تم إنشاء الطلب.' });
    },
    onError: error => setFormError(error.message || 'تعذر إنشاء الطلب.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateOrder(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      closeForm();
      pushToast({ type: 'success', title: 'تم التحديث', message: 'تم تحديث الطلب.' });
    },
    onError: error => setFormError(error.message || 'تعذر تحديث الطلب.'),
  });

  const deleteMutation = useMutation({
    mutationFn: id => deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      setDeleteTarget(null);
      pushToast({ type: 'success', title: 'تم الحذف', message: 'تم حذف الطلب.' });
    },
    onError: error => {
      setDeleteTarget(null);
      pushToast({ type: 'error', title: 'خطأ', message: error.message || 'تعذر حذف الطلب.' });
    },
  });

  const closeForm = () => {
    setFormMode(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
  };

  const openCreate = () => {
    setFormMode('create');
    setForm(DEFAULT_FORM);
    setFormError(null);
  };

  const openEdit = order => {
    const accountType = order.doctor_id ? 'doctor' : 'pharmacy';
    const accountId = order.doctor_id || order.pharmacy_id || '';
    setFormMode('edit');
    setForm({
      order_date: order.order_date,
      status: order.status,
      payment_status: order.payment_status,
      account_type: accountType,
      account_id: accountId,
      aljazeera_ref: order.aljazeera_ref || '',
      lines: order.lines || [],
    });
    setFormError(null);
  };

  const handleLineChange = (index, field, value) => {
    setForm(prev => {
      const lines = [...prev.lines];
      lines[index] = { ...lines[index], [field]: value };
      return { ...prev, lines };
    });
  };

  const addLine = () => {
    setForm(prev => ({
      ...prev,
      lines: [...prev.lines, { product_id: '', quantity: 1, price: '', discount: 0, bonus: 0 }],
    }));
  };

  const removeLine = index => {
    setForm(prev => ({ ...prev, lines: prev.lines.filter((_, idx) => idx !== index) }));
  };

  const handleSubmit = event => {
    event.preventDefault();
    setFormError(null);
    if (!form.account_id) {
      setFormError('يرجى اختيار العميل.');
      return;
    }
    if (!form.lines.length) {
      setFormError('أضف بنداً واحداً على الأقل.');
      return;
    }

    const payload = {
      order_date: form.order_date,
      status: form.status,
      payment_status: form.payment_status,
      doctor_id: form.account_type === 'doctor' ? Number(form.account_id) : null,
      pharmacy_id: form.account_type === 'pharmacy' ? Number(form.account_id) : null,
      aljazeera_ref: form.aljazeera_ref || null,
      lines: form.lines.map(line => ({
        product_id: Number(line.product_id),
        quantity: Number(line.quantity),
        price: Number(line.price),
        discount: Number(line.discount || 0),
        bonus: line.bonus ? Number(line.bonus) : null,
      })),
    };

    if (formMode === 'edit' && selected) {
      updateMutation.mutate({ id: selected.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleExport = async () => {
    try {
      const { blob, response } = await exportOrders(queryParams);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename =
        response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/\"/g, '') ||
        `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      pushToast({ type: 'success', title: 'تم التصدير', message: 'تم تنزيل ملف الطلبات.' });
    } catch (error) {
      pushToast({ type: 'error', title: 'خطأ', message: error.message || 'تعذر تصدير الطلبات.' });
    }
  };

  const orders = ordersQuery.data?.rows || [];
  const total = ordersQuery.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const doctors = doctorsQuery.data || [];
  const pharmacies = pharmaciesQuery.data || [];
  const products = productsQuery.data || [];

  const columns = [
    { key: 'order_date', header: 'التاريخ' },
    {
      key: 'customer',
      header: 'العميل',
      render: row => row.doctor?.name || row.pharmacy?.name || '-',
    },
    { key: 'status', header: 'الحالة' },
    { key: 'payment_status', header: 'الدفع' },
    {
      key: 'total_amount',
      header: 'الإجمالي',
      render: row => Number(row.total_amount || 0).toFixed(2),
    },
    {
      key: 'lines',
      header: 'البنود',
      render: row => row.lines?.length || 0,
    },
    {
      key: 'actions',
      header: 'إجراءات',
      render: row => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setSelected(row)}>
            عرض
          </button>
          {canManage && (
            <button type="button" className="btn btn-secondary" onClick={() => openEdit(row)}>
              تعديل
            </button>
          )}
          {canManage && (
            <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(row)}>
              حذف
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">الطلبات</h1>
          <p className="page-subtitle">متابعة الطلبات والعملاء وحركة المبيعات.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={handleExport}>
            تصدير CSV
          </button>
          {canManage && (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              طلب جديد
            </button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={orders}
        loading={ordersQuery.isLoading}
        emptyMessage="لا توجد طلبات مطابقة."
        filters={
          <>
            <select
              className="input"
              value={searchStatus}
              onChange={event => {
                setSearchStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">كل الحالات</option>
              {STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={paymentFilter}
              onChange={event => {
                setPaymentFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">كل حالات الدفع</option>
              {PAYMENT_OPTIONS.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="input"
              value={fromDate}
              onChange={event => {
                setFromDate(event.target.value);
                setPage(1);
              }}
            />
            <input
              type="date"
              className="input"
              value={toDate}
              onChange={event => {
                setToDate(event.target.value);
                setPage(1);
              }}
            />
          </>
        }
        footer={
          <>
            <span>
              صفحة {page} من {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span>الصفوف</span>
              <select
                value={pageSize}
                onChange={event => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                {PAGE_SIZE_OPTIONS.map(size => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                السابق
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
              >
                التالي
              </button>
            </div>
          </>
        }
      />

      <DetailDrawer title={selected ? `طلب رقم ${selected.id}` : ''} isOpen={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected && (
          <div className="detail-grid">
            <p>
              <strong>العميل:</strong> {selected.doctor?.name || selected.pharmacy?.name || '-'}
            </p>
            <p>
              <strong>الحالة:</strong> {selected.status}
            </p>
            <p>
              <strong>الدفع:</strong> {selected.payment_status}
            </p>
            <p>
              <strong>الإجمالي:</strong> {Number(selected.total_amount || 0).toFixed(2)}
            </p>
            <div>
              <strong>البنود:</strong>
              <ul>
                {(selected.lines || []).map((line, idx) => (
                  <li key={`${selected.id}-line-${idx}`}>
                    {line.product?.name || line.product_id} - {line.quantity} × {line.price}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              {canManage && (
                <button type="button" className="btn btn-primary" onClick={() => openEdit(selected)}>
                  تعديل
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>
                إغلاق
              </button>
            </div>
          </div>
        )}
      </DetailDrawer>

      <DetailDrawer title={formMode === 'edit' ? 'تعديل طلب' : 'طلب جديد'} isOpen={Boolean(formMode)} onClose={closeForm}>
        {formMode && (
          <form className="form" onSubmit={handleSubmit}>
            <label className="form__label">
              تاريخ الطلب
              <input
                type="date"
                value={form.order_date}
                onChange={event => setForm(prev => ({ ...prev, order_date: event.target.value }))}
                required
              />
            </label>
            <label className="form__label">
              الحالة
              <select
                value={form.status}
                onChange={event => setForm(prev => ({ ...prev, status: event.target.value }))}
              >
                {STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="form__label">
              حالة الدفع
              <select
                value={form.payment_status}
                onChange={event => setForm(prev => ({ ...prev, payment_status: event.target.value }))}
              >
                {PAYMENT_OPTIONS.map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="form__label">
              مرجع الجزيرة
              <input
                type="text"
                value={form.aljazeera_ref}
                onChange={event => setForm(prev => ({ ...prev, aljazeera_ref: event.target.value }))}
              />
            </label>
            <label className="form__label">
              نوع العميل
              <select
                value={form.account_type}
                onChange={event => setForm(prev => ({ ...prev, account_type: event.target.value, account_id: '' }))}
              >
                <option value="doctor">طبيب</option>
                <option value="pharmacy">صيدلية</option>
              </select>
            </label>
            <label className="form__label">
              العميل
              <select
                value={form.account_id}
                onChange={event => setForm(prev => ({ ...prev, account_id: event.target.value }))}
                required
              >
                <option value="">اختر</option>
                {(form.account_type === 'doctor' ? doctors : pharmacies).map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="page-card" style={{ padding: '12px' }}>
              <h4 style={{ marginTop: 0 }}>بنود الطلب</h4>
              {form.lines.map((line, idx) => (
                <div key={`line-${idx}`} style={{ display: 'grid', gap: '8px', marginBottom: '8px' }}>
                  <select
                    className="input"
                    value={line.product_id}
                    onChange={event => handleLineChange(idx, 'product_id', event.target.value)}
                    required
                  >
                    <option value="">المنتج</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="input"
                    placeholder="الكمية"
                    value={line.quantity}
                    onChange={event => handleLineChange(idx, 'quantity', event.target.value)}
                    min={1}
                    required
                  />
                  <input
                    type="number"
                    className="input"
                    placeholder="السعر"
                    value={line.price}
                    onChange={event => handleLineChange(idx, 'price', event.target.value)}
                    min={0}
                    step="0.01"
                    required
                  />
                  <input
                    type="number"
                    className="input"
                    placeholder="خصم (%)"
                    value={line.discount ?? 0}
                    onChange={event => handleLineChange(idx, 'discount', event.target.value)}
                    min={0}
                    step="0.01"
                  />
                  <input
                    type="number"
                    className="input"
                    placeholder="بونص"
                    value={line.bonus ?? 0}
                    onChange={event => handleLineChange(idx, 'bonus', event.target.value)}
                    min={0}
                  />
                  <button type="button" className="btn btn-secondary" onClick={() => removeLine(idx)}>
                    حذف البند
                  </button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary" onClick={addLine}>
                إضافة بند
              </button>
            </div>

            {formError && (
              <div className="alert alert-danger" style={{ marginTop: '8px' }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? '...جارٍ الحفظ' : 'حفظ'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={closeForm}>
                إلغاء
              </button>
            </div>
          </form>
        )}
      </DetailDrawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="تأكيد حذف الطلب"
        description="سيتم حذف الطلب نهائياً من النظام."
        confirmText="حذف"
        cancelText="إلغاء"
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default OrdersPage;
