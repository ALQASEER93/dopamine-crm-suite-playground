import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createVisit, getCustomers, getVisits } from "../../api/client";
import type { Customer, Visit } from "../../api/types";
import { buildGoogleMapsUrl, buildOpenStreetMapUrl } from "../../utils/mapLinks";
import { buildCustomerInsights, customerDisplayType, formatDateTime, priorityLabel, statusLabel } from "../../utils/fieldCrm";
import { useAuthStore } from "../../state/auth";

export default function CustomerProfilePage() {
  const { customerId, customerType } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [customersData, visitsData] = await Promise.all([getCustomers(), getVisits()]);
        setCustomers(customersData);
        setVisits(visitsData);
      } catch (error) {
        console.error(error);
        setMessage("تعذر تحميل ملف العميل. تحقق من الاتصال أو أعد المحاولة.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const insight = useMemo(() => {
    const customer = customers.find((item) => String(item.id) === String(customerId) && item.type === customerType);
    if (!customer) return null;
    return buildCustomerInsights([customer], visits, user?.email)[0];
  }, [customerId, customerType, customers, user?.email, visits]);

  const startVisitFromProfile = async () => {
    if (!insight) return;
    setMessage(null);
    try {
      const visit = await createVisit({
        customerId: insight.customer.id,
        customerName: insight.customer.name,
        customerType: insight.customer.type,
        visitType: "follow-up",
        status: "scheduled",
        notes: "",
      });
      navigate(`/visit-session/${visit.id}`, { state: { visit, customer: insight.customer } });
    } catch (error) {
      console.error(error);
      setMessage("تعذر إنشاء جلسة الزيارة. لن يتم بدء الزيارة قبل حفظ السجل.");
    }
  };

  if (loading) {
    return <div className="card">جاري تحميل ملف العميل...</div>;
  }

  if (!insight) {
    return (
      <div className="page">
        <div className="card">
          <div className="section-title">العميل غير موجود</div>
          <div className="muted">قد يكون العميل خارج قائمة التكليف أو غير متاح دون اتصال.</div>
          <button type="button" className="secondary-button" onClick={() => navigate("/customers")}>
            العودة للعملاء
          </button>
        </div>
      </div>
    );
  }

  const { customer } = insight;
  const mapsUrl = customer.location ? buildGoogleMapsUrl(customer.location.lat, customer.location.lng) : null;
  const osmUrl = customer.location ? buildOpenStreetMapUrl(customer.location.lat, customer.location.lng) : null;

  return (
    <div className="page">
      <section className="hero-band">
        <div className="card-header">
          <div>
            <div className="section-title">{customer.name}</div>
            <div className="muted">
              {customerDisplayType(customer.type)} • {customer.specialty || "غير محدد"} • {customer.area || "منطقة غير محددة"}
            </div>
          </div>
          <span className={`pill status-${insight.status}`}>{statusLabel(insight.status)}</span>
        </div>
        <div className="metric-grid">
          <div className="metric">
            <span className="metric-value">{insight.completedThisMonth}</span>
            <span className="muted">زيارات الشهر</span>
          </div>
          <div className="metric">
            <span className="metric-value">{insight.target}</span>
            <span className="muted">هدف التكرار الشهري</span>
          </div>
        </div>
      </section>

      {message ? <div className="card" style={{ color: "var(--warning)" }}>{message}</div> : null}

      <div className="card">
        <div className="section-title">معلومات العميل</div>
        <div className="grid">
          <div><span className="muted">المنطقة</span><br />{customer.area || "غير متوفر"}</div>
          <div><span className="muted">القطاع</span><br />{customer.territory || "غير متوفر"}</div>
          <div><span className="muted">الأولوية</span><br />{priorityLabel(customer.priority)}</div>
          <div><span className="muted">المندوب</span><br /><span className="text-break">{customer.assignedRepEmail || "غير متوفر"}</span></div>
          <div><span className="muted">آخر زيارة</span><br />{formatDateTime(insight.lastVisit ? insight.lastVisit.visitedAt || insight.lastVisit.startedAt : customer.lastVisit)}</div>
          <div><span className="muted">محور النقاش</span><br />{customer.productFocus || "غير محدد"}</div>
        </div>
        <div style={{ marginTop: 10 }} className="muted text-break">{customer.address || "لا يوجد عنوان مفصل."}</div>
        {customer.phone ? <div className="muted">الهاتف: {customer.phone}</div> : null}
      </div>

      <div className="card">
        <div className="section-title">إجراءات ميدانية</div>
        <div className="actions-row">
          <button type="button" onClick={startVisitFromProfile}>بدء زيارة</button>
          <button type="button" className="secondary-button" onClick={() => setMessage("إضافة الملاحظات متاحة أثناء جلسة زيارة نشطة فقط.")}>إضافة ملاحظة</button>
          {mapsUrl ? <a className="secondary-button" href={mapsUrl} target="_blank" rel="noreferrer">Google Maps</a> : null}
          {osmUrl ? <a className="secondary-button" href={osmUrl} target="_blank" rel="noreferrer">OpenStreetMap</a> : null}
        </div>
      </div>

      <div className="card">
        <div className="section-title">سجل الزيارات</div>
        {insight.visits.length ? (
          <div className="timeline">
            {insight.visits.map((visit) => (
              <div key={visit.id} className="timeline-item">
                <div style={{ fontWeight: 700 }}>{formatDateTime(visit.endedAt || visit.startedAt || visit.visitedAt)}</div>
                <div className="muted">الحالة: {visit.serverStatus || visit.status || "غير محدد"}</div>
                <div className="muted">محور النقاش: {customer.productFocus || "غير محدد"}</div>
                <div className="muted">الملاحظات: {visit.notes || "لا توجد ملاحظات"}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="muted">لا يوجد سجل زيارات لهذا العميل حتى الآن.</div>
        )}
      </div>
    </div>
  );
}
