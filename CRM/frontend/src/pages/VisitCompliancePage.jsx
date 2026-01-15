import { useState } from 'react';

const SAMPLE_ROWS = [
  { rep: 'محمود السيد', planned: 12, completed: 9, outOfRadius: 1 },
  { rep: 'سارة جمال', planned: 10, completed: 8, outOfRadius: 0 },
  { rep: 'أحمد شوقي', planned: 14, completed: 11, outOfRadius: 2 },
];

export default function VisitCompliancePage() {
  const [reason, setReason] = useState('');
  return (
    <div className="page">
      <div className="card">
        <div className="section-title">التزام الزيارات</div>
        <p className="muted">مقارنة الزيارات المخططة مقابل المنفذة مع تنبيهات الخروج عن النطاق.</p>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', marginTop: 12 }}>
            <thead>
              <tr>
                <th>المندوب</th>
                <th>المخطط</th>
                <th>المكتمل</th>
                <th>خارج النطاق</th>
                <th>الالتزام</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_ROWS.map(row => {
                const compliance = row.planned ? Math.round((row.completed / row.planned) * 100) : 0;
                return (
                  <tr key={row.rep}>
                    <td>{row.rep}</td>
                    <td>{row.planned}</td>
                    <td>{row.completed}</td>
                    <td>{row.outOfRadius}</td>
                    <td>{compliance}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="section-title">طلب استثناء</div>
        <p className="muted">استخدم النموذج لإرسال طلب موافقة عند وجود زيارة خارج النطاق.</p>
        <textarea
          rows="3"
          placeholder="سبب الطلب..."
          value={reason}
          onChange={e => setReason(e.target.value)}
          style={{ width: '100%', marginTop: 8 }}
        />
        <button type="button" className="btn btn-secondary" style={{ marginTop: 12 }} disabled={!reason}>
          إرسال الطلب
        </button>
      </div>
    </div>
  );
}
