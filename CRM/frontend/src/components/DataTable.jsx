import './DataTable.css';

const SortIcon = ({ active, direction }) => {
  if (!active) return <span className="datatable__sort">⇅</span>;
  return <span className="datatable__sort datatable__sort--active">{direction === 'asc' ? '↑' : '↓'}</span>;
};

const DataTable = ({
  columns,
  rows,
  loading,
  emptyMessage,
  onRowClick,
  getRowId,
  sort,
  onSort,
  quickSearch,
  filters,
  footer,
  skeletonRows = 6,
}) => {
  const hasFilters = columns.some(column => column.filter);
  const handleSort = column => {
    if (!column.sortable || !onSort) return;
    const nextDirection =
      sort?.key === column.key && sort?.direction === 'asc' ? 'desc' : 'asc';
    onSort({ key: column.key, direction: nextDirection });
  };

  const resolveRowId = row => {
    if (getRowId) return getRowId(row);
    return row.id ?? row.code ?? row.name;
  };

  return (
    <section className="datatable">
      {(quickSearch || filters) && (
        <div className="datatable__toolbar">
          {quickSearch && (
            <input
              type="search"
              className="input datatable__search"
              placeholder={quickSearch.placeholder}
              value={quickSearch.value}
              onChange={event => quickSearch.onChange(event.target.value)}
            />
          )}
          {filters && <div className="datatable__filters">{filters}</div>}
        </div>
      )}

      <div className="datatable__table-wrapper">
        <table>
          <thead>
            <tr>
              {columns.map(column => (
                <th
                  key={column.key}
                  className={column.sortable ? 'datatable__sortable' : ''}
                  onClick={() => handleSort(column)}
                >
                  <span>{column.header}</span>
                  {column.sortable && (
                    <SortIcon
                      active={sort?.key === column.key}
                      direction={sort?.direction}
                    />
                  )}
                </th>
              ))}
            </tr>
            {hasFilters && (
              <tr>
                {columns.map(column => (
                  <th key={`${column.key}-filter`}>{column.filter || null}</th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {loading && (
              [...Array(skeletonRows)].map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="datatable__skeleton-row">
                  {columns.map(column => (
                    <td key={`${column.key}-skeleton-${idx}`}>
                      <div className="datatable__skeleton" />
                    </td>
                  ))}
                </tr>
              ))
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="datatable__empty">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {!loading && rows.map(row => (
              <tr
                key={resolveRowId(row)}
                className={onRowClick ? 'datatable__row' : ''}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(column => (
                  <td key={`${resolveRowId(row)}-${column.key}`}>
                    {column.render ? column.render(row) : row[column.key] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer && <div className="datatable__footer">{footer}</div>}
    </section>
  );
};

export default DataTable;
