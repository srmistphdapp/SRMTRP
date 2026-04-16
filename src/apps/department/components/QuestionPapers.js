import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Trash2, Maximize2, Upload, AlertCircle } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import questionPaperService from '../services/questionPaperService';

export default function QuestionPapers() {
  const { toggleFullScreen, currentUser, showMessage } = useAppContext();
  // State management
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  
  // Form states - simplified to only essential fields
  const [newPaper, setNewPaper] = useState({
    name: '',
    code: '',
    setALink: '',
    setBLink: '',
  });
  
  // File upload states
  const [uploadingFiles, setUploadingFiles] = useState(false);
  
  // Filter and search states
  const [search, setSearch] = useState('');
  const [filterUploader, setFilterUploader] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Confirmation modal state
  const [confirmPayload, setConfirmPayload] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  // Load question papers on component mount and when user changes
  useEffect(() => {
    if (currentUser?.department) {
      loadQuestionPapers();
    }
  }, [currentUser]);

  const loadQuestionPapers = async () => {
    if (!currentUser?.department) {
      setError('User department information not available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await questionPaperService.fetchQuestionPapersForDepartment(
        currentUser.department
      );

      if (fetchError) {
        setError(fetchError.message || 'Failed to load question papers');
        showMessage('Failed to load question papers', 'error');
      } else {
        setPapers(data || []);
      }
    } catch (err) {
      setError('Failed to load question papers');
      showMessage('Failed to load question papers', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Event handlers
  const handleOpenFilter = () => setFilterModalOpen(true);
  const handleCloseFilter = () => setFilterModalOpen(false);
  const handleApplyFilter = () => {
    setFilterModalOpen(false);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(order => order === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Validate Google Drive link format
  const validateDriveLink = (link) => {
    if (!link) return false;
    
    // Check for Google Drive patterns
    const drivePatterns = [
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
      /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
    ];
    
    return drivePatterns.some(pattern => pattern.test(link));
  };

  // Handle drive link input
  const handleLinkChange = (setType, link) => {
    if (setType === 'A') {
      setNewPaper(p => ({ ...p, setALink: link }));
    } else {
      setNewPaper(p => ({ ...p, setBLink: link }));
    }
  };

  // Handle form submission with drive links
  const handleAddPaper = async (e) => {
    e.preventDefault();
    
    // Validate user information
    if (!currentUser) {
      showMessage('User information not available', 'error');
      return;
    }

    if (!newPaper.name || !newPaper.code) {
      showMessage('Subject name and code are required', 'error');
      return;
    }

    // Validate that BOTH Set A and Set B links are provided
    if (!newPaper.setALink || !newPaper.setBLink) {
      showMessage('Both Set A and Set B Google Drive links are required', 'error');
      return;
    }

    // Validate drive link formats
    if (!validateDriveLink(newPaper.setALink)) {
      showMessage('Please provide a valid Google Drive link for Set A', 'error');
      return;
    }

    if (!validateDriveLink(newPaper.setBLink)) {
      showMessage('Please provide a valid Google Drive link for Set B', 'error');
      return;
    }

    try {
      setUploadingFiles(true);
      
      // Prepare paper data for database insertion
      const paperData = {
        name: newPaper.name,
        code: newPaper.code,
        sets: [
          {
            set: 'A',
            file: `Set A`,
            driveLink: newPaper.setALink
          },
          {
            set: 'B', 
            file: `Set B`,
            driveLink: newPaper.setBLink
          }
        ]
      };
      
      // Create question paper record
      const { data, error } = await questionPaperService.createQuestionPaper(paperData, currentUser);
      
      if (error) {
        showMessage(error.message || 'Failed to create question paper', 'error');
        return;
      }

      showMessage('Question paper created successfully!', 'success');
      
      // Close modal and reset form
      setAddModalOpen(false);
      setNewPaper({
        name: '',
        code: '',
        setALink: '',
        setBLink: '',
      });
      
      // Reload papers
      await loadQuestionPapers();
      
    } catch (err) {
      showMessage(`Failed to create question paper: ${err.message}`, 'error');
      
    } finally {
      setUploadingFiles(false);
      setLoading(false);
    }
  };

  // Handle deletion confirmation
  const handleConfirm = async (confirmed) => {
    if (!confirmed) {
      setConfirmOpen(false);
      setConfirmPayload(null);
      setConfirmMessage('');
      return;
    }

    if (!confirmPayload) return;

    try {
      setLoading(true);
      
      const { paperId, setName } = confirmPayload;
      
      if (setName) {
        // Delete specific set
        const { data, error } = await questionPaperService.deleteQuestionPaperSet(paperId, setName, currentUser);
        
        if (error) {
          showMessage(error.message || 'Failed to delete set', 'error');
          return;
        }
        
        // Check if entire row was deleted
        if (data?.deletedEntireRow) {
          showMessage(`Set ${setName} deleted. Since both sets were empty, the entire question paper was removed.`, 'success');
        } else {
          showMessage(`Set ${setName} deleted successfully!`, 'success');
        }
      } else {
        // Delete entire paper
        const { error } = await questionPaperService.deleteQuestionPaper(paperId, currentUser);
        
        if (error) {
          showMessage(error.message || 'Failed to delete question paper', 'error');
          return;
        }
        
        showMessage('Question paper deleted successfully!', 'success');
      }
      
      // Reload papers
      await loadQuestionPapers();
    } catch (err) {
      showMessage('Failed to delete', 'error');
    } finally {
      setLoading(false);
      setConfirmOpen(false);
      setConfirmPayload(null);
      setConfirmMessage('');
    }
  };

  // Filter and sort papers
  const filtered = papers.filter(p =>
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())) &&
    (filterUploader === '' || p.uploadedBy.toLowerCase().includes(filterUploader.toLowerCase())) &&
    (filterDate === '' || new Date(p.uploadedOn).toLocaleDateString() === filterDate)
  );
  
  const sortedFiltered = [...filtered].sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Determine which set columns should be shown
  const hasSetA = papers.some(p => Array.isArray(p.sets) && p.sets.some(s => s && String(s.set).toUpperCase() === 'A'));
  const hasSetB = papers.some(p => Array.isArray(p.sets) && p.sets.some(s => s && String(s.set).toUpperCase() === 'B'));
  const totalColumns = 5 + (hasSetA ? 1 : 0) + (hasSetB ? 1 : 0);

  // Show loading state
  if (loading && papers.length === 0) {
    return (
      <div id="panel-questionpapers" className="panel-fullscreen w-full flex justify-center">
        <div className="w-full max-w-5xl">
          <h1 className="text-3xl font-bold leading-tight mb-2">Question Papers</h1>
          <div className="mb-4 text-gray-600">Loading question papers...</div>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && papers.length === 0) {
    return (
      <div id="panel-questionpapers" className="panel-fullscreen w-full flex justify-center">
        <div className="w-full max-w-5xl">
          <h1 className="text-3xl font-bold leading-tight mb-2">Question Papers</h1>
          <div className="mb-4 text-gray-600">View and download question papers uploaded by evaluators.</div>
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <button 
                onClick={loadQuestionPapers}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="panel-questionpapers" className="panel-fullscreen w-full flex justify-center">
      <div className="w-full max-w-5xl">
        <h1 className="text-3xl font-bold leading-tight mb-2">Question Papers</h1>
        <div className="mb-4 text-gray-600">
          View and download question papers for {currentUser?.department || 'your department'}.
          {!currentUser?.department && (
            <span className="text-red-600 ml-2">
              Department information not available.
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <div>
            <input
              type="text"
              placeholder="Search papers..."
              className="pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'gray\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><circle cx=\'11\' cy=\'11\' r=\'8\'/><line x1=\'21\' y1=\'21\' x2=\'16.65\' y2=\'16.65\'/></svg>')] bg-no-repeat bg-[length:20px_20px] bg-[left_8px_center] pl-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="p-2.5 rounded-lg border bg-white hover:bg-gray-100 text-gray-600" title="Sort" onClick={() => {
            if (sortField === 'name') setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); else { setSortField('name'); setSortOrder('asc'); }
          }}>
            {sortField === 'name' ? (sortOrder === 'asc' ? '↓↑' : '↓↑') : '↓↑'}
          </button>
          <button className="p-2.5 rounded-lg border bg-white hover:bg-gray-100 text-gray-600" title="Filter" onClick={handleOpenFilter}>
            <SlidersHorizontal className="w-5 h-5" />
          </button>
          
          <button 
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed" 
            onClick={() => setAddModalOpen(true)}
            disabled={!currentUser?.department || loading}
            title={!currentUser?.department ? "Department information required" : "Add Question Paper"}
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
          <button className="ml-auto mb-7 p-2 rounded-md text-gray-600 hover:bg-gray-100 fullscreen-btn" title="Fullscreen question papers" onClick={() => toggleFullScreen && toggleFullScreen('panel-questionpapers')}>
            <Maximize2 className="w-5 h-5" />
          </button>
        {addModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 relative animate-modal-in max-h-[90vh] overflow-y-auto">
              <button 
                onClick={() => setAddModalOpen(false)} 
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={loading || uploadingFiles}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Upload className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Add Question Paper</h3>
                  <p className="text-sm text-gray-600">Upload question paper sets for your department</p>
                </div>
              </div>
              
              {uploadingFiles && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                    <span className="font-medium">Creating question paper record...</span>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleAddPaper}>
                {/* Essential Input Fields Only */}
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2 text-gray-700">
                        Subject Name <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" 
                        value={newPaper.name} 
                        onChange={e => setNewPaper(p => ({ ...p, name: e.target.value }))} 
                        required 
                        placeholder="e.g., Research Methodology"
                        disabled={loading || uploadingFiles}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2 text-gray-700">
                        Subject Code <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" 
                        value={newPaper.code} 
                        onChange={e => setNewPaper(p => ({ ...p, code: e.target.value }))} 
                        required 
                        placeholder="e.g., RM101"
                        disabled={loading || uploadingFiles}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700">
                      Set A Google Drive Link <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={newPaper.setALink}
                      onChange={e => handleLinkChange('A', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      placeholder="https://drive.google.com/file/d/..."
                      disabled={loading || uploadingFiles}
                      required
                    />
                    {newPaper.setALink && (
                      <div className={`mt-1 text-sm flex items-center gap-2 ${
                        validateDriveLink(newPaper.setALink) ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {validateDriveLink(newPaper.setALink) ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Valid Google Drive link
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Please provide a valid Google Drive link
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700">
                      Set B Google Drive Link <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={newPaper.setBLink}
                      onChange={e => handleLinkChange('B', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      placeholder="https://drive.google.com/file/d/..."
                      disabled={loading || uploadingFiles}
                      required
                    />
                    {newPaper.setBLink && (
                      <div className={`mt-1 text-sm flex items-center gap-2 ${
                        validateDriveLink(newPaper.setBLink) ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {validateDriveLink(newPaper.setBLink) ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Valid Google Drive link
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Please provide a valid Google Drive link
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Auto-filled info display */}
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Auto-filled:</strong> Uploaded by {currentUser?.name || 'Loading...'} • 
                      Department: {currentUser?.department || 'Loading...'} • 
                      Date: {new Date().toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button 
                    type="button" 
                    onClick={() => setAddModalOpen(false)} 
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                    disabled={loading || uploadingFiles}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    disabled={loading || uploadingFiles || !newPaper.setALink || !newPaper.setBLink || !validateDriveLink(newPaper.setALink) || !validateDriveLink(newPaper.setBLink)}
                  >
                    {(loading || uploadingFiles) && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    <Upload className="w-4 h-4" />
                    {uploadingFiles ? 'Creating...' : 'Create Question Paper'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </div>
        {filterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative animate-modal-in">
              <button onClick={handleCloseFilter} className="absolute top-3 right-4 text-2xl text-gray-400 hover:text-pink-400 font-bold">&times;</button>
              <h3 className="text-2xl font-bold mb-4">Filter Question Papers</h3>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Uploader</label>
                <input type="text" className="w-full border rounded px-3 py-2" value={filterUploader} onChange={e => setFilterUploader(e.target.value)} placeholder="Filter by uploader..." />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Upload Date</label>
                <input type="date" className="w-full border rounded px-3 py-2" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={handleCloseFilter} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                <button onClick={handleApplyFilter} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Apply Filter</button>
              </div>
            </div>
          </div>
        )}
        {/* Centered confirmation modal for deletes */}
        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative animate-modal-in">
              <h3 className="text-xl font-bold mb-3">Confirm</h3>
              <p className="mb-6 text-gray-700">{confirmMessage}</p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => handleConfirm(false)} 
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleConfirm(true)} 
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={loading}
                >
                  {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="bg-white rounded-lg shadow">
          <div className="table-responsive overflow-x-auto overflow-y-auto">
            <table className="table w-full min-w-[700px]">
              <thead>
                <tr>
                  <th className="text-left">S.No</th>
                  <th className="text-left">Name</th>
                  <th className="text-left">QP Code</th>
                  <th className="text-left">Uploaded By</th>
                  <th className="text-left">Uploaded On</th>
                  {hasSetA && <th className="text-center">Set A</th>}
                  {hasSetB && <th className="text-center">Set B</th>}
                </tr>
              </thead>
              <tbody>
                {sortedFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={totalColumns} className="text-center py-8 text-gray-500">
                      {loading ? (
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500 mr-2"></div>
                          Loading question papers...
                        </div>
                      ) : search || filterUploader || filterDate ? (
                        'No question papers match your search criteria.'
                      ) : (
                        'No question papers found. Click "Add Question Paper" to get started.'
                      )}
                    </td>
                  </tr>
                ) : (
                  sortedFiltered.map((p, idx) => {
                    // Find sets by name (A/B) to avoid relying on array order
                    const setA = Array.isArray(p.sets) ? p.sets.find(s => String(s.set).toUpperCase() === 'A') || null : null;
                    const setB = Array.isArray(p.sets) ? p.sets.find(s => String(s.set).toUpperCase() === 'B') || null : null;
                    
                    // Check if user can delete this paper (same department and created by department)
                    const canDelete = p._originalData?.department_name === currentUser?.department && 
                                     p._originalData?.created_by_role === 'department';
                    
                    return (
                      <tr key={p.id}>
                        <td className="align-top">{idx + 1}</td>
                        <td className="align-top">{p.name}</td>
                        <td className="align-top">{p.code}</td>
                        <td className="align-top">{p.uploadedBy}</td>
                        <td className="align-top">{new Date(p.uploadedOn).toLocaleDateString()}</td>
                        {hasSetA && (
                          <td className="text-center align-top">
                            {setA ? (
                              <div className="flex items-center justify-center gap-2">
                                {setA.driveLink ? (
                                  <a 
                                    href={setA.driveLink} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-blue-600 underline hover:text-blue-800"
                                    title="Open Set A"
                                  >
                                    {setA.file || 'Set A'}
                                  </a>
                                ) : (
                                  <span className="text-gray-700">{setA.file}</span>
                                )}
                                {canDelete && (
                                  <button 
                                    className="p-1 rounded-lg bg-red-500 hover:bg-red-600 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                                    title="Delete Set A"
                                    disabled={loading}
                                    onClick={() => {
                                      setConfirmMessage('Are you sure you want to delete Set A?');
                                      setConfirmPayload({ paperId: p.id, setName: 'A' });
                                      setConfirmOpen(true);
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                        )}
                        {hasSetB && (
                          <td className="text-center align-top">
                            {setB ? (
                              <div className="flex items-center justify-center gap-2">
                                {setB.driveLink ? (
                                  <a 
                                    href={setB.driveLink} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-blue-600 underline hover:text-blue-800"
                                    title="Open Set B"
                                  >
                                    {setB.file || 'Set B'}
                                  </a>
                                ) : (
                                  <span className="text-gray-700">{setB.file}</span>
                                )}
                                {canDelete && (
                                  <button 
                                    className="p-1 rounded-lg bg-red-500 hover:bg-red-600 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                                    title="Delete Set B"
                                    disabled={loading}
                                    onClick={() => {
                                      setConfirmMessage('Are you sure you want to delete Set B?');
                                      setConfirmPayload({ paperId: p.id, setName: 'B' });
                                      setConfirmOpen(true);
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
        {/* Edit Modal should be outside the map callback, inside the main return */}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
