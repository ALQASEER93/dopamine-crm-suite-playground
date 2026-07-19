import { createVisit, getVisits } from "../api/client";
import type { Customer, Visit } from "../api/types";
import {
  enqueueMutation,
  generateOfflineVisitId,
  getOfflineVisits,
  upsertOfflineVisit,
} from "../offline/queue";

export type VisitSessionResult = {
  visit: Visit;
  mode: "created" | "queued" | "resumed";
  message: string;
};

function isActiveVisit(visit: Visit) {
  const status = (visit.serverStatus || visit.status || "").toLowerCase();
  return (
    Boolean(visit.startedAt && !visit.endedAt) ||
    ["in_progress", "active", "started", "pending_start", "pending_end"].includes(status)
  );
}

function sameCustomer(visit: Visit, customer: Customer) {
  return String(visit.customerId) === String(customer.id) && visit.customerType === customer.type;
}

async function findExistingActiveVisit(customer: Customer) {
  try {
    const [serverVisits, offlineVisits] = await Promise.all([getVisits(), getOfflineVisits()]);
    return [...offlineVisits, ...serverVisits].find((visit) => sameCustomer(visit, customer) && isActiveVisit(visit));
  } catch {
    const offlineVisits = await getOfflineVisits();
    return offlineVisits.find((visit) => sameCustomer(visit, customer) && isActiveVisit(visit));
  }
}

async function queueOfflineVisit(customer: Customer): Promise<VisitSessionResult> {
  const localVisitId = generateOfflineVisitId();
  const now = new Date().toISOString();
  const payload = {
    customerId: customer.id,
    customerName: customer.name,
    customerType: customer.type,
    visitType: "follow-up" as const,
    status: "scheduled" as const,
    notes: "",
  };
  const visit: Visit & { localVisitId: string } = {
    ...payload,
    id: localVisitId,
    localVisitId,
    visitedAt: now,
    serverStatus: "pending_create",
  };

  await enqueueMutation({
    endpoint: "pwa/visits",
    method: "POST",
    payload,
    type: "visit",
    localVisitId,
  });
  await upsertOfflineVisit(visit);

  return {
    visit,
    mode: "queued",
    message: "تم إنشاء جلسة زيارة محلية وستتم مزامنتها عند عودة الاتصال.",
  };
}

export async function createOrResumeVisitSession(customer: Customer): Promise<VisitSessionResult> {
  const existingActiveVisit = await findExistingActiveVisit(customer);
  if (existingActiveVisit) {
    return {
      visit: existingActiveVisit,
      mode: "resumed",
      message: "تم فتح الزيارة النشطة الحالية بدلاً من إنشاء زيارة مكررة.",
    };
  }

  if (!navigator.onLine) {
    return queueOfflineVisit(customer);
  }

  try {
    const visit = await createVisit({
      customerId: customer.id,
      customerName: customer.name,
      customerType: customer.type,
      visitType: "follow-up",
      status: "scheduled",
      notes: "",
    });
    return {
      visit,
      mode: "created",
      message: "تم إنشاء جلسة الزيارة. الخطوة التالية هي التقاط GPS البداية.",
    };
  } catch (error) {
    if (!navigator.onLine || error instanceof TypeError) {
      return queueOfflineVisit(customer);
    }
    throw error;
  }
}
