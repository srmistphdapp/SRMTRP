// src/components/QuestionPapers.js

import React, { useState, useMemo, useEffect } from 'react';
import { Eye, X, Search, SlidersHorizontal, Maximize, Minimize } from 'lucide-react';
import { FaChevronRight, FaChevronDown, FaSearch, FaFilter, FaDownload, FaEye, FaPaperPlane, FaCheckCircle } from 'react-icons/fa';
import { fetchQuestionPapers } from '../../../../services/questionPaperService';
import { fetchDepartments } from '../../../../services/departmentService';

// Faculty color map
const facultyColors = {
  1: 'border-l-[6px] border-l-[#4f8cff]', // FOET -> Blue
  2: 'border-l-[6px] border-l-[#64c864]', // FSH -> Green
  3: 'border-l-[6px] border-l-[#e57373]', // FMHS -> Red
  4: 'border-l-[6px] border-l-[#ffb74d]', // FOM -> Orange
};


// --- Reusable Modal Component ---
const Modal = ({ children, show, onClose, title }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white text-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <header className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-100">
            <X size={24} />
          </button>
        </header>
        <div className="p-6 overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
};

// --- Main QuestionPapers Component ---
export default function QuestionPapers({ onFullscreenChange, onModalStateChange }) {
  const [papers, setPapers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({ facultyId: '', departmentId: '' });
  const [modal, setModal] = useState({ type: null, data: null }); // type: 'filter' or 'papers'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expanded, setExpanded] = useState({});

  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch question papers
        const { data: papersData, error: papersError } = await fetchQuestionPapers();
        if (papersError) {
          console.error('Error fetching question papers:', papersError);
        } else {
          setPapers(papersData || []);
        }

        // Fetch departments
        const { data: deptsData, error: deptsError } = await fetchDepartments();
        if (deptsError) {
          console.error('Error fetching departments:', deptsError);
        } else {
          setDepartments(deptsData || []);

          // Build faculties structure from departments
          const facultyMap = {};
          deptsData?.forEach(dept => {
            if (!facultyMap[dept.faculty]) {
              facultyMap[dept.faculty] = {
                id: dept.faculty,
                name: dept.faculty,
                departments: []
              };
            }
            facultyMap[dept.faculty].departments.push({
              id: dept.id,
              name: dept.department_name
            });
          });

          setFaculties(Object.values(facultyMap));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Track modal states and notify parent
  useEffect(() => {
    const hasModal = modal.type !== null;
    if (onModalStateChange) {
      onModalStateChange(hasModal);
    }
  }, [modal.type, onModalStateChange]);

  const handleOpenModal = (type, data = null) => setModal({ type, data });
  const handleCloseModal = () => setModal({ type: null, data: null });

  // --- Fullscreen Toggle Logic ---
  const toggleFullscreen = () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    if (onFullscreenChange) {
      onFullscreenChange(newFullscreenState);
    }
  };



  // --- Computed Rows ---
  const displayedRows = useMemo(() => {
    const rows = [];
    faculties.forEach(faculty => {
      if (filter.facultyId && faculty.id !== filter.facultyId) return;

      faculty.departments.forEach(department => {
        if (filter.departmentId && department.id !== filter.departmentId) return;

        const facultyName = faculty.name;
        const deptName = department.name;

        if (
          !facultyName.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !deptName.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return;
        }

        // Match papers by faculty_name and department_name (actual Supabase columns)
        const deptPapers = papers.filter(
          p => p.faculty_name === facultyName && p.department_name === deptName
        );

        // Find papers that have set_a or set_b drive links
        const setA = deptPapers.find(p => p.set_a && p.set_a.trim() !== '');
        const setB = deptPapers.find(p => p.set_b && p.set_b.trim() !== '');

        rows.push({
          facultyName,
          deptName,
          setA,
          setB,
          facultyId: faculty.id,
          deptId: department.id,
        });
      });
    });
    return rows;
  }, [papers, faculties, searchTerm, filter]);

  // --- Handle paper actions ---
  const handleFileAction = (paper) => {
    if (!paper) {
      alert('No question paper has been uploaded for this set.');
      return;
    }
    let url = paper.demoUrl || paper.driveLink || '#';
    if (url !== '#') {
      window.open(url, '_blank');
    } else {
      alert('No link available for this paper.');
    }
  };

  const renderPaperCell = (paper) => (
    <div className="flex justify-center p-2 w-full">
      <button
        onClick={() => handleFileAction(paper)}
        style={{ backgroundColor: '#0000FF' }}
        className=" py-2 px-4 hover:opacity-90 text-white rounded-md text-sm font-semibold transition-opacity flex items-center justify-center gap-2"
      >
        <FaEye size={20} />
      </button>
    </div>
  );

  // Toggle accordion
  const toggleAccordion = id => setExpanded(e => ({ ...e, [id]: !e[id] }));

  // Show papers modal for a department
  const showPapersModal = (facultyName, deptName, facultyId, deptId) => {
    // Find papers by matching faculty_name and department_name
    const deptPapers = papers.filter(
      p => p.faculty_name === facultyName && p.department_name === deptName
    );

    // Separate set A and set B (set_a and set_b are the Google Drive links)
    const setA = deptPapers.find(p => p.set_a && p.set_a.trim() !== '');
    const setB = deptPapers.find(p => p.set_b && p.set_b.trim() !== '');

    setModal({
      type: 'papers',
      data: { facultyName, deptName, setA, setB }
    });
  };

  // Filter faculties based on search
  const filteredFaculties = useMemo(() => {
    return faculties.filter(fac => {
      if (filter.facultyId && fac.id !== filter.facultyId) return false;

      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        return fac.name.toLowerCase().includes(term) ||
          fac.departments.some(dept => dept.name.toLowerCase().includes(term));
      }
      return true;
    }).map(fac => ({
      ...fac,
      departments: fac.departments.filter(dept => {
        if (filter.departmentId && dept.id !== filter.departmentId) return false;
        if (searchTerm && searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          return dept.name.toLowerCase().includes(term);
        }
        return true;
      })
    }));
  }, [faculties, searchTerm, filter]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalDepartments = departments.length;

    // Get unique departments that have papers
    const deptsWithPapers = new Set();
    papers.forEach(paper => {
      if (paper.department_name) {
        deptsWithPapers.add(paper.department_name);
      }
    });

    const departmentsWithPapers = deptsWithPapers.size;
    const departmentsPending = totalDepartments - departmentsWithPapers;
    const totalPapersUploaded = papers.length;

    return {
      totalDepartments,
      departmentsWithPapers,
      departmentsPending,
      totalPapersUploaded
    };
  }, [departments, papers]);

  // Show uploaded departments modal
  const showUploadedDepartmentsModal = () => {
    const deptsWithPapers = new Set();
    const deptDetails = [];

    papers.forEach(paper => {
      if (paper.department_name && !deptsWithPapers.has(paper.department_name)) {
        deptsWithPapers.add(paper.department_name);
        deptDetails.push({
          faculty: paper.faculty_name,
          department: paper.department_name
        });
      }
    });

    setModal({ type: 'uploaded-departments', data: deptDetails });
  };

  // Show pending departments modal
  const showPendingDepartmentsModal = () => {
    const deptsWithPapers = new Set();
    papers.forEach(paper => {
      if (paper.department_name) {
        deptsWithPapers.add(paper.department_name);
      }
    });

    const pendingDepts = departments
      .filter(dept => !deptsWithPapers.has(dept.department_name))
      .map(dept => ({
        faculty: dept.faculty,
        department: dept.department_name
      }));

    setModal({ type: 'pending-departments', data: pendingDepts });
  };

  // Calculate total question papers count (count both set_a and set_b)
  const totalQuestionPapersCount = useMemo(() => {
    let count = 0;
    papers.forEach(paper => {
      if (paper.set_a && paper.set_a.trim() !== '') count++;
      if (paper.set_b && paper.set_b.trim() !== '') count++;
    });
    return count;
  }, [papers]);

  // --- JSX ---
  return (
    <div className="h-full flex flex-col text-gray-900 p-6 space-y-6 overflow-x-hidden" style={{ maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading question papers...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Title at top */}
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-gray-900">Question Papers</h2>
          </div>

          {/* Statistics Tiles */}
          <div className="stats-tiles-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="stat-card" style={{ background: '#f0f4ff', borderLeft: '4px solid #4169E1', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.2s ease' }}>
              <p className="stat-label" style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Departments</p>
              <p className="stat-number" style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', lineHeight: '1' }}>{statistics.totalDepartments}</p>
            </div>

            <div
              className="stat-card"
              onClick={showUploadedDepartmentsModal}
              style={{ background: '#f0fdf4', borderLeft: '4px solid #10b981', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.2s ease', cursor: 'pointer' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <p className="stat-label" style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Uploaded Departments</p>
              <p className="stat-number" style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', lineHeight: '1' }}>{statistics.departmentsWithPapers}</p>
            </div>

            <div
              className="stat-card"
              onClick={showPendingDepartmentsModal}
              style={{ background: '#fffbeb', borderLeft: '4px solid #f59e0b', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.2s ease', cursor: 'pointer' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <p className="stat-label" style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Pending Departments</p>
              <p className="stat-number" style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', lineHeight: '1' }}>{statistics.departmentsPending}</p>
            </div>

            <div className="stat-card" style={{ background: '#faf5ff', borderLeft: '4px solid #8b5cf6', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.2s ease' }}>
              <p className="stat-label" style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Question Papers</p>
              <p className="stat-number" style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', lineHeight: '1' }}>{totalQuestionPapersCount}</p>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="relative pt-4">
                <input
                  type="text"
                  placeholder="Search by Faculty or Department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-96"
                />
                <svg
                  className="absolute left-3 top-6 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <button
                onClick={() => handleOpenModal('filter')}
                className="bg-white hover:bg-gray-50 text-gray-600 p-2.5 rounded-lg transition-all duration-200 border border-gray-300"
                title="Filters"
              >
                <SlidersHorizontal size={18} />
              </button>

              <button
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                onClick={toggleFullscreen}
                className="p-2 text-gray-500 hover:bg-gray-200 rounded-md"
                style={{ paddingTop: '10px' }}
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>

          {/* Faculty Accordion List */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4">
            {filteredFaculties.map(faculty => (
              <div key={faculty.id} className="bg-white rounded-lg shadow-md overflow-hidden border-l-[6px] border-l-blue-500">
                <button
                  onClick={() => toggleAccordion(faculty.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expanded[faculty.id] ? <FaChevronDown className="text-gray-600" /> : <FaChevronRight className="text-gray-600" />}
                    <h3 className="text-lg font-semibold text-gray-900">{faculty.name}</h3>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {faculty.departments.length} {faculty.departments.length === 1 ? 'Department' : 'Departments'}
                  </span>
                </button>

                {expanded[faculty.id] && (
                  <div className="border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                      {faculty.departments.map(dept => (
                        <div
                          key={dept.id}
                          onClick={() => showPapersModal(faculty.name, dept.name, faculty.id, dept.id)}
                          className="bg-gray-50 rounded-lg p-4 hover:bg-blue-50 hover:shadow-md transition-all cursor-pointer border border-gray-200"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">{dept.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">Click to view papers</p>
                            </div>
                            <FaEye className="text-blue-600 text-xl" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredFaculties.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No faculties found matching your search.</p>
              </div>
            )}
          </div>

          <FilterModal
            show={modal.type === 'filter'}
            onClose={handleCloseModal}
            currentFilter={filter}
            onApplyFilter={setFilter}
            faculties={faculties}
          />

          <PapersModal
            show={modal.type === 'papers'}
            onClose={handleCloseModal}
            data={modal.data}
            onViewPaper={handleFileAction}
          />

          <UploadedDepartmentsModal
            show={modal.type === 'uploaded-departments'}
            onClose={handleCloseModal}
            data={modal.data}
          />

          <PendingDepartmentsModal
            show={modal.type === 'pending-departments'}
            onClose={handleCloseModal}
            data={modal.data}
          />
        </>
      )}
    </div>
  );
}

// --- Filter Modal Component ---
const FilterModal = ({ show, onClose, currentFilter, onApplyFilter, faculties }) => {
  const [localFilter, setLocalFilter] = useState(currentFilter);

  useEffect(() => {
    setLocalFilter(currentFilter);
  }, [currentFilter, show]);

  const handleApply = () => {
    onApplyFilter(localFilter);
    onClose();
  };

  const handleReset = () => {
    onApplyFilter({ facultyId: '', departmentId: '' });
    onClose();
  };

  const selectedFaculty = faculties.find(f => f.id === localFilter.facultyId);

  return (
    <Modal show={show} onClose={onClose} title="Filter Question Papers">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-2">Filter by Faculty</label>
          <select
            value={localFilter.facultyId}
            onChange={e => setLocalFilter({ facultyId: e.target.value, departmentId: '' })}
            className="w-full py-2 px-3 bg-gray-100 border border-gray-300 rounded-md text-gray-800"
          >
            <option value="">All Faculties</option>
            {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold mb-2">Filter by Department</label>
          <select
            value={localFilter.departmentId}
            onChange={e => setLocalFilter(f => ({ ...f, departmentId: e.target.value }))}
            className="w-full py-2 px-3 bg-gray-100 border border-gray-300 rounded-md text-gray-800"
            disabled={!localFilter.facultyId}
          >
            <option value="">All Departments</option>
            {selectedFaculty?.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end space-x-3 mt-6">
        <button onClick={handleReset} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Reset</button>
        <button onClick={handleApply} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Apply</button>
      </div>
    </Modal>
  );
};

// --- Papers Modal Component ---
const PapersModal = ({ show, onClose, data, onViewPaper }) => {
  if (!show || !data) return null;

  const { facultyName, deptName, setA, setB } = data;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewPaper = (paper, setType) => {
    let link = setType === 'A' ? paper.set_a : paper.set_b;
    if (link && link.trim() !== '') {
      // Extract actual URL - the column may store "Set A | https://..." format
      if (link.includes('|')) {
        link = link.split('|').pop().trim();
      }
      // Ensure it starts with http
      if (!link.startsWith('http')) {
        const httpIndex = link.indexOf('http');
        if (httpIndex !== -1) {
          link = link.substring(httpIndex);
        }
      }
      window.open(link, '_blank');
    } else {
      alert(`No Google Drive link available for Set ${setType}`);
    }
  };

  return (
    <Modal show={show} onClose={onClose} title={`Question Papers - ${deptName}`}>
      <div className="space-y-6">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Faculty:</span> {facultyName}
          </p>
          <p className="text-sm text-gray-700 mt-1">
            <span className="font-semibold">Department:</span> {deptName}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Set A */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-400 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-gray-900">Question Paper Set A</h4>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">SET A</span>
            </div>
            {setA && setA.set_a ? (
              <div className="space-y-3">
                {setA.subject_name && (
                  <p className="text-sm font-semibold text-gray-800">{setA.subject_name}</p>
                )}
                {setA.subject_code && (
                  <p className="text-xs text-gray-600">Code: {setA.subject_code}</p>
                )}
                <div className="bg-gray-50 p-3 rounded text-xs space-y-1">
                  {setA.created_by_name && (
                    <p className="text-gray-700">
                      <span className="font-semibold">Uploaded by:</span> {setA.created_by_name}
                      {setA.created_by_role && ` (${setA.created_by_role})`}
                    </p>
                  )}
                  {setA.uploaded_on && (
                    <p className="text-gray-700">
                      <span className="font-semibold">Uploaded on:</span> {formatDate(setA.uploaded_on)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleViewPaper(setA, 'A')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <FaEye size={18} />
                  View Paper
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">No question paper uploaded for Set A</p>
              </div>
            )}
          </div>

          {/* Set B */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-green-400 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-gray-900">Question Paper Set B</h4>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">SET B</span>
            </div>
            {setB && setB.set_b ? (
              <div className="space-y-3">
                {setB.subject_name && (
                  <p className="text-sm font-semibold text-gray-800">{setB.subject_name}</p>
                )}
                {setB.subject_code && (
                  <p className="text-xs text-gray-600">Code: {setB.subject_code}</p>
                )}
                <div className="bg-gray-50 p-3 rounded text-xs space-y-1">
                  {setB.created_by_name && (
                    <p className="text-gray-700">
                      <span className="font-semibold">Uploaded by:</span> {setB.created_by_name}
                      {setB.created_by_role && ` (${setB.created_by_role})`}
                    </p>
                  )}
                  {setB.uploaded_on && (
                    <p className="text-gray-700">
                      <span className="font-semibold">Uploaded on:</span> {formatDate(setB.uploaded_on)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleViewPaper(setB, 'B')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <FaEye size={18} />
                  View Paper
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">No question paper uploaded for Set B</p>
              </div>
            )}
          </div>
        </div>

        {(!setA || !setA.set_a) && (!setB || !setB.set_b) && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">Note:</span> No question papers have been uploaded for this department yet.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};


// --- Uploaded Departments Modal Component ---
const UploadedDepartmentsModal = ({ show, onClose, data }) => {
  if (!show || !data) return null;

  return (
    <Modal show={show} onClose={onClose} title="Departments That Uploaded Question Papers">
      <div className="space-y-4">
        {data.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No departments have uploaded question papers yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              Total: <span className="font-semibold text-gray-900">{data.length}</span> department{data.length !== 1 ? 's' : ''} uploaded question papers
            </p>
            <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2">
              {data.map((dept, index) => (
                <div key={index} className="bg-green-50 border-l-4 border-green-500 p-4 rounded hover:bg-green-100 transition-colors">
                  <p className="font-semibold text-gray-900">{dept.department}</p>
                  <p className="text-sm text-gray-600">{dept.faculty}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

// --- Pending Departments Modal Component ---
const PendingDepartmentsModal = ({ show, onClose, data }) => {
  if (!show || !data) return null;

  return (
    <Modal show={show} onClose={onClose} title="Departments Pending Question Paper Upload">
      <div className="space-y-4">
        {data.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-green-600 font-semibold">All departments have uploaded their question papers!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              Total: <span className="font-semibold text-gray-900">{data.length}</span> department{data.length !== 1 ? 's' : ''} pending upload
            </p>
            <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2">
              {data.map((dept, index) => (
                <div key={index} className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded hover:bg-yellow-100 transition-colors">
                  <p className="font-semibold text-gray-900">{dept.department}</p>
                  <p className="text-sm text-gray-600">{dept.faculty}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
