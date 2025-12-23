import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import React from "react";

type MarkerPoint = {
  id: string;
  position: google.maps.LatLngLiteral;
  label?: string;
  color?: string;
};

type Props = {
  center?: google.maps.LatLngLiteral;
  markers?: MarkerPoint[];
  currentLocation?: google.maps.LatLngLiteral | null;
  onMapClick?: (coords: google.maps.LatLngLiteral) => void;
};

const defaultCenter = { lat: 31.9539, lng: 35.9106 }; // Amman
const MAP_LIBRARIES = ["places"] as const;

export function GoogleMapWidget({ center, markers = [], currentLocation, onMapClick }: Props) {
  const [billingError, setBillingError] = React.useState(false);
  const apiKey = (
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ""
  ).trim();
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey as string,
    libraries: MAP_LIBRARIES,
  });

  React.useEffect(() => {
    const original = console.error;
    console.error = (...args: unknown[]) => {
      const message = args.map(String).join(" ");
      if (message.includes("BillingNotEnabledMapError")) {
        setBillingError(true);
      }
      original(...args);
    };
    return () => {
      console.error = original;
    };
  }, []);

  if (!apiKey) {
    return (
      <div className="card" style={{ background: "#1f2937", color: "#f87171" }}>
        يرجى إضافة مفتاح Google Maps في المتغير <code>VITE_GOOGLE_MAPS_API_KEY</code>.
      </div>
    );
  }

  if (billingError) {
    return (
      <div className="card" style={{ background: "#1f2937", color: "#fbbf24" }}>
        Billing ??? ???? ??? Google Cloud ?????? ???????. ??? Billing ??? ??? Project.
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="card">...تحميل الخريطة</div>;
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
