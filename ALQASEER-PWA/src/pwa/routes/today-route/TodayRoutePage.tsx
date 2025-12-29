import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMapWidget } from "../../components/map/GoogleMap";
import { getTodayRoute } from "../../api/client";
import { RouteStop } from "../../api/types";

const statusCopy: Record<RouteStop["status"], { label: string; color: string }> = {
  planned: { label: "مخططة", color: "#fbbf24" },
  "in-progress": { label: "جارٍ التنفيذ", color: "#22d3ee" },
  done: { label: "تمت", color: "#34d399" },
  skipped: { label: "تم التخطي", color: "#f87171" },
};

export default function TodayRoutePage() {
  const navigate = useNavigate();
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [selectedStop, setSelectedStop] = useState<RouteStop | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError("تعذر تحميل مسار اليوم. تحقق من الاتصال أو حدّث الصفحة.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="page" aria-label="today-route-page">
      <div className="card-header" style={{ padding: "0 4px" }}>
        <div>
          <div className="section-title">مسار اليوم</div>
          <div className="muted">استعرض زيارات اليوم واضغط لبدء الزيارة.</div>
        </div>
        <span className="pill">عدد الزيارات: {stops.length}</span>
      </div>

      <div className="card">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">إجمالي الزيارات</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.done}</div>
            <div className="stat-label">منجزة اليوم</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats["in-progress"]}</div>
            <div className="stat-label">قيد التنفيذ</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.planned}</div>
            <div className="stat-label">متبقية</div>
          </div>
        </div>
      </div>

      <GoogleMapWidget
        center={selectedStop?.location || undefined}
        currentLocation={null}
        markers={stops
          .filter((s) => s.location)
          .map((stop) => ({
            id: stop.id,
            position: stop.location!,
            label: stop.customerName,
            color: statusCopy[stop.status]?.color,
            timestamp: stop.scheduledFor || null,
          }))}
      />

      {loading ? <div className="card">جاري التحميل...</div> : null}
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
            بدء الزيارة
          </button>
        </div>
      ) : null}

      <div className="list">
        {stops.map((stop) => (
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
