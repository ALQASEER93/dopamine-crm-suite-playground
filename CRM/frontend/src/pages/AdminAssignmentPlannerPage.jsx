import { useEffect, useMemo, useState } from 'react';
import {
  DRAFT_REP_BUCKETS,
  SOURCE_RUN,
  buildAuditEntry,
  buildReconciledBucketRows,
  emptyBucketRows,
  normalizeBucketRows,
  normalizeCustomerRows,
  parseCsv,
  readFileText,
  toCsv,
  validatePlannerState,
} from './adminAssignmentPlannerUtils';
import './EntityListPage.css';
import './AdminAssignmentPlannerPage.css';

const STORAGE_KEY = 'dpm.assignmentPlanner.scenario5.phaseB';
const PAGE_SIZE = 40;

const initialState = {
  buckets: emptyBucketRows,
  customers: [],
  labels: DRAFT_REP_BUCKETS.reduce((acc, bucket) => ({ ...acc, [bucket]: bucket }), {}),
  auditLog: [],
  lastLoadedAt: '',
};

const customerTypeLabels = {
  'Doctor/HCP': 'طبيب / HCP',
  'Pharmacy/HCO': 'صيدلية / HCO',
};

const downloadCsv = (filename, rows) => {
  const csv = toCsv(rows);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const loadStoredState = () => {
  if (typeof window === 'undefined') {
    return initialState;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return initialState;
    }
    const parsed = JSON.parse(raw);
    return {
      ...initialState,
      ...parsed,
      buckets: normalizeBucketRows(parsed.buckets || []),
      customers: normalizeCustomerRows(parsed.customers || []),
      labels: {
        ...initialState.labels,
        ...(parsed.labels || {}),
      },
      auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog : [],
    };
  } catch (error) {
    console.warn('Unable to load assignment planner draft state', error);
    return initialState;
  }
};

const AdminAssignmentPlannerPage = () => {
  const [state, setState] = useState(loadStoredState);
  const [activeBucket, setActiveBucket] = useState('Rep 1');
  const [search, setSearch] = useState('');
  const [selectedExistingId, setSelectedExistingId] = useState('');
  const [selectedExistingBucket, setSelectedExistingBucket] = useState('Rep 1');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    customer_type: 'Doctor/HCP',
    name: '',
    area_tag_planning: '',
    monthly_frequency_target: '',
    specialty: '',
    classification: '',
    priority: '',
    city: '',
    notes: '',
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Unable to persist assignment planner draft state', error);
    }
  }, [state]);

  const bucketRows = useMemo(
    () => buildReconciledBucketRows(state.buckets, state.customers, state.labels),
    [state.buckets, state.customers, state.labels],
  );
  const validation = useMemo(() => validatePlannerState({ customers: state.customers }), [state.customers]);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.customers
      .filter(customer => customer.draft_rep_bucket === activeBucket)
      .filter(customer => {
        if (!term) return true;
        return [
          customer.name,
          customer.planning_customer_id,
          customer.source_customer_id,
          customer.area_tag_planning,
          customer.specialty,
          customer.suggested_route_group,
        ]
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .slice(0, PAGE_SIZE);
  }, [activeBucket, search, state.customers]);

  const unassignedCustomers = useMemo(
    () => state.customers.filter(customer => customer.draft_rep_bucket === 'UNASSIGNED'),
    [state.customers],
  );

  const handleLoadBuckets = async file => {
    if (!file) return;
    try {
      const rows = parseCsv(await readFileText(file));
      const buckets = normalizeBucketRows(rows);
      setState(prev => ({
        ...prev,
        buckets,
        labels: buckets.reduce((acc, row) => ({ ...acc, [row.rep_bucket]: row.editable_rep_display_label || row.rep_bucket }), prev.labels),
        lastLoadedAt: new Date().toISOString(),
      }));
      setMessage({ type: 'success', text: 'تم تحميل ملف Rep Buckets المصحح.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'تعذر قراءة ملف Rep Buckets.' });
    }
  };

  const handleLoadCustomers = async file => {
    if (!file) return;
    try {
      const rows = normalizeCustomerRows(parseCsv(await readFileText(file)));
      setState(prev => ({
        ...prev,
        customers: rows,
        auditLog: [
          buildAuditEntry({
            customer: { planning_customer_id: 'PACK-LOAD', name: 'Scenario 5 customer planning CSV' },
            changeType: 'loaded_customer_planning_csv',
            nextBucket: 'Rep 1-Rep 5',
            reason: `Loaded ${rows.length} customer planning rows from local CSV.`,
          }),
          ...prev.auditLog,
        ],
        lastLoadedAt: new Date().toISOString(),
      }));
      setMessage({ type: 'success', text: `تم تحميل ${rows.length} صف عميل للتخطيط.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'تعذر قراءة ملف العملاء.' });
    }
  };

  const renameBucket = (bucket, label) => {
    setState(prev => ({
      ...prev,
      labels: { ...prev.labels, [bucket]: label || bucket },
      auditLog: [
        buildAuditEntry({
          customer: { planning_customer_id: bucket, name: prev.labels[bucket] || bucket },
          changeType: 'rename_draft_rep_label',
          previousBucket: prev.labels[bucket] || bucket,
          nextBucket: label || bucket,
          reason: 'Draft display label changed locally. No auth user created.',
        }),
        ...prev.auditLog,
      ],
    }));
  };

  const updateCustomer = (customerId, updater, audit) => {
    setState(prev => ({
      ...prev,
      customers: prev.customers.map(customer =>
        customer.planning_customer_id === customerId
          ? {
              ...customer,
              ...updater(customer),
              review_status: 'needs_review',
              admin_decision: 'needs_review',
              assigned_real_rep_email_or_id: '',
              source_run: SOURCE_RUN,
              changed_by: 'admin-local-draft',
              changed_at: new Date().toISOString(),
            }
          : customer,
      ),
      auditLog: audit ? [audit, ...prev.auditLog] : prev.auditLog,
    }));
  };

  const moveCustomer = (customer, nextBucket, note = reason) => {
    updateCustomer(
      customer.planning_customer_id,
      () => ({
        draft_rep_bucket: nextBucket,
        draft_rep_display_label: nextBucket === 'UNASSIGNED' ? '' : state.labels[nextBucket] || nextBucket,
        change_type: nextBucket === 'UNASSIGNED' ? 'remove_assignment' : 'move_customer',
        notes: note || 'Draft bucket change.',
      }),
      buildAuditEntry({
        customer,
        changeType: nextBucket === 'UNASSIGNED' ? 'remove_assignment' : 'move_customer',
        previousBucket: customer.draft_rep_bucket,
        nextBucket,
        reason: note || 'Draft bucket change.',
      }),
    );
  };

  const handleAddExisting = () => {
    const customer = state.customers.find(row => {
      const id = selectedExistingId.trim();
      return row.planning_customer_id === id || row.source_customer_id === id;
    });
    if (!customer) {
      setMessage({ type: 'error', text: 'لم يتم العثور على عميل موجود بهذا الرقم.' });
      return;
    }
    moveCustomer(customer, selectedExistingBucket, reason || 'Add existing customer to draft bucket.');
    setMessage({ type: 'success', text: 'تمت إضافة العميل الموجود إلى الدلو التخطيطي.' });
  };

  const handleAddNewCustomer = event => {
    event.preventDefault();
    if (!newCustomer.name.trim() || !newCustomer.area_tag_planning.trim() || !newCustomer.monthly_frequency_target) {
      setMessage({ type: 'error', text: 'النوع والاسم والمنطقة وهدف الزيارات الشهرية مطلوبة.' });
      return;
    }
    const draft = {
      ...newCustomer,
      planning_customer_id: `DRAFT-${Date.now()}`,
      source_customer_id: '',
      source_row: '',
      suggested_route_group: '',
      draft_rep_bucket: activeBucket,
      draft_rep_display_label: state.labels[activeBucket] || activeBucket,
      assignment_basis: 'admin_added_draft_customer',
      customer_level_override_allowed: 'yes',
      review_status: 'needs_review',
      admin_decision: 'needs_review',
      assigned_real_rep_email_or_id: '',
      source_run: SOURCE_RUN,
      change_type: 'add_new_customer_draft',
      changed_by: 'admin-local-draft',
      changed_at: new Date().toISOString(),
      archive_request_status: '',
      draft_status: 'pending_review',
    };
    setState(prev => ({
      ...prev,
      customers: [draft, ...prev.customers],
      auditLog: [
        buildAuditEntry({
          customer: draft,
          changeType: 'add_new_customer_draft',
          nextBucket: activeBucket,
          reason: draft.notes || 'New customer draft; no DB apply.',
        }),
        ...prev.auditLog,
      ],
    }));
    setNewCustomer({
      customer_type: 'Doctor/HCP',
      name: '',
      area_tag_planning: '',
      monthly_frequency_target: '',
      specialty: '',
      classification: '',
      priority: '',
      city: '',
      notes: '',
    });
    setMessage({ type: 'success', text: 'تمت إضافة عميل مسودة pending_review فقط.' });
  };

  const requestArchive = customer => {
    updateCustomer(
      customer.planning_customer_id,
      () => ({
        archive_request_status: 'archive_requested',
        change_type: 'archive_customer_request',
        notes: reason || 'Draft archive request only; no hard delete.',
      }),
      buildAuditEntry({
        customer,
        changeType: 'archive_customer_request',
        previousBucket: customer.draft_rep_bucket,
        nextBucket: customer.draft_rep_bucket,
        reason: reason || 'Draft archive request only; no hard delete.',
      }),
    );
    setMessage({ type: 'warning', text: 'تم تسجيل طلب أرشفة فقط. لم يتم حذف العميل.' });
  };

  const exportDraft = () => {
    const rows = state.customers.map(customer => ({
      ...customer,
      draft_rep_display_label:
        DRAFT_REP_BUCKETS.includes(customer.draft_rep_bucket) ? state.labels[customer.draft_rep_bucket] : '',
      review_status: 'needs_review',
      admin_decision: 'needs_review',
      assigned_real_rep_email_or_id: '',
    }));
    downloadCsv('scenario5_assignment_planner_draft.csv', rows);
  };

  const exportBuckets = () => {
    downloadCsv('scenario5_assignment_planner_bucket_summary.csv', bucketRows);
  };

  const exportAudit = () => {
    downloadCsv('scenario5_assignment_planner_audit_log.csv', state.auditLog);
  };

  const resetDraft = () => {
    setState(initialState);
    setSearch('');
    setMessage({ type: 'warning', text: 'تم مسح المسودة المحلية من المتصفح فقط.' });
  };

  return (
    <div className="assignment-planner">
      <div className="entity-toolbar">
        <div>
          <h1 className="page-heading">مخطط تكليف Scenario 5</h1>
          <p className="page-subtitle">مسودة محلية قابلة للتعديل بدون تطبيق تشغيلي.</p>
        </div>
        <button type="button" className="btn btn-secondary planner-disabled-apply" disabled>
          التطبيق غير منفذ / يتطلب موافقة
        </button>
      </div>

      <div className="planner-warning">مسودة تخطيط فقط — لا توجد تكليفات تشغيلية مطبقة. Planning draft only.</div>

      <section className="page-card">
        <h2>تحميل ملفات التخطيط</h2>
        <div className="planner-import-grid">
          <label>
            Rep Buckets المصحح
            <input
              className="input"
              type="file"
              accept=".csv"
              onChange={event => handleLoadBuckets(event.target.files?.[0])}
            />
          </label>
          <label>
            Customers By Rep
            <input
              className="input"
              type="file"
              accept=".csv"
              onChange={event => handleLoadCustomers(event.target.files?.[0])}
            />
          </label>
        </div>
        <p className="field-note">
          استخدم `scenario5_rep_bucket_planning_baseline_corrected.csv` و `scenario5_customers_by_rep_planning.csv`. البيانات تبقى في المتصفح ولا يتم إرسالها إلى قاعدة البيانات.
        </p>
      </section>

      {message && <div className={`notice notice--${message.type}`}>{message.text}</div>}

      <section className="page-card">
        <h2>التحقق العام</h2>
        <div className="planner-summary-grid">
          <div className="planner-kpi">
            <span>إجمالي الصفوف المحضرة</span>
            <strong>{validation.totalPreparedRows}</strong>
          </div>
          <div className="planner-kpi">
            <span>عملاء CRM قابلون للاستيراد</span>
            <strong>{validation.importableCrmCustomers}</strong>
          </div>
          <div className="planner-kpi">
            <span>صف Office مستبعد / مراجعة فقط</span>
            <strong>{validation.officeReviewOnlyRows}</strong>
          </div>
          <div className="planner-kpi">
            <span>صفوف المصدر المحملة</span>
            <strong>{validation.sourceCustomersLoaded}</strong>
          </div>
          <div className="planner-kpi">
            <span>عملاء معينون لمسودة</span>
            <strong>{validation.assignedSourceCount}</strong>
          </div>
          <div className="planner-kpi">
            <span>غير معين / مراجعة</span>
            <strong>{validation.unassignedCount}</strong>
          </div>
          <div className="planner-kpi">
            <span>طلبات أرشفة</span>
            <strong>{validation.archiveRequestCount}</strong>
          </div>
          <div className="planner-kpi">
            <span>أطباء HCP</span>
            <strong>{validation.hcpCount}</strong>
          </div>
          <div className="planner-kpi">
            <span>صيدليات HCO</span>
            <strong>{validation.hcoCount}</strong>
          </div>
          <div className="planner-kpi">
            <span>إجمالي التكرار الشهري</span>
            <strong>{validation.monthlyFrequencyTotal}</strong>
          </div>
        </div>
        <p className="field-note">
          حالة 3310 عميل CRM قابل للاستيراد: {validation.representedMatchesBaseline ? 'مطابقة أو مفسرة بالمسودة' : 'تحتاج مراجعة بسبب صفوف ناقصة أو غير مفسرة'}.
          {' '}صف Office الواحد مستبعد من عملاء CRM ويبقى review-only ضمن إجمالي 3311 صفاً محضراً.
          {' '}لا توجد حاجة لإحداثيات في هذه المرحلة.
        </p>
      </section>

      <section className="page-card">
        <h2>Rep 1-5</h2>
        <div className="planner-buckets">
          {bucketRows.map(bucket => (
            <button
              type="button"
              key={bucket.rep_bucket}
              className={`planner-bucket${activeBucket === bucket.rep_bucket ? ' is-active' : ''}`}
              onClick={() => setActiveBucket(bucket.rep_bucket)}
            >
              <h3>{state.labels[bucket.rep_bucket] || bucket.rep_bucket}</h3>
              <span className="planner-small">{bucket.rep_bucket}</span>
              <dl>
                <dt>العملاء</dt>
                <dd>{bucket.total_customers}</dd>
                <dt>الأطباء</dt>
                <dd>{bucket.doctor_count}</dd>
                <dt>الصيدليات</dt>
                <dd>{bucket.pharmacy_count}</dd>
                <dt>التكرار الشهري</dt>
                <dd>{bucket.estimated_monthly_frequency_total}</dd>
              </dl>
              <div className="planner-small">{bucket.included_route_groups || 'ارفع ملف Rep Buckets لعرض مجموعات المسارات.'}</div>
            </button>
          ))}
        </div>
        <label className="planner-label-input">
          اسم العرض للدلو المحدد
          <input
            className="input"
            value={state.labels[activeBucket] || activeBucket}
            onChange={event => renameBucket(activeBucket, event.target.value)}
          />
        </label>
      </section>

      <section className="page-card">
        <div className="entity-toolbar">
          <h2>عملاء {state.labels[activeBucket] || activeBucket}</h2>
          <input
            className="input entity-search"
            type="search"
            value={search}
            placeholder="بحث باسم العميل أو المنطقة أو الرقم"
            onChange={event => setSearch(event.target.value)}
          />
        </div>
        <div className="planner-table-wrap">
          <table className="planner-table">
            <thead>
              <tr>
                <th>العميل</th>
                <th>النوع</th>
                <th>المنطقة</th>
                <th>التكرار</th>
                <th>نقل إلى</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(customer => (
                <tr key={customer.planning_customer_id}>
                  <td>
                    <strong>{customer.name || customer.planning_customer_id}</strong>
                    <div className="planner-small">{customer.planning_customer_id}</div>
                  </td>
                  <td>{customerTypeLabels[customer.customer_type] || customer.customer_type}</td>
                  <td>{customer.area_tag_planning || '-'}</td>
                  <td>{customer.monthly_frequency_target}</td>
                  <td>
                    <select
                      className="input"
                      value={customer.draft_rep_bucket}
                      onChange={event => moveCustomer(customer, event.target.value)}
                    >
                      {DRAFT_REP_BUCKETS.map(bucket => (
                        <option key={bucket} value={bucket}>
                          {state.labels[bucket] || bucket}
                        </option>
                      ))}
                      <option value="UNASSIGNED">غير معين / مراجعة</option>
                    </select>
                  </td>
                  <td>
                    <div className="planner-row-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => moveCustomer(customer, 'UNASSIGNED')}>
                        إزالة التكليف
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => requestArchive(customer)}>
                        طلب أرشفة
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredCustomers.length && (
                <tr>
                  <td colSpan={6} className="entity-empty">
                    لا توجد صفوف ظاهرة. ارفع ملف العملاء أو غيّر البحث.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="field-note">يتم عرض أول {PAGE_SIZE} صف مطابق فقط للحفاظ على أداء الصفحة.</p>
      </section>

      <section className="page-card">
        <h2>إضافة عميل موجود</h2>
        <div className="planner-actions">
          <input
            className="input"
            value={selectedExistingId}
            onChange={event => setSelectedExistingId(event.target.value)}
            placeholder="planning_customer_id أو source_customer_id"
          />
          <select className="input" value={selectedExistingBucket} onChange={event => setSelectedExistingBucket(event.target.value)}>
            {DRAFT_REP_BUCKETS.map(bucket => (
              <option key={bucket} value={bucket}>
                {state.labels[bucket] || bucket}
              </option>
            ))}
          </select>
          <input
            className="input"
            value={reason}
            onChange={event => setReason(event.target.value)}
            placeholder="سبب التعديل / ملاحظة"
          />
          <button type="button" className="btn btn-primary" onClick={handleAddExisting}>
            إضافة للمسودة
          </button>
        </div>
        <p className="field-note">العملاء غير المعينين حالياً: {unassignedCustomers.length}. لا يتم إنشاء عميل جديد من هذا النموذج.</p>
      </section>

      <section className="page-card">
        <h2>إضافة عميل جديد كمسودة</h2>
        <form className="planner-form-grid" onSubmit={handleAddNewCustomer}>
          <label>
            النوع
            <select
              className="input"
              value={newCustomer.customer_type}
              onChange={event => setNewCustomer(prev => ({ ...prev, customer_type: event.target.value }))}
            >
              <option value="Doctor/HCP">طبيب / HCP</option>
              <option value="Pharmacy/HCO">صيدلية / HCO</option>
            </select>
          </label>
          <label>
            الاسم
            <input className="input" value={newCustomer.name} onChange={event => setNewCustomer(prev => ({ ...prev, name: event.target.value }))} />
          </label>
          <label>
            المنطقة
            <input
              className="input"
              value={newCustomer.area_tag_planning}
              onChange={event => setNewCustomer(prev => ({ ...prev, area_tag_planning: event.target.value }))}
            />
          </label>
          <label>
            هدف الزيارات الشهري
            <input
              className="input"
              type="number"
              min="1"
              value={newCustomer.monthly_frequency_target}
              onChange={event => setNewCustomer(prev => ({ ...prev, monthly_frequency_target: event.target.value }))}
            />
          </label>
          <label>
            التخصص
            <input className="input" value={newCustomer.specialty} onChange={event => setNewCustomer(prev => ({ ...prev, specialty: event.target.value }))} />
          </label>
          <label>
            التصنيف
            <input
              className="input"
              value={newCustomer.classification}
              onChange={event => setNewCustomer(prev => ({ ...prev, classification: event.target.value }))}
            />
          </label>
          <label>
            الأولوية
            <input className="input" value={newCustomer.priority} onChange={event => setNewCustomer(prev => ({ ...prev, priority: event.target.value }))} />
          </label>
          <label>
            المدينة
            <input className="input" value={newCustomer.city} onChange={event => setNewCustomer(prev => ({ ...prev, city: event.target.value }))} />
          </label>
          <label>
            ملاحظات
            <input className="input" value={newCustomer.notes} onChange={event => setNewCustomer(prev => ({ ...prev, notes: event.target.value }))} />
          </label>
          <button type="submit" className="btn btn-primary">
            إضافة كمسودة pending_review
          </button>
        </form>
        <p className="field-note">حقول GPS غير موجودة هنا وتبقى فارغة حتى تشغيل geocoding موثوق في مسار منفصل وموافق عليه.</p>
      </section>

      <section className="page-card">
        <h2>التصدير وسجل التدقيق</h2>
        <div className="planner-actions">
          <button type="button" className="btn btn-secondary" onClick={exportDraft} disabled={!state.customers.length}>
            تصدير مسودة العملاء
          </button>
          <button type="button" className="btn btn-secondary" onClick={exportBuckets}>
            تصدير ملخص الدلاء
          </button>
          <button type="button" className="btn btn-secondary" onClick={exportAudit} disabled={!state.auditLog.length}>
            تصدير سجل التدقيق
          </button>
          <button type="button" className="btn btn-secondary" onClick={resetDraft}>
            مسح المسودة المحلية
          </button>
        </div>
        <div className="planner-audit-list">
          {state.auditLog.slice(0, 20).map(entry => (
            <div key={entry.audit_id} className="planner-audit-row">
              <strong>{entry.change_type}</strong>
              <div className="planner-small">
                {entry.planning_customer_id} | {entry.previous_bucket || '-'} إلى {entry.next_bucket || '-'} | {entry.changed_at}
              </div>
              <div>{entry.notes}</div>
            </div>
          ))}
          {!state.auditLog.length && <div className="entity-empty">لا يوجد سجل تدقيق بعد.</div>}
        </div>
      </section>
    </div>
  );
};

export default AdminAssignmentPlannerPage;
