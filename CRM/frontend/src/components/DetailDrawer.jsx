import './DetailDrawer.css';

const DetailDrawer = ({ title, isOpen, onClose, children }) => {
  return (
    <div className={`drawer ${isOpen ? 'drawer--open' : ''}`}>
      <div className="drawer__backdrop" onClick={onClose} role="presentation" />
      <aside className="drawer__panel" role="dialog" aria-modal="true" aria-label={title}>
        <header className="drawer__header">
          <h2>{title}</h2>
          <button type="button" className="drawer__close" onClick={onClose} aria-label="إغلاق / Close">
            ✕
          </button>
        </header>
        <div className="drawer__body">{children}</div>
      </aside>
    </div>
  );
};

export default DetailDrawer;
