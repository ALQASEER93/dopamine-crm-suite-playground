import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { exportCustomersCsv, importCustomersWorkbook } from '../api/adminCustomers';
import './EntityListPage.css';

const summaryLabels = [
  ['totalRows', 'صفوف الملف'],
  ['sourceRows', 'السجلات الصالحة'],
  ['doctors', 'الأطباء'],
  ['pharmacies', 'الصيدليات'],
  ['created', 'جديد'],
  ['updated', 'محدث'],
  ['unchanged', 'بدون تغيير'],
  ['requiresReview', 'بحاجة مراجعة موقع'],
  ['withTrustedCoordinates', 'إحداثيات موثوقة'],
  ['areaCount', 'مناطق'],
];

const skippedLabels = [
  ['missingName', 'بدون اسم'],
  ['missingCustomerType', 'بدون نوع عميل'],
  ['unsupportedCustomerType', 'نوع غير مدعوم'],
];

const resolveRoleSlug = user => {
  const rawRole = user?.role?.slug || user?.roleSlug || user?.role || '';
  if (typeof rawRole === 'string') return rawRole.toLowerCase();
  if (rawRole && typeof rawRole === 'object' && rawRole.slug) return String(rawRole.slug).toLowerCase();
  return '';
};

const AdminCustomerDataPage = () => {
  const { user } = useAuth();
  const roleSlug = useMemo(() => resolveRoleSlug(user), [user]);
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [busyAction, setBusyAction] = useState(null);
  const [message, setMessage] = useState(null);
  const hasDryRunPlan = Boolean(summary?.dryRun && file);

  if (roleSlug !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const runImport = async dryRun => {
    if (!file) {
      setMessage({ type: 'error', text: 'اختر ملف Excel أولاً.' });
      return;
    }
    if (!dryRun && !hasDryRunPlan) {
      setMessage({ type: 'error', text: 'نفّذ فحصاً بدون حفظ أولاً ثم راجع الملخص قبل الاستيراد.' });
      return;
    }

    setBusyAction(dryRun ? 'dryRun' : 'import');
    setMessage(null);
    try {
      const result = await importCustomersWorkbook({ file, dryRun });
      setSummary(result);
      setMessage({
        type: dryRun || result.routeFrequencyAlignment?.status !== 'pending_admin_review' ? 'warning' : 'success',
        text: dryRun
          ? 'اكتمل الفحص بدون حفظ. راجع الصفوف المرفوضة وحالة المسارات قبل التطبيق.'
          : 'تم حفظ العملاء وسجل التدقيق. تكليف المسارات والتكرار يحتاج مراجعة أدمن قبل الاعتماد الميداني.',
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'تعذر معالجة الملف.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleExport = async () => {
    setBusyAction('export');
    setMessage(null);
    try {
      const blob = await exportCustomersCsv();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'dpm-customers.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'تم تجهيز ملف التصدير.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'تعذر تصدير العملاء.' });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="entity-page">
      <div className="entity-toolbar">
        <div>
          <h1 className="page-heading">بيانات العملاء</h1>
        </div>
        <button type="button" className="btn btn-secondary" onClick={handleExport} disabled={busyAction === 'export'}>
          {busyAction === 'export' ? 'جاري التصدير...' : 'تصدير CSV'}
        </button>
      </div>

      <section className="page-card">
        <h2>استيراد ملف Excel</h2>
        <div className="settings-form">
          <label>
            ملف العملاء
            <input
              type="file"
              className="input"
              accept=".xlsx,.xlsm"
              onChange={event => {
                setFile(event.target.files?.[0] || null);
                setSummary(null);
                setMessage(null);
              }}
            />
          </label>
          <div className="entity-toolbar">
            <button type="button" className="btn btn-secondary" onClick={() => runImport(true)} disabled={Boolean(busyAction)}>
              {busyAction === 'dryRun' ? 'جاري الفحص...' : 'فحص بدون حفظ'}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => runImport(false)} disabled={Boolean(busyAction) || !hasDryRunPlan}>
              {busyAction === 'import' ? 'جاري الحفظ...' : 'استيراد وحفظ'}
            </button>
          </div>
          <p className="field-note">
            الحفظ متاح فقط بعد فحص dry-run. لا يتم إنشاء تكليفات مناديب أو مسارات تلقائياً من بيانات ناقصة.
          </p>
        </div>
      </section>

      <section className="page-card">
        <h2>مرحلة تكليف المسارات والتكرار</h2>
        <div className="detail-grid">
          <span>
            بعد حفظ العملاء، تبقى الصفوف في مراجعة الأدمن حتى يتم تحديد المندوب والمسار وهدف الزيارات الشهري بشكل صريح.
          </span>
          <span>
            لا يتم إنشاء حسابات المسار من بيانات ناقصة أو مندوب غير واضح. العميل لا يصبح جاهزاً في مسار اليوم إلا بعد تطبيق تكليف معتمد.
          </span>
        </div>
      </section>

      {message && (
        <div className={`notice notice--${message.type}`}>{message.text}</div>
      )}

      {summary && (
        <section className="page-card">
          <h2>{summary.dryRun ? 'نتيجة الفحص' : 'نتيجة الاستيراد'}</h2>
          <div className="summary-grid">
            {summaryLabels.map(([key, label]) => (
              <div className="summary-card" key={key}>
                <span>{label}</span>
                <strong>{summary[key] ?? 0}</strong>
              </div>
            ))}
          </div>
          {summary.monthlyFrequencyTargets && (
            <div className="detail-grid">
              <strong>أهداف الزيارات الشهرية</strong>
              <span>
                {Object.entries(summary.monthlyFrequencyTargets)
                  .map(([frequency, count]) => `${frequency}: ${count}`)
                  .join(' | ') || 'لا يوجد'}
              </span>
            </div>
          )}
          {summary.skipped && (
            <div className="detail-grid">
              <strong>الصفوف المستبعدة</strong>
              <span>
                {skippedLabels
                  .map(([key, label]) => `${label}: ${summary.skipped[key] ?? 0}`)
                  .join(' | ')}
              </span>
              {summary.unsupportedTypes && Object.keys(summary.unsupportedTypes).length > 0 && (
                <span>
                  الأنواع غير المدعومة: {Object.entries(summary.unsupportedTypes)
                    .map(([type, count]) => `${type}: ${count}`)
                    .join(' | ')}
                </span>
              )}
            </div>
          )}
          {summary.routeFrequencyAlignment && (
            <div className="detail-grid">
              <strong>حالة المسارات والتكرار</strong>
              <span>{summary.routeFrequencyAlignment.message}</span>
              <span>
                جاهز لمراجعة الأدمن: {summary.routeFrequencyAlignment.assignmentReadyForReview ?? 0}
                {' | '}
                بدون مصدر تكليف: {summary.routeFrequencyAlignment.assignmentMissingSource ?? 0}
                {' | '}
                تكليفات منشأة تلقائياً: {summary.routeFrequencyAlignment.routeAccountsCreated ?? 0}
              </span>
            </div>
          )}
          {summary.audit && (
            <div className="detail-grid">
              <strong>سجل التدقيق</strong>
              <span>
                الحالة: {summary.audit.status || '-'}
                {' | '}
                محفوظ: {summary.audit.persisted ? 'نعم' : 'لا'}
                {' | '}
                رقم التشغيل: {summary.audit.runId || '-'}
              </span>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default AdminCustomerDataPage;
