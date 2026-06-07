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
    formatter: value => (value == null ? 'غير متوفر' : `${Number(value).toFixed(1)} دقيقة`),
  },
];

const getDeltaForCard = (summary, key) => {
  const deltaKey = `${key}Delta`;
  if (summary && typeof summary[deltaKey] === 'number') {
    return summary[deltaKey];
  }
  return undefined;
};

const formatValue = (value, formatter) => {
  if (formatter) {
    return formatter(value);
  }
  if (value == null) {
    return 'غير متوفر';
  }
  return value.toLocaleString();
};

const VisitsSummaryCards = ({ summary, isLoading, error }) => {
  if (error) {
    return (
      <div
        style={{
          marginBottom: '24px',
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: '#fde8e8',
          color: '#b83232',
        }}
      >
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
        const delta = summary ? getDeltaForCard(summary, card.key) : undefined;
        const formatter = card.formatter;
        const displayValue = isLoading ? '...' : formatValue(value, formatter);
        const deltaDisplay =
          typeof delta === 'number'
            ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}% أسبوعياً`
            : summary?.weekOverWeek && typeof summary.weekOverWeek === 'object'
            ? summary.weekOverWeek[card.key]
            : undefined;

        return (
          <article
            key={card.key}
            style={{
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              padding: '16px',
              backgroundColor: 'var(--color-surface)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <span style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: 600 }}>{card.label}</span>
            <strong style={{ fontSize: '28px', color: card.emphasisColor, minHeight: '36px' }}>{displayValue}</strong>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
              {isLoading ? 'جاري تحديث المؤشرات...' : deltaDisplay || 'تغير أسبوعي قيد الاحتساب'}
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
