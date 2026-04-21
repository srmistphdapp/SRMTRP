import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../supabaseClient';
import { FaSearch, FaFilter, FaEye, FaPaperPlane } from 'react-icons/fa';
import { forwardScholarToRC } from '../../../../services/scholarService';

export default function TransferredScholars({ onModalStateChange }) {
  const [scholars, setScholars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ faculty: '', department: '', type: '' });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [viewingScholar, setViewingScholar] = useState(null);
  
  // Forward functionality states
  const [selectedScholars, setSelectedScholars] = useState([]);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingScholar, setForwardingScholar] = useState(null);
  const [showForwardAllModal, setShowForwardAllModal] = useState(false);
  const [messageType, setMessageType] = useState('');
  const [messageText, setMessageText] = useState('');

  // Track modal state
  useEffect(() => {
    const hasModal = showFilterModal || viewingScholar !== null || showForwardModal || showForwardAllModal;
    if (onModalStateChange) {
      onModalStateChange(hasModal);
    }
  }, [showFilterModal, viewingScholar, showForwardModal, showForwardAllModal, onModalStateChange]);

  // Fetch transferred scholars on mount
  useEffect(() => {
    fetchTransferredScholars();
  }, []);

  const fetchTransferredScholars = async () => {
    setLoading(true);
    try {
      // Fetch scholars where transfer_from is set — these are transferred scholars
      const { data, error } = await supabase
        .from('scholar_applications')
        .select('*')
        .not('transfer_from', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transferred scholars:', error);
      } else {
        setScholars(data || []);
      }
    } catch (err) {
      console.error('Exception fetching transferred scholars:', err);
    }
    setLoading(false);
  };

  // Filter scholars
  const filteredScholars = scholars.filter(scholar => {
    // Search filter
    if (search && search.trim()) {
      const searchTerm = search.toLowerCase();
      const matchesSearch = 
        scholar.registered_name?.toLowerCase().includes(searchTerm) ||
        scholar.application_no?.toLowerCase().includes(searchTerm);
      if (!matchesSearch) return false;
    }

    // Faculty filter
    if (filter.faculty && scholar.faculty !== filter.faculty) return false;

    // Department filter
    if (filter.department && scholar.department !== filter.department) return false;

    // Type filter
    if (filter.type && scholar.type !== filter.type) return false;

    return true;
  });

  const handleViewScholar = (scholar) => {
    setViewingScholar(scholar);
  };

  const closeViewModal = () => {
    setViewingScholar(null);
  };

  // Show message function
  const showMessage = (text, type = 'info') => {
    setMessageText(text);
    setMessageType(type);
    setTimeout(() => {
      setMessageText('');
      setMessageType('');
    }, 3000);
  };

  // Reload scholars after forwarding
  const loadScholars = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scholar_applications')
        .select('*')
        .not('transfer_from', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transferred scholars:', error);
      } else {
        setScholars(data || []);
      }
    } catch (err) {
      console.error('Exception fetching transferred scholars:', err);
    }
    setLoading(false);
  };

  // Handle forward scholar - with confirmation (matching Upload Scholars logic)
  const handleForward = (scholar) => {
    // Check if already forwarded
    if (scholar.status && scholar.status.toLowerCase().includes('forwarded')) {
      showMessage('This scholar has already been forwarded to coordinator.', 'error');
      return;
    }

    setForwardingScholar(scholar);
    setShowForwardModal(true);
  };

  // Confirm forward scholar (using forwardScholarToRC service)
  const confirmForward = async () => {
    if (forwardingScholar) {
      try {
        const { data, error } = await forwardScholarToRC(forwardingScholar.id);
        if (error) {
          console.error('Error forwarding scholar:', error);
          showMessage('Error forwarding scholar', 'error');
          return;
        }
        showMessage(`${forwardingScholar.registered_name} has been forwarded to coordinator successfully!`, 'success');
        await loadScholars();
        setShowForwardModal(false);
        setForwardingScholar(null);
      } catch (err) {
        console.error('Exception forwarding scholar:', err);
        showMessage('Failed to forward scholar', 'error');
      }
    }
  };

  // Cancel forward
  const cancelForward = () => {
    setShowForwardModal(false);
    setForwardingScholar(null);
  };

  // Handle forward all selected scholars (matching Upload Scholars logic)
  const handleForwardAll = () => {
    if (selectedScholars.length === 0) {
      showMessage('Please select scholars to forward', 'info');
      return;
    }

    const selectedScholarsData = scholars.filter(s => selectedScholars.includes(s.id));

    // Check if any selected scholar has already been forwarded
    const alreadyForwarded = selectedScholarsData.some(s => s.status && s.status.toLowerCase().includes('forwarded'));
    if (alreadyForwarded) {
      showMessage('Some selected scholars have already been forwarded. Please deselect them.', 'error');
      return;
    }

    setShowForwardAllModal(true);
  };

  // Confirm forward all selected scholars (using forwardScholarToRC service)
  const confirmForwardAll = async () => {
    try {
      const updates = selectedScholars.map(id => forwardScholarToRC(id));
      await Promise.all(updates);
      showMessage(`${selectedScholars.length} scholars forwarded successfully!`, 'success');
      setShowForwardAllModal(false);
      setSelectedScholars([]);
      await loadScholars();
    } catch (error) {
      console.error('Error forwarding scholars:', error);
      showMessage('Failed to forward scholars', 'error');
    }
  };

  // Cancel forward all
  const cancelForwardAll = () => {
    setShowForwardAllModal(false);
  };

  // Handle select scholar (prevent selecting already forwarded scholars)
  const handleSelectScholar = (scholarId) => {
    const scholar = scholars.find(s => s.id === scholarId);
    if (scholar?.status?.toLowerCase().includes('forwarded')) {
      showMessage('Cannot select forwarded scholars', 'info');
      return;
    }

    setSelectedScholars(prev => {
      if (prev.includes(scholarId)) {
        return prev.filter(id => id !== scholarId);
      } else {
        return [...prev, scholarId];
      }
    });
  };

  // Handle select all (only non-forwarded scholars)
  const handleSelectAll = () => {
    const selectableScholars = filteredScholars.filter(s => !s.status?.toLowerCase().includes('forwarded'));
    const selectableIds = selectableScholars.map(s => s.id);

    if (selectedScholars.length === selectableIds.length) {
      setSelectedScholars([]);
    } else {
      setSelectedScholars(selectableIds);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500">Loading transferred scholars...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Message Toast */}
      {messageText && (
        <div className={`fixed top-20 right-6 z-50 px-6 py-3 rounded-lg shadow-lg ${
          messageType === 'success' ? 'bg-green-500' :
          messageType === 'error' ? 'bg-red-500' :
          'bg-blue-500'
        } text-white font-medium`}>
          {messageText}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            Transferred Scholars
          </h3>
          <p className="text-gray-600 mt-1">Scholars who have been transferred between departments or faculties</p>
        </div>
        {selectedScholars.length > 0 && (
          <button
            onClick={handleForwardAll}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
          >
            <FaPaperPlane className="w-4 h-4" />
            Forward Selected ({selectedScholars.length})
          </button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-grow max-w-lg">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <FaSearch className={`${search && search.trim() ? 'text-blue-500' : 'text-gray-400'}`} />
            </span>
            <input
              type="text"
              placeholder="Search by name or application number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`pl-10 pr-10 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                search && search.trim() ? 'border-blue-300 bg-blue-50' : 'border-gray-300'
              }`}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
              >
                <span className="font-bold text-lg">&times;</span>
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilterModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FaFilter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Scholars Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedScholars.length === filteredScholars.length && filteredScholars.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Application No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transferred From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transferred To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredScholars.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    No transferred scholars found
                  </td>
                </tr>
              ) : (
                filteredScholars.map(scholar => {
                  const isForwarded = scholar.status?.toLowerCase().includes('forwarded');
                  const displayStatus = isForwarded ? scholar.status : 'Transferred';
                  return (
                  <tr key={scholar.id} className="hover:bg-gray-50" style={isForwarded ? { opacity: 0.6 } : {}}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedScholars.includes(scholar.id)}
                        onChange={() => handleSelectScholar(scholar.id)}
                        disabled={isForwarded}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        style={{ cursor: isForwarded ? 'not-allowed' : 'pointer' }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {scholar.application_no}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {scholar.registered_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {scholar.transfer_from || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {[scholar.institution, scholar.department].filter(Boolean).join(' | ') || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {scholar.type || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        isForwarded ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {displayStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                      <button
                        onClick={() => handleViewScholar(scholar)}
                        className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        <FaEye className="w-4 h-4" />
                        View
                      </button>
                      {!isForwarded && (
                        <button
                          onClick={() => handleForward(scholar)}
                          className="text-green-600 hover:text-green-800 font-medium flex items-center gap-1"
                        >
                          <FaPaperPlane className="w-4 h-4" />
                          Forward
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Scholar Modal */}
      {viewingScholar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">Scholar Details</h3>
              <button
                onClick={closeViewModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Application No</label>
                  <p className="text-gray-900">{viewingScholar.application_no}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-gray-900">{viewingScholar.registered_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Transferred From</label>
                  <p className="text-gray-900">{viewingScholar.transfer_from || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Transferred To</label>
                  <p className="text-gray-900">
                    {[viewingScholar.institution, viewingScholar.department].filter(Boolean).join(' | ') || '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Faculty</label>
                  <p className="text-gray-900">{viewingScholar.faculty || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Department</label>
                  <p className="text-gray-900">{viewingScholar.department || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <p className="text-gray-900">{viewingScholar.type || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-gray-900">{viewingScholar.status || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{viewingScholar.email || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Mobile</label>
                  <p className="text-gray-900">{viewingScholar.mobile_number || '-'}</p>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={closeViewModal}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Filter Scholars</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Faculty</label>
                <select
                  value={filter.faculty}
                  onChange={e => setFilter(prev => ({ ...prev, faculty: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">All Faculties</option>
                  <option value="Faculty of Engineering & Technology">Engineering & Technology</option>
                  <option value="Faculty of Science & Humanities">Science & Humanities</option>
                  <option value="Faculty of Management">Management</option>
                  <option value="Faculty of Medical & Health Science">Medical & Health Science</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filter.type}
                  onChange={e => setFilter(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">All Types</option>
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time Internal">Part Time Internal</option>
                  <option value="Part Time External">Part Time External</option>
                  <option value="Part Time External (Industry)">Part Time External (Industry)</option>
                </select>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setFilter({ faculty: '', department: '', type: '' });
                  setShowFilterModal(false);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forward Single Scholar Confirmation Modal */}
      {showForwardModal && forwardingScholar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Forward</h3>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <FaPaperPlane className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">Forward Scholar</h4>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to forward <strong>{forwardingScholar.registered_name}</strong> to the coordinator?
                  </p>
                </div>
              </div>
              <p className="text-sm text-blue-600">This action will send the scholar to the next stage of the process.</p>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={cancelForward}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmForward}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
              >
                Forward
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forward All Confirmation Modal */}
      {showForwardAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Forward All</h3>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <FaPaperPlane className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">Forward All Selected Scholars</h4>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to forward <strong>{selectedScholars.length}</strong> selected scholar(s) to coordinators?
                  </p>
                </div>
              </div>
              <p className="text-sm text-blue-600">This action will send all selected scholars to the next stage of the process.</p>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={cancelForwardAll}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmForwardAll}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
              >
                Forward All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
