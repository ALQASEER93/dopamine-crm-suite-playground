import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { createDoctor, doctorKeys, listDoctors, updateDoctor } from '../api/endpoints/doctors';
import DetailDrawer from '../components/DetailDrawer';
import './EntityListPage.css';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const DEFAULT_FORM = {
  name: '',
  specialty: '',
  city: '',
  area: '',
  territoryId: '',
  phone: '',
  email: '',
  notes: '',
  segment: '',
};

const normalizeDoctor = doctor => {
  const name =
    doctor?.name ||
    [doctor?.firstName, doctor?.lastName].filter(Boolean).join(' ').trim() ||
    'Unnamed doctor';

  return {
    id: doctor?.id ?? doctor?._id ?? doctor?.doctorId ?? name,
    name,
    specialty: doctor?.specialty || doctor?.speciality || '',
    city: doctor?.city || doctor?.region || '',
    area: doctor?.area || doctor?.areaTag || '',
    segment: doctor?.segment || doctor?.tag || doctor?.clientTag || '',
    phone: doctor?.phone || doctor?.mobile || '',
    email: doctor?.email || '',
    notes: doctor?.comment || doctor?.notes || '',
    territoryId: doctor?.territoryId || doctor?.territory_id || doctor?.territory?.id || '',
    territoryName: doctor?.territory?.name || '',
    raw: doctor || {},
  };
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
      territoryId: form.territoryId || null,
      phone: form.phone || null,
      email: form.email || null,
      notes: form.notes || null,
      segment: form.segment || null,
    });
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="form__label">
        Name
        <input type="text" value={form.name} onChange={e => updateField('name', e.target.value)} required />
      </label>
      <label className="form__label">
        Specialty
        <input type="text" value={form.specialty} onChange={e => updateField('specialty', e.target.value)} />
      </label>
      <label className="form__label">
        City
        <input type="text" value={form.city} onChange={e => updateField('city', e.target.value)} />
      </label>
      <label className="form__label">
        Area
        <input type="text" value={form.area} onChange={e => updateField('area', e.target.value)} />
      </label>
      <label className="form__label">
        Territory ID
        <input
          type="text"
          value={form.territoryId}
          onChange={e => updateField('territoryId', e.target.value)}
          placeholder="Optional"
        />
      </label>
      <label className="form__label">
        Segment
        <input type="text" value={form.segment} onChange={e => updateField('segment', e.target.value)} />
      </label>
      <label className="form__label">
        Phone
        <input type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value)} />
      </label>
      <label className="form__label">
        Email
        <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} />
      </label>
      <label className="form__label">
        Notes
        <textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} rows={3} />
      </label>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: '8px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
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
  const [specialtyFilter, setSpecialtyFilter] = useState('');
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
      pageSize,
      search,
      city: cityFilter,
      specialty: specialtyFilter,
      segment: segmentFilter,
    }),
    [cityFilter, page, pageSize, search, segmentFilter, specialtyFilter],
  );

  const doctorsQuery = useQuery({
    queryKey: doctorKeys.list(queryParams),
    queryFn: () => listDoctors(queryParams),
    enabled: !!token,
    keepPreviousData: true,
    select: data => {
      const rows = Array.isArray(data?.data) ? data.data.map(normalizeDoctor) : [];
      const total = data?.meta?.total ?? data?.pagination?.total ?? data?.total ?? rows.length;
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
      territoryId: doctor.territoryId || '',
      phone: doctor.phone || '',
      email: doctor.email || '',
      notes: doctor.notes || '',
      segment: doctor.segment || '',
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

  const { rows: doctors = [], total = 0 } = doctorsQuery.data || {};
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const distinctCities = useMemo(() => {
    const values = new Set();
    doctors.forEach(doctor => doctor.city && values.add(doctor.city));
    return Array.from(values).sort();
  }, [doctors]);

  const distinctSpecialties = useMemo(() => {
    const values = new Set();
    doctors.forEach(doctor => doctor.specialty && values.add(doctor.specialty));
    return Array.from(values).sort();
  }, [doctors]);

  const distinctSegments = useMemo(() => {
    const values = new Set();
    doctors.forEach(doctor => doctor.segment && values.add(doctor.segment));
    return Array.from(values).sort();
  }, [doctors]);

  const resetFilters = () => {
    setCityFilter('');
    setSpecialtyFilter('');
    setSegmentFilter('');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="entity-page">
      <div className="entity-toolbar">
        <div>
          <h1 className="page-heading">Doctors</h1>
          <p className="page-subtitle">Browse, create, and update healthcare professionals.</p>
        </div>
        <div className="entity-search">
          <input
            type="search"
            className="input"
            placeholder="Search by name, specialty, or city"
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          Add doctor
        </button>
      </div>

      <div className="entity-filters">
        <select className="input" value={cityFilter} onChange={event => setCityFilter(event.target.value)}>
          <option value="">All cities</option>
          {distinctCities.map(city => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={specialtyFilter}
          onChange={event => setSpecialtyFilter(event.target.value)}
        >
          <option value="">All specialties</option>
          {distinctSpecialties.map(specialty => (
            <option key={specialty} value={specialty}>
              {specialty}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={segmentFilter}
          onChange={event => setSegmentFilter(event.target.value)}
        >
          <option value="">All segments</option>
          {distinctSegments.map(segment => (
            <option key={segment} value={segment}>
              {segment}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-secondary" onClick={resetFilters}>
          Clear filters
        </button>
      </div>

      <section className="table-card entity-table">
        {doctorsQuery.error && (
          <div className="entity-empty">Unable to load doctors: {doctorsQuery.error.message}</div>
        )}
        {!doctorsQuery.error && doctorsQuery.isLoading && (
          <div className="entity-empty">Loading doctors...</div>
        )}
        {!doctorsQuery.error && !doctorsQuery.isLoading && doctors.length === 0 && (
          <div className="entity-empty">No doctors found for the selected filters.</div>
        )}
        {!doctorsQuery.error && doctors.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Specialty</th>
                <th>City</th>
                <th>Area</th>
                <th>Segment</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map(doctor => (
                <tr key={doctor.id} onClick={() => setSelected(doctor)}>
                  <td>{doctor.name}</td>
                  <td>{doctor.specialty || '-'}</td>
                  <td>{doctor.city || '-'}</td>
                  <td>{doctor.area || '-'}</td>
                  <td>{doctor.segment || '-'}</td>
                  <td>{doctor.phone || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="entity-pagination">
          <span>
            Page {page} of {totalPages}
          </span>
          <div>
            Rows
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
              Prev
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <DetailDrawer title={selected?.name || ''} isOpen={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected && (
          <div className="detail-grid">
            <p>
              <strong>Specialty:</strong> {selected.specialty || '-'}
            </p>
            <p>
              <strong>City:</strong> {selected.city || '-'}
            </p>
            <p>
              <strong>Area:</strong> {selected.area || '-'}
            </p>
            <p>
              <strong>Segment:</strong> {selected.segment || '-'}
            </p>
            <p>
              <strong>Territory:</strong> {selected.territoryName || selected.territoryId || '-'}
            </p>
            <p>
              <strong>Phone:</strong> {selected.phone || '-'}
            </p>
            <p>
              <strong>Email:</strong> {selected.email || '-'}
            </p>
            {selected.notes && (
              <p>
                <strong>Notes:</strong> {selected.notes}
              </p>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button type="button" className="btn btn-primary" onClick={() => openEdit(selected)}>
                Edit
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </DetailDrawer>

      <DetailDrawer
        title={formMode === 'edit' ? 'Edit doctor' : 'Add doctor'}
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
