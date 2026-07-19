import React from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { buildGoogleMapsUrl, buildOpenStreetMapUrl, formatCoords } from "../../utils/mapLinks";

type MarkerPoint = {
  id: string;
  position: google.maps.LatLngLiteral;
  label?: string;
  color?: string;
  accuracy?: number | null;
  timestamp?: string | null;
};

type Props = {
  center?: google.maps.LatLngLiteral;
  markers?: MarkerPoint[];
  currentLocation?: google.maps.LatLngLiteral | null;
  currentAccuracy?: number | null;
  currentTimestamp?: string | null;
  onMapClick?: (coords: google.maps.LatLngLiteral) => void;
};

const defaultCenter = { lat: 31.9539, lng: 35.9106 };
const MAP_LIBRARIES = ["places"] as const;

const formatTimestamp = (value?: string | null) => (value ? new Date(value).toLocaleString("ar-JO") : "لم يتم الالتقاط");

function MapLinksPanel({
  markers,
  currentLocation,
  currentAccuracy,
  currentTimestamp,
}: Pick<Props, "markers" | "currentLocation" | "currentAccuracy" | "currentTimestamp">) {
  const renderPoint = (
    label: string,
    position?: google.maps.LatLngLiteral | null,
    accuracy?: number | null,
    timestamp?: string | null,
  ) => {
    if (!position) return null;
    const coordsText = formatCoords(position.lat, position.lng);
    const accuracyText = accuracy != null && Number.isFinite(Number(accuracy)) ? `${Number(accuracy).toFixed(1)}م` : "غير متوفر";

    return (
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="section-title">{label}</div>
        <div style={{ fontWeight: 700 }}>{coordsText}</div>
        <div className="muted">دقة GPS: {accuracyText}</div>
        <div className="muted">وقت الالتقاط: {formatTimestamp(timestamp)}</div>
        <div className="actions-row" style={{ marginTop: 8 }}>
          <a className="secondary-button" href={buildOpenStreetMapUrl(position.lat, position.lng)} target="_blank" rel="noreferrer">
            فتح في OpenStreetMap
          </a>
          <a className="secondary-button" href={buildGoogleMapsUrl(position.lat, position.lng)} target="_blank" rel="noreferrer">
            فتح في Google Maps
          </a>
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderPoint("موقعي الحالي", currentLocation, currentAccuracy, currentTimestamp)}
      {markers?.map((marker) => renderPoint(marker.label || "موقع عميل", marker.position, marker.accuracy, marker.timestamp))}
      <div className="muted" style={{ fontSize: 12 }}>
        يتم عرض روابط الملاحة كبديل ثابت إذا لم تتوفر خرائط Google داخل التطبيق.
      </div>
    </div>
  );
}

function GoogleMapCanvas({ center, markers = [], currentLocation, onMapClick }: Props) {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "").trim();
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: MAP_LIBRARIES,
  });

  if (!apiKey) {
    return (
      <div className="card">
        مفتاح Google Maps غير مضبوط. يمكن متابعة العمل عبر روابط OpenStreetMap وGoogle Maps أو ضبط <code>VITE_GOOGLE_MAPS_API_KEY</code>.
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="card">جاري تحميل الخريطة...</div>;
  }

  return (
    <GoogleMap
      onClick={(event) => {
        if (!event.latLng || !onMapClick) return;
        onMapClick({ lat: event.latLng.lat(), lng: event.latLng.lng() });
      }}
      mapContainerClassName="map-container"
      center={center || currentLocation || defaultCenter}
      zoom={12}
      options={{
        disableDefaultUI: true,
        styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
      }}
    >
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={marker.position}
          label={marker.label}
          icon={
            marker.color
              ? {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: marker.color,
                  fillOpacity: 0.9,
                  strokeColor: "#0b1220",
                  strokeWeight: 2,
                }
              : undefined
          }
        />
      ))}
      {currentLocation ? (
        <Marker
          position={currentLocation}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: "#22d3ee",
            fillOpacity: 1,
            strokeColor: "#0ea5e9",
            strokeWeight: 3,
          }}
          label="موقعي"
        />
      ) : null}
    </GoogleMap>
  );
}

export function GoogleMapWidget({
  center,
  markers = [],
  currentLocation,
  currentAccuracy,
  currentTimestamp,
  onMapClick,
}: Props) {
  const mapMode = (import.meta.env.VITE_MAP_MODE || "links").toLowerCase();

  if (mapMode !== "google") {
    return (
      <MapLinksPanel
        markers={markers}
        currentLocation={currentLocation}
        currentAccuracy={currentAccuracy}
        currentTimestamp={currentTimestamp}
      />
    );
  }

  return <GoogleMapCanvas center={center} markers={markers} currentLocation={currentLocation} onMapClick={onMapClick} />;
}
