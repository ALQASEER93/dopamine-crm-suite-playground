"use client";

import { useEffect, useState } from "react";
import { clientFetch } from "../../../lib/client-fetch";

type Visit = {
  _id?: string;
  repId?: string;
  customerId?: string;
  customerName?: string;
  visitType?: string;
  status?: string;
  visitDate?: string;
  createdAt?: string;
};

function formatDate(value?: string) {
  if (!value) return "-";
  return value.slice(0, 10);
}

export default function VisitHistoryPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "40" });
      const res = await clientFetch(`/api/visits?${params.toString()}`, {
        cache: "no-store",
      });
      const body = await res.json().catch(() => null);
      const data = body?.data;
      if (!res.ok || !Array.isArray(data)) {
        throw new Error(
          (body && (body as any).error) || `Failed to load visits (${res.status})`
        );
      }
      setVisits(data);
    } catch (err: any) {
      console.error("Failed to load visit history", err);
      setError(err?.message || "Unexpected error while loading visit history");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="stack">
      <div className="card">
        <div className="card-title">Visit History</div>
        <p className="muted text-small">
          Recent visits pulled from the same API base configuration.
        </p>

        <div className="stack-inline">
          <button
            type="button"
            className="pill pill--dark"
            onClick={loadHistory}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          {error && <span className="muted text-small">Error: {error}</span>}
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Rep</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((visit) => (
                <tr key={visit._id}>
                  <td>{formatDate(visit.visitDate || visit.createdAt)}</td>
                  <td>{visit.repId || "-"}</td>
                  <td>{visit.customerName || visit.customerId || "-"}</td>
                  <td>{visit.visitType || "visit"}</td>
                  <td>{visit.status || "pending"}</td>
                </tr>
              ))}
              {!visits.length && !loading && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center" }}>
                    No visits found yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
