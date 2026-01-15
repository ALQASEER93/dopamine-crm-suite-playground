import React from "react";
import { PageHeader } from "../../components/system/PageHeader";
import { ListItem } from "../../components/system/ListItem";

const notifications = [
  {
    id: "sync",
    title: "مزامنة غير مكتملة",
    description: "هناك معاملات معلّقة تحتاج إعادة إرسال.",
    type: "تنبيه",
  },
  {
    id: "manager-note",
    title: "ملاحظة المشرف",
    description: "يرجى التركيز على العيادات عالية القيمة هذا الأسبوع.",
    type: "رسالة",
  },
  {
    id: "geo",
    title: "تنبيه الموقع",
    description: "تم تسجيل زيارة خارج نطاق الموقع المحدد.",
    type: "تنبيه",
  },
];

export default function NotificationsPage() {
  return (
    <div className="page">
      <PageHeader title="الإشعارات" subtitle="تنبيهات المزامنة والملاحظات الإدارية." />
      <div className="card">
        <div className="list">
          {notifications.map((item) => (
            <ListItem
              key={item.id}
              title={item.title}
              subtitle={item.description}
              meta={<span className="chip">{item.type}</span>}
            />
          ))}
        </div>
      </div>
      <div className="muted">واجهة مؤقتة لحين ربط التنبيهات بالخادم.</div>
    </div>
  );
}
