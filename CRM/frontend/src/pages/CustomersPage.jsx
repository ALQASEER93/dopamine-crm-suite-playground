import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DetailDrawer from '../components/DetailDrawer';
import { apiClient } from '../api/client';
import {
  CUSTOMER_TYPE_LABELS,
  buildCustomerBadges,
  customerProfilePath,
  formatCustomerBadge,
  formatDueStatus,
  formatMissing,
  hasTrustedCoordinates,
  normalizeCustomers,
  resolveAssignedRepLabel,
} from './fieldRouteUtils';
import './FieldRoutePages.css';

const badgeClass = badge =>
  ['missing_location', 'no_trusted_coordinates', 'needs_review', 'pending_geocode', 'profile_incomplete'].includes(badge)
    ? 'field-badge field-badge--warning'
    : 'field-badge';

const countByType = (customers, type) => customers.filter(customer => customer.type === type).length;

const customerDueLabel = customer =>
  customer.dueStatus
    ? formatDueStatus(customer.dueStatus)
    : customer.lastVisit
      ? 'تمت زيارة سابقة'
      : formatDueStatus('due_status_unavailable');

const CustomersPage = () => {
  const { customerType, customerId, id } = useParams();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const customersQuery = useQuery({
    queryKey: ['field', 'customers'],
    queryFn: async () => {
      const { data } = await apiClient.get('/pwa/customers');
      return normalizeCustomers(data);
    },
  });

  const visitsQuery = useQuery({
    queryKey: ['field', 'customers', 'visits'],
    queryFn: async () => {
      const { data } = await apiClient.get('/pwa/visits');
      return Array.isArray(data) ? data : [];
    },
  });

  const customers = customersQuery.data || [];
  const visits = visitsQuery.data || [];

  const routeSelected = useMemo(() => {
    const targetId = customerId || id;
    if (!targetId) return null;
    return customers.find(customer => {
      if (customerType && customer.type !== customerType) return false;
      return String(customer.id) === String(targetId);
    });
  }, [customerId, customerType, customers, id]);

  const activeCustomer = selectedCustomer || routeSelected;

  const distinctAreas = useMemo(
    () => [...new Set(customers.map(customer => customer.area).filter(Boolean))].sort(),
    [customers],
  );

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return customers.filter(customer => {
      if (typeFilter && customer.type !== typeFilter) return false;
      if (areaFilter && customer.area !== areaFilter) return false;
      if (!term) return true;
      return [customer.name, customer.specialty, customer.area, customer.address, customer.phone]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term));
    });
  }, [areaFilter, customers, search, typeFilter]);

  const customerSummary = useMemo(
    () => ({
      total: customers.length,
      filtered: filteredCustomers.length,
      doctors: countByType(customers, 'doctor'),
      pharmacies: countByType(customers, 'pharmacy'),
      withAssignedRep: customers.filter(customer => resolveAssignedRepLabel(customer) !== 'لا توجد هوية مندوب مثبتة في البيانات الحالية').length,
      dueOrUnknown: customers.filter(customer => !customer.lastVisit || customer.dueStatus).length,
    }),
    [customers, filteredCustomers.length],
  );

  const visitCountForCustomer = customer =>
    visits.filter(visit => String(visit.customerId) === String(customer.id) && visit.customerType === customer.type).length;

  const renderCustomer = customer => {
    const badges = buildCustomerBadges(customer);
    const visitsThisMonth = customer.visitsThisMonth ?? visitCountForCustomer(customer);
    return (
      <article className="customer-row" data-testid="customer-card" data-customer-type={customer.type} key={`${customer.type}-${customer.id}`}>
        <div className="customer-row__top">
          <div>
            <strong>{customer.name}</strong>
            <div className="field-muted">{CUSTOMER_TYPE_LABELS[customer.type] || customer.type}</div>
          </div>
          <div className="field-badges">
            {badges.map(badge => (
              <span className={badgeClass(badge)} key={badge}>
                {formatCustomerBadge(badge)}
              </span>
            ))}
          </div>
        </div>
        <div className="customer-row__facts">
          <div className="fact">
            <span>التخصص / التصنيف</span>
            <strong>{formatMissing(customer.specialty || customer.classification || customer.segment)}</strong>
          </div>
          <div className="fact">
            <span>الإقليم / المنطقة</span>
            <strong>{formatMissing(customer.territory || customer.area)}</strong>
          </div>
          <div className="fact">
            <span>العنوان النصي</span>
            <strong>{formatMissing(customer.address || customer.city)}</strong>
          </div>
          <div className="fact">
            <span>الهاتف</span>
            <strong>{formatMissing(customer.phone)}</strong>
          </div>
          <div className="fact">
            <span>التكرار الشهري</span>
            <strong>{customer.monthlyFrequencyTarget ?? customer.visitFrequency ?? 'غير محدد'}</strong>
          </div>
          <div className="fact">
            <span>زيارات هذا الشهر</span>
            <strong>{visitsThisMonth ?? 'غير متاح'}</strong>
          </div>
          <div className="fact">
            <span>المندوب المكلف</span>
            <strong>{resolveAssignedRepLabel(customer)}</strong>
          </div>
          <div className="fact">
            <span>الأولوية</span>
            <strong>{formatMissing(customer.priority)}</strong>
          </div>
          <div className="fact">
            <span>الحالة</span>
            <strong>{customerDueLabel(customer)}</strong>
          </div>
        </div>
        <div className="field-actions">
          <Link className="btn btn-secondary" data-testid="open-profile-action" to={customerProfilePath(customer)} onClick={() => setSelectedCustomer(customer)}>
            فتح الملف
          </Link>
          <Link className="btn btn-primary" data-testid="start-visit-action" to={`/visits?customerType=${customer.type}&customerId=${customer.id}`}>
            بدء زيارة
          </Link>
        </div>
      </article>
    );
  };

  return (
    <div className="field-shell" data-testid="customers-route" data-qa-route="customers">
      <header className="field-header">
        <div>
          <h1 className="page-heading">العملاء</h1>
          <p className="page-subtitle">أطباء وصيدليات مع فلاتر وحالة بيانات صريحة بدون بيانات مخترعة.</p>
        </div>
        <div className="field-header__meta">
          <span className="field-badge">أطباء {customerSummary.doctors}</span>
          <span className="field-badge">صيدليات {customerSummary.pharmacies}</span>
        </div>
      </header>

      <section className="field-summary" data-testid="customer-summary">
        <div className="field-metric">
          <span>إجمالي العملاء</span>
          <strong>{customerSummary.total}</strong>
        </div>
        <div className="field-metric">
          <span>ضمن الفلتر الحالي</span>
          <strong>{customerSummary.filtered}</strong>
        </div>
        <div className="field-metric">
          <span>بسياق مندوب/إقليم</span>
          <strong>{customerSummary.withAssignedRep}</strong>
        </div>
        <div className="field-metric">
          <span>مستحق أو غير محسوب</span>
          <strong>{customerSummary.dueOrUnknown}</strong>
        </div>
      </section>

      <section className="field-toolbar" data-testid="customer-filters">
        <input
          className="input"
          type="search"
          placeholder="بحث بالاسم، التخصص، المنطقة، الهاتف"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
        <select className="input" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
          <option value="">كل الأنواع</option>
          <option value="doctor">أطباء / HCP</option>
          <option value="pharmacy">صيدليات / HCO</option>
        </select>
        <select className="input" value={areaFilter} onChange={event => setAreaFilter(event.target.value)}>
          <option value="">كل المناطق</option>
          {distinctAreas.map(area => (
            <option value={area} key={area}>
              {area}
            </option>
          ))}
        </select>
      </section>

      {customersQuery.error && <div className="field-empty">تعذر تحميل العملاء: {customersQuery.error.message}</div>}
      {customersQuery.isLoading && <div className="field-empty">جاري تحميل العملاء...</div>}
      {!customersQuery.isLoading && !filteredCustomers.length && (
        <div className="field-empty" data-testid="customer-empty-state">
          لا توجد بيانات ضمن هذا الفلتر/الدور. إجمالي العملاء المتاحين {customerSummary.total}، ونتائج الفلتر الحالية {customerSummary.filtered}. لا يتم إنشاء عملاء أو عناوين أو إحداثيات بديلة.
        </div>
      )}
      <section className="field-list" data-testid="customer-list">{filteredCustomers.map(renderCustomer)}</section>

      <DetailDrawer
        title={activeCustomer?.name || 'ملف العميل'}
        isOpen={Boolean(activeCustomer)}
        onClose={() => setSelectedCustomer(null)}
      >
        {activeCustomer && (
          <div className="detail-section" data-testid="customer-detail-panel" data-customer-type={activeCustomer.type}>
            <div className="field-badges">
              {buildCustomerBadges(activeCustomer).map(badge => (
                <span className={badgeClass(badge)} key={badge}>
                  {formatCustomerBadge(badge)}
                </span>
              ))}
            </div>
            <div className="detail-facts">
              <div className="fact">
                <span>النوع</span>
                <strong>{CUSTOMER_TYPE_LABELS[activeCustomer.type] || activeCustomer.type}</strong>
              </div>
              <div className="fact">
                <span>التخصص / التصنيف</span>
                <strong>{formatMissing(activeCustomer.specialty || activeCustomer.classification || activeCustomer.segment)}</strong>
              </div>
              <div className="fact">
                <span>الأولوية</span>
                <strong>{formatMissing(activeCustomer.priority)}</strong>
              </div>
              <div className="fact">
                <span>المدينة</span>
                <strong>{formatMissing(activeCustomer.city)}</strong>
              </div>
              <div className="fact">
                <span>المنطقة</span>
                <strong>{formatMissing(activeCustomer.area)}</strong>
              </div>
              <div className="fact">
                <span>العنوان النصي</span>
                <strong>{formatMissing(activeCustomer.address)}</strong>
              </div>
              <div className="fact">
                <span>الهاتف</span>
                <strong>{formatMissing(activeCustomer.phone)}</strong>
              </div>
              <div className="fact">
                <span>المندوب / الإقليم</span>
                <strong>{resolveAssignedRepLabel(activeCustomer)} / {formatMissing(activeCustomer.territory)}</strong>
              </div>
              <div className="fact">
                <span>التكرار الشهري</span>
                <strong>{activeCustomer.monthlyFrequencyTarget ?? activeCustomer.visitFrequency ?? 'غير محدد'}</strong>
              </div>
              <div className="fact">
                <span>زيارات هذا الشهر</span>
                <strong>{activeCustomer.visitsThisMonth ?? visitCountForCustomer(activeCustomer)}</strong>
              </div>
              <div className="fact">
                <span>آخر زيارة / الاستحقاق</span>
                <strong>{activeCustomer.lastVisit || customerDueLabel(activeCustomer)}</strong>
              </div>
              <div className="fact">
                <span>حالة الموقع</span>
                <strong>{hasTrustedCoordinates(activeCustomer) ? 'إحداثيات موثوقة متاحة' : 'missing_location / no_trusted_coordinates'}</strong>
              </div>
            </div>
            <section>
              <h3>الملاحظات / الموضوعات / المنتجات</h3>
              <p className="field-muted">لا توجد بيانات موثوقة معروضة من الـ API الحالي لهذا القسم.</p>
            </section>
            <section className="field-timeline" data-testid="customer-visit-timeline">
              <h3>سجل الزيارات</h3>
              <p className="field-muted">زيارات هذا الشهر: {activeCustomer.visitsThisMonth ?? visitCountForCustomer(activeCustomer)}. لا توجد تفاصيل إضافية موثوقة معروضة من الـ API الحالي.</p>
            </section>
            <div className="field-actions">
              <Link className="btn btn-primary" to={`/visits?customerType=${activeCustomer.type}&customerId=${activeCustomer.id}`}>
                بدء زيارة
              </Link>
              {hasTrustedCoordinates(activeCustomer) ? (
                <Link className="btn btn-secondary" to="/live-map">
                  فتح الخريطة
                </Link>
              ) : (
                <button type="button" className="btn btn-secondary" disabled>
                  لا توجد إحداثيات موثوقة
                </button>
              )}
              <button type="button" className="btn btn-secondary" disabled>
                إضافة ملاحظة غير متاحة
              </button>
              <button type="button" className="btn btn-secondary" disabled>
                استفسار / شكوى غير متاح
              </button>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};

export default CustomersPage;
