import React, { useEffect, useState } from "react";
import { PageHeader } from "../../components/system/PageHeader";

export default function SettingsPage() {
  const [geoPermission, setGeoPermission] = useState("غير معروف");

  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((result) => setGeoPermission(result.state))
      .catch(() => setGeoPermission("غير معروف"));
  }, []);

  return (
    <div className="page">
      <PageHeader title="الإعدادات" subtitle="إعدادات اللغة والمظهر والصلاحيات." />
      <div className="card">
        <div className="section-title">الواجهة</div>
        <div className="muted">الوضع الداكن مفعّل بشكل افتراضي.</div>
      </div>
      <div className="card">
        <div className="section-title">اللغة</div>
        <div className="muted">واجهة عربية افتراضية.</div>
      </div>
      <div className="card">
        <div className="section-title">الصلاحيات</div>
        <div className="muted">حالة الموقع: {geoPermission}</div>
      </div>
    </div>
  );
}
