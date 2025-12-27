import React, { useEffect, useState } from "react";
import { GoogleMapWidget } from "../../components/map/GoogleMap";
import { Customer } from "../../api/types";
import { getCustomers, sendLocationPing } from "../../api/client";
import { enqueueMutation } from "../../offline/queue";

export default function LiveMapPage() {
  const [position, setPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [positionAccuracy, setPositionAccuracy] = useState<number | null>(null);
  const [positionTimestamp, setPositionTimestamp] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let watchId: number | null = null;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPosition(coords);
          setPositionAccuracy(pos.coords.accuracy ?? null);
          setPositionTimestamp(new Date().toISOString());
          sendLocation(coords, pos.coords.accuracy);
        },
        (err) => {
          setStatus(`تعذّر الحصول على الموقع: ${err.message}`);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 },
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
        const data = await getCustomers();
        setCustomers(data);
      } catch (err) {
        console.error(err);
      }
    };

    loadCustomers();
  }, []);

  const sendLocation = async (coords: google.maps.LatLngLiteral, accuracy?: number | null) => {
    const online = navigator.onLine;
    if (!online) {
      enqueueMutation({
        type: "location",
        endpoint: "tracking/pings",
        method: "POST",
        payload: { lat: coords.lat, lng: coords.lng, accuracy },
      });
      return;
    }

    const res = await sendLocationPing({ lat: coords.lat, lng: coords.lng, accuracy });
    if (!res.success) {
      enqueueMutation({
        type: "location",
        endpoint: "tracking/pings",
        method: "POST",
        payload: { lat: coords.lat, lng: coords.lng, accuracy },
      });
    }
  };

  return (
    <div className="page">
      <div className="card-header" style={{ padding: "0 4px" }}>
        <div>
          <div className="section-title">الخريطة الحية</div>
          <div className="muted">موقعك الحالي وأقرب العملاء.</div>
        </div>
        {status ? <span className="pill" style={{ color: "#fbbf24" }}>{status}</span> : null}
      </div>

      <GoogleMapWidget
        currentLocation={position}
        currentAccuracy={positionAccuracy}
        currentTimestamp={positionTimestamp}
        markers={customers
          .filter((c) => c.location)
          .map((c) => ({
            id: c.id,
            position: c.location!,
            label: c.name,
            color: c.type === "doctor" ? "#22d3ee" : "#a855f7",
          }))}
      />

      <div className="card">
        <div className="section-title">معلومات الموقع</div>
        <div className="muted">الموقع يتم تحديثه تلقائياً كلما تحركت.</div>
        <div style={{ marginTop: 8, fontWeight: 700 }}>
          {position ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` : "بإنتظار تحديد الموقع"}
        </div>
      </div>
    </div>
  );
}
