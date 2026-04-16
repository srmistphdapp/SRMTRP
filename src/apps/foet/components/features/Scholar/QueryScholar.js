import React, { useState } from 'react';
import { SlidersHorizontal, Download, Eye, X, Check } from 'lucide-react';
import { useAppContext } from '../../../App';
import { supabase } from '../../../../../supabaseClient';
import { useScholarTable } from '../../../hooks/useScholarTable';
import DataTable from '../../common/DataTable/DataTable';

const QueryScholar = () => {
  const {
    queryScholarsData,
    scholarSortOrder,
    setScholarSortOrder,
    showMessageBox,
    coordinatorInfo,
    refreshScholarsData,
    assignedFaculty
  } = useAppContext();

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedScholar, setSelectedScholar] = useState(null);
  const [confirmAgreed, setConfirmAgreed] = useState(false);

  // Status logic specific to QueryScholar
  const getScholarStatus = (s) => {
    if (!s) return 'Pending';
    if (s.query_resolved === 'Query Resolved' || s.dept_review === 'Query Resolved') return 'Resolved';
    return 'Pending';
  };

  const {
    searchTerm,
    setSearchTerm,
    filteredScholars,
    selectedScholarIds,
    setSelectedScholarIds,
    tempFilters,
    setTempFilters,
    handleApplyFilters,
    handleClearFilters,
    handleSelectAll,
    handleSelectOne,
    downloadExcel
  } = useScholarTable({
    data: queryScholarsData,
    getScholarStatus,
    initialFilters: { status: 'All Status' }
  });

  const columns = [
    { key: 'registered_name', label: 'Registered Name', sortable: true },
    { key: 'application_no', label: 'Application No', sortable: true },
    { key: 'faculty', label: 'Institution' },
    { key: 'department', label: 'Department', render: (s) => s.department || '-' },
    { key: 'mobile_number', label: 'Mobile' },
    { key: 'email', label: 'Email' },
    { 
      key: 'admin_review', 
      label: 'Admin Review',
      render: (s) => (
        <span className={`department-review-badge ${(s.query_resolved || s.dept_review || '').toLowerCase().replace(' ', '-')}`}>
          {s.query_resolved || s.dept_review || 'Pending'}
        </span>
      )
    },
    { 
      key: 'computedStatus', 
      label: 'Status',
      render: (s) => <span className={`status-badge ${s.computedStatus.toLowerCase()}`}>{s.computedStatus}</span>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (s) => (
        <button onClick={() => { setSelectedScholar(s); setShowViewModal(true); }} className="table-action-btn view-btn">
          <Eye size={16} />
        </button>
      )
    }
  ];

  const handleResolveAction = async () => {
    if (selectedScholarIds.length === 0) {
      showMessageBox('Please select scholars to resolve.', 'warning');
      return;
    }
    setShowConfirmModal(true);
  };

  const performResolve = async () => {
    try {
      const { error } = await supabase
        .from('scholar_applications')
        .update({ query_resolved: 'Query Resolved', dept_review: 'Query Resolved' })
        .in('id', selectedScholarIds);

      if (error) throw error;

      showMessageBox(`${selectedScholarIds.length} scholar(s) query resolved successfully!`, 'success');
      await refreshScholarsData();
      setShowConfirmModal(false);
      setConfirmAgreed(false);
      setSelectedScholarIds([]);
    } catch (err) {
      console.error(err);
      showMessageBox('Error resolving queries.', 'error');
    }
  };

  return (
    <div className="scholar-management-wrapper admin-forward-page query-scholar-page">
      <div className="scholar-header-section">
        <h1 className="scholar-page-title">Query Resolutions</h1>
        <div className="scholar-controls-section">
          <div className="scholar-search-container">
            <input
              type="text"
              placeholder="Search..."
              className="scholar-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="scholar-control-button" onClick={() => setScholarSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
            <SlidersHorizontal size={20} />
          </button>
          <button className="scholar-control-button" onClick={() => setShowFilterModal(true)}>
            <SlidersHorizontal size={20} />
          </button>
        </div>
      </div>

      <div className="scholar-action-buttons">
        <button onClick={handleResolveAction} className="action-btn forward-btn">
          <Check size={16} /> Resolve Query
        </button>
        <button onClick={() => downloadExcel('all', 'Query_Scholars')} className="action-btn download-btn-orange">
          <Download size={16} /> Download
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filteredScholars}
        selectedIds={selectedScholarIds}
        onSelectAll={handleSelectAll}
        onSelectOne={handleSelectOne}
        sortField="status"
        sortDirection={scholarSortOrder}
        onSort={() => setScholarSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
        stickyColumns={2}
      />

      {/* Modals omitted for brevity - same pattern as ScholarManagement */}
      {showFilterModal && (
        <div className="examination-modal-overlay">
          <div className="examination-modal">
            <div className="examination-modal-header">
              <h3>Filters</h3>
              <button onClick={() => setShowFilterModal(false)}>✕</button>
            </div>
            <div className="examination-modal-body">
              <div className="examination-filter-group">
                <label>Status</label>
                <select value={tempFilters.status} onChange={e => setTempFilters(p => ({ ...p, status: e.target.value }))} className="examination-filter-select">
                  <option value="All Status">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>
            <div className="examination-modal-footer">
              <button className="examination-btn" onClick={handleClearFilters}>Clear</button>
              <button className="examination-btn examination-btn-apply" onClick={() => { handleApplyFilters(); setShowFilterModal(false); }}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md w-full bg-white p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">Confirm Query Resolution</h3>
            <p className="mb-6">Resolve queries for {selectedScholarIds.length} selected scholar(s)? This will set their status to "Query Resolved".</p>
            <label className="flex items-center gap-2 mb-6">
              <input type="checkbox" checked={confirmAgreed} onChange={e => setConfirmAgreed(e.target.checked)} />
              <span>I confirm resolution verification.</span>
            </label>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={performResolve} disabled={!confirmAgreed} className={`px-4 py-2 rounded text-white ${confirmAgreed ? 'bg-green-600' : 'bg-gray-300'}`}>Confirm Resolve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryScholar;