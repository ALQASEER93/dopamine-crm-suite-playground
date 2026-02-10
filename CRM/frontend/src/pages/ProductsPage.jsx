const ProductsPage = () => {
  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">المنتجات</h1>
          <p className="page-subtitle">إدارة كتالوج المنتجات والتسعير والهوامش.</p>
        </div>
        <button type="button" className="btn btn-primary" disabled>
          منتج جديد (قريبًا)
        </button>
      </div>

      <div className="page-card">
        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
          سيتم ربط قائمة المنتجات وتفاصيلها وعمليات الإدخال والتحديث مع واجهات الخلفية في الخطوة التالية.
        </p>
      </div>
    </div>
  );
};

export default ProductsPage;
