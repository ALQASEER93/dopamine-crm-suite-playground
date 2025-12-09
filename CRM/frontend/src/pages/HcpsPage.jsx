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
          <h1 className="page-heading">Healthcare professionals</h1>
          <p className="page-subtitle">Manage key contacts and territories.</p>
        </div>
        <div className="entity-search">
          <input
            type="search"
            className="input"
            placeholder="Search by name or specialty"
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
          <option value="">All area tags</option>
          {distinctAreaTags.map(value => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select className="input" value={specialtyFilter} onChange={event => setSpecialtyFilter(event.target.value)}>
          <option value="">All specialties</option>
          {distinctSpecialties.map(value => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select className="input" value={segmentFilter} onChange={event => setSegmentFilter(event.target.value)}>
          <option value="">All segments</option>
          {distinctSegments.map(value => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <section className="table-card entity-table">
        {hcpsQuery.error && <div className="entity-empty">Unable to load HCPs: {hcpsQuery.error.message}</div>}
        {!hcpsQuery.error && hcpsQuery.isLoading && <div className="entity-empty">Loading HCPs...</div>}
        {!hcpsQuery.error && !hcpsQuery.isLoading && items.length === 0 && (
          <div className="entity-empty">No HCPs found.</div>
        )}
        {!hcpsQuery.error && items.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Specialty</th>
                <th>Area Tag</th>
                <th>Segment</th>
                <th>City</th>
                <th>Phone</th>
                <th>Email</th>
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
              <strong>Area Tag:</strong> {selected.areaTag || '-'}
            </p>
            <p>
              <strong>Segment:</strong> {selected.segment || '-'}
            </p>
            <p>
              <strong>City:</strong> {selected.city || '-'}
            </p>
            <p>
              <strong>Area:</strong> {selected.area || '-'}
            </p>
            <p>
              <strong>Phone:</strong> {selected.phone || '-'}
            </p>
            <p>
              <strong>Mobile:</strong> {selected.mobile || '-'}
            </p>
            <p>
              <strong>Email:</strong> {selected.email || '-'}
            </p>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};

export default HcpsPage;
