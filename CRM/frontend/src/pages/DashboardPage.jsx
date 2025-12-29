import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import VisitsSummaryCards from "../visits/VisitsSummaryCards";
import { apiClient } from "../api/client";
import { normalizeVisit } from "../api/visits";
import "./DashboardPage.css";

const TARGETS_KEY = "crm.targets";

const defaultTargets = {
  dailyVisits: 50,
  monthlyVisits: 1000,
};

const formatDashboardError = (error) => {
  if (!error) return null;
  const status = typeof error.status === "number" ? error.status : error?.response?.status ?? null;
  const payloadDetail =
    error?.payload && typeof error.payload === "object"
      ? error.payload.detail || error.payload.message
      : null;
  const baseMessage =
    typeof payloadDetail === "string" && payloadDetail.trim()
      ? payloadDetail
      : error.message || "تعذر تحميل البيانات";
  return status ? `${baseMessage} (${status})` : baseMessage;
};

const logValidationError = (error, label) => {
  if (error?.status === 422) {
    const detail = error.payload?.detail || error.payload;
    console.error(`${label} validation error`, detail);
  }
};

const DashboardPage = () => {
  const { token, user } = useAuth();
  const [targets, setTargets] = useState(() => {
    try {
      const raw = window.localStorage.getItem(TARGETS_KEY);
      return raw ? { ...defaultTargets, ...JSON.parse(raw) } : defaultTargets;
    } catch {
      return defaultTargets;
    }
  });

  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary", token || user?.id || null],
    queryFn: async () => {
      const { data } = await apiClient.get("/visits/summary", { token });
      return data?.data ?? data;
    },
    enabled: !!token,
    staleTime: 60_000,
  });

  const recentVisitsQuery = useQuery({
    queryKey: ["dashboard", "recentVisits", token || user?.id || null],
    queryFn: async () => {
      const { data } = await apiClient.get("/visits/latest?pageSize=5", { token });
      const raw = Array.isArray(data?.data) ? data.data : [];
      return raw.map(normalizeVisit).filter(Boolean);
    },
    enabled: !!token,
    staleTime: 30_000,
  });

  useEffect(() => {
    logValidationError(summaryQuery.error, "Visits summary");
  }, [summaryQuery.error]);

  useEffect(() => {
    logValidationError(recentVisitsQuery.error, "Recent visits");
  }, [recentVisitsQuery.error]);

  useEffect(() => {
    try {
      window.localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
    } catch {
      // ignore
    }
  }, [targets]);

  const summaryErrorMessage = formatDashboardError(summaryQuery.error);
  const recentVisitsErrorMessage = formatDashboardError(recentVisitsQuery.error);
  const recentVisits = useMemo(() => recentVisitsQuery.data ?? [], [recentVisitsQuery.data]);

  const repKpis = useMemo(() => {
    const reps = Array.isArray(summaryQuery.data?.visitsByRep) ? summaryQuery.data.visitsByRep : [];
    return reps.map((rep) => {
      const completionRate = rep.totalVisits ? (rep.completedVisits / rep.totalVisits) * 100 : 0;
      return { ...rep, completionRate };
    });
  }, [summaryQuery.data]);

  const summaryTotalVisits = summaryQuery.data?.totalVisits || 0;
  const dailyProgress = targets.dailyVisits ? Math.min(100, (summaryTotalVisits / targets.dailyVisits) * 100) : 0;
  const monthlyProgress = targets.monthlyVisits ? Math.min(100, (summaryTotalVisits / targets.monthlyVisits) * 100) : 0;

  const alerts = useMemo(() => {
    return repKpis
      .filter((rep) => rep.totalVisits > 0)
      .map((rep) => {
        const flags = [];
        if (rep.completionRate < 70) flags.push("معدل إكمال منخفض");
        if (rep.avgDurationMinutes != null && rep.avgDurationMinutes > 45) flags.push("مدة زيارة مرتفعة");
        return flags.length ? { repName: rep.repName, flags } : null;
      })
      .filter(Boolean);
  }, [repKpis]);

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">لوحة القيادة</h1>
          <p className="page-subtitle">متابعة أداء الزيارات والمؤشرات التشغيلية اليومية.</p>
        </div>
        <Link to="/visits" className="btn btn-primary">
          إضافة زيارة
        </Link>
      </div>

      <VisitsSummaryCards summary={summaryQuery.data} isLoading={summaryQuery.isLoading} error={summaryErrorMessage} />

      <section className="table-card">
        <div className="table-card__header">
          <div>
            <h2>الأهداف التشغيلية</h2>
            <p>تعيين أهداف يومية وشهرية ومتابعة التقدم.</p>
          </div>
        </div>
        <div style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div className="page-card" style={{ margin: 0 }}>
              <strong>تقدم اليوم</strong>
              <div style={{ fontSize: "22px", fontWeight: 700 }}>{dailyProgress.toFixed(0)}%</div>
              <div className="table-card__empty" style={{ padding: 0 }}>إجمالي الزيارات: {summaryTotalVisits}</div>
            </div>
            <div className="page-card" style={{ margin: 0 }}>
              <strong>تقدم الشهر</strong>
              <div style={{ fontSize: "22px", fontWeight: 700 }}>{monthlyProgress.toFixed(0)}%</div>
              <div className="table-card__empty" style={{ padding: 0 }}>هدف شهري: {targets.monthlyVisits}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <label>
              هدف زيارات اليوم
              <input
                className="input"
                type="number"
                min={1}
                value={targets.dailyVisits}
                onChange={(event) => setTargets((prev) => ({ ...prev, dailyVisits: Number(event.target.value) }))}
              />
            </label>
            <label>
              هدف زيارات الشهر
              <input
                className="input"
                type="number"
                min={1}
                value={targets.monthlyVisits}
                onChange={(event) => setTargets((prev) => ({ ...prev, monthlyVisits: Number(event.target.value) }))}
              />
            </label>
          </div>
        </div>
      </section>

      {alerts.length ? (
        <section className="table-card">
          <div className="table-card__header">
            <div>
              <h2>تنبيهات الأداء</h2>
              <p>نقاط تحتاج المتابعة الفورية.</p>
            </div>
          </div>
          <div style={{ padding: "1.5rem", display: "grid", gap: "0.75rem" }}>
            {alerts.map((alert) => (
              <div key={alert.repName} className="page-card" style={{ margin: 0 }}>
                <strong>{alert.repName}</strong>
                <div className="table-card__empty" style={{ padding: 0 }}>{alert.flags.join("، ")}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {summaryQuery.data?.lastActivityAt && (
        <div className="table-card__empty" style={{ textAlign: "left" }}>
          آخر نشاط: {new Date(summaryQuery.data.lastActivityAt).toLocaleString()}
        </div>
      )}

      <section className="table-card">
        <div className="table-card__header">
          <div>
            <h2>مؤشرات أداء المندوبين</h2>
            <p>مقارنة الإنجاز والمدة ومتوسط الالتزام لكل مندوب.</p>
          </div>
        </div>
        {summaryQuery.isLoading ? (
          <div className="table-card__empty">جارٍ تحميل مؤشرات المندوبين...</div>
        ) : repKpis.length ? (
          <table>
            <thead>
              <tr>
                <th>المندوب</th>
                <th>إجمالي الزيارات</th>
                <th>زيارات مكتملة</th>
                <th>معدل الإكمال</th>
                <th>متوسط مدة الزيارة</th>
                <th>آخر زيارة</th>
              </tr>
            </thead>
            <tbody>
              {repKpis.map((rep) => (
                <tr key={rep.repId}>
                  <td>{rep.repName}</td>
                  <td>{rep.totalVisits}</td>
                  <td>{rep.completedVisits}</td>
                  <td>{rep.completionRate.toFixed(1)}%</td>
                  <td>{rep.avgDurationMinutes != null ? `${rep.avgDurationMinutes} دقيقة` : "غير متاح"}</td>
                  <td>{rep.lastVisitAt ? new Date(rep.lastVisitAt).toLocaleString() : "غير متاح"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="table-card__empty">لا توجد بيانات أداء متاحة بعد.</div>
        )}
      </section>

      <section className="table-card">
        <div className="table-card__header">
          <div>
            <h2>الزيارات الأحدث</h2>
            <p>أحدث زيارات الفريق خلال اليوم.</p>
          </div>
          <Link to="/visits" className="btn btn-secondary">
            عرض الكل
          </Link>
        </div>
        {recentVisitsQuery.error && (
          <div className="table-card__empty">تعذر تحميل أحدث الزيارات: {recentVisitsErrorMessage}</div>
        )}
        {!recentVisitsQuery.error && recentVisits.length === 0 && !recentVisitsQuery.isLoading && (
          <div className="table-card__empty">لا توجد زيارات مسجلة حتى الآن.</div>
        )}
        {recentVisitsQuery.isLoading ? (
          <div className="table-card__empty">جارٍ تحميل الزيارات...</div>
        ) : (
          recentVisits.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>المندوب</th>
                  <th>العميل</th>
                  <th>الحالة</th>
                  <th>المدة</th>
                </tr>
              </thead>
              <tbody>
                {recentVisits.map((visit) => (
                  <tr key={visit.id}>
                    <td>{visit.visitDate ? new Date(visit.visitDate).toLocaleString() : "-"}</td>
                    <td>{visit.rep?.name || visit.rep?.email || "-"}</td>
                    <td>{visit.doctor?.name || visit.pharmacy?.name || "-"}</td>
                    <td>
                      <span className="badge">{(visit.status || "scheduled").replace(/_/g, " ")}</span>
                    </td>
                    <td>{visit.durationMinutes != null ? `${visit.durationMinutes} دقيقة` : "غير متاح"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </section>
    </div>
  );
};

export default DashboardPage;
