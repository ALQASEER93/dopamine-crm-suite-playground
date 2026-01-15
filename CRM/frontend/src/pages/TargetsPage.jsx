import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import DataTable from '../components/DataTable';
import DetailDrawer from '../components/DetailDrawer';
import { useToast } from '../components/ToastProvider';
import { listProducts } from '../api/endpoints/products';
import { listReps } from '../api/reps';
import {
  createTarget,
  exportTargets,
  exportVisitTargets,
  listTargets,
  listVisitTargets,
  targetKeys,
  upsertVisitTarget,
} from '../api/endpoints/targets';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const TargetsPage = () => {
  const { token, user } = useAuth();
  const roleSlug = user?.role?.slug;
  const canManage = roleSlug === 'admin' || roleSlug === 'sales_manager';
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [repFilter, setRepFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  const [targetFormOpen, setTargetFormOpen] = useState(false);
  const [visitTargetFormOpen, setVisitTargetFormOpen] = useState(false);
  const [targetForm, setTargetForm] = useState({
    rep_id: '',
    period: '',
    product_id: '',
    target_amount: '',
    achieved_amount: '',
  });
  const [visitTargetForm, setVisitTargetForm] = useState({
    rep_id: '',
    period: '',
    daily_target_visits: '',
    monthly_target_visits: '',
  });

  const queryParams = useMemo(
    () => ({
      page,
      page_size: pageSize,
      rep_id: repFilter || undefined,
      period: periodFilter || undefined,
    }),
    [page, pageSize, periodFilter, repFilter],
  );

  const targetsQuery = useQuery({
    queryKey: targetKeys.targets(queryParams),
    queryFn: () => listTargets(queryParams),
    enabled: !!token,
    keepPreviousData: true,
    select: data => {
      const rows = Array.isArray(data?.data) ? data.data : [];
      const pagination = data?.pagination || data?.meta;
      const total = pagination?.total ?? rows.length;
      return { rows, total };
    },
  });

  const visitTargetsQuery = useQuery({
    queryKey: targetKeys.visitTargets(queryParams),
    queryFn: () => listVisitTargets(queryParams),
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
    queryKey: ['targets', 'reps'],
    queryFn: () => listReps({ include_inactive: true }),
    enabled: !!token,
  });

  const productsQuery = useQuery({
    queryKey: ['targets', 'products'],
    queryFn: () => listProducts({ page: 1, page_size: 500, is_active: true }),
    enabled: !!token,
    select: data => data?.data ?? [],
  });

  const createTargetMutation = useMutation({
    mutationFn: payload => createTarget(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: targetKeys.targets() });
      setTargetFormOpen(false);
      setTargetForm({ rep_id: '', period: '', product_id: '', target_amount: '', achieved_amount: '' });
      pushToast({ type: 'success', title: 'تم الحفظ', message: 'تم إنشاء الهدف.' });
    },
    onError: error => pushToast({ type: 'error', title: 'خطأ', message: error.message || 'تعذر إنشاء الهدف.' }),
  });

  const upsertVisitTargetMutation = useMutation({
    mutationFn: payload => upsertVisitTarget(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: targetKeys.visitTargets() });
      setVisitTargetFormOpen(false);
      setVisitTargetForm({ rep_id: '', period: '', daily_target_visits: '', monthly_target_visits: '' });
      pushToast({ type: 'success', title: 'تم الحفظ', message: 'تم حفظ هدف الزيارات.' });
    },
    onError: error => pushToast({ type: 'error', title: 'خطأ', message: error.message || 'تعذر حفظ هدف الزيارات.' }),
  });

  const handleExportTargets = async () => {
    try {
      const { blob, response } = await exportTargets(queryParams);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename =
        response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/\"/g, '') ||
        `targets-${new Date().toISOString().slice(0, 10)}.csv`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      pushToast({ type: 'error', title: 'خطأ', message: error.message || 'تعذر تصدير الأهداف.' });
    }
  };

  const handleExportVisitTargets = async () => {
    try {
      const { blob, response } = await exportVisitTargets(queryParams);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename =
        response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/\"/g, '') ||
        `visit-targets-${new Date().toISOString().slice(0, 10)}.csv`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      pushToast({ type: 'error', title: 'خطأ', message: error.message || 'تعذر تصدير أهداف الزيارات.' });
    }
  };

  const reps = repsQuery.data || [];
  const products = productsQuery.data || [];
  const targets = targetsQuery.data?.rows || [];
  const visitTargets = visitTargetsQuery.data?.rows || [];
  const targetTotal = targetsQuery.data?.total || 0;
  const visitTargetTotal = visitTargetsQuery.data?.total || 0;

  const targetColumns = [
    { key: 'rep_id', header: 'المندوب', render: row => reps.find(rep => rep.id === row.rep_id)?.name || row.rep_id },
    { key: 'period', header: 'الفترة' },
    {
      key: 'product_id',
      header: 'المنتج',
      render: row => (row.product_id ? products.find(p => p.id === row.product_id)?.name || row.product_id : 'عام'),
    },
    { key: 'target_amount', header: 'الهدف', render: row => Number(row.target_amount || 0).toFixed(2) },
    {
      key: 'achieved_amount',
      header: 'المحقق',
      render: row => Number(row.achieved_amount || 0).toFixed(2),
    },
    {
      key: 'attainment',
      header: 'نسبة الإنجاز',
      render: row => {
        const target = Number(row.target_amount || 0);
        const achieved = Number(row.achieved_amount || 0);
        if (!target) return '-';
        return `${((achieved / target) * 100).toFixed(1)}%`;
      },
    },
  ];

  const visitTargetColumns = [
    { key: 'rep_id', header: 'المندوب', render: row => reps.find(rep => rep.id === row.rep_id)?.name || row.rep_id },
    { key: 'period', header: 'الفترة' },
    { key: 'daily_target_visits', header: 'الهدف اليومي' },
    { key: 'monthly_target_visits', header: 'الهدف الشهري' },
  ];

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">الأهداف</h1>
          <p className="page-subtitle">أهداف المبيعات والزيارات حسب المندوب والفترة.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={handleExportTargets}>
            تصدير أهداف المبيعات
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleExportVisitTargets}>
            تصدير أهداف الزيارات
          </button>
          {canManage && (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setVisitTargetFormOpen(true)}>
                هدف زيارات
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setTargetFormOpen(true)}>
                هدف مبيعات
              </button>
            </>
          )}
        </div>
      </div>

      <DataTable
        columns={targetColumns}
        rows={targets}
        loading={targetsQuery.isLoading}
        emptyMessage="لا توجد أهداف مبيعات."
        filters={
          <>
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
            <input
              type="text"
              className="input"
              placeholder="الفترة (2025-01)"
              value={periodFilter}
              onChange={event => {
                setPeriodFilter(event.target.value);
                setPage(1);
              }}
            />
          </>
        }
        footer={
          <>
            <span>
              إجمالي {targetTotal} هدف
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
            </div>
          </>
        }
      />

      <DataTable
        columns={visitTargetColumns}
        rows={visitTargets}
        loading={visitTargetsQuery.isLoading}
        emptyMessage="لا توجد أهداف زيارات."
        footer={
          <>
            <span>
              إجمالي {visitTargetTotal} هدف زيارات
            </span>
          </>
        }
      />

      <DetailDrawer title="هدف مبيعات جديد" isOpen={targetFormOpen} onClose={() => setTargetFormOpen(false)}>
        <form
          className="form"
          onSubmit={event => {
            event.preventDefault();
            createTargetMutation.mutate({
              rep_id: Number(targetForm.rep_id),
              period: targetForm.period,
              product_id: targetForm.product_id ? Number(targetForm.product_id) : null,
              target_amount: Number(targetForm.target_amount),
              achieved_amount: targetForm.achieved_amount ? Number(targetForm.achieved_amount) : null,
            });
          }}
        >
          <label className="form__label">
            المندوب
            <select
              value={targetForm.rep_id}
              onChange={event => setTargetForm(prev => ({ ...prev, rep_id: event.target.value }))}
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
            الفترة
            <input
              type="text"
              placeholder="2025-01"
              value={targetForm.period}
              onChange={event => setTargetForm(prev => ({ ...prev, period: event.target.value }))}
              required
            />
          </label>
          <label className="form__label">
            المنتج (اختياري)
            <select
              value={targetForm.product_id}
              onChange={event => setTargetForm(prev => ({ ...prev, product_id: event.target.value }))}
            >
              <option value="">عام</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form__label">
            قيمة الهدف
            <input
              type="number"
              step="0.01"
              value={targetForm.target_amount}
              onChange={event => setTargetForm(prev => ({ ...prev, target_amount: event.target.value }))}
              required
            />
          </label>
          <label className="form__label">
            القيمة المحققة
            <input
              type="number"
              step="0.01"
              value={targetForm.achieved_amount}
              onChange={event => setTargetForm(prev => ({ ...prev, achieved_amount: event.target.value }))}
            />
          </label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary" disabled={createTargetMutation.isPending}>
              {createTargetMutation.isPending ? '...جارٍ الحفظ' : 'حفظ'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setTargetFormOpen(false)}>
              إلغاء
            </button>
          </div>
        </form>
      </DetailDrawer>

      <DetailDrawer title="هدف زيارات جديد" isOpen={visitTargetFormOpen} onClose={() => setVisitTargetFormOpen(false)}>
        <form
          className="form"
          onSubmit={event => {
            event.preventDefault();
            upsertVisitTargetMutation.mutate({
              rep_id: Number(visitTargetForm.rep_id),
              period: visitTargetForm.period,
              daily_target_visits: Number(visitTargetForm.daily_target_visits),
              monthly_target_visits: Number(visitTargetForm.monthly_target_visits),
            });
          }}
        >
          <label className="form__label">
            المندوب
            <select
              value={visitTargetForm.rep_id}
              onChange={event => setVisitTargetForm(prev => ({ ...prev, rep_id: event.target.value }))}
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
            الفترة
            <input
              type="text"
              placeholder="2025-01"
              value={visitTargetForm.period}
              onChange={event => setVisitTargetForm(prev => ({ ...prev, period: event.target.value }))}
              required
            />
          </label>
          <label className="form__label">
            الهدف اليومي
            <input
              type="number"
              min={0}
              value={visitTargetForm.daily_target_visits}
              onChange={event => setVisitTargetForm(prev => ({ ...prev, daily_target_visits: event.target.value }))}
              required
            />
          </label>
          <label className="form__label">
            الهدف الشهري
            <input
              type="number"
              min={0}
              value={visitTargetForm.monthly_target_visits}
              onChange={event => setVisitTargetForm(prev => ({ ...prev, monthly_target_visits: event.target.value }))}
              required
            />
          </label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary" disabled={upsertVisitTargetMutation.isPending}>
              {upsertVisitTargetMutation.isPending ? '...جارٍ الحفظ' : 'حفظ'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setVisitTargetFormOpen(false)}>
              إلغاء
            </button>
          </div>
        </form>
      </DetailDrawer>
    </div>
  );
};

export default TargetsPage;
