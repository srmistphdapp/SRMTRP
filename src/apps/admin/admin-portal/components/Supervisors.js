import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaFilter, FaUserPlus, FaUserCheck, FaEye, FaUsers, FaFileExcel, FaExpand, FaCompress, FaTrash, FaUpload, FaDownload, FaTimes } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import './Supervisors.css';
import {
    fetchSupervisors,
    addSupervisor,
    updateSupervisor,
    deleteSupervisor,
    fetchAllAssignments,
    unassignScholar,
    getQualifiedScholarsByFacultyDept,
    assignScholarToSupervisor,
    fetchFacultiesAndDepartments,
    updateAdmittedCounts,
    addMultipleSupervisors,
    deleteAllSupervisors
} from '../../../../services/supervisorService';
// REMOVED: fetchDirectorAdminScholars import - not needed anymore
import { toast } from 'react-toastify';

const ALL_AVAILABLE_COLUMNS = [
    { key: 'sno', label: 'S.No', category: 'Basic Info' },
    { key: 'name', label: 'Name of the Supervisor', category: 'Basic Info' },
    { key: 'email', label: 'Email', category: 'Basic Info' },
    { key: 'phone', label: 'Phone', category: 'Basic Info' },
    { key: 'staff_id', label: 'Faculty ID', category: 'Professional Info' },
    { key: 'designation', label: 'Designation', category: 'Professional Info' },
    { key: 'faculty', label: 'Faculty', category: 'Professional Info' },
    { key: 'department', label: 'Department', category: 'Professional Info' },
    { key: 'specialization', label: 'Specialization', category: 'Professional Info' },
    { key: 'area_of_interest', label: 'Area of Research', category: 'Professional Info' },
    { key: 'maxStudents', label: 'Maximum Number of Students Allowed (N)', category: 'Capacity & Vacancy' },
    { key: 'currentlyGuiding', label: 'No. of Scholars Currently Guiding (C)', category: 'Capacity & Vacancy' },
    { key: 'availableVacancy', label: 'No. of Available Vacancy (N-C)', category: 'Capacity & Vacancy' },
    { key: 'phdCompleted', label: 'Number of PhD Students Completed (Degree Awarded)', category: 'Capacity & Vacancy' },
    { key: 'eligibleForSession', label: 'Is Eligible to Fill Vacancy (Yes/No)', category: 'Capacity & Vacancy' },
    { key: 'ineligibleReason', label: 'If Not Eligible, Reason', category: 'Capacity & Vacancy' },
    { key: 'admittedFullTime', label: 'Full Time - Admitted', category: 'Scholar Type Breakdown' },
    { key: 'vacancyFullTime', label: 'Full Time - Vacancy', category: 'Scholar Type Breakdown' },
    { key: 'admittedPartTimeInternal', label: 'Part Time Internal - Admitted', category: 'Scholar Type Breakdown' },
    { key: 'vacancyPartTimeInternal', label: 'Part Time Internal - Vacancy', category: 'Scholar Type Breakdown' },
    { key: 'admittedPartTimeExternal', label: 'Part Time External - Admitted', category: 'Scholar Type Breakdown' },
    { key: 'vacancyPartTimeExternal', label: 'Part Time External - Vacancy', category: 'Scholar Type Breakdown' },
    { key: 'admittedPartTimeIndustry', label: 'Part Time Industry - Admitted', category: 'Scholar Type Breakdown' },
    { key: 'vacancyPartTimeIndustry', label: 'Part Time Industry - Vacancy', category: 'Scholar Type Breakdown' },
];

// 1. Accept the `isSidebarClosed` prop here
const Supervisors = ({ isSidebarClosed, onModalStateChange }) => {
    // --- STATE MANAGEMENT ---
    const [searchTerm, setSearchTerm] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [modal, setModal] = useState({ type: null, data: null });
    const [loading, setLoading] = useState(true);

    // Download features
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState([]);

    // Track modal states and notify parent
    useEffect(() => {
        const hasModal = modal.type !== null || showDownloadModal;
        if (onModalStateChange) {
            onModalStateChange(hasModal);
        }
    }, [modal.type, showDownloadModal, onModalStateChange]);
    const [filterFaculty, setFilterFaculty] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [formData, setFormData] = useState({});
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef(null);

    // --- DATA FROM SUPABASE ---
    const [faculties, setFaculties] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    // REMOVED: scholars state - not needed, scholars are fetched on-demand for assignment
    const [assignments, setAssignments] = useState([]);

    // Scholar assignment state
    const [selectedScholar, setSelectedScholar] = useState(null);
    const [selectedScholarType, setSelectedScholarType] = useState('');
    const [isDepartmentSelected, setIsDepartmentSelected] = useState(false);

    // Derive the authoritative scholar type from the `program` field bracket notation.
    // The `program` field (e.g. "Ph.d.- Commerce [full Time - Science And Humanities]")
    // comes directly from the application form and is more reliable than `program_type`
    // or `type` columns which can be incorrectly populated.
    const deriveScholarType = (scholar) => {
        const programField = (scholar.program || '').toLowerCase();
        const bracketMatch = programField.match(/\[([^\]]+)\]/);
        const bracketContent = bracketMatch ? bracketMatch[1] : '';

        if (bracketContent.includes('part time external (industry)') || bracketContent.includes('pte(industry)')) {
            return 'Part Time Industry';
        }
        if (bracketContent.includes('part time external')) {
            return 'Part Time External';
        }
        if (bracketContent.includes('part time internal')) {
            return 'Part Time Internal';
        }
        if (bracketContent.includes('part time')) {
            // generic "part time" — use program_type to disambiguate
            const pt = (scholar.program_type || '').trim();
            if (pt === 'Part Time Internal' || pt === 'PTI') return 'Part Time Internal';
            if (pt === 'Part Time External' || pt === 'PTE') return 'Part Time External';
            if (pt === 'Part Time External (Industry)' || pt === 'PTE(Industry)' || pt === 'Part Time Industry') return 'Part Time Industry';
            return 'Part Time Internal';
        }
        if (bracketContent.includes('full time')) {
            return 'Full Time';
        }

        // No bracket info — use program_type strictly, no fallback to Full Time
        const pt = (scholar.program_type || '').trim();
        if (pt === 'Full Time' || pt === 'FT') return 'Full Time';
        if (pt === 'Part Time Internal' || pt === 'PTI') return 'Part Time Internal';
        if (pt === 'Part Time External' || pt === 'PTE') return 'Part Time External';
        if (pt === 'Part Time External (Industry)' || pt === 'PTE(Industry)' || pt === 'Part Time Industry') return 'Part Time Industry';

        return null; // unknown — excluded from all type filters
    };

    // Load data on component mount
    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        await Promise.all([
            loadFaculties(),
            loadSupervisors(),
            // REMOVED loadScholars() - not needed, scholars are fetched on-demand by faculty/dept
            loadAssignments()
        ]);
        setLoading(false);
    };

    const loadFaculties = async () => {
        const { data, error } = await fetchFacultiesAndDepartments();
        if (error) {
            console.error('Error loading faculties:', error);
            toast.error('Failed to load faculties');
        } else {
            setFaculties(data || []);
        }
    };

    const loadSupervisors = async () => {
        const { data, error } = await fetchSupervisors();
        if (error) {
            console.error('Error loading supervisors:', error);
            toast.error('Failed to load supervisors');
        } else {
            // Map Supabase data to UI format
            const mappedData = (data || []).map(sup => {
                // Calculate vacancies - always calculate from max and current
                const vacancyFullTime = Math.max(0, (sup.max_full_time_scholars || 0) - (sup.current_full_time_scholars || 0));
                const vacancyPartTimeInternal = Math.max(0, (sup.max_part_time_internal_scholars || 0) - (sup.current_part_time_internal_scholars || 0));
                const vacancyPartTimeExternal = Math.max(0, (sup.max_part_time_external_scholars || 0) - (sup.current_part_time_external_scholars || 0));
                const vacancyPartTimeIndustry = Math.max(0, (sup.max_part_time_industry_scholars || 0) - (sup.current_part_time_industry_scholars || 0));

                // Total across all types
                const totalMax = (sup.max_full_time_scholars || 0) + (sup.max_part_time_internal_scholars || 0) + (sup.max_part_time_external_scholars || 0) + (sup.max_part_time_industry_scholars || 0);
                const totalCurrent = (sup.current_full_time_scholars || 0) + (sup.current_part_time_internal_scholars || 0) + (sup.current_part_time_external_scholars || 0) + (sup.current_part_time_industry_scholars || 0);

                return {
                    id: sup.id,
                    name: sup.name,
                    email: sup.email,
                    phone: sup.phone,
                    employeeId: sup.employee_id,
                    facultyId: sup.faculty_id,
                    facultyName: sup.faculty_name,
                    departmentId: sup.department_id,
                    departmentName: sup.department_name,
                    specialization: sup.specialization,
                    areaOfInterest: sup.area_of_interest,
                    staff_id: sup.staff_id || '',
                    designation: sup.designation || '',
                    maxFullTimeScholars: sup.max_full_time_scholars || 0,
                    maxPartTimeInternalScholars: sup.max_part_time_internal_scholars || 0,
                    maxPartTimeExternalScholars: sup.max_part_time_external_scholars || 0,
                    maxPartTimeIndustryScholars: sup.max_part_time_industry_scholars || 0,
                    currentFullTimeScholars: sup.current_full_time_scholars || 0,
                    currentPartTimeInternalScholars: sup.current_part_time_internal_scholars || 0,
                    currentPartTimeExternalScholars: sup.current_part_time_external_scholars || 0,
                    currentPartTimeIndustryScholars: sup.current_part_time_industry_scholars || 0,
                    admittedFullTime: sup.admitted_full_time || 0,
                    admittedPartTimeInternal: sup.admitted_part_time_internal || 0,
                    admittedPartTimeExternal: sup.admitted_part_time_external || 0,
                    admittedPartTimeIndustry: sup.admitted_part_time_industry || 0,
                    vacancyFullTime: vacancyFullTime,
                    vacancyPartTimeInternal: vacancyPartTimeInternal,
                    vacancyPartTimeExternal: vacancyPartTimeExternal,
                    vacancyPartTimeIndustry: vacancyPartTimeIndustry,
                    // Aggregate totals for new columns
                    maxStudents: totalMax,
                    currentlyGuiding: totalCurrent,
                    availableVacancy: Math.max(0, totalMax - totalCurrent),
                    // New fields
                    phdCompleted: sup.phd_completed || 0,
                    eligibleForSession: sup.eligible_for_session ?? null,
                    ineligibleReason: sup.ineligible_reason || '',
                    isActive: sup.is_active,
                    status: sup.status,
                    createdAt: sup.created_at,
                    updatedAt: sup.updated_at
                };
            });
            console.log(`✅ Loaded ${mappedData.length} supervisors with vacancies`);
            setSupervisors(mappedData);
        }
    };

    // REMOVED: loadScholars() - This was fetching ALL scholars unnecessarily
    // Scholar fetching for assignment is now ONLY done by loadQualifiedScholarsBySelection()
    // which correctly filters by faculty, department, published status, and unassigned status

    const loadAssignments = async () => {
        const { data, error } = await fetchAllAssignments();
        if (error) {
            console.error('Error loading assignments:', error);
        } else {
            // Map assignment data from examination_records to UI format
            const mappedData = (data || []).map(assignment => ({
                id: assignment.id,
                scholarId: assignment.id, // examination_records id
                supervisorName: assignment.supervisor_name,
                mode: assignment.program_type,
                scholarName: assignment.registered_name || assignment.name,
                applicationNo: assignment.application_no,
                faculty: assignment.faculty,
                department: assignment.department,
                totalMarks: assignment.total_marks,
                supervisorStatus: assignment.supervisor_status
            }));
            setAssignments(mappedData);
        }
    };

    // Load qualified scholars based on faculty and department selection
    const loadQualifiedScholarsBySelection = async (facultyName, departmentName, scholarType = null) => {
        try {
            console.log('🔍 Loading qualified scholars for faculty:', facultyName, 'department:', departmentName, 'type:', scholarType);
            const { data, error } = await getQualifiedScholarsByFacultyDept(facultyName, departmentName, 50);

            if (error) {
                console.error('❌ Error loading qualified scholars:', error);
                toast.error(`Failed to load qualified scholars: ${error.message || 'Unknown error'}`);
                return;
            }

            console.log('✅ Qualified scholars loaded:', data);

            // Filter by type if specified
            let filteredData = data;
            if (scholarType && data) {
                filteredData = data.filter(scholar => {
                    const effectiveType = deriveScholarType(scholar);
                    console.log(`Scholar ${scholar.application_no}: program_type="${scholar.program_type}", derived="${effectiveType}"`);
                    return effectiveType === scholarType;
                });
                console.log(`🔍 Filtered to ${filteredData.length} scholars of type "${scholarType}"`);
                console.log('📋 Effective types:', filteredData.map(s => ({ app: s.application_no, derived: deriveScholarType(s) })));
            }

            // Populate the scholar dropdown
            setTimeout(() => {
                const scholarSelect = document.getElementById('scholarToAssign');
                if (scholarSelect) {
                    if (filteredData && filteredData.length > 0) {
                        scholarSelect.innerHTML = '<option value="">Select a qualified scholar...</option>';
                        filteredData.forEach(scholar => {
                            const option = document.createElement('option');
                            option.value = scholar.id;
                            option.textContent = `${scholar.registered_name || scholar.name} (${scholar.application_no}) - Score: ${scholar.total_marks}`;
                            option.dataset.scholarData = JSON.stringify(scholar);
                            scholarSelect.appendChild(option);
                        });
                        scholarSelect.disabled = false;
                        console.log(`✅ Populated dropdown with ${filteredData.length} scholars`);
                    } else {
                        scholarSelect.innerHTML = `<option value="">No ${scholarType || ''} scholars available</option>`;
                        scholarSelect.disabled = true;
                        console.log('⚠️ No qualified scholars found for the selected criteria');
                    }
                }
            }, 200);

        } catch (err) {
            console.error('💥 Exception loading qualified scholars:', err);
            toast.error('Failed to load qualified scholars');
        }
    };

    const handleUploadExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];

                // Read as raw array to handle any header row position
                const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

                if (rawRows.length < 2) {
                    toast.error("The uploaded Excel file is empty.");
                    setLoading(false);
                    return;
                }

                // Find the header row — first row containing 'name' and 'faculty' or 'designation'
                let headerRowIndex = 0;
                for (let i = 0; i < Math.min(5, rawRows.length); i++) {
                    const rowStr = rawRows[i].join('|').toLowerCase();
                    if (rowStr.includes('name') && (rowStr.includes('supervisor') || rowStr.includes('faculty') || rowStr.includes('designation'))) {
                        headerRowIndex = i;
                        break;
                    }
                }

                const headers = rawRows[headerRowIndex].map(h => h.toString().trim());
                const dataRows = rawRows.slice(headerRowIndex + 1).filter(row =>
                    row.some(cell => cell !== null && cell !== undefined && cell.toString().trim() !== '')
                );

                console.log('📋 Detected headers:', headers);
                console.log('📋 Data rows count:', dataRows.length);
                console.log('📋 Available faculties in DB:', faculties.map(f => f.name));

                // Helper to get cell value by partial header match
                const getVal = (row, ...keys) => {
                    for (const key of keys) {
                        let idx = headers.findIndex(h => h.toLowerCase() === key.toLowerCase());
                        if (idx === -1) idx = headers.findIndex(h => h.toLowerCase().includes(key.toLowerCase()));
                        if (idx !== -1 && row[idx] !== undefined && row[idx] !== '') {
                            return row[idx].toString().trim();
                        }
                    }
                    return '';
                };

                const getNum = (row, ...keys) => parseInt(getVal(row, ...keys)) || 0;

                const data = dataRows;
                const facultyColIdx = headers.findIndex(h => h.toLowerCase() === 'faculty');
                const deptColIdx = headers.findIndex(h => h.toLowerCase() === 'department');
                const normalizeName = (s) => s.toLowerCase().replace(/\band\b/g, '&').replace(/\s+/g, ' ').trim();

                // Map Excel data to Supervisor data
                const supervisorsToInsert = data.map((row, rowIndex) => {
                    const facultyNameRaw = (facultyColIdx !== -1 ? (row[facultyColIdx] || '') : '').toString().trim();
                    const deptNameRaw = (deptColIdx !== -1 ? (row[deptColIdx] || '') : '').toString().trim();

                    const matchedFaculty = faculties.find(f => normalizeName(f.name) === normalizeName(facultyNameRaw));
                    const matchedDept = matchedFaculty?.departments.find(d =>
                        normalizeName(d.name) === normalizeName(deptNameRaw) ||
                        normalizeName(d.name).includes(normalizeName(deptNameRaw)) ||
                        normalizeName(deptNameRaw).includes(normalizeName(d.name))
                    );

                    const facultyId = matchedFaculty ? matchedFaculty.id : facultyNameRaw.substring(0, 50);
                    const facultyName = matchedFaculty ? matchedFaculty.name : facultyNameRaw;
                    const deptId = matchedDept ? matchedDept.id : deptNameRaw.substring(0, 50);
                    const deptName = matchedDept ? matchedDept.name : deptNameRaw;

                    const supervisorName = getVal(row, 'name of the supervisor', 'name');
                    const emailRaw = getVal(row, 'email');
                    const safeName = supervisorName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || `sup${rowIndex}`;
                    const email = emailRaw || `${safeName}${rowIndex + 1}@placeholder.edu.in`;

                    const eligibleRaw = getVal(row, 'eligible', 'yes / no', 'yes/no');

                    // area_of_interest is text[] in DB — must be an array
                    const areaRaw = getVal(row, 'area of research', 'area of interest');
                    const areaArray = areaRaw
                        ? areaRaw.split(',').map(s => s.trim()).filter(Boolean)
                        : [];

                    // employee_id has unique constraint — set null if empty to avoid collisions
                    const employeeIdRaw = getVal(row, 'employee id', 'employee_id');
                    const employeeId = employeeIdRaw || null;

                    return {
                        name: supervisorName,
                        email: email,
                        phone: getVal(row, 'phone') || null,
                        employee_id: employeeId,
                        faculty_id: facultyId,
                        faculty_name: facultyName,
                        department_id: deptId,
                        department_name: deptName,
                        specialization: getVal(row, 'specialization') || 'N/A',
                        staff_id: getVal(row, 'faculty id', 'staff id', 'staff_id') || null,
                        designation: getVal(row, 'designation') || null,
                        area_of_interest: areaArray,
                        max_full_time_scholars: getNum(row, 'maximum number of students', 'max full time scholars', 'max full time'),
                        max_part_time_internal_scholars: getNum(row, 'max part time internal'),
                        max_part_time_external_scholars: getNum(row, 'max part time external'),
                        max_part_time_industry_scholars: getNum(row, 'max part time industry'),
                        phd_completed: getNum(row, 'phd students completed', 'phd completed', 'degree awarded', 'number of phd'),
                        eligible_for_session: eligibleRaw ? eligibleRaw.toUpperCase() === 'YES' : null,
                        ineligible_reason: getVal(row, 'if not eligible', 'ineligible reason', 'mention the reason') || null,
                        status: 'Approved',
                        is_active: true
                    };
                });

                // Only require name to be present
                const validSupervisors = supervisorsToInsert.filter(s => s.name && s.name.trim() !== '');

                if (validSupervisors.length === 0) {
                    toast.error("No valid supervisors found in Excel. Make sure the 'Name of the Supervisor' column has data.");
                    setLoading(false);
                    return;
                }

                const { data: result, error, skippedCount } = await addMultipleSupervisors(validSupervisors);

                if (error) {
                    console.error('Error adding multiple supervisors:', error);
                    toast.error(`Failed to upload supervisors: ${error.message}`);
                } else {
                    const newlyAdded = validSupervisors.length - (skippedCount || 0);
                    if (newlyAdded > 0) {
                        toast.success(`Successfully appended ${newlyAdded} new supervisors! Existing data preserved.`);
                    }
                    if (skippedCount > 0) {
                        toast.info(`${skippedCount} supervisors were skipped (email already exists in database).`);
                    }
                    if (newlyAdded === 0 && (!skippedCount || skippedCount === 0)) {
                        toast.info('No new supervisors were added.');
                    }
                    if (validSupervisors.length < dataRows.length) {
                        toast.warning(`${dataRows.length - validSupervisors.length} rows were skipped due to invalid data (e.g., mismatched Faculty/Department).`);
                    }
                    loadAllData(); // Refresh UI
                }
            } catch (error) {
                console.error('Error parsing Excel file:', error);
                toast.error('Failed to parse Excel file.');
            } finally {
                setLoading(false);
                // Reset file input
                e.target.value = null;
            }
        };
        reader.readAsBinaryString(file);
    };

    // --- DERIVED STATE & FILTERING LOGIC ---
    const filteredSupervisors = supervisors.filter(sup => {
        const faculty = faculties.find(f => f.id === sup.facultyId || f.name === sup.facultyName);
        const department = faculty?.departments.find(d => d.id === sup.departmentId || d.name === sup.departmentName);
        const searchString = `${sup.name} ${sup.email} ${sup.facultyName || faculty?.name} ${sup.departmentName || department?.name} ${sup.specialization}`.toLowerCase();

        const matchesSearch = searchString.includes(searchTerm.toLowerCase());
        const matchesFaculty = !filterFaculty || sup.facultyId === filterFaculty || sup.facultyName === filterFaculty;
        const matchesDepartment = !filterDepartment || sup.departmentId === filterDepartment || sup.departmentName === filterDepartment;

        return matchesSearch && matchesFaculty && matchesDepartment;
    });

    // --- ACTION HANDLERS ---
    const openModal = (type, data = {}) => {
        setModal({ type, data });
        if (type === 'add' || type === 'edit') {
            setFormData(data);
        }

        // For assign modal, don't auto-select - let user choose
        if (type === 'assign') {
            setTimeout(() => {
                const facultySelect = document.getElementById('assignedFaculty');
                const deptSelect = document.getElementById('assignedDepartment');
                const scholarSelect = document.getElementById('scholarToAssign');

                // Reset all selects to empty - user must choose
                if (facultySelect) {
                    facultySelect.value = '';
                    facultySelect.disabled = false; // Enable for user selection
                }

                if (deptSelect) {
                    deptSelect.value = '';
                    deptSelect.disabled = true; // Disabled until faculty is selected
                }

                if (scholarSelect) {
                    scholarSelect.innerHTML = '<option value="">First select faculty and department...</option>';
                    scholarSelect.disabled = true;
                }
            }, 100);
        }
    };
    const closeModal = () => setModal({ type: null, data: null });

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'facultyId') {
            setFormData(prev => ({ ...prev, departmentId: '' }));
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        try {
            if (modal.type === 'edit') {
                // Update existing supervisor
                const faculty = faculties.find(f => f.id === formData.facultyId);
                const department = faculty?.departments.find(d => d.id === formData.departmentId);

                const updates = {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    employee_id: formData.employeeId,
                    faculty_id: formData.facultyId,
                    faculty_name: faculty?.name,
                    department_id: formData.departmentId,
                    department_name: department?.name,
                    specialization: formData.specialization,
                    staff_id: formData.staff_id || '',
                    designation: formData.designation || '',
                    max_full_time_scholars: parseInt(formData.maxFullTimeScholars) || 0,
                    max_part_time_internal_scholars: parseInt(formData.maxPartTimeInternalScholars) || 0,
                    max_part_time_external_scholars: parseInt(formData.maxPartTimeExternalScholars) || 0,
                    max_part_time_industry_scholars: parseInt(formData.maxPartTimeIndustryScholars) || 0,
                    phd_completed: parseInt(formData.phdCompleted) || 0,
                    eligible_for_session: formData.eligibleForSession ?? null,
                    ineligible_reason: formData.ineligibleReason || null,
                    is_active: formData.isActive !== undefined ? formData.isActive : true
                };

                const { data, error } = await updateSupervisor(formData.id, updates);

                if (error) {
                    toast.error('Failed to update supervisor');
                    console.error('Update error:', error);
                } else {
                    toast.success('Supervisor updated successfully!');
                    await loadSupervisors();
                    closeModal();
                }
            } else {
                // Add new supervisor
                const faculty = faculties.find(f => f.id === formData.facultyId);
                const department = faculty?.departments.find(d => d.id === formData.departmentId);

                const newSupervisor = {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    employee_id: formData.employeeId,
                    faculty_id: formData.facultyId,
                    faculty_name: faculty?.name,
                    department_id: formData.departmentId,
                    department_name: department?.name,
                    specialization: formData.specialization,
                    staff_id: formData.staff_id || '',
                    designation: formData.designation || '',
                    area_of_interest: formData.areaOfInterest
                        ? (Array.isArray(formData.areaOfInterest)
                            ? formData.areaOfInterest
                            : formData.areaOfInterest.split(',').map(s => s.trim()).filter(Boolean))
                        : [],
                    max_full_time_scholars: parseInt(formData.maxFullTimeScholars) || 0,
                    max_part_time_internal_scholars: parseInt(formData.maxPartTimeInternalScholars) || 0,
                    max_part_time_external_scholars: parseInt(formData.maxPartTimeExternalScholars) || 0,
                    max_part_time_industry_scholars: parseInt(formData.maxPartTimeIndustryScholars) || 0,
                    phd_completed: parseInt(formData.phdCompleted) || 0,
                    eligible_for_session: formData.eligibleForSession ?? null,
                    ineligible_reason: formData.ineligibleReason || null,
                    is_active: true,
                    status: 'Active',
                    created_by: 'director'
                };

                const { data, error } = await addSupervisor(newSupervisor);

                if (error) {
                    toast.error('Failed to add supervisor');
                    console.error('Add error:', error);
                } else {
                    toast.success('Supervisor added successfully!');
                    await loadSupervisors();
                    // Update admitted counts after adding supervisor
                    await updateAdmittedCounts();
                    closeModal();
                }
            }
        } catch (err) {
            console.error('Form submission error:', err);
            toast.error('An error occurred');
        }
    };

    const handleFacultyChange = (facultyId) => {
        const deptSelect = document.getElementById('assignedDepartment');
        const scholarSelect = document.getElementById('scholarToAssign');
        const allOptions = deptSelect.querySelectorAll('option');

        // Reset department and scholar selections
        deptSelect.value = '';
        scholarSelect.value = '';
        scholarSelect.disabled = true;
        scholarSelect.innerHTML = '<option value="">First select department...</option>';

        // Hide all department options first
        allOptions.forEach(option => {
            if (option.value === '') return; // Keep the default option
            option.style.display = 'none';
        });

        // Show departments for selected faculty
        if (facultyId) {
            const selectedFaculty = faculties.find(f => f.id === facultyId);
            if (selectedFaculty) {
                selectedFaculty.departments.forEach(dept => {
                    const option = deptSelect.querySelector(`option[value="${dept.id}"]`);
                    if (option) option.style.display = 'block';
                });
            }
            deptSelect.disabled = false;
        } else {
            deptSelect.disabled = true;
        }
    };

    const handleDepartmentChange = async (departmentId) => {
        const facultyId = document.getElementById('assignedFaculty').value;

        console.log('🔍 handleDepartmentChange called:', { facultyId, departmentId });

        // Reset scholar selection and type
        setSelectedScholar(null);
        setSelectedScholarType('');

        if (facultyId && departmentId) {
            setIsDepartmentSelected(true);

            // Find the selected faculty and department
            const selectedFaculty = faculties.find(f => f.id === facultyId);
            console.log('📋 Selected Faculty:', selectedFaculty);

            const selectedDepartment = selectedFaculty?.departments.find(d => d.id === departmentId);
            console.log('📋 Selected Department:', selectedDepartment);

            if (!selectedFaculty || !selectedDepartment) {
                console.error('❌ Could not find faculty or department');
                setIsDepartmentSelected(false);
            }
        } else {
            setIsDepartmentSelected(false);
        }
    };

    const handleTypeChange = async (type) => {
        setSelectedScholarType(type);
        setSelectedScholar(null);

        const scholarSelect = document.getElementById('scholarToAssign');
        const facultyId = document.getElementById('assignedFaculty').value;
        const departmentId = document.getElementById('assignedDepartment').value;

        if (!type) {
            scholarSelect.innerHTML = '<option value="">First select scholar type...</option>';
            scholarSelect.disabled = true;
            return;
        }

        if (facultyId && departmentId) {
            const selectedFaculty = faculties.find(f => f.id === facultyId);
            const selectedDepartment = selectedFaculty?.departments.find(d => d.id === departmentId);

            if (selectedFaculty && selectedDepartment) {
                // Show loading state
                scholarSelect.innerHTML = '<option value="">Loading scholars...</option>';
                scholarSelect.disabled = true;

                console.log('🚀 Loading scholars filtered by type:', type);

                // Load scholars based on faculty, department, AND type
                await loadQualifiedScholarsBySelection(selectedFaculty.name, selectedDepartment.name, type);
            }
        }
    };

    const handleScholarChange = (scholarId) => {
        const scholarSelect = document.getElementById('scholarToAssign');
        const selectedOption = scholarSelect.options[scholarSelect.selectedIndex];

        if (scholarId && selectedOption && selectedOption.dataset.scholarData) {
            const scholarData = JSON.parse(selectedOption.dataset.scholarData);
            setSelectedScholar(scholarData);
        } else {
            setSelectedScholar(null);
        }
    };

    const handleAssignScholar = async () => {
        const scholarSelect = document.getElementById('scholarToAssign');
        const scholarId = scholarSelect.value;

        if (!scholarId) {
            alert('Please select a scholar to assign');
            return;
        }

        if (!selectedScholarType) {
            alert('Please select the scholar type (Full Time, Part Time Internal, etc.)');
            return;
        }

        // Get scholar data from the selected option
        const selectedOption = scholarSelect.options[scholarSelect.selectedIndex];
        const scholarData = JSON.parse(selectedOption.dataset.scholarData || '{}');

        console.log('📋 Scholar data from dropdown:', scholarData);
        console.log('📋 Selected type:', selectedScholarType);

        if (!scholarData.id && !scholarId) {
            alert('Scholar data not found. Please try again.');
            return;
        }

        // Check if supervisor has total available vacancy
        const supervisor = modal.data;
        const hasVacancy = (supervisor.availableVacancy || 0) > 0;

        if (!hasVacancy) {
            alert(`No available vacancy for this supervisor. Currently guiding ${supervisor.currentlyGuiding} of ${supervisor.maxStudents} scholars.`);
            return;
        }

        try {
            // Prepare assignment data
            const assignmentData = {
                supervisor_id: modal.data.id,
                scholar_id: scholarData.id || scholarId,
                scholar_type: selectedScholarType
            };

            console.log('💾 Assigning scholar to supervisor:', assignmentData);

            const { data, error } = await assignScholarToSupervisor(assignmentData);

            if (error) {
                toast.error(`Failed to assign scholar: ${error.message || 'Unknown error'}`);
                console.error('Assignment error:', error);
                return;
            }

            console.log('✅ Assignment saved:', data);
            toast.success(`Scholar ${scholarData.registered_name || scholarData.name} assigned as ${selectedScholarType}!`);

            setSelectedScholar(null);
            setSelectedScholarType('');

            await loadAssignments();
            await loadSupervisors();

            closeModal();

        } catch (err) {
            console.error('💥 Exception assigning scholar:', err);
            toast.error('Failed to assign scholar');
        }
    };

    const handleUnassign = async (assignmentId) => {
        if (window.confirm('Are you sure you want to unassign this scholar?')) {
            const { data, error } = await unassignScholar(assignmentId);

            if (error) {
                toast.error('Failed to unassign scholar');
                console.error('Unassign error:', error);
            } else {
                toast.success('Scholar unassigned successfully!');
                await loadAssignments();
                await loadSupervisors(); // Reload to update current counts
            }
        }
    };

    const handleDeleteSupervisor = async (supervisorId) => {
        if (window.confirm('Are you sure you want to delete this supervisor? This will also remove all their scholar assignments.')) {
            const { data, error } = await deleteSupervisor(supervisorId);

            if (error) {
                toast.error('Failed to delete supervisor');
                console.error('Delete error:', error);
            } else {
                toast.success('Supervisor deleted successfully!');
                await loadSupervisors();
                await loadAssignments();
            }
        }
    };

    const generateSupervisorReport = () => {
        const dataForReport = supervisors.map(supervisor => {
            const faculty = faculties.find(f => f.id === supervisor.facultyId);
            const department = faculty?.departments.find(d => d.id === supervisor.departmentId);
            const supervisorAssignments = assignments.filter(a => a.supervisorName === supervisor.name);
            const assignedScholarsList = supervisorAssignments.map(a => {
                // Assignment already contains all scholar data from examination_records
                const assignmentInfo = a.faculty && a.department
                    ? ` (${a.faculty} - ${a.department})`
                    : '';
                return `${a.applicationNo} - ${a.scholarName}${assignmentInfo}`;
            }).join('\n');
            const assignedFT = supervisorAssignments.filter(a => a.mode === 'Full Time').length;
            const assignedPT = supervisorAssignments.filter(a => a.mode === 'Part Time').length;

            return {
                'Supervisor Name': supervisor.name, 'Email': supervisor.email, 'Faculty': faculty?.name || 'N/A',
                'Department': department?.name || 'N/A', 'Specialization': supervisor.specialization,
                'Assigned Scholars': assignedScholarsList || 'No scholars assigned',
                'Full Time Slots': `${assignedFT}/${supervisor.maxFullTimeScholars}`, 'Part Time Slots': `${assignedPT}/${supervisor.maxPartTimeScholars}`,
                'Status': supervisor.isActive ? 'Active' : 'Inactive', 'Total Assigned': supervisorAssignments.length, 'Last Updated': new Date().toLocaleDateString(),
            };
        });
        const ws = XLSX.utils.json_to_sheet(dataForReport);
        ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 35 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 },];
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            const cell_address = { c: 5, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            if (ws[cell_ref]) { ws[cell_ref].s = { alignment: { wrapText: true, vertical: 'top' } }; }
        }
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Supervisor Assignments");
        XLSX.writeFile(wb, `Supervisor_Assignments_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleDownloadExcel = () => {
        setSelectedColumns(ALL_AVAILABLE_COLUMNS.map(col => col.key)); // Select all by default
        setShowDownloadModal(true);
    };

    const toggleColumnSelection = (key) => {
        setSelectedColumns(prev =>
            prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
        );
    };

    const selectAllColumns = () => setSelectedColumns(ALL_AVAILABLE_COLUMNS.map(col => col.key));
    const deselectAllColumns = () => setSelectedColumns([]);

    const confirmDownloadExcel = () => {
        if (supervisors.length === 0) {
            toast.info("No supervisors data available to download.");
            setShowDownloadModal(false);
            return;
        }

        const dataForDownload = filteredSupervisors.map((supervisor, index) => {
            const faculty = faculties.find(f => f.id === supervisor.facultyId);
            const department = faculty?.departments.find(d => d.id === supervisor.departmentId);

            const rowData = {};
            selectedColumns.forEach(key => {
                switch (key) {
                    case 'sno': rowData['S.No'] = index + 1; break;
                    case 'name': rowData['Name of the Supervisor'] = supervisor.name || ''; break;
                    case 'email': rowData['Email'] = supervisor.email || ''; break;
                    case 'phone': rowData['Phone'] = supervisor.phone || ''; break;
                    case 'staff_id': rowData['Faculty ID'] = supervisor.staff_id || ''; break;
                    case 'designation': rowData['Designation'] = supervisor.designation || ''; break;
                    case 'faculty': rowData['Faculty'] = faculty?.name || supervisor.facultyName || ''; break;
                    case 'department': rowData['Department'] = department?.name || supervisor.departmentName || ''; break;
                    case 'specialization': rowData['Specialization'] = supervisor.specialization || ''; break;
                    case 'area_of_interest': rowData['Area of Research'] = supervisor.areaOfInterest ? (Array.isArray(supervisor.areaOfInterest) ? supervisor.areaOfInterest.join(', ') : supervisor.areaOfInterest) : ''; break;
                    case 'maxStudents': rowData['Maximum Number of Students Allowed (N)'] = supervisor.maxStudents || 0; break;
                    case 'currentlyGuiding': rowData['No. of Scholars Currently Guiding (C)'] = supervisor.currentlyGuiding || 0; break;
                    case 'availableVacancy': rowData['No. of Available Vacancy (N-C)'] = supervisor.availableVacancy || 0; break;
                    case 'phdCompleted': rowData['Number of PhD Students Completed (Degree Awarded)'] = supervisor.phdCompleted || 0; break;
                    case 'eligibleForSession': rowData['Is Eligible to Fill Vacancy (Yes/No)'] = supervisor.eligibleForSession === true ? 'YES' : supervisor.eligibleForSession === false ? 'NO' : 'N/A'; break;
                    case 'ineligibleReason': rowData['If Not Eligible, Reason'] = supervisor.ineligibleReason || 'NA'; break;
                    case 'admittedFullTime': rowData['Full Time - Admitted'] = supervisor.admittedFullTime || supervisor.currentFullTimeScholars || 0; break;
                    case 'vacancyFullTime': rowData['Full Time - Vacancy'] = supervisor.vacancyFullTime || 0; break;
                    case 'admittedPartTimeInternal': rowData['Part Time Internal - Admitted'] = supervisor.admittedPartTimeInternal || supervisor.currentPartTimeInternalScholars || 0; break;
                    case 'vacancyPartTimeInternal': rowData['Part Time Internal - Vacancy'] = supervisor.vacancyPartTimeInternal || 0; break;
                    case 'admittedPartTimeExternal': rowData['Part Time External - Admitted'] = supervisor.admittedPartTimeExternal || supervisor.currentPartTimeExternalScholars || 0; break;
                    case 'vacancyPartTimeExternal': rowData['Part Time External - Vacancy'] = supervisor.vacancyPartTimeExternal || 0; break;
                    case 'admittedPartTimeIndustry': rowData['Part Time Industry - Admitted'] = supervisor.admittedPartTimeIndustry || supervisor.currentPartTimeIndustryScholars || 0; break;
                    case 'vacancyPartTimeIndustry': rowData['Part Time Industry - Vacancy'] = supervisor.vacancyPartTimeIndustry || 0; break;
                    default: break;
                }
            });
            return rowData;
        });

        const ws = XLSX.utils.json_to_sheet(dataForDownload);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Supervisors Data");
        XLSX.writeFile(wb, `Supervisors_Data_${new Date().toISOString().split('T')[0]}.xlsx`);

        setShowDownloadModal(false);
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => console.error(err));
        } else { document.exitFullscreen(); }
    };

    const handleDeleteAll = async () => {
        const confirmMsg = `Are you sure you want to delete ALL ${supervisors.length} supervisors? This action cannot be undone!`;
        if (!window.confirm(confirmMsg)) return;

        const doubleConfirm = window.confirm('This will permanently remove all supervisor data. Are you absolutely sure?');
        if (!doubleConfirm) return;

        setLoading(true);
        const { error } = await deleteAllSupervisors();
        if (error) {
            toast.error(`Failed to delete supervisors: ${error.message}`);
        } else {
            toast.success('All supervisors deleted successfully!');
            loadAllData();
        }
        setLoading(false);
    };

    useEffect(() => {
        const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleChange);
        return () => document.removeEventListener('fullscreenchange', handleChange);
    }, []);

    // Calculate statistics for tiles using Supabase data
    const totalFullTimeVacancy = supervisors.reduce((sum, sup) => {
        return sum + (sup.vacancyFullTime || 0);
    }, 0);

    const totalFullTimeAdmitted = supervisors.reduce((sum, sup) => {
        return sum + (sup.currentFullTimeScholars || 0);
    }, 0);

    // Combined Part Time calculations (Internal + External + Industry)
    const totalPartTimeVacancy = supervisors.reduce((sum, sup) => {
        return sum + (sup.vacancyPartTimeInternal || 0) + (sup.vacancyPartTimeExternal || 0) + (sup.vacancyPartTimeIndustry || 0);
    }, 0);

    const totalPartTimeAdmitted = supervisors.reduce((sum, sup) => {
        return sum + (sup.currentPartTimeInternalScholars || 0) + (sup.currentPartTimeExternalScholars || 0) + (sup.currentPartTimeIndustryScholars || 0);
    }, 0);

    // --- RENDER ---
    if (loading) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading supervisors...</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`h-full w-full flex flex-col bg-transparent relative transition-all duration-300 ${isFullscreen ? 'fullscreen-mode p-4' : 'p-0'}`}>
            <button onClick={toggleFullscreen} className="absolute top-10 right-4 z-20 bg-white-600 hover:bg-gray-200 p-2 rounded-full text-gray" title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}>
                {isFullscreen ? <FaCompress /> : <FaExpand />}
            </button>

            <div className="flex-shrink-0">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-3xl font-bold text-black">Supervisors</h2>
                </div>

                {/* Statistics Tiles */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">Full Time Vacancy</p>
                                <p className="text-2xl font-bold text-blue-600">{totalFullTimeVacancy}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">Full Time Admitted</p>
                                <p className="text-2xl font-bold text-green-600">{totalFullTimeAdmitted}</p>
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
                                <p className="text-sm font-medium text-gray-600">Part Time Vacancy</p>
                                <p className="text-2xl font-bold text-orange-600">{totalPartTimeVacancy}</p>
                            </div>
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">Part Time Admitted</p>
                                <p className="text-2xl font-bold text-purple-600">{totalPartTimeAdmitted}</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Top row - Action buttons and fullscreen */}
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <button onClick={() => openModal('add')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2">
                            <FaUserPlus /> Add Supervisor
                        </button>
                        <label className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2 cursor-pointer transition-colors duration-200 shadow-md">
                            <FaUpload /> Upload Excel
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleUploadExcel}
                                className="hidden"
                            />
                        </label>
                        <button onClick={handleDownloadExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2">
                            <FaDownload /> Download Data
                        </button>
                        <button onClick={generateSupervisorReport} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2">
                            <FaFileExcel /> Generate Report
                        </button>
                        <button onClick={handleDeleteAll} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2">
                            <FaTrash /> Delete All
                        </button>
                    </div>
                </div>

                {/* Bottom row - Search and filter */}
                <div className="flex justify-between items-center mb-2">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search Supervisors..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-80"
                        />
                        <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div className="relative">
                        <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="bg-transparent border border-white/20 p-2.5 rounded-lg hover:bg-white/10 text-white hover:border-white/40" title="Filters">
                            <FaFilter className="w-4 h-4" />
                        </button>
                        {isFilterOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-slate-800 rounded-md shadow-lg z-20 p-4 border border-slate-700 text-white">
                                <h3 className="font-bold mb-2 text-sm">Filter By</h3>
                                <div className="space-y-2">
                                    <select value={filterFaculty} onChange={(e) => { setFilterFaculty(e.target.value); setFilterDepartment(''); }} className="w-full p-2 border rounded text-sm bg-slate-700 border-slate-600">
                                        <option value="">All Faculties</option>
                                        {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                    <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="w-full p-2 border rounded text-sm bg-slate-700 border-slate-600" disabled={!filterFaculty}>
                                        <option value="">All Departments</option>
                                        {filterFaculty && faculties.find(f => f.id === filterFaculty)?.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 min-h-0 min-w-0 p-2">
                {/* Inner scrollable container for horizontal + vertical scroll */}
                <div className={`flex-1 overflow-auto p-1 ${isFullscreen ? 'max-w-full' : (isSidebarClosed ? 'max-w-[92.5vw]' : 'max-w-[79.5vw]')}`}>
                    <div className="max-h-[70vh] overflow-y-auto relative">
                        <table className="supervisors-table min-w-full divide-y divide-gray-200">
                            <thead className="sticky top-0 bg-white z-10">
                                <style>{`
                                .supervisors-table thead {
                                    position: sticky;
                                    top: 0;
                                    z-index: 10;
                                    background: rgb(249 250 251);
                                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
                                }
                                .supervisors-table thead th {
                                    background: rgb(249 250 251) !important;
                                    position: sticky;
                                    top: 0;
                                    z-index: 11;
                                }
                            `}</style>
                                <tr>
                                    <th rowSpan="2" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 align-bottom">S.No.</th>
                                    <th rowSpan="2" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 align-bottom">Name</th>
                                    <th rowSpan="2" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 align-bottom">Faculty ID</th>
                                    <th rowSpan="2" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 align-bottom">Designation</th>
                                    <th rowSpan="2" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 align-bottom">Faculty</th>
                                    <th rowSpan="2" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 align-bottom">Department</th>
                                    <th rowSpan="2" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 align-bottom min-w-[220px]">Area of Research</th>
                                    <th rowSpan="2" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 align-bottom">Max Students</th>
                                    <th rowSpan="2" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 align-bottom">Currently Guiding</th>
                                    <th rowSpan="2" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 align-bottom">Available Vacancy</th>
                                    <th rowSpan="2" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 align-bottom">PhD Completed</th>
                                    <th rowSpan="2" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 align-bottom">Actions</th>
                                </tr>
                                <tr></tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredSupervisors.map((sup, index) => {
                                    const faculty = faculties.find(f => f.id === sup.facultyId);
                                    const department = faculty?.departments.find(d => d.id === sup.departmentId);

                                    return (
                                        <tr key={sup.id} className="hover:bg-gray-50 transition-colors duration-200">
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900">{index + 1}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{sup.name}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{sup.staff_id || 'N/A'}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{sup.designation || 'N/A'}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{faculty?.name || sup.facultyName || 'N/A'}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{department?.name || sup.departmentName || 'N/A'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 min-w-[220px]">{sup.areaOfInterest ? (Array.isArray(sup.areaOfInterest) ? sup.areaOfInterest.join(', ') : sup.areaOfInterest) : 'N/A'}</td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap text-sm text-gray-900">{sup.maxStudents}</td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap text-sm text-gray-900">{sup.currentlyGuiding}</td>
                                            <td className={`px-4 py-3 text-center whitespace-nowrap text-sm font-bold ${sup.availableVacancy > 0 ? 'text-green-600' : 'text-red-600'}`}>{sup.availableVacancy}</td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap text-sm text-gray-900">{sup.phdCompleted}</td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="supervisors-actions">
                                                    <button
                                                        onClick={() => openModal('view', sup)}
                                                        className="supervisors-action-btn view"
                                                        title="View Details"
                                                    >
                                                        <FaEye />
                                                    </button>

                                                    <button
                                                        onClick={() => openModal('edit', sup)}
                                                        className="supervisors-action-btn edit"
                                                        title="Edit Supervisor"
                                                    >
                                                        <svg fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                                        </svg>
                                                    </button>

                                                    <button
                                                        onClick={() => openModal('assign', sup)}
                                                        className="supervisors-action-btn assign"
                                                        title="Assign Scholar"
                                                    >
                                                        <FaUserCheck />
                                                    </button>

                                                    <button
                                                        onClick={() => handleDeleteSupervisor(sup.id)}
                                                        className="supervisors-action-btn delete"
                                                        title="Delete Supervisor"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- MODALS --- */}
            {modal.type && (
                <div className="modal-overlay flex">
                    <div className="modal-content text-black">
                        <button className="absolute top-4 right-4 text-3xl font-bold text-gray-500 hover:text-gray-800" onClick={closeModal}>&times;</button>

                        {(modal.type === 'add' || modal.type === 'edit') && <>
                            <h3 className="text-2xl font-bold mb-4">{modal.type === 'edit' ? 'Edit Supervisor' : 'Add Supervisor'}</h3>
                            <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                <div><label className="block text-sm font-bold mb-2">Name of the Supervisor</label><input type="text" name="name" value={formData.name || ''} onChange={handleFormChange} required /></div>
                                <div><label className="block text-sm font-bold mb-2">Email</label><input type="email" name="email" value={formData.email || ''} onChange={handleFormChange} required /></div>
                                <div><label className="block text-sm font-bold mb-2">Faculty</label><select name="facultyId" value={formData.facultyId || ''} onChange={handleFormChange} required><option value="">Select Faculty</option>{faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
                                <div><label className="block text-sm font-bold mb-2">Department</label><select name="departmentId" value={formData.departmentId || ''} onChange={handleFormChange} disabled={!formData.facultyId} required><option value="">Select Department</option>{formData.facultyId && faculties.find(f => f.id === formData.facultyId)?.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                                <div className="md:col-span-2"><label className="block text-sm font-bold mb-2">Area of Research</label><input type="text" name="areaOfInterest" value={formData.areaOfInterest ? (Array.isArray(formData.areaOfInterest) ? formData.areaOfInterest.join(', ') : formData.areaOfInterest) : ''} onChange={handleFormChange} placeholder="e.g. Machine Learning, Data Mining" /></div>
                                <div><label className="block text-sm font-bold mb-2">Faculty ID</label><input type="text" name="staff_id" value={formData.staff_id || ''} onChange={handleFormChange} placeholder="Enter Faculty ID" /></div>
                                <div><label className="block text-sm font-bold mb-2">Designation</label><input type="text" name="designation" value={formData.designation || ''} onChange={handleFormChange} placeholder="Enter designation" /></div>

                                {/* Vacancy Slots Section */}
                                <div className="md:col-span-2 mt-4 mb-2">
                                    <h4 className="text-lg font-bold text-gray-700 border-b pb-2">Maximum Scholar Slots</h4>
                                </div>

                                <div><label className="block text-sm font-bold mb-2">Max Full Time Scholars</label><input type="number" name="maxFullTimeScholars" value={formData.maxFullTimeScholars || ''} onChange={handleFormChange} min="0" required className="w-full p-2 border rounded" /></div>
                                <div><label className="block text-sm font-bold mb-2">Max Part Time Internal</label><input type="number" name="maxPartTimeInternalScholars" value={formData.maxPartTimeInternalScholars || ''} onChange={handleFormChange} min="0" required className="w-full p-2 border rounded" /></div>
                                <div><label className="block text-sm font-bold mb-2">Max Part Time External</label><input type="number" name="maxPartTimeExternalScholars" value={formData.maxPartTimeExternalScholars || ''} onChange={handleFormChange} min="0" required className="w-full p-2 border rounded" /></div>
                                <div><label className="block text-sm font-bold mb-2">Max Part Time Industry</label><input type="number" name="maxPartTimeIndustryScholars" value={formData.maxPartTimeIndustryScholars || ''} onChange={handleFormChange} min="0" required className="w-full p-2 border rounded" /></div>

                                {/* New fields */}
                                <div className="md:col-span-2 mt-4 mb-2">
                                    <h4 className="text-lg font-bold text-gray-700 border-b pb-2">Session Eligibility</h4>
                                </div>
                                <div><label className="block text-sm font-bold mb-2">Number of PhD Students Completed (Degree Awarded)</label><input type="number" name="phdCompleted" value={formData.phdCompleted || ''} onChange={handleFormChange} min="0" className="w-full p-2 border rounded" /></div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">Is Eligible to Fill Vacancy (Yes/No)</label>
                                    <select name="eligibleForSession" value={formData.eligibleForSession === true ? 'yes' : formData.eligibleForSession === false ? 'no' : ''} onChange={(e) => setFormData(prev => ({ ...prev, eligibleForSession: e.target.value === 'yes' ? true : e.target.value === 'no' ? false : null }))} className="w-full p-2 border rounded">
                                        <option value="">Select...</option>
                                        <option value="yes">YES</option>
                                        <option value="no">NO</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2"><label className="block text-sm font-bold mb-2">If Not Eligible, Mention the Reason</label><input type="text" name="ineligibleReason" value={formData.ineligibleReason || ''} onChange={handleFormChange} placeholder="e.g. There is no vacancy available" /></div>

                                <div className="md:col-span-2 flex justify-end gap-3 mt-4"><button type="button" onClick={closeModal} className="btn bg-black text-gray-800 hover:bg-black text-white">Cancel</button><button type="submit" className="btn bg-blue-600 text-white hover:bg-blue-700">Save</button></div>
                            </form>
                        </>}

                        {/* --- VIEW MODAL MODIFIED --- */}
                        {modal.type === 'view' && <>
                            <h3 className="text-2xl font-bold mb-6">Supervisor Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-left">
                                {[
                                    { label: "Name of the Supervisor", value: modal.data.name },
                                    { label: "Email", value: modal.data.email },
                                    { label: "Faculty", value: faculties.find(f => f.id === modal.data.facultyId)?.name || modal.data.facultyName },
                                    { label: "Department", value: faculties.flatMap(f => f.departments).find(d => d.id === modal.data.departmentId)?.name || modal.data.departmentName },
                                    { label: "Area of Research", value: modal.data.areaOfInterest ? (Array.isArray(modal.data.areaOfInterest) ? modal.data.areaOfInterest.join(', ') : modal.data.areaOfInterest) : 'N/A', colSpan: true },
                                    { label: "Faculty ID", value: modal.data.staff_id },
                                    { label: "Designation", value: modal.data.designation },
                                ].map(({ label, value, colSpan }) => (
                                    <div key={label} className={`border-b border-gray-200 pb-2 ${colSpan ? 'md:col-span-2' : ''}`}>
                                        <p className="text-sm font-medium text-gray-500">{label}</p>
                                        <p className="mt-1 text-base text-gray-900 font-semibold">{value ?? 'N/A'}</p>
                                    </div>
                                ))}

                                {/* Maximum Slots Section */}
                                <div className="md:col-span-2 mt-4 mb-2">
                                    <h4 className="text-lg font-bold text-gray-700 border-b pb-2">Maximum Scholar Slots</h4>
                                </div>
                                {[
                                    { label: "Max Full Time Scholars", value: modal.data.maxFullTimeScholars },
                                    { label: "Max Part Time Internal", value: modal.data.maxPartTimeInternalScholars },
                                    { label: "Max Part Time External", value: modal.data.maxPartTimeExternalScholars },
                                    { label: "Max Part Time Industry", value: modal.data.maxPartTimeIndustryScholars },
                                    { label: "PhD Students Completed (Degree Awarded)", value: modal.data.phdCompleted },
                                    { label: "Eligible to Fill Vacancy", value: modal.data.eligibleForSession === true ? 'YES' : modal.data.eligibleForSession === false ? 'NO' : 'N/A' },
                                    { label: "If Not Eligible, Reason", value: modal.data.ineligibleReason || 'NA', colSpan: true },
                                ].map(({ label, value, colSpan }) => (
                                    <div key={label} className={`border-b border-gray-200 pb-2 ${colSpan ? 'md:col-span-2' : ''}`}>
                                        <p className="text-sm font-medium text-gray-500">{label}</p>
                                        <p className="mt-1 text-base text-gray-900 font-semibold">{value ?? 0}</p>
                                    </div>
                                ))}

                                {/* Current Assignments Section */}
                                <div className="md:col-span-2 mt-4 mb-2">
                                    <h4 className="text-lg font-bold text-gray-700 border-b pb-2">Current Assignments</h4>
                                </div>
                                {[
                                    { label: "Assigned Full Time", value: assignments.filter(a => a.supervisorName === modal.data.name && a.mode === 'Full Time').length },
                                    { label: "Assigned Part Time Internal", value: assignments.filter(a => a.supervisorName === modal.data.name && a.mode === 'Part Time Internal').length },
                                    { label: "Assigned Part Time External", value: assignments.filter(a => a.supervisorName === modal.data.name && a.mode === 'Part Time External').length },
                                    { label: "Assigned Part Time Industry", value: assignments.filter(a => a.supervisorName === modal.data.name && a.mode === 'Part Time Industry').length },
                                    { label: "Total Assigned", value: assignments.filter(a => a.supervisorName === modal.data.name).length, bold: true },
                                ].map(({ label, value, bold }) => (
                                    <div key={label} className="border-b border-gray-200 pb-2">
                                        <p className="text-sm font-medium text-gray-500">{label}</p>
                                        <p className={`mt-1 text-base text-gray-900 ${bold ? 'font-bold' : 'font-semibold'}`}>{value ?? 'N/A'}</p>
                                    </div>
                                ))}
                            </div>
                        </>}

                        {modal.type === 'assign' && <>
                            <h3 className="text-2xl font-bold mb-4">Assign Scholar to {modal.data.name}</h3>
                            <div className="bg-gray-100 p-3 rounded-lg mb-4 text-left">
                                <h4 className="font-bold text-gray-800">Supervisor: {modal.data.name}</h4>
                                <p className="text-sm text-gray-600">{modal.data.email}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                    <strong>Faculty:</strong> {modal.data.facultyName} | <strong>Department:</strong> {modal.data.departmentName}
                                </p>
                            </div>

                            <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4 text-left">
                                <p className="text-sm text-blue-800">
                                    <strong>ℹ️ Select Faculty & Department:</strong> Choose the faculty and department to view available scholars.
                                    Only <strong>non-absent scholars</strong> (excluding those marked as Absent) from the selected department will be shown.
                                </p>
                            </div>

                            <div className="assignment-form-grid text-left">
                                <div className="assignment-form-field">
                                    <label className="assignment-form-label">Faculty *</label>
                                    <select
                                        id="assignedFaculty"
                                        className="assignment-form-select"
                                        required
                                        onChange={(e) => handleFacultyChange(e.target.value)}
                                    >
                                        <option value="">Select Faculty</option>
                                        {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                </div>

                                <div className="assignment-form-field">
                                    <label className="assignment-form-label">Department *</label>
                                    <select
                                        id="assignedDepartment"
                                        className="assignment-form-select"
                                        required
                                        disabled
                                        onChange={(e) => handleDepartmentChange(e.target.value)}
                                    >
                                        <option value="">Select Department</option>
                                        {faculties.map(f =>
                                            f.departments.map(d =>
                                                <option key={d.id} value={d.id} data-faculty={f.id}>{d.name}</option>
                                            )
                                        )}
                                    </select>
                                </div>

                                {/* Scholar Type Selection - Step 3 */}
                                <div className="assignment-form-field md:col-span-2">
                                    <label className="assignment-form-label">Select Scholar Type *</label>
                                    <select
                                        className="assignment-form-select"
                                        value={selectedScholarType}
                                        onChange={(e) => handleTypeChange(e.target.value)}
                                        required
                                        disabled={!isDepartmentSelected}
                                    >
                                        <option value="">Choose the type of scholar...</option>
                                        <option value="Full Time">Full Time</option>
                                        <option value="Part Time Internal">Part Time Internal</option>
                                        <option value="Part Time External">Part Time External</option>
                                        <option value="Part Time Industry">Part Time Industry</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Select type first - only scholars of this type will be shown
                                    </p>
                                </div>

                                <div className="assignment-form-field md:col-span-2">
                                    <label className="assignment-form-label">Select Scholar *</label>
                                    <select
                                        id="scholarToAssign"
                                        className="assignment-form-select"
                                        required
                                        disabled
                                        onChange={(e) => handleScholarChange(e.target.value)}
                                    >
                                        <option value="">First select scholar type...</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Showing only {selectedScholarType || ''} scholars who are not yet assigned
                                    </p>
                                </div>

                                {/* Scholar Details Table - Only show when scholar is selected */}
                                {selectedScholar && (
                                    <div className="assignment-form-field md:col-span-2 bg-white">
                                        <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                                            <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2 text-sm">📋</span>
                                            Scholar Details
                                        </h4>
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse border border-gray-300">
                                                <tbody>
                                                    <tr className="bg-gray-50">
                                                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">Name</td>
                                                        <td className="border border-gray-300 px-4 py-2">{selectedScholar.registered_name || selectedScholar.name}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">Application No</td>
                                                        <td className="border border-gray-300 px-4 py-2">{selectedScholar.application_no}</td>
                                                    </tr>
                                                    <tr className="bg-gray-50">
                                                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">Institution</td>
                                                        <td className="border border-gray-300 px-4 py-2">{selectedScholar.institution || selectedScholar.faculty}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">Department</td>
                                                        <td className="border border-gray-300 px-4 py-2">{selectedScholar.department}</td>
                                                    </tr>
                                                    <tr className="bg-gray-50">
                                                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">Type</td>
                                                        <td className="border border-gray-300 px-4 py-2">{deriveScholarType(selectedScholar) || selectedScholar.program_type}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">Written Marks</td>
                                                        <td className="border border-gray-300 px-4 py-2 font-bold text-blue-600">{selectedScholar.written_marks || 'N/A'}</td>
                                                    </tr>
                                                    <tr className="bg-gray-50">
                                                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">Interview Marks</td>
                                                        <td className="border border-gray-300 px-4 py-2 font-bold text-blue-600">{selectedScholar.interview_marks || 'N/A'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">Total Marks</td>
                                                        <td className="border border-gray-300 px-4 py-2 font-bold text-green-600 text-lg">{selectedScholar.total_marks}</td>
                                                    </tr>
                                                    <tr className="bg-gray-50">
                                                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">Email</td>
                                                        <td className="border border-gray-300 px-4 py-2">{selectedScholar.email || 'N/A'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">Phone</td>
                                                        <td className="border border-gray-300 px-4 py-2">{selectedScholar.mobile_number || 'N/A'}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="assignment-buttons">
                                <button type="button" onClick={closeModal} className="assignment-btn assignment-btn-cancel">Cancel</button>
                                <button type="button" onClick={handleAssignScholar} className="assignment-btn assignment-btn-assign">Assign Scholar</button>
                            </div>
                        </>}

                        {modal.type === 'assignments' && <>
                            <h3 className="text-2xl font-bold mb-4">Assignments for {modal.data.name}</h3>
                            <div className="text-left">
                                {assignments.filter(a => a.supervisorName === modal.data.name).map(a => {
                                    // Assignment already contains all scholar data from examination_records
                                    return (
                                        <div key={a.id} className="assignment-card">
                                            <div className="assignment-card-header">
                                                <div className="assignment-scholar-info">
                                                    <h4>{a.scholarName}</h4>
                                                    <p>Application: {a.applicationNo} | Mode: {a.mode}</p>
                                                    {a.faculty && a.department && (
                                                        <p className="assignment-faculty-info">
                                                            <strong>Assigned:</strong> {a.faculty} - {a.department}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleUnassign(a.id)}
                                                    className="assignment-unassign-btn"
                                                >
                                                    Unassign
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {assignments.filter(a => a.supervisorName === modal.data.name).length === 0 && (
                                    <p className="text-gray-500 text-center py-4">No active assignments.</p>
                                )}
                            </div>
                        </>}
                    </div>
                </div>
            )}
            {/* Column Selection Modal for Download */}
            {/* Download Column Selection Modal */}
            {showDownloadModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col transform transition-all duration-300 scale-100 relative overflow-hidden text-left">
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

export default Supervisors;