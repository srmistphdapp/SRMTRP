// src/components/QuestionPapers.js

import React, { useState, useMemo, useEffect } from 'react';
import { Eye, X, Search, SlidersHorizontal } from 'lucide-react';
import { FaChevronRight, FaChevronDown, FaEye } from 'react-icons/fa';
import { useAppContext } from '../App';
import MessageBox from './Modals/MessageBox';
import './QuestionPapers.css';

// Faculty color map
const facultyColors = {
  'Faculty of Engineering & Technology': 'border-l-[6px] border-l-[#4f8cff]', // Blue
  'Faculty of Science & Humanities': 'border-l-[6px] border-l-[#64c864]', // Green
  'Faculty of Management': 'border-l-[6px] border-l-[#e57373]', // Red
  'Faculty of Medical and Health Sciences': 'border-l-[6px] border-l-[#ffb74d]', // Orange
};

// --- Reusable Modal Component ---
const Modal = ({ children, show, onClose, title }) => {
  if (!show) return null;
  return (
    <div className="modal-overlay">
      <div className="question-paper-modal">
        <header className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button onClick={onClose} className="modal-close-button">
            <X size={24} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

// --- Main QuestionPapers Component ---
export default function QuestionPapers({ onFullscreenChange }) {
  const { questionPapersData, assignedFaculty, isLoadingSupabase } = useAppContext();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({ department: '' });
  const [modal, setModal] = useState({ type: null, data: null });
  const [expanded, setExpanded] = useState({});
  const [messageBox, setMessageBox] = useState({ show: false, title: '', message: '', type: 'info' });

  const handleOpenModal = (type, data = null) => setModal({ type, data });
  const handleCloseModal = () => setModal({ type: null, data: null });

  // Group papers by faculty and department
  const groupedByFacultyAndDept = useMemo(() => {
    const grouped = {};
    
    questionPapersData.forEach(paper => {
      const faculty = paper.faculty_name || 'Unknown Faculty';
      const dept = paper.department_name || 'Unknown Department';
      
      if (!grouped[faculty]) {
        grouped[faculty] = {};
      }
      if (!grouped[faculty][dept]) {
        grouped[faculty][dept] = [];
      }
      grouped[faculty][dept].push(paper);
    });

    return grouped;
  }, [questionPapersData]);

  // Get unique faculties and departments for filter
  const faculties = useMemo(() => {
    return Object.keys(groupedByFacultyAndDept).sort();
  }, [groupedByFacultyAndDept]);

  const departments = useMemo(() => {
    if (filter.faculty && groupedByFacultyAndDept[filter.faculty]) {
      return Object.keys(groupedByFacultyAndDept[filter.faculty]).sort();
    }
    return [];
  }, [filter.faculty, groupedByFacultyAndDept]);

  // Filter faculties based on department search and filter
  const filteredFaculties = useMemo(() => {
    return faculties.map(faculty => ({
      name: faculty,
      departments: Object.keys(groupedByFacultyAndDept[faculty] || {})
        .filter(dept => {
          if (filter.department && dept !== filter.department) return false;
          if (searchTerm && searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            return dept.toLowerCase().includes(term);
          }
          return true;
        })
        .sort()
    }));
  }, [faculties, searchTerm, filter, groupedByFacultyAndDept]);

  // Toggle accordion
  const toggleAccordion = id => setExpanded(e => ({ ...e, [id]: !e[id] }));

  // Show papers modal for a department
  const showPapersModal = (facultyName, departmentName) => {
    const papers = groupedByFacultyAndDept[facultyName]?.[departmentName] || [];
    setModal({ 
      type: 'papers', 
      data: { facultyName, departmentName, papers }
    });
  };

  // Handle file action (open link)
  const handleFileAction = (paper, setType) => {
    let link = setType === 'A' ? paper.set_a : paper.set_b;
    
    if (!link) {
      setMessageBox({ show: true, title: 'Notification', message: `No question paper has been uploaded for Set ${setType}.`, type: 'warning' });
      return;
    }
    
    // Parse URL from "Set A | URL" or "Set B | URL" format
    if (link.includes('|')) {
      link = link.split('|')[1].trim();
    }
    
    window.open(link, '_blank');
  };

  // --- JSX ---
  return (
    <div className="h-full flex flex-col text-gray-900 p-6 space-y-6 overflow-x-hidden" style={{ maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-size font-bold text-gray-900">Question Papers</h2>
        <div className="flex items-center gap-4">
          <div className="relative pt-4">
            <input
              type="text"
              placeholder="Search by Department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-96"
            />
          </div>
        </div>
      </div>

      {/* Faculty Accordion List */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4">
        {isLoadingSupabase ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Loading question papers...</p>
          </div>
        ) : filteredFaculties.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No Question Papers Available</p>
          </div>
        ) : (
          filteredFaculties.map(faculty => (
            <div key={faculty.name} className={`bg-white rounded-lg shadow-md overflow-hidden ${facultyColors[faculty.name] || 'border-l-[6px] border-l-[#4f8cff]'}`}>
              <button
                onClick={() => toggleAccordion(faculty.name)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expanded[faculty.name] ? <FaChevronDown className="text-gray-600" /> : <FaChevronRight className="text-gray-600" />}
                  <h3 className="text-lg font-semibold text-gray-900">{faculty.name}</h3>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {faculty.departments.length} Departments
                </span>
              </button>

              {expanded[faculty.name] && (
                <div className="border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {faculty.departments.map(dept => (
                      <div
                        key={dept}
                        onClick={() => showPapersModal(faculty.name, dept)}
                        className="bg-gray-50 rounded-lg p-4 hover:bg-blue-50 hover:shadow-md transition-all cursor-pointer border border-gray-200"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">{dept}</h4>
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
          ))
        )}
      </div>

      <FilterModal
        show={modal.type === 'filter'}
        onClose={handleCloseModal}
        currentFilter={filter}
        onApplyFilter={setFilter}
        faculties={faculties}
        departments={departments}
        groupedByFacultyAndDept={groupedByFacultyAndDept}
      />

      <PapersModal
        show={modal.type === 'papers'}
        onClose={handleCloseModal}
        data={modal.data}
        onViewPaper={handleFileAction}
      />

      {/* Message Box */}
      <MessageBox 
        show={messageBox.show}
        title={messageBox.title}
        message={messageBox.message}
        type={messageBox.type}
        onClose={() => setMessageBox({ show: false, title: '', message: '', type: 'info' })}
      />
    </div>
  );
}

// --- Filter Modal Component ---
const FilterModal = ({ show, onClose, currentFilter, onApplyFilter, faculties, departments, groupedByFacultyAndDept }) => {
  const [localFilter, setLocalFilter] = useState(currentFilter);

  useEffect(() => {
    setLocalFilter(currentFilter);
  }, [currentFilter, show]);

  const handleApply = () => {
    onApplyFilter(localFilter);
    onClose();
  };

  const handleReset = () => {
    onApplyFilter({ department: '' });
    onClose();
  };

  // Get all unique departments across all faculties
  const allDepartments = useMemo(() => {
    const depts = new Set();
    Object.values(groupedByFacultyAndDept).forEach(facultyDepts => {
      Object.keys(facultyDepts).forEach(dept => depts.add(dept));
    });
    return Array.from(depts).sort();
  }, [groupedByFacultyAndDept]);

  return (
    <Modal show={show} onClose={onClose} title="Filter Question Papers">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-2">Filter by Department</label>
          <select
            value={localFilter.department}
            onChange={e => setLocalFilter({ department: e.target.value })}
            className="w-full py-2 px-3 bg-gray-100 border border-gray-300 rounded-md text-gray-800"
          >
            <option value="">All Departments</option>
            {allDepartments.map(d => <option key={d} value={d}>{d}</option>)}
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
  // Group papers by subject code (to keep same subject together)
  const groupedBySubject = useMemo(() => {
    if (!data || !data.papers) return {};
    
    const grouped = {};
    data.papers.forEach(paper => {
      const subjectCode = paper.subject_code;
      if (!grouped[subjectCode]) {
        grouped[subjectCode] = {
          name: paper.subject_name,
          code: paper.subject_code,
          papers: []
        };
      }
      grouped[subjectCode].papers.push(paper);
    });
    return grouped;
  }, [data]);

  if (!show || !data) return null;

  const { facultyName, departmentName } = data;

  return (
    <Modal show={show} onClose={onClose} title={`Question Papers - ${departmentName}`}>
      <div className="space-y-6">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Faculty:</span> {facultyName}
          </p>
          <p className="text-sm text-gray-700 mt-1">
            <span className="font-semibold">Department:</span> {departmentName}
          </p>
        </div>

        <div className="space-y-4">
          {Object.entries(groupedBySubject).map(([subjectCode, subjectData]) => (
            <div key={subjectCode} className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-700"><span className="font-semibold">Subject Name:</span> {subjectData.name}</p>
                <p className="text-sm text-gray-700 mt-1"><span className="font-semibold">Subject Code:</span> {subjectData.code}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Set A */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h5 className="font-semibold text-gray-900 mb-3">Set A</h5>
                  {subjectData.papers[0]?.set_a ? (
                    <button
                      onClick={() => onViewPaper(subjectData.papers[0], 'A')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors text-sm"
                    >
                      <FaEye size={16} />
                      View Paper
                    </button>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm">No paper uploaded</p>
                    </div>
                  )}
                </div>

                {/* Set B */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h5 className="font-semibold text-gray-900 mb-3">Set B</h5>
                  {subjectData.papers[0]?.set_b ? (
                    <button
                      onClick={() => onViewPaper(subjectData.papers[0], 'B')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors text-sm"
                    >
                      <FaEye size={16} />
                      View Paper
                    </button>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm">No paper uploaded</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {data.papers && data.papers.length === 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">Note:</span> No question papers have been uploaded for this department yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
