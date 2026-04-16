import React from 'react';
import { ArrowUpDown, Eye, Download, Send, Check, X } from 'lucide-react';
import './DataTable.css';

/**
 * Generic Data Table component
 * 
 * @param {Object} props Component props
 * @param {Array} props.columns Column definitions { key, label, sortable, render }
 * @param {Array} props.data Data to display
 * @param {Array} props.selectedIds Array of selected item IDs
 * @param {Function} props.onSelectAll Handle select all change
 * @param {Function} props.onSelectOne Handle single row select change
 * @param {string} props.sortField Current field being sorted
 * @param {string} props.sortDirection 'asc' or 'desc'
 * @param {Function} props.onSort Handle sort click
 * @param {boolean} props.isLoading Loading state
 */
const DataTable = ({
  columns = [],
  data = [],
  selectedIds = [],
  onSelectAll,
  onSelectOne,
  sortField,
  sortDirection,
  onSort,
  isLoading = false,
  stickyColumns = 0
}) => {
  if (isLoading) {
    return (
      <div className="data-table-loading">
        <div className="loader"></div>
        <p>Loading data...</p>
      </div>
    );
  }

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th className="checkbox-col sticky-col" style={{ left: 0, zIndex: 20 }}>
              <input
                type="checkbox"
                onChange={(e) => onSelectAll(e.target.checked)}
                checked={data.length > 0 && selectedIds.length === data.length}
              />
            </th>
            <th className="sno-col sticky-col" style={{ left: '50px', zIndex: 20 }}>S.No</th>
            
            {columns.map((col, index) => {
              const isSticky = index < stickyColumns;
              // Simple sticky logic, could be improved with dynamic offset calculation
              const stickyStyle = isSticky ? { 
                position: 'sticky', 
                left: index === 0 ? '120px' : index === 1 ? '250px' : 'auto',
                zIndex: 20 
              } : {};

              return (
                <th 
                  key={col.key} 
                  className={`${col.className || ''} ${isSticky ? 'sticky-col' : ''}`}
                  style={stickyStyle}
                  onClick={() => col.sortable && onSort && onSort(col.key)}
                >
                  <div className="th-content">
                    {col.label}
                    {col.sortable && <ArrowUpDown size={14} className="sort-icon" />}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((item, index) => (
              <tr key={item.id || index} className={selectedIds.includes(item.id) ? 'row-selected' : ''}>
                <td className="checkbox-col sticky-col" style={{ left: 0 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={(e) => onSelectOne(e.target.checked, item.id)}
                  />
                </td>
                <td className="sno-col sticky-col" style={{ left: '50px' }}>{index + 1}</td>
                
                {columns.map((col, colIndex) => {
                  const isSticky = colIndex < stickyColumns;
                  const stickyStyle = isSticky ? { 
                    position: 'sticky', 
                    left: colIndex === 0 ? '120px' : colIndex === 1 ? '250px' : 'auto',
                  } : {};

                  return (
                    <td 
                      key={col.key} 
                      className={`${col.className || ''} ${isSticky ? 'sticky-col' : ''}`}
                      style={stickyStyle}
                    >
                      {col.render ? col.render(item) : (item[col.key] || '-')}
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length + 2} className="no-data">
                No records found matching your criteria.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;