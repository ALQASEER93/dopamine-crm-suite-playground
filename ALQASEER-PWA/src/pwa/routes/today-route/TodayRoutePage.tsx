import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMapWidget } from "../../components/map/GoogleMap";
import { getCustomers, getTodayRoute, getVisits } from "../../api/client";
import type { Customer, RouteStop, Visit } from "../../api/types";
import { createOrResumeVisitSession } from "../../utils/visitSession";
import {
  buildCoverageSummary,
  buildCustomerInsights,
  customerDisplayName,
  customerDisplayType,
  formatDateTime,
  formatFrequencyTarget,
  nextActionLabel,
  priorityLabel,
  routeStopStatusLabel,
  statusLabel,
} from "../../utils/fieldCrm";
import { useAuthStore } from "../../state/auth";

const statusColor: Record<RouteStop["status"], string> = {
  planned: "#fbbf24",
  "in-progress": "#22d3ee",
  done: "#34d399",
  skipped: "#f87171",
};

export default function TodayRoutePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [routeData, customerData, visitsData] = await Promise.all([getTodayRoute(), getCustomers(), getVisits()]);
        setStops(routeData);
        setCustomers(customerData);
        setVisits(visitsData);
      } catch (err) {
        setError("تعذر تحميل مسار اليوم. تحقق من الاتصال أو استخدم البيانات المخزنة.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const summary = useMemo(() => buildCoverageSummary(customers, visits, stops), [customers, stops, visits]);
  const insightByCustomer = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildCustomerInsights>[number]>();
    for (const insight of buildCustomerInsights(customers, visits, user?.email)) {
      map.set(`${insight.customer.type}:${insight.customer.id}`, insight);
    }
    return map;
  }, [customers, user?.email, visits]);
  const routeTerritories = useMemo(
    () => Array.from(new Set(stops.map((stop) => {
      const insight = insightByCustomer.get(`${stop.customerType}:${stop.customerId}`);
      return insight?.customer.territory || insight?.customer.area;
    }).filter(Boolean))),
    [insightByCustomer, stops],
  );

  const startVisitForStop = async (stop: RouteStop) => {
    try {
      const customer = customers.find((item) => item.id === stop.customerId && item.type === stop.customerType);
      if (!customer) {
        setError("تعذر فتح جلسة الزيارة لأن بيانات العميل غير متوفرة.");
        return;
      }
      const session = await createOrResumeVisitSession(customer);
      if (session.message) setError(session.message);
      navigate(`/visit-session/${session.visit.id}`, { state: { visit: session.visit, customer } });
    } catch (err) {
      console.error(err);
      setError("تعذر إنشاء جلسة الزيارة لهذا العميل.");
    }
  };

  return (
    <div className="page" aria-label="today-route-page">
      <section className="hero-band">
        <div className="card-header">
          <div>
            <div className="hero-kicker">TODAY FIELD ROUTE</div>
            <div className="section-title">مسار اليوم</div>
            <div className="muted">{user?.name || user?.email || "مندوب"} • العملاء المكلفون حسب المنطقة والقطاع</div>
            <div className="muted">القطاعات: {routeTerritories.join("، ") || "غير محددة"}</div>
          </div>
          <span className="pill">{navigator.onLine ? "متصل" : "دون اتصال"}</span>
        </div>
        <div className="metric-grid">
          <div className="metric"><span className="metric-value">{stops.length}</span><span className="muted">محطات خطة اليوم</span></div>
          <div className="metric"><span className="metric-value">{summary.visitedToday}</span><span className="muted">زيارات اليوم</span></div>
          <div className="metric"><span className="metric-value">{summary.remainingToday}</span><span className="muted">المتبقي اليوم</span></div>
          <div className="metric"><span className="metric-value">{summary.overdueCustomers}</span><span className="muted">متأخرون</span></div>
          <div className="metric"><span className="metric-value">{summary.noPlanCustomers}</span><span className="muted">بلا خطة تكرار</span></div>
          <div className="metric"><span className="metric-value">{summary.unassignedCustomers}</span><span className="muted">غير مكلفين</span></div>
        </div>
        <div className="muted">زيارات اليوم تعني زيارات مكتملة/مفتوحة بتاريخ اليوم؛ المتبقي يعني محطات خطة الطريق التي لم ترتبط بزيارة اليوم.</div>
      </section>

      <GoogleMapWidget
        markers={stops
          .filter((stop) => stop.location)
          .map((stop) => ({
            id: stop.id,
            position: stop.location!,
            label: stop.customerName,
            color: statusColor[stop.status],
            timestamp: stop.scheduledFor || null,
          }))}
      />

      {loading ? <div className="card">جاري تحميل المسار...</div> : null}
      {error ? <div className="card" style={{ color: "var(--warning)" }}>{error}</div> : null}

      <div className="list">
        {stops.map((stop) => {
          const customer = customers.find((item) => item.id === stop.customerId && item.type === stop.customerType);
          const insight = insightByCustomer.get(`${stop.customerType}:${stop.customerId}`);
          const customerVisits = visits.filter((visit) => visit.customerId === stop.customerId && visit.customerType === stop.customerType);
          const lastVisit = customerVisits[0];
          const dueStatus = insight?.status || "no-plan";
          const stopIndex = stops.findIndex((item) => item.id === stop.id) + 1;
          return (
            <div key={stop.id} className="list-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div className="card-header">
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {customer ? customerDisplayName(customer) : stop.customerName}
                    {(customer?.isDemo || stop.isDemo) ? <span className="mini-chip demo-chip">DEMO</span> : null}
                  </div>
                  <div className="muted">
                    {customerDisplayType(stop.customerType)} • {customer?.specialty || customer?.category || "غير محدد"} • {customer?.territory || customer?.area || "قطاع غير محدد"}
                  </div>
                </div>
                <span className={`pill status-${dueStatus}`}>{statusLabel(dueStatus)}</span>
              </div>
              <div className="chip-row">
                <span className="mini-chip">ترتيب المسار: #{stopIndex}</span>
                <span className="mini-chip">حالة المسار: {routeStopStatusLabel(stop.status)}</span>
                <span className="mini-chip">الأولوية: {priorityLabel(customer?.priority)}</span>
                <span className="mini-chip">التكرار: {insight?.completedThisMonth ?? 0} / {formatFrequencyTarget(insight?.target ?? stop.monthlyFrequencyTarget ?? null)}</span>
                <span className="mini-chip">خطة التكرار: {customer?.visitFrequency || stop.visitFrequency || "غير مثبتة"}</span>
                <span className="mini-chip">التالي: {nextActionLabel(dueStatus)}</span>
              </div>
              <div className="muted">{stop.address || customer?.address || "عنوان غير متوفر"}</div>
              <div className="muted">الموعد: {formatDateTime(stop.scheduledFor)} • المندوب: {customer?.assignedRepEmail || user?.email || "غير محدد"}</div>
              <div className="muted">آخر زيارة: {formatDateTime(lastVisit?.endedAt || lastVisit?.startedAt || lastVisit?.visitedAt)}</div>
              <div className="actions-row">
                <button type="button" onClick={() => navigate(`/customers/${stop.customerType}/${stop.customerId}`)} className="secondary-button">
                  ملف العميل
                </button>
                <button type="button" onClick={() => void startVisitForStop(stop)}>
                  بدء زيارة
                </button>
                <button type="button" className="secondary-button" onClick={() => navigate("/live-map")}>
                  الخريطة
                </button>
              </div>
            </div>
          );
        })}
        {!stops.length && !loading ? (
          <div className="card">
            <div className="section-title">لا يوجد مسار اليوم</div>
            <div className="muted">لم يتم العثور على عملاء مجدولين لهذا المندوب. راجع المدير لتعيين المنطقة أو استورد قائمة العملاء.</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
