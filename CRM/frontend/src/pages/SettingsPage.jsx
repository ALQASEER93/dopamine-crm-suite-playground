import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const STORAGE_KEY = "crm.settings";

const defaultSettings = {
  notifications: true,
  dailyDigest: false,
  gpsAlerts: true,
  rtlLayout: true,
};

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(() => {
    if (typeof window === "undefined") return defaultSettings;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const roleLabel =
    user?.role?.slug === "sales_rep"
      ? "مندوب مبيعات"
      : user?.role?.slug === "admin"
      ? "مدير النظام"
      : "مندوب دعاية طبية";

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="page-stack">
      <h1 className="page-heading">الإعدادات</h1>

      <section className="page-card">
        <h2>الملف الشخصي</h2>
        <p>الاسم: {user?.name || "غير متوفر"}</p>
        <p>البريد: {user?.email || "غير متوفر"}</p>
        <p>الدور: {roleLabel}</p>
      </section>

      <section className="page-card">
        <h2>تنبيهات وإشعارات</h2>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.notifications}
            onChange={(event) => setSettings((prev) => ({ ...prev, notifications: event.target.checked }))}
          />
          تفعيل إشعارات الزيارات المتأخرة
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.dailyDigest}
            onChange={(event) => setSettings((prev) => ({ ...prev, dailyDigest: event.target.checked }))}
          />
          إرسال ملخص يومي للإدارة
        </label>
      </section>

      <section className="page-card">
        <h2>GPS والعمل الميداني</h2>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.gpsAlerts}
            onChange={(event) => setSettings((prev) => ({ ...prev, gpsAlerts: event.target.checked }))}
          />
          تنبيهات عند الخروج عن نطاق العميل
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.rtlLayout}
            onChange={(event) => setSettings((prev) => ({ ...prev, rtlLayout: event.target.checked }))}
          />
          واجهة عربية (RTL)
        </label>
      </section>

      <section className="page-card">
        <h2>الأمان</h2>
        <p>تغيير كلمة المرور سيكون متاحًا في الإصدار القادم.</p>
      </section>

      <section className="page-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>تسجيل الخروج</h2>
          <p>إنهاء الجلسة الحالية من لوحة الإدارة.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={handleLogout}>
          تسجيل الخروج
        </button>
      </section>
    </div>
  );
};

export default SettingsPage;
