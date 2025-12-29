import React, { useEffect, useMemo, useState } from "react";
import { getCustomers } from "../../api/client";
import { Customer } from "../../api/types";
import { useNavigate } from "react-router-dom";

const resolvePriority = (customer: Customer) => {
  if (!customer.lastVisit) return "B";
  const days = (Date.now() - new Date(customer.lastVisit).getTime()) / (1000 * 60 * 60 * 24);
  if (days > 45) return "A";
  if (days > 20) return "B";
  return "C";
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [area, setArea] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [priority, setPriority] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCustomers();
        setCustomers(data);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const filtered = useMemo(
    () =>
      customers.filter((c) => {
        const matchesSearch = search ? c.name.toLowerCase().includes(search.toLowerCase()) : true;
        const matchesType = type ? c.type === type : true;
        const matchesArea = area ? (c.area || "").toLowerCase().includes(area.toLowerCase()) : true;
        const matchesSpec = specialty ? (c.specialty || "").toLowerCase().includes(specialty.toLowerCase()) : true;
        const matchesPriority = priority ? resolvePriority(c) === priority : true;
        return matchesSearch && matchesType && matchesArea && matchesSpec && matchesPriority;
      }),
    [area, customers, priority, search, specialty, type],
  );

  const openNavigation = (customer: Customer) => {
    if (!customer.location) return;
    const dest = `${customer.location.lat},${customer.location.lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
    window.open(url, "_blank");
  };

  return (
    <div className="page">
      <div className="card">
        <div className="section-title">العملاء</div>
        <div className="grid">
          <input placeholder="ابحث بالاسم" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">الكل</option>
            <option value="doctor">طبيب</option>
            <option value="pharmacy">صيدلية</option>
          </select>
          <input placeholder="المنطقة" value={area} onChange={(e) => setArea(e.target.value)} />
          <input placeholder="التخصص" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">الأولوية</option>
            <option value="A">A عالي</option>
            <option value="B">B متوسط</option>
            <option value="C">C منخفض</option>
          </select>
        </div>
      </div>

      <div className="list">
        {filtered.map((c) => {
          const priorityLevel = resolvePriority(c);
          return (
            <div key={c.id} className="list-item" style={{ flexDirection: "column", alignItems: "flex-start" }}>
              <div style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div className="muted">
                    {c.type === "doctor" ? "طبيب" : "صيدلية"} · {c.area || "منطقة غير محددة"}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                  <span className="pill">{c.specialty || "بدون تخصص"}</span>
                  <span className="priority-pill" data-level={priorityLevel}>أولوية {priorityLevel}</span>
                </div>
              </div>
              <div className="muted">{c.address || "لا يوجد عنوان مسجل"}</div>
              <div className="muted">آخر زيارة: {c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : "غير متوفر"}</div>
              <div style={{ display: "flex", gap: 8, width: "100%" }}>
                <button type="button" onClick={() => openNavigation(c)}>
                  فتح الملاحة
                </button>
                <button type="button" onClick={() => navigate("/visits", { state: { customerId: c.id } })}>
                  إنشاء زيارة
                </button>
                <button type="button" onClick={() => navigate("/orders", { state: { customerId: c.id } })}>
                  إنشاء طلب
                </button>
              </div>
            </div>
          );
        })}
        {!filtered.length ? <div className="muted">لا توجد نتائج مطابقة لبحثك.</div> : null}
      </div>
    </div>
  );
}
