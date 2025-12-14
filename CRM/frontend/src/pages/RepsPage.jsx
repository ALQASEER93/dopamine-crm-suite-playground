import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { createRep, deactivateRep, listReps, repKeys, updateRep } from '../api/reps';
import DetailDrawer from '../components/DetailDrawer';
import './EntityListPage.css';

const DEFAULT_FORM = {
  name: '',
  email: '',
  password: '',
  is_active: true,
};

const RepForm = ({ initialValues, onSubmit, onCancel, submitting, error, isEdit }) => {
  const [form, setForm] = useState(initialValues || DEFAULT_FORM);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = event => {
    event.preventDefault();
    onSubmit({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password || undefined,
      is_active: form.is_active,
    });
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="form__label">
        Name
        <input type="text" value={form.name} onChange={e => updateField('name', e.target.value)} required />
      </label>
      <label className="form__label">
        Email
        <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} required />
      </label>
      {!isEdit && (
        <label className="form__label">
          Password
          <input
            type="password"
            value={form.password}
            onChange={e => updateField('password', e.target.value)}
            required={!isEdit}
          />
        </label>
      )}
      <label className="form__label checkbox-row">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={e => updateField('is_active', e.target.checked)}
        />
        Active
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

const RepsPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [formInitial, setFormInitial] = useState(DEFAULT_FORM);
  const [formError, setFormError] = useState(null);

  const filters = useMemo(
    () => ({
      name: search || undefined,
    }),
    [search],
  );

  const repsQuery = useQuery({
    queryKey: repKeys.list(filters),
    queryFn: () => listReps(filters),
    enabled: !!token,
    select: data => (Array.isArray(data) ? data : []),
  });

  const createMutation = useMutation({
    mutationFn: payload => createRep(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repKeys.all });
      closeForm();
    },
    onError: error => setFormError(error.message || 'Unable to create rep'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateRep(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repKeys.all });
      closeForm();
    },
    onError: error => setFormError(error.message || 'Unable to update rep'),
  });

  const deleteMutation = useMutation({
    mutationFn: id => deactivateRep(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repKeys.all });
      setSelected(null);
    },
  });

  const openCreate = () => {
    setFormMode('create');
    setFormInitial(DEFAULT_FORM);
    setFormError(null);
  };

  const openEdit = rep => {
    setFormMode('edit');
    setFormInitial({
      name: rep.name || '',
      email: rep.email || '',
      password: '',
      is_active: rep.is_active ?? true,
    });
    setFormError(null);
  };

  const closeForm = () => {
    setFormMode(null);
    setFormInitial(DEFAULT_FORM);
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

  const reps = repsQuery.data || [];

  return (
    <div className="entity-page">
      <div className="entity-toolbar">
        <div>
          <h1 className="page-heading">Medical Reps</h1>
          <p className="page-subtitle">Manage field reps and their access.</p>
        </div>
        <div className="entity-search">
          <input
            type="search"
            className="input"
            placeholder="Search by name or email"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          Add rep
        </button>
      </div>

      <section className="table-card entity-table">
        {repsQuery.error && <div className="entity-empty">Unable to load reps: {repsQuery.error.message}</div>}
        {!repsQuery.error && repsQuery.isLoading && <div className="entity-empty">Loading reps...</div>}
        {!repsQuery.error && !repsQuery.isLoading && reps.length === 0 && (
          <div className="entity-empty">No reps found.</div>
        )}
        {!repsQuery.error && reps.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reps.map(rep => (
                <tr key={rep.id} onClick={() => setSelected(rep)}>
                  <td>{rep.name}</td>
                  <td>{rep.email}</td>
                  <td>{rep.role?.name || rep.role?.slug || 'Rep'}</td>
                  <td>{rep.is_active === false ? 'Inactive' : 'Active'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <DetailDrawer title={selected?.name || ''} isOpen={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected && (
          <div className="detail-grid">
            <p>
              <strong>Email:</strong> {selected.email}
            </p>
            <p>
              <strong>Status:</strong> {selected.is_active === false ? 'Inactive' : 'Active'}
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button type="button" className="btn btn-primary" onClick={() => openEdit(selected)}>
                Edit
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => deleteMutation.mutate(selected.id)}
                disabled={deleteMutation.isPending}
              >
                Deactivate
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </DetailDrawer>

      <DetailDrawer
        title={formMode === 'edit' ? 'Edit rep' : 'Add rep'}
        isOpen={Boolean(formMode)}
        onClose={closeForm}
      >
        {formMode && (
          <RepForm
            initialValues={formInitial}
            onSubmit={handleSubmit}
            onCancel={closeForm}
            submitting={createMutation.isPending || updateMutation.isPending}
            error={formError}
            isEdit={formMode === 'edit'}
          />
        )}
      </DetailDrawer>
    </div>
  );
};

export default RepsPage;
