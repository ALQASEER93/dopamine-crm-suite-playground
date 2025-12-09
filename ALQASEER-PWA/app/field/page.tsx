import { serverFetch } from "../../lib/server-fetch";

type Visit = {
  _id?: string;
  repId?: string;
  customerId?: string;
  customerName?: string;
  visitType?: string;
  status?: string;
  notes?: string;
  visitDate?: string;
  createdAt?: string;
  location?: {
    start?: { lat: number; lng: number };
    end?: { lat: number; lng: number };
  };
};

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 16).replace("T", " ");
}

async function loadTodaysRoute(): Promise<{
  visits: Visit[];
  error: string | null;
}> {
  const today = new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({
    limit: "50",
    dateFrom: today,
    dateTo: today,
  });

  try {
    const res = await serverFetch(`/api/visits?${params.toString()}`, {
      cache: "no-store",
    });

    const body = await res.json().catch(() => null);
    const data = (body && (body as any).data) || [];

    if (!res.ok || !Array.isArray(data)) {
      return {
        visits: [],
        error:
          (body && typeof (body as any).error === "string"
            ? (body as any).error
            : null) || `Unable to load today\u2019s route (${res.status})`,
      };
    }

    return { visits: data as Visit[], error: null };
  } catch (err: any) {
    console.error("Failed to load today route", err);
    return {
      visits: [],
      error: err?.message || "Unexpected error while loading today\u2019s route",
    };
  }
}

export default async function TodaysRoutePage() {
  const { visits, error } = await loadTodaysRoute();

  const total = visits.length;
  const completed = visits.filter(
    (v) => (v.status || "").toLowerCase() === "completed"
  ).length;
  const pending = visits.filter(
    (v) => (v.status || "").toLowerCase() !== "completed"
  ).length;

  return (
    <div className="stack">
      <div className="card-grid">
        <div className="card">
          <div className="card-title">Today&apos;s stops</div>
          <div className="card-value">{total}</div>
          <p className="muted text-small">
            Visits scheduled for the current day (API driven).
          </p>
        </div>
        <div className="card">
          <div className="card-title">Completed</div>
          <div className="card-value">{completed}</div>
          <p className="muted text-small">Synced with the shared base URL.</p>
        </div>
        <div className="card">
          <div className="card-title">Pending</div>
          <div className="card-value">{pending}</div>
          <p className="muted text-small">Stops still in progress.</p>
        </div>
      </div>

      {error ? (
        <div className="card soft-error">
          <div className="card-title">Heads up</div>
          <p className="muted">{error}</p>
        </div>
      ) : null}

      <div className="card">
        <div className="card-title">Today&apos;s route</div>
        {visits.length === 0 ? (
          <p className="muted">No visits loaded for today yet.</p>
        ) : (
          <div className="route-list">
            {visits.map((visit) => (
              <article key={visit._id || visit.customerName} className="route">
                <div className="route__header">
                  <div>
                    <p className="eyebrow">{visit.visitType || "visit"}</p>
                    <h3>{visit.customerName || visit.customerId || "Customer"}</h3>
                    <p className="muted text-small">
                      Rep: {visit.repId || "unknown"}
                    </p>
                  </div>
                  <span
                    className={
                      "pill " +
                      ((visit.status || "").toLowerCase() === "completed"
                        ? "pill--success"
                        : "pill--muted")
                    }
                  >
                    {visit.status || "pending"}
                  </span>
                </div>
                <div className="route__meta">
                  <div>
                    <p className="muted text-small">When</p>
                    <p>{formatDate(visit.visitDate || visit.createdAt)}</p>
                  </div>
                  <div>
                    <p className="muted text-small">Notes</p>
                    <p>{visit.notes?.slice(0, 80) || "—"}</p>
                  </div>
                  <div>
                    <p className="muted text-small">GPS</p>
                    <p>
                      {visit.location?.start || visit.location?.end
                        ? "Captured"
                        : "Not captured"}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
