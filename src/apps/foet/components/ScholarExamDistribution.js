import React, { useState, useEffect } from 'react';
import { useAppContext } from '../App';
import { SlidersHorizontal, ArrowUpDown, Send, Download, Eye, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import MessageBox from './Modals/MessageBox';
import DownloadSelectionModal from './Modals/DownloadSelectionModal';
import { fetchFacultyExaminationRecords, updateDirectorInterviewStatus } from '../services/supabaseService';
import './ScholarExamDistribution.css'; // Keeping for modal/header styles

const ScholarExamDistribution = () => {
  const { data, selectedCampusId, examinationsData, isLoadingSupabase, assignedFaculty, coordinatorInfo } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [examinationRecords, setExaminationRecords] = useState([]);
  const [isLoadingExaminations, setIsLoadingExaminations] = useState(false);
  const [selectedScholarIds, setSelectedScholarIds] = useState([]);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedScholar, setSelectedScholar] = useState(null);
  const [actionType, setActionType] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmAgreed, setConfirmAgreed] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Popup message state
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupTitle, setPopupTitle] = useState('');

  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [sortField, setSortField] = useState('status'); // Changed from 'applicationNo' to 'status'
  const [sortDirection, setSortDirection] = useState('asc');

  // Load examination records on component mount and when assignedFaculty changes
  useEffect(() => {
    const loadExaminationRecords = async () => {
      if (!assignedFaculty) return;

      setIsLoadingExaminations(true);
      try {
        const { data: examRecords, error } = await fetchFacultyExaminationRecords(assignedFaculty);
        if (error) {
          console.error('Error fetching examination records:', error);
          setExaminationRecords([]);
        } else {
          setExaminationRecords(examRecords || []);
        }
      } catch (err) {
        console.error('Exception loading examination records:', err);
        setExaminationRecords([]);
      } finally {
        setIsLoadingExaminations(false);
      }
    };

    loadExaminationRecords();
  }, [assignedFaculty]);

  // Use examination records data instead of mock data
  // examinationRecords is populated by the local fetch; fall back to context examinationsData
  // while the local fetch is in progress
  const activeExamData = examinationRecords.length > 0 ? examinationRecords : examinationsData;

  // Inline Table Styles - Matching ScholarManagement (Verified Scholar) styling
  const tableStyles = {
    container: {
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      overflowX: 'auto',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      marginBottom: '60px',
      width: '100%',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      tableLayout: 'auto', // Allows cells to adjust width based on content
    },
    thead: {
      background: '#f8fafc',
      borderBottom: '2px solid #e2e8f0',
    },
    th: {
      padding: '14px 10px',
      color: '#374151',
      fontWeight: '700',
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '0.3px',
      whiteSpace: 'nowrap', // Prevents wrapping, forcing width to fit content
      border: 'none',
    },
    row: {
      borderBottom: '1px solid #f1f5f9',
      transition: 'background-color 0.2s',
    },
    td: {
      padding: '12px 10px',
      verticalAlign: 'middle',
      fontSize: '13px',
      color: '#374151',
      fontWeight: '400',
      whiteSpace: 'nowrap', // Prevents wrapping
    },
    scholarName: {
      fontWeight: '400', // Unbold the name column
      color: '#374151',
    },
    marks: {
      fontWeight: '600',
      padding: '0.25rem 0.5rem',
      borderRadius: '0.25rem',
      display: 'inline-block',
    },
    writtenMarks: {
      color: '#16a34a',
      backgroundColor: '#dcfce7',
    },
    vivaMarks: {
      color: '#b45309',
      backgroundColor: '#fef3c7',
    },
    noData: {
      textAlign: 'center',
      padding: '2rem',
      color: '#9ca3af',
      fontStyle: 'italic',
    }
  };

  // Transform examination records data for display
  const examData = activeExamData.map((record, index) => {
    // Show all scholars for this faculty from examination_records.faculty column
    // Display marks as numbers: 0 initially, real marks when available from the database
    // Status shows director_interview status: "Pending" initially, "Forwarded" when forwarded to director

    // Function to extract department name from program field
    const extractDepartmentFromProgram = (program) => {
      if (!program) return 'N/A';

      // Handle case insensitive matching
      const programLower = program.toLowerCase();

      // Pattern: "Ph.d. - [Department Name] (additional info)"
      // Extract text between "ph.d. -" and the opening parenthesis or bracket
      const match = programLower.match(/ph\.?d\.?\s*-\s*([^(\[]+)/i);

      if (match) {
        let department = match[1].trim();

        // Remove any trailing content in brackets or parentheses
        department = department.replace(/\s*[\[\(].*$/, '');

        // Clean up common variations and normalize
        department = department
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim() // Remove leading/trailing spaces
          .split(' ')
          .map((word, index) => {
            // Convert to lowercase first
            const lowerWord = word.toLowerCase();

            // Keep certain words lowercase (articles, prepositions, conjunctions)
            // But not if they're the first word
            const lowercaseWords = ['and', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'the', 'a', 'an', '&'];

            if (index > 0 && lowercaseWords.includes(lowerWord)) {
              return lowerWord;
            }

            // Handle special cases for abbreviations
            if (lowerWord === 'it' || lowerWord === 'ai' || lowerWord === 'ml') {
              return lowerWord.toUpperCase();
            }

            // Capitalize first letter of other words
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          })
          .join(' ');

        return department;
      }

      // Fallback: if no match, try to extract any text after "Ph.d." or "PhD"
      const fallbackMatch = program.match(/(?:ph\.?d\.?|phd)\s*[-:]?\s*([^(\[]+)/i);
      if (fallbackMatch) {
        let department = fallbackMatch[1].trim();

        // Remove any trailing content in brackets or parentheses
        department = department.replace(/\s*[\[\(].*$/, '');

        // Apply the same capitalization rules for fallback
        department = department
          .trim()
          .split(' ')
          .map((word, index) => {
            const lowerWord = word.toLowerCase();
            const lowercaseWords = ['and', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'the', 'a', 'an', '&'];

            if (index > 0 && lowercaseWords.includes(lowerWord)) {
              return lowerWord;
            }

            // Handle special cases for abbreviations
            if (lowerWord === 'it' || lowerWord === 'ai' || lowerWord === 'ml') {
              return lowerWord.toUpperCase();
            }

            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          })
          .join(' ');

        return department;
      }

      // Final fallback: try to extract just the department name from any format
      // Look for department names that might not follow the Ph.d. pattern
      let cleanProgram = program.trim();

      // Remove content in brackets and parentheses
      cleanProgram = cleanProgram.replace(/\s*[\[\(].*?[\]\)]/g, '');

      // If it starts with Ph.d. or similar, try to extract after the dash
      const simpleDashMatch = cleanProgram.match(/^(?:ph\.?d\.?|phd)\s*[-:]?\s*(.+)/i);
      if (simpleDashMatch) {
        cleanProgram = simpleDashMatch[1].trim();
      }

      // Apply capitalization rules
      if (cleanProgram && cleanProgram !== program) {
        cleanProgram = cleanProgram
          .split(' ')
          .map((word, index) => {
            const lowerWord = word.toLowerCase();
            const lowercaseWords = ['and', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'the', 'a', 'an', '&'];

            if (index > 0 && lowercaseWords.includes(lowerWord)) {
              return lowerWord;
            }

            if (lowerWord === 'it' || lowerWord === 'ai' || lowerWord === 'ml') {
              return lowerWord.toUpperCase();
            }

            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          })
          .join(' ');

        return cleanProgram;
      }

      return program; // Return original if no pattern matches
    };

    return {
      id: record.id || index + 1,
      scholarName: record.registered_name || record.examiner_name || 'N/A',
      applicationNo: record.application_no || 'N/A',
      department: record.department || 'N/A',
      type: record.type || record.program_type || 'N/A',
      writtenMarks: record.written_marks || 0,
      vivaMarks: record.interview_marks || 0,
      // Check if marks are pending (null/undefined in database)
      isWrittenMarksPending: record.faculty_written === null || record.faculty_written === undefined,
      isVivaMarksPending: record.faculty_interview === null || record.faculty_interview === undefined,
      status: record.director_interview === 'Forwarded to Director' ? 'Forwarded' : 'Pending',
      directorInterviewStatus: record.director_interview || 'Pending',

      // All examination_records table fields for modal display
      form_name: record.form_name || 'PhD Application Form',
      registered_name: record.registered_name || '-',
      application_no: record.application_no || '-',
      institution: record.institution || '-',
      department: record.department || '-',
      type: record.type || record.program_type || '-',
      mobile_number: record.mobile_number || '-',
      email: record.email || '-',
      date_of_birth: record.date_of_birth || '-',
      gender: record.gender || '-',
      graduated_from_india: record.graduated_from_india || 'Yes',
      course: record.course || '-',
      employee_id: record.employee_id || '-',
      designation: record.designation || '-',
      organization_name: record.organization_name || '-',
      organization_address: record.organization_address || '-',
      differently_abled: record.differently_abled || 'No',
      nature_of_deformity: record.nature_of_deformity || '-',
      percentage_of_deformity: record.percentage_of_deformity || '-',
      nationality: record.nationality || 'Indian',
      aadhaar_no: record.aadhaar_no || '-',
      mode_of_profession: record.mode_of_profession || '-',
      area_of_interest: record.area_of_interest || '-',
      ug_qualification: record.ug_qualification || '-',
      ug_institute: record.ug_institute || '-',
      ug_degree: record.ug_degree || '-',
      ug_specialization: record.ug_specialization || '-',
      ug_marking_scheme: record.ug_marking_scheme || '-',
      ug_cgpa: record.ug_cgpa || '-',
      ug_month_year: record.ug_month_year || '-',
      ug_registration_no: record.ug_registration_no || '-',
      ug_mode_of_study: record.ug_mode_of_study || '-',
      ug_place_of_institution: record.ug_place_of_institution || '-',
      pg_qualification: record.pg_qualification || '-',
      pg_institute: record.pg_institute || '-',
      pg_degree: record.pg_degree || '-',
      pg_specialization: record.pg_specialization || '-',
      pg_marking_scheme: record.pg_marking_scheme || '-',
      pg_cgpa: record.pg_cgpa || '-',
      pg_month_year: record.pg_month_year || '-',
      pg_registration_no: record.pg_registration_no || '-',
      pg_mode_of_study: record.pg_mode_of_study || '-',
      pg_place_of_institution: record.pg_place_of_institution || '-',
      other_qualification: record.other_qualification || '-',
      other_institute: record.other_institute || '-',
      other_degree: record.other_degree || '-',
      other_specialization: record.other_specialization || '-',
      other_marking_scheme: record.other_marking_scheme || '-',
      other_cgpa: record.other_cgpa || '-',
      other_month_year: record.other_month_year || '-',
      other_registration_no: record.other_registration_no || '-',
      other_mode_of_study: record.other_mode_of_study || '-',
      other_place_of_institution: record.other_place_of_institution || '-',
      competitive_exam: record.competitive_exam || 'No',
      exam1_name: record.exam1_name || '-',
      exam1_reg_no: record.exam1_reg_no || '-',
      exam1_score: record.exam1_score || '-',
      exam1_max_score: record.exam1_max_score || '-',
      exam1_year: record.exam1_year || '-',
      exam1_rank: record.exam1_rank || '-',
      exam1_qualified: record.exam1_qualified || '-',
      exam2_name: record.exam2_name || '-',
      exam2_reg_no: record.exam2_reg_no || '-',
      exam2_score: record.exam2_score || '-',
      exam2_max_score: record.exam2_max_score || '-',
      exam2_year: record.exam2_year || '-',
      exam2_rank: record.exam2_rank || '-',
      exam2_qualified: record.exam2_qualified || '-',
      exam3_name: record.exam3_name || '-',
      exam3_reg_no: record.exam3_reg_no || '-',
      exam3_score: record.exam3_score || '-',
      exam3_max_score: record.exam3_max_score || '-',
      exam3_year: record.exam3_year || '-',
      exam3_rank: record.exam3_rank || '-',
      exam3_qualified: record.exam3_qualified || '-',
      reasons_for_applying: record.reasons_for_applying || '-',
      research_interest: record.research_interest || '-',
      user_id: record.user_id || '-',
      certificates: record.certificates || '-',
      status_col: record.status || 'pending',
      faculty: record.faculty || '-',
      department_col: record.department || '-',
      cgpa: record.cgpa || '-',
      current_owner: record.current_owner || '-',
      created_at: record.created_at || '-',
      updated_at: record.updated_at || '-',
      dept_result: record.dept_result || '-',
      examiner1: record.examiner1 || '-',
      written_marks: record.written_marks || '-',
      interview_marks: record.interview_marks || '-',
      total_marks: record.total_marks || '-',
      examiner2: record.examiner2 || '-',
      examiner3: record.examiner3 || '-',
      panel: record.panel || '-',
      examiner1_marks: record.examiner1_marks || '-',
      examiner2_marks: record.examiner2_marks || '-',
      examiner3_marks: record.examiner3_marks || '-',
      faculty_interview: record.faculty_interview || '-',
      faculty_written: record.faculty_written || '-',
      director_interview: record.director_interview || '-',
      written_marks_100: record.written_marks_100 || '-',
      result_dir: record.result_dir || '-',
    };
  });

  // Get unique departments - extract from program field properly
  const getUniqueDepartments = () => {
    const depts = new Set(['All Departments']);
    examData.forEach(exam => {
      if (exam.department && exam.department !== 'N/A') {
        depts.add(exam.department);
      }
    });
    return Array.from(depts).sort();
  };

  // Get unique types
  const getUniqueTypes = () => {
    const types = new Set(['All Types']);
    examData.forEach(exam => {
      if (exam.type && exam.type !== 'N/A') {
        types.add(exam.type);
      }
    });
    return Array.from(types).sort();
  };

  // Get unique statuses
  const getUniqueStatuses = () => {
    return ['All Status', 'Pending', 'Forwarded'];
  };

  const filteredExamData = examData
    .filter(exam => {
      const matchesSearch = exam.scholarName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.applicationNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.department.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDepartment = departmentFilter === 'All Departments' || exam.department === departmentFilter;
      const matchesType = typeFilter === 'All Types' || exam.type === typeFilter;
      const matchesStatus = statusFilter === 'All Status' || exam.status === statusFilter;

      return matchesSearch && matchesDepartment && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Special handling for status sorting
      if (sortField === 'status') {
        // Forwarded = 1, Pending = 0 for priority sorting
        aValue = aValue === 'Forwarded' ? 1 : 0;
        bValue = bValue === 'Forwarded' ? 1 : 0;

        if (sortDirection === 'asc') {
          // Forwarded (1) first, Pending (0) last
          return bValue - aValue;
        } else {
          // Pending (0) first, Forwarded (1) last
          return aValue - bValue;
        }
      }

      // Existing logic for other fields
      if (sortField === 'writtenMarks' || sortField === 'vivaMarks') {
        // All marks are now numeric values
        aValue = parseInt(aValue) || 0;
        bValue = parseInt(bValue) || 0;
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Checkbox Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select all filtered records
      const allIds = filteredExamData.map(exam => exam.id);
      setSelectedScholarIds(allIds);
    } else {
      setSelectedScholarIds([]);
    }
  };

  const handleSelectOne = (e, scholarId) => {
    if (e.target.checked) {
      setSelectedScholarIds(prev => [...prev, scholarId]);
    } else {
      setSelectedScholarIds(prev => prev.filter(id => id !== scholarId));
    }
  };

  // Forward selected scholars to director
  const handleForwardToDirector = async () => {
    if (selectedScholarIds.length === 0) {
      setPopupTitle('No Selection');
      setPopupMessage('Please select scholars to forward.');
      setShowPopup(true);
      return;
    }

    const scholarsToForward = filteredExamData.filter(exam =>
      selectedScholarIds.includes(exam.id) && exam.status !== 'Forwarded'
    );

    if (scholarsToForward.length === 0) {
      setPopupTitle('No Eligible Scholars');
      setPopupMessage('No eligible scholars selected for forwarding.');
      setShowPopup(true);
      return;
    }

    // Check if any selected scholars have pending viva marks (interview marks only)
    const scholarsWithPendingVivaMarks = scholarsToForward.filter(exam =>
      exam.isVivaMarksPending
    );

    if (scholarsWithPendingVivaMarks.length > 0) {
      setPopupTitle('Pending Viva Marks');
      setPopupMessage(`Cannot forward scholars with pending viva marks. ${scholarsWithPendingVivaMarks.length} scholar(s) have pending viva marks.`);
      setShowPopup(true);
      return;
    }

    // Show confirmation modal
    setConfirmMessage(`Forward ${scholarsToForward.length} scholar(s) to Director?`);
    setActionType('forwardToDirector');
    setConfirmAction(() => async () => {
      await performForwardToDirector(scholarsToForward);
    });
    setShowConfirmModal(true);
  };

  const performForwardToDirector = async (scholarsToForward) => {
    try {
      // Update director_interview status for selected scholars
      const updatePromises = scholarsToForward.map(scholar =>
        updateDirectorInterviewStatus(scholar.id, 'Forwarded to Director')
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        setPopupTitle('Forward Error');
        setPopupMessage(`${errors.length} scholar(s) failed to forward. Please try again.`);
        setShowPopup(true);
        return;
      }

      // Refresh the examination records
      if (assignedFaculty) {
        const { data: examRecords, error } = await fetchFacultyExaminationRecords(assignedFaculty);
        if (!error && examRecords) {
          setExaminationRecords(examRecords);
        }
      }

      setSelectedScholarIds([]);
      setShowConfirmModal(false);

      // Show success message
      setSuccessMessage(`${scholarsToForward.length} scholar(s) successfully forwarded to the admin!`);
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error forwarding scholars:', err);
      setPopupTitle('System Error');
      setPopupMessage('An error occurred while forwarding scholars.');
      setShowPopup(true);
    }
  };

  const handleContinueConfirm = () => {
    if (!confirmAgreed) return;
    if (typeof confirmAction === 'function') {
      // Handle the forwardToDirector action (function)
      confirmAction();
    }
    setConfirmAction(null);
    setConfirmAgreed(false);
  };

  const handleCloseConfirm = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
    setConfirmAgreed(false);
  };

  const handleSuccessOk = () => {
    setShowSuccessModal(false);
  };

  const handleFilterClick = () => setShowFilterModal(true);
  const closeFilterModal = () => setShowFilterModal(false);
  const applyFilters = () => setShowFilterModal(false);
  const clearFilters = () => {
    setDepartmentFilter('All Departments');
    setTypeFilter('All Types');
    setStatusFilter('All Status');
  };

  // Download examination records as Excel
  const handleDownloadExcel = () => {
    setShowDownloadModal(true);
  };

  const performDownload = (type, count) => {
    try {
      let dataToDownload = filteredExamData;
      if (type === 'selected') {
        dataToDownload = filteredExamData.filter(exam => selectedScholarIds.includes(exam.id));
      } else if (type === 'specific' && count) {
        dataToDownload = filteredExamData.slice(0, count);
      }

      const excelData = dataToDownload.map((exam) => ({
        'Application No': exam.applicationNo || '-',
        'Scholar Name': exam.scholarName || '-',
        'Department': exam.department || '-',
        'Type': exam.type || '-',
        'Status': exam.status || '-',
        'Written Marks': exam.writtenMarks || 0,
        'Interview Marks': exam.vivaMarks || 0,
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Examination Records');

      // Set column widths
      worksheet['!cols'] = [
        { wch: 18 }, // Application No
        { wch: 25 }, // Scholar Name
        { wch: 30 }, // Department
        { wch: 8 },  // Type
        { wch: 12 }, // Status
        { wch: 15 }, // Written Marks
        { wch: 15 }  // Interview Marks
      ];

      XLSX.writeFile(workbook, `Examination_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
      setShowDownloadModal(false);
    } catch (err) {
      console.error('Error downloading Excel:', err);
      setPopupTitle('Download Error');
      setPopupMessage('Failed to download examination records.');
      setShowPopup(true);
    }
  };

  const handleSortClick = (field) => {
    if (field !== sortField) {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleToggleSortDirection = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const handleViewScholar = (scholar) => {
    setSelectedScholar(scholar);
    setShowViewModal(true);
  };

  const columns = [
    { key: 'select', label: 'SELECT', sortable: false, alignment: 'center' },
    { key: 'index', label: 'S.NO.', sortable: false, alignment: 'center' },
    { key: 'applicationNo', label: 'APPLICATION NO.', sortable: true, alignment: 'left' },
    { key: 'scholarName', label: 'REGISTERED NAME', sortable: true, alignment: 'left' },
    { key: 'department', label: 'DEPARTMENT', sortable: true, alignment: 'left' },
    { key: 'type', label: 'TYPE', sortable: true, alignment: 'left' },
    { key: 'writtenMarks', label: 'WRITTEN MARKS', sortable: true, alignment: 'center' },
    { key: 'vivaMarks', label: 'INTERVIEW MARKS', sortable: true, alignment: 'center' },
    { key: 'status', label: 'STATUS', sortable: true, alignment: 'center' },
  ];

  return (
    <div className="examination-page">
      <div className="examination-container">
        <div className="scholar-header-section">
          <h1 className="scholar-page-title">Examination</h1>
          <div className="scholar-controls-section">
            <div className="scholar-search-container">
              <input
                type="text"
                placeholder="Search by student..."
                className="scholar-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              title="Sort Direction"
              className="scholar-control-button"
              onClick={handleToggleSortDirection}
            >
              <ArrowUpDown size={20} />
            </button>
            <button
              title="Filter"
              className="scholar-control-button"
              onClick={handleFilterClick}
            >
              <SlidersHorizontal size={20} />
            </button>
          </div>
        </div>

        {isLoadingExaminations ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            Loading examination records...
          </div>
        ) : (
          <>
            <div className="scholar-action-buttons">
              <button
                className="action-btn forward-btn"
                onClick={handleForwardToDirector}
                title="Forward Selected"
                style={{ backgroundColor: '#10b981', color: 'white', cursor: 'pointer' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
              >
                <Send size={16} />
                Forward
              </button>
              <button
                className="action-btn download-btn"
                onClick={handleDownloadExcel}
                title="Download Examination Records"
                style={{ backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', marginLeft: '0.5rem' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
              >
                <Download size={16} />
                Download
              </button>
            </div>

            <div style={tableStyles.container}>
              <table style={tableStyles.table}>
                <thead style={tableStyles.thead}>
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        onClick={col.sortable ? () => handleSortClick(col.key) : undefined}
                        style={{
                          ...tableStyles.th,
                          textAlign: col.alignment,
                          cursor: col.sortable ? 'pointer' : 'default',
                        }}
                      >
                        {col.key === 'select' ? (
                          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="checkbox"
                              className="table-checkbox"
                              onChange={handleSelectAll}
                              checked={
                                filteredExamData.length > 0 &&
                                selectedScholarIds.length === filteredExamData.length
                              }
                              style={{ margin: '0' }}
                            />
                          </div>
                        ) : (
                          col.label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredExamData.length > 0 ? (
                    filteredExamData.map((exam, index) => (
                      <tr key={exam.id} style={tableStyles.row}>
                        <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            className="table-checkbox"
                            checked={selectedScholarIds.includes(exam.id)}
                            onChange={(e) => handleSelectOne(e, exam.id)}
                            style={{ margin: '0' }}
                          />
                        </td>
                        <td style={{ ...tableStyles.td, textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ ...tableStyles.td, textAlign: 'left' }}>{exam.applicationNo}</td>
                        <td style={{ ...tableStyles.td, textAlign: 'left' }}>
                          <span style={tableStyles.scholarName}>{exam.scholarName}</span>
                        </td>
                        <td style={{ ...tableStyles.td, textAlign: 'left' }}>{exam.department}</td>
                        <td style={{ ...tableStyles.td, textAlign: 'left' }}>
                          {exam.type}
                        </td>
                        <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                          <span style={{
                            color: exam.isWrittenMarksPending ? '#9ca3af' :
                              (exam.writtenMarks >= 35 ? '#16a34a' : '#dc2626'), // Green if >= 35, Red if < 35
                            fontWeight: '600',
                            fontSize: '13px'
                          }}>
                            {exam.isWrittenMarksPending ? 'Pending' : exam.writtenMarks}
                          </span>
                        </td>
                        <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                          <span style={{
                            color: exam.isVivaMarksPending ? '#9ca3af' :
                              (exam.vivaMarks >= 15 ? '#16a34a' : '#dc2626'), // Green if >= 15, Red if < 15
                            fontWeight: '600',
                            fontSize: '13px'
                          }}>
                            {exam.isVivaMarksPending ? 'Pending' : exam.vivaMarks}
                          </span>
                        </td>
                        <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: exam.status === 'Forwarded' ? '#dcfce7' : '#fef3c7',
                            color: exam.status === 'Forwarded' ? '#16a34a' : '#b45309'
                          }}>
                            {exam.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" style={tableStyles.noData}>
                        {examinationRecords.length === 0 ?
                          'No examination records found for this faculty.' :
                          'No examination data matches your search criteria.'
                        }
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* View Modal */}
      {showViewModal && selectedScholar && (
        <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto" style={{ margin: 'auto', position: 'relative', zIndex: 10000, border: '1px solid #d1d5db' }}>
            <div className="sticky top-0 bg-white border-b border-gray-300 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Scholar Details</h2>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Basic Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label">Form Name:</label>
                    <span className="view-value">{selectedScholar.form_name || 'PhD Application Form'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Registered Name:</label>
                    <span className="view-value">{selectedScholar.registered_name || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Application No:</label>
                    <span className="view-value">{selectedScholar.application_no || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Have You Graduated From India?:</label>
                    <span className="view-value">{selectedScholar.graduated_from_india || 'Yes'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Course:</label>
                    <span className="view-value">{selectedScholar.course || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Select Institution:</label>
                    <span className="view-value">{selectedScholar.institution || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Department:</label>
                    <span className="view-value">{selectedScholar.department_col || selectedScholar.department || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Type:</label>
                    <span className="view-value">{selectedScholar.program_type || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Certificates Drive Link:</label>
                    {selectedScholar.certificates ? (
                      <a href={selectedScholar.certificates} target="_blank" rel="noopener noreferrer" className="view-value text-blue-600 hover:underline">View Certificates</a>
                    ) : (
                      <span className="view-value text-gray-500">-</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label">Mobile Number:</label>
                    <span className="view-value">{selectedScholar.mobile_number || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Email ID:</label>
                    <span className="view-value">{selectedScholar.email || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Date Of Birth:</label>
                    <span className="view-value">{selectedScholar.date_of_birth || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Gender:</label>
                    <span className="view-value">{selectedScholar.gender || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Nationality:</label>
                    <span className="view-value">{selectedScholar.nationality || 'Indian'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Aadhaar Card No.:</label>
                    <span className="view-value">{selectedScholar.aadhaar_no || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Application Status */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">Application Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label">Status:</label>
                    <span className="view-value">{selectedScholar.status || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Faculty:</label>
                    <span className="view-value">{selectedScholar.faculty || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Department:</label>
                    <span className="view-value">{selectedScholar.department_col || selectedScholar.department || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Type:</label>
                    <span className="view-value">{selectedScholar.type || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">User Id:</label>
                    <span className="view-value">{selectedScholar.user_id || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Current Owner:</label>
                    <span className="view-value">{selectedScholar.current_owner || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Employment Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">Employment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label">Employee Id:</label>
                    <span className="view-value">{selectedScholar.employee_id || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Designation:</label>
                    <span className="view-value">{selectedScholar.designation || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Organization Name:</label>
                    <span className="view-value">{selectedScholar.organization_name || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Organization Address:</label>
                    <span className="view-value">{selectedScholar.organization_address || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Mode Of Profession:</label>
                    <span className="view-value">{selectedScholar.mode_of_profession || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Area Of Interest:</label>
                    <span className="view-value">{selectedScholar.area_of_interest || '-'}</span>
                  </div>
                </div>
              </div>
              {/* Additional Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label">Differently Abled:</label>
                    <span className="view-value">{selectedScholar.differently_abled || 'No'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Nature Of Deformity:</label>
                    <span className="view-value">{selectedScholar.nature_of_deformity || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Percentage Of Deformity:</label>
                    <span className="view-value">{selectedScholar.percentage_of_deformity || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">CGPA:</label>
                    <span className="view-value">{selectedScholar.cgpa || '-'}</span>
                  </div>
                </div>
              </div>

              {/* UG Education Details */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">UG - Education Qualification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label">UG - Current Education Qualification:</label>
                    <span className="view-value">{selectedScholar.ug_qualification || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Institute Name:</label>
                    <span className="view-value">{selectedScholar.ug_institute || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Degree:</label>
                    <span className="view-value">{selectedScholar.ug_degree || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Specialization:</label>
                    <span className="view-value">{selectedScholar.ug_specialization || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Marking Scheme:</label>
                    <span className="view-value">{selectedScholar.ug_marking_scheme || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - CGPA Or Percentage:</label>
                    <span className="view-value">{selectedScholar.ug_cgpa || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Month & Year:</label>
                    <span className="view-value">{selectedScholar.ug_month_year || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Registration No.:</label>
                    <span className="view-value">{selectedScholar.ug_registration_no || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Mode Of Study:</label>
                    <span className="view-value">{selectedScholar.ug_mode_of_study || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Place Of The Institution:</label>
                    <span className="view-value">{selectedScholar.ug_place_of_institution || '-'}</span>
                  </div>
                </div>
              </div>

              {/* PG Education Details */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">PG - Education Qualification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label">PG - Current Education Qualification:</label>
                    <span className="view-value">{selectedScholar.pg_qualification || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Institute Name:</label>
                    <span className="view-value">{selectedScholar.pg_institute || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Degree:</label>
                    <span className="view-value">{selectedScholar.pg_degree || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Specialization:</label>
                    <span className="view-value">{selectedScholar.pg_specialization || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Marking Scheme:</label>
                    <span className="view-value">{selectedScholar.pg_marking_scheme || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - CGPA Or Percentage:</label>
                    <span className="view-value">{selectedScholar.pg_cgpa || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Month & Year:</label>
                    <span className="view-value">{selectedScholar.pg_month_year || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Registration No.:</label>
                    <span className="view-value">{selectedScholar.pg_registration_no || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Mode Of Study:</label>
                    <span className="view-value">{selectedScholar.pg_mode_of_study || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Place Of The Institution:</label>
                    <span className="view-value">{selectedScholar.pg_place_of_institution || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Other Degree Education Details */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">Other Degree - Education Qualification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label">Other Degree - Current Education Qualification:</label>
                    <span className="view-value">{selectedScholar.other_qualification || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Other Degree - Institute Name:</label>
                    <span className="view-value">{selectedScholar.other_institute || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Other Degree - Degree:</label>
                    <span className="view-value">{selectedScholar.other_degree || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Other Degree - Specialization:</label>
                    <span className="view-value">{selectedScholar.other_specialization || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Other Degree - Marking Scheme:</label>
                    <span className="view-value">{selectedScholar.other_marking_scheme || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Other Degree - CGPA Or Percentage:</label>
                    <span className="view-value">{selectedScholar.other_cgpa || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Other Degree - Month & Year:</label>
                    <span className="view-value">{selectedScholar.other_month_year || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Other Degree - Registration No.:</label>
                    <span className="view-value">{selectedScholar.other_registration_no || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Other Degree - Mode Of Study:</label>
                    <span className="view-value">{selectedScholar.other_mode_of_study || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Other Degree - Place Of The Institution:</label>
                    <span className="view-value">{selectedScholar.other_place_of_institution || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Competitive Exams */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">Competitive Exams</h3>
                <div className="mb-4">
                  <div className="view-field">
                    <label className="view-label">Have You Taken Any Competitive Exam?:</label>
                    <span className="view-value">{selectedScholar.competitive_exam || 'No'}</span>
                  </div>
                </div>

                {/* Exam 1 */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-800 mb-3">1. Exam Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="view-field">
                      <label className="view-label">1. - Name Of The Exam:</label>
                      <span className="view-value">{selectedScholar.exam1_name || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">1. - Registration No./Roll No.:</label>
                      <span className="view-value">{selectedScholar.exam1_reg_no || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">1. - Score Obtained:</label>
                      <span className="view-value">{selectedScholar.exam1_score || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">1. - Max Score:</label>
                      <span className="view-value">{selectedScholar.exam1_max_score || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">1. - Year Appeared:</label>
                      <span className="view-value">{selectedScholar.exam1_year || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">1. - AIR/Overall Rank:</label>
                      <span className="view-value">{selectedScholar.exam1_rank || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">1. - Qualified/Not Qualified:</label>
                      <span className="view-value">{selectedScholar.exam1_qualified || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Exam 2 */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-800 mb-3">2. Exam Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="view-field">
                      <label className="view-label">2. - Name Of The Exam:</label>
                      <span className="view-value">{selectedScholar.exam2_name || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">2. - Registration No./Roll No.:</label>
                      <span className="view-value">{selectedScholar.exam2_reg_no || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">2. - Score Obtained:</label>
                      <span className="view-value">{selectedScholar.exam2_score || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">2. - Max Score:</label>
                      <span className="view-value">{selectedScholar.exam2_max_score || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">2. - Year Appeared:</label>
                      <span className="view-value">{selectedScholar.exam2_year || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">2. - AIR/Overall Rank:</label>
                      <span className="view-value">{selectedScholar.exam2_rank || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">2. - Qualified/Not Qualified:</label>
                      <span className="view-value">{selectedScholar.exam2_qualified || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Exam 3 */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-800 mb-3">3. Exam Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="view-field">
                      <label className="view-label">3. - Name Of The Exam:</label>
                      <span className="view-value">{selectedScholar.exam3_name || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">3. - Registration No./Roll No.:</label>
                      <span className="view-value">{selectedScholar.exam3_reg_no || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">3. - Score Obtained:</label>
                      <span className="view-value">{selectedScholar.exam3_score || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">3. - Max Score:</label>
                      <span className="view-value">{selectedScholar.exam3_max_score || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">3. - Year Appeared:</label>
                      <span className="view-value">{selectedScholar.exam3_year || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">3. - AIR/Overall Rank:</label>
                      <span className="view-value">{selectedScholar.exam3_rank || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">3. - Qualified/Not Qualified:</label>
                      <span className="view-value">{selectedScholar.exam3_qualified || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Research Interest & Essays */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">Research Interest & Essays</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="view-field">
                    <label className="view-label">Describe In 300 Words; Your Reasons For Applying To The Proposed Program; Your Study Interests/future Career Plans, And Other Interests That Drives You To Apply To The Program.:</label>
                    <span className="view-value" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{selectedScholar.reasons_for_applying || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Title And Abstract Of The Master Degree Thesis And Your Research Interest In 500 Words:</label>
                    <span className="view-value" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{selectedScholar.research_interest || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md w-full">
            <h3 className="text-2xl font-bold mb-3">Confirm Forwarding</h3>
            <div className="mb-4 border rounded-lg p-4 bg-gray-50">
              <div className="text-sm text-gray-600">Admin Name: <span className="font-semibold">{coordinatorInfo?.name || 'Research Coordinator'}</span></div>
              <div className="text-sm text-gray-600">Role: <span className="font-semibold">Research Coordinator, {coordinatorInfo?.faculty || 'Faculty'}</span></div>
              <div className="text-sm text-gray-600">Email: <a href={`mailto:${coordinatorInfo?.email || ''}`} className="text-sky-600">{coordinatorInfo?.email || 'Not available'}</a></div>
            </div>
            <div className="mb-4">
              <h4 className="font-bold">Consent & Confirmation</h4>
              <ul className="list-disc list-inside text-sm text-gray-700 mt-2 space-y-1">
                <li>I have thoroughly reviewed all submitted data</li>
                <li>I have verified the authenticity of documents</li>
                <li>This action will be recorded in the system</li>
              </ul>
            </div>
            <div className="mb-4">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="mt-1" checked={confirmAgreed} onChange={e => setConfirmAgreed(e.target.checked)} />
                <span className="text-sm whitespace-nowrap">I confirm I have read and agree to the above terms</span>
              </label>
            </div>
            <div className="mb-6 text-sm text-gray-700">You are about to <span className="font-bold">FORWARD</span> {selectedScholarIds.length} examination record{selectedScholarIds.length !== 1 ? 's' : ''} to the admin for further processing.</div>
            <div className="flex justify-end gap-3">
              <button onClick={handleCloseConfirm} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
              <button onClick={handleContinueConfirm} disabled={!confirmAgreed} className={`py-2 px-4 rounded-lg font-bold text-white ${confirmAgreed ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-95' : 'bg-gray-300 cursor-not-allowed'}`}>{actionType === 'forwardToDirector' ? 'Forward' : 'Continue'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <MessageBox
        show={showSuccessModal}
        title="Notification"
        message={successMessage}
        type="success"
        onClose={handleSuccessOk}
      />

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="examination-modal-overlay">
          <div className="examination-modal">
            <div className="examination-modal-header">
              <h3>Filter Options</h3>
              <button className="examination-modal-close" onClick={closeFilterModal}>✕</button>
            </div>
            <div className="examination-modal-body">
              <div className="examination-filter-group">
                <label>Department</label>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="examination-filter-select"
                >
                  {getUniqueDepartments().map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="examination-filter-group">
                <label>Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="examination-filter-select"
                >
                  {getUniqueTypes().map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="examination-filter-group">
                <label>Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="examination-filter-select"
                >
                  {getUniqueStatuses().map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="examination-modal-footer">
              <button className="examination-btn examination-btn-clear" onClick={clearFilters}>Clear All</button>
              <button className="examination-btn examination-btn-apply" onClick={applyFilters}>Apply Filters</button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Message Box */}
      <MessageBox
        show={showPopup}
        title={popupTitle}
        message={popupMessage}
        onClose={() => setShowPopup(false)}
      />
      <DownloadSelectionModal
        show={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={performDownload}
        totalRows={filteredExamData.length}
        selectedCount={selectedScholarIds.length}
      />
    </div>
  );
};

export default ScholarExamDistribution;
