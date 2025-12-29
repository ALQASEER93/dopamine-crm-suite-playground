export type PwaPreferences = {
  gpsAlerts: boolean;
  offlineWarnings: boolean;
  dailyDigest: boolean;
  gpsAccuracyThreshold: number;
  geofenceRadius: number;
  roleTheme: "rep" | "sales" | "admin" | "supervisor";
};

const STORAGE_KEY = "dpm-pwa-preferences";

const DEFAULT_PREFERENCES: PwaPreferences = {
  gpsAlerts: true,
  offlineWarnings: true,
  dailyDigest: false,
  gpsAccuracyThreshold: 80,
  geofenceRadius: 250,
  roleTheme: "rep",
};

export const readPreferences = (): PwaPreferences => {
  if (typeof window === "undefined") {
    return { ...DEFAULT_PREFERENCES };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PREFERENCES };
    }
    const parsed = JSON.parse(raw) as Partial<PwaPreferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
    };
  } catch (error) {
    console.warn("Failed to read PWA preferences", error);
    return { ...DEFAULT_PREFERENCES };
  }
};

export const savePreferences = (next: PwaPreferences) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Failed to persist PWA preferences", error);
  }
};

