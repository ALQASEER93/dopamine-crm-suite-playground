import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import React from "react";
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

const defaultCenter = { lat: 31.9539, lng: 35.9106 }; // Amman
const MAP_LIBRARIES = ["places"] as const;

const formatTimestamp = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "Not captured";

const MapLinksPanel = ({
  markers,
  currentLocation,
  currentAccuracy,
  currentTimestamp,
}: Pick<Props, "markers" | "currentLocation" | "currentAccuracy" | "currentTimestamp">) => {
  const renderPoint = (
    label: string,
    position?: google.maps.LatLngLiteral | null,
    accuracy?: number | null,
    timestamp?: string | null,
  ) => {
    if (!position) return null;
    const coordsText = formatCoords(position.lat, position.lng);
    const accuracyText =
      accuracy != null && Number.isFinite(Number(accuracy)) ? `+/-${Number(accuracy).toFixed(1)}m` : "n/a";
    return (
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="section-title">{label}</div>
        <div style={{ fontWeight: 700 }}>{coordsText}</div>
        <div className="muted">Accuracy: {accuracyText}</div>
        <div className="muted">Timestamp: {formatTimestamp(timestamp)}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <a
            className="btn btn-secondary"
            href={buildOpenStreetMapUrl(position.lat, position.lng)}
            target="_blank"
            rel="noreferrer"
          >
            Open in OpenStreetMap
          </a>
          <a
            className="btn btn-secondary"
            href={buildGoogleMapsUrl(position.lat, position.lng)}
            target="_blank"
            rel="noreferrer"
          >
            Open in Google Maps
          </a>
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderPoint("Current location", currentLocation, currentAccuracy, currentTimestamp)}
      {markers?.map((marker) =>
        renderPoint(marker.label || "Location", marker.position, marker.accuracy, marker.timestamp),
      )}
      <div className="muted" style={{ fontSize: 12 }}>
        (c) OpenStreetMap contributors
      </div>
    </div>
  );
};

const GoogleMapCanvas = ({ center, markers = [], currentLocation, onMapClick }: Props) => {
  const apiKey = (
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ""
  ).trim();
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey as string,
    libraries: MAP_LIBRARIES,
  });

  if (!apiKey) {
    return (
      <div className="card" style={{ background: "#1f2937", color: "#f87171" }}>
        USO?O?U% O?OOU?Oc U.U?O?OO- Google Maps U?US OU,U.O?O?USO? <code>VITE_GOOGLE_MAPS_API_KEY</code>.
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="card">...O?O-U.USU, OU,OrO?USO?Oc</div>;
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
          label="U.U^U,O1US"
        />
      ) : null}
    </GoogleMap>
  );
};

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

  return (
    <GoogleMapCanvas
      center={center}
      markers={markers}
      currentLocation={currentLocation}
      onMapClick={onMapClick}
    />
  );
}
