import React, { FormEvent, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { createVisit, getCustomers, getVisits } from "../../api/client";
import { Customer, Visit } from "../../api/types";
import { enqueueMutation } from "../../offline/queue";

export default function VisitsPage() {
  const location = useLocation();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filters, setFilters] = useState({ date: "", status: "" });
  const [newVisit, setNewVisit] = useState({
    customerId: (location.state as any)?.customerId || "",
    visitType: "follow-up",
    status: "success",
    notes: "",
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => undefined,
      { maximumAge: 5000, timeout: 4000 },
    );
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [visitsData, customersData] = await Promise.all([getVisits(), getCustomers()]);
        setVisits(visitsData);
        setCustomers(customersData);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const handleSubmit = async (evt: FormEvent) => {
    evt.preventDefault();
    setLoading(true);
    setMessage(null);

    const customer = customers.find((c) => c.id === newVisit.customerId);
    if (!customer) {
      setMessage("اختر عميلاً أولاً");
      setLoading(false);
      return;
    }

    const payload = {
      customerId: customer.id,
      customerName: customer.name,
      customerType: customer.type,
      visitType: newVisit.visitType as Visit["visitType"],
      status: newVisit.status as Visit["status"],
      notes: newVisit.notes,
      coordinates: coords ?? undefined,
      visitedAt: new Date().toISOString(),
    };

    const online = navigator.onLine;
    try {
      if (online) {
        const created = await createVisit(payload);
        setVisits((prev) => [created, ...prev]);
        setMessage("تم تسجيل الزيارة.");
      } else {
        enqueueMutation({
          endpoint: "visits",
          method: "POST",
          payload,
          type: "visit",
        });
        setVisits((prev) => [{ ...payload, id: crypto.randomUUID() } as Visit, ...prev]);
        setMessage("تمت إضافة الزيارة وستُرسل عند توفر الاتصال.");
      }
      setNewVisit({ customerId: "", visitType: "follow-up", status: "success", notes: "" });
    } catch (err) {
      setMessage("تعذّر حفظ الزيارة.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredVisits = visits.filter((visit) => {
    const matchesDate = filters.date ? visit.visitedAt?.slice(0, 10) === filters.date : true;
    const matchesStatus = filters.status ? visit.status === filters.status : true;
    return matchesDate && matchesStatus;
  });

  return (
    <div className="page">
      <div className="card">
        <div className="section-title">إنشاء زيارة</div>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="customer">العميل</label>
            <select
              id="customer"
              value={newVisit.customerId}
              onChange={(e) => setNewVisit((s) => ({ ...s, customerId: e.target.value }))}
              required
            >
              <option value="">اختر</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} • {c.type === "doctor" ? "طبيب" : "صيدلية"}
                </option>
              ))}
            </select>
          </div>
          <div className="grid">
            <div>
              <label>نوع الزيارة</label>
              <select value={newVisit.visitType} onChange={(e) => setNewVisit((s) => ({ ...s, visitType: e.target.value }))}>
                <option value="follow-up">متابعة</option>
                <option value="new">جديدة</option>
                <option value="reminder">تذكير</option>
              </select>
            </div>
            <div>
              <label>الحالة</label>
              <select value={newVisit.status} onChange={(e) => setNewVisit((s) => ({ ...s, status: e.target.value }))}>
                <option value="success">ناجحة</option>
                <option value="refused">مرفوضة</option>
                <option value="no-show">لم يحضر</option>
              </select>
            </div>
          </div>
          <div>
            <label>ملاحظات</label>
            <textarea
              rows={3}
              value={newVisit.notes}
              onChange={(e) => setNewVisit((s) => ({ ...s, notes: e.target.value }))}
              placeholder="تفاصيل سريعة عن الزيارة..."
            />
          </div>
          {message ? <div className="muted">{message}</div> : null}
          <button type="submit" disabled={loading}>
            {loading ? "يتم الحفظ..." : "حفظ الزيارة"}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="section-title">سجل الزيارات</div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <input type="date" value={filters.date} onChange={(e) => setFilters((s) => ({ ...s, date: e.target.value }))} />
            <select value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}>
              <option value="">الكل</option>
              <option value="success">ناجحة</option>
              <option value="refused">مرفوضة</option>
              <option value="no-show">لم يحضر</option>
            </select>
          </div>
        </div>
        <div className="list">
          {filteredVisits.map((visit) => (
            <div key={visit.id} className="list-item">
              <div>
                <div style={{ fontWeight: 700 }}>{visit.customerName}</div>
                <div className="muted">
                  {visit.visitType} • {visit.visitedAt ? new Date(visit.visitedAt).toLocaleString() : ""}
                </div>
              </div>
              <span className="pill">{visit.status}</span>
            </div>
          ))}
          {!filteredVisits.length ? <div className="muted">لا توجد زيارات بعد.</div> : null}
        </div>
      </div>
    </div>
  );
}
