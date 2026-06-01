import type { CoverageSummary, Customer, RouteStop, Visit } from "../api/types";

export type CustomerStatus = "covered" | "due" | "overdue";

export type CustomerInsight = {
  customer: Customer;
  visits: Visit[];
  lastVisit?: Visit;
  target: number;
  completedThisMonth: number;
  status: CustomerStatus;
};

const monthKey = (value: Date) => value.toISOString().slice(0, 7);

export function visitDateValue(visit: Visit) {
  return visit.endedAt || visit.startedAt || visit.visitedAt || "";
}

export function isCompletedVisit(visit: Visit) {
  const status = visit.serverStatus || visit.status;
  return status === "completed" || status === "success";
}

export function customerDisplayType(customerType: Customer["type"]) {
  return customerType === "doctor" ? "طبيب" : "صيدلية";
}

export function priorityLabel(priority?: string) {
  return priority ? `أولوية ${priority}` : "أولوية غير محددة";
}

export function enrichCustomer(customer: Customer, currentUserEmail?: string): Customer {
  return {
    ...customer,
    specialty: customer.specialty || customer.category || (customer.type === "doctor" ? "تخصص غير محدد" : "صيدلية"),
    territory: customer.territory || customer.area || "منطقة غير محددة",
    priority: customer.priority || "B",
    monthlyFrequencyTarget: Number(customer.monthlyFrequencyTarget || 2),
    visitsThisMonth: Number(customer.visitsThisMonth || 0),
    assignedRepEmail: customer.assignedRepEmail || currentUserEmail,
    productFocus: customer.productFocus || "غير محدد",
  };
}

export function buildCustomerInsights(customers: Customer[], visits: Visit[], currentUserEmail?: string): CustomerInsight[] {
  const now = new Date();
  const currentMonth = monthKey(now);

  return customers.map((rawCustomer) => {
    const customer = enrichCustomer(rawCustomer, currentUserEmail);
    const customerVisits = visits
      .filter((visit) => String(visit.customerId) === String(customer.id) && visit.customerType === customer.type)
      .sort((left, right) => (Date.parse(visitDateValue(right)) || 0) - (Date.parse(visitDateValue(left)) || 0));
    const completedThisMonth = customerVisits.filter((visit) => {
      const value = visitDateValue(visit);
      return value.startsWith(currentMonth) && isCompletedVisit(visit);
    }).length;
    const lastVisit = customerVisits[0];
    const lastVisitAgeDays = lastVisit
      ? Math.floor((now.getTime() - (Date.parse(visitDateValue(lastVisit)) || now.getTime())) / 86400000)
      : null;
    const target = Number(customer.monthlyFrequencyTarget || 2);
    let status: CustomerStatus = completedThisMonth >= target ? "covered" : "due";
    if (lastVisitAgeDays === null || lastVisitAgeDays > 35 || completedThisMonth === 0) {
      status = "overdue";
    }
    return { customer: { ...customer, visitsThisMonth: completedThisMonth, lastVisit: visitDateValue(lastVisit || ({} as Visit)) || undefined }, visits: customerVisits, lastVisit, target, completedThisMonth, status };
  });
}

export function statusLabel(status: CustomerStatus) {
  if (status === "covered") return "مغطى";
  if (status === "overdue") return "متأخر";
  return "مستحق";
}

export function nextActionLabel(status: CustomerStatus) {
  if (status === "covered") return "متابعة دورية";
  if (status === "overdue") return "زيارة عاجلة";
  return "جدولة زيارة";
}

export function visitStatusLabel(status?: string | null) {
  if (!status) return "مجدولة";
  const normalized = status.toLowerCase();
  if (normalized === "scheduled" || normalized === "planned") return "مخططة";
  if (normalized === "in_progress" || normalized === "started" || normalized === "active") return "داخل الزيارة";
  if (normalized === "completed" || normalized === "success" || normalized === "synced") return "مكتملة / مزامنة";
  if (normalized === "pending_create") return "بانتظار إنشاء الزيارة";
  if (normalized === "pending_start") return "بانتظار بدء الزيارة";
  if (normalized === "pending_end") return "بانتظار إنهاء الزيارة";
  if (normalized === "refused") return "زيارة مرفوضة";
  if (normalized === "no-show") return "لم تتم";
  return status;
}

export function routeStopStatusLabel(status?: string | null) {
  if (status === "done") return "تمت";
  if (status === "in-progress") return "قيد التنفيذ";
  if (status === "skipped") return "متجاوزة";
  return "مخططة";
}

export function gpsStartLabel(visit: Visit) {
  if (!visit.coordinates) return "GPS بداية مفقود";
  if (typeof visit.startAccuracy === "number" && visit.startAccuracy > 80) return `GPS بداية دقة منخفضة (${Math.round(visit.startAccuracy)}م)`;
  return "GPS بداية موثق";
}

export function gpsEndLabel(visit: Visit) {
  if (!visit.endedAt) return "GPS نهاية بانتظار الإنهاء";
  if (!visit.endCoordinates) return "GPS نهاية مفقود";
  if (typeof visit.endAccuracy === "number" && visit.endAccuracy > 80) return `GPS نهاية دقة منخفضة (${Math.round(visit.endAccuracy)}م)`;
  return "GPS نهاية موثق";
}

export function visitSyncLabel(visit: Visit) {
  if (String(visit.id).startsWith("offline-") || visit.serverStatus?.startsWith("pending")) return "معلق للمزامنة";
  if (visit.serverStatus === "completed" || visit.status === "success" || visit.status === "completed") return "مقدم / مزامن";
  return "قيد العمل";
}

export function visitLifecycleSteps(visit: Visit) {
  return [
    { label: "مخططة", done: Boolean(visit.id) },
    { label: "بدأت", done: Boolean(visit.startedAt) },
    { label: "GPS بداية", done: Boolean(visit.coordinates) },
    { label: "داخل الزيارة", done: Boolean(visit.startedAt && !visit.endedAt) },
    { label: "مكالمة/نقاش", done: Boolean(visit.callDurationSeconds || visit.notes) },
    { label: "انتهت", done: Boolean(visit.endedAt) },
    { label: "GPS نهاية", done: Boolean(visit.endCoordinates) },
    { label: "مزامنة", done: !String(visit.id).startsWith("offline-") && !visit.serverStatus?.startsWith("pending") },
  ];
}

export function formatDateTime(value?: string | null) {
  if (!value) return "غير متوفر";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متوفر";
  return date.toLocaleString("ar-JO", { dateStyle: "medium", timeStyle: "short" });
}

export function formatDuration(seconds?: number | null) {
  if (!seconds || seconds < 1) return "غير متوفر";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 1) return `${rest} ث`;
  return `${minutes} د ${rest} ث`;
}

export function deriveVisitDuration(visit: Visit) {
  if (visit.durationSeconds) return visit.durationSeconds;
  if (!visit.startedAt || !visit.endedAt) return 0;
  return Math.max(0, Math.floor(((Date.parse(visit.endedAt) || 0) - (Date.parse(visit.startedAt) || 0)) / 1000));
}

export function buildCoverageSummary(customers: Customer[], visits: Visit[], routeStops: RouteStop[] = []): CoverageSummary {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentMonth = monthKey(now);
  const insights = buildCustomerInsights(customers, visits);
  const completedThisMonth = visits.filter((visit) => visitDateValue(visit).startsWith(currentMonth) && isCompletedVisit(visit));
  const visitedTodayIds = new Set(
    visits
      .filter((visit) => visitDateValue(visit).startsWith(today))
      .map((visit) => `${visit.customerType}:${visit.customerId}`),
  );
  const target = insights.reduce((sum, insight) => sum + insight.target, 0);
  const durations = visits.map(deriveVisitDuration).filter((value) => value > 0);
  const callDurations = visits.map((visit) => visit.callDurationSeconds || 0).filter((value) => value > 0);
  const visitsByArea = new Map<string, number>();
  const visitsByCustomerType = new Map<"doctor" | "pharmacy", number>();
  for (const visit of visits) {
    const customer = customers.find((item) => String(item.id) === String(visit.customerId) && item.type === visit.customerType);
    const area = customer?.area || "غير محدد";
    visitsByArea.set(area, (visitsByArea.get(area) || 0) + 1);
    visitsByCustomerType.set(visit.customerType, (visitsByCustomerType.get(visit.customerType) || 0) + 1);
  }
  const gpsMissingOrLowAccuracy = visits.filter((visit) => {
    const hasStart = Boolean(visit.coordinates);
    const hasEnd = Boolean(visit.endCoordinates);
    const lowStart = typeof visit.startAccuracy === "number" && visit.startAccuracy > 80;
    const lowEnd = typeof visit.endAccuracy === "number" && visit.endAccuracy > 80;
    return !hasStart || (visit.endedAt && !hasEnd) || lowStart || lowEnd;
  }).length;

  return {
    totalAssignedCustomers: customers.length,
    visitedToday: visitedTodayIds.size,
    remainingToday: Math.max((routeStops.length || customers.length) - visitedTodayIds.size, 0),
    completedVisitsThisMonth: completedThisMonth.length,
    monthlyFrequencyTarget: target,
    frequencyAchievedPct: target ? Math.round((completedThisMonth.length / target) * 100) : 0,
    dueCustomers: insights.filter((item) => item.status === "due").length,
    overdueCustomers: insights.filter((item) => item.status === "overdue").length,
    avgVisitDurationMinutes: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length / 60) : 0,
    avgCallDurationMinutes: callDurations.length ? Math.round(callDurations.reduce((sum, value) => sum + value, 0) / callDurations.length / 60) : 0,
    visitsByArea: Array.from(visitsByArea, ([area, visitCount]) => ({ area, visits: visitCount })),
    visitsByCustomerType: Array.from(visitsByCustomerType, ([type, visitCount]) => ({ type, visits: visitCount })),
    gpsMissingOrLowAccuracy,
  };
}
