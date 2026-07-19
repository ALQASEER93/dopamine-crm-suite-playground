export type DpmCacheNames = {
  apiData: string;
  staticShell: string;
};

const fallbackVersion = import.meta.env.VITE_APP_VERSION || "0.2.0";
const fallbackBuildMarker = import.meta.env.VITE_BUILD_MARKER || `dpm-pwa-${fallbackVersion}-phase-a`;

export const APP_VERSION = typeof __DPM_APP_VERSION__ === "string" ? __DPM_APP_VERSION__ : fallbackVersion;
export const BUILD_MARKER = typeof __DPM_BUILD_MARKER__ === "string" ? __DPM_BUILD_MARKER__ : fallbackBuildMarker;
export const BUILD_API_BASE = typeof __DPM_API_BASE__ === "string" ? __DPM_API_BASE__ : "/api/v1";
export const CACHE_NAMES: DpmCacheNames =
  typeof __DPM_CACHE_NAMES__ === "object"
    ? __DPM_CACHE_NAMES__
    : {
        apiData: `dpm-api-data-${fallbackBuildMarker}`,
        staticShell: `dpm-static-${fallbackBuildMarker}`,
      };
