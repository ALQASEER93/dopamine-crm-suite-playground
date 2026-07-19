export const DRAFT_REP_BUCKETS = ['Rep 1', 'Rep 2', 'Rep 3', 'Rep 4', 'Rep 5'];

export const SOURCE_RUN = 'docs/_runs/run_20260625_010022';

export const SCENARIO5_COUNTS = {
  totalPreparedRows: 3311,
  importableCrmCustomers: 3310,
  officeReviewOnlyRows: 1,
};

export const emptyBucketRows = DRAFT_REP_BUCKETS.map(bucket => ({
  scenario_name: 'Scenario 5 balanced-only planning baseline',
  rep_bucket: bucket,
  editable_rep_display_label: bucket,
  included_route_groups: '',
  route_group_count: '0',
  area_count: '0',
  doctor_count: '0',
  pharmacy_count: '0',
  total_customers: '0',
  estimated_monthly_frequency_total: '0',
  assigned_real_rep_email_or_id: '',
  admin_decision: 'needs_review',
  reviewer: '',
  notes: 'Draft planning label only; upload corrected Scenario 5 CSV to review real counts.',
}));

const normalizeHeader = value => String(value || '').replace(/^\uFEFF/, '').trim();

export const parseCsv = text => {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === ',' && !quoted) {
      row.push(value);
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(value);
      if (row.some(cell => cell !== '')) {
        rows.push(row);
      }
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some(cell => cell !== '')) {
    rows.push(row);
  }

  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map(cells =>
    headers.reduce((record, header, index) => {
      record[header] = cells[index] ?? '';
      return record;
    }, {}),
  );
};

export const toCsv = rows => {
  if (!rows.length) {
    return '';
  }

  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach(key => set.add(key));
    return set;
  }, new Set()));

  const escapeCell = value => {
    const text = value == null ? '' : String(value);
    if (/[",\r\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  return [headers, ...rows.map(row => headers.map(header => row[header] ?? ''))]
    .map(row => row.map(escapeCell).join(','))
    .join('\r\n');
};

export const readFileText = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Unable to read file.'));
    reader.readAsText(file, 'utf-8');
  });

export const asNumber = value => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const normalizeBucketRows = rows =>
  DRAFT_REP_BUCKETS.map(bucket => {
    const match = rows.find(row => row.rep_bucket === bucket);
    return {
      ...(match || emptyBucketRows.find(row => row.rep_bucket === bucket)),
      rep_bucket: bucket,
      editable_rep_display_label: match?.editable_rep_display_label || bucket,
      admin_decision: 'needs_review',
      assigned_real_rep_email_or_id: '',
    };
  });

export const normalizeCustomerRows = rows =>
  rows.map((row, index) => {
    const customerType = row.customer_type || row.draft_customer_type || '';
    const currentBucket = DRAFT_REP_BUCKETS.includes(row.draft_rep_bucket) ? row.draft_rep_bucket : 'UNASSIGNED';
    return {
      planning_customer_id: row.planning_customer_id || row.source_customer_id || `LOCAL-${index + 1}`,
      source_customer_id: row.source_customer_id || '',
      source_row: row.source_row || '',
      customer_type: customerType,
      name: row.name || '',
      area_tag_planning: row.area_tag_planning || row.area_tag || '',
      specialty: row.specialty || '',
      classification: row.classification || '',
      priority: row.priority || '',
      city: row.city || '',
      monthly_frequency_target: String(asNumber(row.monthly_frequency_target)),
      suggested_route_group: row.suggested_route_group || '',
      draft_rep_bucket: currentBucket,
      draft_rep_display_label: row.draft_rep_display_label || currentBucket,
      assignment_basis: row.assignment_basis || 'local_draft',
      customer_level_override_allowed: 'yes',
      review_status: 'needs_review',
      admin_decision: 'needs_review',
      assigned_real_rep_email_or_id: '',
      source_run: row.source_run || SOURCE_RUN,
      change_type: row.change_type || 'loaded_from_planning_pack',
      changed_by: row.changed_by || 'admin-local-draft',
      changed_at: row.changed_at || '',
      notes: row.notes || '',
      archive_request_status: row.archive_request_status || '',
      draft_status: row.draft_status || '',
    };
  });

export const calculateBucketStats = customers => {
  const base = DRAFT_REP_BUCKETS.reduce((acc, bucket) => {
    acc[bucket] = {
      customerCount: 0,
      doctorCount: 0,
      pharmacyCount: 0,
      monthlyFrequencyTotal: 0,
    };
    return acc;
  }, {});

  customers.forEach(customer => {
    if (customer.archive_request_status === 'archive_requested') {
      return;
    }
    const bucket = customer.draft_rep_bucket;
    if (!base[bucket]) {
      return;
    }
    base[bucket].customerCount += 1;
    base[bucket].monthlyFrequencyTotal += asNumber(customer.monthly_frequency_target);
    if (customer.customer_type === 'Doctor/HCP') {
      base[bucket].doctorCount += 1;
    }
    if (customer.customer_type === 'Pharmacy/HCO') {
      base[bucket].pharmacyCount += 1;
    }
  });

  return base;
};

export const buildReconciledBucketRows = (bucketRows, customers, labels) => {
  const stats = calculateBucketStats(customers);
  return normalizeBucketRows(bucketRows).map(row => {
    const bucketStats = stats[row.rep_bucket];
    return {
      ...row,
      editable_rep_display_label: labels[row.rep_bucket] || row.editable_rep_display_label || row.rep_bucket,
      doctor_count: String(bucketStats.doctorCount),
      pharmacy_count: String(bucketStats.pharmacyCount),
      total_customers: String(bucketStats.customerCount),
      estimated_monthly_frequency_total: String(bucketStats.monthlyFrequencyTotal),
      assigned_real_rep_email_or_id: '',
      admin_decision: 'needs_review',
    };
  });
};

export const buildAuditEntry = ({
  customer,
  changeType,
  previousBucket = '',
  nextBucket = '',
  reason = '',
}) => ({
  audit_id: `AUD-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  planning_customer_id: customer?.planning_customer_id || '',
  source_customer_id: customer?.source_customer_id || '',
  customer_name: customer?.name || '',
  review_status: 'needs_review',
  source_run: SOURCE_RUN,
  change_type: changeType,
  previous_bucket: previousBucket,
  next_bucket: nextBucket,
  changed_by: 'admin-local-draft',
  changed_at: new Date().toISOString(),
  notes: reason,
});

export const validatePlannerState = ({ customers, baselineCustomerTotal = SCENARIO5_COUNTS.importableCrmCustomers }) => {
  const sourceCustomers = customers.filter(customer => !customer.planning_customer_id.startsWith('DRAFT-'));
  const draftCustomers = customers.filter(customer => customer.planning_customer_id.startsWith('DRAFT-'));
  const archived = customers.filter(customer => customer.archive_request_status === 'archive_requested');
  const unassigned = customers.filter(customer => customer.draft_rep_bucket === 'UNASSIGNED');
  const invalidFrequency = customers.filter(customer => asNumber(customer.monthly_frequency_target) <= 0);
  const monthlyFrequencyTotal = customers.reduce((total, customer) => {
    if (customer.archive_request_status === 'archive_requested') {
      return total;
    }
    return total + asNumber(customer.monthly_frequency_target);
  }, 0);
  const assignedSourceCount = sourceCustomers.filter(
    customer => DRAFT_REP_BUCKETS.includes(customer.draft_rep_bucket) && customer.archive_request_status !== 'archive_requested',
  ).length;

  return {
    baselineCustomerTotal,
    totalPreparedRows: SCENARIO5_COUNTS.totalPreparedRows,
    importableCrmCustomers: SCENARIO5_COUNTS.importableCrmCustomers,
    officeReviewOnlyRows: SCENARIO5_COUNTS.officeReviewOnlyRows,
    sourceCustomersLoaded: sourceCustomers.length,
    assignedSourceCount,
    draftCustomersCount: draftCustomers.length,
    unassignedCount: unassigned.length,
    archiveRequestCount: archived.length,
    invalidFrequencyCount: invalidFrequency.length,
    monthlyFrequencyTotal,
    hcpCount: customers.filter(customer => customer.customer_type === 'Doctor/HCP').length,
    hcoCount: customers.filter(customer => customer.customer_type === 'Pharmacy/HCO').length,
    representedMatchesBaseline:
      sourceCustomers.length === baselineCustomerTotal &&
      assignedSourceCount + unassigned.length + archived.length === baselineCustomerTotal,
  };
};
