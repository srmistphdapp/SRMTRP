import React, { useEffect, useState } from 'react';
import { SlidersHorizontal, Maximize2 } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { fetchScholarsForDepartmentUser } from '../services/departmentScholarService';

// --- Helper Components ---

function Modal({ open, onClose, children, maxWidth = 'max-w-lg' }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black bg-opacity-40">
            <div className={`bg-white rounded-lg shadow-lg w-full ${maxWidth} p-6 relative animate-modal-in max-h-[90vh] overflow-y-auto`}>
                <button onClick={onClose} className="absolute top-3 right-4 text-2xl text-gray-400 hover:text-pink-400 font-bold">&times;</button>
                {children}
            </div>
        </div>
    );
}

function MessageBox({ open, message, onClose }) {
    if (!open) return null;
    return (
        <div className="fixed top-6 right-6 z-50">
            <div className="bg-white border-l-4 border-blue-700 shadow-lg rounded-lg p-4 max-w-sm animate-modal-in">
                <div className="flex justify-between items-center">
                    <span className="text-base">{message}</span>
                    <button onClick={onClose} className="ml-4 px-2 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg">Close</button>
                </div>
            </div>
        </div>
    );
}

// --- Helper Functions ---

const extractProgramType = (programString) => {
    if (!programString) return '';
    const typeMatch = programString.match(/\(([^)]+)\)/);
    return typeMatch ? typeMatch[1].trim() : '';
};

const cleanProgramName = (programString) => {
    if (!programString) return '';
    const cleanMatch = programString.match(/^([^(]+)/);
    return cleanMatch ? cleanMatch[1].trim() : programString;
};

// Helper function to format text: lowercase common words and replace underscores with spaces
const formatText = (text) => {
    if (!text) return '';
    
    // Replace underscores with spaces
    let formatted = text.replace(/_/g, ' ');
    
    // Split into words and process each word
    const words = formatted.split(' ');
    const commonWords = ['to', 'and', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'the', 'a', 'an'];
    
    const formattedWords = words.map((word, index) => {
        // Keep first word capitalized, lowercase common words (except first word)
        if (index === 0) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        } else if (commonWords.includes(word.toLowerCase())) {
            return word.toLowerCase();
        } else {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
    });
    
    return formattedWords.join(' ');
};

// Map status to Tailwind classes
const getStatusTailwindClass = (status) => {
    const base = "px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wide inline-block whitespace-nowrap shadow-sm";
    switch (status) {
        case 'Forwarded': return `${base} bg-gradient-to-br from-emerald-400 to-emerald-600 text-white border border-emerald-300`;
        case 'Approved':
        case 'Verified': return `${base} bg-gradient-to-br from-blue-500 to-blue-700 text-white border border-blue-400`;
        case 'Pending': return `${base} bg-gradient-to-br from-amber-300 to-amber-500 text-white border border-amber-300`;
        case 'Query': return `${base} bg-gradient-to-br from-purple-500 to-purple-600 text-white border border-purple-400`;
        case 'Duplicate': return `${base} bg-gradient-to-br from-gray-500 to-gray-600 text-white border border-gray-400`;
        case 'Rejected': return `${base} bg-gradient-to-br from-red-500 to-red-600 text-white border border-red-400`;
        default: return `${base} bg-gray-200 text-gray-700`;
    }
};

// Helper function to get display status based on dept_review column
const getDisplayStatus = (scholar) => {
    // Primary source of truth: dept_review column from Supabase
    const deptReview = scholar.deptReview || scholar._supabaseData?.deptReview;
    
    if (deptReview === 'Approved') {
        const status = scholar.forwarded ? 'Forwarded' : 'Approved';
        return status;
    } else if (deptReview === 'Rejected') {
        return 'Rejected';
    } else if (deptReview === 'Query') {
        return 'Query';
    } else {
        return 'Pending';
    }
};

export default function ScholarApplications() {
    const { scholarList, handleApproveScholar, handleRejectScholar, handleQueryScholar, handleForwardScholar, setActiveTab, setScholarList, toggleFullScreen, currentUser } = useAppContext();

    // Add loading state for data fetching
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    
    // Add state for dashboard statistics
    const [dashboardStats, setDashboardStats] = useState({
        totalApplications: 0,
        approvedApplications: 0,
        rejectedApplications: 0,
        pendingQueries: 0
    });
    const [statsLoading, setStatsLoading] = useState(true);
    
    // Loading states for individual scholars
    const [loadingStates, setLoadingStates] = useState({});

    const [search, setSearch] = useState('');
    const [forwardModal, setForwardModal] = useState({ open: false, ids: [] });
    const [consentChecked, setConsentChecked] = useState(false);
    const [viewModal, setViewModal] = useState({ open: false, app: null });
    const [confirmModal, setConfirmModal] = useState({ open: false, app: null });
    const [rejectionModal, setRejectionModal] = useState({ open: false, app: null, reason: '' });
    const [queryModal, setQueryModal] = useState({ open: false, app: null, text: '' });
    const [messageBox, setMessageBox] = useState({ open: false, message: '' });
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [filterDepartment, setFilterDepartment] = useState('All');
    const [filterType, setFilterType] = useState('All');

    const [selectedIds, setSelectedIds] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    const [bulkRejectModal, setBulkRejectModal] = useState({ open: false, ids: [], reason: '' });
    const [bulkActionLoading, setBulkActionLoading] = useState(false);

    // Helper function to set loading state for a specific scholar
    const setScholarLoading = (scholarId, isLoading) => {
        setLoadingStates(prev => ({
            ...prev,
            [scholarId]: isLoading
        }));
    };

    // Helper function to update scholar in local state
    const updateScholarInState = (scholarId, updates) => {
        setScholarList(prev => 
            prev.map(scholar => 
                scholar.id === scholarId 
                    ? { ...scholar, ...updates }
                    : scholar
            )
        );
    };

    // Check if buttons should be disabled for a scholar
    const areButtonsDisabled = (scholar) => {
        const deptReview = scholar.deptReview || scholar._supabaseData?.deptReview;
        const isLoading = loadingStates[scholar.id];
        
        // Disable if loading or if status is Approved/Rejected/Query
        return isLoading || (deptReview === 'Approved' || deptReview === 'Rejected' || deptReview === 'Query');
    };

    const handleConfirmQuery = async () => {
        if (!queryModal.text || !queryModal.text.trim()) {
            setMessageBox({ open: true, message: 'Please enter a query message.' });
            return;
        }

        const scholar = queryModal.app;
        const queryText = queryModal.text.trim();
        const scholarId = scholar._supabaseData?.originalId || scholar.id;
        const departmentCode = currentUser?.departmentCode || 'UNKNOWN';

        try {
            setScholarLoading(scholar.id, true);
            
            console.log(`🔄 Sending query to scholar ${scholarId}`);
            
            const { sendQueryToScholar } = await import('../services/departmentScholarService');
            const { data, error } = await sendQueryToScholar(scholarId, queryText, departmentCode, {
                queryBy: currentUser?.name || 'Department HOD'
            });

            if (error) {
                console.error('❌ Error sending query:', error);
                setMessageBox({ open: true, message: 'Failed to send query. Please try again.' });
                return;
            }

            // Update local state immediately
            const currentTimestamp = new Date().toISOString();
            updateScholarInState(scholar.id, {
                deptReview: 'Query',
                queryText: queryText,
                queryTimestamp: currentTimestamp,
                _supabaseData: {
                    ...scholar._supabaseData,
                    deptReview: 'Query',
                    dept_query: queryText,
                    query_timestamp: currentTimestamp
                }
            });

            setMessageBox({ open: true, message: `Query sent to ${scholar.name}.` });
            setQueryModal({ open: false, app: null, text: '' });
            console.log(`✅ Query sent to scholar ${scholarId} successfully`);
            
        } catch (err) {
            console.error('❌ Exception sending query:', err);
            setMessageBox({ open: true, message: 'Failed to send query.' });
        } finally {
            setScholarLoading(scholar.id, false);
        }
    };

    // Helper function for bulk approve that throws errors for proper error handling
    const approveSingleScholarForBulk = async (scholar) => {
        const scholarId = scholar._supabaseData?.originalId || scholar.id;
        const departmentCode = currentUser?.departmentCode || 'UNKNOWN';
        
        console.log(`🔄 Bulk approving scholar ${scholar.name} (ID: ${scholarId})`);
        console.log(`   Local Scholar ID: ${scholar.id}`);
        console.log(`   Supabase Scholar ID: ${scholarId}`);
        console.log(`   Current deptReview: ${scholar.deptReview}`);
        
        // Check if we have a valid scholar ID
        if (!scholarId) {
            throw new Error('Scholar ID not found');
        }
        
        // Call the service function
        const { approveScholar } = await import('../services/departmentScholarService');
        const result = await approveScholar(scholarId, departmentCode, {
            approvedBy: currentUser?.name || 'Department HOD'
        });

        console.log(`📋 Service result for scholar ${scholar.name}:`, result);

        if (result.error) {
            console.error(`❌ Service error for scholar ${scholar.name}:`, result.error);
            throw new Error(result.error.message || 'Failed to approve scholar');
        }

        console.log(`✅ Database updated for scholar ${scholar.name}, updating local state...`);

        // Update local state immediately - only dept_review, no dept_status yet
        const updates = {
            deptReview: 'Approved',
            verificationStatus: 'Approved',
            approvalTimestamp: new Date().toISOString(),
            _supabaseData: {
                ...scholar._supabaseData,
                deptReview: 'Approved'
                // Do not set deptStatus here - it should only be set when forwarding
            }
        };
        
        console.log(`🔄 Updating local state for scholar ${scholar.name} with:`, updates);
        updateScholarInState(scholar.id, updates);
        
        console.log(`✅ Successfully approved scholar ${scholar.name} in database and local state`);
        return result.data;
    };

    // Enhanced Approve Handler
    const handleApproveScholarNew = async (scholar) => {
        console.log(`🎯 APPROVE BUTTON CLICKED - Full scholar object:`, scholar);
        
        const scholarId = scholar._supabaseData?.originalId || scholar.id;
        const departmentCode = currentUser?.departmentCode || 'UNKNOWN';
        
        console.log(`🎯 APPROVE BUTTON CLICKED:`);
        console.log(`   Scholar Name: ${scholar.name}`);
        console.log(`   Local Scholar ID: ${scholar.id}`);
        console.log(`   Supabase Scholar ID: ${scholarId}`);
        console.log(`   Department Code: ${departmentCode}`);
        console.log(`   Current dept_review: ${scholar.deptReview}`);
        console.log(`   _supabaseData:`, scholar._supabaseData);
        
        // Check if we have a valid scholar ID
        if (!scholarId) {
            console.error('❌ No valid scholar ID found!');
            setMessageBox({ open: true, message: 'Error: Scholar ID not found. Cannot approve.' });
            return;
        }
        
        try {
            setScholarLoading(scholar.id, true);
            
            console.log(`🔄 Calling approveScholar service function with ID: ${scholarId}`);
            
            const { approveScholar } = await import('../services/departmentScholarService');
            const result = await approveScholar(scholarId, departmentCode, {
                approvedBy: currentUser?.name || 'Department HOD'
            });

            console.log(`📋 approveScholar service result:`, result);

            if (result.error) {
                console.error('❌ Error from approveScholar service:', result.error);
                setMessageBox({ open: true, message: `Failed to approve scholar: ${result.error.message}` });
                return;
            }

            console.log(`✅ approveScholar service returned success:`, result.data);

            // Update local state immediately - only dept_review, no dept_status yet
            const updates = {
                deptReview: 'Approved',
                verificationStatus: 'Approved',
                approvalTimestamp: new Date().toISOString(),
                _supabaseData: {
                    ...scholar._supabaseData,
                    deptReview: 'Approved'
                    // Do not set deptStatus here - it should only be set when forwarding
                }
            };
            
            console.log(`🔄 Updating local state with:`, updates);
            updateScholarInState(scholar.id, updates);

            setMessageBox({ open: true, message: 'Scholar approved successfully!' });
            console.log(`🎉 APPROVAL COMPLETE - Scholar ${scholarId} should now have dept_review = 'Approved' in Supabase`);

        } catch (err) {
            console.error('❌ Exception in handleApproveScholarNew:', err);
            setMessageBox({ open: true, message: `Failed to approve scholar: ${err.message}` });
        } finally {
            setScholarLoading(scholar.id, false);
        }
    };

    // Enhanced Reject Handler
    const handleRejectScholarNew = async (scholar, rejectionReason) => {
        console.log(`🎯 REJECT BUTTON CLICKED - Full scholar object:`, scholar);
        
        const scholarId = scholar._supabaseData?.originalId || scholar.id;
        const departmentCode = currentUser?.departmentCode || 'UNKNOWN';
        
        console.log(`🎯 REJECT BUTTON CLICKED:`);
        console.log(`   Scholar Name: ${scholar.name}`);
        console.log(`   Local Scholar ID: ${scholar.id}`);
        console.log(`   Supabase Scholar ID: ${scholarId}`);
        console.log(`   Department Code: ${departmentCode}`);
        console.log(`   Current dept_review: ${scholar.deptReview}`);
        console.log(`   Rejection Reason: ${rejectionReason}`);
        console.log(`   _supabaseData:`, scholar._supabaseData);
        
        // Check if we have a valid scholar ID
        if (!scholarId) {
            console.error('❌ No valid scholar ID found!');
            setMessageBox({ open: true, message: 'Error: Scholar ID not found. Cannot reject.' });
            return;
        }
        
        if (!rejectionReason || !rejectionReason.trim()) {
            console.error('❌ No rejection reason provided!');
            setMessageBox({ open: true, message: 'Rejection reason is required.' });
            return;
        }

        try {
            setScholarLoading(scholar.id, true);
            
            console.log(`🔄 Calling rejectScholar service function with ID: ${scholarId}`);
            
            const { rejectScholar } = await import('../services/departmentScholarService');
            const result = await rejectScholar(scholarId, departmentCode, rejectionReason.trim(), {
                rejectedBy: currentUser?.name || 'Department HOD'
            });

            console.log(`📋 rejectScholar service result:`, result);

            if (result.error) {
                console.error('❌ Error from rejectScholar service:', result.error);
                setMessageBox({ open: true, message: `Failed to reject scholar: ${result.error.message}` });
                return;
            }

            console.log(`✅ rejectScholar service returned success:`, result.data);

            // Update local state immediately
            const updates = {
                deptReview: 'Rejected',
                verificationStatus: 'Rejected',
                rejectionReason: rejectionReason.trim(),
                rejectionTimestamp: new Date().toISOString(),
                _supabaseData: {
                    ...scholar._supabaseData,
                    deptReview: 'Rejected'
                }
            };
            
            console.log(`🔄 Updating local state with:`, updates);
            updateScholarInState(scholar.id, updates);

            setMessageBox({ open: true, message: 'Scholar rejected successfully!' });
            console.log(`🎉 REJECTION COMPLETE - Scholar ${scholarId} should now have dept_review = 'Rejected' in Supabase`);

        } catch (err) {
            console.error('❌ Exception in handleRejectScholarNew:', err);
            setMessageBox({ open: true, message: `Failed to reject scholar: ${err.message}` });
        } finally {
            setScholarLoading(scholar.id, false);
        }
    };

    // Fetch scholars from Supabase and merge with existing scholarList
    useEffect(() => {
        const loadScholarsFromSupabase = async () => {
            setIsLoading(true);
            setFetchError(null);
            
            try {
                // Get current user's faculty and department
                const userFaculty = currentUser?.faculty;
                const userDepartment = currentUser?.department;
                const userDepartmentCode = currentUser?.departmentCode;
                
                console.log(`Loading scholars for faculty: ${userFaculty}, department: ${userDepartment} (${userDepartmentCode})`);
                console.log('Current user details:', {
                    faculty: userFaculty,
                    department: userDepartment,
                    departmentCode: userDepartmentCode,
                    email: currentUser?.email
                });
                
                if (!userFaculty || !userDepartment) {
                    console.warn('User faculty or department not available yet');
                    setIsLoading(false);
                    return;
                }
                
                // Fetch scholars specific to this department user's faculty and department
                // This will fetch scholars with:
                // - status = "Forwarded to Engineering" (or other faculty-specific status)
                // - faculty_status = "FORWARDED_TO_CSE" (or other department-specific status)
                const { data, error } = await fetchScholarsForDepartmentUser(userFaculty, userDepartment);
                
                if (!error && data && data.length > 0) {
                    // Transform Supabase data to match existing component expectations
                    // Use backend data directly
                    const transformedScholars = data.map((scholar, i) => {
                        // Determine verification status from backend data
                        let verificationStatus = 'Pending';
                        let forwarded = false;
                        
                        // Map backend dept_review to UI status - this is the primary source of truth
                        if (scholar.dept_review === 'Approved') {
                            verificationStatus = 'Approved';
                            if (scholar.status === 'Forwarded by Department') {
                                forwarded = true;
                            }
                        } else if (scholar.dept_review === 'Rejected') {
                            verificationStatus = 'Rejected';
                        } else {
                            // Default to Pending if dept_review is null, empty, or 'Pending'
                            verificationStatus = 'Pending';
                        }
                        
                        return {
                            id: `sch${i + 1}`,
                            regNo: scholar.application_no,
                            name: scholar.registered_name,
                            email: scholar.email,
                            // Adding fields to match ScholarManagement table requirements
                            formName: scholar.form_name || 'PhD Application Form',
                            mobile: scholar.mobile_number || '+91 9876543210',
                            dateOfBirth: scholar.date_of_birth || '1998-05-15',
                            gender: scholar.gender || 'Male',
                            faculty: scholar.institution || '-',
                            institution: scholar.institution || '-',
                            program: scholar.program || 'Computer Science Engineering',
                            specialization: scholar.department || 'Computer Science Engineering',
                            type: scholar.program_type || scholar.type || 'Full Time',
                            cgpa: (typeof scholar.cgpa === 'object') ? scholar.cgpa : { ug: scholar.cgpa || 8.5, pg: scholar.cgpa || 8.5 },
                            guideName: 'TBD',
                            researchTopic: scholar.research_interest || 'TBD',
                            // Use backend data directly
                            verificationStatus: verificationStatus,
                            rejectionReason: scholar.department_rejection_reason || null,
                            approvalTimestamp: scholar.department_approval_date || scholar.department_forward_date || null,
                            forwarded: forwarded,
                            forwardingTimestamp: scholar.department_forward_date || null,
                            certificatesLink: scholar.certificates || '#',
                            queries: scholar.department_queries || [],
                            deptReview: scholar.dept_review || 'Pending', // Add dept_review from backend
                            queryText: scholar.dept_query || null, // Add query text from backend
                            queryTimestamp: scholar.query_timestamp || null, // Add query timestamp from backend
                            // Additional fields from scholar_applications table
                            aadhaarNo: scholar.aadhaar_no,
                            differentlyAbled: scholar.differently_abled,
                            graduatedFromIndia: scholar.graduated_from_india,
                            course: scholar.course,
                            employeeId: scholar.employee_id,
                            designation: scholar.designation,
                            organizationName: scholar.organization_name,
                            organizationAddress: scholar.organization_address,
                            // UG Education fields
                            ugDegree: scholar.ug_degree,
                            ugSpecialization: scholar.ug_specialization,
                            ugCgpa: scholar.ug_cgpa,
                            ugMonthYear: scholar.ug_month_year,
                            ugRegistrationNo: scholar.ug_registration_no,
                            ugModeOfStudy: scholar.ug_mode_of_study,
                            // PG Education fields
                            pgDegree: scholar.pg_degree,
                            pgSpecialization: scholar.pg_specialization,
                            pgCgpa: scholar.pg_cgpa,
                            pgMonthYear: scholar.pg_month_year,
                            pgRegistrationNo: scholar.pg_registration_no,
                            pgModeOfStudy: scholar.pg_mode_of_study,
                            // Additional mock data for comprehensive view
                            ugQualification: scholar.ug_qualification || 'B.Tech',
                            ugInstitute: scholar.ug_institute || 'SRM Institute of Science and Technology',
                            pgQualification: scholar.pg_qualification || 'M.Tech',
                            pgInstitute: scholar.pg_institute || 'SRM Institute of Science and Technology',
                            ugMarkingScheme: scholar.ug_marking_scheme || 'CGPA',
                            pgMarkingScheme: scholar.pg_marking_scheme || 'CGPA',
                            nationality: scholar.nationality || 'Indian',
                            modeOfProfession: scholar.mode_of_profession || 'Academic',
                            // Store original Supabase data for reference
                            _supabaseData: {
                                originalId: scholar.id,
                                status: scholar.status,
                                facultyStatus: scholar.faculty_status,
                                deptReview: scholar.dept_review,
                                deptStatus: scholar.dept_status,
                                dept_query: scholar.dept_query, // Add dept_query to supabase data
                                query_timestamp: scholar.query_timestamp // Add query_timestamp to supabase data
                            }
                        };
                    });

                    // Always replace the scholarList with fresh Supabase data on component mount
                    setScholarList(transformedScholars);
                    console.log(`Successfully loaded ${transformedScholars.length} scholars from Supabase`);
                    console.log(`📊 Scholar status breakdown:`, {
                        pending: transformedScholars.filter(s => s.deptReview === 'Pending').length,
                        approved: transformedScholars.filter(s => s.deptReview === 'Approved').length,
                        rejected: transformedScholars.filter(s => s.deptReview === 'Rejected').length,
                        query: transformedScholars.filter(s => s.deptReview === 'Query').length
                    });
                    
                    // Update dashboard stats from the loaded data
                    setDashboardStats({
                        totalApplications: transformedScholars.length,
                        approvedApplications: transformedScholars.filter(s => s.deptReview === 'Approved').length,
                        rejectedApplications: transformedScholars.filter(s => s.deptReview === 'Rejected').length,
                        pendingQueries: transformedScholars.filter(s => s.deptReview === 'Query').length
                    });
                } else if (error) {
                    console.error(`Error loading scholars for faculty: ${userFaculty}, department: ${userDepartment} (${userDepartmentCode}):`, error);
                    setFetchError(`Failed to load scholars: ${error.message}`);
                } else {
                    console.log(`No scholars found for faculty: ${userFaculty}, department: ${userDepartment} (${userDepartmentCode})`);
                    // Clear the list if no scholars found for this department
                    setScholarList([]);
                    // Reset stats to zero
                    setDashboardStats({
                        totalApplications: 0,
                        approvedApplications: 0,
                        rejectedApplications: 0,
                        pendingQueries: 0
                    });
                }
            } catch (err) {
                console.error('Error loading scholars from Supabase:', err);
                setFetchError('Failed to connect to database');
                // Don't keep demo data - show empty list if Supabase fails
                console.log('Supabase fetch failed, showing empty list');
            } finally {
                setIsLoading(false);
                setStatsLoading(false);
            }
        };

        // Only fetch data when currentUser is available with faculty and department
        if (currentUser?.faculty && currentUser?.department) {
            loadScholarsFromSupabase();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.faculty, currentUser?.department, currentUser?.departmentCode]); // Re-fetch when faculty, department, or department code changes

    // Automatically update dashboard stats whenever scholarList changes
    useEffect(() => {
        if (scholarList && scholarList.length >= 0) {
            setDashboardStats({
                totalApplications: scholarList.length,
                approvedApplications: scholarList.filter(s => s.deptReview === 'Approved').length,
                rejectedApplications: scholarList.filter(s => s.deptReview === 'Rejected').length,
                pendingQueries: scholarList.filter(s => s.deptReview === 'Query').length
            });
        }
    }, [scholarList]); // Update stats whenever scholarList changes

    const filtered = (scholarList || []).filter(app =>
        (filterDepartment === 'All' || (app.specialization || '').toLowerCase().includes(filterDepartment.toLowerCase())) &&
        (filterType === 'All' || app.type === filterType) &&
        ((app.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (app.email || '').toLowerCase().includes(search.toLowerCase()) ||
            (app.regNo || '').toLowerCase().includes(search.toLowerCase()))
    );

    const handleAccept = (app) => {
        setConfirmModal({ open: true, app });
    };
    
    const handleConfirmAccept = () => {
        if (!confirmModal.app) return;
        
        handleApproveScholarNew(confirmModal.app);
        setConfirmModal({ open: false, app: null });
    };

    const handleReject = (app) => setRejectionModal({ open: true, app, reason: '' });
    const handleConfirmReject = () => {
        if (!rejectionModal.app || !rejectionModal.reason.trim()) {
            setMessageBox({ open: true, message: 'Please provide a rejection reason.' });
            return;
        }
        handleRejectScholarNew(rejectionModal.app, rejectionModal.reason.trim());
        setRejectionModal({ open: false, app: null, reason: '' });
    };

    const handleView = (app) => setViewModal({ open: true, app });
    const handleQuery = (app) => setQueryModal({ open: true, app, text: '' });
    const handleOpenFilter = () => setFilterModalOpen(true);
    const handleCloseFilter = () => setFilterModalOpen(false);
    const handleApplyFilter = () => {
        setFilterModalOpen(false);
    };

    const toggleSelect = (id) => {
        // Find the scholar to check if it's already processed
        const scholar = (scholarList || []).find(s => s.id === id);
        // Check dept_review column to determine if scholar can be selected
        if (scholar && scholar.deptReview && scholar.deptReview !== 'Pending') {
            // Don't allow selection of already processed scholars (Approved/Rejected/Query)
            return;
        }
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedIds([]);
            setSelectAll(false);
        } else {
            // Only select pending scholars (based on dept_review column)
            const pendingIds = filtered
                .filter(a => !a.deptReview || a.deptReview === 'Pending')
                .map(a => a.id);
            setSelectedIds(pendingIds);
            setSelectAll(true);
        }
    };

    const handleConfirmForward = () => {
        if (!consentChecked) return;
        if (forwardModal.ids && forwardModal.ids.length > 0) {
            handleForwardScholar(forwardModal.ids);
            setActiveTab('Approved');
        }
        setForwardModal({ open: false, ids: [] });
        setSelectedIds([]);
        setSelectAll(false);
        setConsentChecked(false);
    };

    // Reusable Field Component for View Modal
    const ViewField = ({ label, value }) => (
        <div className="flex flex-col gap-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
            <span className="block text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200 min-h-[38px] flex items-center">
                {value || 'N/A'}
            </span>
        </div>
    );

    // Logic to check if any selected scholar has pending queries or is not pending (for Bulk Actions)
    // Use dept_review column to determine processing status
    const selectedHasQueries = (scholarList || [])
        .filter(a => selectedIds.includes(a.id))
        .some(a => a.queries && a.queries.length > 0);
    
    const selectedHasNonPending = (scholarList || [])
        .filter(a => selectedIds.includes(a.id))
        .some(a => a.deptReview && a.deptReview !== 'Pending');
    
    const canBulkAction = !selectedHasQueries && !selectedHasNonPending;

    // Show loading state while fetching data
    if (isLoading) {
        return (
            <div id="panel-applications" className="panel-fullscreen w-full flex justify-center bg-gray-50 p-6">
                <div className="w-full max-w-[98%] mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
                        <h1 className="text-3xl font-bold leading-tight text-gray-900">
                            Scholar Application Management - {currentUser?.department || 'Department'}
                        </h1>
                    </div>
                    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 text-lg">Loading scholars for {currentUser?.departmentCode || currentUser?.department || 'department'}...</p>
                        <p className="text-gray-400 text-sm mt-2">Fetching data from database</p>
                    </div>
                </div>
            </div>
        );
    }

    // Show error state if fetch failed
    if (fetchError) {
        return (
            <div id="panel-applications" className="panel-fullscreen w-full flex justify-center bg-gray-50 p-6">
                <div className="w-full max-w-[98%] mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
                        <h1 className="text-3xl font-bold leading-tight text-gray-900">
                            Scholar Application Management - {currentUser?.department || 'Department'}
                        </h1>
                    </div>
                    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center">
                        <div className="text-red-500 mb-4">
                            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <p className="text-gray-800 font-semibold mb-2">Error Loading Scholars</p>
                        <p className="text-gray-600 mb-4">{fetchError}</p>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div id="panel-applications" className="panel-fullscreen w-full flex justify-center bg-gray-50 p-6">
            <div className="w-full max-w-[98%] mx-auto">
                {/* Single Line Header */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold leading-tight text-gray-900">
                        Scholar Application Management - {currentUser?.department || 'Department'}
                    </h1>
                </div>

                {/* Dashboard Statistics Tiles */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {/* Total Applications */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-600 mb-1">Applications Recieved</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {statsLoading ? (
                                        <div className="w-8 h-6 bg-gray-200 rounded animate-pulse"></div>
                                    ) : (
                                        dashboardStats.totalApplications
                                    )}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Approved Applications */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-600 mb-1">Applications Approved</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {statsLoading ? (
                                        <div className="w-8 h-6 bg-gray-200 rounded animate-pulse"></div>
                                    ) : (
                                        dashboardStats.approvedApplications
                                    )}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Rejected Applications */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-600 mb-1">Applications Rejected</p>
                                <p className="text-2xl font-bold text-red-600">
                                    {statsLoading ? (
                                        <div className="w-8 h-6 bg-gray-200 rounded animate-pulse"></div>
                                    ) : (
                                        dashboardStats.rejectedApplications
                                    )}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Pending Queries */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-600 mb-1">Pending Queries</p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {statsLoading ? (
                                        <div className="w-8 h-6 bg-gray-200 rounded animate-pulse"></div>
                                    ) : (
                                        dashboardStats.pendingQueries
                                    )}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex gap-4">
                    <div className="flex-1 min-w-0 bg-white rounded-xl shadow-md overflow-hidden">
                        <div className="p-4 flex gap-2 items-center justify-between bg-gray-50/50">
                            <div className="flex gap-2 items-center">
                                <button
                                    className={`font-semibold py-2 px-4 rounded-lg flex items-center gap-2 shadow-md transition-all active:scale-95 ${
                                        (scholarList || []).filter(a => selectedIds.includes(a.id)).length === 0 || !canBulkAction || bulkActionLoading
                                            ? 'bg-gray-300 cursor-not-allowed opacity-70 text-gray-500' 
                                            : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white'
                                    }`}
                                    onClick={async () => {
                                        if (bulkActionLoading) return;
                                        
                                        const pendingScholars = (scholarList || []).filter(a => 
                                            selectedIds.includes(a.id) && 
                                            (!a.deptReview || a.deptReview === 'Pending')
                                        );
                                        if (!pendingScholars || pendingScholars.length === 0) {
                                            setMessageBox({ open: true, message: 'No pending scholars selected to approve.' });
                                            return;
                                        }
                                        if (selectedHasQueries) {
                                            setMessageBox({ open: true, message: 'Cannot bulk approve: Some selected scholars have pending queries.' });
                                            return;
                                        }
                                        if (selectedHasNonPending) {
                                            setMessageBox({ open: true, message: 'Cannot bulk approve: Some selected scholars are already processed.' });
                                            return;
                                        }
                                        
                                        setBulkActionLoading(true);
                                        
                                        // Process approvals sequentially with proper error handling
                                        let successCount = 0;
                                        let errorCount = 0;
                                        const totalCount = pendingScholars.length;
                                        
                                        console.log(`🔄 Starting bulk approval of ${totalCount} scholars`);
                                        
                                        for (const scholar of pendingScholars) {
                                            try {
                                                console.log(`🔄 Bulk approving scholar ${scholar.id}`);
                                                await approveSingleScholarForBulk(scholar);
                                                successCount++;
                                                console.log(`✅ Successfully approved scholar ${scholar.id} (${successCount}/${totalCount})`);
                                            } catch (error) {
                                                console.error(`❌ Failed to approve scholar ${scholar.id}:`, error);
                                                errorCount++;
                                            }
                                        }
                                        
                                        // Wait a moment to ensure all database operations are complete
                                        await new Promise(resolve => setTimeout(resolve, 500));
                                        
                                        // Verify database updates by checking a few scholars
                                        if (successCount > 0) {
                                            console.log(`🔍 Verifying database updates for ${Math.min(3, successCount)} scholars...`);
                                            const { supabase } = await import('../../../supabaseClient');
                                            
                                            for (let i = 0; i < Math.min(3, pendingScholars.length); i++) {
                                                const scholar = pendingScholars[i];
                                                const scholarId = scholar._supabaseData?.originalId || scholar.id;
                                                
                                                const { data: verifyData, error: verifyError } = await supabase
                                                    .from('scholar_applications')
                                                    .select('id, registered_name, dept_review')
                                                    .eq('id', scholarId)
                                                    .single();
                                                
                                                if (!verifyError && verifyData) {
                                                    console.log(`✅ Database verification for ${scholar.name}:`, {
                                                        id: verifyData.id,
                                                        name: verifyData.registered_name,
                                                        dept_review: verifyData.dept_review
                                                    });
                                                } else {
                                                    console.error(`❌ Database verification failed for ${scholar.name}:`, verifyError);
                                                }
                                            }
                                        }
                                        
                                        // Show appropriate success/error message
                                        if (successCount > 0 && errorCount === 0) {
                                            setMessageBox({ open: true, message: `Successfully approved ${successCount} scholar(s)` });
                                        } else if (successCount > 0 && errorCount > 0) {
                                            setMessageBox({ open: true, message: `Approved ${successCount} scholar(s), ${errorCount} failed` });
                                        } else {
                                            setMessageBox({ open: true, message: 'Failed to approve scholars. Please try again.' });
                                        }
                                        
                                        setSelectedIds([]);
                                        setSelectAll(false);
                                        setBulkActionLoading(false);
                                        
                                        console.log(`🎉 Bulk approval complete: ${successCount} success, ${errorCount} errors`);
                                    }}
                                    disabled={(scholarList || []).filter(a => selectedIds.includes(a.id)).length === 0 || !canBulkAction || bulkActionLoading}
                                    title={
                                        bulkActionLoading ? "Processing approvals..." :
                                        selectedHasQueries ? "Cannot approve: Selection contains scholars with pending queries" :
                                        selectedHasNonPending ? "Cannot approve: Selection contains already processed scholars" :
                                        "Approve Selected"
                                    }
                                >
                                    {bulkActionLoading ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
                                    )}
                                    Approve Selected
                                </button>
                                <button
                                    className={`bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 shadow-md transition-all active:scale-95 ${
                                        bulkActionLoading ? 'opacity-50 cursor-not-allowed' : 'disabled:opacity-50 disabled:cursor-not-allowed'
                                    }`}
                                    onClick={() => {
                                        if (bulkActionLoading) return;
                                        
                                        const pendingScholars = (scholarList || []).filter(a => 
                                            selectedIds.includes(a.id) && 
                                            (!a.deptReview || a.deptReview === 'Pending')
                                        );
                                        if (!pendingScholars || pendingScholars.length === 0) {
                                            setMessageBox({ open: true, message: 'No pending scholars selected to reject.' });
                                            return;
                                        }
                                        setBulkRejectModal({ open: true, ids: pendingScholars.map(s => s.id), reason: '' });
                                    }}
                                    disabled={(scholarList || []).filter(a => selectedIds.includes(a.id) && (!a.deptReview || a.deptReview === 'Pending')).length === 0 || bulkActionLoading}
                                    title={bulkActionLoading ? "Processing..." : "Reject Selected"}
                                >
                                    {bulkActionLoading ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    )}
                                    Reject Selected
                                </button>
                            </div>
                            
                            {/* Search, Filter, Sort Controls */}
                            <div className="flex gap-2 items-center">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Search in Applications..."
                                        className="pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition pl-3 shadow-sm bg-white"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>

                                <button className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100 text-gray-600 shadow-sm transition-all" title="Filter" onClick={handleOpenFilter}>
                                    <SlidersHorizontal className="w-5 h-5" />
                                </button>
                                <button className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100 text-gray-600 shadow-sm transition-all" title="Fullscreen applications" onClick={() => toggleFullScreen && toggleFullScreen('panel-applications')}>
                                    <Maximize2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[3000px] bg-white text-sm text-left table-fixed">
                                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider text-center w-[60px] sticky left-0 bg-slate-50 z-20">
                                            <input type="checkbox" checked={selectAll} onChange={handleSelectAll} aria-label="Select all" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        </th>
                                        <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider text-center w-[60px] sticky left-[60px] bg-slate-50 z-20">S.NO</th>
                                        <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider w-[180px] sticky left-[120px] bg-slate-50 z-20">REGISTERED NAME</th>
                                        <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider w-[120px] sticky left-[300px] bg-slate-50 z-20">APPLICATION NO</th>
                                        <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider w-[280px] bg-slate-50">SELECT INSTITUTION</th>
                                        <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider w-[350px] bg-slate-50">DEPARTMENT</th>
                                        <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider w-[280px] bg-slate-50">TYPE</th>
                                        <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider w-[220px] bg-slate-50">MOBILE NUMBER</th>
                                        <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider w-[320px] bg-slate-50">EMAIL ID</th>
                                        <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider text-center w-[100px] bg-slate-50">GENDER</th>
                                        <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider text-center w-[120px] bg-slate-50">CERTIFICATES</th>
                                        <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider text-center w-[140px] bg-slate-50">STATUS</th>
                                        <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider text-center right-0 bg-slate-50 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)] w-[180px]">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length > 0 ? (
                                        filtered.map((app, idx) => {
                                            const hasQueries = app.queries && app.queries.length > 0;
                                            return (
                                                <tr key={app.id} className="hover:bg-blue-50/30 transition-colors group">
                                                    <td className="px-5 py-4 whitespace-nowrap text-center sticky left-0 bg-white group-hover:bg-blue-50/30 z-10">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedIds.includes(app.id)} 
                                                            onChange={() => toggleSelect(app.id)} 
                                                            className={`w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                                                                app.deptReview && app.deptReview !== 'Pending' 
                                                                    ? 'opacity-50 cursor-not-allowed' 
                                                                    : ''
                                                            }`}
                                                            disabled={app.deptReview && app.deptReview !== 'Pending'}
                                                        />
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-gray-900 text-center sticky left-[60px] bg-white group-hover:bg-blue-50/30 z-10">{idx + 1}</td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-gray-900 sticky left-[120px] bg-white group-hover:bg-blue-50/30 z-10">{app.name}</td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-gray-600 sticky left-[300px] bg-white group-hover:bg-blue-50/30 z-10">{app.regNo}</td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-gray-600">{app.institution || '-'}</td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-gray-600" title={app.specialization}>{app.specialization || '-'}</td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-gray-600">
                                                        {app.type || 'Full Time'}
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-gray-600">{app.mobile || '+91 9876543210'}</td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-gray-600">{app.email}</td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-gray-600 text-center">{app.gender || 'Male'}</td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-center">
                                                        <button
                                                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1 rounded-md text-xs font-semibold transition-colors border border-transparent hover:border-blue-100"
                                                            onClick={() => window.open(app.certificatesLink || app.certificates || '#', '_blank', 'noopener')}
                                                        >
                                                            View Docs
                                                        </button>
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-center">
                                                        <span className={getStatusTailwindClass(getDisplayStatus(app))}>
                                                            {getDisplayStatus(app)}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-center right-0 bg-white group-hover:bg-blue-50/30 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)]">
                                                        <div className="flex justify-center items-center gap-2">
                                                            <button
                                                                title="View Details"
                                                                className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95"
                                                                onClick={() => handleView(app)}
                                                            >
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12s-4-7-9-7-9 7-9 7 4 7 9 7 9-7 9-7z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                                            </button>
                                                            <button
                                                                title={
                                                                    areButtonsDisabled(app) 
                                                                        ? "Cannot send query: Scholar already processed or loading" 
                                                                        : "Send Query"
                                                                }
                                                                className={`p-1.5 rounded-lg shadow-sm transition-all ${
                                                                    areButtonsDisabled(app)
                                                                        ? 'bg-gray-300 cursor-not-allowed opacity-50'
                                                                        : 'bg-purple-500 hover:bg-purple-600 text-white hover:scale-105 active:scale-95'
                                                                }`}
                                                                onClick={() => {
                                                                    if (!areButtonsDisabled(app)) {
                                                                        handleQuery(app);
                                                                    }
                                                                }}
                                                                disabled={areButtonsDisabled(app)}
                                                            >
                                                                {loadingStates[app.id] ? (
                                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                ) : (
                                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                                                )}
                                                            </button>
                                                            <button
                                                                title={
                                                                    hasQueries ? "Cannot approve: Queries pending" :
                                                                    areButtonsDisabled(app) ? "Cannot approve: Scholar already processed or loading" :
                                                                    "Approve"
                                                                }
                                                                className={`p-1.5 rounded-lg shadow-sm transition-all ${
                                                                    hasQueries || areButtonsDisabled(app)
                                                                    ? 'bg-gray-300 cursor-not-allowed opacity-50' 
                                                                    : 'bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-105 active:scale-95'
                                                                }`}
                                                                onClick={() => {
                                                                    if (!hasQueries && !areButtonsDisabled(app)) {
                                                                        handleAccept(app);
                                                                    }
                                                                }}
                                                                disabled={hasQueries || areButtonsDisabled(app)}
                                                            >
                                                                {loadingStates[app.id] ? (
                                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                ) : (
                                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
                                                                )}
                                                            </button>
                                                            <button
                                                                title={
                                                                    areButtonsDisabled(app) 
                                                                        ? "Cannot reject: Scholar already processed or loading" 
                                                                        : "Reject"
                                                                }
                                                                className={`p-1.5 rounded-lg shadow-sm transition-all ${
                                                                    areButtonsDisabled(app)
                                                                        ? 'bg-gray-300 cursor-not-allowed opacity-50'
                                                                        : 'bg-red-500 hover:bg-red-600 text-white hover:scale-105 active:scale-95'
                                                                }`}
                                                                onClick={() => {
                                                                    if (!areButtonsDisabled(app)) {
                                                                        handleReject(app);
                                                                    }
                                                                }}
                                                                disabled={areButtonsDisabled(app)}
                                                            >
                                                                {loadingStates[app.id] ? (
                                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                ) : (
                                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={15} className="text-center py-12 text-gray-500 bg-gray-50/50">
                                                <div className="flex flex-col items-center justify-center">
                                                    <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                                    <p className="text-lg font-medium text-gray-700">
                                                        {(scholarList || []).length === 0 && !search && filterDepartment === 'All' && filterType === 'All'
                                                            ? 'No scholar applications available'
                                                            : 'No applications found'}
                                                    </p>
                                                    <p className="text-sm text-gray-400 mt-1">
                                                        {(scholarList || []).length === 0 && !search && filterDepartment === 'All' && filterType === 'All'
                                                            ? 'There are no scholar applications for this department yet'
                                                            : 'Try adjusting your filters or search terms'}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Per-row Query modal */}
                <Modal open={queryModal.open} onClose={() => setQueryModal({ open: false, app: null, text: '' })}>
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Send Query to {queryModal.app?.name}</h3>
                    <p className="mb-3 text-gray-600">Write your query or note to the applicant:</p>
                    <textarea
                        className="w-full border border-gray-300 rounded-lg p-3 mb-6 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all shadow-sm"
                        value={queryModal.text}
                        onChange={e => setQueryModal(s => ({ ...s, text: e.target.value }))}
                        rows={5}
                        placeholder="Type your message here..."
                    />
                    <div className="flex justify-end gap-3">
                        <button className="px-5 py-2.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors" onClick={() => setQueryModal({ open: false, app: null, text: '' })}>Cancel</button>
                        <button className="px-5 py-2.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 font-medium shadow-md transition-all active:scale-95" onClick={handleConfirmQuery}>Send Query</button>
                    </div>
                </Modal>

                {/* Other Modals (Retained for completeness) */}
                <Modal open={forwardModal.open} onClose={() => setForwardModal({ open: false, ids: [] })} maxWidth="max-w-md">
                    <h3 className="text-xl font-bold mb-2">Forward to University</h3>
                    <p className="mb-4">You are about to forward {forwardModal.ids.length} application(s). Please confirm and check consent.</p>
                    <label className="flex items-center gap-2 mb-4">
                        <input type="checkbox" checked={consentChecked} onChange={e => setConsentChecked(e.target.checked)} />
                        <span>I confirm forwarding these applications to the university.</span>
                    </label>
                    <div className="flex justify-end gap-2">
                        <button className="px-4 py-2 rounded bg-gray-200" onClick={() => setForwardModal({ open: false, ids: [] })}>Cancel</button>
                        <button className={`px-4 py-2 rounded text-white ${consentChecked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-400'}`} onClick={handleConfirmForward} disabled={!consentChecked}>Confirm Forward</button>
                    </div>
                </Modal>
                <Modal open={filterModalOpen} onClose={handleCloseFilter} maxWidth="max-w-sm">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Filter Applications</h3>
                    <div className="mb-4">
                        <label className="block mb-2 font-semibold text-gray-700 text-sm">Department</label>
                        <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="All">All Departments</option>
                            <option value="Computer Science">Computer Science</option>
                            <option value="Mechanical">Mechanical</option>
                            <option value="Electrical">Electrical</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Civil">Civil</option>
                            <option value="Biotechnology">Biotechnology</option>
                            <option value="Chemical">Chemical</option>
                            <option value="Aerospace">Aerospace</option>
                            <option value="Information Technology">Information Technology</option>
                            <option value="Biomedical">Biomedical</option>
                            <option value="English">English</option>
                            <option value="Mathematics">Mathematics</option>
                            <option value="Physics">Physics</option>
                            <option value="Chemistry">Chemistry</option>
                            <option value="Management">Management</option>
                            <option value="Commerce">Commerce</option>
                        </select>
                    </div>
                    <div className="mb-6">
                        <label className="block mb-2 font-semibold text-gray-700 text-sm">Type</label>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="All">All Types</option>
                            <option value="Full Time">Full Time</option>
                            <option value="Part Time">Part Time</option>
                            <option value="Sponsored">Sponsored</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <button className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors" onClick={handleCloseFilter}>Cancel</button>
                        <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-md transition-all active:scale-95" onClick={handleApplyFilter}>Apply Filter</button>
                    </div>
                </Modal>
                <Modal open={confirmModal.open} onClose={() => setConfirmModal({ open: false, app: null })}>
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Approve Scholar</h3>
                    <div className="bg-emerald-50 p-4 rounded-lg mb-6 border border-emerald-100">
                        <p className="text-emerald-800 font-medium">Are you sure you want to approve <span className="font-bold">{confirmModal.app?.name}</span>?</p>
                        <p className="text-emerald-600 text-sm mt-1">This action will move the application to the next stage.</p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button className="px-5 py-2.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors" onClick={() => setConfirmModal({ open: false, app: null })}>Cancel</button>
                        <button className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium shadow-md transition-all active:scale-95" onClick={handleConfirmAccept}>Approve Scholar</button>
                    </div>
                </Modal>
                <Modal open={rejectionModal.open} onClose={() => setRejectionModal({ open: false, app: null, reason: '' })}>
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Reject Scholar</h3>
                    <p className="mb-3 text-gray-600">Provide reason for rejecting <span className="font-semibold text-gray-900">{rejectionModal.app?.name}</span>:</p>
                    <textarea
                        className="w-full border border-gray-300 rounded-lg p-3 mb-6 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all shadow-sm"
                        value={rejectionModal.reason}
                        onChange={e => setRejectionModal(s => ({ ...s, reason: e.target.value }))}
                        placeholder="Enter rejection reason..."
                        rows={4}
                    />
                    <div className="flex justify-end gap-3">
                        <button className="px-5 py-2.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors" onClick={() => setRejectionModal({ open: false, app: null, reason: '' })}>Cancel</button>
                        <button className="px-5 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium shadow-md transition-all active:scale-95" onClick={handleConfirmReject}>Reject Scholar</button>
                    </div>
                </Modal>
                <Modal open={bulkRejectModal.open} onClose={() => setBulkRejectModal({ open: false, ids: [], reason: '' })}>
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Reject Selected Scholars</h3>
                    <div className="bg-red-50 p-3 rounded-lg mb-4 border border-red-100 text-red-800 text-sm">
                        You are about to reject <strong>{bulkRejectModal.ids.length}</strong> selected scholar(s).
                    </div>
                    <p className="mb-3 text-gray-600">Provide a common reason for rejection:</p>
                    <textarea
                        className="w-full border border-gray-300 rounded-lg p-3 mb-6 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all shadow-sm"
                        value={bulkRejectModal.reason}
                        onChange={e => setBulkRejectModal(s => ({ ...s, reason: e.target.value }))}
                        placeholder="Enter rejection reason..."
                        rows={4}
                    />
                    <div className="flex justify-end gap-3">
                        <button className="px-5 py-2.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors" onClick={() => setBulkRejectModal({ open: false, ids: [], reason: '' })}>Cancel</button>
                        <button className={`px-5 py-2.5 rounded-lg font-medium shadow-md transition-all active:scale-95 flex items-center gap-2 ${
                            bulkActionLoading 
                                ? 'bg-gray-400 cursor-not-allowed text-white' 
                                : 'bg-red-600 text-white hover:bg-red-700'
                        }`} onClick={async () => {
                            if (bulkActionLoading) return;
                            
                            if (!bulkRejectModal.reason || !bulkRejectModal.reason.trim()) {
                                setMessageBox({ open: true, message: 'Please provide a rejection reason.' });
                                return;
                            }
                            
                            setBulkActionLoading(true);
                            
                            // Process rejections sequentially with proper error handling
                            let successCount = 0;
                            let errorCount = 0;
                            const totalCount = bulkRejectModal.ids.length;
                            
                            console.log(`🔄 Starting bulk rejection of ${totalCount} scholars`);
                            
                            for (const scholarId of bulkRejectModal.ids) {
                                try {
                                    console.log(`🔄 Rejecting scholar ${scholarId}`);
                                    const scholar = scholarList.find(s => s.id === scholarId);
                                    if (scholar) {
                                        await handleRejectScholarNew(scholar, bulkRejectModal.reason.trim());
                                        successCount++;
                                        console.log(`✅ Successfully rejected scholar ${scholarId} (${successCount}/${totalCount})`);
                                    } else {
                                        console.error(`❌ Scholar ${scholarId} not found in local list`);
                                        errorCount++;
                                    }
                                } catch (error) {
                                    console.error(`❌ Failed to reject scholar ${scholarId}:`, error);
                                    errorCount++;
                                }
                            }
                            
                            // Show appropriate success/error message
                            if (successCount > 0 && errorCount === 0) {
                                setMessageBox({ open: true, message: `Successfully rejected ${successCount} scholar(s)` });
                            } else if (successCount > 0 && errorCount > 0) {
                                setMessageBox({ open: true, message: `Rejected ${successCount} scholar(s), ${errorCount} failed` });
                            } else {
                                setMessageBox({ open: true, message: 'Failed to reject scholars. Please try again.' });
                            }
                            
                            setBulkRejectModal({ open: false, ids: [], reason: '' });
                            setSelectedIds([]);
                            setSelectAll(false);
                            setBulkActionLoading(false);
                            
                            console.log(`🎉 Bulk rejection complete: ${successCount} success, ${errorCount} errors`);
                        }} disabled={bulkActionLoading}>
                            {bulkActionLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Processing...
                                </>
                            ) : (
                                'Reject All'
                            )}
                        </button>
                    </div>
                </Modal>

                {/* View Details Modal with Comprehensive Fields */}
                <Modal open={viewModal.open} onClose={() => setViewModal({ open: false, app: null })} maxWidth="max-w-6xl">
                    <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-100">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">Scholar Details</h3>
                            <p className="text-gray-500 text-sm mt-1">Review complete application information</p>
                        </div>
                        {/* Duplicate close button removed from here */}
                    </div>

                    <div className="space-y-8 overflow-y-auto max-h-[70vh] pr-2">
                        {/* Basic Information */}
                        <section>
                            <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Basic Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <ViewField label="Form Name" value={viewModal.app?.formName || 'PhD Application Form'} />
                                <ViewField label="Registered Name" value={viewModal.app?.name} />
                                <ViewField label="Application No" value={viewModal.app?.regNo} />
                                <ViewField label="Have You Graduated From India?" value={viewModal.app?.graduatedFromIndia || 'Yes'} />
                                <ViewField label="Course" value={formatText(viewModal.app?.course || viewModal.app?.program)} />
                                <ViewField label="Select Institution" value={formatText(viewModal.app?.institution || '-')} />
                                <ViewField label="Department" value={formatText(viewModal.app?.specialization || '-')} />
                                <ViewField label="Type" value={formatText(extractProgramType(viewModal.app?.program) || viewModal.app?.type)} />
                                <div className="view-field">
                                    <label className="view-label">Certificates Drive Link:</label>
                                    {viewModal.app?.certificatesLink && viewModal.app.certificatesLink !== '#' ? (
                                        <a 
                                            href={viewModal.app.certificatesLink} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="view-value text-blue-600 hover:text-blue-800 underline cursor-pointer"
                                        >
                                            View Certificates
                                        </a>
                                    ) : (
                                        <span className="view-value">N/A</span>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Employment Information */}
                        <section>
                            <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Employment Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <ViewField label="1 - Employee Id" value={viewModal.app?.employeeId || viewModal.app?.employee1Id} />
                                <ViewField label="1 - Designation" value={formatText(viewModal.app?.designation || viewModal.app?.employee1Designation)} />
                                <ViewField label="1 - Organization Name" value={formatText(viewModal.app?.organizationName || viewModal.app?.employee1Organization)} />
                                <ViewField label="1 - Organization Address" value={formatText(viewModal.app?.organizationAddress || viewModal.app?.employee1Address)} />
                            </div>
                        </section>

                        {/* Personal Information */}
                        <section>
                            <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Personal Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <ViewField label="Mobile Number" value={viewModal.app?.mobile} />
                                <ViewField label="Email ID" value={viewModal.app?.email} />
                                <ViewField label="Date Of Birth" value={viewModal.app?.dateOfBirth} />
                                <ViewField label="Gender" value={viewModal.app?.gender} />
                                <ViewField label="Are You Differently Abled?" value={viewModal.app?.differentlyAbled || 'No'} />
                                <ViewField label="Nature Of Deformity" value={viewModal.app?.natureOfDeformity || 'N/A'} />
                                <ViewField label="Percentage Of Deformity" value={viewModal.app?.percentageOfDeformity || 'N/A'} />
                                <ViewField label="Nationality" value={viewModal.app?.nationality} />
                                <ViewField label="Aadhaar Card No." value={viewModal.app?.aadhaarNo} />
                                <ViewField label="Mode Of Profession (Industry/Academic)" value={formatText(viewModal.app?.modeOfProfession)} />
                                <ViewField label="Area Of Interest" value={formatText(viewModal.app?.areaOfInterest)} />
                            </div>
                        </section>

                        {/* UG Education */}
                        <section>
                            <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">UG - Education Qualification</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <ViewField label="UG - Current Education Qualification" value={formatText(viewModal.app?.ugQualification || viewModal.app?.ugDegree)} />
                                <ViewField label="UG - Institute Name" value={formatText(viewModal.app?.ugInstitute)} />
                                <ViewField label="UG - Degree" value={formatText(viewModal.app?.ugDegree)} />
                                <ViewField label="UG - Specialization" value={formatText(viewModal.app?.ugSpecialization)} />
                                <ViewField label="UG - Marking Scheme" value={formatText(viewModal.app?.ugMarkingScheme)} />
                                <ViewField label="UG - CGPA Or Percentage" value={viewModal.app?.ugCgpa || (viewModal.app?.cgpa && viewModal.app.cgpa.ug)} />
                                <ViewField label="UG - Month & Year" value={viewModal.app?.ugMonthYear} />
                                <ViewField label="UG - Registration No." value={viewModal.app?.ugRegistrationNo} />
                                <ViewField label="UG - Mode Of Study" value={formatText(viewModal.app?.ugModeOfStudy || 'Full Time')} />
                                <ViewField label="UG - Place Of The Institution" value={formatText(viewModal.app?.ugPlace)} />
                            </div>
                        </section>

                        {/* PG Education */}
                        <section>
                            <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">PG - Education Qualification</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <ViewField label="PG - Current Education Qualification" value={formatText(viewModal.app?.pgQualification || viewModal.app?.pgDegree)} />
                                <ViewField label="PG - Institute Name" value={formatText(viewModal.app?.pgInstitute)} />
                                <ViewField label="PG - Degree" value={formatText(viewModal.app?.pgDegree)} />
                                <ViewField label="PG - Specialization" value={formatText(viewModal.app?.pgSpecialization)} />
                                <ViewField label="PG - Marking Scheme" value={formatText(viewModal.app?.pgMarkingScheme)} />
                                <ViewField label="PG - CGPA Or Percentage" value={viewModal.app?.pgCgpa || (viewModal.app?.cgpa && viewModal.app.cgpa.pg)} />
                                <ViewField label="PG - Month & Year" value={viewModal.app?.pgMonthYear} />
                                <ViewField label="PG - Registration No." value={viewModal.app?.pgRegistrationNo} />
                                <ViewField label="PG - Mode Of Study" value={formatText(viewModal.app?.pgModeOfStudy || 'Full Time')} />
                                <ViewField label="PG - Place Of The Institution" value={formatText(viewModal.app?.pgPlace)} />
                            </div>
                        </section>

                        {/* Other Degree Education */}
                        <section>
                            <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Other Degree - Education Qualification</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <ViewField label="Current Education Qualification" value={formatText(viewModal.app?.otherQualification)} />
                                <ViewField label="Institute Name" value={formatText(viewModal.app?.otherInstitute)} />
                                <ViewField label="Degree" value={formatText(viewModal.app?.otherDegree)} />
                                <ViewField label="Specialization" value={formatText(viewModal.app?.otherSpecialization)} />
                                <ViewField label="Marking Scheme" value={formatText(viewModal.app?.otherMarkingScheme)} />
                                <ViewField label="CGPA / Percentage" value={viewModal.app?.otherCgpa} />
                                <ViewField label="Month & Year" value={viewModal.app?.otherMonthYear} />
                                <ViewField label="Registration No" value={viewModal.app?.otherRegistrationNo} />
                                <ViewField label="Mode Of Study" value={formatText(viewModal.app?.otherModeOfStudy)} />
                                <ViewField label="Place Of Institution" value={formatText(viewModal.app?.otherPlace)} />
                            </div>
                        </section>

                        {/* Competitive Exams */}
                        <section>
                            <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Competitive Exams</h4>
                            <div className="mb-4">
                                <ViewField label="Have You Taken Any Competitive Exam?" value={viewModal.app?.competitiveExam || 'No'} />
                            </div>
                            {viewModal.app?.competitiveExam === 'Yes' && (
                                <>
                                    <div className="mb-6">
                                        <h5 className="text-md font-medium text-gray-800 mb-3">1. Exam Details</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <ViewField label="Name Of The Exam" value={formatText(viewModal.app?.exam1Name)} />
                                            <ViewField label="Registration No./Roll No." value={viewModal.app?.exam1RegNo} />
                                            <ViewField label="Score Obtained" value={viewModal.app?.exam1Score} />
                                            <ViewField label="Max Score" value={viewModal.app?.exam1MaxScore} />
                                            <ViewField label="Year Appeared" value={viewModal.app?.exam1Year} />
                                            <ViewField label="AIR/Overall Rank" value={viewModal.app?.exam1Rank} />
                                            <ViewField label="Qualified/Not Qualified" value={formatText(viewModal.app?.exam1Qualified)} />
                                        </div>
                                    </div>
                                    <div className="mb-6">
                                        <h5 className="text-md font-medium text-gray-800 mb-3">2. Exam Details</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <ViewField label="Name Of The Exam" value={formatText(viewModal.app?.exam2Name)} />
                                            <ViewField label="Registration No./Roll No." value={viewModal.app?.exam2RegNo} />
                                            <ViewField label="Score Obtained" value={viewModal.app?.exam2Score} />
                                            <ViewField label="Max Score" value={viewModal.app?.exam2MaxScore} />
                                            <ViewField label="Year Appeared" value={viewModal.app?.exam2Year} />
                                            <ViewField label="AIR/Overall Rank" value={viewModal.app?.exam2Rank} />
                                            <ViewField label="Qualified/Not Qualified" value={formatText(viewModal.app?.exam2Qualified)} />
                                        </div>
                                    </div>
                                    <div className="mb-6">
                                        <h5 className="text-md font-medium text-gray-800 mb-3">3. Exam Details</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <ViewField label="Name Of The Exam" value={formatText(viewModal.app?.exam3Name)} />
                                            <ViewField label="Registration No./Roll No." value={viewModal.app?.exam3RegNo} />
                                            <ViewField label="Score Obtained" value={viewModal.app?.exam3Score} />
                                            <ViewField label="Max Score" value={viewModal.app?.exam3MaxScore} />
                                            <ViewField label="Year Appeared" value={viewModal.app?.exam3Year} />
                                            <ViewField label="AIR/Overall Rank" value={viewModal.app?.exam3Rank} />
                                            <ViewField label="Qualified/Not Qualified" value={formatText(viewModal.app?.exam3Qualified)} />
                                        </div>
                                    </div>
                                </>
                            )}
                        </section>

                        {/* Research Interest & Essays */}
                        <section>
                            <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Research Interest & Essays</h4>
                            <div className="space-y-4">
                                <div className="view-field">
                                    <label className="view-label">Describe In 300 Words; Your Reasons For Applying To The Proposed Program; Your Study Interests/future Career Plans, And Other Interests That Drives You To Apply To The Program.:</label>
                                    <div className="view-value bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                                        {viewModal.app?.reasonsForApplying || viewModal.app?.essay1 || 'N/A'}
                                    </div>
                                </div>
                                <div className="view-field">
                                    <label className="view-label">Title And Abstract Of The Master Degree Thesis And Your Research Interest In 500 Words:</label>
                                    <div className="view-value bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                                        {viewModal.app?.researchInterest || viewModal.app?.essay2 || 'N/A'}
                                    </div>
                                </div>
                                <ViewField label="Area Of Interest" value={formatText(viewModal.app?.areaOfInterest)} />
                                <ViewField label="User Id" value={viewModal.app?.userId} />
                            </div>
                        </section>

                        {/* Application Status */}
                        <section>
                            <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Application Status & Review</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="flex flex-col gap-1 items-start">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Current Status</label>
                                    <span className={getStatusTailwindClass(viewModal.app?.deptReview || 'Pending')}>
                                        {viewModal.app?.deptReview || 'Pending'}
                                    </span>
                                </div>
                                <ViewField label="Faculty" value={formatText(viewModal.app?.faculty)} />
                                <ViewField label="Department" value={formatText(viewModal.app?.program || viewModal.app?.specialization)} />
                                <ViewField label="Type" value={formatText(viewModal.app?.type)} />
                                <ViewField label="Department Review" value={formatText(viewModal.app?.deptReview || 'Pending')} />
                                <ViewField label="Department Status" value={formatText(viewModal.app?._supabaseData?.deptStatus || 'N/A')} />
                                <ViewField label="Faculty Status" value={formatText(viewModal.app?._supabaseData?.facultyStatus || 'N/A')} />
                                <ViewField label="Overall Status" value={formatText(viewModal.app?._supabaseData?.status || 'N/A')} />
                            </div>
                        </section>

                        {/* Research & Academic Information */}
                        <section>
                            <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Research & Academic Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <ViewField label="Research Topic" value={formatText(viewModal.app?.researchTopic)} />
                                <ViewField label="Guide Name" value={formatText(viewModal.app?.guideName)} />
                                <ViewField label="UG CGPA" value={viewModal.app?.cgpa?.ug || 'N/A'} />
                                <ViewField label="PG CGPA" value={viewModal.app?.cgpa?.pg || 'N/A'} />
                            </div>
                        </section>

                        {/* Documents & Links */}
                        <section>
                            <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Documents & Certificates</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ViewField label="Certificates Link" value={viewModal.app?.certificatesLink !== '#' ? viewModal.app?.certificatesLink : 'Not provided'} />
                                <div className="flex flex-col gap-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">View Documents</label>
                                    <button
                                        onClick={() => {
                                            if (viewModal.app?.certificatesLink && viewModal.app.certificatesLink !== '#') {
                                                window.open(viewModal.app.certificatesLink, '_blank', 'noopener');
                                            }
                                        }}
                                        disabled={!viewModal.app?.certificatesLink || viewModal.app.certificatesLink === '#'}
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                            viewModal.app?.certificatesLink && viewModal.app.certificatesLink !== '#'
                                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                        }`}
                                    >
                                        {viewModal.app?.certificatesLink && viewModal.app.certificatesLink !== '#' ? 'Open Documents' : 'No Documents'}
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
                        <button
                            onClick={() => setViewModal({ open: false, app: null })}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm"
                        >
                            Close
                        </button>
                    </div>
                </Modal>

                <MessageBox open={messageBox.open} message={messageBox.message} onClose={() => setMessageBox({ open: false, message: '' })} />
            </div>
        </div>
    );
}