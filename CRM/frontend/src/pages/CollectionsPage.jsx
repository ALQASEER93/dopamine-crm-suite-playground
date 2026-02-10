const CollectionsPage = () => {
  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">التحصيلات</h1>
          <p className="page-subtitle">متابعة الفواتير والمبالغ المحصلة والأرصدة.</p>
        </div>
        <button type="button" className="btn btn-primary" disabled>
          تسجيل تحصيل (قريبًا)
        </button>
      </div>

      <div className="page-card">
        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
          سيتم ربط قائمة التحصيلات ومسارات التحديث مع واجهات الخلفية في المرحلة القادمة.
        </p>
      </div>
    </div>
  );
};

export default CollectionsPage;
