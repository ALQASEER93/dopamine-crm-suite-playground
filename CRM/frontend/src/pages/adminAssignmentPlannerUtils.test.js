import { describe, expect, it } from 'vitest';
import {
  buildReconciledBucketRows,
  emptyBucketRows,
  normalizeCustomerRows,
  parseCsv,
  SCENARIO5_COUNTS,
  validatePlannerState,
} from './adminAssignmentPlannerUtils';

describe('admin assignment planner utilities', () => {
  it('parses quoted Arabic CSV cells and normalizes draft rows', () => {
    const rows = parseCsv(
      '\uFEFFplanning_customer_id,name,customer_type,monthly_frequency_target,draft_rep_bucket\nSRC-1,"أحمد, العيادة",Doctor/HCP,2,Rep 1',
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('أحمد, العيادة');

    const normalized = normalizeCustomerRows(rows);
    expect(normalized[0]).toMatchObject({
      planning_customer_id: 'SRC-1',
      review_status: 'needs_review',
      admin_decision: 'needs_review',
      assigned_real_rep_email_or_id: '',
      draft_rep_bucket: 'Rep 1',
    });
  });

  it('recalculates bucket totals from customer monthly_frequency_target values', () => {
    const customers = normalizeCustomerRows([
      { planning_customer_id: 'SRC-1', customer_type: 'Doctor/HCP', monthly_frequency_target: '2', draft_rep_bucket: 'Rep 1' },
      { planning_customer_id: 'SRC-2', customer_type: 'Pharmacy/HCO', monthly_frequency_target: '3', draft_rep_bucket: 'Rep 1' },
      { planning_customer_id: 'SRC-3', customer_type: 'Doctor/HCP', monthly_frequency_target: '4', draft_rep_bucket: 'Rep 2' },
    ]);

    const rows = buildReconciledBucketRows(emptyBucketRows, customers, { 'Rep 1': 'North', 'Rep 2': 'East' });
    const rep1 = rows.find(row => row.rep_bucket === 'Rep 1');
    const rep2 = rows.find(row => row.rep_bucket === 'Rep 2');

    expect(rep1.estimated_monthly_frequency_total).toBe('5');
    expect(rep1.total_customers).toBe('2');
    expect(rep1.doctor_count).toBe('1');
    expect(rep1.pharmacy_count).toBe('1');
    expect(rep1.admin_decision).toBe('needs_review');
    expect(rep1.assigned_real_rep_email_or_id).toBe('');
    expect(rep2.estimated_monthly_frequency_total).toBe('4');
  });

  it('explains represented-customer changes through unassigned, draft, or archive state', () => {
    const customers = normalizeCustomerRows([
      { planning_customer_id: 'SRC-1', customer_type: 'Doctor/HCP', monthly_frequency_target: '2', draft_rep_bucket: 'Rep 1' },
      { planning_customer_id: 'SRC-2', customer_type: 'Pharmacy/HCO', monthly_frequency_target: '3', draft_rep_bucket: 'UNASSIGNED' },
      {
        planning_customer_id: 'SRC-3',
        customer_type: 'Doctor/HCP',
        monthly_frequency_target: '1',
        draft_rep_bucket: 'Rep 2',
        archive_request_status: 'archive_requested',
      },
      { planning_customer_id: 'DRAFT-1', customer_type: 'Doctor/HCP', monthly_frequency_target: '1', draft_rep_bucket: 'Rep 2' },
    ]);

    const validation = validatePlannerState({ customers, baselineCustomerTotal: 3 });

    expect(validation.sourceCustomersLoaded).toBe(3);
    expect(validation.assignedSourceCount).toBe(1);
    expect(validation.unassignedCount).toBe(1);
    expect(validation.archiveRequestCount).toBe(1);
    expect(validation.draftCustomersCount).toBe(1);
    expect(validation.monthlyFrequencyTotal).toBe(6);
    expect(validation.representedMatchesBaseline).toBe(true);
  });

  it('carries Scenario 5 labels for prepared rows, importable customers, and Office review-only row', () => {
    const validation = validatePlannerState({ customers: [] });

    expect(SCENARIO5_COUNTS).toEqual({
      totalPreparedRows: 3311,
      importableCrmCustomers: 3310,
      officeReviewOnlyRows: 1,
    });
    expect(validation.totalPreparedRows).toBe(3311);
    expect(validation.importableCrmCustomers).toBe(3310);
    expect(validation.officeReviewOnlyRows).toBe(1);
    expect(validation.baselineCustomerTotal).toBe(3310);
  });
});
