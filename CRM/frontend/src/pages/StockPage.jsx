const StockPage = () => {
  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">Stock</h1>
          <p className="page-subtitle">Monitor inventory by product and location.</p>
        </div>
      </div>

      <div className="page-card">
        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
          Stock availability, reserved quantities, and movements will be surfaced here once the API layer is wired.
        </p>
      </div>
    </div>
  );
};

export default StockPage;
