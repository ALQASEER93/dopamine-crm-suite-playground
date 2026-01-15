import React, { useEffect, useMemo, useState } from "react";
import { GoogleMapWidget } from "../../components/map/GoogleMap";
import { getCustomers, getVisits, sendLocationPing } from "../../api/client";
import { Customer, Visit } from "../../api/types";
import { PageHeader } from "../../components/system/PageHeader";
import { ListItem } from "../../components/system/ListItem";
import { EmptyState } from "../../components/system/EmptyState";
import { Skeleton } from "../../components/system/Skeleton";

type Position = { lat: number; lng: number };

const statusColor: Record<string, string> = {
  SCHEDULED: "#fbbf24",
  IN_PROGRESS: "#22d3ee",
  COMPLETED: "#34d399",
  CANCELED: "#f87171",
  NO_SHOW: "#f87171",
};

export default function MapPage() {
  const [position, setPosition] = useState<Position | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [customerData, visitData] = await Promise.all([getCustomers(), getVisits()]);
        setCustomers(customerData);
        setVisits(visitData);
      } catch (error) {
        console.error("[map]", error);
        setError("تعذر تحميل بيانات العملاء أو الزيارات.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStatus("المتصفح لا يدعم تحديد الموقع.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(coords);
        setAccuracy(pos.coords.accuracy ?? null);
        setStatus(null);
        await sendLocationPing({ lat: coords.lat, lng: coords.lng, accuracy: pos.coords.accuracy });
      },
      (err) => {
        setStatus(`تعذّر الحصول على الموقع: ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 },
    );
  };

  const markers = useMemo(
    () =>
      customers
        .filter((c) => c.location)
        .map((c) => {
          const visit = visits.find((v) => v.customerId === c.id);
          return {
            id: c.id,
            position: c.location!,
            label: c.name,
            color: statusColor[visit?.status || "SCHEDULED"] || "#94a3b8",
          };
        }),
    [customers, visits],
  );

  const openInMaps = (customer: Customer) => {
    if (!customer.location) return;
    const dest = `${customer.location.lat},${customer.location.lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
    window.open(url, "_blank");
  };

  return (
    <div className="page">
      <PageHeader
        title="الخريطة"
        subtitle="عرض مواقع العملاء وحالة الزيارة."
        actions={
          <button className="btn btn-primary" type="button" onClick={requestLocation}>
            تحديد موقعي
          </button>
        }
      />

      {status ? <div className="card" style={{ color: "var(--warning)" }}>{status}</div> : null}
      {error ? <div className="card" style={{ color: "var(--danger)" }}>{error}</div> : null}

      {loading ? (
        <Skeleton height={260} />
      ) : (
        <GoogleMapWidget
          center={position || undefined}
          currentLocation={position}
          currentAccuracy={accuracy}
          currentTimestamp={position ? new Date().toISOString() : null}
          markers={markers}
        />
      )}

      <div className="card">
        <div className="section-title">تنبيه التتبع</div>
        <div className="muted">التتبع يعمل أثناء فتح التطبيق فقط (بدون تتبع خلفي).</div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="section-title">أقرب العملاء</div>
          <span className="chip">{customers.length}</span>
        </div>
        {loading ? (
          <div className="skeleton-stack">
            <Skeleton height={72} />
            <Skeleton height={72} />
          </div>
        ) : customers.length ? (
          <div className="list">
            {customers.slice(0, 4).map((customer) => (
              <ListItem
                key={customer.id}
                title={customer.name}
                subtitle={customer.address || "بدون عنوان"}
                meta={<span className="chip">{customer.type === "doctor" ? "طبيب" : "صيدلية"}</span>}
                action={
                  <button className="btn btn-ghost" type="button" onClick={() => openInMaps(customer)}>
                    فتح في الخرائط
                  </button>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="لا توجد مواقع محفوظة"
            description="أضف مواقع العملاء من صفحة العملاء لعرضهم على الخريطة."
          />
        )}
      </div>
    </div>
  );
}
