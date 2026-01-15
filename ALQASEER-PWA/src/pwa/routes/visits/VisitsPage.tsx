import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createVisit, exportVisits, getCustomers, getVisits } from "../../api/client";
import { Customer, Visit, VisitStatus } from "../../api/types";
import { EmptyState } from "../../components/system/EmptyState";
import { ListItem } from "../../components/system/ListItem";
import { PageHeader } from "../../components/system/PageHeader";
import { Skeleton } from "../../components/system/Skeleton";
import { enqueueMutation } from "../../offline/queue";
import { useAuthStore } from "../../state/auth";

export default function VisitsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filters, setFilters] = useState({ date: "", status: "" });
  const [newVisit, setNewVisit] = useState({
    customerId: (location.state as any)?.customerId || "",
    visitType: "follow-up",
    status: "SCHEDULED" as VisitStatus,
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingData(true);
        const [visitsData, customersData] = await Promise.all([getVisits(), getCustomers()]);
        setVisits(visitsData);
        setCustomers(customersData);
      } catch (err) {
        setMessage("تعذر تحميل البيانات. حاول مرة أخرى.");
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (evt: FormEvent) => {
    evt.preventDefault();
    setLoading(true);
    setMessage(null);

    const customer = customers.find((c) => c.id === newVisit.customerId);
    if (!customer) {
      setMessage("يرجى اختيار العميل أولاً.");
      setLoading(false);
      return;
    }

    const payload = {
      customerId: customer.id,
      customerName: customer.name,
      customerType: customer.type,
      visitType: newVisit.visitType as Visit["visitType"],
      status: newVisit.status,
      notes: newVisit.notes,
    };

    const online = navigator.onLine;
    try {
      if (online) {
        const created = await createVisit(payload);
        setVisits((prev) => [created, ...prev]);
        setMessage("تمت جدولة الزيارة.");
      } else {
        enqueueMutation({
          endpoint: "visits",
          method: "POST",
          payload,
          type: "visit",
        });
        setVisits((prev) => [{ ...payload, id: crypto.randomUUID() } as Visit, ...prev]);
        setMessage("تمت جدولة الزيارة وستُرسل عند توفر الاتصال.");
      }
      setNewVisit({ customerId: "", visitType: "follow-up", status: "SCHEDULED", notes: "" });
    } catch (err) {
      setMessage("تعذر حفظ الزيارة. حاول مرة أخرى.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredVisits = useMemo(
    () =>
      visits.filter((visit) => {
        const matchesDate = filters.date ? visit.visitedAt?.slice(0, 10) === filters.date : true;
        const matchesStatus = filters.status ? visit.status === filters.status : true;
        return matchesDate && matchesStatus;
      }),
    [filters.date, filters.status, visits],
  );

  const canExport = ["admin", "sales_manager"].includes(String(user?.role || "").toLowerCase());
  const onExport = async () => {
    try {
      await exportVisits();
      setMessage("تم بدء تصدير الزيارات.");
    } catch (error) {
      setMessage("تعذّر تصدير الزيارات.");
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="الزيارات"
        subtitle="إدارة سجل الزيارات وبدء/إنهاء الزيارة."
        actions={
          canExport ? (
            <button className="btn btn-secondary" type="button" onClick={onExport}>
              تصدير
            </button>
          ) : null
        }
      />
      <div className="card">
        <div className="section-title">جدولة زيارة جديدة</div>
        {loadingData ? (
          <div className="skeleton-stack">
            <Skeleton height={16} width="35%" />
            <Skeleton height={44} />
            <Skeleton height={16} width="35%" />
            <Skeleton height={44} />
            <Skeleton height={16} width="35%" />
            <Skeleton height={84} />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="customer">العميل</label>
              <select
                id="customer"
                value={newVisit.customerId}
                onChange={(e) => setNewVisit((s) => ({ ...s, customerId: e.target.value }))}
                required
              >
                <option value="">اختر</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} • {c.type === "doctor" ? "طبيب" : "صيدلية"}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid">
              <div>
                <label>نوع الزيارة</label>
                <select value={newVisit.visitType} onChange={(e) => setNewVisit((s) => ({ ...s, visitType: e.target.value }))}>
                  <option value="follow-up">متابعة</option>
                  <option value="new">جديدة</option>
                  <option value="reminder">تذكير</option>
                </select>
              </div>
            </div>
            <div>
              <label>ملاحظات</label>
              <textarea
                rows={3}
                value={newVisit.notes}
                onChange={(e) => setNewVisit((s) => ({ ...s, notes: e.target.value }))}
                placeholder="تفاصيل سريعة عن الزيارة..."
              />
            </div>
            {message ? <div className="muted">{message}</div> : null}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "يتم الحفظ..." : "حفظ الزيارة"}
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="section-title">سجل الزيارات</div>
        </div>
        <div className="grid grid--two" style={{ marginBottom: 12 }}>
          <input type="date" value={filters.date} onChange={(e) => setFilters((s) => ({ ...s, date: e.target.value }))} />
          <select value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}>
            <option value="">الكل</option>
            <option value="SCHEDULED">مجدولة</option>
            <option value="IN_PROGRESS">قيد التنفيذ</option>
            <option value="COMPLETED">مكتملة</option>
            <option value="NO_SHOW">لم تتم</option>
          </select>
        </div>
        {loadingData ? (
          <div className="skeleton-stack">
            <Skeleton height={72} />
            <Skeleton height={72} />
          </div>
        ) : filteredVisits.length ? (
          <div className="list">
            {filteredVisits.map((visit) => (
              <ListItem
                key={visit.id}
                title={visit.customerName}
                subtitle={visit.visitedAt ? new Date(visit.visitedAt).toLocaleString("ar-EG") : "بدون تاريخ"}
                meta={<span className="chip">{visit.status}</span>}
                action={
                  visit.status === "IN_PROGRESS" || visit.status === "SCHEDULED" ? (
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() =>
                        navigate(
                          visit.status === "IN_PROGRESS"
                            ? `/visits/${visit.id}/end`
                            : `/visits/${visit.id}/start`,
                        )
                      }
                    >
                      {visit.status === "IN_PROGRESS" ? "إنهاء" : "بدء"}
                    </button>
                  ) : null
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState title="لا توجد زيارات بعد" description="ابدأ بجدولة أول زيارة ليظهر السجل هنا." />
        )}
      </div>
    </div>
  );
}
