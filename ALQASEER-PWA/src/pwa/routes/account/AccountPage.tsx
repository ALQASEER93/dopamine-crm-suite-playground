import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../api/client";
import { getQueueMeta, getQueuedMutations, replayQueuedMutations } from "../../offline/queue";
import { useAuthStore } from "../../state/auth";
import { useNavigate } from "react-router-dom";

export default function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [preferences, setPreferences] = useState({
    gpsAlerts: true,
    offlineWarnings: true,
    dailyDigest: false,
  });

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const refreshQueue = () => {
    setQueueCount(getQueuedMutations().length);
    const meta = getQueueMeta();
    setLastSyncAt(meta.lastSyncAt ?? null);
  };

  useEffect(() => {
    refreshQueue();
  }, []);

  const syncNow = async () => {
    const res = await replayQueuedMutations();
    refreshQueue();
    setSyncResult(`تمت محاولة مزامنة ${res.attempted}، المتبقي ${res.pending}`);
  };

  return (
    <div className="page">
      <div className="card">
        <div className="section-title">بيانات الحساب</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div>الاسم: {user?.name || "غير متوفر"}</div>
          <div>البريد: {user?.email || "غير متوفر"}</div>
          <div>الدور: {user?.role || "غير متوفر"}</div>
          <div>الخادم: {API_BASE_URL}</div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">المزامنة دون اتصال</div>
        <div className="muted">العمليات المعلقة: {queueCount}</div>
        <div className="muted">آخر مزامنة: {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "لم تتم بعد"}</div>
        <button type="button" onClick={syncNow}>
          مزامنة الآن
        </button>
        {syncResult ? <div className="muted">{syncResult}</div> : null}
      </div>

      <div className="card">
        <div className="section-title">تفضيلات التطبيق</div>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={preferences.gpsAlerts}
            onChange={(e) => setPreferences((prev) => ({ ...prev, gpsAlerts: e.target.checked }))}
          />
          تنبيهات دقة GPS أثناء الزيارة
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={preferences.offlineWarnings}
            onChange={(e) => setPreferences((prev) => ({ ...prev, offlineWarnings: e.target.checked }))}
          />
          تذكير عند العمل دون اتصال
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={preferences.dailyDigest}
            onChange={(e) => setPreferences((prev) => ({ ...prev, dailyDigest: e.target.checked }))}
          />
          ملخص يومي لأداء الزيارات
        </label>
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
