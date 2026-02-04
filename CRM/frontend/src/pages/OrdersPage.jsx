const OrdersPage = () => {
  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">الطلبات</h1>
          <p className="page-subtitle">متابعة الطلبات والعملاء والإجماليات عبر DPM.</p>
        </div>
        <button type="button" className="btn btn-primary" disabled>
          طلب جديد (قريبًا)
        </button>
      </div>

      <div className="page-card">
        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
          سيتم ربط قائمة الطلبات وتفاصيلها ومسار الإنشاء مع واجهات الخلفية في الإصدار القادم.
        </p>
      </div>
    </div>
  );
};

export default OrdersPage;
