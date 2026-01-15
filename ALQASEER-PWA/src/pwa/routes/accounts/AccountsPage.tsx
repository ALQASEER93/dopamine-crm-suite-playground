import React, { useEffect, useMemo, useState } from "react";
import { getCustomers } from "../../api/client";
import { Customer } from "../../api/types";
import { PageHeader } from "../../components/system/PageHeader";
import { ListItem } from "../../components/system/ListItem";
import { EmptyState } from "../../components/system/EmptyState";
import { useAuthStore } from "../../state/auth";

export default function AccountsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("");
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCustomers();
        setCustomers(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch = search ? customer.name.toLowerCase().includes(search.toLowerCase()) : true;
      const matchesSegment = segment ? customer.type === segment : true;
      return matchesSearch && matchesSegment;
    });
  }, [customers, search, segment]);

  const canCreate = ["admin", "sales_manager"].includes(String(user?.role || "").toLowerCase());

  return (
    <div className="page">
      <PageHeader
        title="العملاء"
        subtitle="ابحث عن الحسابات وتابع آخر زيارة."
        actions={
          <button className="btn btn-primary" type="button" disabled={!canCreate}>
            إضافة عميل
          </button>
        }
      />

      <div className="card">
        <div className="grid grid--two">
          <input className="input" placeholder="بحث بالاسم" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={segment} onChange={(e) => setSegment(e.target.value)}>
            <option value="">كل الشرائح</option>
            <option value="doctor">أطباء</option>
            <option value="pharmacy">صيدليات</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card">...تحميل</div>
      ) : filtered.length ? (
        <div className="list">
          {filtered.map((customer) => (
            <ListItem
              key={customer.id}
              title={customer.name}
              subtitle={`${customer.address || "بدون عنوان"} • آخر زيارة: ${customer.lastVisit || "—"}`}
              meta={<span className="chip">{customer.type === "doctor" ? "طبيب" : "صيدلية"}</span>}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد نتائج" description="جرّب كلمات بحث أخرى أو غيّر التصفية." />
      )}
      {!canCreate ? <div className="muted">إضافة العملاء متاحة للمديرين فقط.</div> : null}
    </div>
  );
}
