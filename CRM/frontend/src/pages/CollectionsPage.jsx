import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DetailDrawer from '../components/DetailDrawer';
import { useAuth } from '../auth/AuthContext';
import { createCollection, listCollections, collectionKeys } from '../api/collections';
import { listReps, repKeys } from '../api/reps';
import { listDoctors, doctorKeys } from '../api/endpoints/doctors';
import { listPharmacies, pharmacyKeys } from '../api/endpoints/pharmacies';
import './EntityListPage.css';

const DEFAULT_FORM = { collection_date: new Date().toISOString().slice(0, 10), rep_id: '', amount: '', method: 'cash', reference: '', doctor_id: '', pharmacy_id: '', notes: '' };

const CollectionsPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ date_from: '', date_to: '' });
  const [form, setForm] = useState(DEFAULT_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState(null);

  const collectionsQuery = useQuery({ queryKey: collectionKeys.list(filters), queryFn: () => listCollections({ ...filters, page: 1, page_size: 50 }), enabled: !!token });
  const repsQuery = useQuery({ queryKey: repKeys.list({}), queryFn: () => listReps(), enabled: !!token });
  const doctorsQuery = useQuery({ queryKey: doctorKeys.list({ page_size: 200 }), queryFn: () => listDoctors({ page_size: 200 }), enabled: !!token });
  const pharmaciesQuery = useQuery({ queryKey: pharmacyKeys.list({ page_size: 200 }), queryFn: () => listPharmacies({ page_size: 200 }), enabled: !!token });

  const createMutation = useMutation({
    mutationFn: createCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      setForm(DEFAULT_FORM);
      setFormOpen(false);
      setFormError(null);
    },
    onError: error => setFormError(error.message || 'تعذر تسجيل التحصيل'),
  });

  const collections = collectionsQuery.data?.data || [];
  const totalCollected = useMemo(() => collections.reduce((sum, item) => sum + Number(item.amount || 0), 0), [collections]);
  const accountType = form.doctor_id ? 'doctor' : form.pharmacy_id ? 'pharmacy' : 'pharmacy';

  return (
    <div className="entity-page">
      <div className="entity-toolbar">
        <div>
          <h1 className="page-heading">التحصيلات</h1>
          <p className="page-subtitle">تسجيل المبالغ المحصلة ومتابعة مصادرها خلال الفترة.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>تسجيل تحصيل</button>
      </div>

      <section className="table-card" style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div><strong>{collections.length}</strong><div className="page-subtitle">عمليات التحصيل المعروضة</div></div>
        <div><strong>{totalCollected.toFixed(2)}</strong><div className="page-subtitle">إجمالي المبلغ</div></div>
      </section>

      <div className="entity-filters">
        <input className="input" type="date" value={filters.date_from} onChange={event => setFilters(prev => ({ ...prev, date_from: event.target.value }))} />
        <input className="input" type="date" value={filters.date_to} onChange={event => setFilters(prev => ({ ...prev, date_to: event.target.value }))} />
        <button type="button" className="btn btn-secondary" onClick={() => setFilters({ date_from: '', date_to: '' })}>مسح الفلاتر</button>
      </div>

      <section className="table-card entity-table">
        {collectionsQuery.isLoading ? <div className="entity-empty">جاري تحميل التحصيلات...</div> : null}
        {collectionsQuery.error ? <div className="entity-empty">تعذر تحميل التحصيلات: {collectionsQuery.error.message}</div> : null}
        {!collectionsQuery.isLoading && !collections.length ? <div className="entity-empty">لا توجد تحصيلات مطابقة.</div> : null}
        {collections.length ? (
          <table>
            <thead><tr><th>التاريخ</th><th>الحساب</th><th>المندوب</th><th>الطريقة</th><th>المرجع</th><th>المبلغ</th></tr></thead>
            <tbody>
              {collections.map(item => (
                <tr key={item.id}>
                  <td>{item.collection_date}</td>
                  <td>{item.doctor?.name || item.pharmacy?.name || (item.doctor_id ? `طبيب #${item.doctor_id}` : `صيدلية #${item.pharmacy_id}`)}</td>
                  <td>{item.rep?.name || (item.rep_id ? `#${item.rep_id}` : '-')}</td>
                  <td>{item.method}</td>
                  <td>{item.reference || '-'}</td>
                  <td>{Number(item.amount || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <DetailDrawer title="تسجيل تحصيل جديد" isOpen={formOpen} onClose={() => setFormOpen(false)}>
        <form className="form" onSubmit={event => {
          event.preventDefault();
          createMutation.mutate({
            collection_date: form.collection_date,
            rep_id: form.rep_id ? Number(form.rep_id) : null,
            amount: Number(form.amount),
            method: form.method,
            reference: form.reference || null,
            doctor_id: accountType === 'doctor' ? Number(form.doctor_id) : null,
            pharmacy_id: accountType === 'pharmacy' ? Number(form.pharmacy_id) : null,
            notes: form.notes || null,
          });
        }}>
          <label className="form__label">التاريخ<input type="date" value={form.collection_date} onChange={event => setForm(prev => ({ ...prev, collection_date: event.target.value }))} required /></label>
          <label className="form__label">المندوب<select value={form.rep_id} onChange={event => setForm(prev => ({ ...prev, rep_id: event.target.value }))}><option value="">بدون ربط</option>{(repsQuery.data || []).map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label>
          <label className="form__label">نوع الحساب<select value={accountType} onChange={event => setForm(prev => ({ ...prev, doctor_id: '', pharmacy_id: '', accountType: event.target.value }))}><option value="pharmacy">صيدلية</option><option value="doctor">طبيب</option></select></label>
          {accountType === 'doctor' ? <label className="form__label">الطبيب<select value={form.doctor_id} onChange={event => setForm(prev => ({ ...prev, doctor_id: event.target.value, pharmacy_id: '' }))} required><option value="">اختر الطبيب</option>{(doctorsQuery.data?.data || []).map(doctor => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></label> : <label className="form__label">الصيدلية<select value={form.pharmacy_id} onChange={event => setForm(prev => ({ ...prev, pharmacy_id: event.target.value, doctor_id: '' }))} required><option value="">اختر الصيدلية</option>{(pharmaciesQuery.data?.data || []).map(pharmacy => <option key={pharmacy.id} value={pharmacy.id}>{pharmacy.name}</option>)}</select></label>}
          <label className="form__label">المبلغ<input type="number" min="0" step="0.01" value={form.amount} onChange={event => setForm(prev => ({ ...prev, amount: event.target.value }))} required /></label>
          <label className="form__label">طريقة التحصيل<input type="text" value={form.method} onChange={event => setForm(prev => ({ ...prev, method: event.target.value }))} required /></label>
          <label className="form__label">المرجع<input type="text" value={form.reference} onChange={event => setForm(prev => ({ ...prev, reference: event.target.value }))} /></label>
          <label className="form__label">ملاحظات<textarea value={form.notes} onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))} rows={3} /></label>
          {formError ? <div className="alert alert-danger">{formError}</div> : null}
          <div style={{ display: 'flex', gap: '8px' }}><button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ التحصيل'}</button><button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)}>إلغاء</button></div>
        </form>
      </DetailDrawer>
    </div>
  );
};

export default CollectionsPage;
