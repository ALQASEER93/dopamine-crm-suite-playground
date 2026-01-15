import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTodayRoute, getVisits } from "../../api/client";
import { RouteStop, Visit } from "../../api/types";
import { PageHeader } from "../../components/system/PageHeader";
import { KPIStatCard } from "../../components/system/KPIStatCard";
import { ListItem } from "../../components/system/ListItem";
import { EmptyState } from "../../components/system/EmptyState";
import { Skeleton } from "../../components/system/Skeleton";

export default function TodayPage() {
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [routeData, visitData] = await Promise.all([getTodayRoute(), getVisits()]);
        setStops(routeData);
        setVisits(visitData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const nextStop = stops.find((stop) => stop.status === "planned") || stops[0];
  const completed = visits.filter((visit) => visit.status === "COMPLETED").length;
  const inProgress = visits.filter((visit) => visit.status === "IN_PROGRESS").length;

  const quickActions = useMemo(() => {
    if (!nextStop) return null;
    const visitMatch = visits.find((visit) => visit.customerId === nextStop.customerId);
    return (
      <div className="grid grid--three">
        <button className="btn btn-primary" type="button" onClick={() => navigate("/map")}>
          فتح الخريطة
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() =>
            visitMatch
              ? navigate(`/visits/${visitMatch.id}/start`)
              : navigate("/visits")
          }
        >
          بدء الزيارة
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => navigate("/visits")}>
          إضافة ملاحظة
        </button>
      </div>
    );
  }, [navigate, nextStop, visits]);

  return (
    <div className="page" aria-label="today-route-page">
      <PageHeader
        title="اليوم"
        subtitle="ملخص مسار اليوم والحالة التشغيلية للزيارات."
        actions={<span className="badge">الزيارات: {visits.length}</span>}
      />

      <div className="grid grid--three">
        <KPIStatCard label="زيارات مكتملة" value={completed} tone="positive" />
        <KPIStatCard label="جارية الآن" value={inProgress} tone="warning" />
        <KPIStatCard label="محطات المسار" value={stops.length} />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="section-title">الزيارة القادمة</div>
            <div className="muted">أقرب نقطة تحتاج متابعة فورية.</div>
          </div>
          {nextStop ? <span className="chip">{nextStop.status}</span> : null}
        </div>

        {loading ? (
          <Skeleton height={80} />
        ) : nextStop ? (
          <ListItem
            title={nextStop.customerName}
            subtitle={nextStop.address || "بدون عنوان"}
            meta={<span className="chip">{nextStop.customerType === "doctor" ? "طبيب" : "صيدلية"}</span>}
            action={<span className="badge">التالي</span>}
          />
        ) : (
          <EmptyState title="لا توجد زيارات مجدولة" description="ابدأ بإضافة زيارات جديدة لمسار اليوم." />
        )}
        <div style={{ marginTop: 12 }}>{quickActions}</div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="section-title">أبرز الزيارات</div>
          <button className="btn btn-ghost" type="button" onClick={() => navigate("/visits")}>
            عرض الكل
          </button>
        </div>
        {loading ? (
          <Skeleton height={90} />
        ) : visits.length ? (
          <div className="list">
            {visits.slice(0, 3).map((visit) => (
              <ListItem
                key={visit.id}
                title={visit.customerName}
                subtitle={visit.notes || "بدون ملاحظات"}
                meta={<span className="chip">{visit.status}</span>}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="لا توجد زيارات بعد" description="سيظهر سجل اليوم هنا فور بدء الزيارات." />
        )}
      </div>
    </div>
  );
}
