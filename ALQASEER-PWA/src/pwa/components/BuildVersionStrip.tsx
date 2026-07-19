import { APP_VERSION, BUILD_API_BASE, BUILD_MARKER, CACHE_NAMES } from "../buildInfo";

function displayApiBase(value: string) {
  return value.startsWith("/") ? value : "approved-https-api";
}

export function BuildVersionStrip() {
  return (
    <aside className="build-strip qa-build-strip" aria-label="build-version-marker" data-build-marker={BUILD_MARKER}>
      <span>DOPAMINE FIELD CRM</span>
      <span>الإصدار {APP_VERSION}</span>
      <span className="mono-value">{BUILD_MARKER}</span>
      <span className="mono-value">API {displayApiBase(BUILD_API_BASE)}</span>
      <span className="mono-value">SW {CACHE_NAMES.staticShell}</span>
    </aside>
  );
}
