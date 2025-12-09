import React, { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login } from "../../api/client";
import { useAuthStore } from "../../state/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      navigate("/today-route", { replace: true });
    }
  }, [navigate, token]);

  const handleSubmit = async (evt: FormEvent) => {
    evt.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      const redirectTo = (location.state as any)?.from || "/today-route";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError("تعذّر تسجيل الدخول، تأكد من البيانات أو الاتصال.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" aria-label="login-page">
      <div className="card">
        <div className="section-title">تسجيل الدخول</div>
        <p className="muted">استخدم نفس بيانات الدخول الخاصة بنظام الـ CRM.</p>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email">البريد الوظيفي</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="rep@dopaminepharma.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password">كلمة المرور</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <div style={{ color: "#f87171", fontSize: 13 }}>{error}</div> : null}
          <button type="submit" disabled={loading}>
            {loading ? "جاري التحقق..." : "دخول"}
          </button>
        </form>
      </div>
      <div className="card">
        <div className="section-title">إرشادات سريعة</div>
        <ul style={{ margin: 0, paddingInlineStart: 20, color: "var(--muted)", lineHeight: 1.6 }}>
          <li>يجب منح إذن تحديد الموقع عند فتح التطبيق.</li>
          <li>يتم تخزين آخر بيانات مسار اليوم والعملاء للعمل في وضع عدم الاتصال.</li>
          <li>عند عودة الاتصال يتم إرسال الزيارات والطلبات المعلقة تلقائياً.</li>
        </ul>
      </div>
    </div>
  );
}
