import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const getRoleSlug = user => {
  const rawRole = user?.role?.slug || user?.roleSlug || user?.role || '';
  if (typeof rawRole === 'string') return rawRole.toLowerCase();
  if (rawRole && typeof rawRole === 'object' && rawRole.slug) return String(rawRole.slug).toLowerCase();
  return '';
};

const KOLDirectoryPage = () => {
  const { token, user } = useAuth();
  const roleSlug = useMemo(() => getRoleSlug(user), [user]);
  const canManageKols = roleSlug === 'admin' || roleSlug === 'sales_manager';

  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    specialty: '',
    institution: '',
    city: '',
    influence_level: 'B',
  });
  const [notice, setNotice] = useState(null);

  const kolsQuery = useQuery({
    queryKey: ['medical-affairs', 'kols', search],
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: '200' });
      if (search.trim()) params.set('q', search.trim());
      const { data } = await apiClient.get(`/medical-affairs/kols?${params.toString()}`);
      return Array.isArray(data?.data) ? data.data : [];
    },
    enabled: !!token,
  });

  const handleCreate = async event => {
    event.preventDefault();
    setNotice(null);
    try {
      await apiClient.post('/medical-affairs/kols', { body: form });
      setNotice({ type: 'success', text: 'تمت إضافة KOL.' });
      setForm({
        name: '',
        specialty: '',
        institution: '',
        city: '',
        influence_level: 'B',
      });
      await kolsQuery.refetch();
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'تعذر إضافة KOL.' });
    }
  };

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">دليل KOL</h1>
          <p className="page-subtitle">بحث وإدارة قادة الرأي الطبي.</p>
        </div>
      </div>

      <section className="page-card">
        <label style={{ maxWidth: '420px' }}>
          <span>بحث</span>
          <input className="input" value={search} onChange={event => setSearch(event.target.value)} placeholder="الاسم أو التخصص أو المؤسسة" />
        </label>
      </section>

      {canManageKols && (
        <section className="page-card">
          <h2 style={{ marginTop: 0 }}>إضافة KOL</h2>
          <form
            onSubmit={handleCreate}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}
          >
            <label>
              <span>الاسم</span>
              <input className="input" value={form.name} onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))} required />
            </label>
            <label>
              <span>التخصص</span>
              <input className="input" value={form.specialty} onChange={event => setForm(prev => ({ ...prev, specialty: event.target.value }))} />
            </label>
            <label>
              <span>المؤسسة</span>
              <input className="input" value={form.institution} onChange={event => setForm(prev => ({ ...prev, institution: event.target.value }))} />
            </label>
            <label>
              <span>المدينة</span>
              <input className="input" value={form.city} onChange={event => setForm(prev => ({ ...prev, city: event.target.value }))} />
            </label>
            <label>
              <span>مستوى التأثير</span>
              <select
                className="input"
                value={form.influence_level}
                onChange={event => setForm(prev => ({ ...prev, influence_level: event.target.value }))}
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </label>
            <div style={{ alignSelf: 'end' }}>
              <button type="submit" className="btn btn-primary">
                إضافة
              </button>
            </div>
          </form>
          {notice && (
            <p style={{ marginBottom: 0, color: notice.type === 'error' ? 'var(--color-error-text)' : 'var(--color-text)' }}>{notice.text}</p>
          )}
        </section>
      )}

      <section className="page-card">
        {kolsQuery.error && <div className="table-card__empty">تعذر تحميل دليل KOL: {kolsQuery.error.message}</div>}
        {kolsQuery.isLoading && !kolsQuery.error && <div className="table-card__empty">جاري تحميل البيانات...</div>}
        {!kolsQuery.isLoading && !kolsQuery.error && (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>التخصص</th>
                  <th>المؤسسة</th>
                  <th>المدينة</th>
                  <th>التأثير</th>
                  <th>Engagement</th>
                </tr>
              </thead>
              <tbody>
                {(kolsQuery.data || []).length === 0 && (
                  <tr>
                    <td colSpan={6}>لا توجد نتائج.</td>
                  </tr>
                )}
                {(kolsQuery.data || []).map(kol => (
                  <tr key={kol.id}>
                    <td>{kol.name}</td>
                    <td>{kol.specialty || '-'}</td>
                    <td>{kol.institution || '-'}</td>
                    <td>{kol.city || '-'}</td>
                    <td>{kol.influence_level || '-'}</td>
                    <td>{kol.engagement_score ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default KOLDirectoryPage;
