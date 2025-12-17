import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/client';
import { DEFAULT_AVAILABLE_FILTERS, useVisitsFilters } from './VisitsFilterContext';
import VisitsFilters from './VisitsFilters';
import VisitsSummaryCards from './VisitsSummaryCards';
import VisitsTable from './VisitsTable';
import NewVisitForm from './NewVisitForm';

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];
const FILTER_COLLECTION_LIMIT = 500;
const formatQueryError = error => {
  if (!error) return null;
  const status = error.status || error?.response?.status;
  const message = error.message || 'Unable to load data';
  return status ? `${message} (${status})` : message;
};
const logValidationError = (error, label) => {
  if (error?.status === 422) {
    const detail = error.payload?.detail || error.payload;
    console.error(`${label} validation error`, detail);
  }
};

const extractCollection = payload => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (Array.isArray(payload.rows)) {
    return payload.rows;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
};

const buildQueryString = (filters, options = {}) => {
  const params = new URLSearchParams();
  if (filters.startDate) {
    params.append('dateFrom', filters.startDate);
  }
  if (filters.endDate) {
    params.append('dateTo', filters.endDate);
  }
  if (Array.isArray(filters.repIds)) {
    filters.repIds.filter(Boolean).forEach(repId => params.append('repId', repId));
  }
  if (filters.hcpId) {
    params.append('hcpId', filters.hcpId);
  }
  if (Array.isArray(filters.statuses)) {
    filters.statuses.filter(Boolean).forEach(status => params.append('status', status));
  }
  if (filters.territoryId) {
    params.append('territoryId', filters.territoryId);
  }

  if (options.page) {
    params.append('page', String(options.page));
  }
  if (options.pageSize) {
    params.append('pageSize', String(options.pageSize));
  }
  if (options.sort && options.sort.field) {
    params.append('sortBy', options.sort.field);
    params.append('sortDirection', options.sort.direction || 'asc');
  }

  return params.toString();
};

const mapFiltersToDisplay = (filters, availableFilters = DEFAULT_AVAILABLE_FILTERS) => {
  const appliedFilters = [];
  const reps = Array.isArray(availableFilters?.reps) ? availableFilters.reps : [];
  const hcps = Array.isArray(availableFilters?.hcps) ? availableFilters.hcps : [];
  const territories = Array.isArray(availableFilters?.territories) ? availableFilters.territories : [];

  if (filters.startDate || filters.endDate) {
    const start = filters.startDate ? filters.startDate : 'Any';
    const end = filters.endDate ? filters.endDate : 'Any';
    appliedFilters.push(`Date: ${start} - ${end}`);
  }

  if (Array.isArray(filters.repIds) && filters.repIds.length > 0) {
    const repNames = filters.repIds
      .map(repId => reps.find(rep => String(rep.id) === String(repId))?.name || repId)
      .join(', ');
    appliedFilters.push(`Rep: ${repNames}`);
  }

  if (filters.hcpId) {
    const hcpName = hcps.find(hcp => String(hcp.id) === String(filters.hcpId))?.name || filters.hcpId;
    appliedFilters.push(`HCP: ${hcpName}`);
  }

  if (Array.isArray(filters.statuses) && filters.statuses.length > 0) {
    const statusLabels = filters.statuses.map(status => status.replace(/_/g, ' ')).join(', ');
    appliedFilters.push(`Status: ${statusLabels}`);
  }

  if (filters.territoryId) {
    const territoryName =
      territories.find(territory => String(territory.id) === String(filters.territoryId))?.name || filters.territoryId;
    appliedFilters.push(`Territory: ${territoryName}`);
  }

  if (appliedFilters.length === 0) {
    appliedFilters.push('None');
  }

  return appliedFilters;
};

const VisitsDashboard = () => {
  const { user, token } = useAuth();
  const userRole = user?.role?.slug;
  const { filters, availableFilters, setAvailableFilters } = useVisitsFilters();
  const queryClient = useQueryClient();
  const safeFilters = useMemo(
    () => ({
      startDate: filters?.startDate || '',
      endDate: filters?.endDate || '',
      repIds: Array.isArray(filters?.repIds) ? filters.repIds.filter(Boolean) : [],
      hcpId: filters?.hcpId || '',
      statuses: Array.isArray(filters?.statuses) ? filters.statuses.filter(Boolean) : [],
      territoryId: filters?.territoryId || '',
    }),
    [filters],
  );
  const safeAvailableFilters = useMemo(
    () => ({
      reps: Array.isArray(availableFilters?.reps) ? availableFilters.reps : DEFAULT_AVAILABLE_FILTERS.reps,
      hcps: Array.isArray(availableFilters?.hcps) ? availableFilters.hcps : DEFAULT_AVAILABLE_FILTERS.hcps,
      territories: Array.isArray(availableFilters?.territories)
        ? availableFilters.territories
        : DEFAULT_AVAILABLE_FILTERS.territories,
      statuses:
        Array.isArray(availableFilters?.statuses) && availableFilters.statuses.length > 0
          ? availableFilters.statuses
          : DEFAULT_AVAILABLE_FILTERS.statuses,
    }),
    [availableFilters],
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState({ field: 'visitDate', direction: 'desc' });

  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState(null);
  const [showNewVisit, setShowNewVisit] = useState(false);

  const mergeAvailableFilters = useCallback(
    (options = {}) => {
      if (!options || typeof options !== 'object') {
        return;
      }

      setAvailableFilters(prev => ({
        reps: Array.isArray(options.reps)
          ? options.reps
          : Array.isArray(prev?.reps)
          ? prev.reps
          : DEFAULT_AVAILABLE_FILTERS.reps,
        hcps: Array.isArray(options.hcps)
          ? options.hcps
          : Array.isArray(prev?.hcps)
          ? prev.hcps
          : DEFAULT_AVAILABLE_FILTERS.hcps,
        statuses: Array.isArray(options.statuses) && options.statuses.length > 0
          ? options.statuses
          : Array.isArray(prev?.statuses) && prev.statuses.length > 0
          ? prev.statuses
          : DEFAULT_AVAILABLE_FILTERS.statuses,
        territories: Array.isArray(options.territories)
          ? options.territories
          : Array.isArray(prev?.territories)
          ? prev.territories
          : DEFAULT_AVAILABLE_FILTERS.territories,
      }));
    },
    [setAvailableFilters],
  );

  useEffect(() => {
    if (!token) {
      mergeAvailableFilters(DEFAULT_AVAILABLE_FILTERS);
    }
  }, [mergeAvailableFilters, token]);

  useEffect(() => {
    setPage(1);
  }, [
    safeFilters.startDate,
    safeFilters.endDate,
    safeFilters.hcpId,
    safeFilters.territoryId,
    JSON.stringify(safeFilters.repIds),
    JSON.stringify(safeFilters.statuses),
  ]);

  const filtersQueryString = useMemo(() => buildQueryString(safeFilters), [safeFilters]);
  const visitsQueryString = useMemo(
    () =>
      buildQueryString(safeFilters, {
        page,
        pageSize,
        sort,
      }),
    [page, pageSize, safeFilters, sort],
  );

  const summaryQuery = useQuery({
    queryKey: ['visits', 'summary', token || null, filtersQueryString],
    queryFn: async () => {
      const { data: payload } = await apiClient.get(`/visits/summary?${filtersQueryString}`, { token });
      return payload?.data ?? payload;
    },
    enabled: !!token,
    keepPreviousData: true,
  });

  const visitsQuery = useQuery({
    queryKey: ['visits', 'list', token || null, visitsQueryString],
    queryFn: async () => {
      const { data: payload } = await apiClient.get(`/visits?${visitsQueryString}`, { token });
      const rows = Array.isArray(payload?.data) ? payload.data : payload?.visits || [];
      const totalFromPayload =
        payload?.meta?.total ??
        payload?.pagination?.total ??
        payload?.total ??
        (Array.isArray(payload?.data) ? payload.data.length : 0);
      const filterOptions = payload?.meta?.availableFilters || payload?.availableFilters || payload?.filters || null;
      return { rows, total: totalFromPayload, filterOptions };
    },
    enabled: !!token,
    keepPreviousData: true,
    onSuccess: data => {
      if (data?.filterOptions) {
        mergeAvailableFilters(data.filterOptions);
      }
    },
  });

  const referenceQuery = useQuery({
    queryKey: ['visits', 'reference', token || null],
    queryFn: async () => {
      const endpoints = [
        { key: 'reps', path: `/sales-reps?page=1&pageSize=${FILTER_COLLECTION_LIMIT}` },
        { key: 'hcps', path: `/hcps?page=1&pageSize=${FILTER_COLLECTION_LIMIT}` },
        { key: 'territories', path: `/territories?page=1&pageSize=${FILTER_COLLECTION_LIMIT}` },
      ];

      const responses = await Promise.allSettled(
        endpoints.map(endpoint => apiClient.get(endpoint.path, { token })),
      );

      const nextOptions = {};
      let partialError = null;

      responses.forEach((result, index) => {
        const { key } = endpoints[index];
        if (result.status === 'fulfilled') {
          nextOptions[key] = extractCollection(result.value.data);
        } else if (!partialError) {
          const reason = result.reason;
          partialError =
            (reason && reason.message) || (typeof reason === 'string' ? reason : null) || 'Unable to load filter data.';
        }
      });

      if (Object.keys(nextOptions).length) {
        mergeAvailableFilters(nextOptions);
      }

      if (partialError) {
        throw new Error(partialError);
      }

      return nextOptions;
    },
    enabled: !!token,
    staleTime: 5 * 60_000,
  });

  const handleSortChange = useCallback(columnKey => {
    setSort(prev => {
      if (prev.field === columnKey) {
        return {
          field: columnKey,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        field: columnKey,
        direction: 'asc',
      };
    });
  }, []);

  const handlePageChange = useCallback(newPage => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback(size => {
    setPageSize(size);
    setPage(1);
  }, []);

  const appliedFilters = useMemo(
    () => mapFiltersToDisplay(safeFilters, safeAvailableFilters),
    [safeAvailableFilters, safeFilters],
  );

  const handleExport = useCallback(async () => {
    setExportMessage(null);
    setExporting(true);

    try {
      const { data: blob, response } = await apiClient.get(
        `/visits/export?${buildQueryString(filters, { sort })}`,
        {
          responseType: 'blob',
          headers: { Accept: 'text/csv' },
          token,
        },
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename =
        response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') ||
        `visits-export-${Date.now()}.csv`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setExportMessage({ type: 'success', text: 'Export started. Your download should begin shortly.' });
    } catch (error) {
      setExportMessage({ type: 'error', text: error.message || 'Failed to export visits.' });
    } finally {
      setExporting(false);
    }
  }, [filters, sort]);

  const handleVisitCreated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['visits'] });
  }, [queryClient]);

  const safeVisits = useMemo(() => (Array.isArray(visitsQuery.data?.rows) ? visitsQuery.data.rows.filter(Boolean) : []), [
    visitsQuery.data,
  ]);
  const summaryError = formatQueryError(summaryQuery.error);

  const canCreateVisit = ['sales_rep', 'medical-sales-rep', 'salesman'].includes(userRole);

  const visitsErrorMessage = formatQueryError(visitsQuery.error);
  const visitsLoading = visitsQuery.isLoading || visitsQuery.isFetching;
  const totalVisitsCount = visitsQuery.data?.total || 0;

  const referenceLoading = referenceQuery.isLoading;
  const referenceErrorMessage = formatQueryError(referenceQuery.error);

  useEffect(() => {
    logValidationError(summaryQuery.error, 'Visits summary');
  }, [summaryQuery.error]);

  useEffect(() => {
    logValidationError(visitsQuery.error, 'Visits list');
  }, [visitsQuery.error]);

  return (
    <div style={{ padding: '24px', fontFamily: 'Arial, sans-serif', color: '#1f2933' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>Visits Dashboard</h1>
          <p style={{ margin: '4px 0 0', color: '#52606d' }}>
            {user?.role?.slug
              ? `Signed in as ${user.role.slug.replace('_', ' ')}${user?.name ? ` - ${user.name}` : ''}`
              : user?.name || ''}
          </p>
        </div>
        {canCreateVisit && (
          <button
            type="button"
            onClick={() => setShowNewVisit(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #2563eb',
              backgroundColor: '#2563eb',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            New visit
          </button>
        )}
      </header>

      <VisitsFilters
        isLoading={visitsLoading && safeVisits.length === 0}
        referenceLoading={referenceLoading}
        referenceError={referenceErrorMessage}
      />

      <VisitsSummaryCards summary={summaryQuery.data} isLoading={summaryQuery.isLoading} error={summaryError} />

      {exportMessage && (
        <div
          style={{
            marginBottom: '12px',
            padding: '12px 16px',
            borderRadius: '4px',
            backgroundColor: exportMessage.type === 'error' ? '#fde8e8' : '#def7ec',
            color: exportMessage.type === 'error' ? '#b83232' : '#046c4e',
          }}
        >
          {exportMessage.text}
        </div>
      )}

      <VisitsTable
        visits={safeVisits}
        isLoading={visitsLoading}
        error={visitsErrorMessage}
        page={page}
        pageSize={pageSize}
        total={totalVisitsCount}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        sort={sort}
        onSortChange={handleSortChange}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        appliedFilters={appliedFilters}
        onExport={userRole === 'sales_manager' ? handleExport : null}
        exporting={exporting}
      />

      {showNewVisit && (
        <NewVisitForm
          token={token}
          onClose={() => setShowNewVisit(false)}
          onCreated={handleVisitCreated}
        />
      )}
    </div>
  );
};

export default VisitsDashboard;
