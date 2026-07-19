import PropTypes from 'prop-types';

const CARD_CONFIG = [
  { key: 'totalVisits', label: 'إجمالي الزيارات', emphasisColor: '#60a5fa' },
  { key: 'completedVisits', label: 'زيارات مكتملة', emphasisColor: '#34d399' },
  { key: 'inProgressVisits', label: 'قيد التنفيذ', emphasisColor: '#2dd4bf' },
  { key: 'scheduledVisits', label: 'زيارات مجدولة', emphasisColor: '#fbbf24' },
  { key: 'cancelledVisits', label: 'زيارات ملغاة', emphasisColor: '#fb7185' },
  {
    key: 'completionRate',
    label: 'نسبة الإكمال',
    emphasisColor: '#a78bfa',
    formatter: value => `${Number(value ?? 0).toFixed(1)}%`,
  },
  {
    key: 'avgDurationMinutes',
    label: 'متوسط المدة بالدقائق',
    emphasisColor: '#38bdf8',
    formatter: value => (value == null ? 'غير متاح' : `${Number(value).toFixed(1)} دقيقة`),
  },
];

const formatValue = (value, formatter) => {
  if (formatter) return formatter(value);
  if (value == null) return 'غير متاح';
  return value.toLocaleString('ar-JO');
};

const VisitsSummaryCards = ({ summary, isLoading, error }) => {
  if (error) {
    return (
      <div className="notice notice--error" style={{ marginBottom: '24px' }}>
        تعذر تحميل مؤشرات الزيارات: {error}
      </div>
    );
  }

  return (
    <section
      aria-label="مؤشرات ملخص الزيارات"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}
    >
      {CARD_CONFIG.map(card => {
        const value = summary ? summary[card.key] : undefined;
        const delta = summary?.[`${card.key}Delta`];
        const fallbackDelta = summary?.weekOverWeek?.[card.key];
        const deltaDisplay =
          typeof delta === 'number'
            ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}% أسبوعياً`
            : fallbackDelta;

        return (
          <article className="field-card" key={card.key}>
            <span className="field-muted" style={{ fontSize: '14px', fontWeight: 600 }}>
              {card.label}
            </span>
            <strong style={{ display: 'block', fontSize: '28px', color: card.emphasisColor, minHeight: '36px' }}>
              {isLoading ? '...' : formatValue(value, card.formatter)}
            </strong>
            <span className="field-muted" style={{ fontSize: '12px' }}>
              {isLoading ? 'جاري تحديث المؤشرات...' : deltaDisplay || 'التغير الأسبوعي غير متاح'}
            </span>
          </article>
        );
      })}
    </section>
  );
};

VisitsSummaryCards.propTypes = {
  summary: PropTypes.object,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
};

export default VisitsSummaryCards;
