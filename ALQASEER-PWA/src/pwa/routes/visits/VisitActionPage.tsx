import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { endVisit, getVisits, startVisit } from "../../api/client";
import { enqueueMutation } from "../../offline/queue";
import { Visit } from "../../api/types";
import { PageHeader } from "../../components/system/PageHeader";
import { EmptyState } from "../../components/system/EmptyState";
import { getDeviceInfo, isSecureGeoContext, requestGeoSnapshot } from "../../utils/geolocation";

type Props = {
  mode: "start" | "end";
};

export default function VisitActionPage({ mode }: Props) {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<{ lat: number; lng: number; accuracy: number; timestamp: string } | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [loading, setLoading] = useState(false);
  const secureContext = isSecureGeoContext();
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getVisits();
        const match = data.find((v) => v.id === visitId);
        setVisit(match || null);
      } catch (error) {
        console.error(error);
      }
    };
    load();
  }, [visitId]);

  const requestLocation = async () => {
    if (!secureContext) {
      setStatus("يتطلب تحديد الموقع اتصالاً آمناً (HTTPS) أو تشغيل محلي على localhost.");
      return;
    }
    setStatus(null);
    try {
      const geo = await requestGeoSnapshot();
      setSnapshot(geo);
    } catch (error: any) {
      if (error?.code === 1) {
        setStatus("تم رفض صلاحية الموقع. يرجى تفعيلها من إعدادات المتصفح.");
      } else {
        setStatus("تعذّر الحصول على الموقع. حاول مرة أخرى.");
      }
    }
  };

  const needsOverride = snapshot ? snapshot.accuracy > 50 : false;
  const canSubmit = snapshot && (!needsOverride || overrideReason.trim().length > 0);

  const handleSubmit = async () => {
    if (!visit || !snapshot) return;
    setLoading(true);
    setStatus(null);
    try {
      const payload = {
        lat: snapshot.lat,
        lng: snapshot.lng,
        accuracy: snapshot.accuracy,
        override_reason: needsOverride ? overrideReason : undefined,
        device_info: getDeviceInfo(),
        timestamp: snapshot.timestamp,
      };

      if (!navigator.onLine) {
        const endpoint = `visits/${visit.id}/${mode === "start" ? "start" : "end"}`;
        enqueueMutation({
          type: mode === "start" ? "visit-start" : "visit-end",
          endpoint,
          method: "POST",
          payload: {
            lat: payload.lat,
            lng: payload.lng,
            accuracy: payload.accuracy,
            override_reason: payload.override_reason,
            device_info: payload.device_info,
            ...(mode === "start" ? { started_at: payload.timestamp } : { ended_at: payload.timestamp }),
          },
        });
        setStatus("تمت إضافة الإجراء إلى قائمة المزامنة.");
        navigate("/sync");
        return;
      }

      if (mode === "start") {
        await startVisit(visit.id, payload);
      } else {
        await endVisit(visit.id, payload);
      }
      navigate("/visits");
    } catch (error: any) {
      setStatus("تعذّر إرسال الموقع. يرجى إعادة المحاولة.");
    } finally {
      setLoading(false);
    }
  };

  const title = mode === "start" ? "بدء الزيارة" : "إنهاء الزيارة";
  const subtitle = useMemo(() => (visit ? `${visit.customerName} • ${visit.customerType === "doctor" ? "طبيب" : "صيدلية"}` : ""), [visit]);

  if (!visit) {
    return (
      <div className="page">
        <PageHeader title={title} subtitle="تعذر العثور على الزيارة." />
        <EmptyState title="الزيارة غير متاحة" description="ارجع لقائمة الزيارات وأعد المحاولة." />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader title={title} subtitle={subtitle} />

      <div className="card">
        <div className="section-title">حالة الموقع</div>
        <div className="muted">يتم طلب الموقع بدقة عالية قبل اعتماد الزيارة.</div>
        <button className="btn btn-primary" type="button" onClick={requestLocation}>
          طلب الموقع
        </button>
        {status ? <div className="muted" style={{ marginTop: 8 }}>{status}</div> : null}
      </div>

      {snapshot ? (
        <div className="card">
          <div className="section-title">بيانات الالتقاط</div>
          <div className="muted">
            {snapshot.lat.toFixed(5)}, {snapshot.lng.toFixed(5)} • دقة {Math.round(snapshot.accuracy)} متر
          </div>
          {needsOverride ? (
            <div style={{ marginTop: 12 }}>
              <label>سبب تجاوز الدقة</label>
              <input className="input" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
            </div>
          ) : null}
        </div>
      ) : null}

      {isDev && snapshot ? (
        <div className="card">
          <div className="section-title">لوحة تتبع الموقع (تطوير)</div>
          <div className="muted">
            lat: {snapshot.lat} • lng: {snapshot.lng} • accuracy: {snapshot.accuracy} • time: {snapshot.timestamp}
          </div>
        </div>
      ) : null}

      <button className="btn btn-primary" type="button" disabled={!canSubmit || loading} onClick={handleSubmit}>
        {loading ? "جارٍ الإرسال..." : mode === "start" ? "تأكيد بدء الزيارة" : "تأكيد إنهاء الزيارة"}
      </button>
    </div>
  );
}
