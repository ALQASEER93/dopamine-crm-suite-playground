import React, { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../api/client";
import { getQueueMeta, getQueuedMutations, replayQueuedMutations } from "../../offline/queue";
import { useAuthStore } from "../../state/auth";
import { useNavigate } from "react-router-dom";
import { readPreferences, savePreferences } from "../../utils/preferences";

export default function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastAttemptAt, setLastAttemptAt] = useState<string | null>(null);
  const [queueItems, setQueueItems] = useState(() => getQueuedMutations());
  const [preferences, setPreferences] = useState(() => readPreferences());

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const refreshQueue = () => {
    const queue = getQueuedMutations();
    setQueueItems(queue);
    setQueueCount(queue.length);
    const meta = getQueueMeta();
    setLastSyncAt(meta.lastSyncAt ?? null);
    setLastAttemptAt(meta.lastAttemptAt ?? null);
  };

  useEffect(() => {
    refreshQueue();
  }, []);

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  const queueBreakdown = useMemo(() => {
    return queueItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});
  }, [queueItems]);

  const syncNow = async () => {
    const res = await replayQueuedMutations();
    refreshQueue();
    setSyncResult(`??? ?????? ?????? ${res.attempted} ??????? ??????? ${res.pending}.`);
  };

  return (
    <div className="page">
      <div className="card">
        <div className="section-title">????? ??????</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div>?????: {user?.name || "??? ?????"}</div>
          <div>??????: {user?.email || "??? ?????"}</div>
          <div>?????: {user?.role || "??? ?????"}</div>
          <div>??????: {API_BASE_URL}</div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">???? ????? ??? ?????</div>
        <div className="muted">?????? ?????: {queueCount}</div>
        <div className="muted">??? ?????? ??????: {lastAttemptAt ? new Date(lastAttemptAt).toLocaleString() : "?? ??? ???"}</div>
        <div className="muted">??? ?????? ?????: {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "?? ??? ???"}</div>
        <div className="chip-row" style={{ marginTop: 8 }}>
          {Object.entries(queueBreakdown).map(([type, count]) => (
            <span className="chip" key={type}>{type}: {count}</span>
          ))}
          {!Object.keys(queueBreakdown).length ? <span className="chip">?? ???? ?????? ?????</span> : null}
        </div>
        <button type="button" onClick={syncNow} disabled={!queueCount}>
          ?????? ????
        </button>
        {syncResult ? <div className="muted">{syncResult}</div> : null}
        <div className="list" style={{ marginTop: 12 }}>
          {queueItems.slice(0, 6).map((item) => (
            <div key={item.id} className="list-item" style={{ alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{item.type}</div>
                <div className="muted">{item.endpoint}</div>
              </div>
              <div className="muted">{new Date(item.createdAt).toLocaleString()}</div>
            </div>
          ))}
          {!queueItems.length ? <div className="muted">????? ???????? ?????.</div> : null}
        </div>
      </div>

      <div className="card">
        <div className="section-title">??????? GPS ?????? ??? ?????</div>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={preferences.gpsAlerts}
            onChange={(e) => setPreferences((prev) => ({ ...prev, gpsAlerts: e.target.checked }))}
          />
          ??????? GPS ??? ?????? ?? ???? ??????
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={preferences.offlineWarnings}
            onChange={(e) => setPreferences((prev) => ({ ...prev, offlineWarnings: e.target.checked }))}
          />
          ??? ??????? ????? ??? ?????
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={preferences.dailyDigest}
            onChange={(e) => setPreferences((prev) => ({ ...prev, dailyDigest: e.target.checked }))}
          />
          ???? ???? ??????
        </label>
        <div className="grid" style={{ marginTop: 12 }}>
          <div>
            <label>?? ??? GPS (???)</label>
            <input
              type="number"
              min={10}
              max={500}
              value={preferences.gpsAccuracyThreshold}
              onChange={(e) => setPreferences((prev) => ({ ...prev, gpsAccuracyThreshold: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label>???? ??????? ???????? (???)</label>
            <input
              type="number"
              min={50}
              max={2000}
              value={preferences.geofenceRadius}
              onChange={(e) => setPreferences((prev) => ({ ...prev, geofenceRadius: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label>??????? ??? ?????</label>
            <select
              value={preferences.roleTheme}
              onChange={(e) => setPreferences((prev) => ({ ...prev, roleTheme: e.target.value as typeof prev.roleTheme }))}
            >
              <option value="rep">?????</option>
              <option value="sales">??????</option>
              <option value="supervisor">????</option>
              <option value="admin">?????</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">????? ??????</div>
        <button type="button" onClick={logout}>
          ????? ??????
        </button>
      </div>
    </div>
  );
}
