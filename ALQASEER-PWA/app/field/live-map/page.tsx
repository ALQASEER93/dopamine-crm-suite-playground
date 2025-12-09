"use client";

import { useEffect, useMemo, useState } from "react";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import { clientFetch } from "../../../lib/client-fetch";

type Visit = {
  _id?: string;
  repId?: string;
  customerName?: string;
  customerId?: string;
  visitDate?: string;
  location?: {
    start?: { lat: number; lng: number };
    end?: { lat: number; lng: number };
  };
};

const containerStyle = {
  width: "100%",
  height: "420px",
  borderRadius: "16px",
};

const FALLBACK_CENTER = { lat: 24.7136, lng: 46.6753 };

function hasCoords(point?: { lat: number; lng: number }) {
  return !!point && typeof point.lat === "number" && typeof point.lng === "number";
}

export default function LiveMapPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "150" });
        const res = await clientFetch(`/api/visits?${params.toString()}`, {
          cache: "no-store",
        });
        const body = await res.json().catch(() => null);

        if (!res.ok || !body?.data) {
          throw new Error(
            (body && (body as any).error) || `Failed to load visits (${res.status})`
          );
        }

        if (!cancelled) {
          setVisits(Array.isArray(body.data) ? body.data : []);
        }
      } catch (err: any) {
        console.error("Failed to load visits for live map", err);
        if (!cancelled) {
          setError(err?.message || "Unexpected error while loading map data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const gpsVisits = useMemo(
    () =>
      visits.filter((v) => hasCoords(v.location?.start) || hasCoords(v.location?.end)),
    [visits]
  );

  const mapCenter = useMemo(() => {
    if (!gpsVisits.length) return FALLBACK_CENTER;

    const totals = gpsVisits.reduce(
      (acc, visit) => {
        const point = visit.location?.start || visit.location?.end;
        if (hasCoords(point)) {
          acc.lat += Number(point?.lat);
          acc.lng += Number(point?.lng);
          acc.count += 1;
        }
        return acc;
      },
      { lat: 0, lng: 0, count: 0 }
    );

    if (!totals.count) return FALLBACK_CENTER;
    return {
      lat: totals.lat / totals.count,
      lng: totals.lng / totals.count,
    };
  }, [gpsVisits]);

  return (
    <div className="stack">
      <div className="card">
        <div className="card-title">Live Map</div>
        <p className="muted text-small">
          Pulls geo-tagged visits from the same base URL config to keep
          environments aligned.
        </p>

        {error && <p className="muted text-small">Error: {error}</p>}
        {loadError && (
          <p className="muted text-small">
            Could not load Google Maps (check NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).
          </p>
        )}
        {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
          <p className="muted text-small">
            Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the live map.
          </p>
        )}

        {isLoaded && !loadError ? (
          <GoogleMap mapContainerStyle={containerStyle} center={mapCenter} zoom={11}>
            {gpsVisits.map((visit) => {
              const point = visit.location?.start || visit.location?.end;
              if (!hasCoords(point)) return null;
              return (
                <Marker
                  key={visit._id}
                  position={{ lat: Number(point?.lat), lng: Number(point?.lng) }}
                  label={visit.repId?.slice(0, 3)?.toUpperCase() || "REP"}
                />
              );
            })}
          </GoogleMap>
        ) : (
          <div className="map-skeleton">
            {loading ? "Loading visits..." : "Map will appear once scripts load."}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Recent GPS visits</div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Rep</th>
                <th>Customer</th>
                <th>Date</th>
                <th>GPS</th>
              </tr>
            </thead>
            <tbody>
              {gpsVisits.slice(0, 12).map((visit) => (
                <tr key={visit._id}>
                  <td>{visit.repId || "-"}</td>
                  <td>{visit.customerName || visit.customerId || "-"}</td>
                  <td>{visit.visitDate?.slice(0, 10) || "-"}</td>
                  <td>
                    {visit.location?.start
                      ? `${visit.location.start.lat.toFixed(4)}, ${visit.location.start.lng.toFixed(4)}`
                      : visit.location?.end
                      ? `${visit.location.end.lat.toFixed(4)}, ${visit.location.end.lng.toFixed(4)}`
                      : "n/a"}
                  </td>
                </tr>
              ))}
              {!gpsVisits.length && !loading && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center" }}>
                    No geo-tagged visits yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
