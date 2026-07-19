import { useState } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { normalizeRoleSlug, redactEmail, roleLabel as resolveRoleLabel } from './fieldRouteUtils';

const SettingsPage = () => {
  const { user } = useAuth();
  const normalizedRole = normalizeRoleSlug(user);
  const roleLabel = resolveRoleLabel(normalizedRole);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordStatus, setPasswordStatus] = useState({ type: '', text: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChange = event => {
    const { name, value } = event.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async event => {
    event.preventDefault();
    setPasswordStatus({ type: '', text: '' });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus({ type: 'error', text: 'تأكيد كلمة المرور الجديدة غير مطابق.' });
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiClient.post('/auth/me/password', {
        body: {
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
          confirm_password: passwordForm.confirmPassword,
        },
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordStatus({ type: 'success', text: 'تم تحديث كلمة المرور للمستخدم الحالي.' });
    } catch (error) {
      setPasswordStatus({ type: 'error', text: error.message || 'تعذر تحديث كلمة المرور.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="page-stack">
      <h1 className="page-heading">الإعدادات</h1>
      <section className="page-card">
        <h2>الملف الشخصي</h2>
        <p>الاسم: {user?.name}</p>
        <p>البريد الإلكتروني: {redactEmail(user?.email)}</p>
        <p>الدور: {roleLabel}</p>
      </section>
      <section className="page-card">
        <h2>تغيير كلمة المرور</h2>
        <p className="page-subtitle">يتطلب كلمة المرور الحالية ويحدث حساب المستخدم الحالي فقط.</p>
        {passwordStatus.text && (
          <div role="alert" className={`notice notice--${passwordStatus.type || 'info'}`}>
            {passwordStatus.text}
          </div>
        )}
        <form className="settings-form" onSubmit={handlePasswordSubmit}>
          <label>
            كلمة المرور الحالية
            <input
              type="password"
              name="currentPassword"
              className="input"
              autoComplete="current-password"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              required
            />
          </label>
          <label>
            كلمة المرور الجديدة
            <input
              type="password"
              name="newPassword"
              className="input"
              autoComplete="new-password"
              minLength={8}
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              required
            />
          </label>
          <label>
            تأكيد كلمة المرور الجديدة
            <input
              type="password"
              name="confirmPassword"
              className="input"
              autoComplete="new-password"
              minLength={8}
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={isChangingPassword}>
            {isChangingPassword ? 'جارٍ التحديث...' : 'تحديث كلمة المرور'}
          </button>
        </form>
      </section>
      <section className="page-card">
        <h2>تفضيلات الإشعارات</h2>
        <label className="settings-toggle">
          <input type="checkbox" disabled />
          تنبيهات البريد للزيارات المتأخرة
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
