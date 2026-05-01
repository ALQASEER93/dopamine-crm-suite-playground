import React, { FormEvent, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { createVisit, endVisit, getCustomers, getVisits, startVisit } from "../../api/client";
import { Customer, Visit } from "../../api/types";
import {
  enqueueMutation,
  generateOfflineVisitId,
  getOfflineVisits,
  getQueueMeta,
  getQueuedMutations,
  replayQueuedMutations,
  upsertOfflineVisit,
} from "../../offline/queue";

export default function VisitsPage() {
  const location = useLocation();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filters, setFilters] = useState({ date: "", status: "" });
  const [newVisit, setNewVisit] = useState({
    customerId: (location.state as any)?.customerId || "",
    visitType: "follow-up",
    status: "success",
    notes: "",
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const accuracyThreshold = 80;

  const mergeVisits = (serverVisits: Visit[], offlineVisits: Visit[]) => {
    const byId = new Map<string, Visit>();
    for (const visit of serverVisits) {
      byId.set(String(visit.id), visit);
    }
    for (const visit of offlineVisits) {
      byId.set(String(visit.id), { ...(byId.get(String(visit.id)) || {}), ...visit });
    }
    return Array.from(byId.values()).sort((left, right) => {
      const leftAt = Date.parse(left.visitedAt || left.startedAt || "") || 0;
      const rightAt = Date.parse(right.visitedAt || right.startedAt || "") || 0;
      return rightAt - leftAt;
    });
  };

  const loadData = async () => {
    const [visitsData, customersData, offlineVisits] = await Promise.all([
      getVisits(),
      getCustomers(),
      getOfflineVisits(),
    ]);
    setCustomers(customersData);
    setVisits(mergeVisits(visitsData, offlineVisits));
  };

  const refreshQueue = async () => {
    const [queue, meta] = await Promise.all([getQueuedMutations(), getQueueMeta()]);
    setQueueCount(queue.length);
    setLastSyncAt(meta.lastSyncAt ?? null);
  };

  const readPosition = () =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 5000,
      });
    });

  useEffect(() => {
    void refreshQueue();
    readPosition()
      .then((pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAccuracy(pos.coords.accuracy ?? null);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        await loadData();
      } catch (err) {
        console.error(err);
      }
    };
    void load();
  }, []);

  const handleSubmit = async (evt: FormEvent) => {
    evt.preventDefault();
    setLoading(true);
    setMessage(null);

    const customer = customers.find((c) => c.id === newVisit.customerId);
    if (!customer) {
      setMessage("\u064a\u0631\u062c\u0649 \u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0639\u0645\u064a\u0644 \u0623\u0648\u0644\u0627\u064b.");
      setLoading(false);
      return;
    }

    const position = coords ? { coords, accuracy } : await ensurePosition();
    if (!position) {
      setLoading(false);
      return;
    }
    if (!validateAccuracy(position.accuracy)) {
      setLoading(false);
      return;
    }

    const payload = {
      customerId: customer.id,
      customerName: customer.name,
      customerType: customer.type,
      visitType: newVisit.visitType as Visit["visitType"],
      status: newVisit.status as Visit["status"],
      notes: newVisit.notes,
      coordinates: position.coords,
      visitedAt: new Date().toISOString(),
    };

    try {
      if (navigator.onLine) {
        const created = await createVisit(payload);
        setVisits((prev) => mergeVisits([{ ...created, serverStatus: "scheduled" }, ...prev], []));
        setMessage("\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u0632\u064a\u0627\u0631\u0629 \u0628\u0646\u062c\u0627\u062d.");
      } else {
        const localVisitId = generateOfflineVisitId();
        const queued = await enqueueMutation({
          endpoint: "pwa/visits",
          method: "POST",
          payload,
          type: "visit",
          localVisitId,
        });
        if (!queued.queued) {
          setMessage(
            queued.reason === "offline_limit_reached"
              ? "\u062a\u0645 \u062a\u062c\u0627\u0648\u0632 \u062d\u062f \u0627\u0644\u0639\u0645\u0644 \u062f\u0648\u0646 \u0627\u062a\u0635\u0627\u0644 (\u0633\u0627\u0639\u0629 \u064a\u0648\u0645\u064a\u064b\u0627). \u064a\u0631\u062c\u0649 \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0644\u0644\u0645\u0632\u0627\u0645\u0646\u0629."
              : "\u0644\u0645 \u062a\u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0639\u0645\u0644\u064a\u0629 (\u0645\u0643\u0631\u0631\u0629 \u0623\u0648 \u063a\u064a\u0631 \u0645\u0633\u0645\u0648\u062d\u0629)."
          );
          setLoading(false);
          return;
        }
        await upsertOfflineVisit({ ...payload, id: localVisitId, localVisitId, serverStatus: "pending_create" } as Visit);
        await Promise.all([loadData(), refreshQueue()]);
        setMessage("\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u0632\u064a\u0627\u0631\u0629 \u062f\u0648\u0646 \u0627\u062a\u0635\u0627\u0644 \u0648\u0633\u064a\u062a\u0645 \u0645\u0632\u0627\u0645\u0646\u062a\u0647\u0627 \u0644\u0627\u062d\u0642\u064b\u0627.");
      }
      setNewVisit({ customerId: "", visitType: "follow-up", status: "success", notes: "" });
    } catch (err) {
      setMessage("\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u0627\u0644\u0632\u064a\u0627\u0631\u0629. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateVisit = (visitId: string, patch: Partial<Visit>) => {
    setVisits((prev) => prev.map((visit) => (String(visit.id) === String(visitId) ? { ...visit, ...patch } : visit)));
  };

  const ensurePosition = async () => {
    try {
      const pos = await readPosition();
      const nextCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(nextCoords);
      setAccuracy(pos.coords.accuracy ?? null);
      return { coords: nextCoords, accuracy: pos.coords.accuracy ?? null };
    } catch {
      setMessage("\u062a\u0639\u0630\u0631 \u0627\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u0645\u0648\u0642\u0639 GPS.");
      return null;
    }
  };

  const validateAccuracy = (value: number | null) => {
    if (value !== null && value > accuracyThreshold) {
      setMessage(`\u062f\u0642\u0629 GPS \u0645\u0646\u062e\u0641\u0636\u0629 (${Math.round(value)}\u0645). \u0627\u0646\u062a\u0642\u0644 \u0644\u0645\u0643\u0627\u0646 \u0645\u0641\u062a\u0648\u062d \u0648\u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.`);
      return false;
    }
    return true;
  };

  const syncQueue = async () => {
    const res = await replayQueuedMutations();
    await Promise.all([loadData(), refreshQueue()]);
    setMessage(`\u062a\u0645\u062a \u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0632\u0627\u0645\u0646\u0629 ${res.attempted}\u060c \u0627\u0644\u0645\u062a\u0628\u0642\u064a ${res.pending}.`);
  };

  const handleVisitLifecycle = async (visit: Visit, type: "visit-start" | "visit-end") => {
    setLoading(true);
    setMessage(null);
    const position = await ensurePosition();
    if (!position || !validateAccuracy(position.accuracy)) {
      setLoading(false);
      return;
    }

    const payload = {
      lat: position.coords.lat,
      lng: position.coords.lng,
      accuracy: position.accuracy,
      [type === "visit-start" ? "startedAt" : "endedAt"]: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      const localVisitId = String(visit.id).startsWith("offline-visit-") ? String(visit.id) : undefined;
      const visitId = localVisitId ? undefined : String(visit.id);
      const queued = await enqueueMutation({
        endpoint: `visits/${visit.id}/${type === "visit-start" ? "start" : "end"}`,
        method: "POST",
        payload,
        type,
        localVisitId,
        visitId,
      });
      if (!queued.queued) {
        setMessage(
          queued.reason === "offline_limit_reached"
            ? "\u062d\u062f \u0627\u0644\u0639\u0645\u0644 \u062f\u0648\u0646 \u0627\u062a\u0635\u0627\u0644 \u0627\u0643\u062a\u0645\u0644 (\u0633\u0627\u0639\u0629 \u064a\u0648\u0645\u064a\u064b\u0627)."
            : "\u0644\u0645 \u062a\u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u0639\u0645\u0644\u064a\u0629 \u0627\u0644\u0632\u064a\u0627\u0631\u0629."
        );
        setLoading(false);
        return;
      }
      await upsertOfflineVisit({
        ...visit,
        localVisitId,
        startedAt: type === "visit-start" ? (payload as any).startedAt : visit.startedAt,
        endedAt: type === "visit-end" ? (payload as any).endedAt : visit.endedAt,
        serverStatus: type === "visit-start" ? "pending_start" : "pending_end",
      });
      await Promise.all([loadData(), refreshQueue()]);
      setMessage(
        type === "visit-start"
          ? "\u062a\u0645\u062a \u0625\u0636\u0627\u0641\u0629 \u0628\u062f\u0621 \u0627\u0644\u0632\u064a\u0627\u0631\u0629 \u0644\u0644\u0637\u0627\u0628\u0648\u0631 \u062f\u0648\u0646 \u0627\u062a\u0635\u0627\u0644."
          : "\u062a\u0645\u062a \u0625\u0636\u0627\u0641\u0629 \u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u0632\u064a\u0627\u0631\u0629 \u0644\u0644\u0637\u0627\u0628\u0648\u0631 \u062f\u0648\u0646 \u0627\u062a\u0635\u0627\u0644."
      );
      setLoading(false);
      return;
    }

    try {
      if (type === "visit-start") {
        await startVisit(visit.id, payload as { lat: number; lng: number; accuracy?: number | null; startedAt?: string });
        updateVisit(String(visit.id), { serverStatus: "in_progress", startedAt: (payload as any).startedAt });
        setMessage("\u062a\u0645 \u0628\u062f\u0621 \u0627\u0644\u0632\u064a\u0627\u0631\u0629.");
      } else {
        await endVisit(visit.id, payload as { lat: number; lng: number; accuracy?: number | null; endedAt?: string });
        updateVisit(String(visit.id), { serverStatus: "completed", endedAt: (payload as any).endedAt });
        setMessage("\u062a\u0645 \u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u0632\u064a\u0627\u0631\u0629.");
      }
    } catch (err) {
      setMessage(
        type === "visit-start"
          ? "\u062a\u0639\u0630\u0631 \u0628\u062f\u0621 \u0627\u0644\u0632\u064a\u0627\u0631\u0629. \u062a\u062d\u0642\u0642 \u0645\u0646 GPS \u062b\u0645 \u0623\u0639\u062f \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629."
          : "\u062a\u0639\u0630\u0631 \u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u0632\u064a\u0627\u0631\u0629. \u062a\u062d\u0642\u0642 \u0645\u0646 GPS \u062b\u0645 \u0623\u0639\u062f \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629."
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredVisits = visits.filter((visit) => {
    const matchesDate = filters.date ? visit.visitedAt?.slice(0, 10) === filters.date : true;
    const matchesStatus = filters.status ? visit.status === filters.status : true;
    return matchesDate && matchesStatus;
  });

  return (
    <div className="page">
      <div className="card">
        <div className="section-title">\u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0632\u064a\u0627\u0631\u0629</div>
        <div className="muted">\u062f\u0642\u0629 GPS: {accuracy !== null ? `${Math.round(accuracy)}\u0645` : "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d"}</div>
        <div className="muted">\u0645\u0639\u0644\u0642 \u0644\u0644\u0645\u0632\u0627\u0645\u0646\u0629: {queueCount}</div>
        <div className="muted">\u0622\u062e\u0631 \u0645\u0632\u0627\u0645\u0646\u0629: {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "\u0644\u0645 \u062a\u062a\u0645 \u0628\u0639\u062f"}</div>
        <button type="button" onClick={syncQueue} disabled={!queueCount}>
          \u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0622\u0646
        </button>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="customer">\u0627\u0644\u0639\u0645\u064a\u0644</label>
            <select
              id="customer"
              value={newVisit.customerId}
              onChange={(e) => setNewVisit((s) => ({ ...s, customerId: e.target.value }))}
              required
            >
              <option value="">\u0627\u062e\u062a\u0631</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - {c.type === "doctor" ? "\u0637\u0628\u064a\u0628" : "\u0635\u064a\u062f\u0644\u064a\u0629"}
                </option>
              ))}
            </select>
          </div>
          <div className="grid">
            <div>
              <label>\u0646\u0648\u0639 \u0627\u0644\u0632\u064a\u0627\u0631\u0629</label>
              <select value={newVisit.visitType} onChange={(e) => setNewVisit((s) => ({ ...s, visitType: e.target.value }))}>
                <option value="follow-up">\u0645\u062a\u0627\u0628\u0639\u0629</option>
                <option value="new">\u062c\u062f\u064a\u062f\u0629</option>
                <option value="reminder">\u062a\u0630\u0643\u064a\u0631</option>
              </select>
            </div>
            <div>
              <label>\u0627\u0644\u062d\u0627\u0644\u0629</label>
              <select value={newVisit.status} onChange={(e) => setNewVisit((s) => ({ ...s, status: e.target.value }))}>
                <option value="success">\u0646\u0627\u062c\u062d\u0629</option>
                <option value="refused">\u0645\u0631\u0641\u0648\u0636\u0629</option>
                <option value="no-show">\u0644\u0645 \u064a\u062d\u0636\u0631</option>
              </select>
            </div>
          </div>
          <div>
            <label>\u0645\u0644\u0627\u062d\u0638\u0627\u062a</label>
            <textarea
              rows={3}
              value={newVisit.notes}
              onChange={(e) => setNewVisit((s) => ({ ...s, notes: e.target.value }))}
              placeholder="\u0627\u0643\u062a\u0628 \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0632\u064a\u0627\u0631\u0629..."
            />
          </div>
          {message ? <div className="muted">{message}</div> : null}
          <button type="submit" disabled={loading}>
            {loading ? "\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638..." : "\u062d\u0641\u0638 \u0627\u0644\u0632\u064a\u0627\u0631\u0629"}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="section-title">\u0633\u062c\u0644 \u0627\u0644\u0632\u064a\u0627\u0631\u0627\u062a</div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <input type="date" value={filters.date} onChange={(e) => setFilters((s) => ({ ...s, date: e.target.value }))} />
            <select value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}>
              <option value="">\u0627\u0644\u0643\u0644</option>
              <option value="success">\u0646\u0627\u062c\u062d\u0629</option>
              <option value="refused">\u0645\u0631\u0641\u0648\u0636\u0629</option>
              <option value="no-show">\u0644\u0645 \u064a\u062d\u0636\u0631</option>
            </select>
          </div>
        </div>
        <div className="list">
          {filteredVisits.map((visit) => {
            const statusLabel = visit.serverStatus || visit.status;
            const canStart = !visit.startedAt && statusLabel !== "completed" && statusLabel !== "pending_start";
            const canEnd = statusLabel === "in_progress" || (!!visit.startedAt && statusLabel !== "completed" && statusLabel !== "pending_end");

            return (
              <div key={visit.id} className="list-item" style={{ alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{visit.customerName}</div>
                  <div className="muted">
                    {visit.visitType} - {visit.visitedAt ? new Date(visit.visitedAt).toLocaleString() : ""}
                  </div>
                  {visit.startedAt ? <div className="muted">\u0628\u062f\u0621: {new Date(visit.startedAt).toLocaleString()}</div> : null}
                  {visit.endedAt ? <div className="muted">\u0627\u0646\u062a\u0647\u0627\u0621: {new Date(visit.endedAt).toLocaleString()}</div> : null}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                  <span className="pill">{statusLabel}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => void handleVisitLifecycle(visit, "visit-start")} disabled={loading || !canStart}>\u0628\u062f\u0621</button>
                    <button type="button" onClick={() => void handleVisitLifecycle(visit, "visit-end")} disabled={loading || !canEnd}>\u0625\u0646\u0647\u0627\u0621</button>
                  </div>
                </div>
              </div>
            );
          })}
          {!filteredVisits.length ? <div className="muted">\u0644\u0627 \u062a\u0648\u062c\u062f \u0632\u064a\u0627\u0631\u0627\u062a \u062d\u062a\u0649 \u0627\u0644\u0622\u0646.</div> : null}
        </div>
      </div>
    </div>
  );
}
