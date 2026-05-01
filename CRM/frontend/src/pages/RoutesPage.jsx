import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DetailDrawer from '../components/DetailDrawer';
import { useAuth } from '../auth/AuthContext';
import { listReps, repKeys } from '../api/reps';
import { listDoctors, doctorKeys } from '../api/endpoints/doctors';
import { listPharmacies, pharmacyKeys } from '../api/endpoints/pharmacies';
import { createRoute, listRoutes, listTodayRoute, routeKeys } from '../api/routes';
import './EntityListPage.css';

const DEFAULT_ROUTE = {
  name: '',
  rep_id: '',
  frequency: '',
  notes: '',
  accounts: [{ account_type: 'doctor', doctor_id: '', pharmacy_id: '', visit_frequency: '' }],
};

const RouteForm = ({ initialValues, reps, doctors, pharmacies, onSubmit, onCancel, submitting, error }) => {
  const [form, setForm] = useState(initialValues);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const updateAccount = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      accounts: prev.accounts.map((account, accountIndex) => {
        if (accountIndex !== index) return account;
        if (field === 'account_type') {
          return { ...account, account_type: value, doctor_id: '', pharmacy_id: '' };
        }
        return { ...account, [field]: value };
      }),
    }));
  };

  const addAccount = () => {
    setForm(prev => ({
      ...prev,
      accounts: [...prev.accounts, { account_type: 'doctor', doctor_id: '', pharmacy_id: '', visit_frequency: '' }],
    }));
  };

  const removeAccount = index => {
    setForm(prev => ({ ...prev, accounts: prev.accounts.filter((_, accountIndex) => accountIndex !== index) }));
  };

  return (
    <form className="form" onSubmit={event => {
      event.preventDefault();
      onSubmit({
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
      });
    }}>
      <label className="form__label">اسم المسار<input type="text" value={form.name} onChange={event => updateField('name', event.target.value)} required /></label>
      <label className="form__label">المندوب<select value={form.rep_id} onChange={event => updateField('rep_id', event.target.value)} required><option value="">اختر المندوب</option>{reps.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label>
      <label className="form__label">التكرار<input type="text" value={form.frequency} onChange={event => updateField('frequency', event.target.value)} placeholder="weekly / daily" /></label>
      <label className="form__label">ملاحظات<textarea value={form.notes} onChange={event => updateField('notes', event.target.value)} rows={3} /></label>
      <div style={{ display: 'grid', gap: '12px' }}>
        <strong>محطات المسار</strong>
        {form.accounts.map((account, index) => (
          <div key={index} style={{ display: 'grid', gap: '8px', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
            <label className="form__label">نوع الحساب<select value={account.account_type} onChange={event => updateAccount(index, 'account_type', event.target.value)}><option value="doctor">طبيب</option><option value="pharmacy">صيدلية</option></select></label>
            {account.account_type === 'doctor' ? <label className="form__label">الطبيب<select value={account.doctor_id} onChange={event => updateAccount(index, 'doctor_id', event.target.value)} required><option value="">اختر الطبيب</option>{doctors.map(doctor => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></label> : <label className="form__label">الصيدلية<select value={account.pharmacy_id} onChange={event => updateAccount(index, 'pharmacy_id', event.target.value)} required><option value="">اختر الصيدلية</option>{pharmacies.map(pharmacy => <option key={pharmacy.id} value={pharmacy.id}>{pharmacy.name}</option>)}</select></label>}
            <label className="form__label">تكرار الزيارة<input type="text" value={account.visit_frequency} onChange={event => updateAccount(index, 'visit_frequency', event.target.value)} placeholder="weekly" /></label>
            {form.accounts.length > 1 ? <button type="button" className="btn btn-secondary" onClick={() => removeAccount(index)}>حذف المحطة</button> : null}
          </div>
        ))}
        <button type="button" className="btn btn-secondary" onClick={addAccount}>إضافة محطة</button>
      </div>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <div style={{ display: 'flex', gap: '8px' }}><button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'جارٍ الحفظ...' : 'حفظ المسار'}</button><button type="button" className="btn btn-secondary" onClick={onCancel}>إلغاء</button></div>
    </form>
  );
};

const routeAccountLabel = (account, doctors, pharmacies) => {
  if (account.account_type === 'doctor') return doctors.find(doctor => doctor.id === account.doctor_id)?.name || `طبيب #${account.doctor_id}`;
  return pharmacies.find(pharmacy => pharmacy.id === account.pharmacy_id)?.name || `صيدلية #${account.pharmacy_id}`;
};

const RoutesPage = () => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [repFilter, setRepFilter] = useState('');
  const [formError, setFormError] = useState(null);

  const routesQuery = useQuery({ queryKey: routeKeys.list({ rep_id: repFilter }), queryFn: () => listRoutes({ rep_id: repFilter || undefined, page: 1, page_size: 50 }), enabled: !!token });
  const todayRouteQuery = useQuery({ queryKey: routeKeys.today, queryFn: listTodayRoute, enabled: !!token });
  const repsQuery = useQuery({ queryKey: repKeys.list({}), queryFn: () => listReps(), enabled: !!token });
  const doctorsQuery = useQuery({ queryKey: doctorKeys.list({ page_size: 200 }), queryFn: () => listDoctors({ page_size: 200 }), enabled: !!token });
  const pharmaciesQuery = useQuery({ queryKey: pharmacyKeys.list({ page_size: 200 }), queryFn: () => listPharmacies({ page_size: 200 }), enabled: !!token });

  const createMutation = useMutation({
    mutationFn: createRoute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routeKeys.all });
      setFormOpen(false);
      setFormError(null);
    },
    onError: error => setFormError(error.message || 'تعذر إنشاء المسار'),
  });

  const routes = routesQuery.data?.data || [];
  const todayStops = todayRouteQuery.data || [];
  const reps = repsQuery.data || [];
  const doctors = doctorsQuery.data?.data || [];
  const pharmacies = pharmaciesQuery.data?.data || [];
  const summary = useMemo(() => ({ routes: routes.length, stops: todayStops.length }), [routes.length, todayStops.length]);

  return (
    <div className="entity-page">
      <div className="entity-toolbar">
        <div>
          <h1 className="page-heading">المسارات</h1>
          <p className="page-subtitle">ربط المندوبين بخطط الزيارات ومحطات اليوم من الدومين الحالي.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>مسار جديد</button>
      </div>

      <section className="table-card" style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div><strong>{summary.routes}</strong><div className="page-subtitle">المسارات المعروضة</div></div>
        <div><strong>{summary.stops}</strong><div className="page-subtitle">محطات اليوم للمستخدم الحالي</div></div>
        <div><strong>{user?.name || '-'}</strong><div className="page-subtitle">المستخدم الحالي</div></div>
      </section>

      <div className="entity-filters">
        <select className="input" value={repFilter} onChange={event => setRepFilter(event.target.value)}>
          <option value="">كل المندوبين</option>
          {reps.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
        </select>
        <button type="button" className="btn btn-secondary" onClick={() => setRepFilter('')}>مسح الفلاتر</button>
      </div>

      <section className="table-card" style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1.3fr 1fr' }}>
        <div className="entity-table">
          <h2 style={{ marginTop: 0 }}>المسارات</h2>
          {routesQuery.isLoading ? <div className="entity-empty">جاري تحميل المسارات...</div> : null}
          {routesQuery.error ? <div className="entity-empty">تعذر تحميل المسارات: {routesQuery.error.message}</div> : null}
          {!routesQuery.isLoading && !routes.length ? <div className="entity-empty">لا توجد مسارات مطابقة.</div> : null}
          {routes.length ? (
            <table>
              <thead><tr><th>الاسم</th><th>المندوب</th><th>التكرار</th><th>المحطات</th></tr></thead>
              <tbody>
                {routes.map(route => (
                  <tr key={route.id} onClick={() => setSelected(route)}>
                    <td>{route.name}</td>
                    <td>{reps.find(rep => rep.id === route.rep_id)?.name || `#${route.rep_id}`}</td>
                    <td>{route.frequency || '-'}</td>
                    <td>{route.accounts?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
        <div>
          <h2 style={{ marginTop: 0 }}>محطات اليوم</h2>
          {todayRouteQuery.isLoading ? <div className="entity-empty">جاري تحميل محطات اليوم...</div> : null}
          {todayRouteQuery.error ? <div className="entity-empty">تعذر تحميل محطات اليوم: {todayRouteQuery.error.message}</div> : null}
          {!todayRouteQuery.isLoading && !todayStops.length ? <div className="entity-empty">لا توجد محطات يومية للمستخدم الحالي.</div> : null}
          <div style={{ display: 'grid', gap: '8px' }}>
            {todayStops.map(stop => (
              <div key={stop.id} style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px' }}>
                <strong>{stop.customer_name || stop.customerName}</strong>
                <div className="page-subtitle">{stop.customer_type || stop.customerType}</div>
                <div className="page-subtitle">{stop.address || 'بدون عنوان'}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DetailDrawer title={selected?.name || ''} isOpen={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="detail-grid">
            <p><strong>المندوب:</strong> {reps.find(rep => rep.id === selected.rep_id)?.name || `#${selected.rep_id}`}</p>
            <p><strong>التكرار:</strong> {selected.frequency || '-'}</p>
            <p><strong>الملاحظات:</strong> {selected.notes || '-'}</p>
            <div>
              <strong>المحطات:</strong>
              <ul>
                {(selected.accounts || []).map(account => (
                  <li key={account.id || `${account.account_type}-${account.doctor_id || account.pharmacy_id}`}>
                    {routeAccountLabel(account, doctors, pharmacies)} {account.visit_frequency ? `(${account.visit_frequency})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </DetailDrawer>

      <DetailDrawer title="إنشاء مسار" isOpen={formOpen} onClose={() => setFormOpen(false)}>
        <RouteForm
          initialValues={DEFAULT_ROUTE}
          reps={reps}
          doctors={doctors}
          pharmacies={pharmacies}
          onSubmit={payload => createMutation.mutate(payload)}
          onCancel={() => setFormOpen(false)}
          submitting={createMutation.isPending}
          error={formError}
        />
      </DetailDrawer>
    </div>
  );
};

export default RoutesPage;
