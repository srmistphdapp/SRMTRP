import React, { useState, useEffect } from 'react';
import { useAppContext } from '../App';
import { SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import './WorkflowPage.css';

const WorkflowScholarAdministration = () => {
  const { scholarsData, isLoadingSupabase, assignedFaculty } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortField, setSortField] = useState('applicationNo');
  const [sortDirection, setSortDirection] = useState('asc');

  // Filter scholars based on faculty_forward status (forwarded to faculty)
  const workflowScholars = scholarsData.filter(scholar => {
    // Only show scholars that have been forwarded to this faculty
    return scholar.faculty_forward === assignedFaculty || scholar.faculty === assignedFaculty;
  });

  // Apply search and filters
  const filteredWorkflowData = workflowScholars.filter(scholar => {
    const matchesSearch =
      (scholar.registered_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (scholar.application_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (scholar.department || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment = departmentFilter === 'All Departments' || scholar.department === departmentFilter;
    const matchesStatus = statusFilter === 'All' || scholar.dept_review === statusFilter;

    return matchesSearch && matchesDepartment && matchesStatus;
  })
    .sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';

      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Inline Styles for Table
  const tableStyles = {
    container: {
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      overflowX: 'auto',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      margin: '1rem 0',
      marginBottom: '60px',
      width: '100%',
    },
    table: {
      width: '100%',
      minWidth: '1200px',
      borderCollapse: 'collapse',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    thead: {
      background: '#f8fafc',
      borderBottom: '2px solid #e2e8f0',
    },
    th: {
      textAlign: 'left',
      padding: '14px 16px',
      color: '#374151',
      fontWeight: '700',
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '0.3px',
      whiteSpace: 'nowrap',
    },
    row: {
      borderBottom: '1px solid #f1f5f9',
      transition: 'background-color 0.2s',
    },
    td: {
      padding: '12px 16px',
      verticalAlign: 'middle',
      fontSize: '13px',
      color: '#374151',
    },
    statusBadge: {
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '10px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      display: 'inline-block',
      whiteSpace: 'nowrap',
    },
    statusPending: {
      backgroundColor: '#fef3c7',
      color: '#92400e',
      border: '1px solid #fbbf24',
    },
    statusQuery: {
      backgroundColor: '#fed7aa',
      color: '#c2410c',
      border: '1px solid #fb923c',
    },
    statusApproved: {
      backgroundColor: '#d1fae5',
      color: '#065f46',
      border: '1px solid #6ee7b7',
    },
    statusRejected: {
      backgroundColor: '#fee2e2',
      color: '#991b1b',
      border: '1px solid #f87171',
    },
    timestamp: {
      fontFamily: "'Courier New', monospace",
      color: '#475569',
      fontSize: '12px',
      background: '#f8fafc',
      padding: '4px 8px',
      borderRadius: '4px',
      display: 'inline-block',
    }
  };

  const handleFilterClick = () => setShowFilterModal(true);
  const closeFilterModal = () => setShowFilterModal(false);
  const applyFilters = () => setShowFilterModal(false);
  const clearFilters = () => {
    setDepartmentFilter('All Departments');
    setStatusFilter('All');
    setSearchTerm('');
  };

  const getUniqueDepartments = () => {
    if (!workflowScholars || workflowScholars.length === 0) {
      return ['All Departments'];
    }
    const departments = workflowScholars
      .map(s => s.department)
      .filter(Boolean);
    return ['All Departments', ...new Set(departments)];
  };

  const handleSortClick = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  // Get status badge styling
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Pending':
        return { ...tableStyles.statusBadge, ...tableStyles.statusPending };
      case 'Query':
        return { ...tableStyles.statusBadge, ...tableStyles.statusQuery };
      case 'Approved':
        return { ...tableStyles.statusBadge, ...tableStyles.statusApproved };
      case 'Rejected':
        return { ...tableStyles.statusBadge, ...tableStyles.statusRejected };
      default:
        return { ...tableStyles.statusBadge, ...tableStyles.statusPending };
    }
  };

  return (
    <div className="workflow-subpage">
      <div className="workflow-container">
        <div className="workflow-header">
          <h2 className="workflow-subtitle">Scholar Administration Workflow</h2>
          <div className="workflow-header-actions">
            <div className="workflow-search-controls">
              <div className="workflow-search-wrapper">
                <input
                  type="text"
                  placeholder="Search workflow..."
                  className="workflow-search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button title={`Sort ${sortDirection === 'asc' ? 'Z-A' : 'A-Z'}`} className="workflow-control-btn" onClick={handleSortClick}>
                <ArrowUpDown className="w-5 h-5" />
              </button>
              <button title="Filter" className="workflow-control-btn" onClick={handleFilterClick}>
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {isLoadingSupabase ? (
          <div style={{ ...tableStyles.container, textAlign: 'center', padding: '48px' }}>
            <p style={{ color: '#64748b', fontSize: '14px' }}>Loading workflow data...</p>
          </div>
        ) : (
          <div style={tableStyles.container}>
            <table style={tableStyles.table}>
              <thead style={tableStyles.thead}>
                <tr>
                  <th style={tableStyles.th}>S.NO</th>
                  <th style={tableStyles.th}>APPLICATION NO.</th>
                  <th style={tableStyles.th}>NAME</th>
                  <th style={tableStyles.th}>DEPARTMENT</th>
                  <th style={tableStyles.th}>TYPE</th>
                  <th style={tableStyles.th}>DEPARTMENT STATUS</th>
                  <th style={tableStyles.th}>REJECTION REASON</th>
                  <th style={tableStyles.th}>DEPARTMENT TIMESTAMP</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkflowData.length > 0 ? (
                  filteredWorkflowData.map((scholar, index) => (
                    <tr key={scholar.id} style={tableStyles.row}>
                      <td style={tableStyles.td}>{index + 1}</td>
                      <td style={tableStyles.td}>{scholar.application_no || '-'}</td>
                      <td style={tableStyles.td}><strong>{scholar.registered_name || '-'}</strong></td>
                      <td style={tableStyles.td}>{scholar.department || '-'}</td>
                      <td style={tableStyles.td}>{scholar.type || scholar.program_type || '-'}</td>
                      <td style={tableStyles.td}>
                        <span style={getStatusBadgeStyle(scholar.dept_review || 'Pending')}>
                          {scholar.dept_review || 'Pending'}
                        </span>
                      </td>
                      <td style={tableStyles.td}>
                        <span style={{ fontStyle: 'italic', color: '#64748b' }}>
                          {scholar.reject_reason || '-'}
                        </span>
                      </td>
                      <td style={tableStyles.td}>
                        <span style={tableStyles.timestamp}>
                          {scholar.forwarded_at ? new Date(scholar.forwarded_at).toLocaleString() : '-'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ ...tableStyles.td, textAlign: 'center', padding: '48px', fontStyle: 'italic', color: '#64748b' }}>
                      No workflow data found for {assignedFaculty || 'this faculty'}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="workflow-modal-overlay">
          <div className="workflow-modal">
            <div className="workflow-modal-header">
              <h3>Filter Options</h3>
              <button className="workflow-modal-close" onClick={closeFilterModal}>✕</button>
            </div>
            <div className="workflow-modal-body">
              <div className="workflow-filter-group">
                <label>Department</label>
                <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="workflow-filter-select">
                  {getUniqueDepartments().map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="workflow-filter-group">
                <label>Department Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="workflow-filter-select">
                  <option value="All">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Query">Query</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div className="workflow-modal-footer">
              <button className="workflow-btn workflow-btn-clear" onClick={clearFilters}>Unapply Filters</button>
              <button className="workflow-btn workflow-btn-apply" onClick={applyFilters}>Apply Filters</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowScholarAdministration;
