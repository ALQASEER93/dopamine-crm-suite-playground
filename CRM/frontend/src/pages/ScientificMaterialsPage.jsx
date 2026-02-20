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

const ScientificMaterialsPage = () => {
  const { token, user } = useAuth();
  const roleSlug = useMemo(() => getRoleSlug(user), [user]);
  const canManageMaterials = roleSlug === 'admin' || roleSlug === 'sales_manager';

  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    title: '',
    material_type: 'pdf',
    language: 'ar',
    therapeutic_area: '',
    url: '',
    is_active: true,
  });
  const [notice, setNotice] = useState(null);

  const materialsQuery = useQuery({
    queryKey: ['medical-affairs', 'materials', search],
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: '200' });
      if (search.trim()) params.set('q', search.trim());
      const { data } = await apiClient.get(`/medical-affairs/materials?${params.toString()}`);
      return Array.isArray(data?.data) ? data.data : [];
    },
    enabled: !!token,
  });

  const handleCreate = async event => {
    event.preventDefault();
    setNotice(null);
    try {
      await apiClient.post('/medical-affairs/materials', {
        body: {
          ...form,
          therapeutic_area: form.therapeutic_area || null,
          url: form.url || null,
        },
      });
      setNotice({ type: 'success', text: 'تمت إضافة المادة العلمية.' });
      setForm({
        title: '',
        material_type: 'pdf',
        language: 'ar',
        therapeutic_area: '',
        url: '',
        is_active: true,
      });
      await materialsQuery.refetch();
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'تعذر إضافة المادة.' });
    }
  };

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">مكتبة المواد العلمية</h1>
          <p className="page-subtitle">بحث ومشاركة المحتوى العلمي للفريق الطبي.</p>
        </div>
      </div>

      <section className="page-card">
        <label style={{ maxWidth: '420px' }}>
          <span>بحث</span>
          <input className="input" value={search} onChange={event => setSearch(event.target.value)} placeholder="عنوان المادة" />
        </label>
      </section>

      {canManageMaterials && (
        <section className="page-card">
          <h2 style={{ marginTop: 0 }}>إضافة مادة</h2>
          <form
            onSubmit={handleCreate}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}
          >
            <label>
              <span>العنوان</span>
              <input className="input" value={form.title} onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))} required />
            </label>
            <label>
              <span>النوع</span>
              <select
                className="input"
                value={form.material_type}
                onChange={event => setForm(prev => ({ ...prev, material_type: event.target.value }))}
              >
                <option value="pdf">PDF</option>
                <option value="presentation">Presentation</option>
                <option value="video">Video</option>
                <option value="link">Link</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              <span>اللغة</span>
              <select className="input" value={form.language} onChange={event => setForm(prev => ({ ...prev, language: event.target.value }))}>
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </label>
            <label>
              <span>المنطقة العلاجية</span>
              <input
                className="input"
                value={form.therapeutic_area}
                onChange={event => setForm(prev => ({ ...prev, therapeutic_area: event.target.value }))}
              />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              <span>الرابط</span>
              <input className="input force-ltr" value={form.url} onChange={event => setForm(prev => ({ ...prev, url: event.target.value }))} />
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
        {materialsQuery.error && <div className="table-card__empty">تعذر تحميل المكتبة: {materialsQuery.error.message}</div>}
        {materialsQuery.isLoading && !materialsQuery.error && <div className="table-card__empty">جاري تحميل المواد...</div>}
        {!materialsQuery.isLoading && !materialsQuery.error && (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>العنوان</th>
                  <th>النوع</th>
                  <th>اللغة</th>
                  <th>المنطقة العلاجية</th>
                  <th>الرابط</th>
                </tr>
              </thead>
              <tbody>
                {(materialsQuery.data || []).length === 0 && (
                  <tr>
                    <td colSpan={5}>لا توجد مواد.</td>
                  </tr>
                )}
                {(materialsQuery.data || []).map(material => (
                  <tr key={material.id}>
                    <td>{material.title}</td>
                    <td>{material.material_type}</td>
                    <td>{material.language}</td>
                    <td>{material.therapeutic_area || '-'}</td>
                    <td>
                      {material.url ? (
                        <a href={material.url} target="_blank" rel="noreferrer">
                          فتح
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
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

export default ScientificMaterialsPage;
