const NotAuthorized = ({ requiredRoles = [] }) => {
  const isAdminOnly = requiredRoles.length === 1 && requiredRoles[0] === 'admin';

  return (
    <div className="page" data-testid="not-authorized" data-rbac-result="expected-forbidden">
      <div className="card" data-rbac-policy={isAdminOnly ? 'ADMIN_ONLY' : 'ROLE_RESTRICTED'}>
        <h1 className="page-heading">غير مصرح</h1>
        <p>{isAdminOnly ? 'هذه الصفحة مخصصة لمدير النظام فقط.' : 'ليس لديك صلاحية للوصول إلى هذه الصفحة.'}</p>
        <p>يرجى التواصل مع مدير النظام إذا كان هذا خطأ.</p>
      </div>
    </div>
  );
};

export default NotAuthorized;
