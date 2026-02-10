const StockPage = () => {
  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">المخزون</h1>
          <p className="page-subtitle">متابعة المخزون حسب المنتج والموقع.</p>
        </div>
      </div>

      <div className="page-card">
        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
          ستظهر توافر المخزون والكميات المحجوزة والحركات هنا بعد تكامل واجهات البرمجة.
        </p>
      </div>
    </div>
  );
};

export default StockPage;
