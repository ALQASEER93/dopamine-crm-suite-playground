import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCustomers, getVisits } from "../../api/client";
import type { Customer, Visit } from "../../api/types";
import {
  buildCustomerInsights,
  customerDisplayName,
  customerDisplayType,
  formatDateTime,
  formatFrequencyTarget,
  nextActionLabel,
  priorityLabel,
  statusLabel,
} from "../../utils/fieldCrm";
import { createOrResumeVisitSession } from "../../utils/visitSession";
import { useAuthStore } from "../../state/auth";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [area, setArea] = useState("");
  const [territory, setTerritory] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState("");
  const [due, setDue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [customersData, visitsData] = await Promise.all([getCustomers(), getVisits()]);
        setCustomers(customersData);
        setVisits(visitsData);
      } catch (err) {
        console.error(err);
        setError("تعذر تحميل العملاء. سيتم عرض البيانات المخزنة إذا كانت متاحة.");
      }
    };
    void load();
  }, []);

  const insights = useMemo(() => buildCustomerInsights(customers, visits, user?.email), [customers, user?.email, visits]);

  const filtered = useMemo(
    () =>
      insights.filter(({ customer, status }) => {
        const text = `${customer.name} ${customer.area || ""} ${customer.territory || ""} ${customer.specialty || ""} ${customer.category || ""}`.toLowerCase();
        return (
          (!search || text.includes(search.toLowerCase())) &&
          (!type || customer.type === type) &&
          (!area || (customer.area || "").toLowerCase().includes(area.toLowerCase())) &&
          (!territory || (customer.territory || "").toLowerCase().includes(territory.toLowerCase())) &&
          (!specialty || (customer.specialty || "").toLowerCase().includes(specialty.toLowerCase())) &&
          (!assignee || (customer.assignedRepEmail || "").toLowerCase().includes(assignee.toLowerCase())) &&
          (!priority || customer.priority === priority) &&
          (!due || status === due)
        );
      }),
    [area, assignee, due, insights, priority, search, specialty, territory, type],
  );

  const summary = useMemo(() => {
    const doctors = insights.filter(({ customer }) => customer.type === "doctor").length;
    const pharmacies = insights.filter(({ customer }) => customer.type === "pharmacy").length;
    return {
      doctors,
      pharmacies,
      covered: insights.filter((item) => item.status === "covered").length,
      due: insights.filter((item) => item.status === "due").length,
      overdue: insights.filter((item) => item.status === "overdue").length,
      noPlan: insights.filter((item) => item.status === "no-plan").length,
      unassigned: insights.filter((item) => item.status === "unassigned").length,
    };
  }, [insights]);

  const startVisit = async (customer: Customer) => {
    try {
      const { visit, message } = await createOrResumeVisitSession(customer);
      setError(message);
      navigate(`/visit-session/${visit.id}`, { state: { visit, customer } });
    } catch (err) {
      console.error(err);
      setError("تعذر إنشاء جلسة الزيارة. تحقق من الاتصال والصلاحيات قبل المحاولة.");
    }
  };

  return (
    <div className="page">
      <section className="hero-band">
        <div className="card-header">
          <div>
            <div className="hero-kicker">DPM CUSTOMER WORKLIST</div>
            <div className="section-title">سجل العملاء الميداني</div>
            <div className="muted">أطباء/HCPs وصيدليات/HCOs مع فصل واضح بين المخطط، المستحق، المتأخر، وغير المكلف.</div>
          </div>
          <span className="pill pill-strong">DOPAMINE PHARMA</span>
        </div>
        <div className="metric-grid">
          <div className="metric"><span className="metric-value">{summary.doctors}</span><span className="muted">أطباء</span></div>
          <div className="metric"><span className="metric-value">{summary.pharmacies}</span><span className="muted">صيدليات</span></div>
          <div className="metric"><span className="metric-value">{summary.due}</span><span className="muted">مستحقون</span></div>
          <div className="metric"><span className="metric-value">{summary.overdue}</span><span className="muted">متأخرون</span></div>
          <div className="metric"><span className="metric-value">{summary.noPlan}</span><span className="muted">بلا خطة</span></div>
          <div className="metric"><span className="metric-value">{summary.unassigned}</span><span className="muted">غير مكلفين</span></div>
        </div>
      </section>

      <div className="card">
        <div className="grid">
          <input placeholder="بحث بالاسم أو المنطقة" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">النوع: الكل</option>
            <option value="doctor">أطباء</option>
            <option value="pharmacy">صيدليات</option>
          </select>
          <input placeholder="فلتر المنطقة" value={area} onChange={(e) => setArea(e.target.value)} />
          <input placeholder="فلتر القطاع" value={territory} onChange={(e) => setTerritory(e.target.value)} />
          <input placeholder="التخصص / الفئة" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
          <input placeholder="المندوب المكلف" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">الأولوية: الكل</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
          <select value={due} onChange={(e) => setDue(e.target.value)}>
            <option value="">حالة التغطية: الكل</option>
            <option value="covered">مغطى</option>
            <option value="due">مستحق</option>
            <option value="overdue">متأخر</option>
            <option value="no-plan">بلا خطة تكرار</option>
            <option value="unassigned">غير مكلف</option>
          </select>
        </div>
      </div>

      {error ? <div className="card" style={{ color: "var(--warning)" }}>{error}</div> : null}

      <div className="list">
        {filtered.map(({ customer, completedThisMonth, target, status, lastVisit }) => {
          const attainment = target ? Math.min(100, Math.round((completedThisMonth / target) * 100)) : 0;
          const progressStyle = { "--progress": `${attainment}%` } as React.CSSProperties;
          const progressClass = status === "overdue" ? "danger" : status === "due" ? "warning" : "";
          return (
            <div key={`${customer.type}-${customer.id}`} className="list-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div className="card-header">
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {customerDisplayName(customer)}
                    {customer.isDemo ? <span className="mini-chip demo-chip">DEMO</span> : null}
                  </div>
                  <div className="muted">
                    {customerDisplayType(customer.type)} • {customer.specialty || customer.category || "غير محدد"} • {customer.area || "بدون منطقة"}
                  </div>
                </div>
                <span className={`pill status-${status}`}>{statusLabel(status)}</span>
              </div>
              <div className="progress-stack">
                <div className="card-header" style={{ marginBottom: 0 }}>
                  <span className="muted">تحقيق التكرار</span>
                  <strong>{completedThisMonth} / {formatFrequencyTarget(target)}</strong>
                </div>
                <div className="progress-track">
                  <div className={`progress-fill ${progressClass}`} style={progressStyle} />
                </div>
              </div>
              <div className="chip-row">
                <span className="mini-chip">القطاع: {customer.territory || customer.area || "غير محدد"}</span>
                <span className="mini-chip">المندوب: {customer.assignedRepEmail || "غير مكلف"}</span>
                <span className="mini-chip">خطة التكرار: {customer.visitFrequency || "غير مثبتة"}</span>
                <span className="mini-chip">المصدر: {customer.dataOrigin || "غير موثق"}</span>
                <span className="mini-chip">الإجراء التالي: {nextActionLabel(status)}</span>
              </div>
              <div className="grid">
                <div><span className="muted">الأولوية</span><br />{priorityLabel(customer.priority)}</div>
                <div><span className="muted">آخر زيارة</span><br />{formatDateTime(lastVisit?.endedAt || lastVisit?.visitedAt || lastVisit?.startedAt)}</div>
                <div><span className="muted">محور النقاش</span><br />{customer.productFocus || "غير محدد"}</div>
              </div>
              <div className="actions-row">
                <button type="button" className="secondary-button" onClick={() => navigate(`/customers/${customer.type}/${customer.id}`)}>
                  ملف العميل
                </button>
                <button type="button" onClick={() => void startVisit(customer)}>
                  بدء زيارة
                </button>
                {customer.location ? (
                  <button type="button" className="secondary-button" onClick={() => navigate("/live-map")}>
                    الخريطة
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
        {!filtered.length ? <div className="card empty-state">لا يوجد عملاء يطابقون الفلاتر الحالية.</div> : null}
      </div>
    </div>
  );
}
