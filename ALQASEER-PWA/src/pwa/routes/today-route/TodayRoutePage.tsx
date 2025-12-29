import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMapWidget } from "../../components/map/GoogleMap";
import { getTodayRoute } from "../../api/client";
import { RouteStop } from "../../api/types";
import { distanceMeters, formatDistance } from "../../utils/geo";
import { readPreferences } from "../../utils/preferences";
import { useAuthStore } from "../../state/auth";

type EnrichedStop = RouteStop & {
  distanceMeters?: number;
  etaMinutes?: number;
  clusterKey?: string;
};

const statusCopy: Record<RouteStop["status"], { label: string; color: string }> = {
  planned: { label: "مجدول", color: "#fbbf24" },
  "in-progress": { label: "جارٍ التنفيذ", color: "#22d3ee" },
  done: { label: "منتهٍ", color: "#34d399" },
  skipped: { label: "متجاوز", color: "#f87171" },
};

const roleHints: Record<string, string> = {
  admin: "تابع جودة الزيارات وإدارة الفرق من التقارير.",
  supervisor: "راقب الالتزام بالخطة اليومية وتوزيع المسارات.",
  sales_manager: "تابع المستهدفات وأداء الفريق لحظيًا.",
  rep: "ابدأ بأقرب عميل وأكمل المسار مع تسجيل GPS.",
};

const getClusterKey = (stop: RouteStop) => {
  if (!stop.location) return "unknown";
  const lat = Math.round(stop.location.lat * 100) / 100;
  const lng = Math.round(stop.location.lng * 100) / 100;
  return `${lat},${lng}`;
};

const estimateEtaMinutes = (meters?: number) => {
  if (!meters) return null;
  const speedKmh = 28;
  const minutes = (meters / 1000 / speedKmh) * 60;
  return Math.max(2, Math.round(minutes));
};

export default function TodayRoutePage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role || "rep");
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [selectedStop, setSelectedStop] = useState<RouteStop | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [preferences] = useState(() => readPreferences());

  const stats = useMemo(() => {
    return stops.reduce(
      (acc, stop) => {
        acc.total += 1;
        acc[stop.status] += 1;
        return acc;
      },
      { total: 0, planned: 0, "in-progress": 0, done: 0, skipped: 0 } as Record<RouteStop["status"] | "total", number>,
    );
  }, [stops]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getTodayRoute();
        setStops(data);
        setSelectedStop(data[0] || null);
      } catch (err) {
        setError("تعذر تحميل مسار اليوم. تأكد من الاتصال ثم حاول مرة أخرى.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("الجهاز لا يدعم تحديد الموقع.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationAccuracy(pos.coords.accuracy ?? null);
      },
      () => setLocationError("تعذر قراءة الموقع الحالي."),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 },
    );
  }, []);

  const enrichedStops = useMemo<EnrichedStop[]>(() => {
    return stops.map((stop) => {
      if (!stop.location || !currentLocation) {
        return { ...stop, clusterKey: getClusterKey(stop) };
      }
      const distance = distanceMeters(currentLocation, stop.location);
      const eta = estimateEtaMinutes(distance);
      return {
        ...stop,
        distanceMeters: distance,
        etaMinutes: eta ?? undefined,
        clusterKey: getClusterKey(stop),
      };
    });
  }, [stops, currentLocation]);

  const suggestedStops = useMemo(() => {
    return [...enrichedStops]
      .filter((stop) => stop.distanceMeters != null)
      .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  }, [enrichedStops]);

  const clusterStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const stop of enrichedStops) {
      const key = stop.clusterKey || "unknown";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }, [enrichedStops]);

  return (
    <div className="page" aria-label="today-route-page">
      <div className="card-header" style={{ padding: "0 4px" }}>
        <div>
          <div className="section-title">مسار اليوم</div>
          <div className="muted">ابدأ بالمحطة الأقرب وسجل الزيارة مع GPS.</div>
        </div>
        <span className="pill">عدد المحطات: {stops.length}</span>
      </div>

      <div className="card">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">إجمالي المحطات</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.done}</div>
            <div className="stat-label">منتهية</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats["in-progress"]}</div>
            <div className="stat-label">جارٍ التنفيذ</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.planned}</div>
            <div className="stat-label">مجدولة</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">مساعد تخطيط المسار</div>
        <div className="muted">موقعك الحالي: {currentLocation ? "تم تحديده" : "غير متاح"}</div>
        <div className="muted">
          دقة GPS: {locationAccuracy != null ? `${Math.round(locationAccuracy)}م` : "غير متاح"}
        </div>
        <div className="muted">نطاق التنبيه الجغرافي: {preferences.geofenceRadius}م</div>
        {locationError ? <div className="muted" style={{ color: "#fca5a5" }}>{locationError}</div> : null}
        {clusterStats.length ? (
          <div className="chip-row" style={{ marginTop: 10 }}>
            {clusterStats.slice(0, 4).map((cluster) => (
              <span key={cluster.key} className="chip">
                مجموعة {cluster.key === "unknown" ? "بدون موقع" : cluster.key}: {cluster.count}
              </span>
            ))}
          </div>
        ) : null}
        <div className="list" style={{ marginTop: 12 }}>
          {suggestedStops.slice(0, 5).map((stop, index) => (
            <div key={stop.id} className="list-item" style={{ alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{index + 1}. {stop.customerName}</div>
                <div className="muted">
                  {stop.address || "عنوان غير متوفر"} · {formatDistance(stop.distanceMeters)} · ETA {stop.etaMinutes ? `${stop.etaMinutes}د` : "-"}
                </div>
              </div>
              <span className="pill">{statusCopy[stop.status]?.label}</span>
            </div>
          ))}
          {!suggestedStops.length ? <div className="muted">فعّل GPS لاقتراح الترتيب الأمثل.</div> : null}
        </div>
        <div className="muted" style={{ marginTop: 8 }}>نصيحة الدور: {roleHints[role] || roleHints.rep}</div>
      </div>

      <GoogleMapWidget
        center={selectedStop?.location || currentLocation || undefined}
        currentLocation={currentLocation || undefined}
        markers={enrichedStops
          .filter((s) => s.location)
          .map((stop) => ({
            id: stop.id,
            position: stop.location!,
            label: stop.customerName,
            color: statusCopy[stop.status]?.color,
            timestamp: stop.scheduledFor || null,
          }))}
      />

      {loading ? <div className="card">جارٍ تحميل البيانات...</div> : null}
      {error ? <div className="card" style={{ color: "#f87171" }}>{error}</div> : null}

      {selectedStop ? (
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700 }}>{selectedStop.customerName}</div>
            <div className="muted">{selectedStop.address || "عنوان غير متوفر"}</div>
          </div>
          <button
            type="button"
            onClick={() =>
              navigate("/visits", {
                state: { customerId: selectedStop.customerId },
              })
            }
          >
            إنشاء زيارة
          </button>
        </div>
      ) : null}

      <div className="list">
        {enrichedStops.map((stop) => (
          <button
            type="button"
            key={stop.id}
            style={{ textAlign: "right" }}
            className="list-item"
            onClick={() => setSelectedStop(stop)}
          >
            <div>
              <div style={{ fontWeight: 700 }}>{stop.customerName}</div>
              <div className="muted">
                {stop.address || "عنوان غير متوفر"}{stop.scheduledFor ? ` - ${new Date(stop.scheduledFor).toLocaleTimeString()}` : ""}
              </div>
              {stop.distanceMeters != null ? <div className="muted">المسافة: {formatDistance(stop.distanceMeters)}</div> : null}
            </div>
            <span className="pill">
              <span className={`status-dot ${stop.status === "done" ? "done" : stop.status === "in-progress" ? "active" : stop.status === "skipped" ? "skipped" : "planned"}`} />
              {statusCopy[stop.status]?.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
