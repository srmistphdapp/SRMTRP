import React, { useState, useEffect } from 'react';
import { FaChevronRight, FaDownload, FaEye, FaPaperPlane, FaCheckCircle } from 'react-icons/fa';
import { SlidersHorizontal } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppContext } from '../App';
import MessageBox from './Modals/MessageBox';
import { createPortal } from 'react-dom';
import { supabase } from '../../../supabaseClient';
import './FOETResult.css';

// Department mapping for short forms
const DEPARTMENT_MAPPING = {
  // Faculty of Engineering & Technology (11 departments)
  'Biomedical Engineering': 'BME',
  'Biotechnology': 'ENGBIO',
  'Chemistry': 'ENGCHEM',
  'Civil Engineering': 'CIVIL',
  'Computer Science and Engineering': 'CSE',
  'Computer Science And Engineering': 'CSE',
  'Computer Science Engineering': 'CSE',
  'Electrical and Electronics Engineering': 'EEE',
  'Electronics and Communication Engineering': 'ECE',
  'English': 'ENGENG',
  'Mathematics': 'ENGMATH',
  'Mechanical Engineering': 'MECH',
  'Physics': 'ENGPHYS',

  // Faculty of Management (1 department)
  'Management Studies': 'MBA',

  // Faculty of Medical and Health Sciences (10 departments)
  'Department of Basic Medical Sciences': 'BMS',
  'Basic Medical Sciences': 'BMS',
  'Department of Conservative Dentistry & Endodontics': 'CDE',
  'Conservative Dentistry & Endodontics': 'CDE',
  'Department of Oral and Maxillofacial Pathology and Microbiology': 'OMPM',
  'Oral and Maxillofacial Pathology and Microbiology': 'OMPM',
  'Department of Oral and Maxillofacial Surgery': 'OMS',
  'Oral and Maxillofacial Surgery': 'OMS',
  'Department of Oral Medicine and Radiology': 'OMR',
  'Oral Medicine and Radiology': 'OMR',
  'Department of Orthodontics': 'ORTHO',
  'Orthodontics': 'ORTHO',
  'Department of Pediatric and Preventive Dentistry': 'PPD',
  'Pediatric and Preventive Dentistry': 'PPD',
  'Department of Periodontics and Oral Implantology': 'POI',
  'Periodontics and Oral Implantology': 'POI',
  'Department of Prosthodontics': 'PROSTH',
  'Prosthodontics': 'PROSTH',
  'Department of Public Health Dentistry': 'PHD',
  'Public Health Dentistry': 'PHD',

  // Faculty of Science & Humanities (8 departments)
  'Biotechnology': 'BIO',
  'Commerce': 'COMM',
  'Computer Science': 'CS',
  'English & Foreign Languages': 'EFL',
  'Fashion Designing': 'FASHION',
  'Mathematics': 'MATH',
  'Tamil': 'TAMIL',
  'Visual Communication': 'VISCOM',
  'Visual Communications': 'VISCOM'
};

// Faculty color map
const facultyColors = {
  'FOET': 'border-l-[6px] border-l-[#4f8cff]', // Blue
};

export default function FOETResult() {
  const { departmentsData, scholarsData, examinationsData, isLoadingSupabase, assignedFaculty, coordinatorInfo, coordinatorName } = useAppContext();

  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY EARLY RETURNS
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ department: '', type: '' });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [publishedLists, setPublishedLists] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);
  const [scholars, setScholars] = useState(scholarsData || []);
  const [isPublishConfirmed, setIsPublishConfirmed] = useState(false);
  const [messageBox, setMessageBox] = useState({ show: false, title: '', message: '', type: 'info' });

  // ALL useEffect hooks must also be at the top
  useEffect(() => {
    if (scholarsData && scholarsData.length > 0) {
      setScholars(scholarsData);
    }
  }, [scholarsData]);

  // Helper function to extract department name from program string
  const extractDepartmentFromProgram = (program) => {
    if (!program || program === 'N/A') return '';

    if (program.includes('Faculty of')) {
      const match = program.match(/Faculty of (.+)/i);
      if (match) return match[1].trim();
    }

    const match = program.match(/Ph\.d\.\s*-\s*([^(]+)/i);
    if (match) return match[1].trim();

    const altMatch = program.match(/([A-Za-z\s]+Engineering|[A-Za-z\s]+Science|[A-Za-z\s]+Technology|[A-Za-z\s]+Management)/i);
    if (altMatch) return altMatch[1].trim();

    return program;
  };

  // Create faculty object from Supabase departments data
  const getPublishedDepartments = () => {
    if (!departmentsData || !examinationsData || examinationsData.length === 0) {
      return [];
    }

    const facultyDepartments = departmentsData.filter(d => d.faculty === assignedFaculty);

    return facultyDepartments.filter(dept => {
      return examinationsData.some(record => {
        const departmentMatch = record.department === dept.department_name;
        const isPublished = record.result_dir && record.result_dir.includes('Published');
        return departmentMatch && isPublished;
      });
    });
  };

  const filteredPublishedDepartments = getPublishedDepartments();

  const faculty = {
    id: 'current_faculty',
    name: assignedFaculty || 'Faculty',
    departments: filteredPublishedDepartments?.map(dept => ({
      id: dept.id,
      name: dept.department_name
    })) || []
  };

  // NOW we can have early returns after all hooks
  if (isLoadingSupabase) {
    return (
      <div className="foet-result-container">
        <div className="loading-state">
          <p>Loading departments...</p>
        </div>
      </div>
    );
  }

  if (!filteredPublishedDepartments || filteredPublishedDepartments.length === 0) {
    return (
      <div className="foet-result-container">
        <div className="no-departments">
          <p>No published results found for {assignedFaculty || 'this faculty'}.</p>
        </div>
      </div>
    );
  }

  // Helper function to get the total number of scholars for a faculty
  const getScholarCountForFaculty = (facultyDepartments) => {
    if (!examinationsData || examinationsData.length === 0) {
      return 0;
    }

    const deptNames = facultyDepartments.map(d => d.name);
    const totalScholars = examinationsData.filter(record => {
      const recordDepartment = record.department;

      // Check if department matches
      const departmentMatch = deptNames.some(deptName =>
        recordDepartment.toLowerCase().includes(deptName.toLowerCase()) ||
        deptName.toLowerCase().includes(recordDepartment.toLowerCase())
      );

      // Check if result_dir contains "Published to" (more flexible matching)
      const isPublished = record.result_dir &&
        (record.result_dir.includes('Published to Engineering') ||
          record.result_dir.includes('Published to Management') ||
          record.result_dir.includes('Published to Science') ||
          record.result_dir.includes('Published to Medical') ||
          record.result_dir.includes('Publish to Engineering') ||
          record.result_dir.includes('Publish to Management') ||
          record.result_dir.includes('Publish to Science') ||
          record.result_dir.includes('Publish to Medical') ||
          record.result_dir.toLowerCase().includes('publish'));

      // Check if total_marks has actual marks OR if scholar has any marks (including partial absence)
      const hasTotalMarks = (record.total_marks &&
        record.total_marks !== null &&
        record.total_marks !== '' &&
        parseFloat(record.total_marks) > 0) ||
        (record.total_marks === 'Absent') ||
        (record.written_marks === 'Ab' || record.interview_marks === 'Ab') ||
        (record.written_marks && parseFloat(record.written_marks) > 0) ||
        (record.interview_marks && parseFloat(record.interview_marks) > 0);

      return departmentMatch && isPublished && hasTotalMarks;
    }).length;

    return totalScholars;
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    if (key === 'department' && value === '') {
      setFilter(prev => ({ ...prev, department: '' }));
    } else {
      setFilter(prev => ({ ...prev, [key]: value }));
    }
  };

  // Clear search function
  const clearSearch = () => {
    setSearch('');
  };

  // Reset all filters
  const resetFilters = () => {
    setFilter({ department: '', type: '' });
    setSearch('');
    setShowFilterModal(false);
  };

  // Check if any filters are active
  const hasActiveFilters = (search && search.trim()) || filter.department || filter.type;

  // Helper function to check if department has unpublished scholars (NULL or empty dept_result)
  const hasUnpublishedScholars = (departmentName) => {
    if (!examinationsData || examinationsData.length === 0) return false;

    // Check if any scholar from this department has NULL or empty dept_result
    return examinationsData.some(record => {
      const recordDepartment = record.department;
      const departmentMatch = recordDepartment === departmentName ||
        recordDepartment.toLowerCase().includes(departmentName.toLowerCase()) ||
        departmentName.toLowerCase().includes(recordDepartment.toLowerCase());

      // Check if dept_result is NULL, empty, or undefined
      const hasNoDeptResult = !record.dept_result || record.dept_result === '' || record.dept_result === null;

      return departmentMatch && hasNoDeptResult;
    });
  };

  // Helper function to check if department is already published
  const isDepartmentPublished = (departmentName) => {
    if (!examinationsData || examinationsData.length === 0) return false;

    const deptShortForm = DEPARTMENT_MAPPING[departmentName] || departmentName;
    const publishValue = `Published_To_${deptShortForm}`;

    const departmentScholars = examinationsData.filter(record => {
      const departmentMatch = record.department === departmentName;
      const isPublished = record.result_dir && record.result_dir.includes('Published');
      return departmentMatch && isPublished;
    });

    if (departmentScholars.length === 0) return false;

    const scholarsWithDeptResult = departmentScholars.filter(record =>
      record.dept_result === publishValue
    );

    return scholarsWithDeptResult.length === departmentScholars.length;
  };

  // Get scholars for a specific department and mode
  const getScholarsForDepartment = (departmentName, mode) => {
    if (!examinationsData || examinationsData.length === 0) return [];

    const filtered = examinationsData.filter(record => {
      const departmentMatch = record.department === departmentName;

      const programType = record.program_type || record.type || '';
      let typeMatch = false;
      if (mode === 'Full Time') {
        typeMatch = programType === 'Full Time';
      } else if (mode === 'Part Time') {
        typeMatch = programType === 'Part Time Internal' ||
          programType === 'Part Time External' ||
          programType === 'Part Time External (Industry)' ||
          programType === 'Part Time';
      }

      const isPublished = record.result_dir && record.result_dir.includes('Published');
      return departmentMatch && typeMatch && isPublished;
    });

    const transformed = filtered
      .map((record) => {
        const isCompletelyAbsent = record.total_marks === 'Absent' ||
          (record.written_marks === 'Ab' && record.interview_marks === 'Ab');

        const writtenMarks = record.written_marks === 'Ab' ? 'Ab' : Math.round(parseFloat(record.written_marks) || 0);
        const vivaMarks = record.interview_marks === 'Ab' ? 'Ab' : Math.round(parseFloat(record.interview_marks) || 0);

        let totalMarks;
        if (isCompletelyAbsent) {
          totalMarks = 'Absent';
        } else if (record.total_marks && record.total_marks !== 'Absent') {
          totalMarks = Math.round(parseFloat(record.total_marks));
        } else {
          const writtenScore = record.written_marks === 'Ab' ? 0 : (parseFloat(record.written_marks) || 0);
          const vivaScore = record.interview_marks === 'Ab' ? 0 : (parseFloat(record.interview_marks) || 0);
          totalMarks = Math.round(writtenScore + vivaScore);
        }

        return {
          id: record.id,
          'Registered Name': record.registered_name || 'N/A',
          'Application Number': record.application_no || 'N/A',
          'Mode of Study': mode,
          Specialization: record.department || 'N/A',
          writtenMarks,
          vivaMarks,
          totalMarks,
          originalType: record.type,
          type: record.type,
          department: record.department || 'N/A',
          registered_name: record.registered_name || 'N/A',
          application_no: record.application_no || 'N/A',
          written_marks: writtenMarks,
          interview_marks: vivaMarks,
          total_marks: totalMarks,
          status: isCompletelyAbsent ? 'Absent' : (parseFloat(totalMarks) >= 50 ? 'Qualified' : 'Not Qualified')
        };
      })
      .sort((a, b) => {
        if (a.totalMarks === 'Absent' && b.totalMarks !== 'Absent') return 1;
        if (a.totalMarks !== 'Absent' && b.totalMarks === 'Absent') return -1;
        if (a.totalMarks === 'Absent' && b.totalMarks === 'Absent') return 0;
        return parseFloat(b.totalMarks) - parseFloat(a.totalMarks);
      })
      .map((scholar, index) => ({ ...scholar, rank: index + 1 }));

    return transformed;
  };

  // Department action logic
  function showRankListModal(deptName, scholarType) {
    const rows = getScholarsForDepartment(deptName, scholarType);

    const transformedRows = rows.map((scholar, index) => ({
      id: scholar.id,
      rank: index + 1,
      'Registered Name': scholar['Registered Name'] || scholar.registered_name || 'N/A',
      'Application Number': scholar['Application Number'] || scholar.application_no || 'N/A',
      'Mode of Study': scholar['Mode of Study'] || scholarType,
      partTimeDetails: scholar.originalType || scholar.type || scholarType,
      department: scholar.department || 'N/A',
      writtenMarks: scholar.writtenMarks === 'Ab' ? 'Ab' : (typeof scholar.writtenMarks === 'number' ? scholar.writtenMarks : Math.round(scholar.written_marks || 0)),
      vivaMarks: scholar.vivaMarks === 'Ab' ? 'Ab' : (typeof scholar.vivaMarks === 'number' ? scholar.vivaMarks : Math.round(scholar.interview_marks || 0)),
      totalMarks: scholar.totalMarks === 'Absent' ? 'Absent' : (typeof scholar.totalMarks === 'number' ? scholar.totalMarks : Math.round(scholar.total_marks || 0)),
      status: scholar.status || (scholar.totalMarks === 'Absent' ? 'Absent' : ((parseFloat(scholar.totalMarks || scholar.total_marks || 0) >= 50) ? 'Qualified' : 'Not Qualified'))
    }));

    setModal({ deptName, scholarType, rows: transformedRows });
  }

  function closeModal() { setModal(null); }

  // Publish logic
  function togglePublishRankList(deptId, deptName) {
    if (publishedLists.includes(deptId)) return;

    setIsPublishConfirmed(false); // Reset confirmation state
    setConfirmModal({
      title: "Confirm Publish",
      deptName: deptName,
      message: `Are you sure you want to publish the rank list for ${deptName}? This action will update the department results.`,
      onConfirm: async () => {
        try {
          // Get department short form
          const deptShortForm = DEPARTMENT_MAPPING[deptName] || deptName;
          const publishValue = `Published_To_${deptShortForm}`;

          // Get all scholars for this department (both FT and PT)
          const ftScholars = getScholarsForDepartment(deptName, 'Full Time');
          const ptScholars = getScholarsForDepartment(deptName, 'Part Time');
          const allScholars = [...ftScholars, ...ptScholars];

          if (allScholars.length === 0) {
            setMessageBox({ show: true, title: 'Notification', message: 'No scholars found for this department to publish.', type: 'warning' });
            setConfirmModal(null);
            return;
          }

          // Update dept_result column for all scholars in this department
          const scholarIds = allScholars.map(scholar => scholar.id);

          const { data, error } = await supabase
            .from('examination_records')
            .update({ dept_result: publishValue })
            .in('id', scholarIds);

          if (error) {
            console.error('Error publishing results:', error);
            setMessageBox({ show: true, title: 'Notification', message: 'Error occurred while publishing results. Please try again.', type: 'error' });
          } else {
            setPublishedLists(prev => [...prev, deptId]);
          }
        } catch (error) {
          console.error('Exception during publish:', error);
          setMessageBox({ show: true, title: 'Notification', message: 'Error occurred while publishing results. Please try again.', type: 'error' });
        }

        setConfirmModal(null);
        setIsPublishConfirmed(false); // Reset confirmation state
      }
    });
  }

  // Download logic for a specific rank list
  function downloadRankings(deptName, scholarType) {
    const getRankingData = (type) => {
      return getScholarsForDepartment(deptName, type)
        .map((scholar, index) => {
          let rowData = {
            'Rank': index + 1,
            'Name': scholar['Registered Name'] || scholar.registered_name || 'N/A',
            'Application Number': scholar['Application Number'] || scholar.application_no || 'N/A',
            'Type': scholar.type || scholar.program_type || type,
          };
          rowData = {
            ...rowData,
            'Written Marks': scholar.writtenMarks === 'Ab' ? 'Ab' : (typeof scholar.writtenMarks === 'number' ? scholar.writtenMarks : Math.round(scholar.written_marks || 0)),
            'Interview Marks': scholar.vivaMarks === 'Ab' ? 'Ab' : (typeof scholar.vivaMarks === 'number' ? scholar.vivaMarks : Math.round(scholar.interview_marks || 0)),
            'Total Marks': scholar.totalMarks === 'Absent' ? 'Absent' : (typeof scholar.totalMarks === 'number' ? scholar.totalMarks : Math.round(scholar.total_marks || 0)),
            'Status': scholar.status || (scholar.totalMarks === 'Absent' ? 'Absent' : ((parseFloat(scholar.totalMarks || scholar.total_marks || 0) >= 50) ? 'Qualified' : 'Not Qualified'))
          };
          return rowData;
        });
    };

    const data = getRankingData(scholarType);

    if (data.length === 0) {
      setMessageBox({ show: true, title: 'Notification', message: `No ${scholarType} ranking data available to download for this department.`, type: 'warning' });
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, `${scholarType} Rankings`);

    XLSX.writeFile(wb, `Rankings_${deptName.replace(/ /g, '_')}_${scholarType.replace(/ /g, '_')}.xlsx`);
  }

  // Filtering faculties and departments
  const filteredDepartments = faculty.departments.filter(dept => {
    if (filter.department && dept.name !== filter.department) return false;

    if (search && search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      // Use examination records data instead of static data
      return examinationsData.some(record => {
        const recordDepartment = record.department;
        const departmentMatch = recordDepartment.toLowerCase().includes(dept.name.toLowerCase());
        const nameMatch = record.registered_name?.toLowerCase().includes(searchTerm);
        const appNoMatch = record.application_no?.toLowerCase().includes(searchTerm);

        // Check if result_dir contains "Published to" (improved matching)
        const isPublished = record.result_dir &&
          (record.result_dir.includes('Published to Engineering') ||
            record.result_dir.includes('Published to Management') ||
            record.result_dir.includes('Published to Science') ||
            record.result_dir.includes('Published to Medical') ||
            record.result_dir.includes('Publish to Engineering') ||
            record.result_dir.includes('Publish to Management') ||
            record.result_dir.includes('Publish to Science') ||
            record.result_dir.includes('Publish to Medical') ||
            record.result_dir.toLowerCase().includes('publish'));

        // Check if total_marks has actual marks OR if scholar has any marks (including partial absence)
        const hasTotalMarks = (record.total_marks &&
          record.total_marks !== null &&
          record.total_marks !== '' &&
          parseFloat(record.total_marks) > 0) ||
          (record.total_marks === 'Absent') ||
          (record.written_marks === 'Ab' || record.interview_marks === 'Ab') ||
          (record.written_marks && parseFloat(record.written_marks) > 0) ||
          (record.interview_marks && parseFloat(record.interview_marks) > 0);

        return departmentMatch && (nameMatch || appNoMatch) && isPublished && hasTotalMarks;
      });
    }
    return true;
  });;

  return (
    <div className="foet-result-container">
      {/* Header */}
      <div className="foet-result-header">
        <h3 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', margin: 0 }}>Results</h3>
      </div>

      {/* Search and Filter */}
      <div className="foet-result-search-section">
        <div className="flex items-center gap-4">
          <div className="relative flex-grow max-w-lg">
            <input
              type="text"
              placeholder="Search by name or application number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`px-4 py-2 w-full h-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${search && search.trim() ? 'border-blue-300 bg-blue-50' : 'border-gray-300'}`}
            />
            {search && (
              <button onClick={clearSearch} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700">
                <span className="font-bold text-xl">&times;</span>
              </button>
            )}
          </div>
          <button
            className="scholar-control-button"
            onClick={() => setShowFilterModal(true)}
            title="Filter"
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Accordions by Faculty */}
      <div id="foetResultTablesContainer" className="foet-result-content">
        {filteredDepartments.length === 0 && hasActiveFilters && (
          <div className="foet-result-no-results">
            <div className="text-gray-500 text-lg mb-2">No results found</div>
            <div className="text-gray-400 text-sm mb-4">Try adjusting your search terms or filters</div>
            <button onClick={resetFilters} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Clear All Filters</button>
          </div>
        )}

        <div className={`foet-result-faculty-card ${facultyColors['FOET'] || 'border-l-[6px] border-l-gray-400'}`}>
          <div className="flex items-center px-6 py-4 select-none">
            <span className="font-bold text-lg flex-1">{faculty.name}</span>
            <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-semibold mr-4">
              {getScholarCountForFaculty(faculty.departments)} Scholars
            </span>
          </div>
          <div className="px-8 pb-4">
            <div className="flex items-center justify-between border-b-2 border-gray-200 py-2 mb-2 text-sm font-semibold text-gray-500 uppercase">
              <div className="flex-1">Department</div>
              <div className="flex items-center text-center">
                <div className="w-32">FT Ranks</div>
                <div className="w-32">PT Ranks</div>
                <div className="w-32">PUBLISH</div>
              </div>
            </div>

            {filteredDepartments.map(dept => {
              return (
                <div key={dept.id} className="flex items-center justify-between border-b py-3">
                  <div className="flex flex-1 items-center gap-2">
                    <span className="font-medium text-gray-800">{dept.name}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-32 text-center">
                      <button
                        title="View Full Time Ranks"
                        className="bg-blue-500 text-white hover:bg-blue-700 transition-colors px-2 py-1 rounded"
                        onClick={() => showRankListModal(dept.name, 'Full Time')}
                      >
                        <FaEye size={20} />
                      </button>
                    </div>
                    <div className="w-32 text-center">
                      <button
                        title="View Part Time Ranks"
                        className="bg-purple-500 text-white hover:bg-purple-700 transition-colors px-2 py-1 rounded"
                        onClick={() => showRankListModal(dept.name, 'Part Time')}
                      >
                        <FaEye size={20} />
                      </button>
                    </div>
                    <div className="w-32 text-center">
                      {publishedLists.includes(dept.id) || isDepartmentPublished(dept.name) ? (
                        <button
                          title="Published"
                          className="text-green-500"
                          disabled
                        >
                          <FaCheckCircle size={20} />
                        </button>
                      ) : (
                        <button
                          title="Publish Ranks"
                          className="bg-green-500 hover:bg-green-600 text-white transition-colors px-2 py-2 rounded"
                          onClick={() => togglePublishRankList(dept.id, dept.name)}
                        >
                          <FaPaperPlane size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rank List Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-4 border-b">
              <div>
                <h2 className="text-xl font-bold">{modal.deptName} - {modal.scholarType} Rank List</h2>
              </div>
              <button onClick={closeModal} className="text-gray-600 hover:text-red-400 text-2xl font-bold">&times;</button>
            </div>
            <div className="overflow-y-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200 w-16">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">Name</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">App No</th>
                    {modal.scholarType === 'Part Time' && (
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">Type</th>
                    )}
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">Written Marks</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">Interview Marks</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">Total Marks</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {modal.rows.length === 0 ? (
                    <tr>
                      <td colSpan={modal.scholarType === 'Part Time' ? "8" : "7"} className="text-center py-8 text-gray-500">
                        No scholars found.
                      </td>
                    </tr>
                  ) : (
                    modal.rows.map((row, i) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-center border-b border-gray-100">
                          <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full font-medium ${i < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-4 border-b border-gray-100">
                          <div className="text-gray-800">{row['Registered Name'] || row.registered_name || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-4 text-center border-b border-gray-100">
                          <div className="text-sm text-gray-600">{row['Application Number'] || row.application_no || 'N/A'}</div>
                        </td>
                        {modal.scholarType === 'Part Time' && (
                          <td className="px-4 py-4 text-center border-b border-gray-100">
                            <div className="text-gray-700">
                              {row.department || 'N/A'}
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-4 text-center border-b border-gray-100">
                          <div className={`font-semibold ${(row.writtenMarks || row.written_marks || 0) === 'Ab' ? 'text-red-600' :
                            (row.writtenMarks || row.written_marks || 0) >= 35 ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {row.writtenMarks || row.written_marks || 0}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center border-b border-gray-100">
                          <div className={`font-semibold ${(row.vivaMarks || row.interview_marks || 0) === 'Ab' ? 'text-red-600' :
                            (row.vivaMarks || row.interview_marks || 0) >= 15 ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {row.vivaMarks || row.interview_marks || 0}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center border-b border-gray-100">
                          <div className={`font-semibold ${(row.totalMarks || row.total_marks || 0) === 'Absent' ? 'text-red-600' :
                            (row.totalMarks || row.total_marks || 0) >= 50 ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {row.totalMarks || row.total_marks || 0}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center border-b border-gray-100">
                          {(row.status === 'Qualified' || (row.totalMarks || row.total_marks || 0) >= 60) ? (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">Qualified</span>
                          ) : (
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold inline-block">Not Qualified</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center pt-4 mt-4 border-t">
              <button
                onClick={() => downloadRankings(modal.deptName, modal.scholarType)}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm"
              >
                <FaDownload />
                Download Excel
              </button>
              <button onClick={closeModal} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="publish-confirmation-modal">
          <div className="publish-confirmation-content">
            {/* Header */}
            <div className="publish-confirmation-header">
              <button
                onClick={() => setConfirmModal(null)}
                className="publish-confirmation-close"
              >
                ×
              </button>
              <h2 className="publish-confirmation-title">
                Confirm Publishing
              </h2>
            </div>

            {/* Content */}
            <div className="publish-confirmation-body">
              {/* Admin Info Section */}
              <div className="admin-info-section">
                <div className="admin-info-row">
                  <span className="admin-info-label">Admin Name:</span> {coordinatorInfo?.name || coordinatorName || 'Research Coordinator'}
                </div>
                <div className="admin-info-row">
                  <span className="admin-info-label">Role:</span> Research Coordinator, {assignedFaculty || 'Faculty'}
                </div>
                <div className="admin-info-row">
                  <span className="admin-info-label">Email:</span> <span className="admin-info-email">{coordinatorInfo?.email || 'coordinator@srm.edu.in'}</span>
                </div>
              </div>

              {/* Consent & Confirmation Section */}
              <div className="consent-section">
                <h3 className="consent-title">
                  Consent & Confirmation
                </h3>
                <ul className="consent-list">
                  <li className="consent-item">
                    <span className="consent-bullet">•</span>
                    I have thoroughly reviewed all submitted results data
                  </li>
                  <li className="consent-item">
                    <span className="consent-bullet">•</span>
                    I have verified the authenticity of examination records
                  </li>
                  <li className="consent-item">
                    <span className="consent-bullet">•</span>
                    This action will be recorded in the system
                  </li>
                </ul>

                <div className="consent-checkbox-container">
                  <input
                    type="checkbox"
                    id="confirmFOETCheckbox"
                    className="consent-checkbox"
                    checked={isPublishConfirmed}
                    onChange={(e) => setIsPublishConfirmed(e.target.checked)}
                  />
                  <label htmlFor="confirmFOETCheckbox" className="consent-checkbox-label">
                    I confirm I have read and agree to the above terms
                  </label>
                </div>
              </div>

              {/* Conclusion */}
              <div className="conclusion-section">
                <p className="conclusion-text">
                  You are about to <span className="conclusion-bold">PUBLISH</span> results for {confirmModal.deptName || 'Department'} to the department for further processing.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="confirmation-actions">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="confirmation-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  className="confirmation-confirm-btn"
                  onClick={confirmModal.onConfirm}
                  disabled={!isPublishConfirmed}
                >
                  PUBLISH
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {createPortal(
        showFilterModal && (
          <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md foet-filter-modal" style={{ margin: 'auto', position: 'relative', zIndex: 10000 }}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Filter Results</h2>
                <button onClick={() => setShowFilterModal(false)} className="text-gray-600 hover:text-red-400 text-2xl font-bold">&times;</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <select value={filter.department} onChange={(e) => handleFilterChange('department', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">All Departments</option>
                    {faculty.departments.map(dept => <option key={dept.id} value={dept.name}>{dept.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Scholar Type</label>
                  <select value={filter.type} onChange={(e) => handleFilterChange('type', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">All Types</option>
                    <option value="Full Time">Full Time</option>
                    <option value="Part Time">Part Time</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={resetFilters} className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">Reset All</button>
                <button onClick={() => setShowFilterModal(false)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Apply Filters</button>
              </div>
            </div>
          </div>
        ),
        document.body
      )}

      {/* Message Box - Rendered as Portal to appear on top */}
      {createPortal(
        <MessageBox
          show={messageBox.show}
          title={messageBox.title}
          message={messageBox.message}
          type={messageBox.type}
          onClose={() => setMessageBox({ show: false, title: '', message: '', type: 'info' })}
        />,
        document.body
      )}
    </div>
  );
}
