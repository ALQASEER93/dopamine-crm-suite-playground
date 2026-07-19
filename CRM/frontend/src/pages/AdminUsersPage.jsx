import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/client';
import { redactEmail } from './fieldRouteUtils';
import './AdminUsersPage.css';

const USER_TYPES = [
  { value: 'admin', label: 'مدير النظام' },
  { value: 'manager', label: 'مدير مبيعات' },
  { value: 'medical_rep', label: 'مندوب طبي' },
  { value: 'sales_rep', label: 'مندوب طبي' },
];

const statusLabel = isActive => (isActive ? 'نشط' : 'غير نشط');

export const normalizeAdminUsersResponse = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.users)) return data.users;
  return [];
};

export const normalizeTerritoriesResponse = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
};

const AdminUsersPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const roleSlug = user?.role?.slug;
  const isAdmin = roleSlug === 'sales_manager' || roleSlug === 'admin';

  const [formMode, setFormMode] = useState('create');
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    userType: 'sales_rep',
    territoryId: '',
    isActive: true,
  });
  const [formError, setFormError] = useState(null);

  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/users');
      return normalizeAdminUsersResponse(data);
    },
    enabled: isAdmin,
    staleTime: 30_000,
  });

  const territoriesQuery = useQuery({
    queryKey: ['admin', 'territories'],
    queryFn: async () => {
      const { data } = await apiClient.get('/territories?page=1&pageSize=500');
      return normalizeTerritoriesResponse(data);
    },
    enabled: isAdmin,
    staleTime: 5 * 60_000,
  });

  const saveUserMutation = useMutation({
    mutationFn: async payload => {
      if (formMode === 'create') {
        await apiClient.post('/admin/users', { body: payload });
      } else if (editingUser) {
        await apiClient.patch(`/admin/users/${editingUser.id}`, { body: payload });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      openCreate();
    },
    onError: error => {
      const apiMessage = (error?.payload && error.payload.message) || error?.message || 'تعذر حفظ المستخدم.';
      const details =
        Array.isArray(error?.payload?.errors) && error.payload.errors.length
          ? ` (${error.payload.errors[0]})`
          : '';
      setFormError(`${apiMessage}${details}`);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async userRow => {
      await apiClient.patch(`/admin/users/${userRow.id}`, { body: { isActive: !userRow.isActive } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onError: error => setFormError(error.message || 'تعذر تغيير حالة المستخدم.'),
  });

  const openCreate = () => {
    setFormMode('create');
    setEditingUser(null);
    setForm({
      name: '',
      email: '',
      password: '',
      userType: 'sales_rep',
      territoryId: '',
      isActive: true,
    });
    setFormError(null);
  };

  const openEdit = userRow => {
    setFormMode('edit');
    setEditingUser(userRow);
    setForm({
      name: userRow.name || '',
      email: userRow.email || '',
      password: '',
      userType:
        userRow.salesRep?.repType === 'medical_rep'
          ? 'medical_rep'
          : userRow.role?.slug === 'sales_manager'
          ? 'manager'
          : 'sales_rep',
      territoryId: userRow.salesRep?.territoryId || '',
      isActive: userRow.isActive !== false,
    });
    setFormError(null);
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setFormError(null);

    const payload = {
      name: form.name,
      email: form.email,
      userType: form.userType,
      territoryId: form.territoryId || null,
    };

    if (form.password) {
      payload.password = form.password;
    }
    if (formMode === 'edit') {
      payload.isActive = form.isActive;
    }

    saveUserMutation.mutate(payload);
  };

  const userRoleLabel = userRow => {
    if (userRow.salesRep?.repType === 'medical_rep') return 'مندوب طبي';
    if (userRow.role?.slug === 'sales_manager') return 'مدير مبيعات';
    if (userRow.role?.slug === 'sales_rep') return 'مندوب طبي';
    if (userRow.role?.slug === 'admin') return 'مدير النظام';
    return 'مستخدم';
  };

  const formTitle = formMode === 'create' ? 'إضافة مستخدم' : 'تعديل المستخدم';
  const isLoading = usersQuery.isLoading || territoriesQuery.isLoading;
  const users = usersQuery.data || [];
  const territories = territoriesQuery.data || [];

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="admin-users-page">
      <header className="admin-users-header">
        <div>
          <h1 className="page-heading">مستخدمو الإدارة</h1>
          <p className="page-subtitle">إدارة المستخدمين والأدوار والأقاليم.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          مستخدم جديد
        </button>
      </header>

      {usersQuery.error && (
        <div className="admin-users-alert">
          {usersQuery.error.message}
        </div>
      )}

      <div className="admin-users-grid">
        <section className="table-card admin-users-table">
            {isLoading ? (
              <p>جاري تحميل المستخدمين...</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>البريد الإلكتروني</th>
                    <th>الدور</th>
                    <th>الإقليم</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{redactEmail(u.email)}</td>
                      <td>{userRoleLabel(u)}</td>
                      <td>{u.salesRep?.territoryName || '-'}</td>
                      <td>{statusLabel(u.isActive)}</td>
                      <td style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => openEdit(u)}>
                          تعديل
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => toggleActiveMutation.mutate(u)}
                          disabled={toggleActiveMutation.isPending}
                        >
                          {u.isActive ? 'إيقاف' : 'تفعيل'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        لا يوجد مستخدمون.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
        </section>

        <section className="page-card admin-users-form-card">
            <h2>{formTitle}</h2>
            {formError && (
              <div className="admin-users-alert">
                {formError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="form">
              <label className="form__label">
                الاسم
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </label>
              <label className="form__label">
                البريد الإلكتروني
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  autoComplete="username"
                  required
                />
              </label>
              <label className="form__label">
                كلمة المرور {formMode === 'edit' ? '(اتركها فارغة للاحتفاظ بالحالية)' : ''}
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                  minLength={formMode === 'create' ? 6 : undefined}
                  autoComplete="new-password"
                  required={formMode === 'create'}
                />
              </label>
              <label className="form__label">
                نوع المستخدم
                <select value={form.userType} onChange={e => setForm(prev => ({ ...prev, userType: e.target.value }))}>
                  {USER_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              {(form.userType === 'medical_rep' || form.userType === 'sales_rep') && (
                <label className="form__label">
                  الإقليم
                  <select
                    value={form.territoryId}
                    onChange={e => setForm(prev => ({ ...prev, territoryId: e.target.value }))}
                  >
                    <option value="">(اختياري)</option>
                    {territories.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {formMode === 'edit' && (
                <label className="form__label">
                  الحالة
                  <select
                    value={form.isActive ? 'active' : 'inactive'}
                    onChange={e => setForm(prev => ({ ...prev, isActive: e.target.value === 'active' }))}
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </label>
              )}

              <div className="admin-users-actions">
                <button type="submit" className="btn btn-primary" disabled={saveUserMutation.isPending}>
                  {saveUserMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                {formMode === 'edit' && (
                  <button type="button" className="btn btn-secondary" onClick={openCreate}>
                    إلغاء
                  </button>
                )}
              </div>
            </form>
        </section>
      </div>
    </div>
  );
};

export default AdminUsersPage;
