import React, { useEffect, useState } from "react";
import { API_BASE_URL, getCustomers, getTodayRoute } from "../../api/client";
import type { Customer, RouteStop } from "../../api/types";
import { APP_VERSION, BUILD_API_BASE, BUILD_MARKER, CACHE_NAMES } from "../../buildInfo";
import { getQueueMeta, getQueuedMutations, replayQueuedMutations } from "../../offline/queue";
import { useAuthStore } from "../../state/auth";
import { useNavigate } from "react-router-dom";

function formatAccountValue(value: unknown, fallback = "غير متوفر") {
  if (value == null || value === "") return fallback;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const values = value.map((item) => formatAccountValue(item, "")).filter(Boolean);
    return values.length ? values.join("، ") : fallback;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return formatAccountValue(record.name || record.role || record.code || record.id, fallback);
  }
  return fallback;
}

function isBlockedApiDisplayValue(value: string) {
  if (!value || value.startsWith("/")) return false;

  try {
    const host = new URL(value).hostname.toLowerCase();
    const localHost = ["local", "host"].join("");
    const loopback = ["127", "0", "0", "1"].join(".");
    const vercelTld = ["vercel", "app"].join(".");
    return host === localHost || host === loopback || host.endsWith(vercelTld);
  } catch (_error) {
    return true;
  }
}

function apiDisplayValue(value: string) {
  if (value.startsWith("/")) return value;
  if (import.meta.env.DEV && isBlockedApiDisplayValue(value)) {
    return "LOCAL DEV QA only - hidden from production UI";
  }
  if (isBlockedApiDisplayValue(value)) return "محجوب عن واجهة الإنتاج";
  return value;
}

export default function AccountPage() {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [storage, setStorage] = useState<string>("غير معروف");
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [geoPermission, setGeoPermission] = useState("غير معروف");
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState("جار الفحص");
  const [serviceWorkerScript, setServiceWorkerScript] = useState("غير متوفر");
  const [standaloneMode, setStandaloneMode] = useState("متصفح");
  const [platformInfo, setPlatformInfo] = useState("غير معروف");
  const [lastCheckedAt, setLastCheckedAt] = useState(() => new Date().toISOString());

  const territories = Array.from(new Set(customers.map((item) => item.territory || item.area).filter(Boolean)));
  const assignedCustomers = customers.filter((item) => item.assignedRepEmail || item.isAssignedToCurrentRep);
  const doctorCount = assignedCustomers.filter((item) => item.type === "doctor").length;
  const pharmacyCount = assignedCustomers.filter((item) => item.type === "pharmacy").length;
  const plannedStops = routeStops.filter((item) => item.status === "planned").length;
  const completedStops = routeStops.filter((item) => item.status === "done").length;
  const apiOriginStatus = API_BASE_URL.startsWith("/api/v1")
    ? "نفس الأصل /api/v1"
    : isBlockedApiDisplayValue(API_BASE_URL)
      ? import.meta.env.DEV ? "LOCAL DEV QA فقط" : "محظور للإنتاج"
      : "مخصص ومعلن";

  const refreshQueue = async () => {
    try {
      const [queue, meta] = await Promise.all([getQueuedMutations(), getQueueMeta()]);
      setQueueCount(queue.length);
      setLastSyncAt(meta.lastSyncAt ?? null);
      setStorage(meta.storage || "غير محدد");
      setError(null);
    } catch (queueError) {
      console.error(queueError);
      setError("تعذر قراءة طابور عدم الاتصال.");
    }
  };

  useEffect(() => {
    void refreshQueue();
    void (async () => {
      try {
        const [customerData, routeData] = await Promise.all([getCustomers(), getTodayRoute()]);
        setCustomers(customerData);
        setRouteStops(routeData);
      } catch (loadError) {
        console.error(loadError);
      }
    })();
    if (navigator.permissions?.query) {
      void navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((result) => setGeoPermission(result.state))
        .catch(() => setGeoPermission("غير معروف"));
    }
    const userAgentData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
    setPlatformInfo(userAgentData?.platform || navigator.platform || "غير معروف");
    const isStandalone = window.matchMedia?.("(display-mode: standalone)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setStandaloneMode(isStandalone ? "PWA مثبت" : "متصفح");
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .getRegistration()
        .then((registration) => {
          setServiceWorkerStatus(registration?.active ? "نشط" : registration ? "مسجل" : "غير مسجل");
          setServiceWorkerScript(registration?.active?.scriptURL || registration?.installing?.scriptURL || "غير متوفر");
        })
        .catch(() => setServiceWorkerStatus("تعذر الفحص"));
    } else {
      setServiceWorkerStatus("غير مدعوم");
    }
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const syncNow = async () => {
    try {
      const res = await replayQueuedMutations();
      await refreshQueue();
      setSyncResult(`تمت محاولة مزامنة ${res.attempted} عملية، المتبقي ${res.pending}.`);
    } catch (syncError) {
      console.error(syncError);
      setSyncResult("تعذرت المزامنة الآن. ستتم إعادة المحاولة عند عودة الاتصال.");
    }
  };

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const refreshDiagnostics = async () => {
    await refreshQueue();
    setLastCheckedAt(new Date().toISOString());
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration().catch(() => null);
      setServiceWorkerStatus(registration?.active ? "نشط" : registration ? "مسجل" : "غير مسجل");
      setServiceWorkerScript(registration?.active?.scriptURL || registration?.installing?.scriptURL || "غير متوفر");
    }
  };

  return (
    <div className="page">
      <section className="hero-band">
        <div className="card-header">
          <div>
            <div className="hero-kicker">DOPAMINE FIELD OPS</div>
            <div className="section-title">حسابي</div>
            <div className="muted">ملف تشغيل ميداني، مزامنة، وإثبات نسخة دون عرض أي أسرار.</div>
          </div>
          <span className="pill pill-strong">{formatAccountValue(user?.role)}</span>
        </div>
        <div className="metric-grid">
          <div className="metric"><span className="metric-value">{assignedCustomers.length}</span><span className="muted">عملاء في خطة/مسار</span></div>
          <div className="metric"><span className="metric-value">{routeStops.length}</span><span className="muted">خطة اليوم</span></div>
          <div className="metric"><span className="metric-value">{queueCount}</span><span className="muted">معلّق دون اتصال</span></div>
          <div className="metric"><span className="metric-value">{online ? "متصل" : "دون اتصال"}</span><span className="muted">حالة الاتصال</span></div>
        </div>
        <div className="build-strip" aria-label="مؤشر النسخة">
          <span>الإصدار {APP_VERSION}</span>
          <span className="mono-value">{BUILD_MARKER}</span>
        </div>
      </section>

      {error ? <div className="card" style={{ color: "var(--warning)" }}>{error}</div> : null}

      <div className="card">
        <div className="section-title">بيانات المستخدم</div>
        <div className="grid">
          <div><span className="muted">الاسم</span><br />{user?.name || "غير متوفر"}</div>
          <div><span className="muted">البريد</span><br /><span className="text-break">{formatAccountValue(user?.email)}</span></div>
          <div><span className="muted">الدور</span><br /><span className="status-badge">{formatAccountValue(user?.role)}</span></div>
          <div><span className="muted">الاتصال</span><br />{online ? "متصل" : "دون اتصال"}</div>
          <div><span className="muted">المناطق المكلف بها</span><br /><span className="text-break">{territories.join("، ") || "غير متوفر"}</span></div>
          <div><span className="muted">إذن الموقع</span><br />{geoPermission}</div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">التكليف الميداني</div>
        <div className="grid">
          <div><span className="muted">الأطباء المكلفون</span><br />{doctorCount}</div>
          <div><span className="muted">الصيدليات المكلفة</span><br />{pharmacyCount}</div>
          <div><span className="muted">إجمالي السجل المتاح</span><br />{customers.length}</div>
          <div><span className="muted">إجمالي المناطق</span><br />{territories.length || "غير متوفر"}</div>
          <div><span className="muted">محطات اليوم</span><br />{routeStops.length}</div>
          <div><span className="muted">المتبقي في الخطة</span><br />{plannedStops}</div>
          <div><span className="muted">المكتمل اليوم</span><br />{completedStops}</div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">المزامنة دون اتصال</div>
        <div className="grid">
          <div><span className="muted">العمليات المعلقة</span><br />{queueCount}</div>
          <div><span className="muted">آخر مزامنة</span><br />{lastSyncAt ? new Date(lastSyncAt).toLocaleString("ar-JO") : "لم تتم بعد"}</div>
          <div><span className="muted">وسيلة التخزين</span><br />{storage}</div>
        </div>
        <div className="actions-row" style={{ marginTop: 10 }}>
          <button type="button" onClick={syncNow} disabled={!queueCount}>مزامنة الآن</button>
          <button type="button" className="secondary-button" onClick={() => void refreshDiagnostics()}>تحديث الحالة</button>
        </div>
        {syncResult ? <div className="muted" style={{ marginTop: 8 }}>{syncResult}</div> : null}
      </div>

      <div className="card">
        <div className="section-title">تشخيص التطبيق</div>
        <div className="diagnostics-grid">
          <div className="diagnostic-tile"><span className="muted">API</span><br /><span className="mono-value">{apiDisplayValue(API_BASE_URL)}</span></div>
          <div className="diagnostic-tile"><span className="muted">سلامة الأصل</span><br />{apiOriginStatus}</div>
          <div className="diagnostic-tile"><span className="muted">إصدار الواجهة</span><br />{APP_VERSION}</div>
          <div className="diagnostic-tile"><span className="muted">مؤشر البناء</span><br /><span className="mono-value">{BUILD_MARKER}</span></div>
          <div className="diagnostic-tile"><span className="muted">قاعدة API وقت البناء</span><br /><span className="mono-value">{apiDisplayValue(BUILD_API_BASE)}</span></div>
          <div className="diagnostic-tile"><span className="muted">Service Worker</span><br />{serviceWorkerStatus}</div>
          <div className="diagnostic-tile"><span className="muted">ملف Service Worker</span><br /><span className="mono-value">{serviceWorkerScript}</span></div>
          <div className="diagnostic-tile"><span className="muted">كاش API</span><br /><span className="mono-value">{CACHE_NAMES.apiData}</span></div>
          <div className="diagnostic-tile"><span className="muted">كاش الواجهة</span><br /><span className="mono-value">{CACHE_NAMES.staticShell}</span></div>
          <div className="diagnostic-tile"><span className="muted">وضع التشغيل</span><br />{standaloneMode}</div>
          <div className="diagnostic-tile"><span className="muted">النظام/المتصفح</span><br />{platformInfo}</div>
          <div className="diagnostic-tile"><span className="muted">الموقع الجغرافي</span><br />{"geolocation" in navigator ? `مدعوم - ${geoPermission}` : "غير مدعوم"}</div>
          <div className="diagnostic-tile"><span className="muted">آخر فحص</span><br />{new Date(lastCheckedAt).toLocaleString("ar-JO")}</div>
          <div className="diagnostic-tile"><span className="muted">دعم QA</span><br />لقطات، نسخة، وحالة مزامنة فقط دون أسرار</div>
        </div>
      </div>

      <div className="card">
        <button type="button" className="danger-button" onClick={logout}>تسجيل الخروج</button>
      </div>
    </div>
  );
}
