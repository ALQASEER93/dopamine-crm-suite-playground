import { useAuth } from '../auth/AuthContext';

const SettingsPage = () => {
  const { user } = useAuth();
  const roleLabel = user?.role?.slug === 'sales_rep' ? 'مندوب مبيعات' : 'مدير مبيعات';

  const handlePlaceholderSubmit = event => {
    event.preventDefault();
    window.alert('تغيير كلمة المرور غير متاح حالياً.');
  };

  return (
    <div className="page-stack">
      <h1 className="page-heading">الإعدادات</h1>
      <section className="page-card">
        <h2>الملف الشخصي</h2>
        <p>الاسم: {user?.name}</p>
        <p>البريد: {user?.email}</p>
        <p>الدور: {roleLabel}</p>
      </section>
      <section className="page-card">
        <h2>تغيير كلمة المرور <small>(قيد التطوير)</small></h2>
        <p>سيتم ربط هذه الشاشة لاحقاً.</p>
        <form className="settings-form" onSubmit={handlePlaceholderSubmit}>
          <label>
            كلمة المرور الحالية
            <input type="password" className="input" disabled placeholder="غير متاح" />
          </label>
          <label>
            كلمة المرور الجديدة
            <input type="password" className="input" disabled placeholder="غير متاح" />
          </label>
          <button type="submit" className="btn btn-primary" disabled>
            تحديث كلمة المرور
          </button>
        </form>
      </section>
      <section className="page-card">
        <h2>تفضيلات الإشعارات</h2>
        <label className="settings-toggle">
          <input type="checkbox" disabled />
          تنبيهات بريدية للزيارات المتأخرة
        </label>
        <label className="settings-toggle">
          <input type="checkbox" disabled />
          ملخص أسبوعي
        </label>
      </section>
    </div>
  );
};

export default SettingsPage;
