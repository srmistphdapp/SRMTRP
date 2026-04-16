import React, { useState } from 'react';
import { SlidersHorizontal, Download, Send, Eye, X } from 'lucide-react';
import { useAppContext } from '../../../App';
import { validateScholarForForwarding, constructFacultyStatus, constructForwardingStatus } from '../../../utils/departmentMapping';
import { updateScholarFacultyStatus } from '../../../services/supabaseService';
import { useScholarTable } from '../../../hooks/useScholarTable';
import DataTable from '../../common/DataTable/DataTable';
import AdminForwardPage from '../Admin/AdminForwardPage';
import './ScholarManagement.css';

const ScholarManagement = () => {
  const {
    scholarsData,
    setScholarsData,
    scholarSortOrder,
    setScholarSortOrder,
    showMessageBox,
    coordinatorInfo,
    refreshScholarsData
  } = useAppContext();

  const [showAdminForward, setShowAdminForward] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const [selectedScholar, setSelectedScholar] = useState(null);
  const [confirmAgreed, setConfirmAgreed] = useState(false);

  // Use our custom hook for table logic
  const {
    searchTerm,
    setSearchTerm,
    filteredScholars,
    selectedScholarIds,
    setSelectedScholarIds,
    tempFilters,
    setTempFilters,
    activeFilters,
    handleApplyFilters,
    handleClearFilters,
    handleSelectAll,
    handleSelectOne,
    downloadExcel
  } = useScholarTable({
    data: scholarsData,
    initialFilters: { status: 'All Status', department: 'All Departments' }
  });

  // Table column definitions
  const columns = [
    { key: 'registered_name', label: 'Registered Name', sortable: true },
    { key: 'application_no', label: 'Application No', sortable: true },
    { key: 'faculty', label: 'Institution' },
    { 
      key: 'program', 
      label: 'Program',
      render: (s) => s.program ? s.program.split('(')[0].trim() : '-'
    },
    { 
      key: 'type', 
      label: 'Type',
      render: (s) => {
        if (s.program_type) return s.program_type;
        const match = (s.program || '').match(/\(([^)]+)\)/);
        return match ? match[1] : '-';
      }
    },
    { key: 'mobile_number', label: 'Mobile' },
    { key: 'email', label: 'Email' },
    { 
      key: 'certificates', 
      label: 'Certificates',
      render: (s) => s.certificates ? (
        <a href={s.certificates} target="_blank" rel="noopener noreferrer" className="certificate-link">View Docs</a>
      ) : '-'
    },
    { 
      key: 'computedStatus', 
      label: 'Status',
      render: (s) => (
        <span className={`status-badge ${s.computedStatus.toLowerCase()}`}>
          {s.computedStatus}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (s) => (
        <button onClick={() => { setSelectedScholar(s); setShowViewModal(true); }} className="table-action-btn view-btn" title="View Details">
          <Eye size={16} />
        </button>
      )
    }
  ];

  // Unique filter options for the modal
  const getUniqueDepartments = () => {
    const depts = new Set(['All Departments']);
    scholarsData.forEach(s => {
      const dept = (s.program || '').split('(')[0].trim();
      if (dept) depts.add(dept);
    });
    return Array.from(depts).sort();
  };

  // Forwarding Logic
  const handleForwardAction = async () => {
    if (selectedScholarIds.length === 0) {
      showMessageBox('Please select scholars to forward.', 'warning');
      return;
    }

    const selectedScholars = filteredScholars.filter(s => selectedScholarIds.includes(s.id));
    const alreadyForwarded = selectedScholars.some(s => s.computedStatus === 'Forwarded');

    if (alreadyForwarded) {
      showMessageBox('One or more selected scholars are already forwarded.', 'warning');
      return;
    }

    // Validation
    const invalid = selectedScholars.filter(s => !validateScholarForForwarding(s).canForward);
    if (invalid.length > 0) {
      showMessageBox(`Unable to forward ${invalid.length} scholars. Please check their details.`, 'error');
      return;
    }

    setShowConfirmModal(true);
  };

  const performForwarding = async () => {
    try {
      const selectedScholars = filteredScholars.filter(s => selectedScholarIds.includes(s.id));
      
      const updatePromises = selectedScholars.map(scholar => {
        const validation = validateScholarForForwarding(scholar);
        const facultyStatus = constructFacultyStatus(scholar.department, scholar.institution || '');
        const forwardingStatus = constructForwardingStatus(scholar.institution || '');
        return updateScholarFacultyStatus(scholar.id, facultyStatus, forwardingStatus);
      });

      await Promise.all(updatePromises);
      showMessageBox(`${selectedScholars.length} scholar(s) successfully forwarded!`, 'success');
      
      await refreshScholarsData();
      setSelectedScholarIds([]);
      setShowConfirmModal(false);
      setConfirmAgreed(false);
    } catch (err) {
      console.error('Forwarding error:', err);
      showMessageBox('An error occurred during forwarding.', 'error');
    }
  };

  if (showAdminForward) {
    return (
      <AdminForwardPage
        onBackToDepartment={() => setShowAdminForward(false)}
        activeToggle="admin"
        onToggleChange={(t) => t === 'department' && setShowAdminForward(false)}
      />
    );
  }

  return (
    <div className="scholar-management-wrapper">
      <div className="scholar-header-section">
        <h1 className="scholar-page-title">Scholar Administration</h1>
        <div className="scholar-controls-section">
          <div className="scholar-search-container">
            <input
              type="text"
              placeholder="Search scholars..."
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
        <button onClick={handleForwardAction} className="action-btn forward-btn">
          <Send size={16} /> Forward
        </button>
        <button onClick={() => setShowDownloadModal(true)} className="action-btn download-btn-orange">
          <Download size={16} /> Download
        </button>
        <button onClick={() => setShowAdminForward(true)} className="action-btn admin-btn">
          Admin View
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

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="examination-modal-overlay">
          <div className="examination-modal">
            <div className="examination-modal-header">
              <h3>Filter Options</h3>
              <button className="examination-modal-close" onClick={() => setShowFilterModal(false)}>✕</button>
            </div>
            <div className="examination-modal-body">
              <div className="examination-filter-group">
                <label>Department</label>
                <select value={tempFilters.department} onChange={e => setTempFilters(p => ({ ...p, department: e.target.value }))} className="examination-filter-select">
                  {getUniqueDepartments().map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="examination-filter-group">
                <label>Status</label>
                <select value={tempFilters.status} onChange={e => setTempFilters(p => ({ ...p, status: e.target.value }))} className="examination-filter-select">
                  <option value="All Status">All Status</option>
                  <option value="Forwarded">Forwarded</option>
                  <option value="Pending">Pending</option>
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

      {/* Details View Modal - Simplified version */}
      {showViewModal && selectedScholar && (
        <div className="modal-overlay">
          <div className="bg-white w-full max-w-4xl p-6 rounded-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold">Scholar Details</h2>
              <button onClick={() => setShowViewModal(false)}><X size={24} /></button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {Object.entries(selectedScholar).map(([key, value]) => (
                typeof value !== 'object' && (
                  <div key={key}>
                    <label className="text-xs font-bold text-gray-500 uppercase">{key.replace(/_/g, ' ')}</label>
                    <p className="border p-2 rounded bg-gray-50 mt-1">{value?.toString() || '-'}</p>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md w-full bg-white p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">Confirm Forwarding</h3>
            <p className="mb-4">You are about to forward {selectedScholarIds.length} scholar(s) to their departments.</p>
            <label className="flex items-center gap-2 mb-6 cursor-pointer">
              <input type="checkbox" checked={confirmAgreed} onChange={e => setConfirmAgreed(e.target.checked)} />
              <span className="text-sm">I confirm these records are verified.</span>
            </label>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={performForwarding} disabled={!confirmAgreed} className={`px-4 py-2 rounded text-white ${confirmAgreed ? 'bg-blue-600' : 'bg-gray-300'}`}>
                Confirm Forward
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="modal-overlay">
          <div className="download-modal-content bg-white p-6 rounded-lg max-w-sm w-full">
             <h3 className="text-lg font-bold mb-4">Download Options</h3>
             <div className="flex flex-col gap-3">
               <button onClick={() => { downloadExcel('all'); setShowDownloadModal(false); }} className="p-3 border rounded hover:bg-gray-50 text-left">
                 Download All Filtered ({filteredScholars.length})
               </button>
               <button onClick={() => { downloadExcel('selected'); setShowDownloadModal(false); }} disabled={selectedScholarIds.length === 0} className="p-3 border rounded hover:bg-gray-50 text-left disabled:opacity-50">
                 Download Selected ({selectedScholarIds.length})
               </button>
               <button onClick={() => setShowDownloadModal(false)} className="mt-2 text-center text-gray-500">Cancel</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScholarManagement;