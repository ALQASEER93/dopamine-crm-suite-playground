import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import DataTable from '../components/DataTable';
import DetailDrawer from '../components/DetailDrawer';
import { useToast } from '../components/ToastProvider';
import { listDoctors } from '../api/endpoints/doctors';
import { listPharmacies } from '../api/endpoints/pharmacies';
import {
  collectionKeys,
  createCollection,
  exportCollections,
  listCollections,
} from '../api/endpoints/collections';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const METHOD_OPTIONS = ['cash', 'bank_transfer', 'check', 'card'];

const DEFAULT_FORM = {
  collection_date: new Date().toISOString().slice(0, 10),
  amount: '',
  method: 'cash',
  reference: '',
  account_type: 'pharmacy',
  account_id: '',
  notes: '',
};

const CollectionsPage = () => {
  const { token, user } = useAuth();
  const roleSlug = user?.role?.slug;
  const canManage = roleSlug === 'admin' || roleSlug === 'sales_manager' || roleSlug === 'accountant';
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  const queryParams = useMemo(
    () => ({
      page,
      page_size: pageSize,
      date_from: fromDate || undefined,
      date_to: toDate || undefined,
    }),
    [fromDate, page, pageSize, toDate],
  );

  const collectionsQuery = useQuery({
    queryKey: collectionKeys.list(queryParams),
    queryFn: () => listCollections(queryParams),
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
    queryKey: ['collections', 'doctors'],
    queryFn: () => listDoctors({ page: 1, page_size: 500 }),
    enabled: !!token,
    select: data => data?.data ?? [],
  });

  const pharmaciesQuery = useQuery({
    queryKey: ['collections', 'pharmacies'],
    queryFn: () => listPharmacies({ page: 1, page_size: 500 }),
    enabled: !!token,
    select: data => data?.data ?? [],
  });

  const createMutation = useMutation({
    mutationFn: payload => createCollection(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.list() });
      setFormOpen(false);
      setForm(DEFAULT_FORM);
      pushToast({ type: 'success', title: 'تم الحفظ', message: 'تم تسجيل التحصيل.' });
    },
    onError: error => pushToast({ type: 'error', title: 'خطأ', message: error.message || 'تعذر تسجيل التحصيل.' }),
  });

  const handleExport = async () => {
    try {
      const { blob, response } = await exportCollections(queryParams);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename =
        response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/\"/g, '') ||
        `collections-${new Date().toISOString().slice(0, 10)}.csv`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      pushToast({ type: 'error', title: 'خطأ', message: error.message || 'تعذر التصدير.' });
    }
  };

  const collections = collectionsQuery.data?.rows || [];
  const total = collectionsQuery.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const doctors = doctorsQuery.data || [];
  const pharmacies = pharmaciesQuery.data || [];

  const columns = [
    { key: 'collection_date', header: 'التاريخ' },
    { key: 'amount', header: 'المبلغ', render: row => Number(row.amount || 0).toFixed(2) },
    { key: 'method', header: 'الطريقة' },
    {
      key: 'customer',
      header: 'العميل',
      render: row => row.pharmacy?.name || row.doctor?.name || '-',
    },
    { key: 'reference', header: 'المرجع', render: row => row.reference || '-' },
  ];

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">التحصيلات</h1>
          <p className="page-subtitle">تسجيل التحصيلات وربطها بالعملاء.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={handleExport}>
            تصدير CSV
          </button>
          {canManage && (
            <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>
              تحصيل جديد
            </button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={collections}
        loading={collectionsQuery.isLoading}
        emptyMessage="لا توجد تحصيلات."
        filters={
          <>
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

      <DetailDrawer title="تحصيل جديد" isOpen={formOpen} onClose={() => setFormOpen(false)}>
        <form
          className="form"
          onSubmit={event => {
            event.preventDefault();
            createMutation.mutate({
              collection_date: form.collection_date,
              amount: Number(form.amount),
              method: form.method,
              reference: form.reference || null,
              doctor_id: form.account_type === 'doctor' ? Number(form.account_id) : null,
              pharmacy_id: form.account_type === 'pharmacy' ? Number(form.account_id) : null,
              notes: form.notes || null,
            });
          }}
        >
          <label className="form__label">
            التاريخ
            <input
              type="date"
              value={form.collection_date}
              onChange={event => setForm(prev => ({ ...prev, collection_date: event.target.value }))}
              required
            />
          </label>
          <label className="form__label">
            المبلغ
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={event => setForm(prev => ({ ...prev, amount: event.target.value }))}
              required
            />
          </label>
          <label className="form__label">
            طريقة التحصيل
            <select value={form.method} onChange={event => setForm(prev => ({ ...prev, method: event.target.value }))}>
              {METHOD_OPTIONS.map(method => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
          <label className="form__label">
            المرجع
            <input
              type="text"
              value={form.reference}
              onChange={event => setForm(prev => ({ ...prev, reference: event.target.value }))}
            />
          </label>
          <label className="form__label">
            نوع العميل
            <select
              value={form.account_type}
              onChange={event => setForm(prev => ({ ...prev, account_type: event.target.value, account_id: '' }))}
            >
              <option value="pharmacy">صيدلية</option>
              <option value="doctor">طبيب</option>
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
          <label className="form__label">
            ملاحظات
            <textarea
              rows={3}
              value={form.notes}
              onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))}
            />
          </label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? '...جارٍ الحفظ' : 'حفظ'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)}>
              إلغاء
            </button>
          </div>
        </form>
      </DetailDrawer>
    </div>
  );
};

export default CollectionsPage;
