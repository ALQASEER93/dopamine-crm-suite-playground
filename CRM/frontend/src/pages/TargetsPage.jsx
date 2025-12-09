const TargetsPage = () => {
  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">Targets</h1>
          <p className="page-subtitle">Sales and visit targets per rep/product.</p>
        </div>
        <button type="button" className="btn btn-primary" disabled>
          New target (coming soon)
        </button>
      </div>

      <div className="page-card">
        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
          Target assignments and progress tracking will be implemented once the domain APIs are integrated.
        </p>
      </div>
    </div>
  );
};

export default TargetsPage;
