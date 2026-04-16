import { useState } from 'react';
import { SlidersHorizontal, ChevronRight, X, Eye, Send, ArrowUpDown, Download } from 'lucide-react';
import { useAppContext } from '../App';
import * as XLSX from 'xlsx';
import RankListModal from './RankListModal';
import MessageBox from './Modals/MessageBox';
import DownloadSelectionModal from './Modals/DownloadSelectionModal';
import { createPortal } from 'react-dom';
import { supabase } from '../../../supabaseClient';
import './Results.css';

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

const Results = () => {
  const { departmentsData, examinationsData, isLoadingSupabase, assignedFaculty, coordinatorInfo, coordinatorName } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFaculty, setExpandedFaculty] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [modal, setModal] = useState(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showPublishSuccess, setShowPublishSuccess] = useState(false);
  const [publishDepartment, setPublishDepartment] = useState(null);
  const [publishedDepartments, setPublishedDepartments] = useState(new Set());
  const [showPublishAllConfirm, setShowPublishAllConfirm] = useState(false);
  const [showPublishAllSuccess, setShowPublishAllSuccess] = useState(false);
  const [publishAllCount, setPublishAllCount] = useState(0);
  const [isPublishConfirmed, setIsPublishConfirmed] = useState(false);
  const [isPublishAllConfirmed, setIsPublishAllConfirmed] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadDepartment, setDownloadDepartment] = useState(null);

  // MessageBox state
  const [messageBox, setMessageBox] = useState({ show: false, title: '', message: '', type: 'info' });

  // New state for sorting and filtering
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    department: 'all', // 'all' or specific department name
    publishStatus: 'all' // 'all', 'published', 'unpublished'
  });

  // Helper function to extract department name from program string - IMPROVED
  const extractDepartmentFromProgram = (program) => {
    if (!program || program === 'N/A') return '';

    // If it's a faculty name like "Faculty of Engineering & Technology", extract the main part
    if (program.includes('Faculty of')) {
      const match = program.match(/Faculty of (.+)/i);
      if (match) return match[1].trim();
    }

    // ROBUST REGEX: Match anything before parenthetical info or after a dash
    // Example: "Ph.d. - Mechanical Engineering (ph.d. - Ft - E And T)" => "Mechanical Engineering"
    const regexMatch = program.match(/^[^-]+-\s*([^(]+)/i);
    if (regexMatch && regexMatch[1]) {
      return regexMatch[1].trim();
    }

    // Try alternative patterns for simpler strings
    const altMatch = program.match(/([A-Za-z\s]+Engineering|[A-Za-z\s]+Science|[A-Za-z\s]+Technology|[A-Za-z\s]+Management)/i);
    if (altMatch) return altMatch[1].trim();

    // Fallback: remove parentheses
    return program.split('(')[0].trim();
  };

  // Helper function to normalize names for comparison
  const normalizeName = (name) => {
    if (!name) return '';
    return name.toString().toLowerCase()
      .replace(/&/g, 'and')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Create faculty object from Supabase departments data - USING IMPROVED FLEXIBLE LOGIC
  const getPublishedDepartments = () => {
    if (!departmentsData || !examinationsData || examinationsData.length === 0) {
      return [];
    }

    const normalizedAssignedFaculty = normalizeName(assignedFaculty);
    const facultyDepartments = departmentsData.filter(d =>
      normalizeName(d.faculty) === normalizedAssignedFaculty ||
      normalizedAssignedFaculty.includes(normalizeName(d.faculty)) ||
      normalizeName(d.faculty).includes(normalizedAssignedFaculty)
    );

    return facultyDepartments.filter(dept => {
      const normalizedDeptName = normalizeName(dept.department_name);
      return examinationsData.some(record => {
        // Use department field if available, fallback to extraction
        const recordDept = normalizeName(record.department && record.department !== '-' ? record.department : extractDepartmentFromProgram(record.program));

        // Flexible department match
        const isDepartmentMatch = recordDept === normalizedDeptName ||
          recordDept.includes(normalizedDeptName) ||
          normalizedDeptName.includes(recordDept);

        const isPublished = record.result_dir && record.result_dir.toLowerCase().includes('publish');
        return isDepartmentMatch && isPublished;
      });
    });
  };

  const filteredPublishedDepartments = getPublishedDepartments();

  const faculty = {
    id: 'current_faculty',
    name: assignedFaculty || 'Faculty',
    departments: filteredPublishedDepartments.map(dept => ({
      id: dept.id,
      name: dept.department_name
    }))
  };

  // Show loading state if departments are still being fetched
  if (isLoadingSupabase) {
    return (
      <div className="results-container">
        <div className="results-header">
          <h2>Result</h2>
        </div>
        <div className="results-content">
          <div className="loading-state">
            <p>Loading departments...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no published departments found for this faculty
  if (!filteredPublishedDepartments || filteredPublishedDepartments.length === 0) {
    return (
      <div className="results-container">
        <div className="results-header">
          <h2>Result</h2>
        </div>
        <div className="results-content">
          <div className="no-departments">
            <p>No published results found for {assignedFaculty || 'this faculty'}.</p>
          </div>
        </div>
      </div>
    );
  }

  // Helper function to get the total number of scholars for a faculty
  const getScholarCountForFaculty = (facultyDepartments) => {
    if (!examinationsData || examinationsData.length === 0) return 0;

    const deptNames = facultyDepartments.map(d => normalizeName(d.name));
    return examinationsData.filter(record => {
      const recordDepartment = normalizeName(record.department && record.department !== '-' ? record.department : extractDepartmentFromProgram(record.program));
      const departmentMatch = deptNames.some(deptName =>
        recordDepartment.includes(deptName) ||
        deptName.includes(recordDepartment)
      );

      const isPublished = record.result_dir && record.result_dir.toLowerCase().includes('publish');

      const hasTotalMarks = (record.total_marks && parseFloat(record.total_marks) > 0) ||
        (record.total_marks === 'Absent') ||
        (record.written_marks === 'Ab' || record.interview_marks === 'Ab') ||
        (record.written_marks && parseFloat(record.written_marks) > 0) ||
        (record.interview_marks && parseFloat(record.interview_marks) > 0);

      return departmentMatch && isPublished && hasTotalMarks;
    }).length;
  };

  // Filter and sort departments based on current criteria
  const getFilteredAndSortedDepartments = () => {
    let departments = [...faculty.departments];

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      departments = departments.filter(dept => dept.name.toLowerCase().includes(searchLower));
    }

    if (filters.department !== 'all') {
      departments = departments.filter(dept => dept.name === filters.department);
    }

    if (filters.publishStatus !== 'all') {
      departments = departments.filter(dept => {
        const isPublished = publishedDepartments.has(dept.id);
        return filters.publishStatus === 'published' ? isPublished : !isPublished;
      });
    }

    departments.sort((a, b) => {
      const nameA = (a.name || '').toString();
      const nameB = (b.name || '').toString();
      return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

    return departments;
  };

  // Handle sort button click
  const handleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // Handle filter modal
  const handleShowFilter = () => {
    setShowFilterModal(true);
  };

  const handleCloseFilter = () => {
    setShowFilterModal(false);
  };

  const handleApplyFilters = () => {
    setShowFilterModal(false);
  };

  const handleClearFilters = () => {
    setFilters({
      department: 'all',
      publishStatus: 'all'
    });
  };

  const handleFacultyClick = (facultyId) => {
    if (expandedFaculty === facultyId) {
      setExpandedFaculty(null);
      setSelectedDepartment(null);
    } else {
      setExpandedFaculty(facultyId);
      setSelectedDepartment(null);
    }
  };



  const handleBackToFaculty = () => {
    setSelectedDepartment(null);
  };

  const handleViewFTRanks = (department) => {
    const ftScholars = getScholarsForDepartment(department.name, 'Full Time');

    const modalData = {
      deptName: department.name,
      scholarType: 'Full Time',
      rows: ftScholars.map((scholar, index) => ({
        id: scholar.id,
        rank: index + 1,
        name: scholar['Registered Name'] || scholar.registered_name || 'N/A',
        applicationNo: scholar['Application Number'] || scholar.application_no || 'N/A',
        written: scholar.writtenMarks === 'Ab' ? 'Ab' : (typeof scholar.writtenMarks === 'number' ? scholar.writtenMarks : Math.round(scholar.written_marks || 0)),
        viva: scholar.vivaMarks === 'Ab' ? 'Ab' : (typeof scholar.vivaMarks === 'number' ? scholar.vivaMarks : Math.round(scholar.interview_marks || 0)),
        total: scholar.totalMarks === 'Absent' ? 'Absent' : (typeof scholar.totalMarks === 'number' ? scholar.totalMarks : Math.round(scholar.total_marks || 0)),
        qualified: scholar.status === 'Qualified' || (scholar.totalMarks !== 'Absent' && scholar.status !== 'Absent' && (parseFloat(scholar.totalMarks || scholar.total_marks || 0) >= 60)),
        program: scholar.program || 'N/A'
      })),
      searchActive: false
    };
    setModal(modalData);
  };

  const handleViewPTRanks = (department) => {
    const ptScholars = getScholarsForDepartment(department.name, 'Part Time');

    const modalData = {
      deptName: department.name,
      scholarType: 'Part Time',
      rows: ptScholars.map((scholar, index) => ({
        id: scholar.id,
        rank: index + 1,
        name: scholar['Registered Name'] || scholar.registered_name || 'N/A',
        applicationNo: scholar['Application Number'] || scholar.application_no || 'N/A',
        partTimeDetails: scholar.originalType || scholar.type || 'Internal', // Show specific part-time type
        written: scholar.writtenMarks === 'Ab' ? 'Ab' : (typeof scholar.writtenMarks === 'number' ? scholar.writtenMarks : Math.round(scholar.written_marks || 0)),
        viva: scholar.vivaMarks === 'Ab' ? 'Ab' : (typeof scholar.vivaMarks === 'number' ? scholar.vivaMarks : Math.round(scholar.interview_marks || 0)),
        total: scholar.totalMarks === 'Absent' ? 'Absent' : (typeof scholar.totalMarks === 'number' ? scholar.totalMarks : Math.round(scholar.total_marks || 0)),
        qualified: scholar.status === 'Qualified' || (scholar.totalMarks !== 'Absent' && scholar.status !== 'Absent' && (parseFloat(scholar.totalMarks || scholar.total_marks || 0) >= 60)),
        program: scholar.program || 'N/A'
      })),
      searchActive: false
    };
    setModal(modalData);
  };



  const handlePublish = async (department) => {
    setPublishDepartment(department);
    setIsPublishConfirmed(false); // Reset confirmation state
    setShowPublishConfirm(true);
  };

  const confirmPublish = async () => {
    if (publishDepartment) {
      try {
        // Get department short form
        const deptShortForm = DEPARTMENT_MAPPING[publishDepartment.name] || publishDepartment.name;
        const publishValue = `Published_To_${deptShortForm}`;

        // Get all scholars for this department (both FT and PT)
        const ftScholars = getScholarsForDepartment(publishDepartment.name, 'Full Time');
        const ptScholars = getScholarsForDepartment(publishDepartment.name, 'Part Time');
        const allScholars = [...ftScholars, ...ptScholars];

        if (allScholars.length === 0) {
          setMessageBox({ show: true, title: 'Notification', message: 'No scholars found for this department to publish.', type: 'warning' });
          setShowPublishConfirm(false);
          setPublishDepartment(null);
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
          setPublishedDepartments(prev => new Set([...prev, publishDepartment.id]));
          setShowPublishSuccess(true);
        }
      } catch (error) {
        console.error('Exception during publish:', error);
        setMessageBox({ show: true, title: 'Notification', message: 'Error occurred while publishing results. Please try again.', type: 'error' });
      }

      setShowPublishConfirm(false);
    }
  };

  const cancelPublish = () => {
    setShowPublishConfirm(false);
    setPublishDepartment(null);
    setIsPublishConfirmed(false); // Reset confirmation state
  };

  const closeSuccessModal = () => {
    setShowPublishSuccess(false);
    setPublishDepartment(null);
  };

  const handlePublishAll = () => {
    const unpublishedDepts = faculty.departments.filter(dept => !publishedDepartments.has(dept.id));
    if (unpublishedDepts.length === 0) {
      setMessageBox({ show: true, title: 'Notification', message: 'All departments are already published!', type: 'info' });
      return;
    }
    setPublishAllCount(unpublishedDepts.length);
    setIsPublishAllConfirmed(false); // Reset confirmation state
    setShowPublishAllConfirm(true);
  };

  const confirmPublishAll = async () => {
    const unpublishedDepts = faculty.departments.filter(dept => !publishedDepartments.has(dept.id));

    try {
      let totalScholarsPublished = 0;

      for (const dept of unpublishedDepts) {
        // Get department short form
        const deptShortForm = DEPARTMENT_MAPPING[dept.name] || dept.name;
        const publishValue = `Published_To_${deptShortForm}`;

        // Get all scholars for this department (both FT and PT)
        const ftScholars = getScholarsForDepartment(dept.name, 'Full Time');
        const ptScholars = getScholarsForDepartment(dept.name, 'Part Time');
        const allScholars = [...ftScholars, ...ptScholars];

        if (allScholars.length > 0) {
          // Update dept_result column for all scholars in this department
          const scholarIds = allScholars.map(scholar => scholar.id);

          const { data, error } = await supabase
            .from('examination_records')
            .update({ dept_result: publishValue })
            .in('id', scholarIds);

          if (error) {
            console.error(`Error publishing results for ${dept.name}:`, error);
          } else {
            totalScholarsPublished += allScholars.length;
          }
        }
      }

      const newPublished = new Set(publishedDepartments);
      unpublishedDepts.forEach(dept => {
        newPublished.add(dept.id);
      });
      setPublishedDepartments(newPublished);

      setShowPublishAllConfirm(false);
      setShowPublishAllSuccess(true);

    } catch (error) {
      console.error('Exception during publish all:', error);
      setMessageBox({ show: true, title: 'Notification', message: 'Error occurred while publishing results. Please try again.', type: 'error' });
      setShowPublishAllConfirm(false);
    }
  };

  const cancelPublishAll = () => {
    setShowPublishAllConfirm(false);
    setPublishAllCount(0);
    setIsPublishAllConfirmed(false); // Reset confirmation state
  };

  const closePublishAllSuccess = () => {
    setShowPublishAllSuccess(false);
    setPublishAllCount(0);
  };

  const handleDownload = (department) => {
    setDownloadDepartment(department);
    setShowDownloadModal(true);
  };

  const performDownload = (type, count) => {
    const department = downloadDepartment;
    if (!department) return;

    try {
      // Get FT and PT scholars for the department
      let ftScholars = getScholarsForDepartment(department.name, 'Full Time');
      let ptScholars = getScholarsForDepartment(department.name, 'Part Time');

      if (type === 'specific' && count) {
        ftScholars = ftScholars.slice(0, count);
        ptScholars = ptScholars.slice(0, count);
      }

      // Prepare FT data for Excel
      const ftExcelData = ftScholars.map(scholar => ({
        'Rank': scholar.rank,
        'Application Number': scholar['Application Number'] || scholar.application_no || 'N/A',
        'Registered Name': scholar['Registered Name'] || scholar.registered_name || 'N/A',
        'Department': scholar.Specialization,
        'Type': scholar.program || scholar['Mode of Study'] || 'Full Time',
        'Written Marks': scholar.writtenMarks === 'Ab' ? 'Ab' : (typeof scholar.writtenMarks === 'number' ? scholar.writtenMarks : Math.round(scholar.written_marks || 0)),
        'Interview Marks': scholar.vivaMarks === 'Ab' ? 'Ab' : (typeof scholar.vivaMarks === 'number' ? scholar.vivaMarks : Math.round(scholar.interview_marks || 0)),
        'Total Marks': scholar.totalMarks === 'Absent' ? 'Absent' : (typeof scholar.totalMarks === 'number' ? scholar.totalMarks : Math.round(scholar.total_marks || 0)),
        'Maximum Marks': 100,
        'Status': scholar.status
      }));

      // Prepare PT data for Excel
      const ptExcelData = ptScholars.map(scholar => ({
        'Rank': scholar.rank,
        'Application Number': scholar['Application Number'] || scholar.application_no || 'N/A',
        'Registered Name': scholar['Registered Name'] || scholar.registered_name || 'N/A',
        'Department': scholar.Specialization,
        'Type': scholar.program || scholar['Mode of Study'] || 'Part Time',
        'Written Marks': scholar.writtenMarks === 'Ab' ? 'Ab' : (typeof scholar.writtenMarks === 'number' ? scholar.writtenMarks : Math.round(scholar.written_marks || 0)),
        'Interview Marks': scholar.vivaMarks === 'Ab' ? 'Ab' : (typeof scholar.vivaMarks === 'number' ? scholar.vivaMarks : Math.round(scholar.interview_marks || 0)),
        'Total Marks': scholar.totalMarks === 'Absent' ? 'Absent' : (typeof scholar.totalMarks === 'number' ? scholar.totalMarks : Math.round(scholar.total_marks || 0)),
        'Maximum Marks': 100,
        'Status': scholar.status
      }));

      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Add FT sheet if there are FT scholars
      if (ftExcelData.length > 0) {
        const ftWorksheet = XLSX.utils.json_to_sheet(ftExcelData);
        XLSX.utils.book_append_sheet(workbook, ftWorksheet, 'Full Time Ranks');
      }

      // Add PT sheet if there are PT scholars
      if (ptExcelData.length > 0) {
        const ptWorksheet = XLSX.utils.json_to_sheet(ptExcelData);
        XLSX.utils.book_append_sheet(workbook, ptWorksheet, 'Part Time Ranks');
      }

      // If no data found, create an empty sheet with headers
      if (ftExcelData.length === 0 && ptExcelData.length === 0) {
        const emptyData = [{
          'Rank': 'No data available',
          'Application Number': '',
          'Registered Name': '',
          'Department': '',
          'Mode of Study': '',
          'Written Marks': '',
          'Interview Marks': '',
          'Total Marks': '',
          'Maximum Marks': '',
          'Status': ''
        }];
        const emptyWorksheet = XLSX.utils.json_to_sheet(emptyData);
        XLSX.utils.book_append_sheet(workbook, emptyWorksheet, 'No Data');
      }

      const fileName = `${department.name.replace(/\s+/g, '_')}_Rankings_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      setShowDownloadModal(false);
    } catch (error) {
      console.error('Error downloading Excel file:', error);
      setMessageBox({ show: true, title: 'Notification', message: 'Error occurred while downloading the file. Please try again.', type: 'error' });
    }
  };

  // Helper function to check if department is already published - IMPROVED
  const isDepartmentPublished = (departmentName) => {
    if (!examinationsData || examinationsData.length === 0) return false;

    const normalizedDeptName = normalizeName(departmentName);
    const deptShortForm = DEPARTMENT_MAPPING[departmentName] || departmentName;
    const publishValue = `Published_To_${deptShortForm}`;

    // Get all scholars from this department that have published results (result_dir contains "Published")
    const departmentScholars = examinationsData.filter(record => {
      // Use department field if available, fallback to extraction
      const recordDept = normalizeName(record.department && record.department !== '-' ? record.department : extractDepartmentFromProgram(record.program));

      // Flexible department match
      const departmentMatch = recordDept === normalizedDeptName ||
        recordDept.includes(normalizedDeptName) ||
        normalizedDeptName.includes(recordDept);

      const isPublished = record.result_dir && record.result_dir.toLowerCase().includes('publish');
      return departmentMatch && isPublished;
    });

    if (departmentScholars.length === 0) {
      return false;
    }

    // Check if ANY published scholars have been forwarded to department (have dept_result)
    // or if the first one has it. Using a more relaxed check for initial display.
    const scholarsWithDeptResult = departmentScholars.filter(record =>
      record.dept_result && record.dept_result.includes('Published')
    );

    // Department is considered published if at least one scholar has been forwarded or if all are
    return scholarsWithDeptResult.length > 0;
  };



  // Get scholars for a specific department and mode from examination records - USING DIRECTOR'S EXACT LOGIC
  const getScholarsForDepartment = (departmentName, mode) => {
    if (!examinationsData || examinationsData.length === 0) {
      return [];
    }

    // DIRECTOR'S EXACT LOGIC: Filter by department and type, then check if published
    const normalizedDeptName = normalizeName(departmentName);

    // DIRECTOR'S EXACT LOGIC: Filter by department and type, then check if published
    const filtered = examinationsData.filter(record => {
      // Use department field if available, fallback to extraction
      const recordDept = normalizeName(record.department && record.department !== '-' ? record.department : extractDepartmentFromProgram(record.program));

      // Department matching - flexible
      const departmentMatch = recordDept === normalizedDeptName ||
        recordDept.includes(normalizedDeptName) ||
        normalizedDeptName.includes(recordDept);

      // Type matching - Use program_type field directly from examination_records table
      // program_type can be: 'Full Time', 'Part Time Internal', 'Part Time External', 'Part Time External (Industry)'
      const programType = record.program_type || record.type || '';

      let typeMatch = false;
      if (mode === 'Full Time') {
        // Match only Full Time
        typeMatch = programType === 'Full Time';
      } else if (mode === 'Part Time') {
        // Match all Part Time variations
        typeMatch = programType === 'Part Time Internal' ||
          programType === 'Part Time External' ||
          programType === 'Part Time External (Industry)' ||
          programType === 'Part Time';
      }

      // Published status check - case insensitive
      const isPublished = record.result_dir && record.result_dir.toLowerCase().includes('publish');

      return departmentMatch && typeMatch && isPublished;
    });

    // Transform and sort by total marks (same as director portal)
    const transformed = filtered
      .map((record, index) => {
        // Handle absent scholars - check if marks are 'Ab' or 'Absent' (including partial absence)
        const isCompletelyAbsent = record.total_marks === 'Absent' ||
          (record.written_marks === 'Ab' && record.interview_marks === 'Ab');
        const isPartiallyAbsent = (record.written_marks === 'Ab' && record.interview_marks !== 'Ab') ||
          (record.written_marks !== 'Ab' && record.interview_marks === 'Ab');

        const writtenMarks = record.written_marks === 'Ab' ? 'Ab' : Math.round(parseFloat(record.written_marks) || 0);
        const vivaMarks = record.interview_marks === 'Ab' ? 'Ab' : Math.round(parseFloat(record.interview_marks) || 0);

        let totalMarks;
        if (isCompletelyAbsent) {
          totalMarks = 'Absent';
        } else if (record.total_marks && record.total_marks !== 'Absent') {
          totalMarks = Math.round(parseFloat(record.total_marks));
        } else {
          // Calculate total for partial absence cases
          const writtenScore = record.written_marks === 'Ab' ? 0 : (parseFloat(record.written_marks) || 0);
          const vivaScore = record.interview_marks === 'Ab' ? 0 : (parseFloat(record.interview_marks) || 0);
          totalMarks = Math.round(writtenScore + vivaScore);
        }

        return {
          id: record.id,
          'Registered Name': record.registered_name || 'N/A',
          'Application Number': record.application_no || 'N/A',
          'Mode of Study': mode,
          Specialization: extractDepartmentFromProgram(record.program) || record.department || 'N/A',
          writtenMarks,
          vivaMarks,
          totalMarks,
          // FIXED: Store the original type from database for display
          originalType: record.type,
          type: record.type,
          // Store the program field for Part Time type display
          program: record.program || 'N/A',
          // Also include the raw field names for compatibility
          registered_name: record.registered_name || 'N/A',
          application_no: record.application_no || 'N/A',
          written_marks: writtenMarks,
          interview_marks: vivaMarks,
          total_marks: totalMarks,
          status: isCompletelyAbsent ? 'Absent' : (parseFloat(totalMarks) >= 50 ? 'Qualified' : 'Not Qualified')
        };
      })
      .sort((a, b) => {
        // Sort completely absent scholars to the bottom, then by total marks
        if (a.totalMarks === 'Absent' && b.totalMarks !== 'Absent') return 1;
        if (a.totalMarks !== 'Absent' && b.totalMarks === 'Absent') return -1;
        if (a.totalMarks === 'Absent' && b.totalMarks === 'Absent') return 0;
        return parseFloat(b.totalMarks) - parseFloat(a.totalMarks);
      })
      .map((scholar, index) => ({ ...scholar, rank: index + 1 }));

    return transformed;
  };

  const facultyColors = {
    'Faculty of Engineering & Technology': 'border-l-[6px] border-[#4f8cff]',
    'Faculty of Science & Humanities': 'border-l-[6px] border-[#64c864]',
    'Faculty of Medical & Health Science': 'border-l-[6px] border-[#e57373]',
    'Faculty of Management': 'border-l-[6px] border-[#ffb74d]',
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-3xl font-bold text-gray-900 m-0">Results</h3>
      </div>

      {/* Search and Filter */}
      <div className="mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <SlidersHorizontal className={`w-4 h-4 ${searchTerm && searchTerm.trim() ? 'text-blue-500' : 'text-gray-400'}`} />
              </span>
              <input
                type="text"
                placeholder="Search departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 pr-10 py-2 w-full h-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${searchTerm && searchTerm.trim() ? 'border-blue-300 bg-blue-50' : 'border-gray-300'}`}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              className={`flex items-center justify-center p-2 border rounded-md h-10 w-10 transition-colors ${sortOrder === 'desc' ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              onClick={handleSort}
              title={`Sort ${sortOrder === 'asc' ? 'Z-A' : 'A-Z'}`}
            >
              <ArrowUpDown size={16} />
            </button>
            <button
              className={`flex items-center gap-2 px-4 h-10 border rounded-md text-sm transition-colors ${(filters.department !== 'all' || filters.publishStatus !== 'all') ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              onClick={handleShowFilter}
              title="Filter departments"
            >
              <SlidersHorizontal size={16} />
              <span>Filter</span>
              {(filters.department !== 'all' || filters.publishStatus !== 'all') && (
                <span className="ml-1 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {(filters.department !== 'all' ? 1 : 0) + (filters.publishStatus !== 'all' ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
          <button
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium shadow-sm transition-colors"
            onClick={handlePublishAll}
            title="Publish all departments"
          >
            <Send size={16} />
            Publish All
          </button>
        </div>

        {(filters.department !== 'all' || filters.publishStatus !== 'all') && (
          <div className="flex flex-wrap gap-2 items-center mt-4">
            {filters.department !== 'all' && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                Department: {filters.department}
                <button onClick={() => setFilters(prev => ({ ...prev, department: 'all' }))} className="text-green-600 hover:text-green-800">
                  x
                </button>
              </span>
            )}
            {filters.publishStatus !== 'all' && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                Status: {filters.publishStatus}
                <button onClick={() => setFilters(prev => ({ ...prev, publishStatus: 'all' }))} className="text-blue-600 hover:text-blue-800">
                  x
                </button>
              </span>
            )}
            <button onClick={handleClearFilters} className="text-red-600 hover:text-red-800 text-xs font-medium">
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className={`bg-white rounded-lg shadow-sm border ${facultyColors[faculty.name] || 'border-l-[6px] border-[#9ca3af]'}`}>
          <div
            className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors rounded-r-lg"
            onClick={() => handleFacultyClick(faculty.id)}
          >
            <div className="flex items-center gap-3">
              <ChevronRight className={`transition-transform duration-200 text-gray-500 ${expandedFaculty === faculty.id ? 'rotate-90' : ''}`} size={20} />
              <h4 className="font-semibold text-lg text-gray-800 m-0">{faculty.name}</h4>
              <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold ml-2">
                {getScholarCountForFaculty(faculty.departments)} Scholars
              </span>
            </div>
          </div>

          {expandedFaculty === faculty.id && (
            <div className="px-6 pb-6 pt-2 border-t border-gray-100">
              {getFilteredAndSortedDepartments().length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No departments match your current criteria.</p>
                </div>
              ) : (
                getFilteredAndSortedDepartments().map((dept) => (
                  <div key={dept.id} className="ml-8 mb-4 border-l-2 border-gray-200 pl-4">
                    {/* Department Header */}
                    <div
                      className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-md cursor-pointer transition-colors group"
                      onClick={() => {
                        if (selectedDepartment && selectedDepartment.id === dept.id) {
                          setSelectedDepartment(null);
                        } else {
                          setSelectedDepartment(dept);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <ChevronRight className={`transition-transform text-sm text-gray-400 group-hover:text-gray-600 ${selectedDepartment?.id === dept.id ? 'rotate-90' : ''}`} size={16} />
                        <h5 className="font-medium text-gray-800 m-0">{dept.name}</h5>
                        <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-medium border border-blue-100">
                          {getScholarsForDepartment(dept.name, 'Full Time').length + getScholarsForDepartment(dept.name, 'Part Time').length} scholars
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!publishedDepartments.has(dept.id) && !isDepartmentPublished(dept.name)) {
                              handlePublish(dept);
                            }
                          }}
                          disabled={publishedDepartments.has(dept.id) || isDepartmentPublished(dept.name)}
                          className={`px-4 py-2 rounded-md transition-colors flex items-center gap-1.5 text-sm font-medium ${publishedDepartments.has(dept.id) || isDepartmentPublished(dept.name)
                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          title={publishedDepartments.has(dept.id) || isDepartmentPublished(dept.name) ? 'Published' : 'Publish results to department'}
                        >
                          <Send size={14} className={publishedDepartments.has(dept.id) || isDepartmentPublished(dept.name) ? 'text-gray-400' : 'text-white'} />
                          {publishedDepartments.has(dept.id) || isDepartmentPublished(dept.name) ? 'Published' : 'Publish'}
                        </button>
                      </div>
                    </div>

                    {/* Program Types - Show when department is expanded */}
                    {selectedDepartment?.id === dept.id && (
                      <div className="ml-6 mt-2 space-y-2">
                        {getScholarsForDepartment(dept.name, 'Full Time').length > 0 && (
                          <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                            <div>
                              <span className="font-medium text-gray-700">Full Time</span>
                              <span className="ml-2 text-gray-600">({getScholarsForDepartment(dept.name, 'Full Time').length} scholars)</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewFTRanks(dept)}
                                className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                              >
                                <Eye size={14} /> View
                              </button>
                              <button
                                onClick={() => handleDownload(dept)}
                                className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                              >
                                <Download size={14} /> Download
                              </button>
                            </div>
                          </div>
                        )}

                        {getScholarsForDepartment(dept.name, 'Part Time').length > 0 && (
                          <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                            <div>
                              <span className="font-medium text-gray-700">Part Time</span>
                              <span className="ml-2 text-gray-600">({getScholarsForDepartment(dept.name, 'Part Time').length} scholars)</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewPTRanks(dept)}
                                className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                              >
                                <Eye size={14} /> View
                              </button>
                              <button
                                onClick={() => handleDownload(dept)}
                                className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                              >
                                <Download size={14} /> Download
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* New RankListModal */}
      {modal && (
        <RankListModal
          modalData={modal}
          closeModal={() => setModal(null)}
        />
      )}



      {/* Publish Confirmation Modal */}
      {showPublishConfirm && publishDepartment && (
        <div className="publish-confirmation-modal">
          <div className="publish-confirmation-content">
            {/* Header */}
            <div className="publish-confirmation-header">
              <button
                onClick={cancelPublish}
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
                    id="confirmCheckbox"
                    className="consent-checkbox"
                    checked={isPublishConfirmed}
                    onChange={(e) => setIsPublishConfirmed(e.target.checked)}
                  />
                  <label htmlFor="confirmCheckbox" className="consent-checkbox-label">
                    I confirm I have read and agree to the above terms
                  </label>
                </div>
              </div>

              {/* Conclusion */}
              <div className="conclusion-section">
                <p className="conclusion-text">
                  You are about to <span className="conclusion-bold">PUBLISH</span> results for {publishDepartment.name} to the department for further processing.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="confirmation-actions">
                <button
                  onClick={cancelPublish}
                  className="confirmation-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  className="confirmation-confirm-btn"
                  onClick={confirmPublish}
                  disabled={!isPublishConfirmed}
                >
                  PUBLISH
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Publish Success Modal */}
      <MessageBox
        show={showPublishSuccess && publishDepartment}
        title="Notification"
        message={`Successfully forwarded results for ${publishDepartment?.name || 'department'}.`}
        type="success"
        onClose={closeSuccessModal}
      />

      {/* Publish All Confirmation Modal */}
      {showPublishAllConfirm && (
        <div className="publish-confirmation-modal">
          <div className="publish-confirmation-content">
            {/* Header */}
            <div className="publish-confirmation-header">
              <button
                onClick={cancelPublishAll}
                className="publish-confirmation-close"
              >
                ×
              </button>
              <h2 className="publish-confirmation-title">
                Confirm Publishing All Departments
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
                    I have thoroughly reviewed all submitted data
                  </li>
                  <li className="consent-item">
                    <span className="consent-bullet">•</span>
                    I have verified the authenticity of documents
                  </li>
                  <li className="consent-item">
                    <span className="consent-bullet">•</span>
                    This action will be recorded in the system
                  </li>
                </ul>

                <div className="consent-checkbox-container">
                  <input
                    type="checkbox"
                    id="confirmAllCheckbox"
                    className="consent-checkbox"
                    checked={isPublishAllConfirmed}
                    onChange={(e) => setIsPublishAllConfirmed(e.target.checked)}
                  />
                  <label htmlFor="confirmAllCheckbox" className="consent-checkbox-label">
                    I confirm I have read and agree to the above terms
                  </label>
                </div>
              </div>

              {/* Conclusion */}
              <div className="conclusion-section">
                <p className="conclusion-text">
                  You are about to <span className="conclusion-bold">PUBLISH</span> records for all {publishAllCount} unpublished department{publishAllCount !== 1 ? 's' : ''} to the director for further processing.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="confirmation-actions">
                <button
                  onClick={cancelPublishAll}
                  className="confirmation-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  className="confirm-publish-all-btn confirmation-confirm-btn"
                  onClick={confirmPublishAll}
                  disabled={!isPublishAllConfirmed}
                >
                  PUBLISH ALL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Publish All Success Modal */}
      <MessageBox
        show={showPublishAllSuccess}
        title="Notification"
        message={`Successfully forwarded results for ${publishAllCount} department${publishAllCount !== 1 ? 's' : ''}.`}
        type="success"
        onClose={closePublishAllSuccess}
      />

      {/* Filter Modal - Rendered as Portal to appear on top */}
      {createPortal(
        showFilterModal && (
          <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="filter-modal" style={{ margin: 'auto', position: 'relative', zIndex: 10000 }}>
              <div className="filter-modal-header">
                <h3>Filter Departments</h3>
                <button className="modal-close-btn" onClick={handleCloseFilter}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="filter-modal-body">
                <div className="filter-group">
                  <label htmlFor="department-filter">Department</label>
                  <select
                    id="department-filter"
                    value={filters.department}
                    onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                    className="filter-select"
                  >
                    <option value="all">All Departments</option>
                    {faculty.departments.map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="publish-filter">Publish Status</label>
                  <select
                    id="publish-filter"
                    value={filters.publishStatus}
                    onChange={(e) => setFilters(prev => ({ ...prev, publishStatus: e.target.value }))}
                    className="filter-select"
                  >
                    <option value="all">All Types</option>
                    <option value="published">Published</option>
                    <option value="unpublished">Unpublished</option>
                  </select>
                </div>
              </div>

              <div className="filter-modal-footer">
                <button className="clear-btn" onClick={handleClearFilters}>Clear All</button>
                <button className="apply-btn" onClick={handleApplyFilters}>Apply Filters</button>
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
      <DownloadSelectionModal
        show={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={performDownload}
        totalRows={downloadDepartment ? (getScholarsForDepartment(downloadDepartment.name, 'Full Time').length + getScholarsForDepartment(downloadDepartment.name, 'Part Time').length) : 0}
      />
    </div>
  );
};

export default Results;
