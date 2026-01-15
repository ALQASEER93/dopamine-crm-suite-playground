import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import DataTable from '../components/DataTable';
import DetailDrawer from '../components/DetailDrawer';
import { useToast } from '../components/ToastProvider';
import { listProducts } from '../api/endpoints/products';
import { listReps } from '../api/reps';
import {
  createLocation,
  createMovement,
  exportLocations,
  exportMovements,
  listLocations,
  listMovements,
  stockKeys,
} from '../api/endpoints/stock';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const LOCATION_TYPES = [
  { value: 'warehouse', label: 'مستودع' },
  { value: 'rep_car', label: 'سيارة مندوب' },
];
const REASONS = [
  { value: 'sale', label: 'بيع' },
  { value: 'samples', label: 'عينات' },
  { value: 'return', label: 'مرتجع' },
  { value: 'damage', label: 'تلف' },
  { value: 'expiry', label: 'منتهي الصلاحية' },
];

const StockPage = () => {
  const { token, user } = useAuth();
  const roleSlug = user?.role?.slug;
  const canManage = roleSlug === 'admin' || roleSlug === 'sales_manager' || roleSlug === 'medical_rep';
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [locationFormOpen, setLocationFormOpen] = useState(false);
  const [movementFormOpen, setMovementFormOpen] = useState(false);
  const [locationForm, setLocationForm] = useState({ name: '', location_type: 'warehouse', rep_id: '' });
  const [movementForm, setMovementForm] = useState({
    product_id: '',
    quantity: 1,
    reason: 'sale',
    location_from_id: '',
    location_to_id: '',
    notes: '',
  });
  const [movementFilters, setMovementFilters] = useState({ product_id: '', location_id: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);

  const locationsQuery = useQuery({
    queryKey: stockKeys.locations,
    queryFn: () => listLocations(),
    enabled: !!token,
  });

  const movementsQuery = useQuery({
    queryKey: stockKeys.movements({ page, page_size: pageSize, ...movementFilters }),
    queryFn: () => listMovements({ page, page_size: pageSize, ...movementFilters }),
    enabled: !!token,
    keepPreviousData: true,
    select: data => {
      const rows = Array.isArray(data?.data) ? data.data : [];
      const pagination = data?.pagination || data?.meta;
      const total = pagination?.total ?? rows.length;
      return { rows, total };
    },
  });

  const productsQuery = useQuery({
    queryKey: ['stock', 'products'],
    queryFn: () => listProducts({ page: 1, page_size: 500, is_active: true }),
    enabled: !!token,
    select: data => data?.data ?? [],
  });

  const repsQuery = useQuery({
    queryKey: ['stock', 'reps'],
    queryFn: () => listReps({ include_inactive: true }),
    enabled: !!token,
  });

  const createLocationMutation = useMutation({
    mutationFn: payload => createLocation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.locations });
      setLocationFormOpen(false);
      setLocationForm({ name: '', location_type: 'warehouse', rep_id: '' });
      pushToast({ type: 'success', title: 'تم الحفظ', message: 'تم إنشاء موقع المخزون.' });
    },
    onError: error => pushToast({ type: 'error', title: 'خطأ', message: error.message || 'تعذر إنشاء الموقع.' }),
  });

  const createMovementMutation = useMutation({
    mutationFn: payload => createMovement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.movements() });
      setMovementFormOpen(false);
      setMovementForm({ product_id: '', quantity: 1, reason: 'sale', location_from_id: '', location_to_id: '', notes: '' });
      pushToast({ type: 'success', title: 'تم الحفظ', message: 'تم تسجيل حركة المخزون.' });
    },
    onError: error => pushToast({ type: 'error', title: 'خطأ', message: error.message || 'تعذر تسجيل الحركة.' }),
  });

  const handleExportLocations = async () => {
    try {
      const { blob, response } = await exportLocations();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename =
        response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/\"/g, '') ||
        `stock-locations-${new Date().toISOString().slice(0, 10)}.csv`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      pushToast({ type: 'error', title: 'خطأ', message: error.message || 'تعذر تصدير المواقع.' });
    }
  };

  const handleExportMovements = async () => {
    try {
      const { blob, response } = await exportMovements(movementFilters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename =
        response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/\"/g, '') ||
        `stock-movements-${new Date().toISOString().slice(0, 10)}.csv`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      pushToast({ type: 'error', title: 'خطأ', message: error.message || 'تعذر تصدير الحركات.' });
    }
  };

  const locations = locationsQuery.data || [];
  const movements = movementsQuery.data?.rows || [];
  const total = movementsQuery.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const products = productsQuery.data || [];
  const reps = repsQuery.data || [];

  const locationColumns = [
    { key: 'name', header: 'الموقع' },
    { key: 'location_type', header: 'النوع', render: row => (row.location_type === 'warehouse' ? 'مستودع' : 'سيارة مندوب') },
    { key: 'rep_id', header: 'المندوب', render: row => reps.find(rep => rep.id === row.rep_id)?.name || '-' },
  ];

  const movementColumns = [
    { key: 'movement_date', header: 'التاريخ', render: row => new Date(row.movement_date).toLocaleString() },
    { key: 'product_id', header: 'المنتج', render: row => products.find(p => p.id === row.product_id)?.name || row.product_id },
    { key: 'quantity', header: 'الكمية' },
    { key: 'reason', header: 'السبب', render: row => REASONS.find(r => r.value === row.reason)?.label || row.reason },
    {
      key: 'locations',
      header: 'المواقع',
      render: row => {
        const from = locations.find(loc => loc.id === row.location_from_id)?.name || '-';
        const to = locations.find(loc => loc.id === row.location_to_id)?.name || '-';
        return `${from} → ${to}`;
      },
    },
  ];

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">المخزون</h1>
          <p className="page-subtitle">إدارة المواقع وحركات المخزون مع التتبع الكامل.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={handleExportMovements}>
            تصدير الحركات
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleExportLocations}>
            تصدير المواقع
          </button>
          {canManage && (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setLocationFormOpen(true)}>
                موقع جديد
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setMovementFormOpen(true)}>
                حركة جديدة
              </button>
            </>
          )}
        </div>
      </div>

      <DataTable
        columns={locationColumns}
        rows={locations}
        loading={locationsQuery.isLoading}
        emptyMessage="لا توجد مواقع مخزون."
      />

      <DataTable
        columns={movementColumns}
        rows={movements}
        loading={movementsQuery.isLoading}
        emptyMessage="لا توجد حركات مخزون."
        filters={
          <>
            <select
              className="input"
              value={movementFilters.product_id}
              onChange={event => {
                setMovementFilters(prev => ({ ...prev, product_id: event.target.value }));
                setPage(1);
              }}
            >
              <option value="">كل المنتجات</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={movementFilters.location_id}
              onChange={event => {
                setMovementFilters(prev => ({ ...prev, location_id: event.target.value }));
                setPage(1);
              }}
            >
              <option value="">كل المواقع</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
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

      <DetailDrawer title="موقع جديد" isOpen={locationFormOpen} onClose={() => setLocationFormOpen(false)}>
        <form
          className="form"
          onSubmit={event => {
            event.preventDefault();
            createLocationMutation.mutate({
              name: locationForm.name,
              location_type: locationForm.location_type,
              rep_id: locationForm.rep_id ? Number(locationForm.rep_id) : null,
            });
          }}
        >
          <label className="form__label">
            اسم الموقع
            <input
              type="text"
              value={locationForm.name}
              onChange={event => setLocationForm(prev => ({ ...prev, name: event.target.value }))}
              required
            />
          </label>
          <label className="form__label">
            النوع
            <select
              value={locationForm.location_type}
              onChange={event => setLocationForm(prev => ({ ...prev, location_type: event.target.value }))}
            >
              {LOCATION_TYPES.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {locationForm.location_type === 'rep_car' && (
            <label className="form__label">
              المندوب
              <select
                value={locationForm.rep_id}
                onChange={event => setLocationForm(prev => ({ ...prev, rep_id: event.target.value }))}
              >
                <option value="">اختر</option>
                {reps.map(rep => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary" disabled={createLocationMutation.isPending}>
              {createLocationMutation.isPending ? '...جارٍ الحفظ' : 'حفظ'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setLocationFormOpen(false)}>
              إلغاء
            </button>
          </div>
        </form>
      </DetailDrawer>

      <DetailDrawer title="حركة جديدة" isOpen={movementFormOpen} onClose={() => setMovementFormOpen(false)}>
        <form
          className="form"
          onSubmit={event => {
            event.preventDefault();
            createMovementMutation.mutate({
              product_id: Number(movementForm.product_id),
              quantity: Number(movementForm.quantity),
              reason: movementForm.reason,
              location_from_id: movementForm.location_from_id ? Number(movementForm.location_from_id) : null,
              location_to_id: movementForm.location_to_id ? Number(movementForm.location_to_id) : null,
              notes: movementForm.notes || null,
            });
          }}
        >
          <label className="form__label">
            المنتج
            <select
              value={movementForm.product_id}
              onChange={event => setMovementForm(prev => ({ ...prev, product_id: event.target.value }))}
              required
            >
              <option value="">اختر</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form__label">
            الكمية
            <input
              type="number"
              min={1}
              value={movementForm.quantity}
              onChange={event => setMovementForm(prev => ({ ...prev, quantity: event.target.value }))}
              required
            />
          </label>
          <label className="form__label">
            السبب
            <select
              value={movementForm.reason}
              onChange={event => setMovementForm(prev => ({ ...prev, reason: event.target.value }))}
            >
              {REASONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form__label">
            من موقع
            <select
              value={movementForm.location_from_id}
              onChange={event => setMovementForm(prev => ({ ...prev, location_from_id: event.target.value }))}
            >
              <option value="">-</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form__label">
            إلى موقع
            <select
              value={movementForm.location_to_id}
              onChange={event => setMovementForm(prev => ({ ...prev, location_to_id: event.target.value }))}
            >
              <option value="">-</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form__label">
            ملاحظات
            <textarea
              rows={3}
              value={movementForm.notes}
              onChange={event => setMovementForm(prev => ({ ...prev, notes: event.target.value }))}
            />
          </label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary" disabled={createMovementMutation.isPending}>
              {createMovementMutation.isPending ? '...جارٍ الحفظ' : 'حفظ'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setMovementFormOpen(false)}>
              إلغاء
            </button>
          </div>
        </form>
      </DetailDrawer>
    </div>
  );
};

export default StockPage;

