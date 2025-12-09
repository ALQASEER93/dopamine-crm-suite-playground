const ProductsPage = () => {
  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">Products</h1>
          <p className="page-subtitle">Manage product catalog, pricing, and margins.</p>
        </div>
        <button type="button" className="btn btn-primary" disabled>
          New product (coming soon)
        </button>
      </div>

      <div className="page-card">
        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
          Product list, detail, and CRUD workflows will be wired to the backend APIs in the next step.
        </p>
      </div>
    </div>
  );
};

export default ProductsPage;
