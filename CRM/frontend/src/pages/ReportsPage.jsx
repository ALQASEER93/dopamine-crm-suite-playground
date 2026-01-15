import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { listReps } from '../api/reps';
import ReportsOverview from '../reports/ReportsOverview';
import RepPerformanceTable from '../reports/RepPerformanceTable';
import ProductPerformanceTable from '../reports/ProductPerformanceTable';
import TerritoryPerformanceTable from '../reports/TerritoryPerformanceTable';

const toDate = date => date.toISOString().slice(0, 10);

const getRangeForPreset = preset => {
  const now = new Date();

  if (preset === 'week') {
    const dayOfWeek = now.getDay(); // 0-6, Sunday=0
    const diffToMonday = (dayOfWeek + 6) % 7;
    const start = new Date(now);
    start.setDate(start.getDate() - diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: toDate(start), to: toDate(end) };
  }

  if (preset === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    const startMonth = q * 3;
    const start = new Date(now.getFullYear(), startMonth, 1);
    const end = new Date(now.getFullYear(), startMonth + 3, 0);
    return { from: toDate(start), to: toDate(end) };
  }

  // default: this month
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toDate(start), to: toDate(end) };
};

const ReportsPage = () => {
  const defaultRange = useMemo(() => getRangeForPreset('month'), []);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [appliedRange, setAppliedRange] = useState(defaultRange);
  const [repFilter, setRepFilter] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState('');
  const [accountType, setAccountType] = useState('');

  const handleApplyRange = event => {
    event.preventDefault();
    setAppliedRange({ from, to });
  };

  const handlePreset = preset => {
    const range = getRangeForPreset(preset);
    setFrom(range.from);
    setTo(range.to);
    setAppliedRange(range);
  };

  const repsQuery = useQuery({
    queryKey: ['reports', 'reps'],
    queryFn: () => listReps({ include_inactive: true }),
  });

  const territoriesQuery = useQuery({
    queryKey: ['reports', 'territories'],
    queryFn: async () => {
      const { data } = await apiClient.get('/territories?page=1&pageSize=500');
      const rows = data?.data || data || [];
      return Array.isArray(rows) ? rows : [];
    },
  });

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">التقارير</h1>
          <p className="page-subtitle">
            تحليلات الزيارات والمندوبين والمنتجات والمناطق.
          </p>
        </div>
        <form className="page-filters" onSubmit={handleApplyRange}>
          <label>
            <span>من</span>
            <input
              type="date"
              className="input"
              value={from}
              onChange={event => setFrom(event.target.value)}
            />
          </label>
          <label>
            <span>إلى</span>
            <input
              type="date"
              className="input"
              value={to}
              onChange={event => setTo(event.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-secondary">
            تطبيق
          </button>
        </form>
      </div>

      <div className="page-filters" style={{ marginBottom: '16px', gap: '8px' }}>
        <select
          className="input"
          value={repFilter}
          onChange={event => setRepFilter(event.target.value)}
        >
          <option value="">كل المندوبين</option>
          {(repsQuery.data || []).map(rep => (
            <option key={rep.id} value={rep.id}>
              {rep.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={territoryFilter}
          onChange={event => setTerritoryFilter(event.target.value)}
        >
          <option value="">كل المناطق</option>
          {(territoriesQuery.data || []).map(territory => (
            <option key={territory.id} value={territory.id}>
              {territory.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={accountType}
          onChange={event => setAccountType(event.target.value)}
        >
          <option value="">كل الحسابات</option>
          <option value="doctor">الأطباء</option>
          <option value="pharmacy">الصيدليات</option>
        </select>
      </div>

      <div className="page-filters" style={{ marginBottom: '16px', gap: '8px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => handlePreset('week')}
        >
          هذا الأسبوع
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => handlePreset('month')}
        >
          هذا الشهر
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => handlePreset('quarter')}
        >
          هذا الربع
        </button>
      </div>

      <ReportsOverview
        from={appliedRange.from}
        to={appliedRange.to}
        repId={repFilter}
        territoryId={territoryFilter}
        accountType={accountType}
      />

      <RepPerformanceTable
        from={appliedRange.from}
        to={appliedRange.to}
        repId={repFilter}
        territoryId={territoryFilter}
        accountType={accountType}
      />

      <ProductPerformanceTable
        from={appliedRange.from}
        to={appliedRange.to}
        accountType={accountType}
      />

      <TerritoryPerformanceTable
        from={appliedRange.from}
        to={appliedRange.to}
        territoryId={territoryFilter}
        accountType={accountType}
      />
    </div>
  );
};

export default ReportsPage;

