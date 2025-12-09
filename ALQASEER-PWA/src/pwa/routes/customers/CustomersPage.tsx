import React, { useEffect, useMemo, useState } from "react";
import { getCustomers } from "../../api/client";
import { Customer } from "../../api/types";
import { useNavigate } from "react-router-dom";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [area, setArea] = useState("");
  const [specialty, setSpecialty] = useState("");
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
        return matchesSearch && matchesType && matchesArea && matchesSpec;
      }),
    [area, customers, search, specialty, type],
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
          <input placeholder="بحث بالاسم" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">الكل</option>
            <option value="doctor">أطباء</option>
            <option value="pharmacy">صيدليات</option>
          </select>
          <input placeholder="المنطقة" value={area} onChange={(e) => setArea(e.target.value)} />
          <input placeholder="التخصص" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
        </div>
      </div>

      <div className="list">
        {filtered.map((c) => (
          <div key={c.id} className="list-item" style={{ flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                <div className="muted">
                  {c.type === "doctor" ? "طبيب" : "صيدلية"} • {c.area || "بدون منطقة"}
                </div>
              </div>
              <span className="pill">{c.specialty || "عام"}</span>
            </div>
            <div className="muted">{c.address}</div>
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <button type="button" onClick={() => openNavigation(c)}>
                فتح الملاحة
              </button>
              <button type="button" onClick={() => navigate("/visits", { state: { customerId: c.id } })}>
                بدء زيارة
              </button>
              <button type="button" onClick={() => navigate("/orders", { state: { customerId: c.id } })}>
                إنشاء طلب
              </button>
            </div>
          </div>
        ))}
        {!filtered.length ? <div className="muted">لا يوجد عملاء يطابقون البحث.</div> : null}
      </div>
    </div>
  );
}
