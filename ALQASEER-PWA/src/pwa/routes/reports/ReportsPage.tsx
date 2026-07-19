import React, { useEffect, useMemo, useState } from "react";
import { getCustomers, getTodayRoute, getVisits } from "../../api/client";
import type { Customer, RouteStop, Visit } from "../../api/types";
import { buildCoverageSummary, buildCustomerInsights, customerDisplayType, statusLabel } from "../../utils/fieldCrm";
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
  const insights = useMemo(() => buildCustomerInsights(customers, visits), [customers, visits]);
  const plannedStops = routeStops.length;
  const completedStops = routeStops.filter((stop) => stop.status === "done").length;
  const planCompletionPct = plannedStops ? Math.round((completedStops / plannedStops) * 100) : 0;
  const frequencyStyle = { "--progress": `${summary.frequencyAchievedPct}%` } as React.CSSProperties;
  const planStyle = { "--progress": `${planCompletionPct}%` } as React.CSSProperties;
  const repActivity = useMemo(() => {
    const rows = new Map<string, { customers: number; due: number; overdue: number; covered: number; noPlan: number; unassigned: number; completed: number }>();
    for (const insight of insights) {
      const rep = insight.customer.assignedRepEmail || "غير محدد";
      const current = rows.get(rep) || { customers: 0, due: 0, overdue: 0, covered: 0, noPlan: 0, unassigned: 0, completed: 0 };
      current.customers += 1;
      if (insight.status === "due") current.due += 1;
      if (insight.status === "overdue") current.overdue += 1;
      if (insight.status === "covered") current.covered += 1;
      if (insight.status === "no-plan") current.noPlan += 1;
      if (insight.status === "unassigned") current.unassigned += 1;
      current.completed += insight.completedThisMonth;
      rows.set(rep, current);
    }
    return Array.from(rows, ([rep, values]) => ({ rep, ...values }));
  }, [insights]);
  const territoryCoverage = useMemo(() => {
    const rows = new Map<string, { total: number; covered: number; due: number; overdue: number; noPlan: number; unassigned: number }>();
    for (const insight of insights) {
      const territory = insight.customer.territory || insight.customer.area || "غير محدد";
      const current = rows.get(territory) || { total: 0, covered: 0, due: 0, overdue: 0, noPlan: 0, unassigned: 0 };
      current.total += 1;
      if (insight.status === "covered") current.covered += 1;
      if (insight.status === "due") current.due += 1;
      if (insight.status === "overdue") current.overdue += 1;
      if (insight.status === "no-plan") current.noPlan += 1;
      if (insight.status === "unassigned") current.unassigned += 1;
      rows.set(territory, current);
    }
    return Array.from(rows, ([territory, values]) => ({ territory, ...values }));
  }, [insights]);

  return (
    <div className="page">
      <section className="hero-band">
        <div className="card-header">
          <div>
            <div className="hero-kicker">FIELD MANAGEMENT REPORTS</div>
            <div className="section-title">تقارير التغطية الميدانية</div>
            <div className="muted">ملخص تنفيذي يفصل المخطط الفعلي عن العملاء بلا خطة أو بلا تكليف، حتى لا تظهر أرقام تأخير مضللة.</div>
          </div>
          <span className="pill pill-strong">Field Force CRM</span>
        </div>
        <div className="progress-stack">
          <div className="card-header" style={{ marginBottom: 0 }}>
            <span className="muted">تحقيق التكرار الشهري للعملاء المخططين فقط</span>
            <strong>{summary.monthlyFrequencyTarget ? `${summary.frequencyAchievedPct}%` : "غير محسوب"}</strong>
          </div>
          <div className="progress-track">
            <div className={`progress-fill ${summary.frequencyAchievedPct < 40 ? "danger" : summary.frequencyAchievedPct < 80 ? "warning" : ""}`} style={frequencyStyle} />
          </div>
        </div>
      </section>
      {error ? <div className="card" style={{ color: "var(--warning)" }}>{error}</div> : null}
      <div className="metric-grid">
        <div className="metric"><span className="metric-value">{summary.totalAssignedCustomers}</span><span className="muted">إجمالي السجل</span></div>
        <div className="metric"><span className="metric-value">{summary.plannedCustomers}</span><span className="muted">لديهم خطة تكرار</span></div>
        <div className="metric"><span className="metric-value">{summary.visitedToday}</span><span className="muted">تمت زيارتهم اليوم</span></div>
        <div className="metric"><span className="metric-value">{summary.remainingToday}</span><span className="muted">متبقون اليوم</span></div>
        <div className="metric"><span className="metric-value">{summary.monthlyFrequencyTarget ? `${summary.frequencyAchievedPct}%` : "غير محسوب"}</span><span className="muted">تحقيق التكرار</span></div>
        <div className="metric"><span className="metric-value">{summary.coveredCustomers}</span><span className="muted">مغطون</span></div>
        <div className="metric"><span className="metric-value">{summary.dueCustomers}</span><span className="muted">عملاء مستحقون</span></div>
        <div className="metric"><span className="metric-value">{summary.overdueCustomers}</span><span className="muted">عملاء متأخرون</span></div>
        <div className="metric"><span className="metric-value">{summary.noPlanCustomers}</span><span className="muted">بلا خطة</span></div>
        <div className="metric"><span className="metric-value">{summary.unassignedCustomers}</span><span className="muted">غير مكلفين</span></div>
        <div className="metric"><span className="metric-value">{summary.avgVisitDurationMinutes}</span><span className="muted">متوسط مدة الزيارة/دقيقة</span></div>
        <div className="metric"><span className="metric-value">{summary.avgCallDurationMinutes}</span><span className="muted">متوسط المكالمة/دقيقة</span></div>
        <div className="metric"><span className="metric-value">{queueCount}</span><span className="muted">عمليات دون اتصال</span></div>
      </div>
      <div className="grid">
        <div className="field-command">
          <span className="field-command__title">أولوية الإدارة اليوم</span>
          <span className="muted">{summary.overdueCustomers ? "ابدأ بالعملاء المتأخرين المثبتين في خطة تكرار." : "لا يوجد تأخير حرج مثبت في بيانات الخطة الحالية."}</span>
        </div>
        <div className="field-command">
          <span className="field-command__title">منهجية التكرار</span>
          <span className="muted">{summary.frequencyStatusNote}</span>
        </div>
        <div className="field-command">
          <span className="field-command__title">سلامة GPS</span>
          <span className="muted">{summary.gpsMissingOrLowAccuracy} زيارة تحتاج مراجعة دقة أو اكتمال GPS.</span>
        </div>
        <div className="field-command">
          <span className="field-command__title">المزامنة</span>
          <span className="muted">{queueCount ? `${queueCount} عملية تنتظر المزامنة.` : "لا توجد عمليات معلقة في الطابور المحلي."}</span>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="section-title">المخطط مقابل المنجز اليوم</div>
            <div className="muted">قراءة سريعة لمسار اليوم قبل مراجعة تفاصيل القطاعات.</div>
          </div>
          <span className={`pill ${planCompletionPct >= 100 ? "status-covered" : planCompletionPct > 0 ? "status-active" : "status-pending"}`}>{planCompletionPct}%</span>
        </div>
        <div className="progress-track" style={{ marginBottom: 12 }}>
          <div className={`progress-fill ${planCompletionPct < 40 ? "danger" : planCompletionPct < 80 ? "warning" : ""}`} style={planStyle} />
        </div>
        <div className="grid">
          <div><span className="muted">زيارات مخططة</span><br />{plannedStops}</div>
          <div><span className="muted">زيارات مكتملة</span><br />{completedStops}</div>
          <div><span className="muted">المتبقي</span><br />{Math.max(plannedStops - completedStops, 0)}</div>
          <div><span className="muted">نسبة الإنجاز</span><br />{planCompletionPct}%</div>
        </div>
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
          <div className="muted">تصدير CSV/Excel متاح فقط إذا كانت صلاحية المدير ومسارات التصدير مفعلة في backend. لا يتم عرض زر تصدير وهمي هنا.</div>
        </div>
      </div>
      <div className="card">
        <div className="section-title">نشاط المندوبين</div>
        <div className="list">
          {repActivity.map((row) => (
            <div key={row.rep} className="list-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div className="card-header">
                <span className="text-break">{row.rep}</span>
                <span className="pill">{row.customers} عميل</span>
              </div>
              <div className="grid">
                <div><span className="muted">زيارات مكتملة هذا الشهر</span><br />{row.completed}</div>
                <div><span className="muted">مغطى</span><br />{row.covered}</div>
                <div><span className="muted">مستحق</span><br />{row.due}</div>
                <div><span className="muted">متأخر</span><br />{row.overdue}</div>
                <div><span className="muted">بلا خطة</span><br />{row.noPlan}</div>
                <div><span className="muted">غير مكلف</span><br />{row.unassigned}</div>
              </div>
            </div>
          ))}
          {!repActivity.length ? <div className="muted">لا توجد بيانات مندوبين كافية.</div> : null}
        </div>
      </div>
      <div className="card">
        <div className="section-title">تغطية القطاعات</div>
        <div className="list">
          {territoryCoverage.map((row) => (
            <div key={row.territory} className="list-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div className="card-header">
                <span>{row.territory}</span>
                <span className="pill">{row.total} عميل</span>
              </div>
              <div className="chip-row">
                <span className="mini-chip">{statusLabel("covered")}: {row.covered}</span>
                <span className="mini-chip">{statusLabel("due")}: {row.due}</span>
                <span className="mini-chip">{statusLabel("overdue")}: {row.overdue}</span>
                <span className="mini-chip">{statusLabel("no-plan")}: {row.noPlan}</span>
                <span className="mini-chip">{statusLabel("unassigned")}: {row.unassigned}</span>
              </div>
            </div>
          ))}
          {!territoryCoverage.length ? <div className="muted">لا توجد بيانات قطاعات كافية.</div> : null}
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
