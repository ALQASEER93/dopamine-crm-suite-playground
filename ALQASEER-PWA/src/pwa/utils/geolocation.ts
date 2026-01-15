export type GeoSnapshot = {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
};

export function isSecureGeoContext() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  const isLocalhost = host === "localhost" || host === "127.0.0.1";
  return window.isSecureContext || isLocalhost;
}

export function getDeviceInfo() {
  if (typeof navigator === "undefined") return "unknown";
  return JSON.stringify({
    ua: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
  });
}

export function requestGeoSnapshot(): Promise<GeoSnapshot> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? 0,
          timestamp: new Date(pos.timestamp).toISOString(),
        });
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}
