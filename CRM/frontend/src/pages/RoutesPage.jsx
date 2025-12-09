const RoutesPage = () => {
  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">Routes</h1>
          <p className="page-subtitle">خطط الزيارات اليومية ومتابعة التنفيذ.</p>
        </div>
      </div>

      <div className="page-card">
        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
          سيتم عرض مسارات المندوبين هنا مع مقارنة المخطط مقابل المنجز بعد ربط واجهة البرمجة.
        </p>
      </div>
    </div>
  );
};

export default RoutesPage;
