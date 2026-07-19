import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const getRoleSlug = user => {
  const rawRole = user?.role?.slug || user?.roleSlug || user?.role || '';
  if (typeof rawRole === 'string') return rawRole.toLowerCase();
  if (rawRole && typeof rawRole === 'object' && rawRole.slug) return String(rawRole.slug).toLowerCase();
  return '';
};

const MedicalEventsPage = () => {
  const { token, user } = useAuth();
  const roleSlug = useMemo(() => getRoleSlug(user), [user]);
  const canManageEvents = roleSlug === 'admin' || roleSlug === 'sales_manager';

  const [eventForm, setEventForm] = useState({
    title: '',
    event_type: 'conference',
    starts_at: '',
    ends_at: '',
    location: '',
    organizer: '',
  });
  const [attendeeForm, setAttendeeForm] = useState({
    event_id: '',
    kol_id: '',
    attendee_role: 'attendee',
  });
  const [notice, setNotice] = useState(null);

  const eventsQuery = useQuery({
    queryKey: ['medical-affairs', 'events'],
    queryFn: async () => {
      const { data } = await apiClient.get('/medical-affairs/events?page_size=200');
      return Array.isArray(data?.data) ? data.data : [];
    },
    enabled: !!token,
  });

  const kolsQuery = useQuery({
    queryKey: ['medical-affairs', 'kols', 'events'],
    queryFn: async () => {
      const { data } = await apiClient.get('/medical-affairs/kols?page_size=200');
      return Array.isArray(data?.data) ? data.data : [];
    },
    enabled: !!token,
  });

  const handleCreateEvent = async event => {
    event.preventDefault();
    setNotice(null);
    try {
      await apiClient.post('/medical-affairs/events', {
        body: {
          title: eventForm.title,
          event_type: eventForm.event_type,
          status: 'planned',
          starts_at: new Date(eventForm.starts_at).toISOString(),
          ends_at: new Date(eventForm.ends_at).toISOString(),
          location: eventForm.location || null,
          organizer: eventForm.organizer || null,
        },
      });
      setNotice({ type: 'success', text: 'تم إنشاء الفعالية.' });
      setEventForm({
        title: '',
        event_type: 'conference',
        starts_at: '',
        ends_at: '',
        location: '',
        organizer: '',
      });
      await eventsQuery.refetch();
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'تعذر إنشاء الفعالية.' });
    }
  };

  const handleAddAttendee = async event => {
    event.preventDefault();
    setNotice(null);
    try {
      await apiClient.post(`/medical-affairs/events/${attendeeForm.event_id}/attendees`, {
        body: {
          kol_id: Number(attendeeForm.kol_id),
          attendee_role: attendeeForm.attendee_role,
          attended: false,
        },
      });
      setNotice({ type: 'success', text: 'تمت إضافة الحضور.' });
      setAttendeeForm(prev => ({ ...prev, kol_id: '' }));
      await eventsQuery.refetch();
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'تعذر إضافة الحضور.' });
    }
  };

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-heading">تقويم الفعاليات الطبية</h1>
          <p className="page-subtitle">إدارة الفعاليات، المواعيد، والحضور.</p>
        </div>
      </div>

      {canManageEvents && (
        <section className="page-card">
          <h2 style={{ marginTop: 0 }}>فعالية جديدة</h2>
          <form
            onSubmit={handleCreateEvent}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}
          >
            <label>
              <span>عنوان الفعالية</span>
              <input
                className="input"
                value={eventForm.title}
                onChange={event => setEventForm(prev => ({ ...prev, title: event.target.value }))}
                required
              />
            </label>
            <label>
              <span>نوع الفعالية</span>
              <select
                className="input"
                value={eventForm.event_type}
                onChange={event => setEventForm(prev => ({ ...prev, event_type: event.target.value }))}
              >
                <option value="conference">مؤتمر</option>
                <option value="roundtable">طاولة مستديرة</option>
                <option value="webinar">ويبنار</option>
                <option value="cme">تعليم مستمر</option>
                <option value="internal">داخلي</option>
              </select>
            </label>
            <label>
              <span>يبدأ في</span>
              <input
                className="input"
                type="datetime-local"
                value={eventForm.starts_at}
                onChange={event => setEventForm(prev => ({ ...prev, starts_at: event.target.value }))}
                required
              />
            </label>
            <label>
              <span>ينتهي في</span>
              <input
                className="input"
                type="datetime-local"
                value={eventForm.ends_at}
                onChange={event => setEventForm(prev => ({ ...prev, ends_at: event.target.value }))}
                required
              />
            </label>
            <label>
              <span>الموقع</span>
              <input
                className="input"
                value={eventForm.location}
                onChange={event => setEventForm(prev => ({ ...prev, location: event.target.value }))}
              />
            </label>
            <label>
              <span>المنظم</span>
              <input
                className="input"
                value={eventForm.organizer}
                onChange={event => setEventForm(prev => ({ ...prev, organizer: event.target.value }))}
              />
            </label>
            <div style={{ alignSelf: 'end' }}>
              <button type="submit" className="btn btn-primary">
                إنشاء
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="page-card">
        <h2 style={{ marginTop: 0 }}>إضافة حضور KOL</h2>
        <form
          onSubmit={handleAddAttendee}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}
        >
          <label>
            <span>الفعالية</span>
            <select
              className="input"
              value={attendeeForm.event_id}
              onChange={event => setAttendeeForm(prev => ({ ...prev, event_id: event.target.value }))}
              required
            >
              <option value="">اختر الفعالية</option>
              {(eventsQuery.data || []).map(eventItem => (
                <option key={eventItem.id} value={eventItem.id}>
                  {eventItem.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>KOL</span>
            <select
              className="input"
              value={attendeeForm.kol_id}
              onChange={event => setAttendeeForm(prev => ({ ...prev, kol_id: event.target.value }))}
              required
            >
              <option value="">اختر KOL</option>
              {(kolsQuery.data || []).map(kol => (
                <option key={kol.id} value={kol.id}>
                  {kol.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>الدور</span>
            <select
              className="input"
              value={attendeeForm.attendee_role}
              onChange={event => setAttendeeForm(prev => ({ ...prev, attendee_role: event.target.value }))}
            >
              <option value="attendee">حضور</option>
              <option value="speaker">متحدث</option>
              <option value="moderator">مُيسّر</option>
            </select>
          </label>
          <div style={{ alignSelf: 'end' }}>
            <button type="submit" className="btn btn-secondary">
              إضافة
            </button>
          </div>
        </form>
      </section>

      {notice && (
        <section className="page-card">
          <p style={{ margin: 0, color: notice.type === 'error' ? 'var(--color-error-text)' : 'var(--color-text)' }}>{notice.text}</p>
        </section>
      )}

      <section className="page-card">
        <h2 style={{ marginTop: 0 }}>الفعاليات</h2>
        {eventsQuery.error && <div className="table-card__empty">تعذر تحميل الفعاليات: {eventsQuery.error.message}</div>}
        {eventsQuery.isLoading && !eventsQuery.error && <div className="table-card__empty">جاري تحميل الفعاليات...</div>}
        {!eventsQuery.isLoading && !eventsQuery.error && (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>العنوان</th>
                  <th>النوع</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th>الموقع</th>
                  <th>الحضور</th>
                </tr>
              </thead>
              <tbody>
                {(eventsQuery.data || []).length === 0 && (
                  <tr>
                    <td colSpan={6}>لا توجد فعاليات.</td>
                  </tr>
                )}
                {(eventsQuery.data || []).map(eventItem => (
                  <tr key={eventItem.id}>
                    <td>{eventItem.title}</td>
                    <td>{eventItem.event_type}</td>
                    <td>{eventItem.status}</td>
                    <td>{eventItem.starts_at ? new Date(eventItem.starts_at).toLocaleString('ar-JO') : '-'}</td>
                    <td>{eventItem.location || '-'}</td>
                    <td>{Array.isArray(eventItem.attendees) ? eventItem.attendees.length : 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default MedicalEventsPage;
