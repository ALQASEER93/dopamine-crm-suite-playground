import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DetailDrawer from '../components/DetailDrawer';
import { useAuth } from '../auth/AuthContext';
import { listProducts, productKeys } from '../api/products';
import { listReps, repKeys } from '../api/reps';
import { createTarget, listTargets, targetKeys } from '../api/targets';
import './EntityListPage.css';

const DEFAULT_FORM = { rep_id: '', period: '', product_id: '', target_amount: '', achieved_amount: '' };

const TargetsPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ rep_id: '', period: '' });
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [formError, setFormError] = useState(null);

  const targetsQuery = useQuery({ queryKey: targetKeys.list(filters), queryFn: () => listTargets({ ...filters, page: 1, page_size: 50 }), enabled: !!token });
  const repsQuery = useQuery({ queryKey: repKeys.list({}), queryFn: () => listReps(), enabled: !!token });
  const productsQuery = useQuery({ queryKey: productKeys.list({ page_size: 200 }), queryFn: () => listProducts({ page_size: 200 }), enabled: !!token });

  const createMutation = useMutation({
    mutationFn: createTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: targetKeys.all });
      setForm(DEFAULT_FORM);
      setFormOpen(false);
      setFormError(null);
    },
    onError: error => setFormError(error.message || 'تعذر إنشاء الهدف'),
  });

  const targets = targetsQuery.data?.data || [];
  const summary = useMemo(() => targets.reduce((acc, target) => {
    acc.target += Number(target.target_amount || 0);
    acc.achieved += Number(target.achieved_amount || 0);
    return acc;
  }, { target: 0, achieved: 0 }), [targets]);

  return (
    <div className="entity-page">
      <div className="entity-toolbar">
        <div>
          <h1 className="page-heading">الأهداف</h1>
          <p className="page-subtitle">متابعة أهداف المندوبين والمنتجات حسب الفترة.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>هدف جديد</button>
      </div>

      <section className="table-card" style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div><strong>{summary.target.toFixed(2)}</strong><div className="page-subtitle">إجمالي الهدف</div></div>
        <div><strong>{summary.achieved.toFixed(2)}</strong><div className="page-subtitle">المحقق</div></div>
        <div><strong>{summary.target > 0 ? `${((summary.achieved / summary.target) * 100).toFixed(1)}%` : '0%'}</strong><div className="page-subtitle">نسبة الإنجاز</div></div>
      </section>

      <div className="entity-filters">
        <select className="input" value={filters.rep_id} onChange={event => setFilters(prev => ({ ...prev, rep_id: event.target.value }))}>
          <option value="">كل المندوبين</option>
          {(repsQuery.data || []).map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
        </select>
        <input className="input" type="month" value={filters.period} onChange={event => setFilters(prev => ({ ...prev, period: event.target.value }))} />
        <button type="button" className="btn btn-secondary" onClick={() => setFilters({ rep_id: '', period: '' })}>مسح الفلاتر</button>
      </div>

      <section className="table-card entity-table">
        {targetsQuery.isLoading ? <div className="entity-empty">جاري تحميل الأهداف...</div> : null}
        {targetsQuery.error ? <div className="entity-empty">تعذر تحميل الأهداف: {targetsQuery.error.message}</div> : null}
        {!targetsQuery.isLoading && !targets.length ? <div className="entity-empty">لا توجد أهداف مطابقة.</div> : null}
        {targets.length ? (
          <table>
            <thead><tr><th>الفترة</th><th>المندوب</th><th>المنتج</th><th>الهدف</th><th>المحقق</th><th>النسبة</th></tr></thead>
            <tbody>
              {targets.map(target => {
                const percent = Number(target.target_amount || 0) > 0 ? (Number(target.achieved_amount || 0) / Number(target.target_amount || 1)) * 100 : 0;
                return (
                  <tr key={target.id}>
                    <td>{target.period}</td>
                    <td>{target.rep?.name || `#${target.rep_id}`}</td>
                    <td>{target.product?.name || (target.product_id ? `#${target.product_id}` : 'كل المنتجات')}</td>
                    <td>{Number(target.target_amount || 0).toFixed(2)}</td>
                    <td>{Number(target.achieved_amount || 0).toFixed(2)}</td>
                    <td>{percent.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
      </section>

      <DetailDrawer title="إضافة هدف" isOpen={formOpen} onClose={() => setFormOpen(false)}>
        <form className="form" onSubmit={event => {
          event.preventDefault();
          createMutation.mutate({
            rep_id: Number(form.rep_id),
            period: form.period,
            product_id: form.product_id ? Number(form.product_id) : null,
            target_amount: Number(form.target_amount),
            achieved_amount: form.achieved_amount ? Number(form.achieved_amount) : null,
          });
        }}>
          <label className="form__label">المندوب<select value={form.rep_id} onChange={event => setForm(prev => ({ ...prev, rep_id: event.target.value }))} required><option value="">اختر المندوب</option>{(repsQuery.data || []).map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label>
          <label className="form__label">الفترة<input type="month" value={form.period} onChange={event => setForm(prev => ({ ...prev, period: event.target.value }))} required /></label>
          <label className="form__label">المنتج<select value={form.product_id} onChange={event => setForm(prev => ({ ...prev, product_id: event.target.value }))}><option value="">كل المنتجات</option>{(productsQuery.data?.data || []).map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label className="form__label">قيمة الهدف<input type="number" min="0" step="0.01" value={form.target_amount} onChange={event => setForm(prev => ({ ...prev, target_amount: event.target.value }))} required /></label>
          <label className="form__label">المحقق حتى الآن<input type="number" min="0" step="0.01" value={form.achieved_amount} onChange={event => setForm(prev => ({ ...prev, achieved_amount: event.target.value }))} /></label>
          {formError ? <div className="alert alert-danger">{formError}</div> : null}
          <div style={{ display: 'flex', gap: '8px' }}><button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ الهدف'}</button><button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)}>إلغاء</button></div>
        </form>
      </DetailDrawer>
    </div>
  );
};

export default TargetsPage;
