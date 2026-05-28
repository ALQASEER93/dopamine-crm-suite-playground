import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createVisit, getCustomers, getVisits } from "../../api/client";
import type { Customer, Visit } from "../../api/types";
import { buildCustomerInsights, customerDisplayType, priorityLabel, statusLabel } from "../../utils/fieldCrm";
import { useAuthStore } from "../../state/auth";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [area, setArea] = useState("");
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
        const text = `${customer.name} ${customer.area || ""} ${customer.specialty || ""}`.toLowerCase();
        return (
          (!search || text.includes(search.toLowerCase())) &&
          (!type || customer.type === type) &&
          (!area || (customer.area || "").toLowerCase().includes(area.toLowerCase())) &&
          (!specialty || (customer.specialty || "").toLowerCase().includes(specialty.toLowerCase())) &&
          (!assignee || (customer.assignedRepEmail || "").toLowerCase().includes(assignee.toLowerCase())) &&
          (!priority || customer.priority === priority) &&
          (!due || status === due)
        );
      }),
    [area, assignee, due, insights, priority, search, specialty, type],
  );

  const startVisit = async (customer: Customer) => {
    try {
      const visit = await createVisit({
        customerId: customer.id,
        customerName: customer.name,
        customerType: customer.type,
        visitType: "follow-up",
        status: "scheduled",
        notes: "",
      });
      navigate(`/visit-session/${visit.id}`, { state: { visit, customer } });
    } catch (err) {
      console.error(err);
      setError("تعذر إنشاء جلسة الزيارة.");
    }
  };

  return (
    <div className="page">
      <section className="hero-band">
        <div className="section-title">العملاء المكلفون</div>
        <div className="muted">أطباء وصيدليات حسب المنطقة والأولوية وحالة التكرار الشهري.</div>
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
          </select>
        </div>
      </div>

      {error ? <div className="card" style={{ color: "var(--warning)" }}>{error}</div> : null}

      <div className="list">
        {filtered.map(({ customer, completedThisMonth, target, status, lastVisit }) => (
          <div key={`${customer.type}-${customer.id}`} className="list-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <div className="card-header">
              <div>
                <div style={{ fontWeight: 700 }}>{customer.name}</div>
                <div className="muted">
                  {customerDisplayType(customer.type)} • {customer.specialty || "غير محدد"} • {customer.area || "بدون منطقة"}
                </div>
              </div>
              <span className={`pill status-${status}`}>{statusLabel(status)}</span>
            </div>
            <div className="grid">
              <div><span className="muted">الأولوية</span><br />{priorityLabel(customer.priority)}</div>
              <div><span className="muted">التكرار</span><br />{completedThisMonth} / {target}</div>
              <div><span className="muted">آخر زيارة</span><br />{lastVisit?.visitedAt || lastVisit?.startedAt ? new Date(lastVisit.visitedAt || lastVisit.startedAt || "").toLocaleDateString("ar-JO") : "لا يوجد"}</div>
            </div>
            <div className="actions-row">
              <button type="button" className="secondary-button" onClick={() => navigate(`/customers/${customer.type}/${customer.id}`)}>
                ملف العميل
              </button>
              <button type="button" onClick={() => void startVisit(customer)}>
                بدء زيارة
              </button>
            </div>
          </div>
        ))}
        {!filtered.length ? <div className="card">لا يوجد عملاء يطابقون الفلاتر الحالية.</div> : null}
      </div>
    </div>
  );
}
