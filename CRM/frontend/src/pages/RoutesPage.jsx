import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import DataTable from '../components/DataTable';
import DetailDrawer from '../components/DetailDrawer';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/ToastProvider';
import { listDoctors } from '../api/endpoints/doctors';
import { listPharmacies } from '../api/endpoints/pharmacies';
import { listReps } from '../api/reps';
import { createRoute, deleteRoute, exportRoutes, listRoutes, routeKeys, updateRoute } from '../api/endpoints/routes';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const DEFAULT_FORM = {
  name: '',
  rep_id: '',
  frequency: '',
  notes: '',
  accounts: [],
};

const RoutesPage = () => {
  const { token, user } = useAuth();
  const roleSlug = user?.role?.slug;
  const canManage = roleSlug === 'admin' || roleSlug === 'sales_manager';
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [repFilter, setRepFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  const [selected, setSelected] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const queryParams = useMemo(
    () => ({ page, page_size: pageSize, rep_id: repFilter || undefined }),
    [page, pageSize, repFilter],
  );

  const routesQuery = useQuery({
    queryKey: routeKeys.list(queryParams),
    queryFn: () => listRoutes(queryParams),
    enabled: !!token,
    keepPreviousData: true,
    select: data => {
      const rows = Array.isArray(data?.data) ? data.data : [];
      const pagination = data?.pagination || data?.meta;
      const total = pagination?.total ?? rows.length;
      return { rows, total };
    },
  });

  const repsQuery = useQuery({
    queryKey: ['routes', 'reps'],
    queryFn: () => listReps({ include_inactive: true }),
    enabled: !!token,
  });

  const doctorsQuery = useQuery({
    queryKey: ['routes', 'doctors'],
    queryFn: () => listDoctors({ page: 1, page_size: 500 }),
    enabled: !!token,
    select: data => data?.data ?? [],
  });

  const pharmaciesQuery = useQuery({
    queryKey: ['routes', 'pharmacies'],
    queryFn: () => listPharmacies({ page: 1, page_size: 500 }),
    enabled: !!token,
    select: data => data?.data ?? [],
  });

  const createMutation = useMutation({
    mutationFn: payload => createRoute(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routeKeys.all });
      closeForm();
      pushToast({ type: 'success', title: 'تم الحفظ', message: 'تم إنشاء المسار.' });
    },
    onError: error => pushToast({ type: 'error', title: 'خطأ', message: error.message || 'تعذر إنشاء المسار.' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateRoute(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routeKeys.all });
      closeForm();
      pushToast({ type: 'success', title: 'تم التحديث', message: 'تم تحديث المسار.' });
    },
    onError: error => pushToast({ type: 'error', title: 'خطأ', message: error.message || 'تعذر تحديث المسار.' }),
  });

  const deleteMutation = useMutation({
    mutationFn: id => deleteRoute(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routeKeys.all });
      setDeleteTarget(null);
      pushToast({ type: 'success', title: 'تم الحذف', message: 'تم حذف المسار.' });
    },
    onError: error => {
      setDeleteTarget(null);
      pushToast({ type: 'error', title: 'خطأ', message: error.message || 'تعذر حذف المسار.' });
    },
  });

  const closeForm = () => {
    setFormMode(null);
    setForm(DEFAULT_FORM);
  };

  const openCreate = () => {
    setFormMode('create');
    setForm(DEFAULT_FORM);
  };

  const openEdit = route => {
    setFormMode('edit');
    setForm({
      name: route.name || '',
      rep_id: route.rep_id || '',
      frequency: route.frequency || '',
      notes: route.notes || '',
      accounts: route.accounts || [],
    });
  };

  const addAccount = () => {
    setForm(prev => ({
      ...prev,
      accounts: [...prev.accounts, { account_type: 'doctor', doctor_id: '', pharmacy_id: '', visit_frequency: '' }],
    }));
  };

  const updateAccount = (index, field, value) => {
    setForm(prev => {
      const accounts = [...prev.accounts];
      accounts[index] = { ...accounts[index], [field]: value };
      if (field === 'account_type') {
        accounts[index].doctor_id = '';
        accounts[index].pharmacy_id = '';
      }
      return { ...prev, accounts };
    });
  };

  const removeAccount = index => {
    setForm(prev => ({ ...prev, accounts: prev.accounts.filter((_, idx) => idx !== index) }));
  };

  const handleSubmit = event => {
    event.preventDefault();
    const payload = {
      name: form.name,
      rep_id: Number(form.rep_id),
      frequency: form.frequency || null,
      notes: form.notes || null,
      accounts: form.accounts.map(account => ({
        account_type: account.account_type,
        doctor_id: account.account_type === 'doctor' ? Number(account.doctor_id) : null,
        pharmacy_id: account.account_type === 'pharmacy' ? Number(account.pharmacy_id) : null,
        visit_frequency: account.visit_frequency || null,
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
      const { blob, response } = await exportRoutes(queryParams);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename =
        response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/\"/g, '') ||
        `routes-${new Date().toISOString().slice(0, 10)}.csv`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      pushToast({ type: 'error', title: 'خطأ', message: error.message || 'تعذر تصدير المسارات.' });
    }
  };

  const routes = routesQuery.data?.rows || [];
  const total = routesQuery.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const reps = repsQuery.data || [];
  const doctors = doctorsQuery.data || [];
  const pharmacies = pharmaciesQuery.data || [];

  const columns = [
    { key: 'name', header: 'المسار' },
    { key: 'rep_id', header: 'المندوب', render: row => reps.find(rep => rep.id === row.rep_id)?.name || row.rep_id },
    { key: 'frequency', header: 'التكرار', render: row => row.frequency || '-' },
    { key: 'accounts', header: 'الحسابات', render: row => row.accounts?.length || 0 },
    {
      key: 'actions',
      header: 'إجراءات',
      render: row => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setSelected(row)}>
            عرض
          </button>
          {canManage && (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => openEdit(row)}>
                تعديل
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(row)}>
                حذف
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">المسارات</h1>
          <p className="page-subtitle">إدارة مسارات المندوبين وتوزيع الحسابات.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={handleExport}>
            تصدير CSV
          </button>
          {canManage && (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              مسار جديد
            </button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={routes}
        loading={routesQuery.isLoading}
        emptyMessage="لا توجد مسارات."
        filters={
          <select
            className="input"
            value={repFilter}
            onChange={event => {
              setRepFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">كل المندوبين</option>
            {reps.map(rep => (
              <option key={rep.id} value={rep.id}>
                {rep.name}
              </option>
            ))}
          </select>
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

      <DetailDrawer title={selected?.name || ''} isOpen={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected && (
          <div className="detail-grid">
            <p>
              <strong>المندوب:</strong> {reps.find(rep => rep.id === selected.rep_id)?.name || selected.rep_id}
            </p>
            <p>
              <strong>التكرار:</strong> {selected.frequency || '-'}
            </p>
            <p>
              <strong>ملاحظات:</strong> {selected.notes || '-'}
            </p>
            <div>
              <strong>الحسابات:</strong>
              <ul>
                {(selected.accounts || []).map((account, idx) => (
                  <li key={`${selected.id}-account-${idx}`}>
                    {account.account_type === 'doctor'
                      ? doctors.find(doc => doc.id === account.doctor_id)?.name || account.doctor_id
                      : pharmacies.find(ph => ph.id === account.pharmacy_id)?.name || account.pharmacy_id}
                    {account.visit_frequency ? ` - ${account.visit_frequency}` : ''}
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

      <DetailDrawer title={formMode === 'edit' ? 'تعديل مسار' : 'مسار جديد'} isOpen={Boolean(formMode)} onClose={closeForm}>
        {formMode && (
          <form className="form" onSubmit={handleSubmit}>
            <label className="form__label">
              اسم المسار
              <input
                type="text"
                value={form.name}
                onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
                required
              />
            </label>
            <label className="form__label">
              المندوب
              <select
                value={form.rep_id}
                onChange={event => setForm(prev => ({ ...prev, rep_id: event.target.value }))}
                required
              >
                <option value="">اختر</option>
                {reps.map(rep => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form__label">
              التكرار
              <input
                type="text"
                value={form.frequency}
                onChange={event => setForm(prev => ({ ...prev, frequency: event.target.value }))}
              />
            </label>
            <label className="form__label">
              ملاحظات
              <textarea
                rows={3}
                value={form.notes}
                onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))}
              />
            </label>
            <div className="page-card" style={{ padding: '12px' }}>
              <h4 style={{ marginTop: 0 }}>الحسابات ضمن المسار</h4>
              {form.accounts.map((account, idx) => (
                <div key={`account-${idx}`} style={{ display: 'grid', gap: '8px', marginBottom: '8px' }}>
                  <select
                    className="input"
                    value={account.account_type}
                    onChange={event => updateAccount(idx, 'account_type', event.target.value)}
                  >
                    <option value="doctor">طبيب</option>
                    <option value="pharmacy">صيدلية</option>
                  </select>
                  {account.account_type === 'doctor' ? (
                    <select
                      className="input"
                      value={account.doctor_id || ''}
                      onChange={event => updateAccount(idx, 'doctor_id', event.target.value)}
                      required
                    >
                      <option value="">اختر طبيب</option>
                      {doctors.map(doc => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      className="input"
                      value={account.pharmacy_id || ''}
                      onChange={event => updateAccount(idx, 'pharmacy_id', event.target.value)}
                      required
                    >
                      <option value="">اختر صيدلية</option>
                      {pharmacies.map(ph => (
                        <option key={ph.id} value={ph.id}>
                          {ph.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    className="input"
                    placeholder="تكرار الزيارة (أسبوعي/شهري)"
                    value={account.visit_frequency || ''}
                    onChange={event => updateAccount(idx, 'visit_frequency', event.target.value)}
                  />
                  <button type="button" className="btn btn-secondary" onClick={() => removeAccount(idx)}>
                    حذف الحساب
                  </button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary" onClick={addAccount}>
                إضافة حساب
              </button>
            </div>
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
        title="تأكيد حذف المسار"
        description="سيتم حذف المسار نهائياً."
        confirmText="حذف"
        cancelText="إلغاء"
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default RoutesPage;
