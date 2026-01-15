import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { createDoctor, doctorKeys, listDoctors, updateDoctor } from '../api/endpoints/doctors';
import DetailDrawer from '../components/DetailDrawer';
import './EntityListPage.css';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const CLASSIFICATIONS = ['A', 'B', 'C'];

const DEFAULT_FORM = {
  name: '',
  specialty: '',
  city: '',
  area: '',
  classification: '',
  phone: '',
  mobile: '',
  email: '',
  notes: '',
};

const DoctorForm = ({ initialValues, onSubmit, onCancel, submitting, error }) => {
  const [form, setForm] = useState(initialValues || DEFAULT_FORM);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = event => {
    event.preventDefault();
    onSubmit({
      name: form.name.trim(),
      specialty: form.specialty || null,
      city: form.city || null,
      area: form.area || null,
      classification: form.classification || null,
      phone: form.phone || null,
      mobile: form.mobile || null,
      email: form.email || null,
      notes: form.notes || null,
    });
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="form__label">
        الاسم
        <input type="text" value={form.name} onChange={e => updateField('name', e.target.value)} required />
      </label>
      <label className="form__label">
        التخصص
        <input type="text" value={form.specialty} onChange={e => updateField('specialty', e.target.value)} />
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
        التصنيف
        <select value={form.classification} onChange={e => updateField('classification', e.target.value)}>
          <option value="">اختر</option>
          {CLASSIFICATIONS.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className="form__label">
        الهاتف
        <input type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value)} />
      </label>
      <label className="form__label">
        الجوال
        <input type="tel" value={form.mobile} onChange={e => updateField('mobile', e.target.value)} />
      </label>
      <label className="form__label">
        البريد الإلكتروني
        <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} />
      </label>
      <label className="form__label">
        ملاحظات
        <textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} rows={3} />
      </label>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: '8px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? '...جارٍ الحفظ' : 'حفظ'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          إلغاء
        </button>
      </div>
    </form>
  );
};

const DoctorsPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
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
      classification: classificationFilter,
    }),
    [areaFilter, classificationFilter, cityFilter, page, pageSize, search],
  );

  const doctorsQuery = useQuery({
    queryKey: doctorKeys.list(queryParams),
    queryFn: () => listDoctors(queryParams),
    enabled: !!token,
    keepPreviousData: true,
    select: data => {
      const rows = Array.isArray(data?.data) ? data.data : [];
      const pagination = data?.pagination || data?.meta;
      const total = pagination?.total ?? rows.length;
      return { rows, total };
    },
  });

  const createMutation = useMutation({
    mutationFn: payload => createDoctor(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: doctorKeys.all });
      closeForm();
    },
    onError: error => {
      setFormError(error.message || 'Unable to save doctor');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateDoctor(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: doctorKeys.all });
      closeForm();
    },
    onError: error => {
      setFormError(error.message || 'Unable to update doctor');
    },
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

  const openEdit = doctor => {
    setFormMode('edit');
    setFormInitial({
      name: doctor.name || '',
      specialty: doctor.specialty || '',
      city: doctor.city || '',
      area: doctor.area || '',
      classification: doctor.classification || '',
      phone: doctor.phone || '',
      mobile: doctor.mobile || '',
      email: doctor.email || '',
      notes: doctor.notes || '',
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

  const doctors = doctorsQuery.data?.rows || [];
  const total = doctorsQuery.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const distinctCities = useMemo(() => {
    const values = new Set();
    doctors.forEach(doctor => doctor.city && values.add(doctor.city));
    return Array.from(values).sort();
  }, [doctors]);

  const distinctAreas = useMemo(() => {
    const values = new Set();
    doctors.forEach(doctor => doctor.area && values.add(doctor.area));
    return Array.from(values).sort();
  }, [doctors]);

  const resetFilters = () => {
    setCityFilter('');
    setAreaFilter('');
    setClassificationFilter('');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="entity-page">
      <div className="entity-toolbar">
        <div>
          <h1 className="page-heading">الأطباء</h1>
          <p className="page-subtitle">إدارة الأطباء والملفات الطبية الأساسية.</p>
        </div>
        <div className="entity-search">
          <input
            type="search"
            className="input"
            placeholder="ابحث بالاسم أو العيادة"
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          إضافة طبيب
        </button>
      </div>

      <div className="entity-filters">
        <select className="input" value={cityFilter} onChange={event => setCityFilter(event.target.value)}>
          <option value="">كل المدن</option>
          {distinctCities.map(city => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        <select className="input" value={areaFilter} onChange={event => setAreaFilter(event.target.value)}>
          <option value="">كل المناطق</option>
          {distinctAreas.map(area => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={classificationFilter}
          onChange={event => setClassificationFilter(event.target.value)}
        >
          <option value="">كل التصنيفات</option>
          {CLASSIFICATIONS.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-secondary" onClick={resetFilters}>
          مسح الفلاتر
        </button>
      </div>

      <section className="table-card entity-table">
        {doctorsQuery.error && (
          <div className="entity-empty">تعذر تحميل الأطباء: {doctorsQuery.error.message}</div>
        )}
        {!doctorsQuery.error && doctorsQuery.isLoading && (
          <div className="entity-empty">جارٍ تحميل الأطباء...</div>
        )}
        {!doctorsQuery.error && !doctorsQuery.isLoading && doctors.length === 0 && (
          <div className="entity-empty">لا توجد نتائج مطابقة.</div>
        )}
        {!doctorsQuery.error && doctors.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>التخصص</th>
                <th>المدينة</th>
                <th>المنطقة</th>
                <th>التصنيف</th>
                <th>الهاتف</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map(doctor => (
                <tr key={doctor.id} onClick={() => setSelected(doctor)}>
                  <td>{doctor.name}</td>
                  <td>{doctor.specialty || '-'}</td>
                  <td>{doctor.city || '-'}</td>
                  <td>{doctor.area || '-'}</td>
                  <td>{doctor.classification || '-'}</td>
                  <td>{doctor.phone || doctor.mobile || '-'}</td>
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
              <strong>التخصص:</strong> {selected.specialty || '-'}
            </p>
            <p>
              <strong>المدينة:</strong> {selected.city || '-'}
            </p>
            <p>
              <strong>المنطقة:</strong> {selected.area || '-'}
            </p>
            <p>
              <strong>التصنيف:</strong> {selected.classification || '-'}
            </p>
            <p>
              <strong>الهاتف:</strong> {selected.phone || selected.mobile || '-'}
            </p>
            <p>
              <strong>البريد:</strong> {selected.email || '-'}
            </p>
            {selected.notes && (
              <p>
                <strong>ملاحظات:</strong> {selected.notes}
              </p>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button type="button" className="btn btn-primary" onClick={() => openEdit(selected)}>
                تعديل
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>
                إغلاق
              </button>
            </div>
          </div>
        )}
      </DetailDrawer>

      <DetailDrawer
        title={formMode === 'edit' ? 'تعديل طبيب' : 'إضافة طبيب'}
        isOpen={Boolean(formMode)}
        onClose={closeForm}
      >
        {formMode && (
          <DoctorForm
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

export default DoctorsPage;
