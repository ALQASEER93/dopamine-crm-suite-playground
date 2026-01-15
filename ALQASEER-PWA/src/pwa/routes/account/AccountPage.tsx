import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../api/client";
import { EmptyState } from "../../components/system/EmptyState";
import { ErrorBoundary } from "../../components/system/ErrorBoundary";
import { ListItem } from "../../components/system/ListItem";
import { PageHeader } from "../../components/system/PageHeader";
import { Skeleton } from "../../components/system/Skeleton";
import { stopNativeTelemetry } from "../../native/telemetry";
import { getQueueMeta, getQueuedMutations, replayQueuedMutations } from "../../offline/queue";
import { useAuthStore } from "../../state/auth";

export default function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(user);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error" | "unauthorized">("idle");
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  const debugEnabled = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const envFlag = import.meta.env.VITE_DEBUG_PANEL === "1";
      return envFlag || params.get("debug") === "1" || localStorage.getItem("pwa.debug") === "1";
    } catch {
      return import.meta.env.VITE_DEBUG_PANEL === "1";
    }
  }, []);

  const buildApiUrl = useCallback((path: string) => {
    const base = API_BASE_URL.startsWith("http")
      ? API_BASE_URL
      : `${window.location.origin}${API_BASE_URL.startsWith("/") ? API_BASE_URL : `/${API_BASE_URL}`}`;
    return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  }, []);

  const logEvent = useCallback((event: string, detail?: unknown) => {
    console.error("[account]", {
      event,
      detail,
      online: isOnline,
      token: Boolean(token),
      at: new Date().toISOString(),
    });
  }, [isOnline, token]);

  const loadProfile = useCallback(async () => {
    if (!token) {
      setStatus("unauthorized");
      setError("انتهت الجلسة أو لم يتم تسجيل الدخول.");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(buildApiUrl("auth/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setStatus("unauthorized");
        setError("انتهت صلاحية الجلسة. يرجى إعادة تسجيل الدخول.");
        clearSession();
        logEvent("unauthorized", { status: res.status });
        return;
      }
      if (!res.ok) {
        const message = await res.text();
        setStatus("error");
        setError(message || "تعذر تحميل بيانات الحساب.");
        logEvent("fetch_failed", { status: res.status, message });
        return;
      }
      const data = await res.json();
      setProfile(data);
      useAuthStore.getState().setSession(token, data);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError("تعذر الاتصال بالخادم. تحقق من الاتصال.");
      logEvent("network_error", err);
    }
  }, [buildApiUrl, clearSession, logEvent, token]);

  const logout = () => {
    clearSession();
    void stopNativeTelemetry();
    navigate("/login", { replace: true });
  };

  const refreshQueue = () => {
    setQueueCount(getQueuedMutations().length);
    const meta = getQueueMeta();
    setLastSyncAt(meta.lastSyncAt ?? null);
  };

  const syncNow = async () => {
    const res = await replayQueuedMutations();
    refreshQueue();
    setSyncResult(`تمت محاولة مزامنة ${res.attempted}، المتبقي ${res.pending}`);
  };

  const handleReload = () => {
    window.location.reload();
  };

  const errorFallback = (
    <EmptyState
      title="تعذر عرض بيانات الحساب"
      description="حدث خطأ غير متوقع أثناء تحميل صفحة الحساب. جرّب تحديث الصفحة أو تسجيل الدخول من جديد."
      action={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-secondary" type="button" onClick={handleReload}>
            تحديث الصفحة
          </button>
          <button className="btn btn-primary" type="button" onClick={logout}>
            تسجيل الدخول من جديد
          </button>
        </div>
      }
    />
  );

  useEffect(() => {
    refreshQueue();
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const roleLabel =
    typeof profile?.role === "string"
      ? profile?.role
      : profile?.role?.name || profile?.role?.slug || "مندوب";

  return (
    <ErrorBoundary fallback={errorFallback}>
      <div className="page">
        <PageHeader title="الملف الشخصي" subtitle="إدارة الحساب والتفضيلات." />
        {!isOnline ? (
          <div className="card" style={{ borderColor: "rgba(251, 191, 36, 0.4)" }}>
            <div className="section-title">وضع عدم الاتصال</div>
            <div className="muted">لن يتم تحديث بيانات الحساب حتى يعود الاتصال.</div>
          </div>
        ) : null}

        {status === "loading" ? (
          <div className="card">
            <div className="skeleton-stack">
              <Skeleton height={16} width="40%" />
              <Skeleton height={16} width="55%" />
              <Skeleton height={16} width="35%" />
              <Skeleton height={16} width="60%" />
            </div>
          </div>
        ) : null}

        {status === "unauthorized" ? (
          <EmptyState
            title="الجلسة غير صالحة"
            description={error || "يرجى إعادة تسجيل الدخول للوصول إلى الحساب."}
            action={
              <button className="btn btn-primary" type="button" onClick={logout}>
                إعادة تسجيل الدخول
              </button>
            }
          />
        ) : null}

        {status === "error" ? (
          <EmptyState
            title="تعذر تحميل الحساب"
            description={error || "حدث خلل غير متوقع أثناء تحميل البيانات."}
            action={
              <button className="btn btn-secondary" type="button" onClick={loadProfile}>
                إعادة المحاولة
              </button>
            }
          />
        ) : null}

        {status === "ready" || status === "idle" ? (
          <div className="card">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div>الاسم: {profile?.name || "—"}</div>
              <div>البريد: {profile?.email || "—"}</div>
              <div>الدور: {roleLabel}</div>
              <div>الخادم: {API_BASE_URL}</div>
            </div>
          </div>
        ) : null}

        <div className="card">
          <div className="section-title">الاختصارات</div>
          <div className="list" style={{ marginTop: 12 }}>
            <ListItem title="الإعدادات" onClick={() => navigate("/settings")} />
            <ListItem title="المزامنة" onClick={() => navigate("/sync")} />
            <ListItem title="الإشعارات" onClick={() => navigate("/notifications")} />
          </div>
        </div>

        <div className="card">
          <div className="section-title">المزامنة دون اتصال</div>
          <div className="muted">العمليات المعلقة: {queueCount}</div>
          <div className="muted">
            آخر مزامنة: {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "لم تتم بعد"}
          </div>
          <button className="btn btn-secondary" type="button" onClick={syncNow} disabled={!queueCount}>
            مزامنة الآن
          </button>
          {syncResult ? <div className="muted">{syncResult}</div> : null}
        </div>

        <div className="card">
          <div className="section-title">جلسة العمل</div>
          <button className="btn btn-secondary" type="button" onClick={logout}>
            تسجيل الخروج
          </button>
        </div>

        {debugEnabled ? (
          <div className="card">
            <div className="section-title">Debug</div>
            <pre style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(
                {
                  status,
                  error,
                  online: isOnline,
                  token: Boolean(token),
                  profile,
                },
                null,
                2,
              )}
            </pre>
          </div>
        ) : null}
      </div>
    </ErrorBoundary>
  );
}
