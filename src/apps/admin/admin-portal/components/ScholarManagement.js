import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FaSearch, FaEye, FaDownload, FaTimes } from 'react-icons/fa';
import { useAppContext } from '../../context/AppContext.js';
import './ScholarManagement.css';
import * as XLSX from 'xlsx';
import { supabase } from '../../../../supabaseClient';
import {
  fetchDirectorAdminScholars,
  fetchScholarById,
  updateScholar,
  addScholar,
  forwardScholarToRC,
  uploadScholarExcel,
  deleteAllDirectorAdminScholars,
  deleteScholar,
  fetchDistinctInstitutions,
  fetchDistinctDepartments,
  fetchDistinctTypes
} from '../../../../services/scholarService';

const ScholarManagement = ({ onFullscreenChange, onModalStateChange }) => {
  const { facultiesData, scholarsData, setScholarsData, getScholarStats } = useAppContext();

  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

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
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [showDeleteAllDuplicatesModal, setShowDeleteAllDuplicatesModal] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [pendingForwardAction, setPendingForwardAction] = useState(null); // 'single' or 'all'

  // Selection states for bulk actions
  const [selectedScholars, setSelectedScholars] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkForwardModal, setShowBulkForwardModal] = useState(false);

  // Download Excel specific state
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [institutionsList, setInstitutionsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [typesList, setTypesList] = useState([]);

  // Fetch distinct institutions, departments, types from Supabase on mount
  useEffect(() => {
    fetchDistinctInstitutions().then(({ data }) => { if (data) setInstitutionsList(data); });
    fetchDistinctDepartments().then(({ data }) => { if (data) setDepartmentsList(data); });
    fetchDistinctTypes().then(({ data }) => { if (data) setTypesList(data); });
  }, []);

  // All available columns for download
  const ALL_AVAILABLE_COLUMNS = [
    { key: 'S.No', label: 'S.No', category: 'Basic Info' },
    { key: 'Application No', label: 'Application No', category: 'Basic Info' },
    { key: 'Form Name', label: 'Form Name', category: 'Basic Info' },
    { key: 'Eligibility Status', label: 'Eligibility Status', category: 'Basic Info' },
    { key: 'Current Status', label: 'Current Status', category: 'Basic Info' },
    
    { key: 'Registered Name', label: 'Registered Name', category: 'Personal Details' },
    { key: 'Community', label: 'Community', category: 'Personal Details' },
    { key: 'Date of Birth', label: 'Date of Birth', category: 'Personal Details' },
    { key: 'Gender', label: 'Gender', category: 'Personal Details' },
    { key: 'Mobile Number', label: 'Mobile Number', category: 'Personal Details' },
    { key: 'Email', label: 'Email', category: 'Personal Details' },
    { key: 'Nationality', label: 'Nationality', category: 'Personal Details' },
    { key: 'Aadhaar No', label: 'Aadhaar No', category: 'Personal Details' },
    { key: 'Differently Abled', label: 'Differently Abled', category: 'Personal Details' },
    { key: 'Nature of Deformity', label: 'Nature of Deformity', category: 'Personal Details' },
    { key: 'Percentage of Deformity', label: 'Percentage of Deformity', category: 'Personal Details' },

    { key: 'Institution', label: 'Institution', category: 'Program Info' },
    { key: 'Faculty', label: 'Faculty', category: 'Program Info' },
    { key: 'Department', label: 'Department', category: 'Program Info' },
    { key: 'Program', label: 'Program', category: 'Program Info' },
    { key: 'Program Type', label: 'Program Type', category: 'Program Info' },
    { key: 'Course', label: 'Course', category: 'Program Info' },

    { key: 'Graduated From India', label: 'Graduated From India', category: 'Academic Background' },
    { key: 'Mode of Profession', label: 'Mode of Profession', category: 'Academic Background' },
    { key: 'Area of Interest', label: 'Area of Interest', category: 'Academic Background' },

    { key: 'Employee ID', label: 'Employee ID', category: 'Employment Details' },
    { key: 'Designation', label: 'Designation', category: 'Employment Details' },
    { key: 'Organization Name', label: 'Organization Name', category: 'Employment Details' },
    { key: 'Organization Address', label: 'Organization Address', category: 'Employment Details' },

    { key: 'UG Qualification', label: 'UG Qualification', category: 'UG Education' },
    { key: 'UG Institute', label: 'UG Institute', category: 'UG Education' },
    { key: 'UG Degree', label: 'UG Degree', category: 'UG Education' },
    { key: 'UG Specialization', label: 'UG Specialization', category: 'UG Education' },
    { key: 'UG Marking Scheme', label: 'UG Marking Scheme', category: 'UG Education' },
    { key: 'UG CGPA/Percentage', label: 'UG CGPA/Percentage', category: 'UG Education' },
    { key: 'UG Month & Year', label: 'UG Month & Year', category: 'UG Education' },
    { key: 'UG Registration No', label: 'UG Registration No', category: 'UG Education' },
    { key: 'UG Mode of Study', label: 'UG Mode of Study', category: 'UG Education' },
    { key: 'UG Place of Institution', label: 'UG Place of Institution', category: 'UG Education' },

    { key: 'PG Qualification', label: 'PG Qualification', category: 'PG Education' },
    { key: 'PG Institute', label: 'PG Institute', category: 'PG Education' },
    { key: 'PG Degree', label: 'PG Degree', category: 'PG Education' },
    { key: 'PG Specialization', label: 'PG Specialization', category: 'PG Education' },
    { key: 'PG Marking Scheme', label: 'PG Marking Scheme', category: 'PG Education' },
    { key: 'PG CGPA/Percentage', label: 'PG CGPA/Percentage', category: 'PG Education' },
    { key: 'PG Month & Year', label: 'PG Month & Year', category: 'PG Education' },
    { key: 'PG Registration No', label: 'PG Registration No', category: 'PG Education' },
    { key: 'PG Mode of Study', label: 'PG Mode of Study', category: 'PG Education' },
    { key: 'PG Place of Institution', label: 'PG Place of Institution', category: 'PG Education' },

    { key: 'Other Qualification', label: 'Other Qualification', category: 'Other Degree' },
    { key: 'Other Institute', label: 'Other Institute', category: 'Other Degree' },
    { key: 'Other Degree', label: 'Other Degree', category: 'Other Degree' },
    { key: 'Other Specialization', label: 'Other Specialization', category: 'Other Degree' },
    { key: 'Other Marking Scheme', label: 'Other Marking Scheme', category: 'Other Degree' },
    { key: 'Other CGPA/Percentage', label: 'Other CGPA/Percentage', category: 'Other Degree' },
    { key: 'Other Month & Year', label: 'Other Month & Year', category: 'Other Degree' },
    { key: 'Other Registration No', label: 'Other Registration No', category: 'Other Degree' },
    { key: 'Other Mode of Study', label: 'Other Mode of Study', category: 'Other Degree' },
    { key: 'Other Place of Institution', label: 'Other Place of Institution', category: 'Other Degree' },

    { key: 'Competitive Exam Taken', label: 'Competitive Exam Taken', category: 'Exams' },
    { key: 'Exam 1 Name', label: 'Exam 1 Name', category: 'Exams' },
    { key: 'Exam 1 Registration No', label: 'Exam 1 Registration No', category: 'Exams' },
    { key: 'Exam 1 Score', label: 'Exam 1 Score', category: 'Exams' },
    { key: 'Exam 2 Name', label: 'Exam 2 Name', category: 'Exams' },
    { key: 'Exam 2 Registration No', label: 'Exam 2 Registration No', category: 'Exams' },
    { key: 'Exam 2 Score', label: 'Exam 2 Score', category: 'Exams' },

    { key: 'Research Interest', label: 'Research Interest', category: 'Research Info' },
    { key: 'Reasons for Applying', label: 'Reasons for Applying', category: 'Research Info' },

    { key: 'Director Status', label: 'Director Status', category: 'System Info' },
    { key: 'Certificates', label: 'Certificates', category: 'System Info' },
    { key: 'User ID', label: 'User ID', category: 'System Info' },
    { key: 'Created At', label: 'Created At', category: 'System Info' }
  ];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [departments, setDepartments] = useState([]);
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
    cgpa: '',
    community: ''
  });

  const stats = getScholarStats();

  // Fetch scholars from Supabase on component mount
  useEffect(() => {
    loadScholars();
  }, []);




  const loadScholars = async () => {
    const { data, error } = await fetchDirectorAdminScholars();
    if (error) {
      console.error('Error loading scholars:', error);
      showMessage('Error loading scholars from database', 'error');
      return;
    }
    if (data) {
      // Helper function to convert Excel date serial number to formatted date
      const convertExcelDate = (excelDate) => {
        if (!excelDate) return '';

        // If it's already a formatted date string, return it
        if (typeof excelDate === 'string' && (excelDate.includes('-') || excelDate.includes('/'))) {
          return excelDate;
        }

        // If it's a number (Excel serial date), convert it
        if (typeof excelDate === 'number') {
          const excelEpoch = new Date(1900, 0, 1);
          const daysOffset = excelDate - 2;
          const date = new Date(excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000);

          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();

          return `${day}-${month}-${year}`;
        }

        return excelDate;
      };

      // Map Supabase data to match existing structure
      const mappedData = data.map((scholar, index) => ({
        id: scholar.id,
        sNo: index + 1,
        applicationNo: scholar.application_no || scholar.applicationNo || '',
        formName: scholar.form_name || scholar.formName || 'PhD Application Form',
        name: scholar.registered_name || scholar.name || '',
        institution: scholar.institution || 'SRM Institute of Science and Technology',
        program: scholar.program || '',
        programType: scholar.program_type || scholar.programType || '',
        mobile: scholar.mobile_number || scholar.mobile || '',
        email: scholar.email || '',
        dateOfBirth: convertExcelDate(scholar.date_of_birth || scholar.dateOfBirth),
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
        ugQualification: scholar.ug_qualification || scholar.ugQualification || '',
        ugInstitute: scholar.ug_institute || scholar.ugInstitute || '',
        ugDegree: scholar.ug_degree || scholar.ugDegree || '',
        ugSpecialization: scholar.ug_specialization || scholar.ugSpecialization || '',
        ugMarkingScheme: scholar.ug_marking_scheme || scholar.ugMarkingScheme || 'CGPA',
        ugCgpa: scholar.ug_cgpa || scholar.ugCgpa || '',
        ugMonthYear: scholar.ug_month_year || scholar.ugMonthYear || '',
        ugRegistrationNo: scholar.ug_registration_no || scholar.ugRegistrationNo || '',
        ugModeOfStudy: scholar.ug_mode_of_study || scholar.ugModeOfStudy || 'Full Time',
        ugPlaceOfInstitution: scholar.ug_place_of_institution || scholar.ugPlaceOfInstitution || '',
        pgQualification: scholar.pg_qualification || scholar.pgQualification || '',
        pgInstitute: scholar.pg_institute || scholar.pgInstitute || '',
        pgDegree: scholar.pg_degree || scholar.pgDegree || '',
        pgSpecialization: scholar.pg_specialization || scholar.pgSpecialization || '',
        pgMarkingScheme: scholar.pg_marking_scheme || scholar.pgMarkingScheme || 'CGPA',
        pgCgpa: scholar.pg_cgpa || scholar.pgCgpa || '',
        pgMonthYear: scholar.pg_month_year || scholar.pgMonthYear || '',
        pgRegistrationNo: scholar.pg_registration_no || scholar.pgRegistrationNo || '',
        pgModeOfStudy: scholar.pg_mode_of_study || scholar.pgModeOfStudy || 'Full Time',
        pgPlaceOfInstitution: scholar.pg_place_of_institution || scholar.pgPlaceOfInstitution || '',
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
        reasonsForApplying: scholar.reasons_for_applying || scholar.reasonsForApplying || '',
        researchInterest: scholar.research_interest || scholar.researchInterest || '',
        userId: scholar.user_id || scholar.userId || '',
        ugMarks: parseFloat(scholar.ug_cgpa || scholar.ugCgpa || scholar.ugMarks || 0),
        pgMarks: parseFloat(scholar.pg_cgpa || scholar.pgCgpa || scholar.pgMarks || 0),
        certificates: scholar.certificates || 'Certificates',
        status: scholar.status || 'Pending',
        faculty: scholar.faculty || '',
        department: scholar.department || '',
        type: scholar.type || 'Full Time',
        community: scholar.community || '',
        cgpa: parseFloat(scholar.cgpa || 0)
      }));
      setScholarsData(mappedData);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // If faculty changes, clear the department/program
    if (name === 'faculty') {
      setFormData(prev => ({
        ...prev,
        faculty: value,
        department: '', // Clear department when faculty changes
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
    // If program changes, auto-extract and populate department
    else if (name === 'program') {
      // Extract department name from program (e.g., "Ph.D. - Management Studies" -> "Management Studies")
      const departmentName = value.replace('Ph.D. - ', '').trim();
      const extractedDept = extractDepartmentFromProgram(value);
      const matchedDept = findMatchingDepartment(extractedDept, formData.faculty);

      setFormData(prev => ({
        ...prev,
        program: value,
        department: departmentName || matchedDept || prev.department // Auto-populate department
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
      applicationNo: '', // Empty so user can type their own
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
      community: '',
      cgpa: ''
    });
    setShowModal(true);
  };

  // Open modal for editing scholar
  const openEditModal = (scholar) => {
    setEditingScholar(scholar);

    // Helper function to convert DD-MM-YYYY to YYYY-MM-DD for date input
    const convertDateForInput = (dateStr) => {
      if (!dateStr) return '';

      // If already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }

      // Convert DD-MM-YYYY to YYYY-MM-DD
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('-');
        return `${year}-${month}-${day}`;
      }

      // Convert DD/MM/YYYY to YYYY-MM-DD
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month}-${day}`;
      }

      return dateStr;
    };

    // Use department directly from scholar data
    const departmentValue = scholar.department || '';

    // Map type from scholar.type field only
    const extractAndMapType = () => {
      if (scholar.type) {
        return scholar.type;
      }
      return '';
    };

    const typeValue = extractAndMapType();

    setFormData({
      applicationNo: scholar.applicationNo,
      formName: scholar.formName || 'PhD Application Form',
      name: scholar.name,
      institution: scholar.institution || 'SRM Institute of Science and Technology',
      program: scholar.program || scholar.faculty,
      programType: scholar.programType || scholar.type || '',
      mobile: scholar.mobile || '',
      email: scholar.email,
      dateOfBirth: convertDateForInput(scholar.dateOfBirth) || '',
      gender: scholar.gender || 'Male',
      graduatedFromIndia: scholar.graduatedFromIndia || 'Yes',
      course: scholar.course || '',
      employeeId: scholar.employeeId || '',
      designation: scholar.designation || '',
      organizationName: scholar.organizationName || '',
      organizationAddress: scholar.organizationAddress || '',
      differentlyAbled: scholar.differentlyAbled || 'No',
      natureOfDeformity: scholar.natureOfDeformity || '',
      percentageOfDeformity: scholar.percentageOfDeformity || '',
      nationality: scholar.nationality || 'Indian',
      aadhaarNo: scholar.aadhaarNo || '',
      modeOfProfession: scholar.modeOfProfession || 'Academic',
      areaOfInterest: scholar.areaOfInterest || '',
      ugQualification: scholar.ugQualification || '',
      ugInstitute: scholar.ugInstitute || '',
      ugDegree: scholar.ugDegree || '',
      ugSpecialization: scholar.ugSpecialization || '',
      ugMarkingScheme: scholar.ugMarkingScheme || 'CGPA',
      ugCgpa: scholar.ugCgpa || scholar.ugMarks?.toString() || '',
      ugMonthYear: scholar.ugMonthYear || '',
      ugRegistrationNo: scholar.ugRegistrationNo || '',
      ugModeOfStudy: scholar.ugModeOfStudy || 'Full Time',
      ugPlaceOfInstitution: scholar.ugPlaceOfInstitution || '',
      pgQualification: scholar.pgQualification || '',
      pgInstitute: scholar.pgInstitute || '',
      pgDegree: scholar.pgDegree || '',
      pgSpecialization: scholar.pgSpecialization || '',
      pgMarkingScheme: scholar.pgMarkingScheme || 'CGPA',
      pgCgpa: scholar.pgCgpa || scholar.pgMarks?.toString() || '',
      pgMonthYear: scholar.pgMonthYear || '',
      pgRegistrationNo: scholar.pgRegistrationNo || '',
      pgModeOfStudy: scholar.pgModeOfStudy || 'Full Time',
      pgPlaceOfInstitution: scholar.pgPlaceOfInstitution || '',
      otherQualification: scholar.otherQualification || '',
      otherInstitute: scholar.otherInstitute || '',
      otherDegree: scholar.otherDegree || '',
      otherSpecialization: scholar.otherSpecialization || '',
      otherMarkingScheme: scholar.otherMarkingScheme || '',
      otherCgpa: scholar.otherCgpa || '',
      otherMonthYear: scholar.otherMonthYear || '',
      otherRegistrationNo: scholar.otherRegistrationNo || '',
      otherModeOfStudy: scholar.otherModeOfStudy || '',
      otherPlaceOfInstitution: scholar.otherPlaceOfInstitution || '',
      competitiveExam: scholar.competitiveExam || 'No',
      exam1Name: scholar.exam1Name || '',
      exam1RegNo: scholar.exam1RegNo || '',
      exam1Score: scholar.exam1Score || '',
      exam1MaxScore: scholar.exam1MaxScore || '',
      exam1Year: scholar.exam1Year || '',
      exam1Rank: scholar.exam1Rank || '',
      exam1Qualified: scholar.exam1Qualified || '',
      exam2Name: scholar.exam2Name || '',
      exam2RegNo: scholar.exam2RegNo || '',
      exam2Score: scholar.exam2Score || '',
      exam2MaxScore: scholar.exam2MaxScore || '',
      exam2Year: scholar.exam2Year || '',
      exam2Rank: scholar.exam2Rank || '',
      exam2Qualified: scholar.exam2Qualified || '',
      exam3Name: scholar.exam3Name || '',
      exam3RegNo: scholar.exam3RegNo || '',
      exam3Score: scholar.exam3Score || '',
      exam3MaxScore: scholar.exam3MaxScore || '',
      exam3Year: scholar.exam3Year || '',
      exam3Rank: scholar.exam3Rank || '',
      exam3Qualified: scholar.exam3Qualified || '',
      reasonsForApplying: scholar.reasonsForApplying || '',
      researchInterest: scholar.researchInterest || '',
      userId: scholar.userId || '',
      ugMarks: scholar.ugMarks?.toString() || '',
      pgMarks: scholar.pgMarks?.toString() || '',
      certificates: scholar.certificates,
      status: scholar.status,
      faculty: scholar.faculty,
      department: departmentValue || '', // Use extracted department if available
      type: typeValue,
      community: scholar.community || '',
      cgpa: scholar.cgpa?.toString() || ''
    });
    setShowModal(true);
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
      community: '',
      cgpa: ''
    });
  };

  // Get display type directly from scholar.type column
  const getDisplayType = (scholar) => {
    if (!scholar) return 'N/A';
    return scholar.type || 'N/A';
  };

  // Get status class for pills
  const getStatusClass = (status) => {
    if (status?.toLowerCase().includes('forwarded')) return 'forwarded';
    if (status?.toLowerCase() === 'generated') return 'generated';
    switch (status) {
      case 'Forwarded': return 'forwarded';
      case 'Generated': return 'generated';
      case 'Verified': return 'verified';
      case 'Pending': return 'pending';
      case 'Duplicate': return 'duplicate';
      default: return 'rejected';
    }
  };

  // Get display status - simplify "Forwarded to X" to just "Forwarded"
  const getDisplayStatus = (status) => {
    if (!status) return 'Pending';
    if (status.toLowerCase().includes('forwarded')) return 'Forwarded';
    return status;
  };

  // Helper: is this scholar's row locked (generated or forwarded)
  const isRowLocked = (scholar) => {
    const s = (scholar.status || '').toLowerCase();
    return s.includes('forwarded') || s === 'generated';
  };

  // Check if scholar is eligible based on required fields
  const checkEligibility = (scholar) => {
    // Helper function to check if a field is valid (not empty, not N/A)
    const isValidField = (field) => {
      if (field === undefined || field === null) return false;
      if (typeof field === 'string') {
        // Remove quotes if present and trim
        const cleanField = field.replace(/^['"]|['"]$/g, '').trim();
        return cleanField !== '' && cleanField.toLowerCase() !== 'n/a';
      }
      if (typeof field === 'number') return true;
      return field !== '';
    };

    // Define required fields with their names for debugging
    const requiredFieldsMap = {
      'Name': scholar.name,
      'Email': scholar.email,
      'Mobile': scholar.mobile,
      'Certificates': scholar.certificates,
      'Faculty': scholar.faculty,
      'Institution': scholar.institution,
      'Department': scholar.department,
      'Type': scholar.type,
      'UG Qualification': scholar.ugQualification,
      'UG Institute': scholar.ugInstitute,
      'UG Degree': scholar.ugDegree,
      'UG Specialization': scholar.ugSpecialization,
      'UG Marking Scheme': scholar.ugMarkingScheme,
      'UG CGPA': scholar.ugCgpa,
      'UG Month & Year': scholar.ugMonthYear,
      'UG Registration No': scholar.ugRegistrationNo,
      'UG Mode of Study': scholar.ugModeOfStudy,
      'UG Place of Institution': scholar.ugPlaceOfInstitution,
      'PG Qualification': scholar.pgQualification,
      'PG Institute': scholar.pgInstitute,
      'PG Degree': scholar.pgDegree,
      'PG Specialization': scholar.pgSpecialization,
      'PG Marking Scheme': scholar.pgMarkingScheme,
      'PG CGPA': scholar.pgCgpa,
      'PG Month & Year': scholar.pgMonthYear,
      'PG Registration No': scholar.pgRegistrationNo,
      'PG Mode of Study': scholar.pgModeOfStudy,
      'PG Place of Institution': scholar.pgPlaceOfInstitution
    };

    // Check each field and collect missing ones
    const missingFields = [];
    for (const [fieldName, fieldValue] of Object.entries(requiredFieldsMap)) {
      if (!isValidField(fieldValue)) {
        missingFields.push(fieldName);
      }
    }

    // Check if all required fields are filled
    const allFieldsFilled = missingFields.length === 0;

    // Check if scholar is a duplicate (by name)
    const isDuplicate = scholarsData.filter(s => {
      if (!s.name || !scholar.name) return false;
      return s.name.trim().toLowerCase() === scholar.name.trim().toLowerCase();
    }).length > 1;

    // Log missing fields for debugging (only in development)
    if (!allFieldsFilled && scholar.name) {
      console.log(`Scholar "${scholar.name}" missing fields:`, missingFields);
    }

    // Scholar is eligible only if all fields are filled AND not a duplicate
    return (allFieldsFilled && !isDuplicate) ? 'Eligible' : 'Not Eligible';
  };

  // Get eligibility class for styling
  const getEligibilityClass = (eligibility) => {
    return eligibility === 'Eligible' ? 'eligible' : 'not-eligible';
  };

  // Debug function to show missing fields
  const showMissingFields = (scholar) => {
    const isValidField = (field) => {
      if (field === undefined || field === null) return false;
      if (typeof field === 'string') {
        const cleanField = field.replace(/^['"]|['"]$/g, '').trim();
        return cleanField !== '' && cleanField.toLowerCase() !== 'n/a';
      }
      if (typeof field === 'number') return true;
      return field !== '';
    };

    const requiredFieldsMap = {
      'Name': scholar.name,
      'Email': scholar.email,
      'Mobile': scholar.mobile,
      'Certificates': scholar.certificates,
      'Faculty': scholar.faculty,
      'Institution': scholar.institution,
      'Department': scholar.department,
      'Type': scholar.type,
      'UG Qualification': scholar.ugQualification,
      'UG Institute': scholar.ugInstitute,
      'UG Degree': scholar.ugDegree,
      'UG Specialization': scholar.ugSpecialization,
      'UG Marking Scheme': scholar.ugMarkingScheme,
      'UG CGPA': scholar.ugCgpa,
      'UG Month & Year': scholar.ugMonthYear,
      'UG Registration No': scholar.ugRegistrationNo,
      'UG Mode of Study': scholar.ugModeOfStudy,
      'UG Place of Institution': scholar.ugPlaceOfInstitution,
      'PG Qualification': scholar.pgQualification,
      'PG Institute': scholar.pgInstitute,
      'PG Degree': scholar.pgDegree,
      'PG Specialization': scholar.pgSpecialization,
      'PG Marking Scheme': scholar.pgMarkingScheme,
      'PG CGPA': scholar.pgCgpa,
      'PG Month & Year': scholar.pgMonthYear,
      'PG Registration No': scholar.pgRegistrationNo,
      'PG Mode of Study': scholar.pgModeOfStudy,
      'PG Place of Institution': scholar.pgPlaceOfInstitution
    };

    const missingFields = [];
    for (const [fieldName, fieldValue] of Object.entries(requiredFieldsMap)) {
      if (!isValidField(fieldValue)) {
        missingFields.push(`${fieldName}: "${fieldValue}"`);
      }
    }

    const isDuplicate = scholarsData.filter(s => {
      if (!s.name || !scholar.name) return false;
      return s.name.trim().toLowerCase() === scholar.name.trim().toLowerCase();
    }).length > 1;

    let message = `Scholar: ${scholar.name}\n\n`;
    if (missingFields.length > 0) {
      message += `Missing/Invalid Fields (${missingFields.length}):\n${missingFields.join('\n')}`;
    } else {
      message += 'All required fields are filled!';
    }

    if (isDuplicate) {
      message += '\n\n⚠️ DUPLICATE: Another scholar with the same name exists!';
    }

    alert(message);
  };

  // Generic sort handler for all columns
  const handleSort = (field) => {
    let direction = 'asc';
    // If clicking the same field, toggle direction
    if (sortConfig.field === field && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ field, direction });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.mobile || !formData.email || !formData.dateOfBirth || !formData.institution || !formData.department || !formData.type) {
      showMessage('Please fill in all required fields', 'error');
      return;
    }

    if (editingScholar) {
      console.log('🔄 Updating scholar:', editingScholar.id);
      console.log('📝 Form data:', formData);

      // Update existing scholar in Supabase
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
        community: formData.community,
        cgpa: parseFloat(formData.cgpa) || 0
      };

      const { data, error } = await updateScholar(editingScholar.id, updateData);
      if (error) {
        console.error('❌ Error updating scholar:', error);
        showMessage('Error updating scholar', 'error');
        return;
      }
      console.log('✅ Scholar updated successfully:', data);
      showMessage('Scholar updated successfully!', 'success');
      console.log('🔄 Reloading scholars from database...');
      await loadScholars();
      console.log('✅ Scholars reloaded');
    } else {
      // Add new scholar to Supabase
      const newScholarData = {
        application_no: formData.applicationNo,
        form_name: formData.formName,
        registered_name: formData.name,
        institution: formData.faculty || formData.institution, // Use faculty as institution
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
        status: formData.status || 'Pending',
        faculty: formData.faculty,
        department: formData.department,
        type: formData.type,
        community: formData.community,
        cgpa: parseFloat(formData.cgpa) || 0,
        current_owner: 'director'
      };

      const { data, error } = await addScholar(newScholarData);
      if (error) {
        console.error('Error adding scholar:', error);
        const errorMsg = error.message || error.hint || 'Unknown error occurred';
        showMessage(`Error adding scholar: ${errorMsg}`, 'error');
        return;
      }
      showMessage('Scholar added successfully!', 'success');
      await loadScholars();
    }

    closeModal();
  };

  // Handle delete scholar - show confirmation modal
  const handleDelete = (scholar) => {
    setDeletingScholar(scholar);
    setShowDeleteModal(true);
  };

  // Confirm delete scholar
  const confirmDelete = async () => {
    if (deletingScholar) {
      // Delete from Supabase
      const { data, error } = await deleteScholar(deletingScholar.id);

      if (error) {
        console.error('Error deleting scholar:', error);
        showMessage('Error deleting scholar from database', 'error');
        return;
      }

      // Update local state
      setScholarsData(prev => prev.filter(s => s.id !== deletingScholar.id));
      showMessage(`${deletingScholar.name} deleted successfully!`, 'success');
      setShowDeleteModal(false);
      setDeletingScholar(null);

      // If duplicates modal is open, refresh the duplicate groups
      if (showDuplicatesModal) {
        // Remove the deleted scholar from duplicate groups
        setDuplicateGroups(prevGroups => {
          const updatedGroups = prevGroups.map(group => ({
            ...group,
            scholars: group.scholars.filter(s => s.id !== deletingScholar.id),
            count: group.scholars.filter(s => s.id !== deletingScholar.id).length
          })).filter(group => group.count > 1); // Remove groups with only 1 scholar left

          // If no duplicate groups remain, close the modal
          if (updatedGroups.length === 0) {
            setShowDuplicatesModal(false);
            showMessage('No more duplicate scholars found', 'success');
          }

          return updatedGroups;
        });
      }

      // Reload scholars to ensure sync
      await loadScholars();
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeletingScholar(null);
  };

  // Handle delete all scholars
  const handleDeleteAll = () => {
    if (scholarsData.length === 0) {
      showMessage('No scholars to delete', 'info');
      return;
    }
    setShowDeleteAllModal(true);
  };

  // Confirm delete all scholars
  const confirmDeleteAll = async () => {
    const { data, error } = await deleteAllDirectorAdminScholars();
    if (error) {
      console.error('Error deleting all scholars:', error);
      showMessage('Error deleting all scholars', 'error');
      return;
    }
    showMessage(`Successfully deleted ${data?.length || 0} scholars!`, 'success');
    await loadScholars();
    setShowDeleteAllModal(false);
  };

  // Cancel delete all
  const cancelDeleteAll = () => {
    setShowDeleteAllModal(false);
  };

  // Selection handlers for bulk actions
  const handleSelectScholar = (scholarId) => {
    // Find the scholar to check if it's forwarded
    const scholar = scholarsData.find(s => s.id === scholarId);
    if (scholar?.status?.toLowerCase().includes('forwarded')) {
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
    const selectableScholars = getFilteredScholars().filter(s => !s.status?.toLowerCase().includes('forwarded'));
    const selectableIds = selectableScholars.map(s => s.id);

    if (selectedScholars.length === selectableIds.length && selectableIds.length > 0) {
      setSelectedScholars([]);
      setShowBulkActions(false);
    } else {
      setSelectedScholars(selectableIds);
      if (selectableIds.length > 0) {
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

    // Get selected scholars data
    const selectedScholarsData = scholarsData.filter(s => selectedScholars.includes(s.id));

    // Check if any selected scholar has already been forwarded
    const alreadyForwarded = selectedScholarsData.some(s => s.status && s.status.toLowerCase().includes('forwarded'));
    if (alreadyForwarded) {
      showMessage('Some selected scholars have already been forwarded. Please deselect them.', 'error');
      return;
    }

    // Check for duplicates among ALL scholars (not just selected ones)
    const allScholars = getFilteredScholars();
    const appNoMap = new Map();
    const emailMap = new Map();
    const mobileMap = new Map();
    let duplicateGroups = [];

    // Build duplicate detection maps for all scholars
    for (const scholar of allScholars) {
      // 1. Check Application Number Duplicates
      if (scholar.applicationNo && typeof scholar.applicationNo === 'string') {
        const normalizedAppNo = scholar.applicationNo.trim().toLowerCase();
        if (normalizedAppNo) {
          if (appNoMap.has(normalizedAppNo)) {
            // Found duplicate - add to existing group or create new one
            const existingGroup = duplicateGroups.find(g => g.type === 'Application Number' && g.value === normalizedAppNo);
            if (existingGroup) {
              existingGroup.scholars.push(scholar);
              existingGroup.count++;
            } else {
              const firstScholar = appNoMap.get(normalizedAppNo);
              duplicateGroups.push({
                type: 'Application Number',
                value: scholar.applicationNo,
                scholars: [firstScholar, scholar],
                count: 2
              });
            }
          } else {
            appNoMap.set(normalizedAppNo, scholar);
          }
        }
      }

      // 2. Check Email Duplicates
      if (scholar.email && typeof scholar.email === 'string') {
        const normalizedEmail = scholar.email.trim().toLowerCase();
        if (normalizedEmail) {
          if (emailMap.has(normalizedEmail)) {
            // Found duplicate - add to existing group or create new one
            const existingGroup = duplicateGroups.find(g => g.type === 'Email' && g.value === normalizedEmail);
            if (existingGroup) {
              if (!existingGroup.scholars.find(s => s.id === scholar.id)) {
                existingGroup.scholars.push(scholar);
                existingGroup.count++;
              }
            } else {
              const firstScholar = emailMap.get(normalizedEmail);
              duplicateGroups.push({
                type: 'Email',
                value: scholar.email,
                scholars: [firstScholar, scholar],
                count: 2
              });
            }
          } else {
            emailMap.set(normalizedEmail, scholar);
          }
        }
      }

      // 3. Check Mobile Duplicates
      if (scholar.mobile && typeof scholar.mobile === 'string') {
        // Remove non-digit characters for accurate comparison
        const normalizedPhone = scholar.mobile.replace(/\D/g, '');
        if (normalizedPhone.length > 0) {
          if (mobileMap.has(normalizedPhone)) {
            // Found duplicate - add to existing group or create new one
            const existingGroup = duplicateGroups.find(g => g.type === 'Mobile' && g.value === normalizedPhone);
            if (existingGroup) {
              if (!existingGroup.scholars.find(s => s.id === scholar.id)) {
                existingGroup.scholars.push(scholar);
                existingGroup.count++;
              }
            } else {
              const firstScholar = mobileMap.get(normalizedPhone);
              duplicateGroups.push({
                type: 'Mobile',
                value: scholar.mobile,
                scholars: [firstScholar, scholar],
                count: 2
              });
            }
          } else {
            mobileMap.set(normalizedPhone, scholar);
          }
        }
      }
    }

    // Filter duplicate groups to only include those that affect selected scholars
    const relevantDuplicateGroups = duplicateGroups.filter(group =>
      group.scholars.some(scholar => selectedScholars.includes(scholar.id))
    );

    // If duplicates exist that affect selected scholars, show popup
    if (relevantDuplicateGroups.length > 0) {
      setDuplicateGroups(relevantDuplicateGroups);
      setShowDuplicatesModal(true);
      setPendingForwardAction('bulk'); // Set pending action for bulk forward
      const totalDuplicates = relevantDuplicateGroups.reduce((sum, group) => sum + group.count, 0);
      showMessage(`Found ${relevantDuplicateGroups.length} duplicate groups affecting selected scholars with ${totalDuplicates} total scholars. Please resolve duplicates before forwarding.`, 'warning');
      return;
    }

    setShowBulkForwardModal(true);
  };

  const confirmBulkForward = async () => {
    try {
      const updates = selectedScholars.map(id =>
        forwardScholarToRC(id)
      );
      await Promise.all(updates);
      showMessage(`${selectedScholars.length} scholars forwarded successfully!`, 'success');
      setShowBulkForwardModal(false);
      handleClearSelection();
      await loadScholars();
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
      const deletions = selectedScholars.map(id =>
        deleteScholar(id)
      );
      await Promise.all(deletions);
      showMessage(`${selectedScholars.length} scholars deleted successfully!`, 'success');
      setShowBulkDeleteModal(false);
      handleClearSelection();
      await loadScholars();
    } catch (error) {
      console.error('Error deleting scholars:', error);
      showMessage('Failed to delete scholars', 'error');
    }
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

  // Handle forward scholar - with confirmation
  const handleForward = (scholar) => {
    // Check if this scholar has duplicates or has already been forwarded
    const displayedScholars = getFilteredScholars();

    let duplicateScholars = [];
    let alreadyForwarded = false;

    // Iterate through all scholars to check for duplicates and forwarded status
    for (const s of displayedScholars) {
      // Skip the current scholar
      if (s.id === scholar.id) continue;

      // Check if matching scholar has already been forwarded
      let isMatch = false;

      // 1. Check Application Number Match
      if (scholar.applicationNo && s.applicationNo) {
        const normalizedAppNo1 = scholar.applicationNo.trim().toLowerCase();
        const normalizedAppNo2 = s.applicationNo.trim().toLowerCase();
        if (normalizedAppNo1 && normalizedAppNo1 === normalizedAppNo2) {
          isMatch = true;
        }
      }

      // 2. Check Email Match
      if (!isMatch && scholar.email && s.email) {
        const normalizedEmail1 = scholar.email.trim().toLowerCase();
        const normalizedEmail2 = s.email.trim().toLowerCase();
        if (normalizedEmail1 && normalizedEmail1 === normalizedEmail2) {
          isMatch = true;
        }
      }

      // 3. Check Mobile Match
      if (!isMatch && scholar.mobile && s.mobile) {
        const normalizedPhone1 = scholar.mobile.replace(/\D/g, '');
        const normalizedPhone2 = s.mobile.replace(/\D/g, '');
        if (normalizedPhone1.length > 0 && normalizedPhone1 === normalizedPhone2) {
          isMatch = true;
        }
      }

      // If match found, check if it's a duplicate or already forwarded
      if (isMatch) {
        // If the matching scholar is already forwarded, mark as alreadyForwarded
        if (s.status && s.status.toLowerCase().includes('forwarded')) {
          alreadyForwarded = true;
          break;
        } else {
          // Otherwise it's a duplicate (same person, not yet forwarded)
          duplicateScholars.push(s);
        }
      }
    }

    // If already forwarded, show error
    if (alreadyForwarded) {
      showMessage('This scholar has already been forwarded previously. A scholar with the same Application No, Email, or Phone has already been processed.', 'error');
      return;
    }

    // If duplicates exist, show popup to delete duplicates
    if (duplicateScholars.length > 0) {
      // Create duplicate group for this scholar and its duplicates
      const duplicateGroup = {
        type: 'Forward Conflict',
        value: scholar.name,
        scholars: [scholar, ...duplicateScholars],
        count: duplicateScholars.length + 1,
        forwardingScholar: scholar // Store the scholar user wants to forward
      };

      setDuplicateGroups([duplicateGroup]);
      setShowDuplicatesModal(true);
      setPendingForwardAction('single'); // Set pending action for single scholar forward
      showMessage(`Found ${duplicateScholars.length} duplicate(s) for this scholar. Please delete the duplicates before forwarding.`, 'warning');
      return;
    }

    setForwardingScholar(scholar);
    setShowForwardModal(true);
  };

  // Confirm forward scholar
  const confirmForward = async () => {
    if (forwardingScholar) {
      const { data, error } = await forwardScholarToRC(forwardingScholar.id);
      if (error) {
        console.error('Error forwarding scholar:', error);
        showMessage('Error forwarding scholar', 'error');
        return;
      }
      showMessage(`${forwardingScholar.name} has been forwarded to coordinator successfully!`, 'success');
      await loadScholars();
      setShowForwardModal(false);
      setForwardingScholar(null);
    }
  };

  // Cancel forward
  const cancelForward = () => {
    setShowForwardModal(false);
    setForwardingScholar(null);
  };

  const handleForwardAll = () => {
    // First check if there are any duplicates in the FILTERED/DISPLAYED scholars
    const displayedScholars = getFilteredScholars();

    // Maps to track unique fields
    const appNoMap = new Map();
    const emailMap = new Map();
    const mobileMap = new Map();

    let duplicateGroups = [];

    // Iterate through scholars to check for duplicates in Application No, Email, or Mobile
    for (const scholar of displayedScholars) {

      // 1. Check Application Number Duplicates
      if (scholar.applicationNo && typeof scholar.applicationNo === 'string') {
        const normalizedAppNo = scholar.applicationNo.trim().toLowerCase();
        if (normalizedAppNo) {
          if (appNoMap.has(normalizedAppNo)) {
            // Found duplicate - add to existing group or create new one
            const existingGroup = duplicateGroups.find(g => g.type === 'Application Number' && g.value === normalizedAppNo);
            if (existingGroup) {
              existingGroup.scholars.push(scholar);
              existingGroup.count++;
            } else {
              const firstScholar = appNoMap.get(normalizedAppNo);
              duplicateGroups.push({
                type: 'Application Number',
                value: scholar.applicationNo,
                scholars: [firstScholar, scholar],
                count: 2
              });
            }
          } else {
            appNoMap.set(normalizedAppNo, scholar);
          }
        }
      }

      // 2. Check Email Duplicates
      if (scholar.email && typeof scholar.email === 'string') {
        const normalizedEmail = scholar.email.trim().toLowerCase();
        if (normalizedEmail) {
          if (emailMap.has(normalizedEmail)) {
            // Found duplicate - add to existing group or create new one
            const existingGroup = duplicateGroups.find(g => g.type === 'Email' && g.value === normalizedEmail);
            if (existingGroup) {
              if (!existingGroup.scholars.find(s => s.id === scholar.id)) {
                existingGroup.scholars.push(scholar);
                existingGroup.count++;
              }
            } else {
              const firstScholar = emailMap.get(normalizedEmail);
              duplicateGroups.push({
                type: 'Email',
                value: scholar.email,
                scholars: [firstScholar, scholar],
                count: 2
              });
            }
          } else {
            emailMap.set(normalizedEmail, scholar);
          }
        }
      }

      // 3. Check Mobile Duplicates
      if (scholar.mobile && typeof scholar.mobile === 'string') {
        // Remove non-digit characters for accurate comparison
        const normalizedPhone = scholar.mobile.replace(/\D/g, '');
        if (normalizedPhone.length > 0) {
          if (mobileMap.has(normalizedPhone)) {
            // Found duplicate - add to existing group or create new one
            const existingGroup = duplicateGroups.find(g => g.type === 'Mobile' && g.value === normalizedPhone);
            if (existingGroup) {
              if (!existingGroup.scholars.find(s => s.id === scholar.id)) {
                existingGroup.scholars.push(scholar);
                existingGroup.count++;
              }
            } else {
              const firstScholar = mobileMap.get(normalizedPhone);
              duplicateGroups.push({
                type: 'Mobile',
                value: scholar.mobile,
                scholars: [firstScholar, scholar],
                count: 2
              });
            }
          } else {
            mobileMap.set(normalizedPhone, scholar);
          }
        }
      }
    }

    // If duplicates exist, show popup to handle them
    if (duplicateGroups.length > 0) {
      setDuplicateGroups(duplicateGroups);
      setShowDuplicatesModal(true);
      setPendingForwardAction('all'); // Set pending action for forward all
      const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.count, 0);
      showMessage(`Found ${duplicateGroups.length} duplicate groups with ${totalDuplicates} total scholars. Please resolve duplicates before forwarding all.`, 'warning');
      return;
    }

    // Filter scholars to forward:
    // REMOVED checkEligibility() entirely.
    // Only checking if they are NOT already forwarded.
    const scholarsToForward = displayedScholars.filter(s => {
      const status = s.status ? s.status.toLowerCase() : '';
      return !status.includes('forwarded');
    });

    if (scholarsToForward.length === 0) {
      showMessage('No pending scholars to forward.', 'info');
      return;
    }

    setShowForwardAllModal(true);
  };

  // Confirm forward all
  const confirmForwardAll = async () => {
    // CRITICAL FIX: Removed checkEligibility(s) === 'Eligible'
    // Now forwards ANY scholar that isn't already forwarded
    const scholarsToForward = getFilteredScholars().filter(s => {
      const status = s.status ? s.status.toLowerCase() : '';
      return !status.includes('forwarded');
    });

    if (scholarsToForward.length === 0) {
      setShowForwardAllModal(false);
      return;
    }

    // Forward all scholars in the database
    const forwardPromises = scholarsToForward.map(scholar =>
      forwardScholarToRC(scholar.id)
    );

    try {
      await Promise.all(forwardPromises);
      showMessage(`${scholarsToForward.length} scholars have been forwarded to coordinators successfully!`, 'success');
      await loadScholars(); // Refresh data from database
      setShowForwardAllModal(false);
    } catch (error) {
      console.error('Error forwarding scholars:', error);
      showMessage('Error forwarding some scholars', 'error');
    }
  };

  // Cancel forward all
  const cancelForwardAll = () => {
    setShowForwardAllModal(false);
  };

  // Handle view duplicates - Find scholars based on phone, email, and name (only in displayed/filtered scholars)
  const handleViewDuplicates = () => {
    const duplicates = [];
    const phoneMap = new Map();
    const emailMap = new Map();
    const phoneEmailComboMap = new Map();

    // Get only the currently displayed/filtered scholars
    const displayedScholars = getFilteredScholars();

    // Group scholars by phone and email
    displayedScholars.forEach(scholar => {
      // Group by phone number (normalized)
      if (scholar.mobile && typeof scholar.mobile === 'string') {
        const normalizedPhone = scholar.mobile.trim().replace(/\s+/g, '');
        if (normalizedPhone) {
          if (!phoneMap.has(normalizedPhone)) {
            phoneMap.set(normalizedPhone, []);
          }
          phoneMap.get(normalizedPhone).push(scholar);
        }
      }

      // Group by email (case-insensitive, trimmed)
      if (scholar.email && typeof scholar.email === 'string') {
        const normalizedEmail = scholar.email.trim().toLowerCase();
        if (normalizedEmail) {
          if (!emailMap.has(normalizedEmail)) {
            emailMap.set(normalizedEmail, []);
          }
          emailMap.get(normalizedEmail).push(scholar);
        }
      }

      // Group by phone + email combination for name checking
      if (scholar.mobile && scholar.email && typeof scholar.mobile === 'string' && typeof scholar.email === 'string') {
        const normalizedPhone = scholar.mobile.trim().replace(/\s+/g, '');
        const normalizedEmail = scholar.email.trim().toLowerCase();
        const comboKey = `${normalizedPhone}|${normalizedEmail}`;

        if (normalizedPhone && normalizedEmail) {
          if (!phoneEmailComboMap.has(comboKey)) {
            phoneEmailComboMap.set(comboKey, []);
          }
          phoneEmailComboMap.get(comboKey).push(scholar);
        }
      }
    });

    // Track already added scholar IDs to avoid duplicates in the report
    const addedScholarIds = new Set();

    // Find duplicates by phone number (highest priority)
    phoneMap.forEach((scholars, phone) => {
      if (scholars.length > 1) {
        const newScholars = scholars.filter(s => !addedScholarIds.has(s.id));
        if (newScholars.length > 1) {
          duplicates.push({
            type: 'Phone Number',
            value: scholars[0].mobile,
            scholars: newScholars,
            count: newScholars.length
          });
          newScholars.forEach(s => addedScholarIds.add(s.id));
        }
      }
    });

    // Find duplicates by email (second priority)
    emailMap.forEach((scholars, email) => {
      if (scholars.length > 1) {
        const newScholars = scholars.filter(s => !addedScholarIds.has(s.id));
        if (newScholars.length > 1) {
          duplicates.push({
            type: 'Email',
            value: scholars[0].email,
            scholars: newScholars,
            count: newScholars.length
          });
          newScholars.forEach(s => addedScholarIds.add(s.id));
        }
      }
    });

    // Find duplicates by name (only if phone AND email are the same)
    phoneEmailComboMap.forEach((scholars, comboKey) => {
      if (scholars.length > 1) {
        // Group by name within this phone+email combination
        const nameGroups = new Map();
        scholars.forEach(scholar => {
          if (scholar.name && typeof scholar.name === 'string') {
            const normalizedName = scholar.name.trim().toLowerCase();
            if (normalizedName) {
              if (!nameGroups.has(normalizedName)) {
                nameGroups.set(normalizedName, []);
              }
              nameGroups.get(normalizedName).push(scholar);
            }
          }
        });

        // Check for name duplicates within same phone+email
        nameGroups.forEach((nameScholars, name) => {
          if (nameScholars.length > 1) {
            const newScholars = nameScholars.filter(s => !addedScholarIds.has(s.id));
            if (newScholars.length > 1) {
              duplicates.push({
                type: 'Name (Same Phone & Email)',
                value: nameScholars[0].name,
                scholars: newScholars,
                count: newScholars.length
              });
              newScholars.forEach(s => addedScholarIds.add(s.id));
            }
          }
        });
      }
    });

    if (duplicates.length > 0) {
      setDuplicateGroups(duplicates);
      setShowDuplicatesModal(true);
      const totalDuplicates = duplicates.reduce((sum, group) => sum + group.count, 0);
      showMessage(`Found ${duplicates.length} duplicate groups with ${totalDuplicates} total scholars`, 'warning');
    } else {
      showMessage('No duplicate scholars found', 'success');
    }
  };

  // Handle delete all uploaded duplicates
  const handleDeleteAllUploadedDuplicates = () => {
    // Find all non-forwarded/non-generated scholars in duplicate groups
    const deletableDuplicates = [];
    duplicateGroups.forEach(group => {
      group.scholars.forEach(scholar => {
        if (!isRowLocked(scholar)) {
          deletableDuplicates.push(scholar);
        }
      });
    });

    if (deletableDuplicates.length === 0) {
      showMessage('No deletable duplicate scholars found (all are forwarded or generated)', 'info');
      return;
    }

    // Show custom confirmation modal
    setShowDeleteAllDuplicatesModal(true);
  };

  // Confirm delete all uploaded duplicates
  const confirmDeleteAllUploadedDuplicates = async () => {
    const deletableDuplicates = [];
    duplicateGroups.forEach(group => {
      group.scholars.forEach(scholar => {
        if (!isRowLocked(scholar)) {
          deletableDuplicates.push(scholar);
        }
      });
    });

    try {
      // Delete from Supabase
      const idsToDelete = deletableDuplicates.map(s => s.id);

      const { error } = await supabase
        .from('scholar_applications')
        .delete()
        .in('id', idsToDelete);

      if (error) {
        console.error('Error deleting scholars:', error);
        showMessage('Failed to delete scholars from database', 'error');
        return;
      }

      // Update local state
      setScholarsData(prev => prev.filter(s => !idsToDelete.includes(s.id)));

      // Update duplicate groups by removing deleted scholars
      setDuplicateGroups(prevGroups => {
        const updatedGroups = prevGroups.map(group => ({
          ...group,
          scholars: group.scholars.filter(s => !idsToDelete.includes(s.id)),
          count: group.scholars.filter(s => !idsToDelete.includes(s.id)).length
        })).filter(group => group.count > 1); // Remove groups with only 1 scholar left

        return updatedGroups;
      });

      showMessage(`Successfully deleted ${deletableDuplicates.length} duplicate scholar(s)`, 'success');
      setShowDeleteAllDuplicatesModal(false);

      // Check if any duplicate groups remain
      const remainingGroups = duplicateGroups.map(group => ({
        ...group,
        scholars: group.scholars.filter(s => !idsToDelete.includes(s.id)),
        count: group.scholars.filter(s => !idsToDelete.includes(s.id)).length
      })).filter(group => group.count > 1);

      if (remainingGroups.length === 0) {
        setShowDuplicatesModal(false);
        showMessage('No more duplicate scholars found', 'success');
      }

    } catch (err) {
      console.error('Exception deleting scholars:', err);
      showMessage('Failed to delete scholars', 'error');
    }
  };

  // Handle forward after cleanup - check if duplicates are resolved and proceed with forward
  const handleForwardAfterCleanup = async () => {
    // Re-check for duplicates to ensure they've been resolved
    const displayedScholars = getFilteredScholars();

    if (pendingForwardAction === 'single') {
      // For single scholar forward, check if the specific scholar still has duplicates
      const forwardingScholarFromGroup = duplicateGroups[0]?.forwardingScholar;
      if (!forwardingScholarFromGroup) {
        showMessage('Error: Could not find the scholar to forward', 'error');
        return;
      }

      // Find current version of the scholar (in case it was updated)
      const currentScholar = displayedScholars.find(s => s.id === forwardingScholarFromGroup.id);
      if (!currentScholar) {
        showMessage('Error: Scholar not found or may have been deleted', 'error');
        return;
      }

      // Check if duplicates still exist for this scholar
      let duplicateScholars = [];
      for (const s of displayedScholars) {
        if (s.id === currentScholar.id) continue;

        let isMatch = false;

        // Check Application Number Match
        if (currentScholar.applicationNo && s.applicationNo) {
          const normalizedAppNo1 = currentScholar.applicationNo.trim().toLowerCase();
          const normalizedAppNo2 = s.applicationNo.trim().toLowerCase();
          if (normalizedAppNo1 && normalizedAppNo1 === normalizedAppNo2) {
            isMatch = true;
          }
        }

        // Check Email Match
        if (!isMatch && currentScholar.email && s.email) {
          const normalizedEmail1 = currentScholar.email.trim().toLowerCase();
          const normalizedEmail2 = s.email.trim().toLowerCase();
          if (normalizedEmail1 && normalizedEmail1 === normalizedEmail2) {
            isMatch = true;
          }
        }

        // Check Mobile Match
        if (!isMatch && currentScholar.mobile && s.mobile) {
          const normalizedPhone1 = currentScholar.mobile.replace(/\D/g, '');
          const normalizedPhone2 = s.mobile.replace(/\D/g, '');
          if (normalizedPhone1.length > 0 && normalizedPhone1 === normalizedPhone2) {
            isMatch = true;
          }
        }

        if (isMatch && !s.status?.toLowerCase().includes('forwarded')) {
          duplicateScholars.push(s);
        }
      }

      if (duplicateScholars.length > 0) {
        showMessage(`Still found ${duplicateScholars.length} duplicate(s). Please delete all duplicates before forwarding.`, 'warning');
        return;
      }

      // No duplicates found, proceed with forward
      setShowDuplicatesModal(false);
      setPendingForwardAction(null);
      setForwardingScholar(currentScholar);
      setShowForwardModal(true);

    } else if (pendingForwardAction === 'all') {
      // For forward all, re-check for any duplicates in the system
      const appNoMap = new Map();
      const emailMap = new Map();
      const mobileMap = new Map();
      let duplicateGroups = [];

      // Re-run duplicate detection
      for (const scholar of displayedScholars) {
        // Check Application Number Duplicates
        if (scholar.applicationNo && typeof scholar.applicationNo === 'string') {
          const normalizedAppNo = scholar.applicationNo.trim().toLowerCase();
          if (normalizedAppNo) {
            if (appNoMap.has(normalizedAppNo)) {
              const existingGroup = duplicateGroups.find(g => g.type === 'Application Number' && g.value === normalizedAppNo);
              if (existingGroup) {
                existingGroup.scholars.push(scholar);
                existingGroup.count++;
              } else {
                const firstScholar = appNoMap.get(normalizedAppNo);
                duplicateGroups.push({
                  type: 'Application Number',
                  value: scholar.applicationNo,
                  scholars: [firstScholar, scholar],
                  count: 2
                });
              }
            } else {
              appNoMap.set(normalizedAppNo, scholar);
            }
          }
        }

        // Check Email Duplicates
        if (scholar.email && typeof scholar.email === 'string') {
          const normalizedEmail = scholar.email.trim().toLowerCase();
          if (normalizedEmail) {
            if (emailMap.has(normalizedEmail)) {
              const existingGroup = duplicateGroups.find(g => g.type === 'Email' && g.value === normalizedEmail);
              if (existingGroup) {
                if (!existingGroup.scholars.find(s => s.id === scholar.id)) {
                  existingGroup.scholars.push(scholar);
                  existingGroup.count++;
                }
              } else {
                const firstScholar = emailMap.get(normalizedEmail);
                duplicateGroups.push({
                  type: 'Email',
                  value: scholar.email,
                  scholars: [firstScholar, scholar],
                  count: 2
                });
              }
            } else {
              emailMap.set(normalizedEmail, scholar);
            }
          }
        }

        // Check Mobile Duplicates
        if (scholar.mobile && typeof scholar.mobile === 'string') {
          const normalizedPhone = scholar.mobile.replace(/\D/g, '');
          if (normalizedPhone.length > 0) {
            if (mobileMap.has(normalizedPhone)) {
              const existingGroup = duplicateGroups.find(g => g.type === 'Mobile' && g.value === normalizedPhone);
              if (existingGroup) {
                if (!existingGroup.scholars.find(s => s.id === scholar.id)) {
                  existingGroup.scholars.push(scholar);
                  existingGroup.count++;
                }
              } else {
                const firstScholar = mobileMap.get(normalizedPhone);
                duplicateGroups.push({
                  type: 'Mobile',
                  value: scholar.mobile,
                  scholars: [firstScholar, scholar],
                  count: 2
                });
              }
            } else {
              mobileMap.set(normalizedPhone, scholar);
            }
          }
        }
      }

      if (duplicateGroups.length > 0) {
        const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.count, 0);
        showMessage(`Still found ${duplicateGroups.length} duplicate groups with ${totalDuplicates} total scholars. Please resolve all duplicates before forwarding.`, 'warning');
        return;
      }

      // No duplicates found, proceed with forward all
      setShowDuplicatesModal(false);
      setPendingForwardAction(null);
      setShowForwardAllModal(true);
    } else if (pendingForwardAction === 'bulk') {
      // For bulk forward, re-check for duplicates affecting selected scholars
      const selectedScholarsData = scholarsData.filter(s => selectedScholars.includes(s.id));
      const appNoMap = new Map();
      const emailMap = new Map();
      const mobileMap = new Map();
      let duplicateGroups = [];

      // Re-run duplicate detection for all scholars
      for (const scholar of displayedScholars) {
        // Check Application Number Duplicates
        if (scholar.applicationNo && typeof scholar.applicationNo === 'string') {
          const normalizedAppNo = scholar.applicationNo.trim().toLowerCase();
          if (normalizedAppNo) {
            if (appNoMap.has(normalizedAppNo)) {
              const existingGroup = duplicateGroups.find(g => g.type === 'Application Number' && g.value === normalizedAppNo);
              if (existingGroup) {
                existingGroup.scholars.push(scholar);
                existingGroup.count++;
              } else {
                const firstScholar = appNoMap.get(normalizedAppNo);
                duplicateGroups.push({
                  type: 'Application Number',
                  value: scholar.applicationNo,
                  scholars: [firstScholar, scholar],
                  count: 2
                });
              }
            } else {
              appNoMap.set(normalizedAppNo, scholar);
            }
          }
        }

        // Check Email Duplicates
        if (scholar.email && typeof scholar.email === 'string') {
          const normalizedEmail = scholar.email.trim().toLowerCase();
          if (normalizedEmail) {
            if (emailMap.has(normalizedEmail)) {
              const existingGroup = duplicateGroups.find(g => g.type === 'Email' && g.value === normalizedEmail);
              if (existingGroup) {
                if (!existingGroup.scholars.find(s => s.id === scholar.id)) {
                  existingGroup.scholars.push(scholar);
                  existingGroup.count++;
                }
              } else {
                const firstScholar = emailMap.get(normalizedEmail);
                duplicateGroups.push({
                  type: 'Email',
                  value: scholar.email,
                  scholars: [firstScholar, scholar],
                  count: 2
                });
              }
            } else {
              emailMap.set(normalizedEmail, scholar);
            }
          }
        }

        // Check Mobile Duplicates
        if (scholar.mobile && typeof scholar.mobile === 'string') {
          const normalizedPhone = scholar.mobile.replace(/\D/g, '');
          if (normalizedPhone.length > 0) {
            if (mobileMap.has(normalizedPhone)) {
              const existingGroup = duplicateGroups.find(g => g.type === 'Mobile' && g.value === normalizedPhone);
              if (existingGroup) {
                if (!existingGroup.scholars.find(s => s.id === scholar.id)) {
                  existingGroup.scholars.push(scholar);
                  existingGroup.count++;
                }
              } else {
                const firstScholar = mobileMap.get(normalizedPhone);
                duplicateGroups.push({
                  type: 'Mobile',
                  value: scholar.mobile,
                  scholars: [firstScholar, scholar],
                  count: 2
                });
              }
            } else {
              mobileMap.set(normalizedPhone, scholar);
            }
          }
        }
      }

      // Filter duplicate groups to only include those that affect selected scholars
      const relevantDuplicateGroups = duplicateGroups.filter(group =>
        group.scholars.some(scholar => selectedScholars.includes(scholar.id))
      );

      if (relevantDuplicateGroups.length > 0) {
        const totalDuplicates = relevantDuplicateGroups.reduce((sum, group) => sum + group.count, 0);
        showMessage(`Still found ${relevantDuplicateGroups.length} duplicate groups affecting selected scholars with ${totalDuplicates} total scholars. Please resolve all duplicates before forwarding.`, 'warning');
        return;
      }

      // No duplicates found affecting selected scholars, proceed with bulk forward
      setShowDuplicatesModal(false);
      setPendingForwardAction(null);
      setShowBulkForwardModal(true);
    }
  };

  // Initialize download modal
  const handleDownloadClick = () => {
    // Select all columns by default
    setSelectedColumns(ALL_AVAILABLE_COLUMNS.map(col => col.key));
    setShowDownloadModal(true);
  };

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

  // Handle download excel
  const confirmDownloadExcel = () => {
    if (selectedColumns.length === 0) {
      showMessage('Please select at least one column to download.', 'warning');
      return;
    }

    try {
      // Prepare comprehensive data with all fields
      const fullExcelData = scholarsData.map((scholar, index) => {
        const eligibility = checkEligibility(scholar);
        const displayDept = getDisplayDepartment(scholar);

        return {
          // ========== BASIC INFORMATION ==========
          'S.No': index + 1,
          'Application No': scholar.applicationNo || scholar.application_no || '-',
          'Form Name': scholar.formName || scholar.form_name || 'PhD Application Form',
          'Eligibility Status': eligibility || '-',
          'Current Status': scholar.status || '-',

          // ========== PERSONAL DETAILS ==========
          'Registered Name': scholar.name || scholar.registered_name || '-',
          'Community': scholar.community || '-',
          'Date of Birth': scholar.dateOfBirth || scholar.date_of_birth || '-',
          'Gender': scholar.gender || '-',
          'Mobile Number': scholar.mobile || scholar.mobile_number || scholar.phone || '-',
          'Email': scholar.email || '-',
          'Nationality': scholar.nationality || 'Indian',
          'Aadhaar No': scholar.aadhaarNo || scholar.aadhaar_no || '-',
          'Differently Abled': scholar.differentlyAbled || scholar.differently_abled || 'No',
          'Nature of Deformity': scholar.natureOfDeformity || scholar.nature_of_deformity || '-',
          'Percentage of Deformity': scholar.percentageOfDeformity || scholar.percentage_of_deformity || '-',

          // ========== PROGRAM INFORMATION ==========
          'Institution': scholar.institution || 'SRM Institute of Science and Technology',
          'Faculty': scholar.faculty || '-',
          'Department': displayDept || '-',
          'Program': scholar.program || '-',
          'Program Type': scholar.type || scholar.programType || scholar.program_type || '-',
          'Course': scholar.course || '-',

          // ========== ACADEMIC BACKGROUND ==========
          'Graduated From India': scholar.graduatedFromIndia || scholar.graduated_from_india || 'Yes',
          'Mode of Profession': scholar.modeOfProfession || scholar.mode_of_profession || 'Academic',
          'Area of Interest': scholar.areaOfInterest || scholar.area_of_interest || '-',

          // ========== EMPLOYMENT DETAILS ==========
          'Employee ID': scholar.employeeId || scholar.employee_id || '-',
          'Designation': scholar.designation || '-',
          'Organization Name': scholar.organizationName || scholar.organization_name || '-',
          'Organization Address': scholar.organizationAddress || scholar.organization_address || '-',

          // ========== UG EDUCATION ==========
          'UG Qualification': scholar.ugQualification || scholar.ug_qualification || '-',
          'UG Institute': scholar.ugInstitute || scholar.ug_institute || scholar.ugInstitution || '-',
          'UG Degree': scholar.ugDegree || scholar.ug_degree || '-',
          'UG Specialization': scholar.ugSpecialization || scholar.ug_specialization || '-',
          'UG Marking Scheme': scholar.ugMarkingScheme || scholar.ug_marking_scheme || '-',
          'UG CGPA/Percentage': scholar.ugCgpa || scholar.ug_cgpa || scholar.ugMarks || '-',
          'UG Month & Year': scholar.ugMonthYear || scholar.ug_month_year || scholar.ugYear || '-',
          'UG Registration No': scholar.ugRegistrationNo || scholar.ug_registration_no || '-',
          'UG Mode of Study': scholar.ugModeOfStudy || scholar.ug_mode_of_study || '-',
          'UG Place of Institution': scholar.ugPlaceOfInstitution || scholar.ug_place_of_institution || '-',

          // ========== PG EDUCATION ==========
          'PG Qualification': scholar.pgQualification || scholar.pg_qualification || '-',
          'PG Institute': scholar.pgInstitute || scholar.pg_institute || scholar.pgInstitution || '-',
          'PG Degree': scholar.pgDegree || scholar.pg_degree || '-',
          'PG Specialization': scholar.pgSpecialization || scholar.pg_specialization || '-',
          'PG Marking Scheme': scholar.pgMarkingScheme || scholar.pg_marking_scheme || '-',
          'PG CGPA/Percentage': scholar.pgCgpa || scholar.pg_cgpa || scholar.pgMarks || '-',
          'PG Month & Year': scholar.pgMonthYear || scholar.pg_month_year || scholar.pgYear || '-',
          'PG Registration No': scholar.pgRegistrationNo || scholar.pg_registration_no || '-',
          'PG Mode of Study': scholar.pgModeOfStudy || scholar.pg_mode_of_study || '-',
          'PG Place of Institution': scholar.pgPlaceOfInstitution || scholar.pg_place_of_institution || '-',

          // ========== OTHER DEGREE ==========
          'Other Qualification': scholar.otherQualification || scholar.other_qualification || '-',
          'Other Institute': scholar.otherInstitute || scholar.other_institute || scholar.otherInstitution || '-',
          'Other Degree': scholar.otherDegree || scholar.other_degree || scholar.otherDegreeName || '-',
          'Other Specialization': scholar.otherSpecialization || scholar.other_specialization || '-',
          'Other Marking Scheme': scholar.otherMarkingScheme || scholar.other_marking_scheme || '-',
          'Other CGPA/Percentage': scholar.otherCgpa || scholar.other_cgpa || scholar.otherMarks || '-',
          'Other Month & Year': scholar.otherMonthYear || scholar.other_month_year || scholar.otherYear || '-',
          'Other Registration No': scholar.otherRegistrationNo || scholar.other_registration_no || '-',
          'Other Mode of Study': scholar.otherModeOfStudy || scholar.other_mode_of_study || '-',
          'Other Place of Institution': scholar.otherPlaceOfInstitution || scholar.other_place_of_institution || '-',

          // ========== COMPETITIVE EXAM 1 ==========
          'Competitive Exam Taken': scholar.competitiveExam || scholar.competitive_exam || 'No',
          'Exam 1 Name': scholar.exam1Name || scholar.exam1_name || scholar.gateExam || '-',
          'Exam 1 Registration No': scholar.exam1RegNo || scholar.exam1_reg_no || scholar.gateRollNo || '-',
          'Exam 1 Score': scholar.exam1Score || scholar.exam1_score || scholar.gateScore || '-',
          'Exam 1 Max Score': scholar.exam1MaxScore || scholar.exam1_max_score || '-',
          'Exam 1 Year': scholar.exam1Year || scholar.exam1_year || scholar.gateYear || '-',
          'Exam 1 Rank': scholar.exam1Rank || scholar.exam1_rank || scholar.gateRank || '-',
          'Exam 1 Qualified': scholar.exam1Qualified || scholar.exam1_qualified || '-',

          // ========== COMPETITIVE EXAM 2 ==========
          'Exam 2 Name': scholar.exam2Name || scholar.exam2_name || scholar.netExam || '-',
          'Exam 2 Registration No': scholar.exam2RegNo || scholar.exam2_reg_no || scholar.netRollNo || '-',
          'Exam 2 Score': scholar.exam2Score || scholar.exam2_score || scholar.netScore || '-',
          'Exam 2 Max Score': scholar.exam2MaxScore || scholar.exam2_max_score || '-',
          'Exam 2 Year': scholar.exam2Year || scholar.exam2_year || scholar.netYear || '-',
          'Exam 2 Rank': scholar.exam2Rank || scholar.exam2_rank || scholar.netRank || '-',
          'Exam 2 Qualified': scholar.exam2Qualified || scholar.exam2_qualified || '-',

          // ========== COMPETITIVE EXAM 3 ==========
          'Exam 3 Name': scholar.exam3Name || scholar.exam3_name || scholar.otherExamName || '-',
          'Exam 3 Registration No': scholar.exam3RegNo || scholar.exam3_reg_no || scholar.otherExamRollNo || '-',
          'Exam 3 Score': scholar.exam3Score || scholar.exam3_score || scholar.otherExamScore || '-',
          'Exam 3 Max Score': scholar.exam3MaxScore || scholar.exam3_max_score || '-',
          'Exam 3 Year': scholar.exam3Year || scholar.exam3_year || scholar.otherExamYear || '-',
          'Exam 3 Rank': scholar.exam3Rank || scholar.exam3_rank || scholar.otherExamRank || '-',
          'Exam 3 Qualified': scholar.exam3Qualified || scholar.exam3_qualified || '-',

          // ========== RESEARCH INFORMATION ==========
          'Research Interest': scholar.researchInterest || scholar.research_interest || '-',
          'Reasons for Applying': scholar.reasonsForApplying || scholar.reasons_for_applying || '-',

          // ========== WORKFLOW STATUS ==========
          'Faculty Status': scholar.facultyStatus || scholar.faculty_status || '-',
          'Faculty Forward': scholar.facultyForward || scholar.faculty_forward || '-',
          'Department Status': scholar.deptStatus || scholar.dept_status || '-',
          'Department Review': scholar.deptReview || scholar.dept_review || '-',
          'Department Query': scholar.deptQuery || scholar.dept_query || '-',
          'Query Resolved': scholar.queryResolved || scholar.query_resolved || '-',
          'Query Faculty': scholar.queryFaculty || scholar.query_faculty || '-',
          'Reject Reason': scholar.rejectReason || scholar.reject_reason || '-',
          'Coordinator Status': scholar.coordinatorStatus || scholar.coordinator_status || '-',
          'Director Status': scholar.directorStatus || scholar.director_status || '-',

          // ========== DOCUMENTS & SYSTEM INFO ==========
          'Certificates': scholar.certificates || 'Available',
          'User ID': scholar.userId || scholar.user_id || '-',
          'Created At': scholar.createdAt || scholar.created_at || '-',
          'Updated At': scholar.updatedAt || scholar.updated_at || '-',
          'Forwarded At': scholar.forwardedAt || scholar.forwarded_at || '-'
        };
      });

      // Filter object properties based on user selection
      const excelData = fullExcelData.map(row => {
        const filteredObj = {};
        // Use ALL_AVAILABLE_COLUMNS to maintain original ordering rather than selectedColumns order
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
      XLSX.utils.book_append_sheet(wb, ws, 'Uploaded Scholars');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
      const filename = `Scholar_Administration_${timestamp[0]}_${timestamp[1].split('-')[0]}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);

      setShowDownloadModal(false);
      showMessage(`Excel file downloaded successfully! (${scholarsData.length} records)`, 'success');
    } catch (error) {
      console.error('Error generating Excel file:', error);
      showMessage('Error generating Excel file. Please try again.', 'error');
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

  // Helper function to extract department from program string
  // Extracts department name like "Mechanical Engineering" from "Ph.d. - Mechanical Engineering (ph.d. - Ft - E And T)"
  const extractDepartmentFromProgram = (programString) => {
    if (!programString) return '';

    // Remove brackets and content first
    const cleanName = cleanProgramName(programString);

    // Remove "Ph.d. - " or "Ph.D. - " prefix (case insensitive)
    const departmentMatch = cleanName.replace(/^ph\.?d\.?\s*-\s*/i, '').trim();

    return departmentMatch;
  };

  // Helper function to find matching department in faculty
  const findMatchingDepartment = (departmentName, facultyName) => {
    if (!departmentName || !facultyName) return '';

    const faculty = facultiesData.find(f => f.name === facultyName);
    if (!faculty) return '';

    // Try exact match first
    let matchedDept = faculty.departments.find(d =>
      d.name.toLowerCase() === departmentName.toLowerCase()
    );

    // If no exact match, try partial match
    if (!matchedDept) {
      matchedDept = faculty.departments.find(d =>
        d.name.toLowerCase().includes(departmentName.toLowerCase()) ||
        departmentName.toLowerCase().includes(d.name.toLowerCase())
      );
    }

    return matchedDept ? matchedDept.name : '';
  };

  // Helper function to get department for display
  const getDisplayDepartment = (scholar) => {
    return scholar.department || 'N/A';
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
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name;
    const fileSize = (file.size / 1024 / 1024).toFixed(2);

    showMessage(`Processing file: ${fileName} (${fileSize} MB)...`, 'info');

    // Upload to Supabase
    const { data, error } = await uploadScholarExcel(file);
    if (error) {
      console.error('Error uploading scholars:', error);
      showMessage('Error uploading scholars to database', 'error');
      event.target.value = '';
      return;
    }

    showMessage(`Successfully imported ${data?.length || 0} scholars from ${fileName}!`, 'success');
    await loadScholars();
    setShowUploadModal(false);
    event.target.value = '';

    // Keep old local processing as fallback (commented out)
    /*
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
    */
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

  // Get departments for selected faculty
  const getDepartmentsForFaculty = (facultyName) => {
    const faculty = facultiesData.find(f => f.name === facultyName);
    return faculty ? faculty.departments : [];
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
    if (selectedStatus) activeFilters.push(`Status: ${selectedStatus}`);

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
    setSelectedStatus('');
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
      showHelpModal || showForwardModal || showForwardAllModal || showBulkForwardModal ||
      showDeleteModal || showDeleteAllModal || showBulkDeleteModal || showDuplicatesModal ||
      showDownloadModal;

    if (onModalStateChange) {
      onModalStateChange(hasModal);
    }
  }, [showModal, showViewModal, showUploadModal, showFilterModal, showHelpModal,
    showForwardModal, showForwardAllModal, showBulkForwardModal, showDeleteModal, showDeleteAllModal, showBulkDeleteModal, showDuplicatesModal, showDownloadModal, onModalStateChange]);

  // Helper for safe string normalization (removes spaces, special chars, and common prefixes)
  const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/&/g, 'and')            // Replace & with and
      .replace(/sciences/g, 'science') // Normalize plural sciences -> science
      .replace(/faculty/g, '')         // Remove 'faculty'
      .replace(/of/g, '')              // Remove 'of'
      .replace(/[^a-z0-9]/g, '');      // Remove spaces/special chars
  };

  // Filter and sort scholars
  const getFilteredScholars = () => {
    let filtered = scholarsData.filter(scholar => {
      // 1. Search Filtering
      const matchesSearch = scholar.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scholar.applicationNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (scholar.mobile && scholar.mobile.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (scholar.email && scholar.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (scholar.institution && scholar.institution.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (scholar.department && scholar.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (scholar.type && scholar.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
        scholar.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scholar.faculty.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Institution Filtering (Robust Fuzzy Match)
      const matchesFaculty = selectedFaculty === '' ||
        normalize(scholar.institution).includes(normalize(selectedFaculty)) ||
        normalize(selectedFaculty).includes(normalize(scholar.institution));

      // 3. Department Filtering
      const matchesDepartment = selectedDepartment === '' ||
        (scholar.department && scholar.department.toLowerCase().includes(selectedDepartment.toLowerCase()));

      // 4. Type Filtering (Exact Match for specific types)
      let matchesType = true;
      if (selectedType !== '') {
        const displayType = getDisplayType(scholar);
        matchesType = displayType.toLowerCase() === selectedType.toLowerCase();
      }

      // 5. Status Filtering
      let matchesStatus = true;
      if (selectedStatus !== '') {
        const scholarStatus = (scholar.status || '').toLowerCase();
        if (selectedStatus === 'Uploaded') {
          // Uploaded = any scholar that has NOT been forwarded yet
          matchesStatus = !scholarStatus.includes('forwarded');
        } else if (selectedStatus === 'Forwarded') {
          matchesStatus = scholarStatus.includes('forwarded');
        }
      }

      return matchesSearch && matchesFaculty && matchesDepartment && matchesType && matchesStatus;
    });

    // Apply sorting using sortConfig
    filtered.sort((a, b) => {
      let aValue = a[sortConfig.field];
      let bValue = b[sortConfig.field];

      // Handle null/undefined values safely
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // Handle numeric sorting for S.No or Marks
      if (sortConfig.field === 'sNo' || sortConfig.field === 'ugMarks' || sortConfig.field === 'pgMarks') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }
      // Handle string sorting (case-insensitive)
      else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
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
              <h1 className="text-2xl font-bold text-gray-900">Uploaded Scholars</h1>
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
                    <p className="text-sm font-medium text-gray-600">Eligible</p>
                    <p className="text-2xl font-bold text-green-600">{stats.eligibleScholars}</p>
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
                    <p className="text-sm font-medium text-gray-600">Not Eligible</p>
                    <p className="text-2xl font-bold text-red-600">{stats.notEligible}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.eligibilityRate}%</p>
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
            {/* Action Buttons - Left Side */}
            <div className="flex flex-wrap gap-2">
              <button onClick={handleUploadScholarList} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload
              </button>
              <button onClick={handleViewDuplicates} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Duplicates
              </button>
              <button onClick={handleForwardAll} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L2 8.5L9 12L12 19L22 2Z" />
                  <path d="M9 12L22 2" />
                </svg>
                Forward All
              </button>
              <button onClick={handleDownloadClick} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download
              </button>
              <button onClick={openAddModal} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Scholar
              </button>
              <button onClick={handleDeleteAll} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete All
              </button>
            </div>

            {/* Search Bar and Filters - Left Side */}
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
          <table className="scholar-table" style={{ tableLayout: 'auto', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '40px', whiteSpace: 'nowrap', padding: '12px 6px', position: 'sticky', left: 0, zIndex: 10, background: '#ffffff' }}>
                  <input
                    type="checkbox"
                    checked={(() => {
                      const selectableScholars = getFilteredScholars().filter(s => !s.status?.toLowerCase().includes('forwarded'));
                      return selectedScholars.length === selectableScholars.length && selectableScholars.length > 0;
                    })()}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                  />
                </th>

                {/* Headers for Table */}
                <th style={{ minWidth: '55px', whiteSpace: 'nowrap', padding: '12px 6px', position: 'sticky', left: '40px', zIndex: 10, background: '#ffffff' }}>
                  <div className="flex items-center justify-start gap-1">
                    S.NO
                  </div>
                </th>

                <th style={{ minWidth: '160px', whiteSpace: 'nowrap', padding: '12px 8px', position: 'sticky', left: '95px', zIndex: 10, background: '#ffffff' }}>
                  <div className="flex items-center justify-start gap-1">
                    REGISTERED NAME
                  </div>
                </th>

                <th style={{ minWidth: '140px', whiteSpace: 'nowrap', padding: '12px 8px', position: 'sticky', left: '255px', zIndex: 10, background: '#ffffff' }}>
                  <div className="flex items-center justify-start gap-1">
                    APPLICATION NO
                  </div>
                </th>

                <th style={{ minWidth: '180px', whiteSpace: 'nowrap', padding: '12px 8px', position: 'sticky', left: '395px', zIndex: 10, background: '#ffffff', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.15)' }}>
                  <div className="flex items-center justify-start gap-1">
                    SELECT INSTITUTION
                  </div>
                </th>

                <th style={{ width: 'auto', whiteSpace: 'nowrap' }}>
                  <div className="flex items-center justify-start gap-1">
                    DEPARTMENT
                  </div>
                </th>

                <th style={{ width: '1%', whiteSpace: 'nowrap', padding: '12px 6px' }}>
                  <div className="flex items-center justify-start gap-1">
                    TYPE
                  </div>
                </th>

                <th style={{ width: '1%', whiteSpace: 'nowrap', padding: '12px 8px' }}>MOBILE NUMBER</th>
                <th style={{ width: 'auto', whiteSpace: 'nowrap' }}>EMAIL ID</th>
                <th style={{ width: '1%', whiteSpace: 'nowrap', padding: '12px 6px' }}>GENDER</th>
                <th style={{ width: '1%', whiteSpace: 'nowrap', padding: '12px 6px' }}>CERTIFICATES</th>

                <th style={{ width: '1%', whiteSpace: 'nowrap', padding: '12px 6px' }}>
                  <div className="flex items-center justify-start gap-1">
                    STATUS
                  </div>
                </th>

                <th style={{ width: '1%', whiteSpace: 'nowrap', textAlign: 'left', paddingLeft: '10px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredScholars().map((scholar, index) => (
                <tr key={scholar.id} className={`${selectedScholars.includes(scholar.id) ? 'bg-blue-50' : ''}`} style={isRowLocked(scholar) ? { opacity: 0.55, pointerEvents: 'none' } : {}}>
                  <td style={{ minWidth: '40px', whiteSpace: 'nowrap', padding: '12px 6px', position: 'sticky', left: 0, zIndex: 5, backgroundColor: selectedScholars.includes(scholar.id) ? '#eff6ff' : '#ffffff', pointerEvents: 'auto' }}>
                    <input
                      type="checkbox"
                      checked={selectedScholars.includes(scholar.id)}
                      onChange={() => handleSelectScholar(scholar.id)}
                      disabled={isRowLocked(scholar)}
                      className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ${isRowLocked(scholar)
                        ? 'cursor-not-allowed opacity-50'
                        : 'cursor-pointer'
                        }`}
                      title={isRowLocked(scholar) ? 'Cannot select - Already forwarded/generated' : 'Select scholar'}
                    />
                  </td>
                  <td style={{ minWidth: '55px', whiteSpace: 'nowrap', padding: '12px 6px', position: 'sticky', left: '40px', zIndex: 5, backgroundColor: selectedScholars.includes(scholar.id) ? '#eff6ff' : '#ffffff' }}>{scholar.sNo}</td>
                  <td style={{ minWidth: '160px', whiteSpace: 'nowrap', padding: '12px 8px', position: 'sticky', left: '95px', zIndex: 5, backgroundColor: selectedScholars.includes(scholar.id) ? '#eff6ff' : '#ffffff' }}>{scholar.name}</td>
                  <td style={{ minWidth: '140px', whiteSpace: 'nowrap', padding: '12px 8px', position: 'sticky', left: '255px', zIndex: 5, backgroundColor: selectedScholars.includes(scholar.id) ? '#eff6ff' : '#ffffff' }}>{scholar.applicationNo}</td>
                  <td style={{ minWidth: '180px', whiteSpace: 'nowrap', padding: '12px 8px', position: 'sticky', left: '395px', zIndex: 5, backgroundColor: selectedScholars.includes(scholar.id) ? '#eff6ff' : '#ffffff', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.15)' }}>{scholar.institution || 'N/A'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{scholar.department || 'N/A'}</td>
                  <td style={{ width: '1%', whiteSpace: 'nowrap', padding: '12px 6px' }}>{getDisplayType(scholar)}</td>
                  <td style={{ width: '1%', whiteSpace: 'nowrap', padding: '12px 8px' }}>{scholar.mobile || '+91 9876543210'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{scholar.email}</td>
                  <td style={{ width: '1%', whiteSpace: 'nowrap', padding: '12px 6px' }}>{scholar.gender || 'Male'}</td>
                  <td>
                    <button
                      onClick={() => handleViewCertificates(scholar)}
                      className="certificate-link"
                    >
                      View Docs
                    </button>
                  </td>
                  <td>
                    <span className={`status-pill ${getStatusClass(scholar.status)}`}>
                      {getDisplayStatus(scholar.status)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'left', paddingLeft: '10px', paddingRight: '10px', display: 'block' }}>
                    <div className="table-actions" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '6px', width: 'auto', marginLeft: '0', marginRight: 'auto' }}>
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
                        title="Edit Scholar"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '12px',
                          backgroundColor: '#3B82F6',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          opacity: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#2563EB';
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#3B82F6';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
                        }}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                      </button>

                      <button
                        onClick={() => handleDelete(scholar)}
                        className="table-action-btn btn-delete"
                        title="Delete Scholar"
                        disabled={isRowLocked(scholar)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '12px',
                          backgroundColor: isRowLocked(scholar) ? '#9CA3AF' : '#EF4444',
                          color: 'white',
                          border: 'none',
                          cursor: isRowLocked(scholar) ? 'not-allowed' : 'pointer',
                          opacity: isRowLocked(scholar) ? 0.6 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          boxShadow: isRowLocked(scholar) ? 'none' : '0 2px 8px rgba(239, 68, 68, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          if (!isRowLocked(scholar)) {
                            e.target.style.backgroundColor = '#DC2626';
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isRowLocked(scholar)) {
                            e.target.style.backgroundColor = '#EF4444';
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
                          }
                        }}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                      </button>

                      <button
                        onClick={() => handleForward(scholar)}
                        className="table-action-btn btn-forward"
                        title={isRowLocked(scholar) ? 'Already Forwarded/Generated' : 'Forward Scholar'}
                        disabled={isRowLocked(scholar)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '12px',
                          backgroundColor: isRowLocked(scholar) ? '#9CA3AF' : '#10B981',
                          color: 'white',
                          border: 'none',
                          cursor: isRowLocked(scholar) ? 'not-allowed' : 'pointer',
                          opacity: isRowLocked(scholar) ? 0.6 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          boxShadow: isRowLocked(scholar) ? 'none' : '0 2px 8px rgba(16, 185, 129, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          if (!isRowLocked(scholar)) {
                            e.target.style.backgroundColor = '#059669';
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isRowLocked(scholar)) {
                            e.target.style.backgroundColor = '#10B981';
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
                          }
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 2L2 8.5L9 12L12 19L22 2Z" />
                          <path d="M9 12L22 2" />
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
                      <input type="text" name="applicationNo" value={formData.applicationNo} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter application number" />
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
                      <select name="institution" value={formData.institution} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="">Select Institution</option>
                        {institutionsList.map(inst => (
                          <option key={inst} value={inst}>{inst}</option>
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
                          <option key={dept.id} value={`Ph.D. - ${dept.name}`}>
                            Ph.D. - {dept.name}
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
                        {typesList.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Community</label>
                      <input type="text" name="community" value={formData.community} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter community" />
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

                {/* Other Degree Education */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Other Degree - Education Qualification</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Degree - Qualification</label>
                      <input type="text" name="otherQualification" value={formData.otherQualification} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Degree - Institute Name</label>
                      <input type="text" name="otherInstitute" value={formData.otherInstitute} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Degree - Degree</label>
                      <input type="text" name="otherDegree" value={formData.otherDegree} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Degree - Specialization</label>
                      <input type="text" name="otherSpecialization" value={formData.otherSpecialization} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Degree - Marking Scheme</label>
                      <select name="otherMarkingScheme" value={formData.otherMarkingScheme} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="">Select Scheme</option>
                        <option value="CGPA">CGPA</option>
                        <option value="Percentage">Percentage</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Degree - CGPA/Percentage</label>
                      <input type="text" name="otherCgpa" value={formData.otherCgpa} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Degree - Month & Year</label>
                      <input type="text" name="otherMonthYear" value={formData.otherMonthYear} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g., May 2018" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Degree - Registration No.</label>
                      <input type="text" name="otherRegistrationNo" value={formData.otherRegistrationNo} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Degree - Mode Of Study</label>
                      <select name="otherModeOfStudy" value={formData.otherModeOfStudy} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="">Select Mode</option>
                        <option value="Full Time">Full Time</option>
                        <option value="Part Time">Part Time</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Degree - Place Of Institution</label>
                      <input type="text" name="otherPlaceOfInstitution" value={formData.otherPlaceOfInstitution} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                  </div>
                </div>

                {/* Competitive Exams */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Competitive Exams</h3>
                  <div className="mb-4">
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Have You Taken Any Competitive Exam?</label>
                      <select name="competitiveExam" value={formData.competitiveExam} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                  </div>

                  {/* Exam 1 */}
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-800 mb-3">1. Exam Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">1. - Name Of The Exam</label>
                        <input type="text" name="exam1Name" value={formData.exam1Name} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">1. - Registration No./Roll No.</label>
                        <input type="text" name="exam1RegNo" value={formData.exam1RegNo} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">1. - Score Obtained</label>
                        <input type="text" name="exam1Score" value={formData.exam1Score} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">1. - Max Score</label>
                        <input type="text" name="exam1MaxScore" value={formData.exam1MaxScore} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">1. - Year Appeared</label>
                        <input type="text" name="exam1Year" value={formData.exam1Year} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">1. - AIR/Overall Rank</label>
                        <input type="text" name="exam1Rank" value={formData.exam1Rank} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">1. - Qualified/Not Qualified</label>
                        <select name="exam1Qualified" value={formData.exam1Qualified} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                          <option value="">Select</option>
                          <option value="Qualified">Qualified</option>
                          <option value="Not Qualified">Not Qualified</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Exam 2 */}
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-800 mb-3">2. Exam Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">2. - Name Of The Exam</label>
                        <input type="text" name="exam2Name" value={formData.exam2Name} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">2. - Registration No./Roll No.</label>
                        <input type="text" name="exam2RegNo" value={formData.exam2RegNo} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">2. - Score Obtained</label>
                        <input type="text" name="exam2Score" value={formData.exam2Score} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">2. - Max Score</label>
                        <input type="text" name="exam2MaxScore" value={formData.exam2MaxScore} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">2. - Year Appeared</label>
                        <input type="text" name="exam2Year" value={formData.exam2Year} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">2. - AIR/Overall Rank</label>
                        <input type="text" name="exam2Rank" value={formData.exam2Rank} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">2. - Qualified/Not Qualified</label>
                        <select name="exam2Qualified" value={formData.exam2Qualified} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                          <option value="">Select</option>
                          <option value="Qualified">Qualified</option>
                          <option value="Not Qualified">Not Qualified</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Exam 3 */}
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-800 mb-3">3. Exam Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">3. - Name Of The Exam</label>
                        <input type="text" name="exam3Name" value={formData.exam3Name} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">3. - Registration No./Roll No.</label>
                        <input type="text" name="exam3RegNo" value={formData.exam3RegNo} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">3. - Score Obtained</label>
                        <input type="text" name="exam3Score" value={formData.exam3Score} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">3. - Max Score</label>
                        <input type="text" name="exam3MaxScore" value={formData.exam3MaxScore} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">3. - Year Appeared</label>
                        <input type="text" name="exam3Year" value={formData.exam3Year} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">3. - AIR/Overall Rank</label>
                        <input type="text" name="exam3Rank" value={formData.exam3Rank} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">3. - Qualified/Not Qualified</label>
                        <select name="exam3Qualified" value={formData.exam3Qualified} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                          <option value="">Select</option>
                          <option value="Qualified">Qualified</option>
                          <option value="Not Qualified">Not Qualified</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Research Interest & Essays */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Research Interest & Essays</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reasons For Applying</label>
                      <textarea name="reasonsForApplying" value={formData.reasonsForApplying} onChange={handleInputChange} rows="4" className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Explain your reasons for applying..."></textarea>
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Research Interest</label>
                      <textarea name="researchInterest" value={formData.researchInterest} onChange={handleInputChange} rows="4" className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Describe your research interests..."></textarea>
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                      <input type="text" name="userId" value={formData.userId} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                  </div>
                </div>

                {/* Certificates */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Certificates</h3>
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Certificates Drive Link</label>
                    <input type="url" name="certificates" value={formData.certificates} onChange={handleInputChange} className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="https://drive.google.com/..." />
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
                        {departmentsList.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                      <select name="type" value={formData.type} onChange={handleInputChange} required className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="">Select Type</option>
                        {typesList.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
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
                    <label>Institution</label>
                    <select
                      value={selectedFaculty}
                      onChange={(e) => {
                        setSelectedFaculty(e.target.value);
                        setSelectedDepartment(''); // Clear department when institution changes
                      }}
                      className="filter-select"
                    >
                      <option value="">All Institutions</option>
                      {institutionsList.map(inst => (
                        <option key={inst} value={inst}>{inst}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Department</label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="filter-select"
                    >
                      <option value="">All Departments</option>
                      {departmentsList.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
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
                      {typesList.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Status</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="filter-select"
                    >
                      <option value="">All Status</option>
                      <option value="Uploaded">Uploaded Scholars</option>
                      <option value="Forwarded">Forwarded Scholars</option>
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
                <h2>Uploaded Scholars Help</h2>
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
                    <li>Use filters to narrow down results by faculty or type</li>
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
                  Are you sure you want to forward <strong className="text-gray-900">{forwardingScholar.name}</strong> to the coordinator?
                </p>
                <p className="text-sm text-blue-600">This will send the scholar's information to the next stage of the process.</p>
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
                <h4 className="text-lg font-medium text-gray-900 mb-2">Forward All Eligible Scholars</h4>
                <p className="text-gray-600 mb-2">
                  Are you sure you want to forward all eligible scholars to coordinators?
                </p>
                <p className="text-sm text-blue-600">This action will send all verified and pending scholars to the next stage of the process.</p>
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

      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Delete All Scholars</h4>
                <p className="text-gray-600 mb-2">
                  Are you sure you want to delete <strong>ALL {scholarsData.length} scholars</strong>?
                </p>
                <p className="text-sm text-red-600 font-semibold">⚠️ WARNING: This action cannot be undone and will permanently remove all scholars from the database!</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelDeleteAll}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteAll}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                >
                  Delete All
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
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
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
                              scholar.status === 'Verified' ? 'bg-blue-100 text-blue-700' :
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
                            {/* Show delete for any non-forwarded, non-generated scholar */}
                            {!isRowLocked(scholar) && (
                              <button
                                onClick={() => {
                                  setShowDuplicatesModal(false);
                                  setTimeout(() => handleDelete(scholar), 100);
                                }}
                                className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                              >
                                Delete
                              </button>
                            )}
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
                </span> total scholars
              </div>
              <div className="flex gap-2">
                {pendingForwardAction && (
                  <button
                    onClick={handleForwardAfterCleanup}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    {pendingForwardAction === 'single' ? 'Forward Scholar After Cleanup' :
                      pendingForwardAction === 'all' ? 'Forward All After Cleanup' :
                        'Forward Selected After Cleanup'}
                  </button>
                )}
                <button
                  onClick={handleDeleteAllUploadedDuplicates}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete All Uploaded Duplicates
                </button>
                <button
                  onClick={() => {
                    setShowDuplicatesModal(false);
                    setPendingForwardAction(null);
                  }}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Uploaded Duplicates Confirmation Modal - rendered via portal to escape stacking context */}
      {showDeleteAllDuplicatesModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Confirm Delete All</h2>
                  <p className="text-red-100 text-sm">This action cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete ALL{' '}
                <span className="font-bold text-red-600">
                  {duplicateGroups.reduce((sum, group) =>
                    sum + group.scholars.filter(s => !isRowLocked(s)).length, 0
                  )}
                </span>{' '}
                duplicate scholar(s) that are not forwarded or generated?
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">This will:</p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Delete {duplicateGroups.reduce((sum, group) =>
                      sum + group.scholars.filter(s => !isRowLocked(s)).length, 0
                    )} duplicate scholars
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Keep all forwarded and generated scholars safe
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteAllDuplicatesModal(false)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAllUploadedDuplicates}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete All
              </button>
            </div>
          </div>
        </div>,
        document.body
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
                    <span className="view-value">{viewingScholar.formName || 'PhD Application Form'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Registered Name:</label>
                    <span className="view-value">{viewingScholar.name}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Application No:</label>
                    <span className="view-value">{viewingScholar.applicationNo}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Have You Graduated From India?:</label>
                    <span className="view-value">{viewingScholar.graduatedFromIndia || 'Yes'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Course:</label>
                    <span className="view-value">{viewingScholar.course || viewingScholar.program}</span>
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
                    <span className="view-value">{getDisplayType(viewingScholar)}</span>
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
                    <span className="view-value">{viewingScholar.employeeId || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">1 - Designation:</label>
                    <span className="view-value">{viewingScholar.designation || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">1 - Organization Name:</label>
                    <span className="view-value">{viewingScholar.organizationName || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">1 - Organization Address:</label>
                    <span className="view-value">{viewingScholar.organizationAddress || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label">Mobile Number:</label>
                    <span className="view-value">{viewingScholar.mobile || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Email ID:</label>
                    <span className="view-value">{viewingScholar.email}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Date Of Birth:</label>
                    <span className="view-value">{viewingScholar.dateOfBirth || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Gender:</label>
                    <span className="view-value">{viewingScholar.gender || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Are You Differently Abled?:</label>
                    <span className="view-value">{viewingScholar.differentlyAbled || 'No'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Nature Of Deformity:</label>
                    <span className="view-value">{viewingScholar.natureOfDeformity || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Percentage Of Deformity:</label>
                    <span className="view-value">{viewingScholar.percentageOfDeformity || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Nationality:</label>
                    <span className="view-value">{viewingScholar.nationality || 'Indian'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Community:</label>
                    <span className="view-value">{viewingScholar.community || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Aadhaar Card No.:</label>
                    <span className="view-value">{viewingScholar.aadhaarNo || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Mode Of Profession (Industry/Academic):</label>
                    <span className="view-value">{viewingScholar.modeOfProfession || 'Academic'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Area Of Interest:</label>
                    <span className="view-value">{viewingScholar.areaOfInterest || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* UG Education Details */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">UG - Education Qualification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label">UG - Current Education Qualification:</label>
                    <span className="view-value">{viewingScholar.ugQualification || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Institute Name:</label>
                    <span className="view-value">{viewingScholar.ugInstitute || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Degree:</label>
                    <span className="view-value">{viewingScholar.ugDegree || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Specialization:</label>
                    <span className="view-value">{viewingScholar.ugSpecialization || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Marking Scheme:</label>
                    <span className="view-value">{viewingScholar.ugMarkingScheme || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - CGPA Or Percentage:</label>
                    <span className="view-value">{viewingScholar.ugCgpa || viewingScholar.ugMarks || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Month & Year:</label>
                    <span className="view-value">{viewingScholar.ugMonthYear || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Registration No.:</label>
                    <span className="view-value">{viewingScholar.ugRegistrationNo || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Mode Of Study:</label>
                    <span className="view-value">{viewingScholar.ugModeOfStudy || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">UG - Place Of The Institution:</label>
                    <span className="view-value">{viewingScholar.ugPlaceOfInstitution || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* PG Education Details */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">PG - Education Qualification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label">PG - Current Education Qualification:</label>
                    <span className="view-value">{viewingScholar.pgQualification || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Institute Name:</label>
                    <span className="view-value">{viewingScholar.pgInstitute || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Degree:</label>
                    <span className="view-value">{viewingScholar.pgDegree || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Specialization:</label>
                    <span className="view-value">{viewingScholar.pgSpecialization || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Marking Scheme:</label>
                    <span className="view-value">{viewingScholar.pgMarkingScheme || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - CGPA Or Percentage:</label>
                    <span className="view-value">{viewingScholar.pgCgpa || viewingScholar.pgMarks || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Month & Year:</label>
                    <span className="view-value">{viewingScholar.pgMonthYear || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Registration No.:</label>
                    <span className="view-value">{viewingScholar.pgRegistrationNo || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Mode Of Study:</label>
                    <span className="view-value">{viewingScholar.pgModeOfStudy || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">PG - Place Of The Institution:</label>
                    <span className="view-value">{viewingScholar.pgPlaceOfInstitution || 'N/A'}</span>
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
                    <span className="view-value">{getDisplayDepartment(viewingScholar)}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Type:</label>
                    <span className="view-value">{getDisplayType(viewingScholar)}</span>
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
                <p className="text-sm text-green-600 font-semibold">This will send them to Admin for review.</p>
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
                  Forward Now
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
                  You are about to permanently delete <span className="font-bold text-red-600">{selectedScholars.length} scholar(s)</span>.
                </p>
                <p className="text-sm text-red-600 font-semibold">⚠️ This action cannot be undone!</p>
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
                  Delete Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Column Selection Modal for Download */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto pt-10 pb-10">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-4 relative max-h-[90vh] flex flex-col border border-gray-100 overflow-hidden transform transition-all">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 mb-1">Select Columns to Export</h3>
                <p className="text-sm text-gray-500 font-medium tracking-wide">
                  Choose which information fields you want to include in the Excel download
                </p>
              </div>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes size={22} />
              </button>
            </div>

            {/* Controls */}
            <div className="px-8 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex gap-3">
                <button
                  onClick={selectAllColumns}
                  className="px-4 py-2 text-sm font-semibold bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 hover:text-blue-700 rounded-xl transition-all shadow-sm"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllColumns}
                  className="px-4 py-2 text-sm font-semibold bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl transition-all shadow-sm"
                >
                  Clear All
                </button>
              </div>
              <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm border border-blue-100">
                {selectedColumns.length} <span className="font-medium text-blue-600">/ {ALL_AVAILABLE_COLUMNS.length} selected</span>
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Group columns by category */}
                {Array.from(new Set(ALL_AVAILABLE_COLUMNS.map(c => c.category))).map(category => {
                  const categoryColumns = ALL_AVAILABLE_COLUMNS.filter(c => c.category === category);
                  const isAllInCategorySelected = categoryColumns.every(c => selectedColumns.includes(c.key));
                  const isSomeInCategorySelected = categoryColumns.some(c => selectedColumns.includes(c.key)) && !isAllInCategorySelected;
                  
                  return (
                    <div key={category} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-300 overflow-hidden flex flex-col h-full">
                      <div className="px-5 py-4 bg-gradient-to-b from-gray-50/80 to-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                        <h4 className="font-bold text-gray-800 text-sm tracking-wide">{category}</h4>
                        <button 
                          onClick={() => {
                            if (isAllInCategorySelected) {
                              setSelectedColumns(prev => prev.filter(key => !categoryColumns.find(c => c.key === key)));
                            } else {
                              const newCols = [...selectedColumns];
                              categoryColumns.forEach(c => {
                                if (!newCols.includes(c.key)) newCols.push(c.key);
                              });
                              setSelectedColumns(newCols);
                            }
                          }}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${isAllInCategorySelected ? 'bg-blue-100 text-blue-700' : isSomeInCategorySelected ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                          {isAllInCategorySelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="p-2 flex-1 space-y-1 overflow-y-auto custom-scrollbar" style={{maxHeight: '260px'}}>
                        {categoryColumns.map(col => {
                          const isChecked = selectedColumns.includes(col.key);
                          return (
                            <label key={col.key} className={`flex items-center gap-3 cursor-pointer group px-3 py-2.5 rounded-lg transition-all ${isChecked ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-gray-50'}`}>
                              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white group-hover:border-blue-400'}`}>
                                {isChecked && (
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleColumnSelection(col.key)}
                                className="hidden"
                              />
                              <span className={`text-sm leading-tight transition-colors select-none ${isChecked ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>
                                {col.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowDownloadModal(false)}
                className="px-6 py-2.5 border border-gray-200 bg-white rounded-xl text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-semibold transition-all shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDownloadExcel}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
                disabled={selectedColumns.length === 0}
              >
                <FaDownload className="w-4 h-4" /> Export to Excel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ScholarManagement;