import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMapWidget } from "../../components/map/GoogleMap";
import { createVisit, getCustomers, getTodayRoute, getVisits } from "../../api/client";
import type { Customer, RouteStop, Visit } from "../../api/types";
import { buildCoverageSummary, customerDisplayType, formatDateTime, statusLabel } from "../../utils/fieldCrm";
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

  const startVisitForStop = async (stop: RouteStop) => {
    try {
      const visit = await createVisit({
        customerId: stop.customerId,
        customerName: stop.customerName,
        customerType: stop.customerType,
        visitType: "follow-up",
        status: "scheduled",
        notes: "",
      });
      const customer = customers.find((item) => item.id === stop.customerId && item.type === stop.customerType);
      navigate(`/visit-session/${visit.id}`, { state: { visit, customer } });
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
            <div className="section-title">مسار اليوم</div>
            <div className="muted">{user?.name || user?.email || "مندوب"} • العملاء المكلفون حسب المنطقة والقطاع</div>
          </div>
          <span className="pill">{navigator.onLine ? "متصل" : "دون اتصال"}</span>
        </div>
        <div className="metric-grid">
          <div className="metric"><span className="metric-value">{summary.totalAssignedCustomers}</span><span className="muted">إجمالي العملاء</span></div>
          <div className="metric"><span className="metric-value">{summary.visitedToday}</span><span className="muted">زيارات اليوم</span></div>
          <div className="metric"><span className="metric-value">{summary.remainingToday}</span><span className="muted">المتبقي اليوم</span></div>
          <div className="metric"><span className="metric-value">{summary.overdueCustomers}</span><span className="muted">متأخرون</span></div>
        </div>
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
          const customerVisits = visits.filter((visit) => visit.customerId === stop.customerId && visit.customerType === stop.customerType);
          const lastVisit = customerVisits[0];
          const dueStatus = customerVisits.length ? "due" : "overdue";
          return (
            <div key={stop.id} className="list-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div className="card-header">
                <div>
                  <div style={{ fontWeight: 700 }}>{stop.customerName}</div>
                  <div className="muted">
                    {customerDisplayType(stop.customerType)} • {customer?.specialty || customer?.area || "بدون منطقة"}
                  </div>
                </div>
                <span className={`pill status-${dueStatus}`}>{statusLabel(dueStatus)}</span>
              </div>
              <div className="muted">{stop.address || customer?.address || "عنوان غير متوفر"}</div>
              <div className="muted">آخر زيارة: {formatDateTime(lastVisit?.endedAt || lastVisit?.startedAt || lastVisit?.visitedAt)}</div>
              <div className="actions-row">
                <button type="button" onClick={() => navigate(`/customers/${stop.customerType}/${stop.customerId}`)} className="secondary-button">
                  ملف العميل
                </button>
                <button type="button" onClick={() => void startVisitForStop(stop)}>
                  بدء زيارة
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
