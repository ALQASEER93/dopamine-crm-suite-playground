import React from "react";
import { PageHeader } from "../../components/system/PageHeader";
import { KPIStatCard } from "../../components/system/KPIStatCard";

export default function TargetsPage() {
  return (
    <div className="page">
      <PageHeader title="الأهداف" subtitle="مؤشرات الأداء للفترة الحالية." />

      <div className="grid grid--three">
        <KPIStatCard label="زيارات اليوم" value="6 / 10" tone="warning" delta="متبقٍ 4 زيارات" />
        <KPIStatCard label="تحصيل الشهر" value="68%" tone="positive" delta="+8% عن الأسبوع الماضي" />
        <KPIStatCard label="منتج التركيز" value="NeuroMax" />
      </div>

      <div className="card">
        <div className="section-title">تفصيل الأهداف</div>
        <div className="muted" style={{ marginTop: 8 }}>
          سيتم ربط هذه البيانات مباشرة مع لوحة الإدارة عند توفر واجهات الأهداف.
        </div>
      </div>
    </div>
  );
}
