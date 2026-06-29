import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const LoginScreen = () => {
  const navigate = useNavigate();
  const { login, sessionMessage } = useAuth();
  const [formState, setFormState] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = event => {
    const { name, value } = event.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setError(null);

    setIsSubmitting(true);
    try {
      await login({
        email: formState.email,
        password: formState.password,
      });
      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-screen" lang="ar" dir="rtl">
      <form className="login-card" onSubmit={handleSubmit}>
        <div>
          <h1>تسجيل الدخول إلى DOPAMINE CRM</h1>
          <p>منصة ميدانية عربية لإدارة زيارات الأطباء والصيدليات وخطة اليوم.</p>
        </div>

        {sessionMessage && !error && (
          <div role="status" className="login-card__error">
            {sessionMessage}
          </div>
        )}

        {error && (
          <div role="alert" className="login-card__error">
            {error}
          </div>
        )}

        <label>
          البريد الإلكتروني
          <input
            type="email"
            name="email"
            value={formState.email}
            onChange={handleChange}
            required
            autoComplete="username"
            placeholder="name@example.com"
          />
        </label>

        <label>
          كلمة المرور
          <input
            type="password"
            name="password"
            value={formState.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
            placeholder="أدخل كلمة المرور"
          />
        </label>

        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
        </button>
      </form>
    </div>
  );
};

export default LoginScreen;
