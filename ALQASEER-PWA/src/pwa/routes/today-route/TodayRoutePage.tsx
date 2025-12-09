import React, { useEffect, useState } from "react";
import { GoogleMapWidget } from "../../components/map/GoogleMap";
import { getTodayRoute } from "../../api/client";
import { RouteStop } from "../../api/types";

const statusCopy: Record<RouteStop["status"], { label: string; color: string }> = {
  planned: { label: "مجدول", color: "#fbbf24" },
  "in-progress": { label: "جارٍ التنفيذ", color: "#22d3ee" },
  done: { label: "منجز", color: "#34d399" },
  skipped: { label: "تم التجاوز", color: "#f87171" },
};

export default function TodayRoutePage() {
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [selectedStop, setSelectedStop] = useState<RouteStop | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getTodayRoute();
        setStops(data);
        setSelectedStop(data[0] || null);
      } catch (err) {
        setError("تعذّر تحميل مسار اليوم، سيتم استخدام البيانات المخزنة إذا توفرت.");
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
          <div className="muted">عرض الزيارات المخططة مع حالة كل نقطة.</div>
        </div>
        <span className="pill">إجمالي: {stops.length}</span>
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
          }))}
      />

      {loading ? <div className="card">...تحميل</div> : null}
      {error ? <div className="card" style={{ color: "#f87171" }}>{error}</div> : null}

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
                {stop.address || "بدون عنوان"} {stop.scheduledFor ? `• ${new Date(stop.scheduledFor).toLocaleTimeString()}` : ""}
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
