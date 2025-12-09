const CollectionsPage = () => {
  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">Collections</h1>
          <p className="page-subtitle">Track invoices, collected amounts, and balances.</p>
        </div>
        <button type="button" className="btn btn-primary" disabled>
          Record collection (coming soon)
        </button>
      </div>

      <div className="page-card">
        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
          Collections list and update workflows will be wired to backend endpoints in the next milestone.
        </p>
      </div>
    </div>
  );
};

export default CollectionsPage;
