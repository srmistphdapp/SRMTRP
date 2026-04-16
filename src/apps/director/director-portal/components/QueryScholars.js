import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext.js';
import './ScholarManagement.css';
import * as XLSX from 'xlsx';
import { fetchScholarsWithQueries, updateScholar } from '../../../../services/scholarService';
import { fetchDepartmentsByFaculty } from '../../../../services/departmentService';

const QueryScholars = ({ onFullscreenChange, onModalStateChange }) => {
  const { facultiesData, scholarsData, setScholarsData, getScholarStats } = useAppContext();

  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [backToDirectorScholars, setBackToDirectorScholars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingScholar, setEditingScholar] = useState(null);
  const [viewingScholar, setViewingScholar] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingScholar, setForwardingScholar] = useState(null);
  const [showForwardAllModal, setShowForwardAllModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingScholar, setDeletingScholar] = useState(null);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState([]);

  // Selection states for bulk actions
  const [selectedScholars, setSelectedScholars] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkForwardModal, setShowBulkForwardModal] = useState(false);

  // Download modal states
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([]);

  // All available columns for download
  const ALL_AVAILABLE_COLUMNS = [
    { key: 'S.No', label: 'S.No', category: 'Basic Information' },
    { key: 'Application No', label: 'Application No', category: 'Basic Information' },
    { key: 'Form Name', label: 'Form Name', category: 'Basic Information' },
    { key: 'Current Status', label: 'Current Status', category: 'Basic Information' },
    
    { key: 'Registered Name', label: 'Registered Name', category: 'Personal Details' },
    { key: 'Date of Birth', label: 'Date of Birth', category: 'Personal Details' },
    { key: 'Gender', label: 'Gender', category: 'Personal Details' },
    { key: 'Mobile Number', label: 'Mobile Number', category: 'Personal Details' },
    { key: 'Email', label: 'Email', category: 'Personal Details' },
    { key: 'Nationality', label: 'Nationality', category: 'Personal Details' },
    
    { key: 'Institution', label: 'Institution', category: 'Program Info' },
    { key: 'Faculty', label: 'Faculty', category: 'Program Info' },
    { key: 'Department', label: 'Department', category: 'Program Info' },
    { key: 'Program', label: 'Program', category: 'Program Info' },
    { key: 'Program Type', label: 'Program Type', category: 'Program Info' },
    
    { key: 'Department Query', label: 'Department Query', category: 'Query Info' },
    { key: 'Query Resolved', label: 'Query Resolved', category: 'Query Info' },
    { key: 'Query Faculty', label: 'Query Faculty', category: 'Query Info' },
    
    { key: 'UG Degree', label: 'UG Degree', category: 'UG Education' },
    { key: 'UG Specialization', label: 'UG Specialization', category: 'UG Education' },
    { key: 'UG CGPA/Percentage', label: 'UG CGPA/Percentage', category: 'UG Education' },
    
    { key: 'PG Degree', label: 'PG Degree', category: 'PG Education' },
    { key: 'PG Specialization', label: 'PG Specialization', category: 'PG Education' },
    { key: 'PG CGPA/Percentage', label: 'PG CGPA/Percentage', category: 'PG Education' },
    
    { key: 'Exam 1 Name', label: 'Exam 1 Name', category: 'Exams' },
    { key: 'Exam 1 Score', label: 'Exam 1 Score', category: 'Exams' },
    { key: 'Exam 2 Name', label: 'Exam 2 Name', category: 'Exams' },
    { key: 'Exam 2 Score', label: 'Exam 2 Score', category: 'Exams' },
    
    { key: 'Research Interest', label: 'Research Interest', category: 'Research Info' },
    { key: 'Reasons for Applying', label: 'Reasons for Applying', category: 'Research Info' },
    
    { key: 'Status', label: 'Status', category: 'System Info' },
    { key: 'Certificates', label: 'Certificates', category: 'System Info' },
    { key: 'User ID', label: 'User ID', category: 'System Info' },
    { key: 'Created At', label: 'Created At', category: 'System Info' }
  ];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedType, setSelectedType] = useState('');

  const [sortConfig, setSortConfig] = useState({ field: 'sNo', direction: 'asc' });
  const [formData, setFormData] = useState({
    applicationNo: '',
    formName: 'PhD Application Form',
    name: '',
    institution: 'SRM Institute of Science and Technology',
    program: '',
    programType: '',
    mobile: '',
    email: '',
    dateOfBirth: '',
    gender: 'Male',
    // Additional comprehensive fields
    graduatedFromIndia: 'Yes',
    course: '',
    employeeId: '',
    designation: '',
    organizationName: '',
    organizationAddress: '',
    differentlyAbled: 'No',
    natureOfDeformity: '',
    percentageOfDeformity: '',
    nationality: 'Indian',
    aadhaarNo: '',
    modeOfProfession: 'Academic',
    areaOfInterest: '',
    // UG Details
    ugQualification: '',
    ugInstitute: '',
    ugDegree: '',
    ugSpecialization: '',
    ugMarkingScheme: 'CGPA',
    ugCgpa: '',
    ugMonthYear: '',
    ugRegistrationNo: '',
    ugModeOfStudy: 'Full Time',
    ugPlaceOfInstitution: '',
    // PG Details
    pgQualification: '',
    pgInstitute: '',
    pgDegree: '',
    pgSpecialization: '',
    pgMarkingScheme: 'CGPA',
    pgCgpa: '',
    pgMonthYear: '',
    pgRegistrationNo: '',
    pgModeOfStudy: 'Full Time',
    pgPlaceOfInstitution: '',
    // Other Degree Details
    otherQualification: '',
    otherInstitute: '',
    otherDegree: '',
    otherSpecialization: '',
    otherMarkingScheme: '',
    otherCgpa: '',
    otherMonthYear: '',
    otherRegistrationNo: '',
    otherModeOfStudy: '',
    otherPlaceOfInstitution: '',
    // Competitive Exams
    competitiveExam: 'No',
    exam1Name: '',
    exam1RegNo: '',
    exam1Score: '',
    exam1MaxScore: '',
    exam1Year: '',
    exam1Rank: '',
    exam1Qualified: '',
    exam2Name: '',
    exam2RegNo: '',
    exam2Score: '',
    exam2MaxScore: '',
    exam2Year: '',
    exam2Rank: '',
    exam2Qualified: '',
    exam3Name: '',
    exam3RegNo: '',
    exam3Score: '',
    exam3MaxScore: '',
    exam3Year: '',
    exam3Rank: '',
    exam3Qualified: '',
    // Research Interest
    reasonsForApplying: '',
    researchInterest: '',
    userId: '',
    certificates: 'Certificates',
    status: 'Pending',
    faculty: '',
    department: '',
    type: 'Full Time',
    cgpa: ''
  });

  // Helper function for download modal
  const toggleColumnSelection = (colKey) => {
    setSelectedColumns(prev => 
      prev.includes(colKey) ? prev.filter(k => k !== colKey) : [...prev, colKey]
    );
  };

  const selectAllColumns = () => {
    setSelectedColumns(ALL_AVAILABLE_COLUMNS.map(col => col.key));
  };

  const deselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const handleDownloadClick = () => {
    setSelectedColumns(ALL_AVAILABLE_COLUMNS.map(col => col.key));
    setShowDownloadModal(true);
  };

  // Fetch scholars with queries from Supabase
  useEffect(() => {
    const loadScholarsWithQueries = async () => {
      setLoading(true);
      const { data, error } = await fetchScholarsWithQueries();
      
      if (error) {
        console.error('Failed to load scholars with queries:', error);
        setBackToDirectorScholars([]);
      } else if (data) {
        setBackToDirectorScholars(data);
      }
      
      setLoading(false);
    };

    loadScholarsWithQueries();
  }, []);

  // Fetch departments when faculty changes
  useEffect(() => {
    const loadDepartments = async () => {
      if (formData.faculty) {
        const { data, error } = await fetchDepartmentsByFaculty(formData.faculty);
        if (error) {
          console.error('Failed to load departments:', error);
          setDepartments([]);
        } else if (data) {
          setDepartments(data);
        }
      } else {
        setDepartments([]);
      }
    };

    loadDepartments();
  }, [formData.faculty]);

  // Fetch departments for filter when selectedFaculty changes
  useEffect(() => {
    const loadFilterDepartments = async () => {
      if (selectedFaculty) {
        const { data, error } = await fetchDepartmentsByFaculty(selectedFaculty);
        if (error) {
          console.error('Failed to load filter departments:', error);
        } else if (data) {
          setDepartments(data);
        }
      } else {
        setSelectedDepartment(''); // Clear department selection when faculty is cleared
      }
    };

    loadFilterDepartments();
  }, [selectedFaculty]);

  // Use backToDirectorScholars instead of filtering from scholarsData
  const verifiedScholars = backToDirectorScholars;
  
  const stats = {
    totalScholars: verifiedScholars.length,
    withQueries: verifiedScholars.filter(s => {
      // Count scholars with queries that are NOT resolved
      const hasQuery = s.dept_query && s.dept_query !== '-' && s.dept_query.trim() !== '';
      const isResolved = s.query_resolved === 'Query Resolved';
      return hasQuery && !isResolved;
    }).length,
    withoutQueries: verifiedScholars.filter(s => {
      // Count scholars with queries that ARE resolved
      return s.query_resolved === 'Query Resolved';
    }).length,
    queryRate: verifiedScholars.length > 0 
      ? ((verifiedScholars.filter(s => {
          const hasQuery = s.dept_query && s.dept_query !== '-' && s.dept_query.trim() !== '';
          const isResolved = s.query_resolved === 'Query Resolved';
          return hasQuery && !isResolved;
        }).length / verifiedScholars.length) * 100).toFixed(1)
      : 0
  };



  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // If faculty changes, update both faculty and institution, and clear the program
    if (name === 'faculty') {
      // Convert faculty to shortened institution name
      let institutionName = value;
      if (value.includes('Engineering')) {
        institutionName = 'Engineering And Technology';
      } else if (value.includes('Science')) {
        institutionName = 'Science And Humanities';
      } else if (value.includes('Management')) {
        institutionName = 'Management';
      } else if (value.includes('Medical') || value.includes('Health')) {
        institutionName = 'Medical And Health Sciences';
      }
      
      setFormData(prev => ({
        ...prev,
        faculty: value, // Full faculty name for faculty column
        institution: institutionName, // Shortened name for institution column
        program: '' // Clear program when faculty changes
      }));
    } 
    // If pgModeOfStudy changes, sync with type field
    else if (name === 'pgModeOfStudy') {
      setFormData(prev => ({
        ...prev,
        pgModeOfStudy: value,
        type: value // Sync type with pgModeOfStudy
      }));
    }
    // If type changes, sync with pgModeOfStudy field
    else if (name === 'type') {
      setFormData(prev => ({
        ...prev,
        type: value,
        pgModeOfStudy: value // Sync pgModeOfStudy with type
      }));
    }
    // If program changes, extract department
    else if (name === 'program') {
      // Extract department name from program (e.g., "Ph.d. - Management Studies" -> "Management Studies")
      const departmentName = value.replace('Ph.d. - ', '').trim();
      
      setFormData(prev => ({
        ...prev,
        program: value,
        department: departmentName // Auto-populate department from program
      }));
    }
    else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Open modal for adding new scholar
  const openAddModal = () => {
    setEditingScholar(null);
    setFormData({
      applicationNo: `APP${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      formName: 'PhD Application Form',
      name: '',
      institution: 'SRM Institute of Science and Technology',
      program: '',
      mobile: '',
      email: '',
      dateOfBirth: '',
      gender: 'Male',
      ugDegree: '',
      pgDegree: '',
      ugMarks: '',
      pgMarks: '',
      certificates: 'Certificates',
      status: 'Pending',
      faculty: '',
      department: '',
      type: 'Full Time',
      cgpa: ''
    });
    setShowModal(true);
  };

  // Open modal for editing scholar
  // Open modal for editing scholar - Fetch complete data from Supabase
  const openEditModal = async (scholar) => {
    setEditingScholar(scholar);
    
    // Fetch complete scholar data from Supabase
    console.log('ðŸ“ Fetching complete scholar data for ID:', scholar.id);
    const { fetchScholarById } = await import('../../../../services/scholarService');
    const { data: fullScholarData, error } = await fetchScholarById(scholar.id);
    
    if (error) {
      console.error('Error fetching complete scholar data:', error);
      // Fallback to using the scholar object from table
      populateFormData(scholar);
    } else if (fullScholarData) {
      console.log('âœ… Complete scholar data fetched from Supabase');
      populateFormData(fullScholarData);
    } else {
      // Fallback to using the scholar object from table
      populateFormData(scholar);
    }
    
    setShowModal(true);
  };

  // Helper function to convert DD-MM-YYYY to YYYY-MM-DD for HTML date input
  const convertDateFormat = (dateStr) => {
    if (!dateStr) return '';
    // Handle DD-MM-YYYY format from Supabase
    if (dateStr.includes('-') && dateStr.split('-')[0].length <= 2) {
      const [day, month, year] = dateStr.split('-');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  };

  // Helper function to populate form data
  const populateFormData = (scholar) => {
    setFormData({
      applicationNo: scholar.application_no || scholar.applicationNo || '',
      formName: scholar.form_name || scholar.formName || 'PhD Application Form',
      name: scholar.registered_name || scholar.name || '',
      institution: scholar.faculty || scholar.institution || 'SRM Institute of Science and Technology',
      program: scholar.program || scholar.faculty || '',
      programType: scholar.type || '',
      mobile: scholar.mobile_number || scholar.mobile_no || scholar.mobile || '',
      email: scholar.email || scholar.email_id || '',
      dateOfBirth: convertDateFormat(scholar.date_of_birth || scholar.dateOfBirth || ''),
      gender: scholar.gender || 'Male',
      graduatedFromIndia: scholar.graduated_from_india || scholar.graduatedFromIndia || 'Yes',
      course: scholar.course || '',
      employeeId: scholar.employee_id || scholar.employeeId || '',
      designation: scholar.designation || '',
      organizationName: scholar.organization_name || scholar.organizationName || '',
      organizationAddress: scholar.organization_address || scholar.organizationAddress || '',
      differentlyAbled: scholar.differently_abled || scholar.differentlyAbled || 'No',
      natureOfDeformity: scholar.nature_of_deformity || scholar.natureOfDeformity || '',
      percentageOfDeformity: scholar.percentage_of_deformity || scholar.percentageOfDeformity || '',
      nationality: scholar.nationality || 'Indian',
      aadhaarNo: scholar.aadhaar_no || scholar.aadhaarNo || '',
      modeOfProfession: scholar.mode_of_profession || scholar.modeOfProfession || 'Academic',
      areaOfInterest: scholar.area_of_interest || scholar.areaOfInterest || '',
      // UG Details
      ugQualification: scholar.ug_qualification || scholar.ugQualification || '',
      ugInstitute: scholar.ug_institute || scholar.ugInstitute || '',
      ugDegree: scholar.ug_degree || scholar.ugDegree || '',
      ugSpecialization: scholar.ug_specialization || scholar.ugSpecialization || '',
      ugMarkingScheme: scholar.ug_marking_scheme || scholar.ugMarkingScheme || 'CGPA',
      ugCgpa: scholar.ug_cgpa || scholar.ugCgpa || scholar.ugMarks?.toString() || '',
      ugMonthYear: scholar.ug_month_year || scholar.ugMonthYear || '',
      ugRegistrationNo: scholar.ug_registration_no || scholar.ugRegistrationNo || '',
      ugModeOfStudy: scholar.ug_mode_of_study || scholar.ugModeOfStudy || 'Full Time',
      ugPlaceOfInstitution: scholar.ug_place_of_institution || scholar.ugPlaceOfInstitution || '',
      // PG Details
      pgQualification: scholar.pg_qualification || scholar.pgQualification || '',
      pgInstitute: scholar.pg_institute || scholar.pgInstitute || '',
      pgDegree: scholar.pg_degree || scholar.pgDegree || '',
      pgSpecialization: scholar.pg_specialization || scholar.pgSpecialization || '',
      pgMarkingScheme: scholar.pg_marking_scheme || scholar.pgMarkingScheme || 'CGPA',
      pgCgpa: scholar.pg_cgpa || scholar.pgCgpa || scholar.pgMarks?.toString() || '',
      pgMonthYear: scholar.pg_month_year || scholar.pgMonthYear || '',
      pgRegistrationNo: scholar.pg_registration_no || scholar.pgRegistrationNo || '',
      pgModeOfStudy: scholar.pg_mode_of_study || scholar.pgModeOfStudy || 'Full Time',
      pgPlaceOfInstitution: scholar.pg_place_of_institution || scholar.pgPlaceOfInstitution || '',
      // Other Degree Details
      otherQualification: scholar.other_qualification || scholar.otherQualification || '',
      otherInstitute: scholar.other_institute || scholar.otherInstitute || '',
      otherDegree: scholar.other_degree || scholar.otherDegree || '',
      otherSpecialization: scholar.other_specialization || scholar.otherSpecialization || '',
      otherMarkingScheme: scholar.other_marking_scheme || scholar.otherMarkingScheme || '',
      otherCgpa: scholar.other_cgpa || scholar.otherCgpa || '',
      otherMonthYear: scholar.other_month_year || scholar.otherMonthYear || '',
      otherRegistrationNo: scholar.other_registration_no || scholar.otherRegistrationNo || '',
      otherModeOfStudy: scholar.other_mode_of_study || scholar.otherModeOfStudy || '',
      otherPlaceOfInstitution: scholar.other_place_of_institution || scholar.otherPlaceOfInstitution || '',
      // Competitive Exams
      competitiveExam: scholar.competitive_exam || scholar.competitiveExam || 'No',
      exam1Name: scholar.exam1_name || scholar.exam1Name || '',
      exam1RegNo: scholar.exam1_reg_no || scholar.exam1RegNo || '',
      exam1Score: scholar.exam1_score || scholar.exam1Score || '',
      exam1MaxScore: scholar.exam1_max_score || scholar.exam1MaxScore || '',
      exam1Year: scholar.exam1_year || scholar.exam1Year || '',
      exam1Rank: scholar.exam1_rank || scholar.exam1Rank || '',
      exam1Qualified: scholar.exam1_qualified || scholar.exam1Qualified || '',
      exam2Name: scholar.exam2_name || scholar.exam2Name || '',
      exam2RegNo: scholar.exam2_reg_no || scholar.exam2RegNo || '',
      exam2Score: scholar.exam2_score || scholar.exam2Score || '',
      exam2MaxScore: scholar.exam2_max_score || scholar.exam2MaxScore || '',
      exam2Year: scholar.exam2_year || scholar.exam2Year || '',
      exam2Rank: scholar.exam2_rank || scholar.exam2Rank || '',
      exam2Qualified: scholar.exam2_qualified || scholar.exam2Qualified || '',
      exam3Name: scholar.exam3_name || scholar.exam3Name || '',
      exam3RegNo: scholar.exam3_reg_no || scholar.exam3RegNo || '',
      exam3Score: scholar.exam3_score || scholar.exam3Score || '',
      exam3MaxScore: scholar.exam3_max_score || scholar.exam3MaxScore || '',
      exam3Year: scholar.exam3_year || scholar.exam3Year || '',
      exam3Rank: scholar.exam3_rank || scholar.exam3Rank || '',
      exam3Qualified: scholar.exam3_qualified || scholar.exam3Qualified || '',
      // Research Interest
      reasonsForApplying: scholar.reasons_for_applying || scholar.reasonsForApplying || '',
      researchInterest: scholar.research_interest || scholar.researchInterest || '',
      userId: scholar.user_id || scholar.userId || '',
      ugMarks: scholar.ug_cgpa || scholar.ugMarks?.toString() || '',
      pgMarks: scholar.pg_cgpa || scholar.pgMarks?.toString() || '',
      certificates: scholar.certificates || 'Certificates',
      status: scholar.status || 'Pending',
      faculty: scholar.faculty || '',
      department: scholar.department || '',
      type: scholar.type || 'Full Time',
      cgpa: scholar.cgpa?.toString() || ''
    });
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setEditingScholar(null);
    setFormData({
      applicationNo: '',
      formName: 'PhD Application Form',
      name: '',
      institution: 'SRM Institute of Science and Technology',
      program: '',
      mobile: '',
      email: '',
      dateOfBirth: '',
      gender: 'Male',
      ugDegree: '',
      pgDegree: '',
      ugMarks: '',
      pgMarks: '',
      certificates: 'Certificates',
      status: 'Pending',
      faculty: '',
      department: '',
      type: 'Full Time',
      cgpa: ''
    });
  };

  // Get status class for pills
  const getStatusClass = (status) => {
    switch (status) {
      case 'Accepted': return 'verified';
      case 'Rejected': return 'rejected';
      case 'Forwarded': return 'forwarded';
      case 'Verified': return 'verified';
      case 'Pending': return 'pending';
      case 'Duplicate': return 'duplicate';
      default: return 'pending';
    }
  };

  // Handle S.NO sorting only
  const handleSNoSort = () => {
    const isAsc = sortConfig.direction === 'asc';
    const newDirection = isAsc ? 'desc' : 'asc';
    setSortConfig({
      field: 'sNo',
      direction: newDirection
    });
    showMessage(`Sorted by S.NO in ${newDirection === 'asc' ? 'ascending' : 'descending'} order`, 'info');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.mobile || !formData.email || !formData.dateOfBirth || !formData.program) {
      showMessage('Please fill in all required fields', 'error');
      return;
    }

    if (editingScholar) {
      console.log('🔄 Updating scholar in Query Scholars:', editingScholar.id);
      console.log('📝 Form data:', formData);
      
      // Prepare update data for Supabase
      const updateData = {
        application_no: formData.applicationNo,
        form_name: formData.formName,
        registered_name: formData.name,
        institution: formData.institution,
        program: formData.program,
        program_type: formData.programType,
        mobile_number: formData.mobile,
        email: formData.email,
        date_of_birth: formData.dateOfBirth,
        gender: formData.gender,
        graduated_from_india: formData.graduatedFromIndia,
        course: formData.course,
        employee_id: formData.employeeId,
        designation: formData.designation,
        organization_name: formData.organizationName,
        organization_address: formData.organizationAddress,
        differently_abled: formData.differentlyAbled,
        nature_of_deformity: formData.natureOfDeformity,
        percentage_of_deformity: formData.percentageOfDeformity,
        nationality: formData.nationality,
        aadhaar_no: formData.aadhaarNo,
        mode_of_profession: formData.modeOfProfession,
        area_of_interest: formData.areaOfInterest,
        ug_qualification: formData.ugQualification,
        ug_institute: formData.ugInstitute,
        ug_degree: formData.ugDegree,
        ug_specialization: formData.ugSpecialization,
        ug_marking_scheme: formData.ugMarkingScheme,
        ug_cgpa: formData.ugCgpa,
        ug_month_year: formData.ugMonthYear,
        ug_registration_no: formData.ugRegistrationNo,
        ug_mode_of_study: formData.ugModeOfStudy,
        ug_place_of_institution: formData.ugPlaceOfInstitution,
        pg_qualification: formData.pgQualification,
        pg_institute: formData.pgInstitute,
        pg_degree: formData.pgDegree,
        pg_specialization: formData.pgSpecialization,
        pg_marking_scheme: formData.pgMarkingScheme,
        pg_cgpa: formData.pgCgpa,
        pg_month_year: formData.pgMonthYear,
        pg_registration_no: formData.pgRegistrationNo,
        pg_mode_of_study: formData.pgModeOfStudy,
        pg_place_of_institution: formData.pgPlaceOfInstitution,
        other_qualification: formData.otherQualification,
        other_institute: formData.otherInstitute,
        other_degree: formData.otherDegree,
        other_specialization: formData.otherSpecialization,
        other_marking_scheme: formData.otherMarkingScheme,
        other_cgpa: formData.otherCgpa,
        other_month_year: formData.otherMonthYear,
        other_registration_no: formData.otherRegistrationNo,
        other_mode_of_study: formData.otherModeOfStudy,
        other_place_of_institution: formData.otherPlaceOfInstitution,
        competitive_exam: formData.competitiveExam,
        exam1_name: formData.exam1Name,
        exam1_reg_no: formData.exam1RegNo,
        exam1_score: formData.exam1Score,
        exam1_max_score: formData.exam1MaxScore,
        exam1_year: formData.exam1Year,
        exam1_rank: formData.exam1Rank,
        exam1_qualified: formData.exam1Qualified,
        exam2_name: formData.exam2Name,
        exam2_reg_no: formData.exam2RegNo,
        exam2_score: formData.exam2Score,
        exam2_max_score: formData.exam2MaxScore,
        exam2_year: formData.exam2Year,
        exam2_rank: formData.exam2Rank,
        exam2_qualified: formData.exam2Qualified,
        exam3_name: formData.exam3Name,
        exam3_reg_no: formData.exam3RegNo,
        exam3_score: formData.exam3Score,
        exam3_max_score: formData.exam3MaxScore,
        exam3_year: formData.exam3Year,
        exam3_rank: formData.exam3Rank,
        exam3_qualified: formData.exam3Qualified,
        reasons_for_applying: formData.reasonsForApplying,
        research_interest: formData.researchInterest,
        user_id: formData.userId,
        certificates: formData.certificates,
        status: formData.status,
        faculty: formData.faculty,
        department: formData.department,
        type: formData.type,
        cgpa: parseFloat(formData.cgpa) || 0
      };

      // Update in Supabase
      const { data, error } = await updateScholar(editingScholar.id, updateData);
      
      if (error) {
        console.error('❌ Error updating scholar:', error);
        showMessage('Error updating scholar', 'error');
        return;
      }
      
      console.log('✅ Scholar updated successfully in database:', data);
      showMessage('Scholar updated successfully!', 'success');
      
      // Update local state
      setBackToDirectorScholars(prev => prev.map(scholar =>
        scholar.id === editingScholar.id
          ? { ...scholar, ...updateData }
          : scholar
      ));
      
      console.log('✅ Local state updated');
      closeModal();
    } else {
      // Add new scholar
      const newScholar = {
        id: Math.max(...scholarsData.map(s => s.id)) + 1,
        sNo: scholarsData.length + 1,
        ...formData,
        ugMarks: parseFloat(formData.ugMarks) || parseFloat(formData.ugCgpa) || 0,
        pgMarks: parseFloat(formData.pgMarks) || parseFloat(formData.pgCgpa) || 0,
        cgpa: parseFloat(formData.cgpa) || 0
      };
      setScholarsData(prev => [...prev, newScholar]);
      showMessage('Scholar added successfully!', 'success');
      closeModal();
    }
  };

  // Handle delete scholar - show confirmation modal
  const handleDelete = (scholar) => {
    setDeletingScholar(scholar);
    setShowDeleteModal(true);
  };

  // Confirm delete scholar
  const confirmDelete = () => {
    if (deletingScholar) {
      setScholarsData(prev => prev.filter(s => s.id !== deletingScholar.id));
      showMessage(`${deletingScholar.name} deleted successfully!`, 'success');
      setShowDeleteModal(false);
      setDeletingScholar(null);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeletingScholar(null);
  };

  // Handle view scholar
  const handleView = (scholar) => {
    setViewingScholar(scholar);
    setShowViewModal(true);
  };

  // Close view modal
  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingScholar(null);
  };

  // Handle forward scholar - directly show forward confirmation
  const handleForward = (scholar) => {
    setForwardingScholar(scholar);
    setShowForwardModal(true);
  };

  // Cancel forward
  const cancelForward = () => {
    setShowForwardModal(false);
    setForwardingScholar(null);
  };

  // Helper function to get faculty forward text
  // Build forward text from institution, department, type columns
  const getForwardText = (institution, department, type) => {
    const parts = [institution, department, type].filter(Boolean);
    return parts.length > 0 ? parts.join(' | ') : 'Forward';
  };

  // Confirm forward scholar - Update Supabase
  const confirmForward = async () => {
    if (forwardingScholar) {
      try {
        const forwardText = getForwardText(
          forwardingScholar.institution,
          forwardingScholar.department,
          forwardingScholar.type
        );
        
        // Update in Supabase
        const { error } = await updateScholar(forwardingScholar.id, {
          query_resolved: 'Query Resolved',
          query_faculty: forwardText,
          status: 'Forwarded',
          forwarded_at: new Date().toISOString()
        });

        if (error) {
          console.error('Error updating scholar:', error);
          showMessage('Failed to forward scholar. Please try again.', 'error');
          return;
        }

        // Update local state
        setBackToDirectorScholars(prev => prev.map(s =>
          s.id === forwardingScholar.id
            ? { 
                ...s, 
                query_resolved: 'Query Resolved',
                query_faculty: forwardText,
                status: 'Forwarded', 
                forwarded_at: new Date().toISOString() 
              }
            : s
        ));
        
        showMessage(`${forwardingScholar.registered_name || forwardingScholar.name} has been forwarded successfully!`, 'success');
        setShowForwardModal(false);
        setForwardingScholar(null);
      } catch (err) {
        console.error('Exception forwarding scholar:', err);
        showMessage('An error occurred. Please try again.', 'error');
      }
    }
  };

  // Handle forward all - check duplicates first, then show query resolved confirmation
  const handleForwardAll = () => {
    // First check for duplicates
    const duplicates = [];
    const nameMap = new Map();
    const appNoMap = new Map();
    const scholarsToCheck = backToDirectorScholars;

    // Group scholars by name and application number
    scholarsToCheck.forEach(scholar => {
      const scholarName = scholar.registered_name || scholar.name;
      if (scholarName && typeof scholarName === 'string') {
        const normalizedName = scholarName.trim().toLowerCase();
        if (normalizedName) {
          if (!nameMap.has(normalizedName)) {
            nameMap.set(normalizedName, []);
          }
          nameMap.get(normalizedName).push(scholar);
        }
      }

      const appNo = scholar.application_no || scholar.applicationNo;
      if (appNo && typeof appNo === 'string') {
        const normalizedAppNo = appNo.trim();
        if (normalizedAppNo) {
          if (!appNoMap.has(normalizedAppNo)) {
            appNoMap.set(normalizedAppNo, []);
          }
          appNoMap.get(normalizedAppNo).push(scholar);
        }
      }
    });

    // Find duplicates
    nameMap.forEach((scholars, name) => {
      if (scholars.length > 1) {
        duplicates.push({ type: 'Name', scholars: scholars });
      }
    });

    appNoMap.forEach((scholars, appNo) => {
      if (scholars.length > 1) {
        const alreadyAdded = duplicates.some(dup =>
          dup.scholars.every(s => scholars.some(ds => ds.id === s.id))
        );
        if (!alreadyAdded) {
          duplicates.push({ type: 'Application No', scholars: scholars });
        }
      }
    });

    // If duplicates found, show warning
    if (duplicates.length > 0) {
      showMessage('Please handle duplicate scholars before forwarding all. Click "Duplicates" button to view and resolve them.', 'error');
      return;
    }

    // Check for eligible scholars (with complete required information)
    const eligibleScholars = getFilteredScholars().filter(s => {
      const hasName = s.registered_name || s.name;
      const hasEmail = s.email || s.email_id;
      const hasMobile = s.mobile_number || s.mobile;
      const hasInstitution = s.institution;
      const hasDepartment = s.department;
      
      return hasName && hasEmail && hasMobile && hasInstitution && hasDepartment;
    });

    if (eligibleScholars.length === 0) {
      showMessage('No eligible scholars to forward. Please ensure all scholars have complete information.', 'info');
      return;
    }

    // Show count of eligible vs total
    const totalScholars = getFilteredScholars().length;
    const ineligibleCount = totalScholars - eligibleScholars.length;
    
    if (ineligibleCount > 0) {
      showMessage(`${eligibleScholars.length} eligible scholars will be forwarded. ${ineligibleCount} scholars with incomplete information will be skipped.`, 'info');
    }

    setShowForwardAllModal(true);
  };

  // Confirm forward all - Update Supabase (only eligible scholars with complete information)
  const confirmForwardAll = async () => {
    // Filter for eligible scholars with complete required information
    const eligibleScholars = getFilteredScholars().filter(s => {
      const hasName = s.registered_name || s.name;
      const hasEmail = s.email || s.email_id;
      const hasMobile = s.mobile_number || s.mobile;
      const hasInstitution = s.institution;
      const hasDepartment = s.department;
      
      return hasName && hasEmail && hasMobile && hasInstitution && hasDepartment;
    });

    if (eligibleScholars.length === 0) {
      showMessage('No eligible scholars to forward', 'info');
      setShowForwardAllModal(false);
      return;
    }

    try {
      // Update all eligible scholars in Supabase
      const updatePromises = eligibleScholars.map(scholar => {
        const forwardText = getForwardText(scholar.institution, scholar.department, scholar.type);
        
        return updateScholar(scholar.id, {
          query_resolved: 'Query Resolved',
          query_faculty: forwardText,
          status: 'Forwarded',
          forwarded_at: new Date().toISOString()
        });
      });

      const results = await Promise.all(updatePromises);
      
      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('Some scholars failed to update:', errors);
        showMessage(`${eligibleScholars.length - errors.length} scholars forwarded, ${errors.length} failed.`, 'warning');
      } else {
        showMessage(`${eligibleScholars.length} scholars have been forwarded successfully!`, 'success');
      }

      // Update local state
      setBackToDirectorScholars(prev => prev.map(s => {
        const isEligible = eligibleScholars.some(eligible => eligible.id === s.id);
        if (isEligible) {
          return {
            ...s,
            query_resolved: 'Query Resolved',
            query_faculty: getForwardText(s.institution, s.department, s.type),
            status: 'Forwarded',
            forwarded_at: new Date().toISOString()
          };
        }
        return s;
      }));

      setShowForwardAllModal(false);
    } catch (err) {
      console.error('Exception forwarding scholars:', err);
      showMessage('An error occurred. Please try again.', 'error');
    }
  };

  // Cancel forward all
  const cancelForwardAll = () => {
    setShowForwardAllModal(false);
  };

  // Selection handlers for bulk actions
  const handleSelectScholar = (scholarId) => {
    // Find the scholar to check if it's forwarded
    const scholar = getFilteredScholars().find(s => s.id === scholarId);
    
    // Prevent selection of forwarded scholars
    if (scholar && scholar.status === 'Forwarded') {
      showMessage('Cannot select forwarded scholars', 'info');
      return;
    }
    
    setSelectedScholars(prev => {
      if (prev.includes(scholarId)) {
        const newSelection = prev.filter(id => id !== scholarId);
        if (newSelection.length === 0) setShowBulkActions(false);
        return newSelection;
      } else {
        setShowBulkActions(true);
        return [...prev, scholarId];
      }
    });
  };

  const handleSelectAll = () => {
    // Only select non-forwarded scholars
    const nonForwardedIds = getFilteredScholars()
      .filter(s => s.status !== 'Forwarded')
      .map(s => s.id);
    
    if (selectedScholars.length === nonForwardedIds.length) {
      setSelectedScholars([]);
      setShowBulkActions(false);
    } else {
      setSelectedScholars(nonForwardedIds);
      if (nonForwardedIds.length > 0) {
        setShowBulkActions(true);
      }
    }
  };

  const handleClearSelection = () => {
    setSelectedScholars([]);
    setShowBulkActions(false);
  };

  const handleBulkForward = () => {
    if (selectedScholars.length === 0) {
      showMessage('Please select scholars to forward', 'info');
      return;
    }
    setShowBulkForwardModal(true);
  };

  const confirmBulkForward = async () => {
    try {
      showMessage(`Bulk forward feature coming soon for ${selectedScholars.length} scholars!`, 'info');
      setShowBulkForwardModal(false);
      handleClearSelection();
    } catch (error) {
      console.error('Error forwarding scholars:', error);
      showMessage('Failed to forward scholars', 'error');
    }
  };

  const handleBulkDelete = () => {
    if (selectedScholars.length === 0) {
      showMessage('Please select scholars to delete', 'info');
      return;
    }
    setShowBulkDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    try {
      showMessage(`Bulk delete feature coming soon for ${selectedScholars.length} scholars!`, 'info');
      setShowBulkDeleteModal(false);
      handleClearSelection();
    } catch (error) {
      console.error('Error deleting scholars:', error);
      showMessage('Failed to delete scholars', 'error');
    }
  };

  // Handle view duplicates - Find scholars with same name or application number
  const handleViewDuplicates = () => {
    const duplicates = [];
    const nameMap = new Map();
    const appNoMap = new Map();

    // Use backToDirectorScholars instead of scholarsData
    const scholarsToCheck = backToDirectorScholars;

    // Group scholars by name and application number
    scholarsToCheck.forEach(scholar => {
      // Group by name (case-insensitive, trimmed)
      const scholarName = scholar.registered_name || scholar.name;
      if (scholarName && typeof scholarName === 'string') {
        const normalizedName = scholarName.trim().toLowerCase();
        if (normalizedName) {
          if (!nameMap.has(normalizedName)) {
            nameMap.set(normalizedName, []);
          }
          nameMap.get(normalizedName).push(scholar);
        }
      }

      // Group by application number
      const appNo = scholar.application_no || scholar.applicationNo;
      if (appNo && typeof appNo === 'string') {
        const normalizedAppNo = appNo.trim();
        if (normalizedAppNo) {
          if (!appNoMap.has(normalizedAppNo)) {
            appNoMap.set(normalizedAppNo, []);
          }
          appNoMap.get(normalizedAppNo).push(scholar);
        }
      }
    });

    // Find duplicates by name
    nameMap.forEach((scholars, name) => {
      if (scholars.length > 1) {
        duplicates.push({
          type: 'Name',
          value: scholars[0].registered_name || scholars[0].name,
          scholars: scholars,
          count: scholars.length
        });
      }
    });

    // Find duplicates by application number
    appNoMap.forEach((scholars, appNo) => {
      if (scholars.length > 1) {
        // Check if not already added by name
        const alreadyAdded = duplicates.some(dup =>
          dup.scholars.every(s => scholars.some(ds => ds.id === s.id))
        );
        if (!alreadyAdded) {
          duplicates.push({
            type: 'Application No',
            value: appNo,
            scholars: scholars,
            count: scholars.length
          });
        }
      }
    });

    if (duplicates.length > 0) {
      setDuplicateGroups(duplicates);
      setShowDuplicatesModal(true);
      const totalDuplicates = duplicates.reduce((sum, group) => sum + group.count, 0);
      showMessage(`Found ${duplicates.length} duplicate groups with ${totalDuplicates} scholars`, 'warning');
    } else {
      showMessage('No duplicate scholars found', 'success');
    }
  };

  // Handle delete pending duplicates - Only delete scholars with status = 'Pending'
  const handleDeletePendingDuplicates = async () => {
    try {
      // Find all duplicate groups
      const duplicates = [];
      const appNoMap = new Map();
      
      // Group scholars by application number
      backToDirectorScholars.forEach(scholar => {
        const appNo = scholar.application_no || scholar.applicationNo;
        if (appNo && typeof appNo === 'string') {
          const normalizedAppNo = appNo.trim();
          if (normalizedAppNo) {
            if (!appNoMap.has(normalizedAppNo)) {
              appNoMap.set(normalizedAppNo, []);
            }
            appNoMap.get(normalizedAppNo).push(scholar);
          }
        }
      });
      
      // Find scholars to delete (only Pending status in duplicate groups)
      const scholarsToDelete = [];
      appNoMap.forEach((scholars, appNo) => {
        if (scholars.length > 1) {
          // This is a duplicate group
          // Delete only scholars with status = 'Pending'
          const pendingScholars = scholars.filter(s => s.status === 'Pending');
          scholarsToDelete.push(...pendingScholars);
        }
      });
      
      if (scholarsToDelete.length === 0) {
        showMessage('No pending duplicate scholars found to delete', 'info');
        return;
      }
      
      // Confirm before deleting
      const confirmDelete = window.confirm(
        `Found ${scholarsToDelete.length} pending duplicate scholar(s).\n\n` +
        `This will delete ONLY scholars with status = 'Pending'.\n` +
        `Scholars with 'Forwarded' status will be kept safe.\n\n` +
        `Do you want to proceed?`
      );
      
      if (!confirmDelete) {
        return;
      }
      
      // Delete the scholars
      const idsToDelete = scholarsToDelete.map(s => s.id);
      setBackToDirectorScholars(prev => prev.filter(s => !idsToDelete.includes(s.id)));
      setScholarsData(prev => prev.filter(s => !idsToDelete.includes(s.id)));
      
      showMessage(`Successfully deleted ${scholarsToDelete.length} pending duplicate scholar(s)`, 'success');
      
      // Close duplicates modal if open
      setShowDuplicatesModal(false);
      
    } catch (error) {
      console.error('Error deleting pending duplicates:', error);
      showMessage('Failed to delete pending duplicates', 'error');
    }
  };

  // Handle download excel
  const confirmDownloadExcel = () => {
    if (selectedColumns.length === 0) {
      alert('Please select at least one column to download.');
      return;
    }

    try {
      // Prepare comprehensive data with all fields
      const fullExcelData = backToDirectorScholars.map((scholar, index) => {
        return {
          // Basic Information
          'S.No': index + 1,
          'Application No': scholar.application_no || scholar.applicationNo || '',
          'Form Name': scholar.form_name || scholar.formName || 'PhD Application Form',
          'Current Status': scholar.status || '',
          
          // Personal Details
          'Registered Name': scholar.registered_name || scholar.name || '',
          'Date of Birth': scholar.date_of_birth || scholar.dateOfBirth || '',
          'Gender': scholar.gender || '',
          'Mobile Number': scholar.mobile_number || scholar.mobile || scholar.phone || '',
          'Email': scholar.email || scholar.email_id || '',
          'Nationality': scholar.nationality || 'Indian',
          
          // Program Information
          'Institution': scholar.institution || 'SRM Institute of Science and Technology',
          'Faculty': scholar.faculty || '',
          'Department': scholar.department || '',
          'Program': scholar.program || '',
          'Program Type': scholar.type || '',
          
          // Query Information
          'Department Query': scholar.dept_query || '',
          'Query Resolved': scholar.query_resolved || '',
          'Query Faculty': scholar.query_faculty || '',
          
          // UG Education
          'UG Degree': scholar.ug_degree || scholar.ugDegree || '',
          'UG Specialization': scholar.ug_specialization || scholar.ugSpecialization || '',
          'UG CGPA/Percentage': scholar.ug_cgpa || scholar.ugCgpa || scholar.ugMarks || '',
          
          // PG Education
          'PG Degree': scholar.pg_degree || scholar.pgDegree || '',
          'PG Specialization': scholar.pg_specialization || scholar.pgSpecialization || '',
          'PG CGPA/Percentage': scholar.pg_cgpa || scholar.pgCgpa || scholar.pgMarks || '',
          
          // Competitive Exams
          'Exam 1 Name': scholar.exam1_name || scholar.exam1Name || scholar.gateExam || '',
          'Exam 1 Score': scholar.exam1_score || scholar.exam1Score || scholar.gateScore || '',
          'Exam 2 Name': scholar.exam2_name || scholar.exam2Name || scholar.netExam || '',
          'Exam 2 Score': scholar.exam2_score || scholar.exam2Score || scholar.netScore || '',
          
          // Research Information
          'Research Interest': scholar.research_interest || scholar.researchInterest || '',
          'Reasons for Applying': scholar.reasons_for_applying || scholar.reasonsForApplying || '',
          
          // System Info
          'Status': scholar.status || '',
          'Certificates': scholar.certificates || 'Available',
          'User ID': scholar.user_id || scholar.userId || '',
          'Created At': scholar.created_at || scholar.createdAt || ''
        };
      });

      // Filter object properties based on user selection
      const excelData = fullExcelData.map(row => {
        const filteredObj = {};
        // Use ALL_AVAILABLE_COLUMNS to maintain original ordering
        ALL_AVAILABLE_COLUMNS.forEach(col => {
          if (selectedColumns.includes(col.key) && row[col.key] !== undefined) {
            filteredObj[col.key] = row[col.key];
          }
        });
        return filteredObj;
      });

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths based on selected columns
      const columnWidths = ALL_AVAILABLE_COLUMNS
        .filter(col => selectedColumns.includes(col.key))
        .map(col => {
          if (col.key === 'S.No') return { wch: 8 };
          if (col.key === 'Email' || col.key === 'Institution') return { wch: 30 };
          if (col.key === 'Department' || col.key === 'Faculty') return { wch: 35 };
          return { wch: 20 };
        });

      ws['!cols'] = columnWidths;

      // Style the header row (first row)
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + "1";
        if (!ws[address]) continue;
        ws[address].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4472C4" } },
          alignment: { horizontal: "center", vertical: "center", wrapText: true }
        };
      }

      // Create workbook and add worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Query Scholars');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
      const filename = `Query_Scholars_${timestamp[0]}_${timestamp[1].split('-')[0]}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);

      setShowDownloadModal(false);
      alert(`Excel file downloaded successfully! (${backToDirectorScholars.length} records)`);
    } catch (error) {
      console.error('Error generating Excel file:', error);
      alert('Error generating Excel file. Please try again.');
    }
  };

  // Handle upload scholar list
  const handleUploadScholarList = () => {
    setShowUploadModal(true);
  };

  // Handle approve scholar
  const handleApprove = (scholar) => {
    setScholarsData(prev => prev.map(s =>
      s.id === scholar.id
        ? { ...s, status: 'Forwarded' }
        : s
    ));
    showMessage(`${scholar.name} has been approved and forwarded!`, 'success');
  };



  // Handle view certificates
  const handleViewCertificates = (scholar) => {
    // Check if scholar has a certificates link (Google Drive URL)
    if (scholar.certificates && scholar.certificates !== 'Certificates' && scholar.certificates.startsWith('http')) {
      // Open the Google Drive link in a new tab
      window.open(scholar.certificates, '_blank', 'noopener,noreferrer');
    } else {
      showMessage(`No certificate link available for ${scholar.name}`, 'info');
    }
  };

  // Helper function to extract program type from program string
  // Extracts the full content inside brackets like "(ph.d. - Ft - E And T)"
  const extractProgramType = (programString) => {
    if (!programString) return '';

    // Extract everything inside the brackets
    const typeMatch = programString.match(/\(([^)]+)\)/);
    if (typeMatch) {
      return typeMatch[1].trim();
    }
    return '';
  };

  // Helper function to clean program name (remove brackets and content)
  const cleanProgramName = (programString) => {
    if (!programString) return '';

    // Remove everything from the opening bracket onwards
    const cleanMatch = programString.match(/^([^(]+)/);
    if (cleanMatch) {
      return cleanMatch[1].trim();
    }
    return programString;
  };

  // Helper function to extract faculty from program string
  // Extracts faculty abbreviation like "E And T", "S And H", "Mgt.", "Hs"
  const extractFacultyFromProgram = (programString) => {
    if (!programString) return '';

    // Extract faculty code from patterns like "- E And T)", "- S And H)", "- Mgt.)", "- Hs)"
    const facultyMatch = programString.match(/-\s*([A-Za-z\s.&]+)\s*\)$/i);
    if (facultyMatch) {
      const facultyCode = facultyMatch[1].trim();

      // Map faculty codes to full names
      if (facultyCode.toLowerCase().includes('e and t')) return 'Faculty of Engineering & Technology';
      if (facultyCode.toLowerCase().includes('s and h')) return 'Faculty of Science & Humanities';
      if (facultyCode.toLowerCase().includes('mgt')) return 'Faculty of Management';
      if (facultyCode.toLowerCase().includes('hs')) return 'Faculty of Medical & Health Science';

      return facultyCode;
    }
    return '';
  };

  // Handle file upload processing
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name;
    const fileSize = (file.size / 1024 / 1024).toFixed(2);

    showMessage(`Processing file: ${fileName} (${fileSize} MB)...`, 'info');

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          showMessage('No data found in the Excel file', 'error');
          return;
        }

        // Get the max ID from existing scholars
        const maxId = scholarsData.length > 0 ? Math.max(...scholarsData.map(s => s.id)) : 0;

        // Helper function to get value from multiple possible column names
        const getColumnValue = (row, ...columnNames) => {
          for (const name of columnNames) {
            if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
              return row[name];
            }
          }
          return '';
        };

        // Create new scholars with proper IDs
        const newScholars = jsonData.map((row, index) => {
          const fullProgram = getColumnValue(row, 'Select Program', 'Program', 'Course Name', 'Programme');
          const programType = extractProgramType(fullProgram);
          const facultyName = extractFacultyFromProgram(fullProgram);

          return {
            id: maxId + index + 1,
            sNo: index + 1, // Will be updated after prepending
            applicationNo: getColumnValue(row, 'Application No', 'ApplicationNo', 'App No', 'Application Number') || `APP${String(Math.floor(Math.random() * 1000) + 100).padStart(3, '0')}`,
            formName: getColumnValue(row, 'Form Name', 'FormName', 'Form') || 'PhD Application Form',
            name: getColumnValue(row, 'Registered Name', 'Name', 'Scholar Name', 'Applicant Name', 'Full Name', 'Student Name'),
            institution: getColumnValue(row, 'Institution', 'Institute', 'University') || 'SRM Institute of Science and Technology',
            program: fullProgram,
            programType: programType,
            mobile: getColumnValue(row, 'Mobile Number', 'Mobile', 'Phone', 'Contact Number', 'Phone Number'),
            email: getColumnValue(row, 'Email ID', 'Email', 'E-mail', 'Email Address'),
            dateOfBirth: getColumnValue(row, 'Date Of Birth', 'DOB', 'Birth Date', 'Date of Birth'),
            gender: getColumnValue(row, 'Gender', 'Sex') || 'Male',
            graduatedFromIndia: getColumnValue(row, 'Have You Graduated From India?', 'Graduated From India', 'India Graduate') || 'Yes',
            course: getColumnValue(row, 'Course', 'Program', 'Programme') || fullProgram,
            employeeId: getColumnValue(row, '1 - Employee Id', 'Employee ID', 'EmployeeID', 'Emp ID', 'Employee Id'),
            designation: getColumnValue(row, '1 - Designation', 'Designation', 'Position', 'Job Title') || 'Research Scholar',
            organizationName: getColumnValue(row, '1 - Organization Name', 'Organization Name', 'Organization', 'Company Name', 'Employer'),
            organizationAddress: getColumnValue(row, '1 - Organization Address', 'Organization Address', 'Company Address', 'Office Address'),
            differentlyAbled: getColumnValue(row, 'Are You Differently Abled?', 'Differently Abled', 'Disabled', 'PWD') || 'No',
            natureOfDeformity: getColumnValue(row, 'Nature Of Deformity', 'Disability Type', 'Deformity Nature'),
            percentageOfDeformity: getColumnValue(row, 'Percentage Of Deformity', 'Disability Percentage', 'Deformity Percentage'),
            nationality: getColumnValue(row, 'Nationality', 'Country') || 'Indian',
            aadhaarNo: getColumnValue(row, 'Aadhaar Card No.', 'Aadhaar No', 'Aadhaar', 'Aadhar Number'),
            modeOfProfession: getColumnValue(row, 'Mode Of Profession (Industry/Academic)', 'Mode of Profession', 'Profession Mode', 'Profession Type') || 'Academic',
            areaOfInterest: getColumnValue(row, 'Area Of Interest', 'Research Area', 'Interest Area', 'Specialization Area'),
            // UG Details
            ugQualification: getColumnValue(row, 'UG - Current Education Qualification', 'UG Qualification', 'UG Education', 'Undergraduate Qualification'),
            ugInstitute: getColumnValue(row, 'UG - Institute Name', 'UG Institute', 'UG College', 'UG University'),
            ugDegree: getColumnValue(row, 'UG - Degree', 'UG Degree', 'Undergraduate Degree'),
            ugSpecialization: getColumnValue(row, 'UG - Specialization', 'UG Specialization', 'UG Branch', 'UG Major'),
            ugMarkingScheme: getColumnValue(row, 'UG - Marking Scheme', 'UG Marking Scheme', 'UG Grade System') || 'CGPA',
            ugCgpa: getColumnValue(row, 'UG - CGPA Or Percentage', 'UG CGPA', 'UG Marks', 'UG Percentage', 'UG Grade'),
            ugMonthYear: getColumnValue(row, 'UG - Month & Year', 'UG Month Year', 'UG Completion Date', 'UG Year'),
            ugRegistrationNo: getColumnValue(row, 'UG - Registration No.', 'UG Registration No', 'UG Reg No', 'UG Roll No'),
            ugModeOfStudy: getColumnValue(row, 'UG - Mode Of Study', 'UG Mode of Study', 'UG Study Mode') || 'Full Time',
            ugPlaceOfInstitution: getColumnValue(row, 'UG - Place Of The Institution', 'UG Place', 'UG Location', 'UG City'),
            // PG Details
            pgQualification: getColumnValue(row, 'PG - Current Education Qualification', 'PG Qualification', 'PG Education', 'Postgraduate Qualification'),
            pgInstitute: getColumnValue(row, 'PG - Institute Name', 'PG Institute', 'PG College', 'PG University'),
            pgDegree: getColumnValue(row, 'PG - Degree', 'PG Degree', 'Postgraduate Degree'),
            pgSpecialization: getColumnValue(row, 'PG - Specialization', 'PG Specialization', 'PG Branch', 'PG Major'),
            pgMarkingScheme: getColumnValue(row, 'PG - Marking Scheme', 'PG Marking Scheme', 'PG Grade System') || 'CGPA',
            pgCgpa: getColumnValue(row, 'PG - CGPA Or Percentage', 'PG CGPA', 'PG Marks', 'PG Percentage', 'PG Grade'),
            pgMonthYear: getColumnValue(row, 'PG - Month & Year', 'PG Month Year', 'PG Completion Date', 'PG Year'),
            pgRegistrationNo: getColumnValue(row, 'PG - Registration No.', 'PG Registration No', 'PG Reg No', 'PG Roll No'),
            pgModeOfStudy: getColumnValue(row, 'PG - Mode Of Study', 'PG Mode of Study', 'PG Study Mode') || 'Full Time',
            pgPlaceOfInstitution: getColumnValue(row, 'PG - Place Of The Institution', 'PG Place', 'PG Location', 'PG City'),
            // Other Degree Details
            otherQualification: getColumnValue(row, 'Other Degree - Current Education Qualification', 'Other Qualification', 'Additional Qualification'),
            otherInstitute: getColumnValue(row, 'Other Degree - Institute Name', 'Other Institute', 'Other College'),
            otherDegree: getColumnValue(row, 'Other Degree - Degree', 'Other Degree', 'Additional Degree'),
            otherSpecialization: getColumnValue(row, 'Other Degree - Specialization', 'Other Specialization'),
            otherMarkingScheme: getColumnValue(row, 'Other Degree - Marking Scheme', 'Other Marking Scheme'),
            otherCgpa: getColumnValue(row, 'Other Degree - CGPA Or Percentage', 'Other CGPA', 'Other Marks'),
            otherMonthYear: getColumnValue(row, 'Other Degree - Month & Year', 'Other Month Year'),
            otherRegistrationNo: getColumnValue(row, 'Other Degree - Registration No.', 'Other Registration No'),
            otherModeOfStudy: getColumnValue(row, 'Other Degree - Mode Of Study', 'Other Mode of Study'),
            otherPlaceOfInstitution: getColumnValue(row, 'Other Degree - Place Of The Institution', 'Other Place'),
            // Competitive Exams
            competitiveExam: getColumnValue(row, 'Have You Taken Any Competitive Exam?', 'Competitive Exam', 'Exam Taken') || 'No',
            exam1Name: getColumnValue(row, '1. - Name Of The Exam', 'Exam 1 Name', '1 - Exam Name'),
            exam1RegNo: getColumnValue(row, '1. - Registration No./Roll No.', 'Exam 1 Reg No', '1 - Registration No'),
            exam1Score: getColumnValue(row, '1. - Score Obtained', 'Exam 1 Score', '1 - Score'),
            exam1MaxScore: getColumnValue(row, '1. - Max Score', 'Exam 1 Max Score', '1 - Max Score'),
            exam1Year: getColumnValue(row, '1. - Year Appeared', 'Exam 1 Year', '1 - Year'),
            exam1Rank: getColumnValue(row, '1. - AIR/Overall Rank', 'Exam 1 Rank', '1 - Rank'),
            exam1Qualified: getColumnValue(row, '1. - Qualified/Not Qualified', 'Exam 1 Qualified', '1 - Qualified'),
            exam2Name: getColumnValue(row, '2. - Name Of The Exam', 'Exam 2 Name', '2 - Exam Name'),
            exam2RegNo: getColumnValue(row, '2. - Registration No./Roll No.', 'Exam 2 Reg No', '2 - Registration No'),
            exam2Score: getColumnValue(row, '2. - Score Obtained', 'Exam 2 Score', '2 - Score'),
            exam2MaxScore: getColumnValue(row, '2. - Max Score', 'Exam 2 Max Score', '2 - Max Score'),
            exam2Year: getColumnValue(row, '2. - Year Appeared', 'Exam 2 Year', '2 - Year'),
            exam2Rank: getColumnValue(row, '2. - AIR/Overall Rank', 'Exam 2 Rank', '2 - Rank'),
            exam2Qualified: getColumnValue(row, '2. - Qualified/Not Qualified', 'Exam 2 Qualified', '2 - Qualified'),
            exam3Name: getColumnValue(row, '3. - Name Of The Exam', 'Exam 3 Name', '3 - Exam Name'),
            exam3RegNo: getColumnValue(row, '3. - Registration No./Roll No.', 'Exam 3 Reg No', '3 - Registration No'),
            exam3Score: getColumnValue(row, '3. - Score Obtained', 'Exam 3 Score', '3 - Score'),
            exam3MaxScore: getColumnValue(row, '3. - Max Score', 'Exam 3 Max Score', '3 - Max Score'),
            exam3Year: getColumnValue(row, '3. - Year Appeared', 'Exam 3 Year', '3 - Year'),
            exam3Rank: getColumnValue(row, '3. - AIR/Overall Rank', 'Exam 3 Rank', '3 - Rank'),
            exam3Qualified: getColumnValue(row, '3. - Qualified/Not Qualified', 'Exam 3 Qualified', '3 - Qualified'),
            // Additional Fields
            reasonsForApplying: getColumnValue(row, 'Reasons For Applying', 'Reasons for Applying', 'Why Apply', 'Application Reason'),
            researchInterest: getColumnValue(row, 'Research Interest', 'Research Area', 'Research Topic'),
            userId: getColumnValue(row, 'User ID', 'UserID', 'ID', 'Student ID'),
            certificates: getColumnValue(row, 'Certificates', 'Documents', 'Attachments') || 'Certificates',
            status: getColumnValue(row, 'Status', 'Application Status') || 'Pending',
            faculty: facultyName || getColumnValue(row, 'Select Institution', 'Faculty', 'School', 'Department Faculty') || 'Faculty of Engineering & Technology',
            department: getColumnValue(row, 'Department', 'Dept', 'Branch'),
            type: getColumnValue(row, 'Type', 'Study Type', 'Mode') || 'Full Time',
            cgpa: getColumnValue(row, 'CGPA', 'Overall CGPA', 'Total CGPA'),
            ugMarks: parseFloat(getColumnValue(row, 'UG - CGPA Or Percentage', 'UG CGPA', 'UG Marks') || 0),
            pgMarks: parseFloat(getColumnValue(row, 'PG - CGPA Or Percentage', 'PG CGPA', 'PG Marks') || 0)
          };
        });

        // Prepend new scholars to the beginning and update all S.No
        setScholarsData(prev => {
          const combined = [...newScholars, ...prev];
          // Update S.No for all scholars
          return combined.map((scholar, index) => ({
            ...scholar,
            sNo: index + 1
          }));
        });

        showMessage(`Successfully imported ${newScholars.length} scholars from ${fileName}. New scholars added at the top!`, 'success');
        setShowUploadModal(false);

        // Reset file input
        event.target.value = '';
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        showMessage('Error parsing Excel file. Please check the file format.', 'error');
      }
    };

    reader.onerror = () => {
      showMessage('Error reading file. Please try again.', 'error');
    };

    reader.readAsArrayBuffer(file);
  };



  // Show message function
  const showMessage = (message, type = 'info') => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `notification ${type}`;
    messageDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
      messageDiv.style.opacity = '0';
      messageDiv.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(messageDiv)) {
          document.body.removeChild(messageDiv);
        }
      }, 300);
    }, 3000);
  };

  // Get departments for selected faculty from Supabase
  const getDepartmentsForFaculty = (facultyName) => {
    if (!facultyName) return [];
    return departments;
  };



  // Handle filter functionality
  const handleFilter = () => {
    setShowFilterModal(true);
  };

  // Apply filters
  const applyFilters = () => {
    setShowFilterModal(false);
    const activeFilters = [];
    if (selectedFaculty) activeFilters.push(`Faculty: ${selectedFaculty}`);
    if (selectedDepartment) activeFilters.push(`Department: ${selectedDepartment}`);
    if (selectedType) activeFilters.push(`Type: ${selectedType}`);

    if (activeFilters.length > 0) {
      showMessage(`Filters applied: ${activeFilters.join(', ')}`, 'info');
    } else {
      showMessage('All filters cleared', 'info');
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedFaculty('');
    setSelectedDepartment('');
    setSelectedType('');
    setSearchTerm('');
    showMessage('All filters and search cleared', 'info');
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    if (onFullscreenChange) {
      onFullscreenChange(newFullscreenState);
    }
  };

  // Track modal states and notify parent
  useEffect(() => {
    const hasModal = showModal || showViewModal || showUploadModal || showFilterModal || 
                    showHelpModal || showForwardModal || showForwardAllModal || 
                    showDeleteModal || showDuplicatesModal ||
                    showDownloadModal; // ensure sidebar hides for downloads
    
    if (onModalStateChange) {
      onModalStateChange(hasModal);
    }
  }, [showModal, showViewModal, showUploadModal, showFilterModal, showHelpModal, 
      showForwardModal, showForwardAllModal, showDeleteModal, showDuplicatesModal, showDownloadModal, onModalStateChange]);

  // Filter and sort scholars
  const getFilteredScholars = () => {
    let filtered = verifiedScholars.filter(scholar => {
      const name = scholar.registered_name || scholar.name || '';
      const appNo = scholar.application_no || scholar.applicationNo || '';
      const mobile = scholar.mobile_number || scholar.mobile || '';
      const email = scholar.email || scholar.email_id || '';
      const program = scholar.program || '';
      const department = scholar.department || '';
      const faculty = scholar.institution || scholar.faculty || '';
      
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mobile.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        program.toLowerCase().includes(searchTerm.toLowerCase()) ||
        department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faculty.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFaculty = selectedFaculty === '' || faculty === selectedFaculty;
      const matchesDepartment = selectedDepartment === '' || 
        (department && department.toLowerCase().includes(selectedDepartment.toLowerCase()));
      const matchesType = selectedType === '' || (scholar.type || '') === selectedType;

      return matchesSearch && matchesFaculty && matchesDepartment && matchesType;
    });

    // Apply sorting using sortConfig
    filtered.sort((a, b) => {
      let aValue = a[sortConfig.field];
      let bValue = b[sortConfig.field];

      // Handle different sorting types
      if (sortConfig.field === 'sNo') {
        // Numeric sorting for S.No
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (sortConfig.field === 'ugMarks' || sortConfig.field === 'pgMarks') {
        // Numeric sorting for marks
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (typeof aValue === 'string') {
        // String sorting
        aValue = aValue.toLowerCase();
        bValue = (bValue || '').toLowerCase();
      } else {
        aValue = aValue || '';
        bValue = bValue || '';
      }

      if (sortConfig.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  };

  return (
    <div className={isFullscreen ? 'fullscreen-mode' : ''}>
      <div>
        {/* Header Section */}
        <div className="mb-6">
          {/* Header Title */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Query Scholars</h1>
              <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm font-semibold rounded-full border border-orange-300">
                Queries (Q)
              </span>
            </div>
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          </div>

          {/* Statistics Cards - Hidden in fullscreen */}
          {!isFullscreen && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Total Scholars</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalScholars}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Queries</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.withQueries}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Queries Resolved</p>
                    <p className="text-2xl font-bold text-green-600">{stats.withoutQueries}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Query Rate</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.queryRate}%</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons and Search */}
          <div className="flex flex-col gap-4 mb-6">
            {/* Forward All and Download Buttons */}
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={handleForwardAll} 
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                style={{ fontSize: '16px' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L2 8.5L9 12L12 19L22 2Z" />
                  <path d="M9 12L22 2" />
                </svg>
                <span className="font-semibold">Forward All</span>
              </button>
              <button onClick={handleDownloadClick} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download
              </button>
            </div>

            {/* Search Bar and Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search scholars..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                />
                <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <button onClick={handleFilter} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" title="Filter">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
          <div className="table-responsive">
            <table className="scholar-table ">
              <thead>
                <tr>
                  <th style={{minWidth: '50px', width: '50px'}}>
                    <input
                      type="checkbox"
                      checked={selectedScholars.length === getFilteredScholars().length && getFilteredScholars().length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                    />
                  </th>
                  <th>S.NO</th>
                  <th>REGISTERED NAME</th>
                  <th>APPLICATION NO</th>
                  <th>SELECT INSTITUTION</th>
                  <th>DEPARTMENT</th>
                  <th>TYPE</th>
                  <th>MOBILE NUMBER</th>
                  <th>EMAIL ID</th>
                  <th>GENDER</th>
                  <th>CERTIFICATES</th>
                  <th>QUERIES</th>
                  <th>QUERY STATUS</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredScholars().map((scholar, index) => (
                  <tr key={scholar.id} className={`${selectedScholars.includes(scholar.id) ? 'bg-blue-50' : ''} ${scholar.status === 'Forwarded' ? 'forwarded-scholar' : ''}`}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedScholars.includes(scholar.id)}
                        onChange={() => handleSelectScholar(scholar.id)}
                        disabled={scholar.status === 'Forwarded'}
                        className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ${
                          scholar.status === 'Forwarded' 
                            ? 'cursor-not-allowed opacity-50 bg-gray-200' 
                            : 'cursor-pointer'
                        }`}
                        title={scholar.status === 'Forwarded' ? 'Cannot select forwarded scholar' : 'Select scholar'}
                      />
                    </td>
                    <td>{index + 1}</td>
                    <td>{scholar.registered_name || scholar.name}</td>
                    <td>{scholar.application_no || scholar.applicationNo}</td>
                    <td>{scholar.institution || 'N/A'}</td>
                    <td>{scholar.department || 'N/A'}</td>
                    <td>{extractProgramType(scholar.program) || scholar.programType || 'N/A'}</td>
                    <td>{scholar.mobile_number || scholar.mobile || '+91 9876543210'}</td>
                    <td>{scholar.email || scholar.email_id}</td>
                    <td>{scholar.gender || 'Male'}</td>
                    <td>
                      <button
                        onClick={() => handleViewCertificates(scholar)}
                        className="certificate-link"
                      >
                        View Docs
                      </button>
                    </td>
                    <td>
                      {scholar.dept_query || '-'}
                    </td>
                    <td>
                      <span className={`status-pill ${getStatusClass(scholar.query_resolved || scholar.dept_review || 'Pending')}`}>
                        {scholar.query_resolved || scholar.dept_review || 'Pending'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${scholar.status === 'Forwarded' || (scholar.faculty_forward && scholar.faculty_forward !== 'Back_To_Director') ? 'forwarded' : 'pending'}`}>
                        {scholar.status === 'Forwarded' || (scholar.faculty_forward && scholar.faculty_forward !== 'Back_To_Director') ? 'Forwarded' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => handleView(scholar)}
                          className="table-action-btn btn-view"
                          title="View Details"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '12px',
                            backgroundColor: '#A855F7',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#9333EA';
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 4px 12px rgba(168, 85, 247, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#A855F7';
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 2px 8px rgba(168, 85, 247, 0.3)';
                          }}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEditModal(scholar)}
                          className="table-action-btn btn-edit"
                          title={scholar.status === 'Forwarded' ? 'Cannot edit forwarded scholar' : 'Edit Scholar'}
                          disabled={scholar.status === 'Forwarded'}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '12px',
                            backgroundColor: scholar.status === 'Forwarded' ? '#9CA3AF' : '#3B82F6',
                            color: 'white',
                            border: 'none',
                            cursor: scholar.status === 'Forwarded' ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            boxShadow: scholar.status === 'Forwarded' ? 'none' : '0 2px 8px rgba(59, 130, 246, 0.3)',
                            opacity: scholar.status === 'Forwarded' ? 0.5 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (scholar.status !== 'Forwarded') {
                              e.target.style.backgroundColor = '#2563EB';
                              e.target.style.transform = 'translateY(-1px)';
                              e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (scholar.status !== 'Forwarded') {
                              e.target.style.backgroundColor = '#3B82F6';
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
                            }
                          }}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleForward(scholar)}
                          className="table-action-btn btn-forward"
                          title={scholar.status === 'Forwarded' ? 'Scholar already forwarded' : 'Forward Scholar'}
                          disabled={scholar.status === 'Forwarded'}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '12px',
                            backgroundColor: scholar.status === 'Forwarded' ? '#9CA3AF' : '#10B981',
                            color: 'white',
                            border: 'none',
                            cursor: scholar.status === 'Forwarded' ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            boxShadow: scholar.status === 'Forwarded' ? 'none' : '0 2px 8px rgba(16, 185, 129, 0.3)',
                            opacity: scholar.status === 'Forwarded' ? 0.5 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (scholar.status !== 'Forwarded') {
                              e.target.style.backgroundColor = '#059669';
                              e.target.style.transform = 'translateY(-1px)';
                              e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (scholar.status !== 'Forwarded') {
                              e.target.style.backgroundColor = '#10B981';
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
                            }
                          }}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {getFilteredScholars().length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3>No Scholars Found</h3>
              <p>
                {searchTerm || selectedFaculty || selectedDepartment || selectedType
                  ? 'No scholars match your current search criteria.'
                  : 'No scholars have been added yet.'}
              </p>
            </div>
          )}

        {/* Add/Edit Scholar Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold text-gray-900">{editingScholar ? 'Edit Scholar' : 'Add New Scholar'}</h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                {/* Basic Information */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Application No</label>
                      <input type="text" name="applicationNo" value={formData.applicationNo} onChange={handleInputChange} readOnly className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Form Name</label>
                      <input type="text" name="formName" value={formData.formName} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Registered Name *</label>
                      <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Graduated From India?</label>
                      <select name="graduatedFromIndia" value={formData.graduatedFromIndia} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                      <input type="text" name="course" value={formData.course} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Institution (Faculty)</label>
                      <select name="faculty" value={formData.faculty} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="">Select Faculty</option>
                        {facultiesData.map(faculty => (
                          <option key={faculty.id} value={faculty.name}>{faculty.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Program *</label>
                      <select 
                        name="program" 
                        value={formData.program} 
                        onChange={handleInputChange} 
                        required 
                        className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg"
                        disabled={!formData.faculty}
                      >
                        <option value="">Select Program</option>
                        {getDepartmentsForFaculty(formData.faculty).map(dept => (
                          <option key={dept.id} value={`Ph.d. - ${dept.department_name}`}>
                            Ph.d. - {dept.department_name}
                          </option>
                        ))}
                      </select>
                      {!formData.faculty && (
                        <p className="text-xs text-gray-500 mt-1">Please select a faculty first</p>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select name="type" value={formData.type} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="">Select Type</option>
                        <option value="Full Time">Full Time</option>
                        <option value="Part Time Internal">Part Time Internal</option>
                        <option value="Part Time External">Part Time External</option>
                        <option value="Part Time External (Industry)">Part Time External (Industry)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Employment Information */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Employment Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employee Id</label>
                      <input type="text" name="employeeId" value={formData.employeeId} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                      <input type="text" name="designation" value={formData.designation} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                      <input type="text" name="organizationName" value={formData.organizationName} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group col-span-full">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Organization Address</label>
                      <input type="text" name="organizationAddress" value={formData.organizationAddress} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                      <input type="tel" name="mobile" value={formData.mobile} onChange={handleInputChange} required className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email ID *</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                      <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} required className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                      <select name="gender" value={formData.gender} onChange={handleInputChange} required className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Differently Abled?</label>
                      <select name="differentlyAbled" value={formData.differentlyAbled} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nature Of Deformity</label>
                      <input type="text" name="natureOfDeformity" value={formData.natureOfDeformity} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Percentage Of Deformity</label>
                      <input type="text" name="percentageOfDeformity" value={formData.percentageOfDeformity} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                      <input type="text" name="nationality" value={formData.nationality} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Card No.</label>
                      <input type="text" name="aadhaarNo" value={formData.aadhaarNo} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mode Of Profession</label>
                      <select name="modeOfProfession" value={formData.modeOfProfession} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="Academic">Academic</option>
                        <option value="Industry">Industry</option>
                      </select>
                    </div>
                    <div className="form-group col-span-full">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Area Of Interest</label>
                      <input type="text" name="areaOfInterest" value={formData.areaOfInterest} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                  </div>
                </div>

                {/* UG Education */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">UG - Education Qualification</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">UG - Qualification</label>
                      <input type="text" name="ugQualification" value={formData.ugQualification} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">UG - Institute Name</label>
                      <input type="text" name="ugInstitute" value={formData.ugInstitute} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">UG - Degree</label>
                      <input type="text" name="ugDegree" value={formData.ugDegree} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">UG - Specialization</label>
                      <input type="text" name="ugSpecialization" value={formData.ugSpecialization} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">UG - Marking Scheme</label>
                      <select name="ugMarkingScheme" value={formData.ugMarkingScheme} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="CGPA">CGPA</option>
                        <option value="Percentage">Percentage</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">UG - CGPA/Percentage</label>
                      <input type="text" name="ugCgpa" value={formData.ugCgpa} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">UG - Month & Year</label>
                      <input type="text" name="ugMonthYear" value={formData.ugMonthYear} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g., May 2020" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">UG - Registration No.</label>
                      <input type="text" name="ugRegistrationNo" value={formData.ugRegistrationNo} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">UG - Mode Of Study</label>
                      <select name="ugModeOfStudy" value={formData.ugModeOfStudy} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="Full Time">Full Time</option>
                        <option value="Part Time">Part Time</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">UG - Place Of Institution</label>
                      <input type="text" name="ugPlaceOfInstitution" value={formData.ugPlaceOfInstitution} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                  </div>
                </div>

                {/* PG Education */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">PG - Education Qualification</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">PG - Qualification</label>
                      <input type="text" name="pgQualification" value={formData.pgQualification} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">PG - Institute Name</label>
                      <input type="text" name="pgInstitute" value={formData.pgInstitute} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">PG - Degree</label>
                      <input type="text" name="pgDegree" value={formData.pgDegree} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">PG - Specialization</label>
                      <input type="text" name="pgSpecialization" value={formData.pgSpecialization} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">PG - Marking Scheme</label>
                      <select name="pgMarkingScheme" value={formData.pgMarkingScheme} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="CGPA">CGPA</option>
                        <option value="Percentage">Percentage</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">PG - CGPA/Percentage</label>
                      <input type="text" name="pgCgpa" value={formData.pgCgpa} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">PG - Month & Year</label>
                      <input type="text" name="pgMonthYear" value={formData.pgMonthYear} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g., June 2022" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">PG - Registration No.</label>
                      <input type="text" name="pgRegistrationNo" value={formData.pgRegistrationNo} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">PG - Mode Of Study</label>
                      <select name="pgModeOfStudy" value={formData.pgModeOfStudy} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="Full Time">Full Time</option>
                        <option value="Part Time">Part Time</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">PG - Place Of Institution</label>
                      <input type="text" name="pgPlaceOfInstitution" value={formData.pgPlaceOfInstitution} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                  </div>
                </div>

                {/* Application Status */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Application Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Faculty *</label>
                      <select name="faculty" value={formData.faculty} onChange={handleInputChange} required className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="">Select Faculty</option>
                        {facultiesData.map(faculty => (
                          <option key={faculty.id} value={faculty.name}>{faculty.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                      <select name="department" value={formData.department} onChange={handleInputChange} required className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="">Select Department</option>
                        {getDepartmentsForFaculty(formData.faculty).map(dept => (
                          <option key={dept.id} value={dept.department_name}>{dept.department_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                      <select name="type" value={formData.type} onChange={handleInputChange} required className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="">Select Type</option>
                        <option value="Full Time">Full Time</option>
                        <option value="Part Time Internal">Part Time Internal</option>
                        <option value="Part Time External">Part Time External</option>
                        <option value="Part Time External (Industry)">Part Time External (Industry)</option>
                      </select>
                    </div>
                    {/* Status field removed - managed by system only */}
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                  >
                    {editingScholar ? 'Update Scholar' : 'Add Scholar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
            <div className="modal-content upload-modal-modern" onClick={(e) => e.stopPropagation()}>
              <div className="upload-modal-header">
                <div className="upload-header-icon">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="upload-header-text">
                  <h2>Upload Scholar List</h2>
                  <p>Import scholar data from Excel or CSV file</p>
                </div>
                <button onClick={() => setShowUploadModal(false)} className="upload-modal-close">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="upload-modal-body">
                <div className="upload-dropzone">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="upload-file-input"
                    id="scholar-file-upload"
                  />
                  <label htmlFor="scholar-file-upload" className="upload-dropzone-label">
                    <div className="upload-dropzone-icon">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="upload-dropzone-text">
                      <h3>Drop your file here or click to browse</h3>
                      <p>Supports Excel (.xlsx, .xls) and CSV (.csv) files</p>
                    </div>
                    <div className="upload-dropzone-button">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span>Select File</span>
                    </div>
                  </label>
                </div>

                <div className="upload-info-section">
                  <div className="upload-info-card">
                    <div className="upload-info-icon success">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="upload-info-content">
                      <h4>Supported Columns</h4>
                      <ul>
                        <li>Name, Application No, Email, Mobile</li>
                        <li>Select Program, Department, Faculty</li>
                        <li>UG/PG Degree, CGPA, Institution</li>
                        <li>Date of Birth, Gender, Status</li>
                      </ul>
                    </div>
                  </div>

                  <div className="upload-info-card">
                    <div className="upload-info-icon info">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="upload-info-content">
                      <h4>File Requirements</h4>
                      <ul>
                        <li>Maximum file size: 10 MB</li>
                        <li>First row should contain column headers</li>
                        <li>Missing fields will default to 'N/A'</li>
                        <li>Duplicate entries will be flagged</li>
                      </ul>
                    </div>
                  </div>

                  <div className="upload-info-card">
                    <div className="upload-info-icon warning">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="upload-info-content">
                      <h4>Important Notes</h4>
                      <ul>
                        <li>Program format: "Ph.d. - Subject (ph.d. - Type - Faculty)"</li>
                        <li>All existing data will be preserved</li>
                        <li>New scholars will be appended to the list</li>
                        <li>Review data after upload for accuracy</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="upload-modal-footer">
                <button onClick={() => setShowUploadModal(false)} className="upload-cancel-btn">
                  Cancel
                </button>
                <button className="upload-help-btn">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Need Help?
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Modal */}
        {showFilterModal && (
          <div className="modal-overlay" onClick={() => setShowFilterModal(false)}>
            <div className="modal-content filter-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Filter Scholars</h2>
                <button onClick={() => setShowFilterModal(false)} className="modal-close">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="filter-content">
                <div className="filter-grid">
                  <div className="filter-group">
                    <label>Faculty</label>
                    <select
                      value={selectedFaculty}
                      onChange={(e) => {
                        setSelectedFaculty(e.target.value);
                        setSelectedDepartment(''); // Clear department when faculty changes
                      }}
                      className="filter-select"
                    >
                      <option value="">All Faculties</option>
                      {facultiesData.map(faculty => (
                        <option key={faculty.id} value={faculty.name}>{faculty.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Department</label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="filter-select"
                      disabled={!selectedFaculty}
                    >
                      <option value="">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.department_name}>{dept.department_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Type</label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="filter-select"
                    >
                      <option value="">All Types</option>
                      <option value="Full Time">Full Time</option>
                      <option value="Part Time">Part Time</option>
                    </select>
                  </div>
                </div>
                <div className="filter-actions">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={applyFilters}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* Help Modal */}
        {showHelpModal && (
          <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
            <div className="modal-content help-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Verified Scholars Help</h2>
                <button onClick={() => setShowHelpModal(false)} className="modal-close">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="help-content">
                <div className="help-section">
                  <h3>Keyboard Shortcuts</h3>
                  <div className="shortcuts">
                    <div className="shortcut">
                      <kbd>Ctrl/Cmd + N</kbd>
                      <span>Add New Scholar</span>
                    </div>
                    <div className="shortcut">
                      <kbd>Ctrl/Cmd + F</kbd>
                      <span>Open Filter Modal</span>
                    </div>
                    <div className="shortcut">
                      <kbd>Ctrl/Cmd + P</kbd>
                      <span>Print Report</span>
                    </div>
                    <div className="shortcut">
                      <kbd>Escape</kbd>
                      <span>Close Any Modal</span>
                    </div>
                  </div>
                </div>

                <div className="help-section">
                  <h3>Quick Actions</h3>
                  <ul>
                    <li><strong>Upload:</strong> Import scholars from Excel/CSV files</li>
                    <li><strong>Duplicates:</strong> Find and filter duplicate entries</li>
                    <li><strong>Forward All:</strong> Send eligible scholars to committee</li>
                    <li><strong>Download:</strong> Export complete scholar report</li>
                    <li><strong>Export Filtered:</strong> Export only filtered results</li>
                    <li><strong>Print:</strong> Generate printable report</li>
                    <li><strong>Refresh:</strong> Reload data and clear filters</li>
                  </ul>
                </div>

                <div className="help-section">
                  <h3>Scholar Status Guide</h3>
                  <div className="status-guide">
                    <div className="status-item">
                      <span className="status-badge status-pending">Pending</span>
                      <span>Awaiting review and approval</span>
                    </div>
                    <div className="status-item">
                      <span className="status-badge status-forwarded">Forwarded</span>
                      <span>Approved and ready for next stage</span>
                    </div>
                    <div className="status-item">
                      <span className="status-badge status-rejected">Rejected</span>
                      <span>Application declined</span>
                    </div>
                    <div className="status-item">
                      <span className="status-badge status-duplicate">Duplicate</span>
                      <span>Duplicate entry identified</span>
                    </div>
                  </div>
                </div>

                <div className="help-section">
                  <h3>Tips</h3>
                  <ul>
                    <li>Use the search bar to quickly find scholars by name, application number, or department</li>
                    <li>Click on column headers to sort data</li>
                    <li>Use filters to narrow down results by faculty, type, or status</li>
                    <li>Bulk operations help process multiple scholars at once</li>
                    <li>Certificate viewer opens in a new window for detailed document review</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Forward Confirmation Modal */}
      {showForwardModal && forwardingScholar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ paddingTop: '60px' }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Confirm Forward</h3>
                <button onClick={cancelForward} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Forward Scholar</h4>
                <p className="text-gray-600 mb-2">
                  Are you sure you want to forward <strong className="text-gray-900">{forwardingScholar.registered_name || forwardingScholar.name}</strong>?
                </p>
                <p className="text-sm text-blue-600">This will mark the query as "Query Resolved" and forward to the faculty.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelForward}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmForward}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                >
                  Forward Scholar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forward All Confirmation Modal */}
      {showForwardAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ paddingTop: '60px' }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Confirm Forward All</h3>
                <button onClick={cancelForwardAll} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Forward All Scholars</h4>
                <p className="text-gray-600 mb-2">
                  Are you sure you want to forward <strong className="text-gray-900">{getFilteredScholars().filter(s => s.status === 'Verified' || s.status === 'Pending').length} scholars</strong>?
                </p>
                <p className="text-sm text-blue-600">This will mark all queries as "Query Resolved" and forward to their respective faculties.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelForwardAll}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmForwardAll}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                >
                  Forward All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingScholar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ paddingTop: '60px' }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Confirm Delete</h3>
                <button onClick={cancelDelete} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Delete Scholar</h4>
                <p className="text-gray-600 mb-2">
                  Are you sure you want to delete <strong>{deletingScholar.name}</strong>?
                </p>
                <p className="text-sm text-red-600">This action cannot be undone and will permanently remove the scholar from the system.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicates Modal */}
      {showDuplicatesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Duplicate Scholars Found</h2>
                  <p className="text-orange-100 text-sm">{duplicateGroups.length} duplicate groups detected</p>
                </div>
              </div>
              <button onClick={() => setShowDuplicatesModal(false)} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {duplicateGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="mb-6 bg-gray-50 rounded-lg p-4 border-2 border-orange-200">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-sm font-semibold">
                      Group {groupIndex + 1}
                    </span>
                    <span className="text-gray-700 font-medium">
                      Duplicate {group.type}: <span className="text-orange-600 font-bold">{group.value}</span>
                    </span>
                    <span className="ml-auto px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
                      {group.count} scholars
                    </span>
                  </div>

                  <div className="space-y-3">
                    {group.scholars.map((scholar, scholarIndex) => (
                      <div key={scholar.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-orange-300 transition-colors">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="text-xs text-gray-500 font-medium">S.No</label>
                            <p className="text-sm font-semibold text-gray-900">{scholar.sNo}</p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 font-medium">Name</label>
                            <p className="text-sm font-semibold text-gray-900">{scholar.name}</p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 font-medium">Application No</label>
                            <p className="text-sm font-semibold text-gray-900">{scholar.applicationNo}</p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 font-medium">Email</label>
                            <p className="text-sm text-gray-700">{scholar.email}</p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 font-medium">Mobile</label>
                            <p className="text-sm text-gray-700">{scholar.mobile || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 font-medium">Faculty</label>
                            <p className="text-sm text-gray-700">{scholar.faculty}</p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 font-medium">Status</label>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${scholar.status === 'Forwarded' ? 'bg-green-100 text-green-700' :
                              scholar.status === 'Verified' ? 'bg-green-100 text-green-700' :
                                scholar.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                              }`}>
                              {scholar.status}
                            </span>
                          </div>
                          <div className="flex items-end gap-2">
                            <button
                              onClick={() => {
                                handleView(scholar);
                                setShowDuplicatesModal(false);
                              }}
                              className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(scholar);
                                setShowDuplicatesModal(false);
                              }}
                              className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-orange-600">{duplicateGroups.length}</span> duplicate groups found with{' '}
                <span className="font-semibold text-orange-600">
                  {duplicateGroups.reduce((sum, group) => sum + group.count, 0)}
                </span> Total Verified
              </div>
              <button
                onClick={() => setShowDuplicatesModal(false)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive View Scholar Modal */}
      {showViewModal && viewingScholar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Scholar Details</h2>
              <button onClick={closeViewModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Basic Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label">Form Name:</label>
                    <span className="view-value">{viewingScholar.form_name || viewingScholar.formName || 'PhD Application Form'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Registered Name:</label>
                    <span className="view-value">{viewingScholar.registered_name || viewingScholar.name}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Application No:</label>
                    <span className="view-value">{viewingScholar.application_no || viewingScholar.applicationNo}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Department Review Status:</label>
                    <span className={`view-value font-semibold ${viewingScholar.dept_review === 'Accepted' ? 'text-green-600' : viewingScholar.dept_review === 'Rejected' ? 'text-red-600' : 'text-yellow-600'}`}>
                      {viewingScholar.dept_review || 'Pending'}
                    </span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Rejection Reason:</label>
                    <span className="view-value">{viewingScholar.reject_reason || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Faculty Forward Status:</label>
                    <span className="view-value">{viewingScholar.faculty_forward || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Have You Graduated From India?:</label>
                    <span className="view-value">{viewingScholar.graduated_from_india || viewingScholar.graduatedFromIndia || 'Yes'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Course:</label>
                    <span className="view-value">{viewingScholar.course || viewingScholar.select_program || viewingScholar.program}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Select Institution:</label>
                    <span className="view-value">{viewingScholar.institution || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Department:</label>
                    <span className="view-value">{viewingScholar.department || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Type:</label>
                    <span className="view-value">{viewingScholar.type || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Certificates Drive Link:</label>
                    {viewingScholar.certificates && viewingScholar.certificates !== 'Certificates' && viewingScholar.certificates.startsWith('http') ? (
                      <a 
                        href={viewingScholar.certificates} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="view-value text-blue-600 hover:text-blue-800 underline cursor-pointer"
                      >
                        View Certificates
                      </a>
                    ) : (
                      <span className="view-value text-gray-500">No link available</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Employment Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Employment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label">1 - Employee Id:</label>
                    <span className="view-value">{viewingScholar.employee_id || viewingScholar.employeeId || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">1 - Designation:</label>
                    <span className="view-value">{viewingScholar.designation || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">1 - Organization Name:</label>
                    <span className="view-value">{viewingScholar.organization_name || viewingScholar.organizationName || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">1 - Organization Address:</label>
                    <span className="view-value">{viewingScholar.organization_address || viewingScholar.organizationAddress || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label">Mobile Number:</label>
                    <span className="view-value">{viewingScholar.mobile_number || viewingScholar.mobile || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Email ID:</label>
                    <span className="view-value">{viewingScholar.email || viewingScholar.email_id}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Date Of Birth:</label>
                    <span className="view-value">{viewingScholar.date_of_birth || viewingScholar.dateOfBirth || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Gender:</label>
                    <span className="view-value">{viewingScholar.gender || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Are You Differently Abled?:</label>
                    <span className="view-value">{viewingScholar.differently_abled || viewingScholar.differentlyAbled || 'No'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Nature Of Deformity:</label>
                    <span className="view-value">{viewingScholar.nature_of_deformity || viewingScholar.natureOfDeformity || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Percentage Of Deformity:</label>
                    <span className="view-value">{viewingScholar.percentage_of_deformity || viewingScholar.percentageOfDeformity || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Nationality:</label>
                    <span className="view-value">{viewingScholar.nationality || 'Indian'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Aadhaar Card No.:</label>
                    <span className="view-value">{viewingScholar.aadhaar_no || viewingScholar.aadhaarNo || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Mode Of Profession (Industry/Academic):</label>
                    <span className="view-value">{viewingScholar.mode_of_profession || viewingScholar.modeOfProfession || 'Academic'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Area Of Interest:</label>
                    <span className="view-value">{viewingScholar.area_of_interest || viewingScholar.areaOfInterest || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* UG Education Details */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">UG - Education Qualification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label">UG - Current Education Qualification:</label>
                    <span className="view-value">{viewingScholar.ug_qualification || viewingScholar.ugQualification || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Institute Name:</label>
                    <span className="view-value">{viewingScholar.ug_institute || viewingScholar.ugInstitute || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Degree:</label>
                    <span className="view-value">{viewingScholar.ug_degree || viewingScholar.ugDegree || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Specialization:</label>
                    <span className="view-value">{viewingScholar.ug_specialization || viewingScholar.ugSpecialization || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Marking Scheme:</label>
                    <span className="view-value">{viewingScholar.ug_marking_scheme || viewingScholar.ugMarkingScheme || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - CGPA Or Percentage:</label>
                    <span className="view-value">{viewingScholar.ug_cgpa || viewingScholar.ugCgpa || viewingScholar.ugMarks || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Month & Year:</label>
                    <span className="view-value">{viewingScholar.ug_month_year || viewingScholar.ugMonthYear || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Registration No.:</label>
                    <span className="view-value">{viewingScholar.ug_registration_no || viewingScholar.ugRegistrationNo || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Mode Of Study:</label>
                    <span className="view-value">{viewingScholar.ug_mode_of_study || viewingScholar.ugModeOfStudy || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Place Of The Institution:</label>
                    <span className="view-value">{viewingScholar.ug_place_of_institution || viewingScholar.ugPlaceOfInstitution || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* PG Education Details */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">PG - Education Qualification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label">PG - Current Education Qualification:</label>
                    <span className="view-value">{viewingScholar.pg_qualification || viewingScholar.pgQualification || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Institute Name:</label>
                    <span className="view-value">{viewingScholar.pg_institute || viewingScholar.pgInstitute || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Degree:</label>
                    <span className="view-value">{viewingScholar.pg_degree || viewingScholar.pgDegree || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Specialization:</label>
                    <span className="view-value">{viewingScholar.pg_specialization || viewingScholar.pgSpecialization || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Marking Scheme:</label>
                    <span className="view-value">{viewingScholar.pg_marking_scheme || viewingScholar.pgMarkingScheme || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - CGPA Or Percentage:</label>
                    <span className="view-value">{viewingScholar.pg_cgpa || viewingScholar.pgCgpa || viewingScholar.pgMarks || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Month & Year:</label>
                    <span className="view-value">{viewingScholar.pg_month_year || viewingScholar.pgMonthYear || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Registration No.:</label>
                    <span className="view-value">{viewingScholar.pg_registration_no || viewingScholar.pgRegistrationNo || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Mode Of Study:</label>
                    <span className="view-value">{viewingScholar.pg_mode_of_study || viewingScholar.pgModeOfStudy || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Place Of The Institution:</label>
                    <span className="view-value">{viewingScholar.pg_place_of_institution || viewingScholar.pgPlaceOfInstitution || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Other Degree Details */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Other Degree - Education Qualification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label">Other Degree - Current Education Qualification:</label>
                    <span className="view-value">{viewingScholar.otherQualification || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Other Degree - Institute Name:</label>
                    <span className="view-value">{viewingScholar.otherInstitute || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Other Degree - Degree:</label>
                    <span className="view-value">{viewingScholar.otherDegree || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Other Degree - Specialization:</label>
                    <span className="view-value">{viewingScholar.otherSpecialization || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Other Degree - Marking Scheme:</label>
                    <span className="view-value">{viewingScholar.otherMarkingScheme || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Other Degree - CGPA Or Percentage:</label>
                    <span className="view-value">{viewingScholar.otherCgpa || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Other Degree - Month & Year:</label>
                    <span className="view-value">{viewingScholar.otherMonthYear || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Other Degree - Registration No.:</label>
                    <span className="view-value">{viewingScholar.otherRegistrationNo || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Other Degree - Mode Of Study:</label>
                    <span className="view-value">{viewingScholar.otherModeOfStudy || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Other Degree - Place Of The Institution:</label>
                    <span className="view-value">{viewingScholar.otherPlaceOfInstitution || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Competitive Exams */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Competitive Exams</h3>
                <div className="mb-4">
                  <div className="view-field">
                    <label className="view-label">Have You Taken Any Competitive Exam?:</label>
                    <span className="view-value">{viewingScholar.competitiveExam || 'No'}</span>
                  </div>
                </div>

                {/* Exam 1 */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-800 mb-3">1. Exam Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="view-field">
                      <label className="view-label">1. - Name Of The Exam:</label>
                      <span className="view-value">{viewingScholar.exam1Name || 'N/A'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">1. - Registration No./Roll No.:</label>
                      <span className="view-value">{viewingScholar.exam1RegNo || 'N/A'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">1. - Score Obtained:</label>
                      <span className="view-value">{viewingScholar.exam1Score || 'N/A'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">1. - Max Score:</label>
                      <span className="view-value">{viewingScholar.exam1MaxScore || 'N/A'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">1. - Year Appeared:</label>
                      <span className="view-value">{viewingScholar.exam1Year || 'N/A'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">1. - AIR/Overall Rank:</label>
                      <span className="view-value">{viewingScholar.exam1Rank || 'N/A'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">1. - Qualified/Not Qualified:</label>
                      <span className="view-value">{viewingScholar.exam1Qualified || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Exam 2 */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-800 mb-3">2. Exam Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="view-field">
                      <label className="view-label">2. - Name Of The Exam:</label>
                      <span className="view-value">{viewingScholar.exam2Name || 'N/A'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">2. - Registration No./Roll No.:</label>
                      <span className="view-value">{viewingScholar.exam2RegNo || 'N/A'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">2. - Score Obtained:</label>
                      <span className="view-value">{viewingScholar.exam2Score || 'N/A'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">2. - Max Score:</label>
                      <span className="view-value">{viewingScholar.exam2MaxScore || 'N/A'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">2. - Year Appeared:</label>
                      <span className="view-value">{viewingScholar.exam2Year || 'N/A'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">2. - AIR/Overall Rank:</label>
                      <span className="view-value">{viewingScholar.exam2Rank || 'N/A'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">2. - Qualified/Not Qualified:</label>
                      <span className="view-value">{viewingScholar.exam2Qualified || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Exam 3 */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-800 mb-3">3. Exam Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="view-field">
                      <label className="view-label">3. - Name Of The Exam:</label>
                      <span className="view-value">{viewingScholar.exam3Name || 'N/A'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">3. - Registration No./Roll No.:</label>
                      <span className="view-value">{viewingScholar.exam3RegNo || 'N/A'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">3. - Score Obtained:</label>
                      <span className="view-value">{viewingScholar.exam3Score || 'N/A'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">3. - Max Score:</label>
                      <span className="view-value">{viewingScholar.exam3MaxScore || 'N/A'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">3. - Year Appeared:</label>
                      <span className="view-value">{viewingScholar.exam3Year || 'N/A'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">3. - AIR/Overall Rank:</label>
                      <span className="view-value">{viewingScholar.exam3Rank || 'N/A'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label">3. - Qualified/Not Qualified:</label>
                      <span className="view-value">{viewingScholar.exam3Qualified || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Research Interest & Essays */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Research Interest & Essays</h3>
                <div className="space-y-4">
                  <div className="view-field">
                    <label className="view-label">Describe In 300 Words; Your Reasons For Applying To The Proposed Program; Your Study Interests/future Career Plans, And Other Interests That Drives You To Apply To The Program.:</label>
                    <div className="view-value bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                      {viewingScholar.reasonsForApplying || 'N/A'}
                    </div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Title And Abstract Of The Master Degree Thesis And Your Research Interest In 500 Words:</label>
                    <div className="view-value bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                      {viewingScholar.researchInterest || 'N/A'}
                    </div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">User Id:</label>
                    <span className="view-value">{viewingScholar.userId || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Application Status */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Application Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label">Status:</label>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${viewingScholar.status === 'Forwarded' ? 'bg-green-100 text-green-800' :
                      viewingScholar.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        viewingScholar.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                      }`}>
                      {viewingScholar.status}
                    </span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Faculty:</label>
                    <span className="view-value">{viewingScholar.faculty}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Department:</label>
                    <span className="view-value">{viewingScholar.department}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Type:</label>
                    <span className="view-value">{viewingScholar.type}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
              <div className="flex justify-end">
                <button
                  onClick={closeViewModal}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Actions Bar */}
      {showBulkActions && selectedScholars.length > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-6 backdrop-blur-lg border border-blue-400/30">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-lg">{selectedScholars.length} Selected</p>
                <p className="text-xs text-blue-100">Choose an action below</p>
              </div>
            </div>
            
            <div className="h-10 w-px bg-white/30"></div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleBulkForward}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 font-medium backdrop-blur-sm border border-white/20 hover:scale-105"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Forward
              </button>
              
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-500/90 hover:bg-red-600 rounded-xl transition-all duration-200 font-medium backdrop-blur-sm border border-red-400/30 hover:scale-105"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
              
              <button
                onClick={handleClearSelection}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 font-medium backdrop-blur-sm border border-white/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Forward Confirmation Modal */}
      {showBulkForwardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ paddingTop: '60px' }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Forward Selected Scholars</h3>
                <button onClick={() => setShowBulkForwardModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Forward Selected Scholars</h4>
                <p className="text-gray-600 mb-2">
                  You are about to forward <span className="font-bold text-green-600">{selectedScholars.length} scholar(s)</span>.
                </p>
                <p className="text-sm text-green-600 font-semibold">This action will be available soon.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkForwardModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkForward}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-red-100 rounded-full p-3">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Delete Selected Scholars</h3>
                  <p className="text-sm text-gray-500">Confirm bulk deletion</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700 mb-2">
                  You are about to delete <span className="font-bold text-red-600">{selectedScholars.length} scholar(s)</span>.
                </p>
                <p className="text-sm text-red-600 font-semibold">This action will be available soon.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download Column Selection Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col transform transition-all duration-300 scale-100 relative overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <svg className="text-white text-xl w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Select Columns to Export</h3>
                  <p className="text-blue-100 text-sm mt-1">Choose which data fields to include in your Excel file</p>
                </div>
              </div>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
              >
                <svg className="text-xl w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Global Controls */}
            <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-200 divide-x divide-gray-200">
                  <span className="pr-3 text-blue-600 font-bold">{selectedColumns.length}</span>
                  <span className="pl-3">columns selected</span>
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAllColumns}
                  className="text-sm px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 rounded-lg transition-all font-medium flex items-center gap-2 shadow-sm"
                >
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  Select All
                </button>
                <button
                  onClick={deselectAllColumns}
                  className="text-sm px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 rounded-lg transition-all font-medium flex items-center gap-2 shadow-sm"
                >
                  <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500"></div>
                  Deselect All
                </button>
              </div>
            </div>

            {/* Scrollable Content - Categorized Columns */}
            <div className="p-6 overflow-y-auto bg-gray-50/50 flex-1 custom-scrollbar">
              <div className="space-y-8">
                {Array.from(new Set(ALL_AVAILABLE_COLUMNS.map(c => c.category))).map((category) => {
                  const categoryColumns = ALL_AVAILABLE_COLUMNS.filter(c => c.category === category);
                  const isAllInCategorySelected = categoryColumns.every(col => selectedColumns.includes(col.key));
                  const isSomeInCategorySelected = categoryColumns.some(col => selectedColumns.includes(col.key));

                  return (
                    <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="bg-gray-100/80 px-5 py-3 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-gray-800">{category}</h4>
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full font-medium">
                            {categoryColumns.length} fields
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            if (isAllInCategorySelected) {
                              // Deselect all in category
                              setSelectedColumns(prev => prev.filter(key => !categoryColumns.find(c => c.key === key)));
                            } else {
                              // Select all in category
                              setSelectedColumns(prev => {
                                const newSelection = [...prev];
                                categoryColumns.forEach(col => {
                                  if (!newSelection.includes(col.key)) newSelection.push(col.key);
                                });
                                return newSelection;
                              });
                            }
                          }}
                          className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium flex items-center gap-1.5
                            ${isAllInCategorySelected 
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                              : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                        >
                          {isAllInCategorySelected ? (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              All Selected
                            </>
                          ) : (
                            <>
                              <div className={`w-3.5 h-3.5 rounded-sm border ${isSomeInCategorySelected ? 'bg-blue-500 border-blue-500 flex items-center justify-center' : 'border-gray-400'}`}>
                                {isSomeInCategorySelected && <div className="w-1.5 h-0.5 bg-white"></div>}
                              </div>
                              Select All
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {categoryColumns.map((col) => (
                            <label
                              key={col.key}
                              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200
                                ${selectedColumns.includes(col.key)
                                  ? 'bg-blue-50/50 border-blue-200 hover:bg-blue-50'
                                  : 'bg-white border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                                }`}
                            >
                              <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                                <input
                                  type="checkbox"
                                  checked={selectedColumns.includes(col.key)}
                                  onChange={() => toggleColumnSelection(col.key)}
                                  className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500/30 focus:outline-none checked:bg-blue-500 checked:border-blue-500 transition-all cursor-pointer"
                                />
                                <svg 
                                  className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" 
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  stroke="currentColor" 
                                  strokeWidth="3"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <span className={`text-sm leading-tight select-none pt-0.5 ${
                                selectedColumns.includes(col.key) ? 'text-blue-800 font-medium' : 'text-gray-700'
                              }`}>
                                {col.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-white border-t border-gray-200 p-5 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowDownloadModal(false)}
                className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDownloadExcel}
                disabled={selectedColumns.length === 0}
                className={`px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-sm ${
                  selectedColumns.length > 0
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-md'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export {selectedColumns.length > 0 ? `(${selectedColumns.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default QueryScholars; 

