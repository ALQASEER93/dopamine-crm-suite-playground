import PropTypes from 'prop-types';

const CARD_CONFIG = [
  { key: 'totalVisits', label: '?????? ????????', emphasisColor: '#38bdf8' },
  { key: 'completedVisits', label: '?????? ??????', emphasisColor: '#34d399' },
  { key: 'inProgressVisits', label: '??? ???????', emphasisColor: '#22d3ee' },
  { key: 'scheduledVisits', label: '??????', emphasisColor: '#fbbf24' },
  { key: 'cancelledVisits', label: '?????', emphasisColor: '#f87171' },
  {
    key: 'completionRate',
    label: '???? ???????',
    emphasisColor: '#a78bfa',
    formatter: value => `${Number(value ?? 0).toFixed(1)}%`,
  },
  {
    key: 'avgDurationMinutes',
    label: '????? ??? ??????? (?????)',
    emphasisColor: '#38bdf8',
    formatter: value => (value == null ? '??? ????' : `${Number(value).toFixed(1)} ?????`),
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
    return '??? ????';
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
          borderRadius: '12px',
          backgroundColor: 'rgba(248, 113, 113, 0.2)',
          color: '#fecaca',
        }}
      >
        ???? ????? ???? ????????: {error}
      </div>
    );
  }

  return (
    <section
      aria-label="???? ????????"
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
            ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}% ?????? ???????? ??????`
            : summary?.weekOverWeek && typeof summary.weekOverWeek === 'object'
            ? summary.weekOverWeek[card.key]
            : undefined;

        return (
          <article
            key={card.key}
            style={{
              borderRadius: '14px',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              padding: '16px',
              backgroundColor: '#111827',
              boxShadow: '0 10px 24px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>{card.label}</span>
            <strong style={{ fontSize: '28px', color: card.emphasisColor, minHeight: '36px' }}>{displayValue}</strong>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>
              {isLoading ? '???? ????? ???????? ?????????...' : deltaDisplay || '?? ???? ?????? ??????? ?????'}
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
