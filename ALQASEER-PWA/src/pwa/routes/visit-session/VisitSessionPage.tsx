import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { endVisit, getCustomers, getVisits, startVisit, updateVisitNotes } from "../../api/client";
import type { Customer, Visit } from "../../api/types";
import {
  deriveVisitDuration,
  formatDateTime,
  formatDuration,
  gpsEndLabel,
  gpsStartLabel,
  visitLifecycleSteps,
  visitStatusLabel,
  visitSyncLabel,
} from "../../utils/fieldCrm";
import { enqueueMutation, getQueuedMutations, upsertOfflineVisit } from "../../offline/queue";

type PositionSnapshot = {
  coords: { lat: number; lng: number };
  accuracy: number | null;
  timestamp: string;
};

function useTicker(active: boolean, startedAt?: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((now - (Date.parse(startedAt) || now)) / 1000));
}

function geolocationErrorMessage(error: unknown) {
  if (!(error instanceof GeolocationPositionError)) return "تعذر الحصول على موقع GPS.";
  if (error.code === error.PERMISSION_DENIED) return "تم رفض إذن الموقع. فعّل GPS من إعدادات المتصفح.";
  if (error.code === error.POSITION_UNAVAILABLE) return "الموقع غير متاح حالياً. حاول من مكان مفتوح.";
  if (error.code === error.TIMEOUT) return "انتهت مهلة GPS. حاول مرة أخرى.";
  return "تعذر الحصول على موقع GPS.";
}

export default function VisitSessionPage() {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { visit?: Visit; customer?: Customer } | null;
  const [visit, setVisit] = useState<Visit | null>(state?.visit || null);
  const [customer, setCustomer] = useState<Customer | null>(state?.customer || null);
  const [notes, setNotes] = useState(state?.visit?.notes || "");
  const [startGps, setStartGps] = useState<PositionSnapshot | null>(null);
  const [endGps, setEndGps] = useState<PositionSnapshot | null>(null);
  const [callStartedAt, setCallStartedAt] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isActive = Boolean(visit?.startedAt && !visit?.endedAt);
  const visitSeconds = useTicker(isActive, visit?.startedAt);
  const activeCallSeconds = useTicker(Boolean(callStartedAt), callStartedAt);
  const displayedVisitSeconds = isActive ? visitSeconds : deriveVisitDuration(visit || ({} as Visit));
  const lifecycle = visit ? visitLifecycleSteps(visit) : [];
  const nextLifecycleIndex = lifecycle.findIndex((step) => !step.done);
  const localVisitId = String(visit?.id || "").startsWith("offline-visit-") ? String(visit?.id) : undefined;

  useEffect(() => {
    const load = async () => {
      try {
        const [visitsData, customersData, queue] = await Promise.all([getVisits(), getCustomers(), getQueuedMutations()]);
        const loadedVisit = visitsData.find((item) => String(item.id) === String(visitId));
        if (loadedVisit) {
          setVisit((current) => ({ ...loadedVisit, ...current }));
          setNotes(loadedVisit.notes || "");
          const loadedCustomer = customersData.find(
            (item) => String(item.id) === String(loadedVisit.customerId) && item.type === loadedVisit.customerType,
          );
          if (loadedCustomer) setCustomer(loadedCustomer);
        }
        setQueueCount(queue.length);
      } catch (error) {
        console.error(error);
        setMessage("تعذر تحديث جلسة الزيارة من الخادم.");
      }
    };
    void load();
  }, [visitId]);

  const readPosition = () =>
    new Promise<PositionSnapshot>((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        reject(new Error("geolocation unavailable"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            accuracy: pos.coords.accuracy ?? null,
            timestamp: new Date(pos.timestamp || Date.now()).toISOString(),
          }),
        reject,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 },
      );
    });

  const capturePosition = async () => {
    try {
      const position = await readPosition();
      if (position.accuracy !== null && position.accuracy > 80) {
        setMessage(`دقة GPS منخفضة (${Math.round(position.accuracy)}م). اقترب من مكان مفتوح قبل الإرسال.`);
      }
      return position;
    } catch (error) {
      setMessage(geolocationErrorMessage(error));
      return null;
    }
  };

  const startCurrentVisit = async () => {
    if (!visit) return;
    setLoading(true);
    setMessage(null);
    const position = await capturePosition();
    if (!position) {
      setLoading(false);
      return;
    }
    setStartGps(position);
    const startedAt = position.timestamp;

    if (!navigator.onLine) {
      await enqueueMutation({
        endpoint: `visits/${visit.id}/start`,
        method: "POST",
        payload: { lat: position.coords.lat, lng: position.coords.lng, accuracy: position.accuracy, started_at: startedAt },
        type: "visit-start",
        visitId: localVisitId ? undefined : String(visit.id),
        localVisitId,
      });
      const next = { ...visit, startedAt, serverStatus: "pending_start", coordinates: position.coords, startAccuracy: position.accuracy };
      await upsertOfflineVisit(next);
      setVisit(next);
      setMessage("تم حفظ بدء الزيارة في طابور عدم الاتصال.");
      setLoading(false);
      return;
    }

    try {
      await startVisit(String(visit.id), { lat: position.coords.lat, lng: position.coords.lng, accuracy: position.accuracy, startedAt });
      setVisit({ ...visit, startedAt, serverStatus: "in_progress", coordinates: position.coords, startAccuracy: position.accuracy });
      setMessage("تم بدء الزيارة وتسجيل GPS.");
    } catch (error) {
      console.error(error);
      setMessage("تعذر بدء الزيارة. تحقق من GPS أو صلاحية الجلسة.");
    } finally {
      setLoading(false);
    }
  };

  const endCurrentVisit = async () => {
    if (!visit) return;
    setLoading(true);
    setMessage(null);
    const position = await capturePosition();
    if (!position) {
      setLoading(false);
      return;
    }
    setEndGps(position);
    const endedAt = position.timestamp;
    const finalCallDuration = callDuration + activeCallSeconds;
    setCallStartedAt(null);
    setCallDuration(finalCallDuration);
    const finalNotes = [
      notes.trim(),
      finalCallDuration > 0 ? `مدة المكالمة/النقاش: ${formatDuration(finalCallDuration)}` : "",
    ].filter(Boolean).join("\n");

    if (!navigator.onLine) {
      if (finalNotes && finalNotes !== (visit.notes || "")) {
        await enqueueMutation({
          endpoint: `visits/${visit.id}`,
          method: "PUT",
          payload: { notes: finalNotes },
          type: "visit-note",
          visitId: localVisitId ? undefined : String(visit.id),
          localVisitId,
        });
      }
      await enqueueMutation({
        endpoint: `visits/${visit.id}/end`,
        method: "POST",
        payload: { lat: position.coords.lat, lng: position.coords.lng, accuracy: position.accuracy, ended_at: endedAt },
        type: "visit-end",
        visitId: localVisitId ? undefined : String(visit.id),
        localVisitId,
      });
      const next = {
        ...visit,
        notes: finalNotes,
        endedAt,
        serverStatus: "pending_end",
        endCoordinates: position.coords,
        endAccuracy: position.accuracy,
        callDurationSeconds: finalCallDuration,
      };
      await upsertOfflineVisit(next);
      setVisit(next);
      setMessage("تم حفظ إنهاء الزيارة في طابور عدم الاتصال.");
      setLoading(false);
      return;
    }

    try {
      if (isActive && finalNotes !== (visit.notes || "")) {
        await updateVisitNotes(String(visit.id), finalNotes);
      }
      await endVisit(String(visit.id), { lat: position.coords.lat, lng: position.coords.lng, accuracy: position.accuracy, endedAt });
      setVisit({
        ...visit,
        notes: finalNotes,
        endedAt,
        serverStatus: "completed",
        endCoordinates: position.coords,
        endAccuracy: position.accuracy,
        callDurationSeconds: finalCallDuration,
      });
      setMessage("تم إنهاء الزيارة وتسجيل GPS النهائي.");
    } catch (error) {
      console.error(error);
      setMessage("تعذر إنهاء الزيارة. تحقق من GPS أو أعد المحاولة.");
    } finally {
      setLoading(false);
    }
  };

  const customerHeader = useMemo(() => {
    if (customer) return `${customer.name} - ${customer.type === "doctor" ? "طبيب" : "صيدلية"}`;
    if (visit) return `${visit.customerName} - ${visit.customerType === "doctor" ? "طبيب" : "صيدلية"}`;
    return "جلسة زيارة";
  }, [customer, visit]);

  if (!visit) {
    return (
      <div className="page">
        <div className="card">
          <div className="section-title">جلسة الزيارة غير متاحة</div>
          <div className="muted">افتح الجلسة من ملف العميل أو قائمة الزيارات.</div>
          <button type="button" onClick={() => navigate("/visits")}>العودة للزيارات</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="hero-band">
        <div className="card-header">
          <div>
            <div className="hero-kicker">VISIT CONTROL</div>
            <div className="section-title">{customerHeader}</div>
            <div className="muted">حالة الجلسة: {visitStatusLabel(visit.serverStatus || visit.status)}</div>
          </div>
          <span className="pill">{navigator.onLine ? "متصل" : "دون اتصال"}</span>
        </div>
        <div className="metric-grid">
          <div className="metric"><span className="metric-value">{formatDuration(displayedVisitSeconds)}</span><span className="muted">مؤقت الزيارة</span></div>
          <div className="metric"><span className="metric-value">{formatDuration(callDuration + activeCallSeconds)}</span><span className="muted">مؤقت المكالمة</span></div>
          <div className="metric"><span className="metric-value">{visitSyncLabel(visit)}</span><span className="muted">حالة المزامنة</span></div>
          <div className="metric"><span className="metric-value">{visit.endedAt ? "مغلقة" : "نشطة/مجدولة"}</span><span className="muted">قفل السجل</span></div>
        </div>
      </section>

      {message ? <div className="card" style={{ color: "var(--warning)" }}>{message}</div> : null}

      <div className="card">
        <div className="card-header">
          <div>
            <div className="section-title">رحلة الزيارة الميدانية</div>
            <div className="muted">تسلسل واضح من اختيار العميل حتى المزامنة. لا يتم اعتبار GPS ناجحاً إلا بعد التقاط الإحداثيات فعلياً.</div>
          </div>
          <span className={`pill ${visit.serverStatus?.startsWith("pending") ? "status-pending" : isActive ? "status-active" : visit.endedAt ? "status-synced" : ""}`}>
            {visitStatusLabel(visit.serverStatus || visit.status)}
          </span>
        </div>
        <div className="workflow-steps">
          {lifecycle.map((step, index) => {
            const active = (isActive && step.label === "داخل الزيارة") || (!step.done && index === nextLifecycleIndex);
            return (
              <div key={step.label} className={`workflow-step ${step.done ? "done" : ""} ${active ? "active" : ""}`}>
                <span className="workflow-index">{index + 1}</span>
                <div>
                  <strong>{step.label}</strong>
                  <div className="muted">{step.done ? "تم التحقق" : active ? "الخطوة الحالية" : "بانتظار"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="section-title">GPS</div>
        <div className="grid">
          <div>
            <span className="muted">بداية الزيارة</span><br />
            <span className="mono-value">{startGps || visit.coordinates ? `${(startGps?.coords.lat ?? visit.coordinates?.lat)?.toFixed(5)}, ${(startGps?.coords.lng ?? visit.coordinates?.lng)?.toFixed(5)}` : "غير ملتقط"}</span>
            <div className="muted">{startGps ? `الدقة ${Math.round(startGps.accuracy || 0)}م - ${formatDateTime(startGps.timestamp)}` : ""}</div>
            <div className="muted">{gpsStartLabel(visit)}</div>
          </div>
          <div>
            <span className="muted">نهاية الزيارة</span><br />
            <span className="mono-value">{endGps || visit.endCoordinates ? `${(endGps?.coords.lat ?? visit.endCoordinates?.lat)?.toFixed(5)}, ${(endGps?.coords.lng ?? visit.endCoordinates?.lng)?.toFixed(5)}` : "غير ملتقط"}</span>
            <div className="muted">{endGps ? `الدقة ${Math.round(endGps.accuracy || 0)}م - ${formatDateTime(endGps.timestamp)}` : ""}</div>
            <div className="muted">{gpsEndLabel(visit)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="section-title">المكالمة والملاحظات</div>
            <div className="muted">الملاحظات مقفلة حتى يبدأ GPS بداية الزيارة، ثم تحفظ ضمن سجل الزيارة.</div>
          </div>
          <span className={`pill ${callStartedAt ? "status-active" : "status-pending"}`}>{callStartedAt ? "نقاش جار" : "لا توجد مكالمة نشطة"}</span>
        </div>
        <div className="actions-row">
          <button type="button" disabled={!isActive || Boolean(callStartedAt)} onClick={() => setCallStartedAt(new Date().toISOString())}>بدء المكالمة</button>
          <button
            type="button"
            className="secondary-button"
            disabled={!callStartedAt}
            onClick={() => {
              setCallDuration((value) => value + activeCallSeconds);
              setCallStartedAt(null);
            }}
          >
            إنهاء المكالمة
          </button>
        </div>
        <div className="chip-row">
          <span className="mini-chip">موضوع النقاش</span>
          <span className="mini-chip">احتياج العميل</span>
          <span className="mini-chip">متابعة الزيارة القادمة</span>
          <span className="mini-chip">بدون بيانات مرضى</span>
        </div>
        <label htmlFor="visit-notes">ملاحظات الزيارة</label>
        <div className="muted">اكتب النقاش أو محور المنتج بدون أي ادعاءات علاجية أو بيانات مرضى.</div>
        <textarea
          id="visit-notes"
          rows={5}
          value={notes}
          disabled={!isActive}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={isActive ? "اكتب ملاحظات الزيارة أثناء الجلسة..." : "تتاح الملاحظات بعد بدء الزيارة."}
        />
      </div>

      <div className="card sticky-primary-action">
        <div className="section-title">إنهاء العمل</div>
        <div className="muted">عمليات الطابور الحالية: {queueCount}</div>
        <div className="actions-row">
          <button type="button" disabled={loading || Boolean(visit.startedAt)} onClick={startCurrentVisit}>بدء الزيارة</button>
          <button type="button" className="danger-button" disabled={loading || !isActive} onClick={endCurrentVisit}>إنهاء الزيارة</button>
        </div>
      </div>
    </div>
  );
}
