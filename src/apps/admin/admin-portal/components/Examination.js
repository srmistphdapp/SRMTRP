import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaUpload, FaPlus, FaExpand, FaCompress, FaTimes, FaDownload } from 'react-icons/fa';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import './Examination.css';
import {
  fetchHallTicketGeneratedScholars,
  addExaminationRecord,
  updateExaminationRecord,
  updateExaminationMarks,
  deleteExaminationRecord,
  uploadExaminationExcel,
  forwardAllExaminationRecords,
  forwardExaminationRecord,
  deleteAllExaminationRecords,
  forwardToDirectorForInterview,
  bulkForwardToDirectorForInterview
} from '../../../../services/examinationService';

// Helper data for dropdowns (replicated from context for local use)
const facultiesData = [
  {
    id: 1, name: 'Faculty of Engineering & Technology', departments: [
      { id: 1, name: 'Computer Science and Engineering' },
      { id: 2, name: 'Mechanical Engineering' },
      { id: 3, name: 'Civil Engineering' },
      { id: 4, name: 'Electrical and Electronics Engineering' }
    ]
  },
  {
    id: 2, name: 'Faculty of Science & Humanities', departments: [
      { id: 5, name: 'Physics' },
      { id: 6, name: 'Chemistry' },
      { id: 7, name: 'Mathematics' }
    ]
  },
  {
    id: 3, name: 'Faculty of Management', departments: [
      { id: 8, name: 'Management Studies' }
    ]
  },
  {
    id: 4, name: 'Faculty of Medical and Health Sciences', departments: [
      { id: 9, name: 'Department of Basic Medical Sciences' },
      { id: 10, name: 'Department of Oral Medicine and Oral Radiology' }
    ]
  }
];

// Flatten departments with faculty information
const departmentsData = facultiesData.flatMap(faculty =>
  faculty.departments.map(dept => ({
    id: dept.id,
    department_name: dept.name,
    faculty: faculty.name
  }))
);

// Helper function to extract department from program field
// Example: "Ph.d. - Mechanical Engineering (ph.d. - Ft - E And T)" => "Mechanical Engineering"
const extractDepartmentFromProgram = (program) => {
  if (!program) return 'N/A';

  // Match pattern: "Ph.d. - DEPARTMENT_NAME (..."
  // or "M.Tech - DEPARTMENT_NAME (..."
  // or any degree - DEPARTMENT_NAME (...)
  const match = program.match(/^[^-]+-\s*([^(]+)\s*\(/);

  if (match && match[1]) {
    return match[1].trim();
  }

  // Fallback: if no match, return the program as is
  return program;
};

const Examination = ({ onFullscreenChange, onModalStateChange }) => {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isAddScholarModalOpen, setIsAddScholarModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Download features
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([]);

  // All available columns for Excel export
  const ALL_AVAILABLE_COLUMNS = [
    // Basic Information
    { key: 'S.No', label: 'S.No', category: 'Basic Information' },
    { key: 'Application No', label: 'Application No', category: 'Basic Information' },
    { key: 'Form Name', label: 'Form Name', category: 'Basic Information' },
    { key: 'Current Status', label: 'Current Status', category: 'Basic Information' },

    // Personal Details
    { key: 'Registered Name', label: 'Registered Name', category: 'Personal Details' },
    { key: 'Date of Birth', label: 'Date of Birth', category: 'Personal Details' },
    { key: 'Gender', label: 'Gender', category: 'Personal Details' },
    { key: 'Mobile Number', label: 'Mobile Number', category: 'Personal Details' },
    { key: 'Email', label: 'Email', category: 'Personal Details' },
    { key: 'Nationality', label: 'Nationality', category: 'Personal Details' },
    { key: 'Aadhaar No', label: 'Aadhaar No', category: 'Personal Details' },
    { key: 'Differently Abled', label: 'Differently Abled', category: 'Personal Details' },

    // Program Information
    { key: 'Institution', label: 'Institution', category: 'Program Information' },
    { key: 'Faculty', label: 'Faculty', category: 'Program Information' },
    { key: 'Department', label: 'Department', category: 'Program Information' },
    { key: 'Program', label: 'Program', category: 'Program Information' },
    { key: 'Program Type', label: 'Program Type', category: 'Program Information' },

    // Academic Background
    { key: 'Graduated From India', label: 'Graduated From India', category: 'Academic Background' },
    { key: 'UG Qualification', label: 'UG Qualification', category: 'Academic Background' },
    { key: 'PG Qualification', label: 'PG Qualification', category: 'Academic Background' },

    // Examination Marks
    { key: 'Written Marks (100)', label: 'Written Marks (100)', category: 'Examination Details' },
    { key: 'Written Marks (70)', label: 'Written Marks (70)', category: 'Examination Details' },
    { key: 'Interview Marks (30)', label: 'Interview Marks (30)', category: 'Examination Details' },
    { key: 'Total Marks', label: 'Total Marks', category: 'Examination Details' },

    // System Info
    { key: 'Creation Date', label: 'Creation Date', category: 'System Info' },
  ];

  const [selectedScholar, setSelectedScholar] = useState(null);
  const [viewingScholar, setViewingScholar] = useState(null);
  const [editingScholar, setEditingScholar] = useState(null);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Inline editing states
  const [editingMarks, setEditingMarks] = useState({});
  const [editingMarks100, setEditingMarks100] = useState({});
  const [editingInterviewMarks, setEditingInterviewMarks] = useState({});

  // Selection states for bulk actions
  const [selectedScholars, setSelectedScholars] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkForwardModal, setShowBulkForwardModal] = useState(false);

  // Confirmation modal states
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showForwardAllModal, setShowForwardAllModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showForwardToDirectorModal, setShowForwardToDirectorModal] = useState(false);
  const [showBulkForwardToDirectorModal, setShowBulkForwardToDirectorModal] = useState(false);
  const [scholarToVerify, setScholarToVerify] = useState(null);
  const [scholarToForward, setScholarToForward] = useState(null);
  const [scholarToForwardToDirector, setScholarToForwardToDirector] = useState(null);

  // Comprehensive Form Data State
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
    // Misc
    reasonsForApplying: '',
    researchInterest: '',
    userId: '',
    certificates: 'Available',
    status: 'pending',
    faculty: '',
    department: '',
    marks: 0,
    interviewMarks: 0
  });

  // Handle Form Input Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Helper to get departments
  const getDepartmentsForFaculty = (facultyName) => {
    const faculty = facultiesData.find(f => f.name === facultyName);
    return faculty ? faculty.departments : [];
  };

  // Ref for the table scroll container
  const tableScrollRef = useRef(null);

  useEffect(() => {
    const tableContainer = tableScrollRef.current;
    if (tableContainer) {
      tableContainer.scrollLeft = 0;
    }
  }, []);


  // Examination data from Supabase
  const [examData, setExamData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch examination records from Supabase on component mount
  useEffect(() => {
    loadExaminationRecords();
  }, []);

  const loadExaminationRecords = async () => {
    console.log('Admin: Loading scholars with generated hall tickets...');
    setLoading(true);
    const { data, error } = await fetchHallTicketGeneratedScholars();

    if (error) {
      console.error('Admin: Error loading scholars:', error);
      toast.error(`Failed to load scholars: ${error.message || 'Unknown error'}`);
      setExamData([]);
    } else {
      console.log('Admin: Loaded', data?.length || 0, 'hall-ticket-generated scholars');
      setExamData(data || []);
    }
    setLoading(false);
  };

  // Handlers

  // OPEN ADD MODAL
  const openAddScholarModal = () => {
    setFormData({
      applicationNo: '',
      formName: 'PhD Application Form',
      name: '',
      institution: 'SRM Institute of Science and Technology',
      program: '',
      programType: 'Full Time',
      mobile: '',
      email: '',
      dateOfBirth: '',
      gender: 'Male',
      certificates: 'Available',
      status: 'pending',
      faculty: '',
      department: '',
      marks: 0,
      // Reset other complex fields...
      graduatedFromIndia: 'Yes',
      course: '', employeeId: '', designation: '', organizationName: '', organizationAddress: '',
      differentlyAbled: 'No', natureOfDeformity: '', percentageOfDeformity: '', nationality: 'Indian',
      aadhaarNo: '', modeOfProfession: 'Academic', areaOfInterest: '',
      ugQualification: '', ugInstitute: '', ugDegree: '', ugSpecialization: '', ugMarkingScheme: 'CGPA', ugCgpa: '',
      pgQualification: '', pgInstitute: '', pgDegree: '', pgSpecialization: '', pgMarkingScheme: 'CGPA', pgCgpa: '',
      competitiveExam: 'No'
    });
    setIsAddScholarModalOpen(true);
  };

  // OPEN EDIT MODAL
  const handleEdit = (scholar) => {
    if (scholar.status?.toLowerCase().includes('forwarded')) {
      toast.info('Cannot edit forwarded records');
      return;
    }
    setEditingScholar(scholar);

    // Extract department from program if department is not available
    const extractedDepartment = scholar.department || extractDepartmentFromProgram(scholar.program);

    // Populate form data with scholar data, defaulting missing fields
    setFormData({
      ...formData, // defaults
      ...scholar,  // overwrites
      applicationNo: scholar.application_no || scholar.id,
      name: scholar.registered_name || scholar.name || '',
      programType: scholar.program_type || scholar.type || scholar.programType || 'Full Time',
      // Ensure all required fields have a fallback
      mobile: scholar.mobile_number || scholar.mobile || '',
      email: scholar.email || '',
      gender: scholar.gender || 'Male',
      faculty: scholar.faculty || '',
      department: extractedDepartment,
      marks: scholar.written_marks || 0,
      interviewMarks: scholar.interview_marks || 0,
    });
    setIsEditModalOpen(true);
  };

  // SAVE EDIT
  const handleEditSave = async (e) => {
    e.preventDefault();

    const updates = {
      // Scholar profile fields → go to scholar_applications
      registered_name: formData.name,
      institution: formData.faculty || formData.institution,
      program: formData.program || formData.faculty,
      program_type: formData.programType,
      type: formData.programType,
      mobile_number: formData.mobile,
      email: formData.email,
      gender: formData.gender,
      faculty: formData.faculty,
      department: formData.department,
      date_of_birth: formData.dateOfBirth,
      graduated_from_india: formData.graduatedFromIndia,
      course: formData.course,
      employee_id: formData.employeeId,
      designation: formData.designation,
      organization_name: formData.organizationName,
      organization_address: formData.organizationAddress,
      differently_abled: formData.differentlyAbled,
      nationality: formData.nationality,
      aadhaar_no: formData.aadhaarNo,
      mode_of_profession: formData.modeOfProfession,
      area_of_interest: formData.areaOfInterest,
      ug_degree: formData.ugDegree,
      ug_institute: formData.ugInstitute,
      ug_cgpa: formData.ugCgpa,
      pg_degree: formData.pgDegree,
      pg_institute: formData.pgInstitute,
      pg_cgpa: formData.pgCgpa,
      // Marks fields → go to examination_records
      written_marks: parseFloat(formData.marks) || 0,
      interview_marks: parseFloat(formData.interviewMarks) || 0,
    };

    const { data, error } = await updateExaminationRecord(editingScholar.id, updates);

    if (error) {
      console.error('Error updating examination record:', error);
      toast.error('Failed to update examination record');
    } else {
      toast.success('Examination record updated successfully!');
      setIsEditModalOpen(false);
      setEditingScholar(null);
      loadExaminationRecords(); // Refresh data
    }
  };

  // SAVE ADD
  const handleAddScholar = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.faculty.trim() || !formData.department.trim()) {
      toast.error('Name, Faculty, and Department are required!');
      return;
    }

    const recordData = {
      application_no: formData.applicationNo.trim() || null,
      form_name: formData.formName,
      registered_name: formData.name.trim(),
      institution: formData.faculty || formData.institution,
      program: formData.program || formData.faculty,
      program_type: formData.programType,
      type: formData.programType,
      mobile_number: formData.mobile,
      email: formData.email,
      date_of_birth: formData.dateOfBirth,
      gender: formData.gender,
      faculty: formData.faculty,
      department: formData.department,
      written_marks: 0, // Initially set to 0
      interview_marks: 0, // Initially set to 0
      status: 'pending',
      // Include other fields
      graduated_from_india: formData.graduatedFromIndia,
      course: formData.course,
      employee_id: formData.employeeId,
      designation: formData.designation,
      organization_name: formData.organizationName,
      organization_address: formData.organizationAddress,
      differently_abled: formData.differentlyAbled,
      nationality: formData.nationality,
      aadhaar_no: formData.aadhaarNo,
      mode_of_profession: formData.modeOfProfession,
      area_of_interest: formData.areaOfInterest,
      ug_degree: formData.ugDegree,
      ug_institute: formData.ugInstitute,
      ug_cgpa: formData.ugCgpa,
      pg_degree: formData.pgDegree,
      pg_institute: formData.pgInstitute,
      pg_cgpa: formData.pgCgpa,
    };

    const { data, error } = await addExaminationRecord(recordData);

    if (error) {
      console.error('Error adding examination record:', error);
      toast.error('Failed to add examination record');
    } else {
      toast.success('Examination record added successfully!');
      setIsAddScholarModalOpen(false);
      loadExaminationRecords(); // Refresh data
    }
  };

  // Helper handlers for modal closing
  const handleEditCancel = () => {
    setIsEditModalOpen(false);
    setEditingScholar(null);
  };

  // Inline marks editing functions
  const handleMarksClick = (scholarId, currentMarks) => {
    const scholar = examData.find(item => item.id === scholarId);
    if (scholar?.status?.toLowerCase().includes('forwarded')) {
      toast.info('Cannot edit marks for forwarded records');
      return;
    }
    setEditingMarks({ [scholarId]: currentMarks });
  };

  const handleMarksChange = (scholarId, value) => {
    const numValue = parseInt(value) || 0;
    if (numValue > 70) {
      toast.error('Written marks cannot exceed 70!');
      return;
    }
    if (numValue >= 0 && numValue <= 70) {
      setEditingMarks({ [scholarId]: numValue });
    }
  };

  const handleMarksSave = async (scholarId) => {
    const newMarks = editingMarks[scholarId];
    if (newMarks !== undefined) {
      const { data, error } = await updateExaminationMarks(scholarId, newMarks);

      if (error) {
        console.error('Error updating marks:', error);
        toast.error('Failed to update marks');
      } else {
        toast.success('Marks updated successfully!');
        setEditingMarks({});
        loadExaminationRecords(); // Refresh data
      }
    }
  };

  const handleMarksCancel = () => {
    setEditingMarks({});
  };

  const handleMarksKeyPress = (e, scholarId) => {
    if (e.key === 'Enter') {
      handleMarksSave(scholarId);
    } else if (e.key === 'Escape') {
      handleMarksCancel();
    }
  };

  // Inline marks (100) editing functions
  const handleMarks100Click = (scholarId, currentMarks) => {
    const scholar = examData.find(item => item.id === scholarId);

    // Set to empty string if null/undefined/0, otherwise use current value
    const initialValue = (currentMarks === null || currentMarks === undefined || currentMarks === 0) ? '' : currentMarks;
    setEditingMarks100({ [scholarId]: initialValue });
  };

  const handleMarks100Change = (scholarId, value) => {
    // Allow empty string for clearing
    if (value === '') {
      setEditingMarks100({ [scholarId]: '' });
      return;
    }

    // Allow "Ab" or "AB" for absent (check for partial typing too)
    const upperValue = value.toUpperCase();
    if (upperValue === 'AB' || upperValue === 'A' || upperValue === 'AB'.substring(0, value.length)) {
      setEditingMarks100({ [scholarId]: value });
      return;
    }

    // Check if it's a valid number
    const numValue = parseInt(value);
    if (isNaN(numValue)) {
      // If not a number and not "Ab", ignore the input
      return;
    }

    if (numValue > 100) {
      toast.error('Written marks(100) cannot exceed 100!');
      return;
    }
    if (numValue < 0) {
      toast.error('Written marks(100) cannot be negative!');
      return;
    }
    if (numValue >= 0 && numValue <= 100) {
      setEditingMarks100({ [scholarId]: numValue });
    }
  };

  const handleMarks100Save = async (scholarId) => {
    const newMarks100 = editingMarks100[scholarId];
    if (newMarks100 !== undefined) {
      // Find the current record to check interview marks
      const currentRecord = examData.find(r => r.id === scholarId);

      // Check if absent
      if (newMarks100 === 'Ab' || newMarks100 === 'AB' || newMarks100 === 'ab') {
        // Check if interview marks exists and is also absent
        const hasInterviewMarks = currentRecord?.interview_marks !== null &&
          currentRecord?.interview_marks !== undefined &&
          currentRecord?.interview_marks !== '' &&
          currentRecord?.interview_marks !== 0;
        const isInterviewAbsent = currentRecord?.interview_marks === 'Ab' ||
          currentRecord?.interview_marks === 'AB' ||
          currentRecord?.interview_marks === 'ab';

        // Update as absent
        const updates = {
          written_marks_100: 'Ab',
          written_marks: 'Ab'
        };

        // Only set total_marks to 'Absent' if interview marks EXISTS and is also absent
        if (hasInterviewMarks && isInterviewAbsent) {
          updates.total_marks = 'Absent';
        }

        const { data, error } = await updateExaminationRecord(scholarId, updates);

        if (error) {
          console.error('Error updating marks:', error);
          toast.error('Failed to update marks');
        } else {
          toast.success('Marked as Absent');
          setEditingMarks100({});
          loadExaminationRecords(); // Refresh data
        }
      } else {
        // Convert 100-scale marks to 70-scale: (marks100 / 100) * 70
        const convertedMarks70 = Math.round((newMarks100 / 100) * 70);

        // Update both written_marks_100 and written_marks
        const updates = {
          written_marks_100: newMarks100,
          written_marks: convertedMarks70
        };

        // Only calculate total_marks if interview marks EXISTS and is numeric
        const hasInterviewMarks = currentRecord?.interview_marks !== null &&
          currentRecord?.interview_marks !== undefined &&
          currentRecord?.interview_marks !== '' &&
          currentRecord?.interview_marks !== 0;
        if (hasInterviewMarks &&
          currentRecord.interview_marks !== 'Ab' &&
          currentRecord.interview_marks !== 'AB' &&
          currentRecord.interview_marks !== 'ab' &&
          !isNaN(parseFloat(currentRecord.interview_marks))) {
          const totalMarks = convertedMarks70 + parseFloat(currentRecord.interview_marks);
          updates.total_marks = totalMarks;
        }

        const { data, error } = await updateExaminationRecord(scholarId, updates);

        if (error) {
          console.error('Error updating marks:', error);
          toast.error('Failed to update marks');
        } else {
          toast.success(`Marks updated: ${newMarks100}/100`);
          setEditingMarks100({});
          loadExaminationRecords(); // Refresh data
        }
      }
    }
  };

  const handleMarks100Cancel = () => {
    setEditingMarks100({});
  };

  const handleMarks100KeyPress = (e, scholarId) => {
    if (e.key === 'Enter') {
      handleMarks100Save(scholarId);
    } else if (e.key === 'Escape') {
      handleMarks100Cancel();
    }
  };

  // Inline interview marks editing functions
  const handleInterviewMarksClick = (scholarId, currentMarks) => {
    const scholar = examData.find(item => item.id === scholarId);

    // Check if director_interview is 'Forwarded to Director'
    if (scholar?.director_interview !== 'Forwarded to Director') {
      toast.info('Interview marks can only be edited when director_interview is "Forwarded to Director"');
      return;
    }

    // Set to empty string if null/undefined/0, otherwise use current value
    const initialValue = (currentMarks === null || currentMarks === undefined || currentMarks === 0) ? '' : currentMarks;
    setEditingInterviewMarks({ [scholarId]: initialValue });
  };

  const handleInterviewMarksChange = (scholarId, value) => {
    // Allow empty string for clearing
    if (value === '') {
      setEditingInterviewMarks({ [scholarId]: '' });
      return;
    }

    // Allow "Ab" or "AB" for absent (check for partial typing too)
    const upperValue = value.toUpperCase();
    if (upperValue === 'AB' || upperValue === 'A' || upperValue === 'AB'.substring(0, value.length)) {
      setEditingInterviewMarks({ [scholarId]: value });
      return;
    }

    // Check if it's a valid number
    const numValue = parseInt(value);
    if (isNaN(numValue)) {
      // If not a number and not "Ab", ignore the input
      return;
    }

    if (numValue >= 0 && numValue <= 30) {
      setEditingInterviewMarks({ [scholarId]: numValue });
    } else if (numValue > 30) {
      toast.error('Interview marks cannot exceed 30!');
    }
  };

  const handleInterviewMarksSave = async (scholarId) => {
    const newMarks = editingInterviewMarks[scholarId];
    if (newMarks !== undefined) {
      // Find the current record to check written marks
      const currentRecord = examData.find(r => r.id === scholarId);

      // Check if absent
      if (newMarks === 'Ab' || newMarks === 'AB' || newMarks === 'ab') {
        // Check if written marks exists and is also absent
        const hasWrittenMarks = currentRecord?.written_marks !== null &&
          currentRecord?.written_marks !== undefined &&
          currentRecord?.written_marks !== '' &&
          currentRecord?.written_marks !== 0;
        const isWrittenAbsent = currentRecord?.written_marks === 'Ab' ||
          currentRecord?.written_marks === 'AB' ||
          currentRecord?.written_marks === 'ab';

        const updates = { interview_marks: 'Ab' };

        // Only set total_marks to 'Absent' if written marks EXISTS and is also absent
        if (hasWrittenMarks && isWrittenAbsent) {
          updates.total_marks = 'Absent';
        }

        const { data, error } = await updateExaminationRecord(scholarId, updates);

        if (error) {
          console.error('Error updating interview marks:', error);
          toast.error('Failed to update interview marks');
        } else {
          toast.success('Interview marked as Absent');
          setEditingInterviewMarks({});
          loadExaminationRecords();
        }
      } else {
        const updates = { interview_marks: newMarks };

        // Only calculate total_marks if written marks EXISTS and is numeric
        const hasWrittenMarks = currentRecord?.written_marks !== null &&
          currentRecord?.written_marks !== undefined &&
          currentRecord?.written_marks !== '' &&
          currentRecord?.written_marks !== 0;
        if (hasWrittenMarks &&
          currentRecord.written_marks !== 'Ab' &&
          currentRecord.written_marks !== 'AB' &&
          currentRecord.written_marks !== 'ab' &&
          !isNaN(parseFloat(currentRecord.written_marks))) {
          const totalMarks = parseFloat(currentRecord.written_marks) + parseFloat(newMarks);
          updates.total_marks = totalMarks;
        }

        const { data, error } = await updateExaminationRecord(scholarId, updates);

        if (error) {
          console.error('Error updating interview marks:', error);
          toast.error('Failed to update interview marks');
        } else {
          toast.success(`Interview marks updated: ${newMarks}/30`);
          setEditingInterviewMarks({});
          loadExaminationRecords();
        }
      }
    }
  };

  const handleInterviewMarksCancel = () => {
    setEditingInterviewMarks({});
  };

  const handleInterviewMarksKeyPress = (e, scholarId) => {
    if (e.key === 'Enter') {
      handleInterviewMarksSave(scholarId);
    } else if (e.key === 'Escape') {
      handleInterviewMarksCancel();
    }
  };

  // Verification and Forwarding Handlers
  const handleVerify = (scholar) => {
    if (scholar.status === 'verified') return toast.info(`${scholar.name} already verified`);
    if (scholar.status === 'forwarded') return toast.info(`Cannot modify forwarded record`);
    setScholarToVerify(scholar);
    setShowVerifyModal(true);
  };

  const confirmVerify = async () => {
    if (scholarToVerify) {
      const { error } = await updateExaminationRecord(scholarToVerify.id, { status: 'verified' });
      if (error) {
        toast.error('Failed to verify scholar');
      } else {
        setExamData(examData.map(item => item.id === scholarToVerify.id ? { ...item, status: 'verified' } : item));
        toast.success('Verified successfully!');
      }
      setShowVerifyModal(false);
      setScholarToVerify(null);
    }
  };

  const handleForward = (scholar) => {
    if (scholar.status === 'forwarded') return toast.info(`Already forwarded`);
    if (scholar.status === 'pending') return toast.warning(`Must verify before forwarding`);
    setScholarToForward(scholar);
    setShowForwardModal(true);
  };

  const confirmForward = async () => {
    if (scholarToForward) {
      try {
        console.log('Forwarding scholar:', scholarToForward);

        const { data, error } = await forwardExaminationRecord(scholarToForward.id);

        if (error) {
          console.error('Error forwarding scholar:', error);
          toast.error(`Failed to forward scholar: ${error.message || 'Unknown error'}`);
        } else {
          toast.success(`Scholar forwarded successfully! Status: ${data.forwardStatus}`);
          loadExaminationRecords(); // Refresh data
        }
      } catch (error) {
        console.error('Exception forwarding scholar:', error);
        toast.error(`Failed to forward scholar: ${error.message}`);
      }

      setShowForwardModal(false);
      setScholarToForward(null);
    }
  };

  // Forward to Director for Interview handlers
  const handleForwardToDirector = (scholar) => {
    if (scholar.director_interview === 'Forwarded to Director') {
      return toast.info('Already forwarded to director for interview');
    }
    setScholarToForwardToDirector(scholar);
    setShowForwardToDirectorModal(true);
  };

  const confirmForwardToDirector = async () => {
    if (scholarToForwardToDirector) {
      const { error } = await forwardToDirectorForInterview(scholarToForwardToDirector.id);
      if (error) {
        toast.error(`Failed to forward to director: ${error.message || 'Unknown error'}`);
      } else {
        toast.success('Forwarded to director for interview successfully!');
        loadExaminationRecords();
      }
      setShowForwardToDirectorModal(false);
      setScholarToForwardToDirector(null);
    }
  };

  const handleBulkForwardToDirector = () => {
    if (selectedScholars.length === 0) {
      return toast.info('Please select scholars to forward to director');
    }
    setShowBulkForwardToDirectorModal(true);
  };

  const confirmBulkForwardToDirector = async () => {
    const { error } = await bulkForwardToDirectorForInterview(selectedScholars);
    if (error) {
      toast.error(`Failed to bulk forward to director: ${error.message || 'Unknown error'}`);
    } else {
      toast.success(`${selectedScholars.length} scholar(s) forwarded to director for interview!`);
      setShowBulkForwardToDirectorModal(false);
      handleClearSelection();
      loadExaminationRecords();
    }
  };

  // Batch actions
  const handleForwardAll = () => {
    const eligible = filteredData.filter(s => !s.status?.toLowerCase().includes('forwarded'));
    if (eligible.length === 0) return toast.info('No eligible examination records to forward');
    setShowForwardAllModal(true);
  };

  const confirmForwardAll = async () => {
    const { data, error } = await forwardAllExaminationRecords();

    if (error) {
      console.error('Error forwarding examination records:', error);
      toast.error('Failed to forward examination records');
    } else {
      toast.success(`${data?.length || 0} examination records forwarded!`);
      setShowForwardAllModal(false);
      loadExaminationRecords(); // Refresh data
    }
  };

  // Delete All functionality
  const handleDeleteAll = () => {
    if (filteredData.length === 0) {
      return toast.info('No examination records to delete');
    }
    setShowDeleteAllModal(true);
  };

  const confirmDeleteAll = async () => {
    const { data, error } = await deleteAllExaminationRecords();

    if (error) {
      console.error('Error deleting examination records:', error);
      toast.error('Failed to delete examination records');
    } else {
      toast.success(`${data?.length || 0} examination records deleted successfully!`);
      setShowDeleteAllModal(false);
      loadExaminationRecords(); // Refresh data
    }
  };

  // Selection handlers for bulk actions
  const handleSelectScholar = (scholarId) => {
    // Find the scholar to check if it's forwarded
    const scholar = filteredData.find(item => item.id === scholarId);
    if (scholar?.status?.toLowerCase().includes('forwarded')) {
      toast.info('Cannot select forwarded scholars');
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
    const selectableScholars = filteredData.filter(item => !item.status?.toLowerCase().includes('forwarded'));

    if (selectedScholars.length === selectableScholars.length && selectableScholars.length > 0) {
      setSelectedScholars([]);
      setShowBulkActions(false);
    } else {
      setSelectedScholars(selectableScholars.map(item => item.id));
      if (selectableScholars.length > 0) {
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
      toast.info('Please select scholars to forward');
      return;
    }
    setShowBulkForwardModal(true);
  };

  const confirmBulkForward = async () => {
    try {
      console.log('Starting bulk forward for scholars:', selectedScholars);

      const forwardPromises = selectedScholars.map(id =>
        forwardExaminationRecord(id)
      );
      const results = await Promise.all(forwardPromises);

      console.log('Bulk forward results:', results);

      // Check for any errors
      const errors = results.filter(result => result.error);
      const successes = results.filter(result => !result.error);

      if (errors.length > 0) {
        console.error('Forward errors:', errors);
        const errorMessages = errors.map(err => err.error?.message || 'Unknown error').join(', ');
        toast.error(`${errors.length} scholars failed to forward. Errors: ${errorMessages}`);

        if (successes.length > 0) {
          toast.success(`${successes.length} scholars forwarded successfully!`);
        }
      } else {
        toast.success(`${selectedScholars.length} scholars forwarded successfully!`);
      }

      setShowBulkForwardModal(false);
      handleClearSelection();
      loadExaminationRecords();
    } catch (error) {
      console.error('Exception in bulk forward:', error);
      toast.error(`Failed to forward scholars: ${error.message}`);
    }
  };

  const handleBulkDelete = () => {
    if (selectedScholars.length === 0) {
      toast.info('Please select scholars to delete');
      return;
    }
    setShowBulkDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const deletions = selectedScholars.map(id =>
        deleteExaminationRecord(id)
      );
      await Promise.all(deletions);
      toast.success(`${selectedScholars.length} scholars deleted successfully!`);
      setShowBulkDeleteModal(false);
      handleClearSelection();
      loadExaminationRecords();
    } catch (error) {
      console.error('Error deleting scholars:', error);
      toast.error('Failed to delete scholars');
    }
  };

  // Export current table (filteredData) to Excel
  const handleDownloadExcel = () => {
    // If no columns selected yet, select all by default
    if (selectedColumns.length === 0) {
      setSelectedColumns(ALL_AVAILABLE_COLUMNS.map(col => col.key));
    }
    setShowDownloadModal(true);
  };

  const toggleColumnSelection = (columnKey) => {
    setSelectedColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const selectAllColumns = () => {
    setSelectedColumns(ALL_AVAILABLE_COLUMNS.map(col => col.key));
  };

  const deselectAllColumns = () => {
    setSelectedColumns([]);
  };

  // Helper function to safely get nested/mapped data
  const filterDataByColumns = (data, selectedKeys) => {
    return data.map((item, idx) => {
      const filteredItem = {};

      selectedKeys.forEach(key => {
        switch (key) {
          // Basic Info
          case 'S.No':
            filteredItem[key] = idx + 1; break;
          case 'Application No':
            filteredItem[key] = item.application_no || item.id || ''; break;
          case 'Form Name':
            filteredItem[key] = item.form_name || 'PhD Application Form'; break;
          case 'Current Status':
            filteredItem[key] = item.status || 'Pending'; break;

          // Personal Details
          case 'Registered Name':
            filteredItem[key] = item.registered_name || item.name || ''; break;
          case 'Date of Birth':
            filteredItem[key] = item.date_of_birth || ''; break;
          case 'Gender':
            filteredItem[key] = item.gender || ''; break;
          case 'Mobile Number':
            filteredItem[key] = item.mobile_number || item.mobile || ''; break;
          case 'Email':
            filteredItem[key] = item.email || ''; break;
          case 'Nationality':
            filteredItem[key] = item.nationality || 'Indian'; break;
          case 'Aadhaar No':
            filteredItem[key] = item.aadhaar_no || ''; break;
          case 'Differently Abled':
            filteredItem[key] = item.differently_abled || 'No'; break;

          // Program Info
          case 'Institution':
            filteredItem[key] = item.institution || item.faculty || item.program || ''; break;
          case 'Faculty':
            filteredItem[key] = item.faculty || ''; break;
          case 'Department':
            filteredItem[key] = item.department || ''; break;
          case 'Program':
            filteredItem[key] = item.program || ''; break;
          case 'Program Type':
            filteredItem[key] = item.program_type || item.type || item.programType || ''; break;

          // Academic Background
          case 'Graduated From India':
            filteredItem[key] = item.graduated_from_india || 'Yes'; break;
          case 'UG Qualification':
            filteredItem[key] = item.ug_degree ? `${item.ug_degree} (${item.ug_institute || ''}) - ${item.ug_cgpa || ''}` : ''; break;
          case 'PG Qualification':
            filteredItem[key] = item.pg_degree ? `${item.pg_degree} (${item.pg_institute || ''}) - ${item.pg_cgpa || ''}` : ''; break;

          // Examination Marks
          case 'Written Marks (100)':
            filteredItem[key] = item.written_marks_100 || 0; break;
          case 'Written Marks (70)':
            filteredItem[key] = Math.round(((item.written_marks_100 || 0) / 100) * 70); break;
          case 'Interview Marks (30)':
            filteredItem[key] = item.interview_marks || 0; break;
          case 'Total Marks':
            filteredItem[key] = item.total_marks || 0; break;

          // System Info
          case 'Creation Date':
            filteredItem[key] = item.created_at ? new Date(item.created_at).toLocaleDateString() : ''; break;

          default:
            filteredItem[key] = '';
        }
      });
      return filteredItem;
    });
  };

  const confirmDownloadExcel = () => {
    if (selectedColumns.length === 0) {
      toast.warning('Please select at least one column to export.');
      return;
    }

    try {
      // Sort columns based on their original order in ALL_AVAILABLE_COLUMNS
      const sortedSelectedColumns = [...selectedColumns].sort((a, b) => {
        const indexA = ALL_AVAILABLE_COLUMNS.findIndex(col => col.key === a);
        const indexB = ALL_AVAILABLE_COLUMNS.findIndex(col => col.key === b);
        return indexA - indexB;
      });

      const exportData = filterDataByColumns(filteredData, sortedSelectedColumns);

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();

      // Auto-size columns based on header and content length
      const colWidths = sortedSelectedColumns.map(key => ({
        wch: Math.max(
          key.length,
          ...exportData.map(row => (row[key] ? row[key].toString().length : 0))
        ) + 2
      }));
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Examination');
      const fileName = `Examination_Records_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success('Examination table downloaded successfully!');
      setShowDownloadModal(false);
    } catch (error) {
      console.error('Error exporting examination data:', error);
      toast.error('Failed to download examination data');
    }
  };

  // Handle upload scholar list
  const handleUploadScholarList = () => {
    setShowUploadModal(true);
  };

  // Handle file upload processing
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name;
    const fileSize = (file.size / 1024 / 1024).toFixed(2);

    toast.info(`Processing file: ${fileName} (${fileSize} MB)...`);

    const { data, error } = await uploadExaminationExcel(file);

    if (error) {
      console.error('Error uploading examination Excel:', error);
      const errorMessage = error.message || error.hint || 'Failed to upload examination records';
      toast.error(`Upload failed: ${errorMessage}`);
    } else {
      toast.success(`Successfully imported ${data?.length || 0} examination records from ${fileName}!`);
      setShowUploadModal(false);
      loadExaminationRecords(); // Refresh data
    }

    // Reset file input
    event.target.value = '';
  };

  const toggleFullscreen = () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    if (onFullscreenChange) onFullscreenChange(newFullscreenState);
  };

  // Track modal states and notify parent
  useEffect(() => {
    const hasModal = isAddScholarModalOpen || isEditModalOpen || isViewModalOpen || showFilterModal ||
      showUploadModal || showVerifyModal || showForwardModal || showDownloadModal ||
      showForwardAllModal || showDeleteAllModal || showBulkDeleteModal || showBulkForwardModal ||
      showForwardToDirectorModal || showBulkForwardToDirectorModal;
    if (onModalStateChange) {
      onModalStateChange(hasModal);
    }
  }, [isAddScholarModalOpen, isEditModalOpen, isViewModalOpen, showFilterModal, showUploadModal,
    showVerifyModal, showForwardModal, showForwardAllModal, showDeleteAllModal,
    showBulkDeleteModal, showBulkForwardModal, showDownloadModal, showForwardToDirectorModal,
    showBulkForwardToDirectorModal, onModalStateChange]);

  // Filtering
  const filteredData = examData.filter(item => {
    const name = item.registered_name || item.name || '';
    const appNo = item.application_no || item.id || '';
    const email = item.email || '';
    const mobile = item.mobile_number || item.mobile || '';

    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.faculty && item.faculty.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.department && item.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      appNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mobile.includes(searchTerm);

    const matchesFaculty = selectedFaculty === '' || item.faculty === selectedFaculty;
    const matchesDepartment = selectedDepartment === '' ||
      (item.department && item.department.toLowerCase().includes(selectedDepartment.toLowerCase()));
    const matchesType = selectedType === '' || (item.type || item.program_type || '') === selectedType;
    const matchesStatus = selectedStatus === '' ||
      (selectedStatus === 'Pending' && item.status === 'pending') ||
      (selectedStatus === 'Verified' && item.status === 'verified') ||
      (selectedStatus === 'Forwarded' && item.status?.toLowerCase().includes('forwarded')) ||
      (selectedStatus === 'Passed' && (item.marks || 0) >= 60) ||
      (selectedStatus === 'Failed' && (item.marks || 0) < 60);

    return matchesSearch && matchesFaculty && matchesDepartment && matchesType && matchesStatus;
  });

  // Reusable Form Content (Used for both Add and Edit modals)
  const renderScholarForm = (onSubmit, title, onClose) => (
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <button onClick={onClose} type="button" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <form onSubmit={onSubmit} className="p-6">
        {/* Basic Information */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="modal-form-label">Application No</label>
              <input type="text" name="applicationNo" value={formData.applicationNo} onChange={handleInputChange} className="modal-form-input w-full bg-gray-50" />
            </div>
            <div className="form-group">
              <label className="modal-form-label">Form Name</label>
              <input type="text" name="formName" value={formData.formName} onChange={handleInputChange} className="modal-form-input w-full" />
            </div>
            <div className="form-group">
              <label className="modal-form-label">Registered Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="modal-form-input w-full" />
            </div>
            <div className="form-group">
              <label className="modal-form-label">Graduated From India?</label>
              <select name="graduatedFromIndia" value={formData.graduatedFromIndia} onChange={handleInputChange} className="modal-form-select w-full">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="form-group">
              <label className="modal-form-label">Course</label>
              <input type="text" name="course" value={formData.course} onChange={handleInputChange} className="modal-form-input w-full" />
            </div>
            <div className="form-group">
              <label className="modal-form-label">Institution (Faculty) *</label>
              <select name="faculty" value={formData.faculty} onChange={handleInputChange} className="modal-form-select w-full" required>
                <option value="">Select Faculty</option>
                {facultiesData.map(faculty => (
                  <option key={faculty.id} value={faculty.name}>{faculty.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="modal-form-label">Program *</label>
              <select
                name="program"
                value={formData.program}
                onChange={handleInputChange}
                className="modal-form-select w-full"
                required
                disabled={!formData.faculty}
              >
                <option value="">Select Program</option>
                {departmentsData
                  .filter(dept => dept.faculty === formData.faculty)
                  .map(dept => (
                    <option key={dept.id} value={`Ph.d. - ${dept.department_name}`}>
                      Ph.d. - {dept.department_name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-group">
              <label className="modal-form-label">Program Type *</label>
              <select name="programType" value={formData.programType} onChange={handleInputChange} className="modal-form-select w-full" required>
                <option value="Full Time">Full Time</option>
                <option value="Part Time">Part Time</option>
                <option value="Part Time (Industry)">Part Time (Industry)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Employment Information */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Employment Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="modal-form-label">Employee Id</label>
              <input type="text" name="employeeId" value={formData.employeeId} onChange={handleInputChange} className="modal-form-input w-full" />
            </div>
            <div className="form-group">
              <label className="modal-form-label">Designation</label>
              <input type="text" name="designation" value={formData.designation} onChange={handleInputChange} className="modal-form-input w-full" />
            </div>
            <div className="form-group">
              <label className="modal-form-label">Organization Name</label>
              <input type="text" name="organizationName" value={formData.organizationName} onChange={handleInputChange} className="modal-form-input w-full" />
            </div>
            <div className="form-group col-span-full">
              <label className="modal-form-label">Organization Address</label>
              <input type="text" name="organizationAddress" value={formData.organizationAddress} onChange={handleInputChange} className="modal-form-input w-full" />
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="modal-form-label">Mobile Number *</label>
              <input type="tel" name="mobile" value={formData.mobile} onChange={handleInputChange} required className="modal-form-input w-full" />
            </div>
            <div className="form-group">
              <label className="modal-form-label">Email ID *</label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="modal-form-input w-full" />
            </div>
            <div className="form-group">
              <label className="modal-form-label">Date of Birth</label>
              <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} className="modal-form-input w-full" />
            </div>
            <div className="form-group">
              <label className="modal-form-label">Gender *</label>
              <select name="gender" value={formData.gender} onChange={handleInputChange} required className="modal-form-select w-full">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="modal-form-label">Differently Abled?</label>
              <select name="differentlyAbled" value={formData.differentlyAbled} onChange={handleInputChange} className="modal-form-select w-full">
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div className="form-group">
              <label className="modal-form-label">Nationality</label>
              <input type="text" name="nationality" value={formData.nationality} onChange={handleInputChange} className="modal-form-input w-full" />
            </div>
            <div className="form-group">
              <label className="modal-form-label">Aadhaar Card No.</label>
              <input type="text" name="aadhaarNo" value={formData.aadhaarNo} onChange={handleInputChange} className="modal-form-input w-full" />
            </div>
          </div>
        </div>

        {/* UG Education */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">UG - Education Qualification</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="modal-form-label">UG - Degree</label>
              <input type="text" name="ugDegree" value={formData.ugDegree} onChange={handleInputChange} className="modal-form-input w-full" />
            </div>
            <div className="form-group">
              <label className="modal-form-label">UG - Institute Name</label>
              <input type="text" name="ugInstitute" value={formData.ugInstitute} onChange={handleInputChange} className="modal-form-input w-full" />
            </div>
            <div className="form-group">
              <label className="modal-form-label">UG - CGPA/Percentage</label>
              <input type="text" name="ugCgpa" value={formData.ugCgpa} onChange={handleInputChange} className="modal-form-input w-full" />
            </div>
          </div>
        </div>

        {/* PG Education */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">PG - Education Qualification</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="modal-form-label">PG - Degree</label>
              <input type="text" name="pgDegree" value={formData.pgDegree} onChange={handleInputChange} className="modal-form-input w-full" />
            </div>
            <div className="form-group">
              <label className="modal-form-label">PG - Institute Name</label>
              <input type="text" name="pgInstitute" value={formData.pgInstitute} onChange={handleInputChange} className="modal-form-input w-full" />
            </div>
            <div className="form-group">
              <label className="modal-form-label">PG - CGPA/Percentage</label>
              <input type="text" name="pgCgpa" value={formData.pgCgpa} onChange={handleInputChange} className="modal-form-input w-full" />
            </div>
          </div>
        </div>

        {/* Application Status (Required Fields) */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Application Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="modal-form-label">Department *</label>
              <select name="department" value={formData.department} onChange={handleInputChange} required className="modal-form-select w-full">
                <option value="">Select Department</option>
                {getDepartmentsForFaculty(formData.faculty).map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="modal-form-label">Written Marks (Out of 70)</label>
              <input type="number" name="marks" value={formData.marks} onChange={handleInputChange} min="0" max="70" className="modal-form-input w-full" />
            </div>
            <div className="form-group">
              <label className="modal-form-label">Interview Marks (Read-only - Out of 30)</label>
              <input
                type="number"
                name="interviewMarks"
                value={formData.interviewMarks || ''}
                className="modal-form-input w-full bg-gray-100 cursor-not-allowed"
                disabled
                placeholder="Entered by another person"
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-1 bg-white border-t border-gray-200 pt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium">
            Cancel
          </button>
          <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
            {title.includes('Edit') ? 'Update Scholar' : 'Add Scholar'}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div id="examination-container">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header with title */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800 whitespace-nowrap">Examination Records</h1>
        </div>

        {/* Statistics Tiles - Hidden in fullscreen mode */}
        {!isFullscreen && (
          <div className="examination-stats-grid">
            <div className="examination-stat-card examination-stat-total">
              <div className="examination-stat-content">
                <div className="examination-stat-label">Total Records</div>
                <div className="examination-stat-number">{examData.length}</div>
              </div>
              <div className="examination-stat-icon examination-stat-icon-blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
            </div>

            <div className="examination-stat-card examination-stat-passed">
              <div className="examination-stat-content">
                <div className="examination-stat-label">Passed</div>
                <div className="examination-stat-number">
                  {examData.filter(record => {
                    // Only count scholars with valid total marks >= 60
                    const hasValidTotalMarks = record.total_marks !== null && record.total_marks !== undefined;
                    return hasValidTotalMarks && record.total_marks >= 60;
                  }).length}
                </div>
              </div>
              <div className="examination-stat-icon examination-stat-icon-green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
            </div>

            <div className="examination-stat-card examination-stat-failed">
              <div className="examination-stat-content">
                <div className="examination-stat-label">Failed</div>
                <div className="examination-stat-number">
                  {examData.filter(record => {
                    // Only count scholars with valid total marks < 60
                    const hasValidTotalMarks = record.total_marks !== null && record.total_marks !== undefined;
                    return hasValidTotalMarks && record.total_marks < 60;
                  }).length}
                </div>
              </div>
              <div className="examination-stat-icon examination-stat-icon-red">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              </div>
            </div>

            <div className="examination-stat-card examination-stat-rate">
              <div className="examination-stat-content">
                <div className="examination-stat-label">Pass Rate</div>
                <div className="examination-stat-number">
                  {(() => {
                    const scholarsWithTotalMarks = examData.filter(record =>
                      record.total_marks !== null && record.total_marks !== undefined
                    );
                    const passedScholars = scholarsWithTotalMarks.filter(record => record.total_marks >= 60);

                    return scholarsWithTotalMarks.length > 0
                      ? `${Math.round((passedScholars.length / scholarsWithTotalMarks.length) * 100)}%`
                      : '0%';
                  })()}
                </div>
              </div>
              <div className="examination-stat-icon examination-stat-icon-purple">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="20" x2="12" y2="10"></line>
                  <line x1="18" y1="20" x2="18" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="16"></line>
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="examination-controls">
          <div className="examination-controls-left">
            <div className="flex items-center gap-2">
              <div className="relative w-48 mt-1">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10 flex items-center"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <FaSearch className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              <button onClick={() => setShowFilterModal(true)} className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center" title="Filter">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={handleUploadScholarList} className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors">
                <FaUpload className="h-4 w-4" />
                <span>Upload</span>
              </button>

              <button onClick={openAddScholarModal} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors">
                <FaPlus className="h-4 w-4" />
                <span>Add Scholar</span>
              </button>

              <button onClick={handleForwardAll} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L2 8.5L9 12L12 19L22 2Z" />
                  <path d="M9 12L22 2" />
                </svg>
                <span>Forward All</span>
              </button>
              <button onClick={handleDownloadExcel} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" file="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l-4-4m4 4l4-4M21 21H3" />
                </svg>
                Download
              </button>
              <button onClick={handleDeleteAll} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete All
              </button>
            </div>
          </div>

          <div className="examination-controls-right">
            <button onClick={toggleFullscreen} className="fullscreen-btn" title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
              {isFullscreen ? <FaCompress className="w-4 h-4" /> : <FaExpand className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="examination-table-container examination-table-scroll" ref={tableScrollRef}>
          <table className="examination-table divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ position: 'sticky', left: 0, zIndex: 25, background: '#f9fafb', width: '40px', minWidth: '40px', maxWidth: '40px', padding: '12px 6px', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={(() => {
                      const selectableScholars = filteredData.filter(item => !item.status?.toLowerCase().includes('forwarded'));
                      return selectedScholars.length === selectableScholars.length && selectableScholars.length > 0;
                    })()}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                  />
                </th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ position: 'sticky', left: '40px', zIndex: 25, background: '#f9fafb', width: '55px', minWidth: '55px', maxWidth: '55px', padding: '12px 6px', whiteSpace: 'nowrap' }}>S.NO</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ position: 'sticky', left: '95px', zIndex: 25, background: '#f9fafb', width: '160px', minWidth: '160px', maxWidth: '160px', padding: '12px 8px', whiteSpace: 'nowrap' }}>REGISTERED NAME</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ position: 'sticky', left: '255px', zIndex: 25, background: '#f9fafb', width: '140px', minWidth: '140px', maxWidth: '140px', padding: '12px 8px', whiteSpace: 'nowrap' }}>APPLICATION NO</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ position: 'sticky', left: '395px', zIndex: 25, background: '#f9fafb', width: '180px', minWidth: '180px', maxWidth: '180px', padding: '12px 8px', whiteSpace: 'nowrap', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.15)' }}>SELECT INSTITUTION</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[250px]">SELECT PROGRAM</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">TYPE</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">MOBILE NUMBER</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">EMAIL ID</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">GENDER</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">WRITTEN MARKS(100)</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">WRITTEN MARKS(70)</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">INTERVIEW MARKS</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">TOTAL MARKS</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '180px', width: '180px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${selectedScholars.includes(item.id) ? 'bg-blue-50' : ''}`}>
                    <td className="text-center text-sm" style={{ position: 'sticky', left: 0, zIndex: 20, backgroundColor: selectedScholars.includes(item.id) ? '#eff6ff' : '#ffffff', width: '40px', minWidth: '40px', maxWidth: '40px', padding: '12px 6px', whiteSpace: 'nowrap' }}>
                      <input
                        type="checkbox"
                        checked={selectedScholars.includes(item.id)}
                        onChange={() => handleSelectScholar(item.id)}
                        disabled={item.status?.toLowerCase().includes('forwarded')}
                        className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ${item.status?.toLowerCase().includes('forwarded')
                          ? 'cursor-not-allowed opacity-50'
                          : 'cursor-pointer'
                          }`}
                        title={item.status?.toLowerCase().includes('forwarded') ? 'Cannot select forwarded scholar' : ''}
                      />
                    </td>
                    <td className="text-center text-sm font-medium text-gray-900" style={{ position: 'sticky', left: '40px', zIndex: 20, backgroundColor: selectedScholars.includes(item.id) ? '#eff6ff' : '#ffffff', width: '55px', minWidth: '55px', maxWidth: '55px', padding: '12px 6px', whiteSpace: 'nowrap' }}>{index + 1}</td>
                    <td className="text-sm font-medium text-gray-900 text-left" style={{ position: 'sticky', left: '95px', zIndex: 20, backgroundColor: selectedScholars.includes(item.id) ? '#eff6ff' : '#ffffff', width: '160px', minWidth: '160px', maxWidth: '160px', padding: '12px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.registered_name || item.name}</td>
                    <td className="text-sm font-medium text-left" style={{ position: 'sticky', left: '255px', zIndex: 20, backgroundColor: selectedScholars.includes(item.id) ? '#eff6ff' : '#ffffff', width: '140px', minWidth: '140px', maxWidth: '140px', padding: '12px 8px', whiteSpace: 'nowrap' }}>{item.application_no || item.id}</td>
                    <td className="text-sm text-gray-900 text-left" style={{ position: 'sticky', left: '395px', zIndex: 20, backgroundColor: selectedScholars.includes(item.id) ? '#eff6ff' : '#ffffff', width: '180px', minWidth: '180px', maxWidth: '180px', padding: '12px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.15)' }}>{item.faculty}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 min-w-[250px] whitespace-normal text-left">{item.program || item.faculty}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-left">{item.program_type || item.type || item.programType}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-left">{item.mobile_number || item.mobile}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 min-w-[200px] whitespace-normal break-all text-left">{item.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900">{item.gender}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                      {editingMarks100[item.id] !== undefined ? (
                        <div className="flex items-center justify-center space-x-1">
                          <input
                            type="text" value={editingMarks100[item.id]}
                            onChange={(e) => handleMarks100Change(item.id, e.target.value)}
                            onKeyDown={(e) => handleMarks100KeyPress(e, item.id)}
                            onFocus={(e) => e.target.select()}
                            onBlur={() => handleMarks100Save(item.id)}
                            className="w-16 px-2 py-1 text-center border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0-100 or Ab"
                            autoFocus
                          />
                          <button onClick={() => handleMarks100Save(item.id)} className="text-green-600 hover:text-green-800">✓</button>
                          <button onClick={handleMarks100Cancel} className="text-red-600 hover:text-red-800">✕</button>
                        </div>
                      ) : (
                        (() => {
                          // Check if both written and interview marks exist
                          const hasWrittenMarks = item.written_marks_100 !== null &&
                            item.written_marks_100 !== undefined &&
                            item.written_marks_100 !== '' &&
                            item.written_marks_100 !== 0;
                          const hasInterviewMarks = item.interview_marks !== null &&
                            item.interview_marks !== undefined &&
                            item.interview_marks !== '' &&
                            item.interview_marks !== 0;

                          // Check if written is absent
                          const isWrittenAbsent = item.written_marks_100 === 'Ab' ||
                            item.written_marks_100 === 'AB' ||
                            item.written_marks_100 === 'ab';

                          // Only show written marks if BOTH marks exist OR if written is absent and interview exists
                          if ((hasWrittenMarks || isWrittenAbsent) && hasInterviewMarks) {
                            return (
                              <span
                                className={`marks-badge cursor-pointer hover:bg-blue-100 ${isWrittenAbsent
                                  ? 'bg-red-50 text-red-600 border-red-300 font-bold'
                                  : 'bg-blue-50 text-blue-700 border-blue-300'
                                  }`}
                                onClick={() => handleMarks100Click(item.id, item.written_marks_100 || 0)}
                              >
                                {isWrittenAbsent ? 'Ab' : item.written_marks_100}
                              </span>
                            );
                          } else {
                            // Show "-" if either mark is missing
                            return (
                              <span
                                className="marks-badge bg-gray-100 text-gray-500 cursor-pointer hover:bg-gray-200"
                                onClick={() => handleMarks100Click(item.id, item.written_marks_100 || 0)}
                                title="Enter both written and interview marks"
                              >
                                -
                              </span>
                            );
                          }
                        })()
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                      {(() => {
                        // Check if both written and interview marks exist
                        const hasWrittenMarks = item.written_marks_100 !== null &&
                          item.written_marks_100 !== undefined &&
                          item.written_marks_100 !== '' &&
                          item.written_marks_100 !== 0;
                        const hasInterviewMarks = item.interview_marks !== null &&
                          item.interview_marks !== undefined &&
                          item.interview_marks !== '' &&
                          item.interview_marks !== 0;

                        // Check if written is absent
                        const isWrittenAbsent = item.written_marks === 'Ab' ||
                          item.written_marks === 'AB' ||
                          item.written_marks === 'ab';

                        // Only show written marks(70) if BOTH marks exist OR if written is absent and interview exists
                        if ((hasWrittenMarks || isWrittenAbsent) && hasInterviewMarks) {
                          if (isWrittenAbsent) {
                            return <span className="marks-badge bg-red-50 text-red-600 border-red-300 font-bold">Ab</span>;
                          } else {
                            const marks70 = Math.round(((item.written_marks_100 || 0) / 100) * 70);
                            return (
                              <span className={`marks-badge ${marks70 > 35 ? 'marks-passed' : 'marks-failed'}`}>
                                {marks70}
                              </span>
                            );
                          }
                        } else {
                          // Show "-" if either mark is missing
                          return (
                            <span className="marks-badge bg-gray-100 text-gray-500" title="Enter both written and interview marks">
                              -
                            </span>
                          );
                        }
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                      {item.director_interview === 'Forwarded to Director' ? (
                        editingInterviewMarks[item.id] !== undefined ? (
                          <div className="flex items-center justify-center space-x-1">
                            <input
                              type="text" value={editingInterviewMarks[item.id]}
                              onChange={(e) => handleInterviewMarksChange(item.id, e.target.value)}
                              onKeyDown={(e) => handleInterviewMarksKeyPress(e, item.id)}
                              onFocus={(e) => e.target.select()}
                              onBlur={() => handleInterviewMarksSave(item.id)}
                              className="w-16 px-2 py-1 text-center border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0-30 or Ab"
                              autoFocus
                            />
                            <button onClick={() => handleInterviewMarksSave(item.id)} className="text-green-600 hover:text-green-800">✓</button>
                            <button onClick={handleInterviewMarksCancel} className="text-red-600 hover:text-red-800">✕</button>
                          </div>
                        ) : (
                          <span
                            className={`marks-badge cursor-pointer hover:bg-opacity-80 ${item.interview_marks === 'Ab' || item.interview_marks === 'AB' || item.interview_marks === 'ab'
                              ? 'bg-red-50 text-red-600 border-red-300 font-bold'
                              : item.interview_marks !== null && item.interview_marks !== undefined && item.interview_marks > 0
                                ? ((item.interview_marks >= 15) ? 'marks-passed' : 'marks-failed')
                                : 'bg-gray-100 text-gray-500'
                              }`}
                            onClick={() => handleInterviewMarksClick(item.id, item.interview_marks || 0)}
                          >
                            {item.interview_marks === 'Ab' || item.interview_marks === 'AB' || item.interview_marks === 'ab'
                              ? 'Ab'
                              : (item.interview_marks !== null && item.interview_marks !== undefined && item.interview_marks > 0 ? item.interview_marks : '-')}
                          </span>
                        )
                      ) : (
                        <span className="marks-badge bg-gray-200 text-gray-400" title="Interview marks only available when forwarded to director">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                      {(() => {
                        // Check if written marks exists and is numeric (not null, undefined, empty, 0, or 'Ab')
                        const hasWrittenMarks = item.written_marks !== null &&
                          item.written_marks !== undefined &&
                          item.written_marks !== '' &&
                          item.written_marks !== 0 &&
                          item.written_marks !== 'Ab' &&
                          item.written_marks !== 'AB' &&
                          item.written_marks !== 'ab' &&
                          !isNaN(parseFloat(item.written_marks));

                        // Check if interview marks exists and is numeric (not null, undefined, empty, 0, or 'Ab')
                        const hasInterviewMarks = item.interview_marks !== null &&
                          item.interview_marks !== undefined &&
                          item.interview_marks !== '' &&
                          item.interview_marks !== 0 &&
                          item.interview_marks !== 'Ab' &&
                          item.interview_marks !== 'AB' &&
                          item.interview_marks !== 'ab' &&
                          !isNaN(parseFloat(item.interview_marks));

                        // Check if faculty_interview is forwarded (contains "Forwarded_To_")
                        const isFacultyInterviewForwarded = item.faculty_interview &&
                          item.faculty_interview.includes('Forwarded_To_');

                        // Check if director_interview is forwarded to director
                        const isDirectorInterviewForwarded = item.director_interview === 'Forwarded to Director';

                        // Check if marks are absent
                        const isWrittenAbsent = item.written_marks === 'Ab' || item.written_marks === 'AB' || item.written_marks === 'ab';
                        const isInterviewAbsent = item.interview_marks === 'Ab' || item.interview_marks === 'AB' || item.interview_marks === 'ab';

                        // Only show "Absent" if BOTH marks exist AND both are marked as absent
                        if (isWrittenAbsent && isInterviewAbsent) {
                          return (
                            <span className="marks-badge bg-red-50 text-red-600 border-red-300 font-bold">
                              Absent
                            </span>
                          );
                        }

                        // If both marks exist and are numeric, show total marks
                        if (hasWrittenMarks && hasInterviewMarks) {
                          const totalMarksNum = parseFloat(item.total_marks);
                          if (!isNaN(totalMarksNum) && totalMarksNum > 0) {
                            return (
                              <span className={`marks-badge ${totalMarksNum >= 50 ? 'marks-passed' : 'marks-failed'}`}>
                                {item.total_marks}
                              </span>
                            );
                          }
                        }

                        // Otherwise show "-" (when either mark is missing)
                        return (
                          <span className="marks-badge bg-gray-100 text-gray-500" title="Total marks available when both written and interview marks are entered">
                            -
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        item.status === 'verified' ? 'bg-blue-100 text-blue-800' :
                          item.status?.toLowerCase().includes('forwarded') ? 'bg-green-100 text-green-800' : ''
                        }`}>
                        {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-center text-sm bg-white" style={{ minWidth: '180px', width: '180px' }}>
                      <div className="examination-actions">
                        <button onClick={() => { setViewingScholar(item); setIsViewModalOpen(true); }} className="examination-action-btn view" title="View Details">
                          <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                          </svg>
                        </button>
                        <button onClick={() => handleEdit(item)} className="examination-action-btn edit" title="Edit Scholar" disabled={item.status?.toLowerCase().includes('forwarded')}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleForward(item)}
                          className="examination-action-btn forward"
                          title={item.status?.toLowerCase().includes('forwarded') ? 'Already forwarded' : 'Forward to Faculty'}
                          disabled={item.status?.toLowerCase().includes('forwarded')}
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleForwardToDirector(item)}
                          className="examination-action-btn forward"
                          style={{ backgroundColor: item.director_interview === 'Forwarded to Director' ? '#6b7280' : '#8b5cf6' }}
                          title={item.director_interview === 'Forwarded to Director' ? 'Already forwarded to director' : 'Forward to Director for Interview'}
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => { if (window.confirm(`Delete ${item.registered_name || item.name}?`)) deleteExaminationRecord(item.id).then(() => loadExaminationRecords()); }}
                          className="examination-action-btn delete"
                          title="Delete Record"
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="16" className="px-4 py-8 text-center">
                    <div className="empty-state">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Examination Records Found</h3>
                      <p className="text-gray-500">{loading ? 'Loading...' : 'No records match your criteria.'}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Scholar Modal */}
      {isViewModalOpen && viewingScholar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setIsViewModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900">Examination Record Details</h2>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Basic Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="view-field">
                    <label className="view-label">Application No:</label>
                    <p className="view-value">{viewingScholar.application_no || viewingScholar.id || 'N/A'}</p>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Registered Name:</label>
                    <p className="view-value">{viewingScholar.registered_name || viewingScholar.name || 'N/A'}</p>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Email:</label>
                    <p className="view-value">{viewingScholar.email || 'N/A'}</p>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Mobile Number:</label>
                    <p className="view-value">{viewingScholar.mobile_number || viewingScholar.mobile || 'N/A'}</p>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Gender:</label>
                    <p className="view-value">{viewingScholar.gender || 'N/A'}</p>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Date of Birth:</label>
                    <p className="view-value">{viewingScholar.date_of_birth || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Academic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="view-field">
                    <label className="view-label">Faculty:</label>
                    <p className="view-value">{viewingScholar.faculty || 'N/A'}</p>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Department:</label>
                    <p className="view-value">{viewingScholar.department || extractDepartmentFromProgram(viewingScholar.program)}</p>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Program:</label>
                    <p className="view-value">{viewingScholar.program || 'N/A'}</p>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Program Type:</label>
                    <p className="view-value">{viewingScholar.program_type || viewingScholar.type || 'N/A'}</p>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Institution:</label>
                    <p className="view-value">{viewingScholar.institution || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Examination Details */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Examination Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="view-field">
                    <label className="view-label">Written Marks(100):</label>
                    <p className="view-value font-bold text-gray-900">
                      {viewingScholar.written_marks_100 || 0}
                    </p>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Written Marks(70):</label>
                    <p className={`view-value font-bold ${Math.round(((viewingScholar.written_marks_100 || 0) / 100) * 70) >= 42 ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.round(((viewingScholar.written_marks_100 || 0) / 100) * 70)} / 70
                    </p>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Interview Marks:</label>
                    <p className={`view-value font-bold ${viewingScholar.interview_marks !== null && viewingScholar.interview_marks !== undefined && viewingScholar.interview_marks > 0 ? ((viewingScholar.interview_marks >= 18) ? 'text-green-600' : 'text-red-600') : 'text-gray-500'}`}>
                      {viewingScholar.interview_marks !== null && viewingScholar.interview_marks !== undefined && viewingScholar.interview_marks > 0 ? `${viewingScholar.interview_marks} / 30` : '-'}
                    </p>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Total Marks:</label>
                    <p className={`view-value font-bold ${(() => {
                      const writtenMarks70 = Math.round(((viewingScholar.written_marks_100 || 0) / 100) * 70);
                      const hasWrittenMarks = writtenMarks70 > 0;
                      const hasInterviewMarks = viewingScholar.interview_marks !== null && viewingScholar.interview_marks !== undefined && viewingScholar.interview_marks > 0;
                      const isForwardedToDirector = viewingScholar.director_interview === 'Forwarded to Director';

                      const totalMarksStr = viewingScholar.total_marks !== null && viewingScholar.total_marks !== undefined ? viewingScholar.total_marks : `${writtenMarks70} (Written) + ${viewingScholar.interview_marks} (Interview)`;
                      if (isForwardedToDirector && hasWrittenMarks && hasInterviewMarks) {
                        return (parseFloat(viewingScholar.total_marks) >= 60 ? 'text-green-600' : 'text-red-600');
                      } else {
                        return 'text-gray-500';
                      }
                    })()}`}>
                      {(() => {
                        const writtenMarks70 = Math.round(((viewingScholar.written_marks_100 || 0) / 100) * 70);
                        const hasWrittenMarks = writtenMarks70 > 0;
                        const hasInterviewMarks = viewingScholar.interview_marks !== null && viewingScholar.interview_marks !== undefined && viewingScholar.interview_marks > 0;
                        const isForwardedToDirector = viewingScholar.director_interview === 'Forwarded to Director';

                        if (isForwardedToDirector && hasWrittenMarks && hasInterviewMarks) {
                          return `${viewingScholar.total_marks !== null && viewingScholar.total_marks !== undefined ? viewingScholar.total_marks : (writtenMarks70 + parseFloat(viewingScholar.interview_marks || 0))} / 100`;
                        } else {
                          return 'Pending interview completion';
                        }
                      })()}
                    </p>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Status:</label>
                    <p className="view-value">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${viewingScholar.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        viewingScholar.status === 'verified' ? 'bg-blue-100 text-blue-800' :
                          viewingScholar.status?.toLowerCase().includes('forwarded') ? 'bg-green-100 text-green-800' : ''
                        }`}>
                        {viewingScholar.status ? viewingScholar.status.charAt(0).toUpperCase() + viewingScholar.status.slice(1) : 'Pending'}
                      </span>
                    </p>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Result:</label>
                    <p className={`view-value font-bold ${(() => {
                      const hasWrittenMarks = viewingScholar.written_marks !== null && viewingScholar.written_marks !== undefined && viewingScholar.written_marks > 0;
                      const hasInterviewMarks = viewingScholar.interview_marks !== null && viewingScholar.interview_marks !== undefined && viewingScholar.interview_marks > 0;
                      const isForwardedToDirector = viewingScholar.director_interview === 'Forwarded to Director';

                      if (hasWrittenMarks && hasInterviewMarks && viewingScholar.total_marks !== null && viewingScholar.total_marks !== undefined) {
                        return (parseFloat(viewingScholar.total_marks) >= 60 ? 'text-green-600' : 'text-red-600');
                      } else {
                        return 'text-gray-500';
                      }
                    })()}`}>
                      {(() => {
                        const hasWrittenMarks = viewingScholar.written_marks !== null && viewingScholar.written_marks !== undefined && viewingScholar.written_marks > 0;
                        const hasInterviewMarks = viewingScholar.interview_marks !== null && viewingScholar.interview_marks !== undefined && viewingScholar.interview_marks > 0;
                        const isForwardedToDirector = viewingScholar.director_interview === 'Forwarded to Director';

                        if (hasWrittenMarks && hasInterviewMarks && viewingScholar.total_marks !== null && viewingScholar.total_marks !== undefined) {
                          return (parseFloat(viewingScholar.total_marks) >= 60 ? 'PASSED' : 'FAILED');
                        } else {
                          return 'PENDING';
                        }
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={() => setIsViewModalOpen(false)} className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Scholar Modal (Updated) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleEditCancel}>
          {renderScholarForm(handleEditSave, "Edit Scholar Details", handleEditCancel)}
        </div>
      )}

      {/* Add Scholar Modal (Updated) */}
      {isAddScholarModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setIsAddScholarModalOpen(false)}>
          {renderScholarForm(handleAddScholar, "Add New Scholar", () => setIsAddScholarModalOpen(false))}
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="modal-overlay" onClick={() => setShowFilterModal(false)}>
          <div className="modal-content filter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Filter Examination Records</h2>
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
                      setSelectedDepartment('');
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
                    {getDepartmentsForFaculty(selectedFaculty).map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
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
                    <option value="Part Time Internal">Part Time Internal</option>
                    <option value="Part Time External">Part Time External</option>
                    <option value="Part Time External (Industry)">Part Time Industry</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Forwarded">Forwarded</option>
                  </select>
                </div>
              </div>
              <div className="filter-actions">
                <button
                  onClick={() => { setSelectedFaculty(''); setSelectedDepartment(''); setSelectedType(''); setSelectedStatus(''); setShowFilterModal(false); }}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forward to Director Modal */}
      {showForwardToDirectorModal && scholarToForwardToDirector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ paddingTop: '60px' }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Forward to Director</h3>
                <button onClick={() => setShowForwardToDirectorModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Forward to Director for Interview</h4>
                <p className="text-gray-600 mb-2">
                  Forward <strong className="text-gray-900">{scholarToForwardToDirector.registered_name || scholarToForwardToDirector.name}</strong> to the director for interview?
                </p>
                <p className="text-sm text-purple-600">This will enable interview marks entry for this scholar.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowForwardToDirectorModal(false)} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium">Cancel</button>
                <button onClick={confirmForwardToDirector} className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium">Forward to Director</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Forward to Director Modal */}
      {showBulkForwardToDirectorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ paddingTop: '60px' }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Bulk Forward to Director</h3>
                <button onClick={() => setShowBulkForwardToDirectorModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Forward Selected to Director</h4>
                <p className="text-gray-600 mb-2">
                  Forward <span className="font-bold text-purple-600">{selectedScholars.length} scholar(s)</span> to the director for interview?
                </p>
                <p className="text-sm text-purple-600">This will enable interview marks entry for all selected scholars.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowBulkForwardToDirectorModal(false)} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium">Cancel</button>
                <button onClick={confirmBulkForwardToDirector} className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium">Forward to Director</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verify Modal */}
      {showVerifyModal && scholarToVerify && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ paddingTop: '60px' }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Confirm Verification</h3>
                <button onClick={() => setShowVerifyModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Verify Scholar</h4>
                <p className="text-gray-600 mb-2">
                  Are you sure you want to verify <strong className="text-gray-900">{scholarToVerify.name}</strong>?
                </p>
                <p className="text-sm text-blue-600">This will mark the scholar's examination as verified and ready for forwarding.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowVerifyModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmVerify}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                >
                  Verify Scholar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forward Modal */}
      {showForwardModal && scholarToForward && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ paddingTop: '60px' }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Confirm Forward</h3>
                <button onClick={() => setShowForwardModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
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
                  Are you sure you want to forward <strong className="text-gray-900">{scholarToForward.name}</strong> to the coordinator?
                </p>
                <p className="text-sm text-blue-600">This will send the scholar's examination information to the next stage of the process.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowForwardModal(false)}
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


      {/* Forward All Modal */}
      {showForwardAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ paddingTop: '60px' }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Confirm Forward All</h3>
                <button onClick={() => setShowForwardAllModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
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
                  Are you sure you want to forward all eligible examination records to coordinators?
                </p>
                <p className="text-sm text-blue-600">This action will send all verified scholars to the next stage of the process.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowForwardAllModal(false)}
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

      {/* Delete All Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ paddingTop: '60px' }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Confirm Delete All</h3>
                <button onClick={() => setShowDeleteAllModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
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
                <h4 className="text-lg font-medium text-gray-900 mb-2">Delete All Examination Records</h4>
                <p className="text-gray-600 mb-2">
                  Are you sure you want to delete ALL examination records from the database?
                </p>
                <p className="text-sm text-red-600 font-semibold">⚠️ This action cannot be undone! All examination data will be permanently deleted.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteAllModal(false)}
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
                <h2>Upload Examination List</h2>
                <p>Import examination data from Excel or CSV file</p>
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
                  id="examination-file-upload"
                />
                <label htmlFor="examination-file-upload" className="upload-dropzone-label">
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
                      <li>Program Type, Gender, Marks</li>
                      <li>Status (Pending/Verified/Forwarded)</li>
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
                      <li>New records will be added to the list</li>
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
                onClick={handleBulkForwardToDirector}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-500/80 hover:bg-purple-600 rounded-xl transition-all duration-200 font-medium backdrop-blur-sm border border-purple-400/30 hover:scale-105"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Fwd to Director
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
                <p className="text-sm text-green-600 font-semibold">This will update their status to "Forwarded".</p>
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
      {/* Download Column Selection Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col transform transition-all duration-300 scale-100 relative overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <FaDownload className="text-white text-xl" />
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
                <FaTimes className="text-xl" />
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
                              <span className={`text-sm leading-tight select-none pt-0.5 ${selectedColumns.includes(col.key) ? 'text-blue-800 font-medium' : 'text-gray-700'
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
                className={`px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-sm ${selectedColumns.length > 0
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-md'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
              >
                <FaDownload className={selectedColumns.length > 0 ? "animate-bounce-subtle" : ""} />
                Export {selectedColumns.length > 0 ? `(${selectedColumns.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Examination;
