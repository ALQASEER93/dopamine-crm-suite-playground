import React, { useState } from "react";
import { API_BASE_URL } from "../../api/client";
import { replayQueuedMutations } from "../../offline/queue";
import { useAuthStore } from "../../state/auth";
import { useNavigate } from "react-router-dom";

export default function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const syncNow = async () => {
    const res = await replayQueuedMutations();
    setSyncResult(`تمت محاولة إرسال ${res.attempted}، المتبقي ${res.pending}`);
  };

  return (
    <div className="page">
      <div className="card">
        <div className="section-title">الملف الشخصي</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div>الاسم: {user?.name || "—"}</div>
          <div>البريد: {user?.email || "—"}</div>
          <div>الدور: {user?.role || "مندوب"}</div>
          <div>الخادم: {API_BASE_URL}</div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">إدارة الاتصال</div>
        <button type="button" onClick={syncNow}>
          مزامنة المعاملات المعلقة
        </button>
        {syncResult ? <div className="muted">{syncResult}</div> : null}
      </div>

      <div className="card">
        <div className="section-title">جلسة العمل</div>
        <button type="button" onClick={logout}>
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
