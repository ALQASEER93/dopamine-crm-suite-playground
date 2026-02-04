import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/client';
import DetailDrawer from '../components/DetailDrawer';
import './EntityListPage.css';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const HcpsPage = () => {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [search, setSearch] = useState('');
  const [areaTagFilter, setAreaTagFilter] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [selected, setSelected] = useState(null);

  const queryParams = useMemo(
    () => ({ page, pageSize, search, areaTag: areaTagFilter, specialty: specialtyFilter, segment: segmentFilter }),
    [areaTagFilter, page, pageSize, search, segmentFilter, specialtyFilter],
  );

  const hcpsQuery = useQuery({
    queryKey: ['hcps', queryParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (search.trim()) params.set('search', search.trim());
      if (areaTagFilter) params.set('areaTag', areaTagFilter);
      if (specialtyFilter) params.set('specialty', specialtyFilter);
      if (segmentFilter) params.set('segment', segmentFilter);
      const { data } = await apiClient.get(`/hcps?${params.toString()}`);
      const rows = Array.isArray(data?.data) ? data.data : data?.items || [];
      const total = data?.meta?.total ?? data?.pagination?.total ?? data?.total ?? rows.length;
      return { rows, total };
    },
    enabled: !!token,
    keepPreviousData: true,
  });

  const items = hcpsQuery.data?.rows || [];
  const total = hcpsQuery.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const distinctAreaTags = useMemo(() => {
    const values = new Set();
    items.forEach(item => item.areaTag && values.add(item.areaTag));
    return Array.from(values).sort();
  }, [items]);

  const distinctSpecialties = useMemo(() => {
    const values = new Set();
    items.forEach(item => item.specialty && values.add(item.specialty));
    return Array.from(values).sort();
  }, [items]);

  const distinctSegments = useMemo(() => {
    const values = new Set();
    items.forEach(item => item.segment && values.add(item.segment));
    return Array.from(values).sort();
  }, [items]);

  return (
    <div className="entity-page">
      <div className="entity-toolbar">
        <div>
          <h1 className="page-heading">مقدمو الرعاية الصحية</h1>
          <p className="page-subtitle">إدارة جهات الاتصال والأقاليم.</p>
        </div>
        <div className="entity-search">
          <input
            type="search"
            className="input"
            placeholder="ابحث بالاسم أو التخصص"
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="entity-filters">
        <select className="input" value={areaTagFilter} onChange={event => setAreaTagFilter(event.target.value)}>
          <option value="">كل وسوم المناطق</option>
          {distinctAreaTags.map(value => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select className="input" value={specialtyFilter} onChange={event => setSpecialtyFilter(event.target.value)}>
          <option value="">كل التخصصات</option>
          {distinctSpecialties.map(value => (
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
      </div>

      <section className="table-card entity-table">
        {hcpsQuery.error && <div className="entity-empty">تعذر تحميل الجهات: {hcpsQuery.error.message}</div>}
        {!hcpsQuery.error && hcpsQuery.isLoading && <div className="entity-empty">جاري تحميل الجهات...</div>}
        {!hcpsQuery.error && !hcpsQuery.isLoading && items.length === 0 && (
          <div className="entity-empty">لا توجد جهات.</div>
        )}
        {!hcpsQuery.error && items.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>التخصص</th>
                <th>وسم المنطقة</th>
                <th>الشريحة</th>
                <th>المدينة</th>
                <th>الهاتف</th>
                <th>البريد الإلكتروني</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} onClick={() => setSelected(item)}>
                  <td>{item.name}</td>
                  <td>{item.specialty || '-'}</td>
                  <td>{item.areaTag || '-'}</td>
                  <td>{item.segment || '-'}</td>
                  <td>{item.city || '-'}</td>
                  <td>{item.phone || '-'}</td>
                  <td>{item.email || '-'}</td>
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
              <strong>وسم المنطقة:</strong> {selected.areaTag || '-'}
            </p>
            <p>
              <strong>الشريحة:</strong> {selected.segment || '-'}
            </p>
            <p>
              <strong>المدينة:</strong> {selected.city || '-'}
            </p>
            <p>
              <strong>المنطقة:</strong> {selected.area || '-'}
            </p>
            <p>
              <strong>الهاتف:</strong> {selected.phone || '-'}
            </p>
            <p>
              <strong>الجوال:</strong> {selected.mobile || '-'}
            </p>
            <p>
              <strong>البريد الإلكتروني:</strong> {selected.email || '-'}
            </p>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};

export default HcpsPage;
