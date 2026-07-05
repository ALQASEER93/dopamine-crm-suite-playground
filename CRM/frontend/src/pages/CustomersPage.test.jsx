import { describe, expect, it } from 'vitest';

import {
  dueStatusLabel,
  extractTrustedLocation,
  formatCustomerBadge,
  formatDueStatus,
  normalizeCustomers,
  resolveAssignedRepLabel,
} from './fieldRouteUtils';

describe('customer assigned rep display helpers', () => {
  it('shows assigned rep identity when name or id exists', () => {
    const [customer] = normalizeCustomers([
      {
        id: 10,
        type: 'doctor',
        name: 'اختبار',
        assigned_rep_name: 'Rep North',
        assigned_rep_id: 7,
      },
    ]);

    expect(resolveAssignedRepLabel(customer)).toBe('Rep North (7)');
  });

  it('uses honest assignment state text without inventing rep identity', () => {
    expect(resolveAssignedRepLabel({ isAssignedToCurrentRep: true })).toBe('مكلف للمستخدم الحالي');
    expect(resolveAssignedRepLabel({})).toBe('لا توجد هوية مندوب مثبتة في البيانات الحالية');
  });

  it('renders raw customer state keys as Arabic user-facing labels', () => {
    expect(formatCustomerBadge('missing_location')).toBe('الموقع غير مكتمل');
    expect(formatCustomerBadge('no_trusted_coordinates')).toBe('لا توجد إحداثيات موثوقة');
    expect(formatCustomerBadge('pending_geocode')).toBe('بانتظار مراجعة الموقع');
    expect(formatDueStatus('due_status_unavailable')).toBe('لا توجد بيانات كافية لحساب الاستحقاق');
  });

  it('normalizes field-force customer metadata used by route QA', () => {
    const [customer] = normalizeCustomers([
      {
        id: 11,
        customerType: 'pharmacy',
        customerName: 'صيدلية اختبار',
        territoryName: 'North',
        priorityLevel: 'A',
        location_status: 'pending_review',
        monthly_frequency_target: 2,
      },
    ]);

    expect(customer.type).toBe('pharmacy');
    expect(customer.territory).toBe('North');
    expect(customer.priority).toBe('A');
    expect(customer.locationStatus).toBe('pending_review');
    expect(customer.monthlyFrequencyTarget).toBe(2);
  });

  it('extracts only numeric trusted locations and translates route due status labels', () => {
    expect(extractTrustedLocation({ location: { lat: 31.95, lng: 35.93, accuracy: 12 } })).toMatchObject({
      lat: 31.95,
      lng: 35.93,
      accuracy: 12,
    });
    expect(extractTrustedLocation({ location: { lat: '', lng: '' } })).toBeNull();
    expect(dueStatusLabel('overdue')).toBe('متأخر');
    expect(dueStatusLabel('completed')).toBe('مكتمل');
    expect(dueStatusLabel('planned')).toBe('مخطط');
  });
});
