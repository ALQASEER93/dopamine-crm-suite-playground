import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DetailDrawer from '../components/DetailDrawer';
import { useAuth } from '../auth/AuthContext';
import { listProducts, productKeys } from '../api/products';
import { listReps, repKeys } from '../api/reps';
import { stockKeys, listStockLocations, listStockMovements, createStockLocation, createStockMovement } from '../api/stock';
import './EntityListPage.css';

const REASONS = ['sale', 'samples', 'return', 'damage', 'expiry'];
const DEFAULT_LOCATION = { name: '', location_type: 'warehouse', rep_id: '' };
const DEFAULT_MOVEMENT = { location_from_id: '', location_to_id: '', product_id: '', quantity: 1, reason: 'sale', notes: '' };

const quantitySum = items => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

const StockPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ product_id: '', location_id: '' });
  const [locationFormOpen, setLocationFormOpen] = useState(false);
  const [movementFormOpen, setMovementFormOpen] = useState(false);
  const [locationForm, setLocationForm] = useState(DEFAULT_LOCATION);
  const [movementForm, setMovementForm] = useState(DEFAULT_MOVEMENT);
  const [formError, setFormError] = useState(null);

  const locationsQuery = useQuery({ queryKey: stockKeys.locations, queryFn: listStockLocations, enabled: !!token });
  const movementsQuery = useQuery({
    queryKey: stockKeys.movements(filters),
    queryFn: () => listStockMovements({ ...filters, page: 1, page_size: 50 }),
    enabled: !!token,
  });
  const productsQuery = useQuery({ queryKey: productKeys.list({ page_size: 200 }), queryFn: () => listProducts({ page_size: 200 }), enabled: !!token });
  const repsQuery = useQuery({ queryKey: repKeys.list({}), queryFn: () => listReps(), enabled: !!token });

  const createLocationMutation = useMutation({
    mutationFn: createStockLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.locations });
      setLocationForm(DEFAULT_LOCATION);
      setLocationFormOpen(false);
      setFormError(null);
    },
    onError: error => setFormError(error.message || 'تعذر إنشاء الموقع'),
  });

  const createMovementMutation = useMutation({
    mutationFn: createStockMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
      setMovementForm(DEFAULT_MOVEMENT);
      setMovementFormOpen(false);
      setFormError(null);
    },
    onError: error => setFormError(error.message || 'تعذر تسجيل الحركة'),
  });

  const locations = locationsQuery.data || [];
  const movements = movementsQuery.data?.data || [];
  const products = productsQuery.data?.data || [];
  const reps = repsQuery.data || [];
  const summary = useMemo(() => ({ movementCount: movements.length, quantity: quantitySum(movements), locations: locations.length }), [locations, movements]);

  return (
    <div className="entity-page">
      <div className="entity-toolbar">
        <div>
          <h1 className="page-heading">المخزون</h1>
          <p className="page-subtitle">متابعة المواقع وحركات المخزون المسجلة على النظام الحالي.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setLocationFormOpen(true)}>موقع جديد</button>
          <button type="button" className="btn btn-primary" onClick={() => setMovementFormOpen(true)}>حركة مخزون</button>
        </div>
      </div>

      <section className="table-card" style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div><strong>{summary.locations}</strong><div className="page-subtitle">مواقع مخزون</div></div>
        <div><strong>{summary.movementCount}</strong><div className="page-subtitle">الحركات المعروضة</div></div>
        <div><strong>{summary.quantity}</strong><div className="page-subtitle">إجمالي الكمية المتحركة</div></div>
      </section>

      <div className="entity-filters">
        <select className="input" value={filters.product_id} onChange={event => setFilters(prev => ({ ...prev, product_id: event.target.value }))}>
          <option value="">كل المنتجات</option>
          {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
        <select className="input" value={filters.location_id} onChange={event => setFilters(prev => ({ ...prev, location_id: event.target.value }))}>
          <option value="">كل المواقع</option>
          {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
        </select>
        <button type="button" className="btn btn-secondary" onClick={() => setFilters({ product_id: '', location_id: '' })}>مسح الفلاتر</button>
      </div>

      <section className="table-card" style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'minmax(260px, 320px) 1fr' }}>
        <div>
          <h2 style={{ marginTop: 0 }}>المواقع</h2>
          {locationsQuery.isLoading ? <div className="entity-empty">جاري تحميل المواقع...</div> : null}
          {locationsQuery.error ? <div className="entity-empty">تعذر تحميل المواقع: {locationsQuery.error.message}</div> : null}
          {!locationsQuery.isLoading && !locations.length ? <div className="entity-empty">لا توجد مواقع مخزون.</div> : null}
          <div style={{ display: 'grid', gap: '8px' }}>
            {locations.map(location => (
              <div key={location.id} style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px' }}>
                <strong>{location.name}</strong>
                <div className="page-subtitle">{location.location_type === 'warehouse' ? 'مخزن' : 'سيارة مندوب'}</div>
                <div className="page-subtitle">{location.rep_id ? `مندوب #${location.rep_id}` : 'بدون ربط مندوب'}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="entity-table">
          <h2 style={{ marginTop: 0 }}>حركات المخزون</h2>
          {movementsQuery.isLoading ? <div className="entity-empty">جاري تحميل الحركات...</div> : null}
          {movementsQuery.error ? <div className="entity-empty">تعذر تحميل الحركات: {movementsQuery.error.message}</div> : null}
          {!movementsQuery.isLoading && !movements.length ? <div className="entity-empty">لا توجد حركات مطابقة.</div> : null}
          {movements.length ? (
            <table>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>المنتج</th>
                  <th>من</th>
                  <th>إلى</th>
                  <th>الكمية</th>
                  <th>السبب</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(movement => (
                  <tr key={movement.id}>
                    <td>{new Date(movement.movement_date).toLocaleString('en-GB')}</td>
                    <td>{products.find(product => product.id === movement.product_id)?.name || `#${movement.product_id}`}</td>
                    <td>{locations.find(location => location.id === movement.location_from_id)?.name || '-'}</td>
                    <td>{locations.find(location => location.id === movement.location_to_id)?.name || '-'}</td>
                    <td>{movement.quantity}</td>
                    <td>{movement.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </section>

      <DetailDrawer title="إضافة موقع مخزون" isOpen={locationFormOpen} onClose={() => setLocationFormOpen(false)}>
        <form className="form" onSubmit={event => {
          event.preventDefault();
          createLocationMutation.mutate({
            name: locationForm.name,
            location_type: locationForm.location_type,
            rep_id: locationForm.location_type === 'rep_car' && locationForm.rep_id ? Number(locationForm.rep_id) : null,
          });
        }}>
          <label className="form__label">الاسم<input type="text" value={locationForm.name} onChange={event => setLocationForm(prev => ({ ...prev, name: event.target.value }))} required /></label>
          <label className="form__label">النوع<select value={locationForm.location_type} onChange={event => setLocationForm(prev => ({ ...prev, location_type: event.target.value, rep_id: '' }))}><option value="warehouse">warehouse</option><option value="rep_car">rep_car</option></select></label>
          {locationForm.location_type === 'rep_car' ? (
            <label className="form__label">المندوب<select value={locationForm.rep_id} onChange={event => setLocationForm(prev => ({ ...prev, rep_id: event.target.value }))} required><option value="">اختر المندوب</option>{reps.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label>
          ) : null}
          {formError ? <div className="alert alert-danger">{formError}</div> : null}
          <div style={{ display: 'flex', gap: '8px' }}><button type="submit" className="btn btn-primary" disabled={createLocationMutation.isPending}>{createLocationMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ الموقع'}</button><button type="button" className="btn btn-secondary" onClick={() => setLocationFormOpen(false)}>إلغاء</button></div>
        </form>
      </DetailDrawer>

      <DetailDrawer title="تسجيل حركة مخزون" isOpen={movementFormOpen} onClose={() => setMovementFormOpen(false)}>
        <form className="form" onSubmit={event => {
          event.preventDefault();
          createMovementMutation.mutate({
            location_from_id: movementForm.location_from_id ? Number(movementForm.location_from_id) : null,
            location_to_id: movementForm.location_to_id ? Number(movementForm.location_to_id) : null,
            product_id: Number(movementForm.product_id),
            quantity: Number(movementForm.quantity),
            reason: movementForm.reason,
            notes: movementForm.notes || null,
          });
        }}>
          <label className="form__label">المنتج<select value={movementForm.product_id} onChange={event => setMovementForm(prev => ({ ...prev, product_id: event.target.value }))} required><option value="">اختر المنتج</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label className="form__label">من موقع<select value={movementForm.location_from_id} onChange={event => setMovementForm(prev => ({ ...prev, location_from_id: event.target.value }))}><option value="">بدون</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          <label className="form__label">إلى موقع<select value={movementForm.location_to_id} onChange={event => setMovementForm(prev => ({ ...prev, location_to_id: event.target.value }))}><option value="">بدون</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          <label className="form__label">الكمية<input type="number" min="1" value={movementForm.quantity} onChange={event => setMovementForm(prev => ({ ...prev, quantity: event.target.value }))} required /></label>
          <label className="form__label">السبب<select value={movementForm.reason} onChange={event => setMovementForm(prev => ({ ...prev, reason: event.target.value }))}>{REASONS.map(reason => <option key={reason} value={reason}>{reason}</option>)}</select></label>
          <label className="form__label">ملاحظات<textarea value={movementForm.notes} onChange={event => setMovementForm(prev => ({ ...prev, notes: event.target.value }))} rows={3} /></label>
          {formError ? <div className="alert alert-danger">{formError}</div> : null}
          <div style={{ display: 'flex', gap: '8px' }}><button type="submit" className="btn btn-primary" disabled={createMovementMutation.isPending}>{createMovementMutation.isPending ? 'جارٍ الحفظ...' : 'تسجيل الحركة'}</button><button type="button" className="btn btn-secondary" onClick={() => setMovementFormOpen(false)}>إلغاء</button></div>
        </form>
      </DetailDrawer>
    </div>
  );
};

export default StockPage;
