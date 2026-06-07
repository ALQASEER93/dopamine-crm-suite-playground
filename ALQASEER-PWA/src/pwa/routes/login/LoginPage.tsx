import React, { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL, login } from "../../api/client";
import { useAuthStore } from "../../state/auth";
import { APP_VERSION, BUILD_MARKER } from "../../buildInfo";

type HealthStatus = "Idle" | "Checking" | "OK" | "Unreachable" | "CORS" | "401";

function isDebugUiEnabled() {
  return String(import.meta.env.VITE_DEBUG_UI || "").toLowerCase() === "true";
}

async function checkHealth(opts: { timeoutMs: number }): Promise<{ status: HealthStatus; detail: string; url: string }> {
  const base = new URL(API_BASE_URL, window.location.origin);
  const apiBase = `${base.origin}${base.pathname.replace(/\/$/, "")}`;
  const candidates = [`${apiBase}/health`];
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), opts.timeoutMs);

  try {
    let lastHttpResult: { status: HealthStatus; detail: string; url: string } | null = null;
    for (const url of candidates) {
      try {
        const res = await fetch(url, { method: "GET", signal: controller.signal, credentials: "omit" });
        if (res.status === 401) return { status: "401", detail: `HTTP 401 (${url})`, url };
        if (res.ok) return { status: "OK", detail: `HTTP ${res.status} (${url})`, url };
        // 404 may mean the endpoint isn't mounted; keep trying other candidates.
        lastHttpResult = { status: "OK", detail: `HTTP ${res.status} (${url})`, url };
        if (res.status === 404) continue;
        // Other non-2xx errors still indicate the origin is reachable.
        return lastHttpResult;
      } catch (err) {
        // Try next candidate only for network/CORS-ish failures.
        if (err instanceof DOMException && err.name === "AbortError") throw err;
        if (err instanceof TypeError) continue;
        continue;
      }
    }

    if (lastHttpResult) return lastHttpResult;
    return { status: "CORS", detail: "Fetch failed (CORS or network).", url: candidates[0] };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { status: "Unreachable", detail: `Timeout after ${opts.timeoutMs}ms.`, url: candidates[0] };
    }
    if (err instanceof TypeError) {
      return { status: "CORS", detail: "Fetch failed (CORS or network).", url: candidates[0] };
    }
    return { status: "Unreachable", detail: "Unknown error during health check.", url: candidates[0] };
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const debugUi = isDebugUiEnabled();
  const [health, setHealth] = useState<{ status: HealthStatus; detail: string; url: string }>({
    status: "Idle",
    detail: "",
    url: "",
  });

  useEffect(() => {
    if (token) {
      navigate("/today-route", { replace: true });
    }
  }, [navigate, token]);

  useEffect(() => {
    if (!debugUi) return;
    let alive = true;
    setHealth({ status: "Checking", detail: "Checking API reachability...", url: "" });
    checkHealth({ timeoutMs: 2000 })
      .then((r) => {
        if (!alive) return;
        setHealth(r);
      })
      .catch(() => {
        if (!alive) return;
        setHealth({ status: "Unreachable", detail: "Health check failed.", url: "" });
      });
    return () => {
      alive = false;
    };
  }, [debugUi]);

  const handleSubmit = async (evt: FormEvent) => {
    evt.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      const redirectTo = (location.state as any)?.from || "/today-route";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      // Avoid leaking server details to UI, but make the cause clearer.
      if (err instanceof Error && err.message === "Unauthorized") {
        setError("بيانات الدخول غير صحيحة.");
      } else if (err instanceof TypeError) {
        setError("تعذّر الاتصال بالخادم (شبكة/CORS). تحقق من إعدادات API.");
      } else {
        setError("تعذّر تسجيل الدخول، تأكد من البيانات أو الاتصال.");
      }
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

      {debugUi ? (
        <div className="card" aria-label="debug-panel">
          <div className="section-title">تشخيص</div>
          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
            <div>
              <b>API_BASE_URL</b>: <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{String(API_BASE_URL)}</span>
            </div>
            <div>
              <b>Health</b>: {health.status}
            </div>
            {health.detail ? <div>{health.detail}</div> : null}
            {health.url ? (
              <div>
                <b>Checked</b>: <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{health.url}</span>
              </div>
            ) : null}
            <div style={{ marginTop: 8 }}>
              ملاحظة: يظهر هذا القسم فقط عند ضبط <code>VITE_DEBUG_UI=true</code>.
            </div>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="section-title">إرشادات سريعة</div>
        <ul style={{ margin: 0, paddingInlineStart: 20, color: "var(--muted)", lineHeight: 1.6 }}>
          <li>يجب منح إذن تحديد الموقع عند فتح التطبيق.</li>
          <li>يتم تخزين آخر بيانات مسار اليوم والعملاء للعمل في وضع عدم الاتصال.</li>
          <li>عند عودة الاتصال يتم إرسال الزيارات والإجراءات الميدانية المعلقة تلقائياً.</li>
        </ul>
      </div>
      <div className="build-strip" aria-label="public-build-version">
        <span>الإصدار {APP_VERSION}</span>
        <span className="mono-value">{BUILD_MARKER}</span>
      </div>
    </div>
  );
}
