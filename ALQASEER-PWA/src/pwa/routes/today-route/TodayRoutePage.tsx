import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMapWidget } from "../../components/map/GoogleMap";
import { getTodayRoute } from "../../api/client";
import { RouteStop } from "../../api/types";

const statusCopy: Record<RouteStop["status"], { label: string; color: string }> = {
  planned: { label: "\u0645\u062e\u0637\u0637\u0629", color: "#fbbf24" },
  "in-progress": { label: "\u062c\u0627\u0631\u064d \u0627\u0644\u062a\u0646\u0641\u064a\u0630", color: "#22d3ee" },
  done: { label: "\u062a\u0645\u062a", color: "#34d399" },
  skipped: { label: "\u062a\u0645 \u0627\u0644\u062a\u062e\u0637\u064a", color: "#f87171" },
};

export default function TodayRoutePage() {
  const navigate = useNavigate();
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [selectedStop, setSelectedStop] = useState<RouteStop | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getTodayRoute();
        setStops(data);
        setSelectedStop(data[0] || null);
      } catch (err) {
        setError("\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0645\u0633\u0627\u0631 \u0627\u0644\u064a\u0648\u0645. \u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0623\u0648 \u062d\u062f\u0651\u062b \u0627\u0644\u0635\u0641\u062d\u0629.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="page" aria-label="today-route-page">
      <div className="card-header" style={{ padding: "0 4px" }}>
        <div>
          <div className="section-title">{"\u0645\u0633\u0627\u0631 \u0627\u0644\u064a\u0648\u0645"}</div>
          <div className="muted">{"\u0627\u0633\u062a\u0639\u0631\u0636 \u0632\u064a\u0627\u0631\u0627\u062a \u0627\u0644\u064a\u0648\u0645 \u0648\u0627\u0636\u063a\u0637 \u0644\u0628\u062f\u0621 \u0627\u0644\u0632\u064a\u0627\u0631\u0629."}</div>
        </div>
        <span className="pill">{`\u0639\u062f\u062f \u0627\u0644\u0632\u064a\u0627\u0631\u0627\u062a: ${stops.length}`}</span>
      </div>

      <GoogleMapWidget
        center={selectedStop?.location || undefined}
        currentLocation={null}
        markers={stops
          .filter((s) => s.location)
          .map((stop) => ({
            id: stop.id,
            position: stop.location!,
            label: stop.customerName,
            color: statusCopy[stop.status]?.color,
            timestamp: stop.scheduledFor || null,
          }))}
      />

      {loading ? <div className="card">{"\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644..."}</div> : null}
      {error ? <div className="card" style={{ color: "#f87171" }}>{error}</div> : null}

      {selectedStop ? (
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700 }}>{selectedStop.customerName}</div>
            <div className="muted">{selectedStop.address || "\u0639\u0646\u0648\u0627\u0646 \u063a\u064a\u0631 \u0645\u062a\u0648\u0641\u0631"}</div>
          </div>
          <button
            type="button"
            onClick={() =>
              navigate("/visits", {
                state: { customerId: selectedStop.customerId },
              })
            }
          >
            {"\u0628\u062f\u0621 \u0627\u0644\u0632\u064a\u0627\u0631\u0629"}
          </button>
        </div>
      ) : null}

      <div className="list">
        {stops.map((stop) => (
          <button
            type="button"
            key={stop.id}
            style={{ textAlign: "right" }}
            className="list-item"
            onClick={() => setSelectedStop(stop)}
          >
            <div>
              <div style={{ fontWeight: 700 }}>{stop.customerName}</div>
              <div className="muted">
                {stop.address || "\u0639\u0646\u0648\u0627\u0646 \u063a\u064a\u0631 \u0645\u062a\u0648\u0641\u0631"}{stop.scheduledFor ? ` - ${new Date(stop.scheduledFor).toLocaleTimeString()}` : ""}
              </div>
            </div>
            <span className="pill">
              <span className={`status-dot ${stop.status === "done" ? "done" : stop.status === "in-progress" ? "active" : stop.status === "skipped" ? "skipped" : "planned"}`} />
              {statusCopy[stop.status]?.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
