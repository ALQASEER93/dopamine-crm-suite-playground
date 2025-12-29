import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { createVisit, endVisit, getCustomers, getVisits, startVisit } from "../../api/client";
import { Customer, Visit } from "../../api/types";
import { enqueueMutation, getQueueMeta, getQueuedMutations, replayQueuedMutations } from "../../offline/queue";
import { distanceMeters, formatDistance } from "../../utils/geo";
import { readPreferences } from "../../utils/preferences";

type VisitMeta = {
  coords: { lat: number; lng: number };
  accuracy: number | null;
  distanceMeters?: number | null;
  capturedAt: string;
};

type VisitAttachment = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  dataUrl?: string;
  createdAt: string;
};

type VisitWithMeta = Visit & {
  createdMeta?: VisitMeta;
  startMeta?: VisitMeta;
  endMeta?: VisitMeta;
};

const attachmentKey = (visitId: string) => `dpm-visit-attachments:${visitId}`;

const readAttachments = (visitId: string): VisitAttachment[] => {
  try {
    const raw = window.localStorage.getItem(attachmentKey(visitId));
    return raw ? (JSON.parse(raw) as VisitAttachment[]) : [];
  } catch (error) {
    console.warn("Failed to read attachments", error);
    return [];
  }
};

const writeAttachments = (visitId: string, attachments: VisitAttachment[]) => {
  try {
    window.localStorage.setItem(attachmentKey(visitId), JSON.stringify(attachments));
  } catch (error) {
    console.warn("Failed to persist attachments", error);
  }
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export default function VisitsPage() {
  const location = useLocation();
  const [visits, setVisits] = useState<VisitWithMeta[]>([]);
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
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [attachmentsByVisit, setAttachmentsByVisit] = useState<Record<string, VisitAttachment[]>>({});

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

  const getCustomer = (customerId: string) => customers.find((c) => c.id === customerId);

  const buildMeta = (position: { coords: { lat: number; lng: number }; accuracy: number | null }, customer?: Customer): VisitMeta => {
    const distance = customer?.location ? distanceMeters(position.coords, customer.location) : null;
    return {
      coords: position.coords,
      accuracy: position.accuracy,
      distanceMeters: distance,
      capturedAt: new Date().toISOString(),
    };
  };

  const validateAccuracy = (value: number | null) => {
    const prefs = readPreferences();
    if (value !== null && value > prefs.gpsAccuracyThreshold) {
      setMessage(`دقة GPS غير كافية (${Math.round(value)}م). اقترب من الموقع ثم أعد المحاولة.`);
      return false;
    }
    return true;
  };

  const warnGeofence = (distance?: number | null) => {
    if (distance == null) return;
    const prefs = readPreferences();
    if (prefs.gpsAlerts && distance > prefs.geofenceRadius) {
      setMessage(`تنبيه جغرافي: أنت بعيد ${formatDistance(distance)} عن موقع العميل.`);
    }
  };

  const ensurePosition = async () => {
    try {
      const pos = await readPosition();
      const nextCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(nextCoords);
      setAccuracy(pos.coords.accuracy ?? null);
      return { coords: nextCoords, accuracy: pos.coords.accuracy ?? null };
    } catch (err) {
      setMessage("تعذر تحديد موقع GPS. يرجى تفعيل الأذونات والمحاولة مرة أخرى.");
      return null;
    }
  };

  useEffect(() => {
    refreshQueue();
    ensurePosition().catch(() => undefined);
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

    const customer = getCustomer(newVisit.customerId);
    if (!customer) {
      setMessage("يرجى اختيار العميل أولًا.");
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

    const meta = buildMeta(position, customer);
    warnGeofence(meta.distanceMeters);

    const online = navigator.onLine;
    try {
      if (online) {
        const created = await createVisit(payload);
        setVisits((prev) => [{ ...created, serverStatus: "scheduled", createdMeta: meta }, ...prev]);
        setMessage("تم إنشاء الزيارة بنجاح.");
      } else {
        enqueueMutation({
          endpoint: "visits",
          method: "POST",
          payload,
          type: "visit",
        });
        refreshQueue();
        setVisits((prev) => [{ ...payload, id: crypto.randomUUID(), serverStatus: "pending_create", createdMeta: meta } as VisitWithMeta, ...prev]);
        setMessage("تم حفظ الزيارة محليًا وستتم مزامنتها عند توفر الاتصال.");
      }
      setNewVisit({ customerId: "", visitType: "follow-up", status: "success", notes: "" });
    } catch (err) {
      setMessage("تعذر إنشاء الزيارة. حاول مرة أخرى.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateVisit = (visitId: string, patch: Partial<VisitWithMeta>) => {
    setVisits((prev) => prev.map((visit) => (visit.id === visitId ? { ...visit, ...patch } : visit)));
  };

  const syncQueue = async () => {
    const res = await replayQueuedMutations();
    refreshQueue();
    setMessage(`تمت محاولة مزامنة ${res.attempted} عمليات، المتبقي ${res.pending}.`);
  };

  const handleStart = async (visit: VisitWithMeta) => {
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

    const customer = getCustomer(visit.customerId);
    const meta = buildMeta(position, customer);
    warnGeofence(meta.distanceMeters);

    if (!navigator.onLine) {
      enqueueMutation({
        endpoint: `visits/${visit.id}/start`,
        method: "POST",
        payload,
        type: "visit-start",
      });
      refreshQueue();
      updateVisit(visit.id, { serverStatus: "pending_start", startedAt: payload.startedAt, startMeta: meta });
      setLoading(false);
      setMessage("تم حفظ بدء الزيارة محليًا للمزامنة لاحقًا.");
      return;
    }

    try {
      await startVisit(visit.id, payload);
      updateVisit(visit.id, { serverStatus: "in_progress", startedAt: payload.startedAt, startMeta: meta });
      setMessage("تم بدء الزيارة.");
    } catch (err) {
      setMessage("تعذر بدء الزيارة. تحقق من GPS ثم أعد المحاولة.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async (visit: VisitWithMeta) => {
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

    const customer = getCustomer(visit.customerId);
    const meta = buildMeta(position, customer);
    warnGeofence(meta.distanceMeters);

    if (!navigator.onLine) {
      enqueueMutation({
        endpoint: `visits/${visit.id}/end`,
        method: "POST",
        payload,
        type: "visit-end",
      });
      refreshQueue();
      updateVisit(visit.id, { serverStatus: "pending_end", endedAt: payload.endedAt, endMeta: meta });
      setLoading(false);
      setMessage("تم حفظ إنهاء الزيارة محليًا للمزامنة لاحقًا.");
      return;
    }

    try {
      await endVisit(visit.id, payload);
      updateVisit(visit.id, { serverStatus: "completed", endedAt: payload.endedAt, endMeta: meta });
      setMessage("تم إنهاء الزيارة.");
    } catch (err) {
      setMessage("تعذر إنهاء الزيارة. تحقق من GPS ثم أعد المحاولة.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAttach = async (visitId: string, file?: File | null) => {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setMessage("الملف كبير جدًا. الحد الأقصى 1MB.");
      return;
    }

    const attachments = attachmentsByVisit[visitId] || readAttachments(visitId);
    const next: VisitAttachment = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      mimeType: file.type || "file",
      createdAt: new Date().toISOString(),
    };

    if (file.type.startsWith("image/")) {
      try {
        next.dataUrl = await fileToDataUrl(file);
      } catch (error) {
        console.warn("Failed to read attachment", error);
      }
    }

    const updated = [next, ...attachments];
    setAttachmentsByVisit((prev) => ({ ...prev, [visitId]: updated }));
    writeAttachments(visitId, updated);
    setMessage("تمت إضافة المرفق.");
  };

  const loadAttachmentsFor = (visitId: string) => {
    setAttachmentsByVisit((prev) => {
      if (prev[visitId]) return prev;
      return { ...prev, [visitId]: readAttachments(visitId) };
    });
  };

  const filteredVisits = useMemo(() => {
    return visits.filter((visit) => {
      const matchesDate = filters.date ? visit.visitedAt?.slice(0, 10) === filters.date : true;
      const matchesStatus = filters.status ? visit.status === filters.status : true;
      return matchesDate && matchesStatus;
    });
  }, [visits, filters]);

  return (
    <div className="page">
      <div className="card">
        <div className="section-title">إدارة الزيارات</div>
        <div className="muted">دقة GPS: {accuracy !== null ? `${Math.round(accuracy)}م` : "غير متاح"}</div>
        <div className="muted">عمليات معلقة للمزامنة: {queueCount}</div>
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
                <option value="new">زيارة جديدة</option>
                <option value="reminder">تذكير</option>
              </select>
            </div>
            <div>
              <label>الحالة</label>
              <select value={newVisit.status} onChange={(e) => setNewVisit((s) => ({ ...s, status: e.target.value }))}>
                <option value="success">ناجحة</option>
                <option value="refused">مرفوضة</option>
                <option value="no-show">لم يتم الحضور</option>
              </select>
            </div>
          </div>
          <div>
            <label>ملاحظات</label>
            <textarea
              rows={3}
              value={newVisit.notes}
              onChange={(e) => setNewVisit((s) => ({ ...s, notes: e.target.value }))}
              placeholder="اكتب ملاحظات الزيارة..."
            />
          </div>
          {message ? <div className="muted">{message}</div> : null}
          <button type="submit" disabled={loading}>
            {loading ? "جارٍ الحفظ..." : "إضافة زيارة"}
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
              <option value="no-show">لم يتم الحضور</option>
            </select>
          </div>
        </div>
        <div className="list">
          {filteredVisits.map((visit) => {
            const statusLabel = visit.serverStatus || visit.status;
            const canStart = !visit.startedAt && statusLabel !== "completed" && statusLabel !== "pending_start";
            const canEnd = statusLabel === "in_progress" || (!!visit.startedAt && statusLabel !== "completed" && statusLabel !== "pending_end");
            const isExpanded = expandedVisitId === visit.id;
            const attachments = attachmentsByVisit[visit.id] || [];

            return (
              <div key={visit.id} className="list-item" style={{ alignItems: "flex-start", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{visit.customerName}</div>
                    <div className="muted">
                      {visit.visitType} - {visit.visitedAt ? new Date(visit.visitedAt).toLocaleString() : ""}
                    </div>
                    {visit.startedAt ? <div className="muted">بدء: {new Date(visit.startedAt).toLocaleString()}</div> : null}
                    {visit.endedAt ? <div className="muted">إنهاء: {new Date(visit.endedAt).toLocaleString()}</div> : null}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                    <span className="pill">{statusLabel}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => handleStart(visit)} disabled={loading || !canStart}>بدء</button>
                      <button type="button" onClick={() => handleEnd(visit)} disabled={loading || !canEnd}>إنهاء</button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setExpandedVisitId(isExpanded ? null : visit.id);
                          if (!isExpanded) {
                            loadAttachmentsFor(visit.id);
                          }
                        }}
                      >
                        {isExpanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="visit-details">
                    <div className="timeline">
                      <div className="timeline-item">
                        <div className="timeline-title">تم إنشاء الزيارة</div>
                        <div className="muted">{visit.visitedAt ? new Date(visit.visitedAt).toLocaleString() : "-"}</div>
                        {visit.createdMeta ? (
                          <div className="chip-row">
                            <span className="chip">GPS {visit.createdMeta.accuracy != null ? `${Math.round(visit.createdMeta.accuracy)}م` : "-"}</span>
                            <span className="chip">بعد {formatDistance(visit.createdMeta.distanceMeters)}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="timeline-item">
                        <div className="timeline-title">بدء الزيارة</div>
                        <div className="muted">{visit.startedAt ? new Date(visit.startedAt).toLocaleString() : "-"}</div>
                        {visit.startMeta ? (
                          <div className="chip-row">
                            <span className="chip">GPS {visit.startMeta.accuracy != null ? `${Math.round(visit.startMeta.accuracy)}م` : "-"}</span>
                            <span className="chip">بعد {formatDistance(visit.startMeta.distanceMeters)}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="timeline-item">
                        <div className="timeline-title">إنهاء الزيارة</div>
                        <div className="muted">{visit.endedAt ? new Date(visit.endedAt).toLocaleString() : "-"}</div>
                        {visit.endMeta ? (
                          <div className="chip-row">
                            <span className="chip">GPS {visit.endMeta.accuracy != null ? `${Math.round(visit.endMeta.accuracy)}م` : "-"}</span>
                            <span className="chip">بعد {formatDistance(visit.endMeta.distanceMeters)}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="attachments">
                      <div className="section-title">مرفقات الزيارة</div>
                      <div className="muted">يمكن إرفاق صورة أو مستند صغير (حتى 1MB).</div>
                      <input
                        type="file"
                        onChange={(e) => handleAttach(visit.id, e.target.files?.[0])}
                      />
                      <div className="attachment-list">
                        {attachments.map((att) => (
                          <div key={att.id} className="attachment-card">
                            {att.dataUrl ? (
                              <img src={att.dataUrl} alt={att.name} />
                            ) : (
                              <div className="attachment-placeholder">{att.mimeType}</div>
                            )}
                            <div>
                              <div style={{ fontWeight: 700 }}>{att.name}</div>
                              <div className="muted">{Math.round(att.size / 1024)}KB · {new Date(att.createdAt).toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                        {!attachments.length ? <div className="muted">لا توجد مرفقات بعد.</div> : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
          {!filteredVisits.length ? <div className="muted">لا توجد زيارات خلال الفترة المحددة.</div> : null}
        </div>
      </div>
    </div>
  );
}
