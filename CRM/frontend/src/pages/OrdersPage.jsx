const OrdersPage = () => {
  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">Orders</h1>
          <p className="page-subtitle">Track orders, customers, and totals across DPM.</p>
        </div>
        <button type="button" className="btn btn-primary" disabled>
          New order (coming soon)
        </button>
      </div>

      <div className="page-card">
        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
          Orders list, details, and creation flow will be connected to backend endpoints in the upcoming iteration.
        </p>
      </div>
    </div>
  );
};

export default OrdersPage;
