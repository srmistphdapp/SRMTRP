import React, { useState, useEffect } from 'react';
import { useAppContext } from '../App';
import { SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import './WorkflowPage.css';

const WorkflowExamination = () => {
  const { examinationsData, isLoadingSupabase, assignedFaculty } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [programTypeFilter, setProgramTypeFilter] = useState('All Types');
  const [sortField, setSortField] = useState('applicationNo');
  const [sortDirection, setSortDirection] = useState('asc');

  // Filter examination data based on faculty
  const workflowExaminations = examinationsData.filter(exam => {
    return exam.faculty === assignedFaculty || exam.assigned_faculty === assignedFaculty;
  });

  // Apply search and filters
  const filteredExaminationData = workflowExaminations.filter(exam => {
    const matchesSearch =
      (exam.scholar_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exam.application_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exam.department || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment = departmentFilter === 'All Departments' || exam.department === departmentFilter;
    const matchesProgramType = programTypeFilter === 'All Types' || exam.program_type === programTypeFilter;

    return matchesSearch && matchesDepartment && matchesProgramType;
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
    statusScheduled: {
      backgroundColor: '#dbeafe',
      color: '#1e40af',
      border: '1px solid #bfdbfe',
    },
    statusCompleted: {
      backgroundColor: '#d1fae5',
      color: '#065f46',
      border: '1px solid #6ee7b7',
    },
    statusCancelled: {
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
    setProgramTypeFilter('All Types');
    setSearchTerm('');
  };

  const getUniqueDepartments = () => {
    if (!workflowExaminations || workflowExaminations.length === 0) {
      return ['All Departments'];
    }
    const departments = workflowExaminations
      .map(e => e.department)
      .filter(Boolean);
    return ['All Departments', ...new Set(departments)];
  };

  const getUniqueProgramTypes = () => {
    if (!workflowExaminations || workflowExaminations.length === 0) {
      return ['All Types'];
    }
    const types = workflowExaminations
      .map(e => e.program_type)
      .filter(Boolean);
    return ['All Types', ...new Set(types)];
  };

  const handleSortClick = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  // Get status badge styling
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Pending':
        return { ...tableStyles.statusBadge, ...tableStyles.statusPending };
      case 'Scheduled':
        return { ...tableStyles.statusBadge, ...tableStyles.statusScheduled };
      case 'Completed':
        return { ...tableStyles.statusBadge, ...tableStyles.statusCompleted };
      case 'Cancelled':
        return { ...tableStyles.statusBadge, ...tableStyles.statusCancelled };
      default:
        return { ...tableStyles.statusBadge, ...tableStyles.statusPending };
    }
  };

  return (
    <div className="workflow-subpage">
      <div className="workflow-container">
        <div className="workflow-header">
          <h2 className="workflow-subtitle">Examination Workflow</h2>
          <div className="workflow-header-actions">
            <div className="workflow-search-controls">
              <div className="workflow-search-wrapper">
                <input
                  type="text"
                  placeholder="Search examination workflow..."
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
            <p style={{ color: '#64748b', fontSize: '14px' }}>Loading examination workflow data...</p>
          </div>
        ) : (
          <div style={tableStyles.container}>
            <table style={tableStyles.table}>
              <thead style={tableStyles.thead}>
                <tr>
                  <th style={tableStyles.th}>S.NO</th>
                  <th style={tableStyles.th}>APPLICATION NO.</th>
                  <th style={tableStyles.th}>REGISTERED NAME</th>
                  <th style={tableStyles.th}>DEPARTMENT</th>
                  <th style={tableStyles.th}>TYPE</th>
                  <th style={tableStyles.th}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredExaminationData.length > 0 ? (
                  filteredExaminationData.map((exam, index) => (
                    <tr key={exam.id} style={tableStyles.row}>
                      <td style={tableStyles.td}>{index + 1}</td>
                      <td style={tableStyles.td}>{exam.application_no || '-'}</td>
                      <td style={tableStyles.td}><strong>{exam.scholar_name || '-'}</strong></td>
                      <td style={tableStyles.td}>{exam.department || '-'}</td>
                      <td style={tableStyles.td}>{exam.program_type || exam.type || '-'}</td>
                      <td style={tableStyles.td}>
                        <span style={getStatusBadgeStyle(exam.exam_status || 'Pending')}>
                          {exam.exam_status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ ...tableStyles.td, textAlign: 'center', padding: '48px', fontStyle: 'italic', color: '#64748b' }}>
                      No examination workflow data found for {assignedFaculty || 'this faculty'}.
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
                <label>Program Type</label>
                <select value={programTypeFilter} onChange={(e) => setProgramTypeFilter(e.target.value)} className="workflow-filter-select">
                  {getUniqueProgramTypes().map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
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

export default WorkflowExamination;
