import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createVisit, getCustomers, getVisits } from "../../api/client";
import type { Customer, Visit } from "../../api/types";
import { formatDateTime, formatDuration, deriveVisitDuration } from "../../utils/fieldCrm";
import { getOfflineVisits, getQueueMeta, getQueuedMutations, replayQueuedMutations } from "../../offline/queue";

export default function VisitsPage() {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filters, setFilters] = useState({ date: "", status: "", customerId: "", area: "" });
  const [queueCount, setQueueCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const mergeVisits = (serverVisits: Visit[], offlineVisits: Visit[]) => {
    const byId = new Map<string, Visit>();
    for (const visit of serverVisits) byId.set(String(visit.id), visit);
    for (const visit of offlineVisits) byId.set(String(visit.id), { ...(byId.get(String(visit.id)) || {}), ...visit });
    return Array.from(byId.values()).sort((left, right) => {
      const leftAt = Date.parse(left.endedAt || left.startedAt || left.visitedAt || "") || 0;
      const rightAt = Date.parse(right.endedAt || right.startedAt || right.visitedAt || "") || 0;
      return rightAt - leftAt;
    });
  };

  const refresh = async () => {
    const [visitsData, customersData, offlineVisits, queue, meta] = await Promise.all([
      getVisits(),
      getCustomers(),
      getOfflineVisits(),
      getQueuedMutations(),
      getQueueMeta(),
    ]);
    setVisits(mergeVisits(visitsData, offlineVisits));
    setCustomers(customersData);
    setQueueCount(queue.length);
    setLastSyncAt(meta.lastSyncAt ?? null);
  };

  useEffect(() => {
    void refresh().catch((error) => {
      console.error(error);
      setMessage("تعذر تحميل سجل الزيارات.");
    });
  }, []);

  const filteredVisits = useMemo(
    () =>
      visits.filter((visit) => {
        const customer = customers.find((item) => String(item.id) === String(visit.customerId) && item.type === visit.customerType);
        const dateValue = visit.endedAt || visit.startedAt || visit.visitedAt || "";
        const statusValue = visit.serverStatus || visit.status || "";
        return (
          (!filters.date || dateValue.startsWith(filters.date)) &&
          (!filters.status || statusValue === filters.status) &&
          (!filters.customerId || String(visit.customerId) === filters.customerId) &&
          (!filters.area || (customer?.area || "").toLowerCase().includes(filters.area.toLowerCase()))
        );
      }),
    [customers, filters.area, filters.customerId, filters.date, filters.status, visits],
  );

  const scheduleVisit = async (customerId: string) => {
    const customer = customers.find((item) => item.id === customerId);
    if (!customer) {
      setMessage("اختر عميلاً قبل إنشاء الزيارة.");
      return;
    }
    setLoading(true);
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
    } catch (error) {
      console.error(error);
      setMessage("تعذر إنشاء زيارة مجدولة. تحقق من الاتصال والصلاحيات.");
    } finally {
      setLoading(false);
    }
  };

  const syncQueue = async () => {
    setLoading(true);
    const res = await replayQueuedMutations();
    await refresh();
    setMessage(`تمت محاولة مزامنة ${res.attempted} عملية، المتبقي ${res.pending}.`);
    setLoading(false);
  };

  return (
    <div className="page">
      <section className="hero-band">
        <div className="section-title">سجل الزيارات</div>
        <div className="muted">زيارات الأطباء والصيدليات مع حالة GPS والمزامنة.</div>
      </section>

      <div className="card">
        <div className="section-title">بدء زيارة من السجل</div>
        <div className="grid">
          <select value={filters.customerId} onChange={(e) => setFilters((state) => ({ ...state, customerId: e.target.value }))}>
            <option value="">اختر العميل</option>
            {customers.map((customer) => (
              <option key={`${customer.type}-${customer.id}`} value={customer.id}>
                {customer.name} - {customer.type === "doctor" ? "طبيب" : "صيدلية"}
              </option>
            ))}
          </select>
          <button type="button" disabled={loading || !filters.customerId} onClick={() => void scheduleVisit(filters.customerId)}>
            إنشاء جلسة زيارة
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">فلاتر</div>
        <div className="grid">
          <input type="date" value={filters.date} onChange={(e) => setFilters((state) => ({ ...state, date: e.target.value }))} />
          <select value={filters.status} onChange={(e) => setFilters((state) => ({ ...state, status: e.target.value }))}>
            <option value="">كل الحالات</option>
            <option value="scheduled">مجدولة</option>
            <option value="in_progress">قيد التنفيذ</option>
            <option value="completed">مكتملة</option>
            <option value="pending_create">بانتظار الإنشاء</option>
            <option value="pending_start">بانتظار بدء الزيارة</option>
            <option value="pending_end">بانتظار إنهاء الزيارة</option>
          </select>
          <input placeholder="المنطقة" value={filters.area} onChange={(e) => setFilters((state) => ({ ...state, area: e.target.value }))} />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="section-title">المزامنة</div>
            <div className="muted">آخر مزامنة: {lastSyncAt ? formatDateTime(lastSyncAt) : "لم تتم بعد"}</div>
          </div>
          <span className="pill">الطابور: {queueCount}</span>
        </div>
        <button type="button" className="secondary-button" onClick={syncQueue} disabled={loading || !queueCount}>
          مزامنة الآن
        </button>
      </div>

      {message ? <div className="card" style={{ color: "var(--warning)" }}>{message}</div> : null}

      <div className="list">
        {filteredVisits.map((visit) => {
          const customer = customers.find((item) => String(item.id) === String(visit.customerId) && item.type === visit.customerType);
          const duration = deriveVisitDuration(visit);
          const gpsStatus = visit.coordinates ? "GPS بداية موجود" : "GPS بداية مفقود";
          return (
            <div key={visit.id} className="list-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div className="card-header">
                <div>
                  <div style={{ fontWeight: 700 }}>{visit.customerName || customer?.name || "عميل غير معروف"}</div>
                  <div className="muted">{customer?.area || "منطقة غير محددة"} • {formatDateTime(visit.endedAt || visit.startedAt || visit.visitedAt)}</div>
                </div>
                <span className="pill">{visit.serverStatus || visit.status || "scheduled"}</span>
              </div>
              <div className="grid">
                <div><span className="muted">المدة</span><br />{formatDuration(duration)}</div>
                <div><span className="muted">GPS</span><br />{gpsStatus}</div>
                <div><span className="muted">المزامنة</span><br />{String(visit.id).startsWith("offline-") || visit.serverStatus?.startsWith("pending") ? "معلق" : "مزامن"}</div>
              </div>
              <div className="muted">الملاحظات: {visit.notes || "لا توجد ملاحظات"}</div>
              <div className="actions-row">
                <button type="button" className="secondary-button" onClick={() => navigate(`/customers/${visit.customerType}/${visit.customerId}`)}>
                  ملف العميل
                </button>
                <button type="button" onClick={() => navigate(`/visit-session/${visit.id}`, { state: { visit, customer } })}>
                  فتح الجلسة
                </button>
              </div>
            </div>
          );
        })}
        {!filteredVisits.length ? <div className="card">لا توجد زيارات مطابقة للفلاتر.</div> : null}
      </div>
    </div>
  );
}
