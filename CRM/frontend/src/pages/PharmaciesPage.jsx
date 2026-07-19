import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { createPharmacy, listPharmacies, pharmacyKeys, updatePharmacy } from '../api/endpoints/pharmacies';
import DetailDrawer from '../components/DetailDrawer';
import { normalizeRoleSlug } from './fieldRouteUtils';
import './EntityListPage.css';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const DEFAULT_FORM = {
  name: '',
  city: '',
  area: '',
  phone: '',
  email: '',
  notes: '',
  segment: '',
  tag: '',
};

const normalizePharmacy = pharmacy => ({
  id: pharmacy?.id ?? pharmacy?._id ?? pharmacy?.pharmacyId ?? pharmacy?.name,
  name: pharmacy?.name || 'صيدلية بدون اسم',
  city: pharmacy?.city || '',
  area: pharmacy?.area || pharmacy?.areaTag || '',
  phone: pharmacy?.phone || '',
  email: pharmacy?.email || '',
  notes: pharmacy?.notes || pharmacy?.comment || '',
  segment: pharmacy?.segment || pharmacy?.clientTag || pharmacy?.tag || 'صيدلية',
  tag: pharmacy?.tag || '',
});

const PharmacyForm = ({ initialValues, onSubmit, onCancel, submitting, error }) => {
  const [form, setForm] = useState(initialValues || DEFAULT_FORM);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = event => {
    event.preventDefault();
    onSubmit({
      name: form.name.trim(),
      city: form.city || null,
      area: form.area || null,
      phone: form.phone || null,
      email: form.email || null,
      notes: form.notes || null,
      segment: form.segment || null,
      tag: form.tag || null,
    });
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="form__label">
        الاسم
        <input type="text" value={form.name} onChange={e => updateField('name', e.target.value)} required />
      </label>
      <label className="form__label">
        المدينة
        <input type="text" value={form.city} onChange={e => updateField('city', e.target.value)} />
      </label>
      <label className="form__label">
        المنطقة
        <input type="text" value={form.area} onChange={e => updateField('area', e.target.value)} />
      </label>
      <label className="form__label">
        الشريحة
        <input type="text" value={form.segment} onChange={e => updateField('segment', e.target.value)} />
      </label>
      <label className="form__label">
        الوسم
        <input type="text" value={form.tag} onChange={e => updateField('tag', e.target.value)} />
      </label>
      <label className="form__label">
        الهاتف
        <input type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value)} />
      </label>
      <label className="form__label">
        البريد الإلكتروني
        <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} />
      </label>
      <label className="form__label">
        الملاحظات
        <textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} rows={3} />
      </label>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: '8px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'جاري الحفظ…' : 'حفظ'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          إلغاء
        </button>
      </div>
    </form>
  );
};

const PharmaciesPage = () => {
  const { token, user } = useAuth();
  const canManageCustomers = ['admin', 'sales_manager'].includes(normalizeRoleSlug(user));
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  const [selected, setSelected] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [formInitial, setFormInitial] = useState(DEFAULT_FORM);
  const [formError, setFormError] = useState(null);

  const queryParams = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search,
      city: cityFilter,
      area: areaFilter,
      segment: segmentFilter,
    }),
    [areaFilter, cityFilter, page, pageSize, search, segmentFilter],
  );

  const pharmaciesQuery = useQuery({
    queryKey: pharmacyKeys.list(queryParams),
    queryFn: () => listPharmacies(queryParams),
    enabled: !!token,
    keepPreviousData: true,
    select: data => {
      const rows = Array.isArray(data?.data) ? data.data.map(normalizePharmacy) : [];
      const total = data?.meta?.total ?? data?.pagination?.total ?? data?.total ?? rows.length;
      return { rows, total };
    },
  });

  const createMutation = useMutation({
    mutationFn: payload => createPharmacy(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.all });
      closeForm();
    },
    onError: error => setFormError(error.message || 'تعذر حفظ الصيدلية'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updatePharmacy(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.all });
      closeForm();
    },
    onError: error => setFormError(error.message || 'تعذر تحديث الصيدلية'),
  });

  const closeForm = () => {
    setFormMode(null);
    setFormInitial(DEFAULT_FORM);
    setFormError(null);
  };

  const openCreate = () => {
    setFormMode('create');
    setFormInitial(DEFAULT_FORM);
    setFormError(null);
  };

  const openEdit = pharmacy => {
    setFormMode('edit');
    setFormInitial({
      name: pharmacy.name || '',
      city: pharmacy.city || '',
      area: pharmacy.area || '',
      phone: pharmacy.phone || '',
      email: pharmacy.email || '',
      notes: pharmacy.notes || '',
      segment: pharmacy.segment || '',
      tag: pharmacy.tag || '',
    });
    setFormError(null);
  };

  const handleSubmit = payload => {
    setFormError(null);
    if (formMode === 'edit' && selected) {
      updateMutation.mutate({ id: selected.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const { rows: items = [], total = 0 } = pharmaciesQuery.data || {};
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const distinctCities = useMemo(() => {
    const values = new Set();
    items.forEach(item => item.city && values.add(item.city));
    return Array.from(values).sort();
  }, [items]);

  const distinctAreas = useMemo(() => {
    const values = new Set();
    items.forEach(item => item.area && values.add(item.area));
    return Array.from(values).sort();
  }, [items]);

  const distinctSegments = useMemo(() => {
    const values = new Set();
    items.forEach(item => item.segment && values.add(item.segment));
    return Array.from(values).sort();
  }, [items]);

  const resetFilters = () => {
    setSearch('');
    setCityFilter('');
    setAreaFilter('');
    setSegmentFilter('');
    setPage(1);
  };

  return (
    <div className="entity-page">
      <div className="entity-toolbar">
        <div>
          <h1 className="page-heading">الصيدليات</h1>
          <p className="page-subtitle">متابعة حسابات الصيدليات والتغطية.</p>
        </div>
        <div className="entity-search">
          <input
            type="search"
            className="input"
            placeholder="ابحث بالاسم أو المدينة"
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        {canManageCustomers && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            إضافة صيدلية
          </button>
        )}
      </div>

      <div className="entity-filters">
        <select className="input" value={cityFilter} onChange={event => setCityFilter(event.target.value)}>
          <option value="">كل المدن</option>
          {distinctCities.map(value => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select className="input" value={areaFilter} onChange={event => setAreaFilter(event.target.value)}>
          <option value="">كل المناطق</option>
          {distinctAreas.map(value => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select className="input" value={segmentFilter} onChange={event => setSegmentFilter(event.target.value)}>
          <option value="">كل الشرائح</option>
          {distinctSegments.map(value => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-secondary" onClick={resetFilters}>
          مسح الفلاتر
        </button>
      </div>

      <section className="table-card entity-table">
        {pharmaciesQuery.error && (
          <div className="entity-empty">تعذر تحميل الصيدليات: {pharmaciesQuery.error.message}</div>
        )}
        {!pharmaciesQuery.error && pharmaciesQuery.isLoading && (
          <div className="entity-empty">جاري تحميل الصيدليات...</div>
        )}
        {!pharmaciesQuery.error && !pharmaciesQuery.isLoading && items.length === 0 && (
          <div className="entity-empty">لا توجد صيدليات.</div>
        )}
        {!pharmaciesQuery.error && items.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الشريحة</th>
                <th>المدينة</th>
                <th>المنطقة</th>
                <th>الهاتف</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} onClick={() => setSelected(item)}>
                  <td>{item.name}</td>
                  <td>{item.segment || 'صيدلية'}</td>
                  <td>{item.city || '-'}</td>
                  <td>{item.area || '-'}</td>
                  <td>{item.phone || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="entity-pagination">
          <span>
            صفحة {page} من {totalPages}
          </span>
          <div>
            الصفوف
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
          <div>
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
        </div>
      </section>

      <DetailDrawer title={selected?.name || ''} isOpen={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected && (
          <div className="detail-grid">
            <p>
              <strong>المدينة:</strong> {selected.city || '-'}
            </p>
            <p>
              <strong>المنطقة:</strong> {selected.area || '-'}
            </p>
            <p>
              <strong>الشريحة:</strong> {selected.segment || 'صيدلية'}
            </p>
            <p>
              <strong>الهاتف:</strong> {selected.phone || '-'}
            </p>
            <p>
              <strong>البريد الإلكتروني:</strong> {selected.email || '-'}
            </p>
            {selected.notes && (
              <p>
                <strong>ملاحظات:</strong> {selected.notes}
              </p>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              {canManageCustomers && (
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

      <DetailDrawer
        title={formMode === 'edit' ? 'تعديل الصيدلية' : 'إضافة صيدلية'}
        isOpen={canManageCustomers && Boolean(formMode)}
        onClose={closeForm}
      >
        {formMode && (
          <PharmacyForm
            initialValues={formInitial}
            onSubmit={handleSubmit}
            onCancel={closeForm}
            submitting={createMutation.isPending || updateMutation.isPending}
            error={formError}
          />
        )}
      </DetailDrawer>
    </div>
  );
};

export default PharmaciesPage;

