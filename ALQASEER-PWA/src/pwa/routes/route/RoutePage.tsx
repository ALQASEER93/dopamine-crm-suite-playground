import React, { useEffect, useMemo, useState } from "react";
import { getTodayRoute } from "../../api/client";
import { RouteStop } from "../../api/types";
import { PageHeader } from "../../components/system/PageHeader";
import { ListItem } from "../../components/system/ListItem";
import { EmptyState } from "../../components/system/EmptyState";

type Position = { lat: number; lng: number };

function haversine(a: Position, b: Position) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const calc =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(calc));
}

export default function RoutePage() {
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getTodayRoute();
        setStops(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 6000 },
    );
  }, []);

  const orderedStops = useMemo(() => {
    const data = [...stops];
    if (!nearbyOnly || !position) return data;
    return data.filter((stop) => stop.location && haversine(position, stop.location) <= 5);
  }, [stops, nearbyOnly, position]);

  const moveStop = (index: number, direction: -1 | 1) => {
    setStops((prev) => {
      const next = [...prev];
      const swapIndex = index + direction;
      if (swapIndex < 0 || swapIndex >= next.length) return prev;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  };

  return (
    <div className="page">
      <PageHeader
        title="المسار"
        subtitle="رتّب زياراتك بحسب الأولوية والمسافة."
        actions={
          <button className="btn btn-ghost" type="button" onClick={() => setNearbyOnly((prev) => !prev)}>
            {nearbyOnly ? "عرض الكل" : "القريب فقط"}
          </button>
        }
      />

      <div className="card">
        <div className="card-header">
          <div className="section-title">تقدير اليوم</div>
          <span className="chip">{orderedStops.length} محطة</span>
        </div>
        <div className="muted">
          المدة المتوقعة: {orderedStops.length ? `${Math.max(1, orderedStops.length * 18)} دقيقة` : "—"} •
          المسافة التقريبية: {orderedStops.length ? `${Math.max(2, orderedStops.length * 1.3).toFixed(1)} كم` : "—"}
        </div>
      </div>

      {loading ? (
        <div className="card">...تحميل</div>
      ) : orderedStops.length ? (
        <div className="list">
          {orderedStops.map((stop, index) => (
            <ListItem
              key={stop.id}
              title={`${index + 1}. ${stop.customerName}`}
              subtitle={stop.address || "بدون عنوان"}
              meta={<span className="chip">{stop.status}</span>}
              action={
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-ghost" type="button" onClick={() => moveStop(index, -1)}>
                    ↑
                  </button>
                  <button className="btn btn-ghost" type="button" onClick={() => moveStop(index, 1)}>
                    ↓
                  </button>
                </div>
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد محطات" description="أضف زيارات لمسار اليوم لعرضها هنا." />
      )}
    </div>
  );
}
