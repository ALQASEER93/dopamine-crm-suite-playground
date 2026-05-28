import React, { useEffect, useMemo, useState } from "react";
import { getCustomers, getTodayRoute, getVisits } from "../../api/client";
import type { Customer, RouteStop, Visit } from "../../api/types";
import { buildCoverageSummary, customerDisplayType } from "../../utils/fieldCrm";
import { getQueuedMutations } from "../../offline/queue";

export default function ReportsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [customersData, visitsData, routeData, queue] = await Promise.all([
          getCustomers(),
          getVisits(),
          getTodayRoute(),
          getQueuedMutations(),
        ]);
        setCustomers(customersData);
        setVisits(visitsData);
        setRouteStops(routeData);
        setQueueCount(queue.length);
      } catch (loadError) {
        console.error(loadError);
        setError("تعذر تحميل التقارير. يتم عرض ما توفر من بيانات مخزنة عند الإمكان.");
      }
    };
    void load();
  }, []);

  const summary = useMemo(() => buildCoverageSummary(customers, visits, routeStops), [customers, routeStops, visits]);

  return (
    <div className="page">
      <section className="hero-band">
        <div className="section-title">تقارير التغطية الميدانية</div>
        <div className="muted">مؤشرات الزيارات والتكرار الشهري للمندوبين والعملاء.</div>
      </section>
      {error ? <div className="card" style={{ color: "var(--warning)" }}>{error}</div> : null}
      <div className="metric-grid">
        <div className="metric"><span className="metric-value">{summary.totalAssignedCustomers}</span><span className="muted">عملاء مكلفون</span></div>
        <div className="metric"><span className="metric-value">{summary.visitedToday}</span><span className="muted">تمت زيارتهم اليوم</span></div>
        <div className="metric"><span className="metric-value">{summary.remainingToday}</span><span className="muted">متبقون اليوم</span></div>
        <div className="metric"><span className="metric-value">{summary.frequencyAchievedPct}%</span><span className="muted">تحقيق التكرار</span></div>
        <div className="metric"><span className="metric-value">{summary.dueCustomers}</span><span className="muted">عملاء مستحقون</span></div>
        <div className="metric"><span className="metric-value">{summary.overdueCustomers}</span><span className="muted">عملاء متأخرون</span></div>
        <div className="metric"><span className="metric-value">{summary.avgVisitDurationMinutes}</span><span className="muted">متوسط مدة الزيارة/دقيقة</span></div>
        <div className="metric"><span className="metric-value">{queueCount}</span><span className="muted">عمليات دون اتصال</span></div>
      </div>
      <div className="card">
        <div className="section-title">الزيارات حسب المنطقة</div>
        <div className="list">
          {summary.visitsByArea.map((row) => (
            <div key={row.area} className="list-item">
              <span>{row.area}</span>
              <span className="pill">{row.visits}</span>
            </div>
          ))}
          {!summary.visitsByArea.length ? <div className="muted">لا توجد زيارات مسجلة بعد.</div> : null}
        </div>
      </div>
      <div className="card">
        <div className="section-title">الزيارات حسب نوع العميل</div>
        <div className="list">
          {summary.visitsByCustomerType.map((row) => (
            <div key={row.type} className="list-item">
              <span>{customerDisplayType(row.type)}</span>
              <span className="pill">{row.visits}</span>
            </div>
          ))}
          <div className="muted">تصدير CSV/Excel متاح من backend عبر مسارات الزيارات الإدارية عند توفر صلاحية المدير.</div>
        </div>
      </div>
      <div className="card">
        <div className="section-title">جودة GPS والمزامنة</div>
        <div className="muted">زيارات بلا GPS مكتمل أو بدقة منخفضة: {summary.gpsMissingOrLowAccuracy}</div>
        <div className="muted">فشل المزامنة يظهر في صفحة الحساب وطابور عدم الاتصال.</div>
      </div>
    </div>
  );
}
