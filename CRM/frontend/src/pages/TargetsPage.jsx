const TargetsPage = () => {
  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">الأهداف</h1>
          <p className="page-subtitle">أهداف المبيعات والزيارات لكل مندوب أو منتج.</p>
        </div>
        <button type="button" className="btn btn-primary" disabled>
          هدف جديد (قريبًا)
        </button>
      </div>

      <div className="page-card">
        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
          سيتم تفعيل توزيع الأهداف ومتابعة التقدم عند اكتمال ربط واجهات الدومين.
        </p>
      </div>
    </div>
  );
};

export default TargetsPage;
