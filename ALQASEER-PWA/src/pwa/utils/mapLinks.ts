export const buildOpenStreetMapUrl = (lat: number, lng: number) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;

export const buildGoogleMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps?q=${lat},${lng}`;

export const formatCoords = (lat: number, lng: number) =>
  `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
