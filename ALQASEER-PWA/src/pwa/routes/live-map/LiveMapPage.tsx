import React, { useEffect, useState } from "react";
import { GoogleMapWidget } from "../../components/map/GoogleMap";
import type { Customer } from "../../api/types";
import { getCustomers, sendLocationPing } from "../../api/client";
import { useOfflineQueue } from "../../hooks/useOfflineQueue";
import { buildGoogleMapsUrl, buildOpenStreetMapUrl } from "../../utils/mapLinks";

function gpsErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) return "تم رفض إذن الموقع. فعّل الصلاحية من إعدادات المتصفح.";
  if (error.code === error.POSITION_UNAVAILABLE) return "الموقع غير متاح حالياً. انتقل لمكان مفتوح وحاول مجدداً.";
  if (error.code === error.TIMEOUT) return "انتهت مهلة تحديد الموقع. حاول مرة أخرى.";
  return "تعذر الحصول على الموقع.";
}

export default function LiveMapPage() {
  const [position, setPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [positionAccuracy, setPositionAccuracy] = useState<number | null>(null);
  const [positionTimestamp, setPositionTimestamp] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const { enqueue } = useOfflineQueue();

  useEffect(() => {
    let watchId: number | null = null;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPosition(coords);
          setPositionAccuracy(pos.coords.accuracy ?? null);
          setPositionTimestamp(new Date(pos.timestamp || Date.now()).toISOString());
          setStatus(pos.coords.accuracy && pos.coords.accuracy > 80 ? `دقة منخفضة: ${Math.round(pos.coords.accuracy)}م` : null);
          void sendLocation(coords, pos.coords.accuracy);
        },
        (err) => setStatus(gpsErrorMessage(err)),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
      );
    } else {
      setStatus("المتصفح لا يدعم تحديد الموقع.");
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setCustomers(await getCustomers());
      } catch (err) {
        console.error(err);
      }
    };
    void loadCustomers();
  }, []);

  const sendLocation = async (coords: google.maps.LatLngLiteral, accuracy?: number | null) => {
    if (!navigator.onLine) {
      await enqueue({ type: "location", endpoint: "pwa/tracking/pings", method: "POST", payload: { lat: coords.lat, lng: coords.lng, accuracy } });
      return;
    }
    const res = await sendLocationPing({ lat: coords.lat, lng: coords.lng, accuracy });
    if (!res.success) {
      await enqueue({ type: "location", endpoint: "pwa/tracking/pings", method: "POST", payload: { lat: coords.lat, lng: coords.lng, accuracy } });
    }
  };

  return (
    <div className="page">
      <section className="hero-band">
        <div className="card-header">
          <div>
            <div className="section-title">الخريطة الحية</div>
            <div className="muted">موقعي الحالي والعملاء القريبون مع دقة GPS ووقت الالتقاط.</div>
          </div>
          <span className="pill">{navigator.onLine ? "متصل" : "دون اتصال"}</span>
        </div>
        {status ? <div style={{ color: "var(--warning)" }}>{status}</div> : null}
      </section>

      <GoogleMapWidget
        currentLocation={position}
        currentAccuracy={positionAccuracy}
        currentTimestamp={positionTimestamp}
        markers={customers
          .filter((customer) => customer.location)
          .map((customer) => ({
            id: customer.id,
            position: customer.location!,
            label: customer.name,
            color: customer.type === "doctor" ? "#22d3ee" : "#a855f7",
          }))}
      />

      <div className="card">
        <div className="section-title">معلومات GPS</div>
        <div className="grid">
          <div><span className="muted">الإحداثيات</span><br />{position ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` : "بانتظار تحديد الموقع"}</div>
          <div><span className="muted">الدقة</span><br />{positionAccuracy !== null ? `${Math.round(positionAccuracy)}م` : "غير متوفر"}</div>
          <div><span className="muted">وقت الالتقاط</span><br />{positionTimestamp ? new Date(positionTimestamp).toLocaleString("ar-JO") : "غير متوفر"}</div>
        </div>
        {position ? (
          <div className="actions-row" style={{ marginTop: 10 }}>
            <a className="secondary-button" href={buildGoogleMapsUrl(position.lat, position.lng)} target="_blank" rel="noreferrer">Google Maps</a>
            <a className="secondary-button" href={buildOpenStreetMapUrl(position.lat, position.lng)} target="_blank" rel="noreferrer">OpenStreetMap</a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
