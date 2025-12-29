const toRad = (value: number) => (value * Math.PI) / 180;

export const distanceMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const radius = 6371e3;
  const phi1 = toRad(a.lat);
  const phi2 = toRad(b.lat);
  const deltaPhi = toRad(b.lat - a.lat);
  const deltaLambda = toRad(b.lng - a.lng);

  const sinPhi = Math.sin(deltaPhi / 2);
  const sinLambda = Math.sin(deltaLambda / 2);
  const c = sinPhi * sinPhi + Math.cos(phi1) * Math.cos(phi2) * sinLambda * sinLambda;
  return 2 * radius * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
};

export const formatDistance = (value?: number | null) => {
  if (value == null || Number.isNaN(value)) {
    return "غير متاح";
  }
  if (value < 1000) {
    return `${Math.round(value)}م`;
  }
  return `${(value / 1000).toFixed(1)}كم`;
};

