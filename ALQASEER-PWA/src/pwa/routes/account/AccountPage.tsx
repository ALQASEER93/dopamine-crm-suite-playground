import React, { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../api/client";
import { getQueueMeta, getQueuedMutations, replayQueuedMutations } from "../../offline/queue";
import { useAuthStore } from "../../state/auth";
import { useNavigate } from "react-router-dom";
import { readPreferences, savePreferences } from "../../utils/preferences";
import { Visit } from "../../api/types";

const readCachedVisits = () => {
  try {
    const raw = window.localStorage.getItem("visits");
    return raw ? (JSON.parse(raw) as Visit[]) : [];
  } catch {
    return [];
  }
};

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
  const [visitStats, setVisitStats] = useState({ today: 0, month: 0 });

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

  const refreshVisitStats = () => {
    const visits = readCachedVisits();
    const todayKey = new Date().toISOString().slice(0, 10);
    const monthKey = new Date().toISOString().slice(0, 7);
    const todayCount = visits.filter((v) => (v.visitedAt || "").startsWith(todayKey)).length;
    const monthCount = visits.filter((v) => (v.visitedAt || "").startsWith(monthKey)).length;
    setVisitStats({ today: todayCount, month: monthCount });
  };

  useEffect(() => {
    refreshQueue();
    refreshVisitStats();
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
    refreshVisitStats();
    setSyncResult(`تمت محاولة مزامنة ${res.attempted} عمليات، المتبقي ${res.pending}.`);
  };

  return (
    <div className="page">
      <div className="card">
        <div className="section-title">الملف الشخصي</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div>الاسم: {user?.name || "غير متوفر"}</div>
          <div>البريد: {user?.email || "غير متوفر"}</div>
          <div>الدور: {user?.role || "غير متوفر"}</div>
          <div>الخادم: {API_BASE_URL}</div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">الأهداف التشغيلية</div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{visitStats.today}</div>
            <div className="stat-label">زيارات اليوم</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{visitStats.month}</div>
            <div className="stat-label">زيارات الشهر</div>
          </div>
        </div>
        <div className="grid" style={{ marginTop: 12 }}>
          <div>
            <label>هدف زيارات اليوم</label>
            <input
              type="number"
              min={1}
              value={preferences.dailyTargetVisits}
              onChange={(e) => setPreferences((prev) => ({ ...prev, dailyTargetVisits: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label>هدف زيارات الشهر</label>
            <input
              type="number"
              min={1}
              value={preferences.monthlyTargetVisits}
              onChange={(e) => setPreferences((prev) => ({ ...prev, monthlyTargetVisits: Number(e.target.value) }))}
            />
          </div>
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          نسبة الإنجاز اليومي: {preferences.dailyTargetVisits ? Math.min(100, (visitStats.today / preferences.dailyTargetVisits) * 100).toFixed(0) : 0}%
        </div>
      </div>

      <div className="card">
        <div className="section-title">لوحة العمل دون اتصال</div>
        <div className="muted">عمليات معلقة: {queueCount}</div>
        <div className="muted">آخر محاولة مزامنة: {lastAttemptAt ? new Date(lastAttemptAt).toLocaleString() : "لم تتم بعد"}</div>
        <div className="muted">آخر مزامنة ناجحة: {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "لم تتم بعد"}</div>
        <div className="chip-row" style={{ marginTop: 8 }}>
          {Object.entries(queueBreakdown).map(([type, count]) => (
            <span className="chip" key={type}>{type}: {count}</span>
          ))}
          {!Object.keys(queueBreakdown).length ? <span className="chip">لا توجد عمليات معلقة</span> : null}
        </div>
        <button type="button" onClick={syncNow} disabled={!queueCount}>
          مزامنة الآن
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
          {!queueItems.length ? <div className="muted">قائمة الانتظار فارغة.</div> : null}
        </div>
      </div>

      <div className="card">
        <div className="section-title">إعدادات GPS والعمل دون اتصال</div>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={preferences.gpsAlerts}
            onChange={(e) => setPreferences((prev) => ({ ...prev, gpsAlerts: e.target.checked }))}
          />
          تنبيهات GPS عند الخروج عن نطاق العميل
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={preferences.geofenceRequired}
            onChange={(e) => setPreferences((prev) => ({ ...prev, geofenceRequired: e.target.checked }))}
          />
          منع تسجيل الزيارة خارج النطاق الجغرافي
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={preferences.offlineWarnings}
            onChange={(e) => setPreferences((prev) => ({ ...prev, offlineWarnings: e.target.checked }))}
          />
          عرض تحذيرات العمل دون اتصال
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={preferences.dailyDigest}
            onChange={(e) => setPreferences((prev) => ({ ...prev, dailyDigest: e.target.checked }))}
          />
          ملخص يومي للأداء
        </label>
        <div className="grid" style={{ marginTop: 12 }}>
          <div>
            <label>حد دقة GPS (متر)</label>
            <input
              type="number"
              min={10}
              max={500}
              value={preferences.gpsAccuracyThreshold}
              onChange={(e) => setPreferences((prev) => ({ ...prev, gpsAccuracyThreshold: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label>نطاق التنبيه الجغرافي (متر)</label>
            <input
              type="number"
              min={50}
              max={2000}
              value={preferences.geofenceRadius}
              onChange={(e) => setPreferences((prev) => ({ ...prev, geofenceRadius: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label>الواجهة حسب الدور</label>
            <select
              value={preferences.roleTheme}
              onChange={(e) => setPreferences((prev) => ({ ...prev, roleTheme: e.target.value as typeof prev.roleTheme }))}
            >
              <option value="rep">مندوب</option>
              <option value="sales">مبيعات</option>
              <option value="supervisor">مشرف</option>
              <option value="admin">إدارة</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">تسجيل الخروج</div>
        <button type="button" onClick={logout}>
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
