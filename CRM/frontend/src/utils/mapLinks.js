export const buildOpenStreetMapUrl = (lat, lng) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;

export const buildGoogleMapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

export const formatCoords = (lat, lng) =>
  `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
