import React, { FormEvent, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { createVisit, endVisit, getCustomers, getVisits, startVisit } from "../../api/client";
import { Customer, Visit } from "../../api/types";
import { enqueueMutation, getQueueMeta, getQueuedMutations, replayQueuedMutations } from "../../offline/queue";

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
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const accuracyThreshold = 80;

  const refreshQueue = () => {
    setQueueCount(getQueuedMutations().length);
    const meta = getQueueMeta();
    setLastSyncAt(meta.lastSyncAt ?? null);
  };

  const readPosition = () =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 5000,
      });
    });

  useEffect(() => {
    refreshQueue();
    readPosition()
      .then((pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAccuracy(pos.coords.accuracy ?? null);
      })
      .catch(() => undefined);
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
      setMessage("يرجى اختيار العميل أولاً.");
      setLoading(false);
      return;
    }

    const position = coords ? { coords, accuracy } : await ensurePosition();
    if (!position) {
      setLoading(false);
      return;
    }
    if (!validateAccuracy(position.accuracy)) {
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
      coordinates: position.coords,
      visitedAt: new Date().toISOString(),
    };

    const online = navigator.onLine;
    try {
      if (online) {
        const created = await createVisit(payload);
        setVisits((prev) => [{ ...created, serverStatus: "scheduled" }, ...prev]);
        setMessage("تم حفظ الزيارة بنجاح.");
      } else {
        enqueueMutation({
          endpoint: "visits",
          method: "POST",
          payload,
          type: "visit",
        });
        refreshQueue();
        setVisits((prev) => [{ ...payload, id: crypto.randomUUID(), serverStatus: "pending_create" } as Visit, ...prev]);
        setMessage("تم حفظ الزيارة دون اتصال وسيتم مزامنتها لاحقًا.");
      }
      setNewVisit({ customerId: "", visitType: "follow-up", status: "success", notes: "" });
    } catch (err) {
      setMessage("تعذر حفظ الزيارة. حاول مرة أخرى.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateVisit = (visitId: string, patch: Partial<Visit>) => {
    setVisits((prev) => prev.map((visit) => (visit.id === visitId ? { ...visit, ...patch } : visit)));
  };

  const ensurePosition = async () => {
    try {
      const pos = await readPosition();
      const nextCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(nextCoords);
      setAccuracy(pos.coords.accuracy ?? null);
      return { coords: nextCoords, accuracy: pos.coords.accuracy ?? null };
    } catch (err) {
      setMessage("تعذر الحصول على موقع GPS.");
      return null;
    }
  };

  const validateAccuracy = (value: number | null) => {
    if (value !== null && value > accuracyThreshold) {
      setMessage(`دقة GPS منخفضة (${Math.round(value)}م). انتقل لمكان مفتوح وحاول مرة أخرى.`);
      return false;
    }
    return true;
  };

  const syncQueue = async () => {
    const res = await replayQueuedMutations();
    refreshQueue();
    setMessage(`تمت محاولة مزامنة ${res.attempted}، المتبقي ${res.pending}.`);
  };

  const handleStart = async (visit: Visit) => {
    setLoading(true);
    setMessage(null);
    const position = await ensurePosition();
    if (!position) {
      setLoading(false);
      return;
    }
    if (!validateAccuracy(position.accuracy)) {
      setLoading(false);
      return;
    }

    const payload = {
      lat: position.coords.lat,
      lng: position.coords.lng,
      accuracy: position.accuracy,
      startedAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      enqueueMutation({
        endpoint: `visits/${visit.id}/start`,
        method: "POST",
        payload,
        type: "visit-start",
      });
      refreshQueue();
      updateVisit(visit.id, { serverStatus: "pending_start", startedAt: payload.startedAt });
      setLoading(false);
      setMessage("تمت إضافة بدء الزيارة للطابور دون اتصال.");
      return;
    }

    try {
      await startVisit(visit.id, payload);
      updateVisit(visit.id, { serverStatus: "in_progress", startedAt: payload.startedAt });
      setMessage("تم بدء الزيارة.");
    } catch (err) {
      setMessage("تعذر بدء الزيارة. تحقق من GPS ثم أعد المحاولة.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async (visit: Visit) => {
    setLoading(true);
    setMessage(null);
    const position = await ensurePosition();
    if (!position) {
      setLoading(false);
      return;
    }
    if (!validateAccuracy(position.accuracy)) {
      setLoading(false);
      return;
    }

    const payload = {
      lat: position.coords.lat,
      lng: position.coords.lng,
      accuracy: position.accuracy,
      endedAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      enqueueMutation({
        endpoint: `visits/${visit.id}/end`,
        method: "POST",
        payload,
        type: "visit-end",
      });
      refreshQueue();
      updateVisit(visit.id, { serverStatus: "pending_end", endedAt: payload.endedAt });
      setLoading(false);
      setMessage("تمت إضافة إنهاء الزيارة للطابور دون اتصال.");
      return;
    }

    try {
      await endVisit(visit.id, payload);
      updateVisit(visit.id, { serverStatus: "completed", endedAt: payload.endedAt });
      setMessage("تم إنهاء الزيارة.");
    } catch (err) {
      setMessage("تعذر إنهاء الزيارة. تحقق من GPS ثم أعد المحاولة.");
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
        <div className="section-title">إضافة الزيارة</div>
        <div className="muted">دقة GPS: {accuracy !== null ? `${Math.round(accuracy)}م` : "غير متاح"}</div>
        <div className="muted">معلق للمزامنة: {queueCount}</div>
        <div className="muted">آخر مزامنة: {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "لم تتم بعد"}</div>
        <button type="button" onClick={syncQueue} disabled={!queueCount}>
          مزامنة الآن
        </button>
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
                  {c.name} - {c.type === "doctor" ? "طبيب" : "صيدلية"}
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
              placeholder="اكتب تفاصيل الزيارة..."
            />
          </div>
          {message ? <div className="muted">{message}</div> : null}
          <button type="submit" disabled={loading}>
            {loading ? "جاري الحفظ..." : "حفظ الزيارة"}
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
          {filteredVisits.map((visit) => {
            const statusLabel = visit.serverStatus || visit.status;
            const canStart = !visit.startedAt && statusLabel !== "completed" && statusLabel !== "pending_start";
            const canEnd = statusLabel === "in_progress" || (!!visit.startedAt && statusLabel !== "completed" && statusLabel !== "pending_end");

            return (
              <div key={visit.id} className="list-item" style={{ alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{visit.customerName}</div>
                  <div className="muted">
                    {visit.visitType} - {visit.visitedAt ? new Date(visit.visitedAt).toLocaleString() : ""}
                  </div>
                  {visit.startedAt ? <div className="muted">بدء: {new Date(visit.startedAt).toLocaleString()}</div> : null}
                  {visit.endedAt ? <div className="muted">انتهاء: {new Date(visit.endedAt).toLocaleString()}</div> : null}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                  <span className="pill">{statusLabel}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => handleStart(visit)} disabled={loading || !canStart}>بدء</button>
                    <button type="button" onClick={() => handleEnd(visit)} disabled={loading || !canEnd}>إنهاء</button>
                  </div>
                </div>
              </div>
            );
          })}
          {!filteredVisits.length ? <div className="muted">لا توجد زيارات حتى الآن.</div> : null}
        </div>
      </div>
    </div>
  );
}
