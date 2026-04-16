import React, { createContext, useState, useEffect } from 'react';
import { fetchLoggedInDepartmentUser } from '../services/departmentService';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState('Applications');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  
  // Load logged-in user info on mount
  useEffect(() => {
    const loadUserInfo = async () => {
      setUserLoading(true);
      const { data, error } = await fetchLoggedInDepartmentUser();
      
      if (error) {
        console.error('Failed to load user info:', error);
        // Set fallback user data
        setCurrentUser({
          id: 'unknown',
          name: 'Unknown User',
          email: 'unknown@srmist.edu.in',
          role: 'department',
          faculty: 'N/A',
          department: 'N/A',
          avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
          notifications: []
        });
      } else if (data) {
        setCurrentUser({
          id: data.id,
          name: data.name,
          email: data.email,
          role: `HOD, ${data.department}`,
          faculty: data.faculty,
          department: data.department,
          departmentCode: data.departmentCode, // Add departmentCode from service
          phone: data.phone,
          avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
          notifications: []
        });
      }
      
      setUserLoading(false);
    };

    loadUserInfo();
  }, []);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  const [interviewEvaluators, setInterviewEvaluators] = useState([
    { id: 1, name: 'Evaluator 1', staffId: '', affiliation: '', panel: 1 },
    { id: 2, name: 'Evaluator 2', staffId: '', affiliation: '', panel: 1 },
    { id: 3, name: 'Evaluator 3', staffId: '', affiliation: '', panel: 1 }
  ]);
  const [questionPaperPreparers, setQuestionPaperPreparers] = useState([]);

  const [scholarList, setScholarList] = useState([]);
  const [questionPapers, setQuestionPapers] = useState([]);
  const [activeFilters, setActiveFilters] = useState({ 
    scholarType: 'All', 
    searchTerm: '', 
    sortDirection: 'asc', 
    status: 'All' 
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showScholarDetails, setShowScholarDetails] = useState(false);
  const [selectedScholar, setSelectedScholar] = useState(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showQuestionPaperModal, setShowQuestionPaperModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showEvaluatorModal, setShowEvaluatorModal] = useState(false);
  const [showPreparerModal, setShowPreparerModal] = useState(false);
  const [message, setMessage] = useState({ text: '', type: 'info', show: false });

  // Show message box
  const showMessage = (text, type = 'info', duration = 3000) => {
    setMessage({ text, type, show: true });
    setTimeout(() => {
      setMessage(prev => ({ ...prev, show: false }));
    }, duration);
  };

  // Toggle fullscreen for a specific element id (if provided) or the documentElement
  const toggleFullScreen = (targetId) => {
    const el = targetId ? document.getElementById(targetId) : document.documentElement;
    if (!document.fullscreenElement) {
      if (el && el.requestFullscreen) {
        el.requestFullscreen().catch(err => {
          showMessage(`Error attempting to enable full-screen mode: ${err.message}`, 'error');
        });
      } else {
        showMessage('Fullscreen is not supported for the requested element.', 'error');
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Handle tab change
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
  };

  // Helper function to refresh scholar data from backend
  const refreshScholarData = async () => {
    if (!currentUser?.faculty || !currentUser?.department) {
      console.log('⚠️ Cannot refresh scholar data - user faculty or department not available');
      return;
    }

    try {
      console.log('🔄 Refreshing scholar data from backend...');
      const { fetchScholarsForDepartmentUser } = await import('../services/departmentScholarService');
      
      const { data, error } = await fetchScholarsForDepartmentUser(
        currentUser.faculty,
        currentUser.department
      );

      if (!error && data) {
        console.log(`📥 Received ${data.length} scholars from backend`);
        
        // Transform and update scholar list with fresh backend data
        const transformedScholars = data.map((scholar, i) => {
          let verificationStatus = 'Pending';
          let forwarded = false;
          
          // Status is determined by dept_review column - this is the single source of truth
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
          
          console.log(`📋 Transforming scholar ${scholar.id}:`, {
            name: scholar.registered_name,
            dept_review: scholar.dept_review,
            query_resolved_dept: scholar.query_resolved_dept,
            dept_query: scholar.dept_query,
            verificationStatus,
            status: scholar.status
          });
          
          return {
            id: `sch${i + 1}`,
            regNo: scholar.application_no,
            name: scholar.registered_name,
            email: scholar.email,
            mobile: scholar.mobile_number || scholar.mobile || 'N/A',
            gender: scholar.gender || 'N/A',
            faculty: scholar.institution || '-',
            institution: scholar.institution || '-',
            program: scholar.program || scholar.specialization || 'N/A',
            specialization: scholar.department || scholar.specialization || scholar.program || 'N/A',
            certificatesLink: scholar.certificates || scholar.certificates_link || scholar.certificate_link || scholar.certificate || scholar.documents_link || scholar.document_link || scholar.docs_link || scholar.drive_link || '#',
            type: scholar.type || 'Full Time', // Add type field for mode display
            verificationStatus: verificationStatus,
            rejectionReason: scholar.reject_reason || null,
            approvalTimestamp: scholar.department_approval_date || scholar.department_forward_date || null,
            forwarded: forwarded,
            forwardingTimestamp: scholar.department_forward_date || null,
            deptReview: scholar.dept_review || 'Pending',
            deptStatus: scholar.dept_status, // Include dept_status from backend
            query_resolved_dept: scholar.query_resolved_dept, // Include query_resolved_dept from backend
            queryText: scholar.dept_query, // Include query text from backend
            queryTimestamp: scholar.query_timestamp, // Include query timestamp from backend
            queries: scholar.department_queries || [],
            _supabaseData: {
              originalId: scholar.id,
              status: scholar.status,
              facultyStatus: scholar.faculty_status,
              deptReview: scholar.dept_review,
              deptStatus: scholar.dept_status, // Include dept_status in supabase data
              query_resolved_dept: scholar.query_resolved_dept, // Include query_resolved_dept in supabase data
              dept_query: scholar.dept_query, // Include dept_query in supabase data
              query_timestamp: scholar.query_timestamp // Include query_timestamp in supabase data
            }
            // ... other fields would be added here in a real implementation
          };
        });

        setScholarList(transformedScholars);
        console.log('✅ Scholar data refreshed from backend');
        console.log('📊 Updated scholar list summary:', {
          total: transformedScholars.length,
          approved: transformedScholars.filter(s => s.deptReview === 'Approved').length,
          rejected: transformedScholars.filter(s => s.deptReview === 'Rejected').length,
          pending: transformedScholars.filter(s => !s.deptReview || s.deptReview === 'Pending').length
        });
      } else {
        console.error('❌ Error refreshing scholar data:', error);
      }
    } catch (err) {
      console.error('❌ Error refreshing scholar data:', err);
    }
  };

  // Handle scholar approval
  const handleApproveScholar = async (scholarId) => {
    const scholar = scholarList.find(s => s.id === scholarId);
    if (!scholar) {
      showMessage('Scholar not found', 'error');
      return;
    }

    try {
      // Import department service
      const { approveScholar } = await import('../services/departmentScholarService');
      
      // Get the original scholar ID from Supabase data
      const originalScholarId = scholar._supabaseData?.originalId || scholarId;
      const departmentCode = currentUser?.departmentCode || 'UNKNOWN';
      
      console.log(`🔄 Approving scholar ${originalScholarId} for department ${departmentCode}`);
      
      // Update in Supabase using updated service function
      const result = await approveScholar(originalScholarId, departmentCode, {
        approvedBy: currentUser?.name || 'Department HOD',
        notes: 'Approved through department portal'
      });

      if (result.error) {
        console.error('❌ Error approving scholar:', result.error);
        showMessage(`Failed to approve scholar: ${result.error?.message || 'Unknown error'}`, 'error');
        return;
      }

      console.log('✅ Scholar approved successfully:', result.data);

      // Update local state immediately for better UX (optimistic update)
      const updates = {
        verificationStatus: 'Approved',
        approvalTimestamp: new Date().toISOString(),
        deptReview: 'Approved', // This drives the status display and button states
        deptStatus: result.data?.dept_status, // Include dept_status from service response
        _supabaseData: {
          ...scholar._supabaseData,
          deptReview: 'Approved',
          deptStatus: result.data?.dept_status // Include dept_status in supabase data
        }
      };
      
      setScholarList(prev => 
        prev.map(s => 
          s.id === scholarId 
            ? { ...s, ...updates } 
            : s
        )
      );
      
      showMessage('Scholar approved successfully!', 'success');
      
      // Refresh data from backend to ensure UI is in sync
      setTimeout(() => {
        refreshScholarData();
      }, 1000);
      
    } catch (err) {
      console.error('❌ Exception approving scholar:', err);
      showMessage('Failed to approve scholar', 'error');
    }
  };

  // Handle scholar rejection
  const handleRejectScholar = async (scholarId, reason) => {
    const scholar = scholarList.find(s => s.id === scholarId);
    if (!scholar) {
      showMessage('Scholar not found', 'error');
      return;
    }

    if (!reason || !reason.trim()) {
      showMessage('Rejection reason is required', 'error');
      return;
    }

    try {
      // Import department service
      const { rejectScholar } = await import('../services/departmentScholarService');
      
      // Get the original scholar ID from Supabase data
      const originalScholarId = scholar._supabaseData?.originalId || scholarId;
      const departmentCode = currentUser?.departmentCode || 'UNKNOWN';
      
      console.log(`🔄 Rejecting scholar ${originalScholarId} for department ${departmentCode}`);
      
      // Update in Supabase using updated service function
      const result = await rejectScholar(originalScholarId, departmentCode, reason.trim(), {
        rejectedBy: currentUser?.name || 'Department HOD'
      });

      if (result.error) {
        console.error('❌ Error rejecting scholar:', result.error);
        showMessage(`Failed to reject scholar: ${result.error?.message || 'Unknown error'}`, 'error');
        return;
      }

      console.log('✅ Scholar rejected successfully:', result.data);

      // Update local state immediately for better UX (optimistic update)
      const updates = {
        verificationStatus: 'Rejected',
        rejectionReason: reason,
        rejectionTimestamp: new Date().toISOString(),
        deptReview: 'Rejected', // This drives the status display and button states
        _supabaseData: {
          ...scholar._supabaseData,
          deptReview: 'Rejected'
        }
      };
      
      setScholarList(prev => 
        prev.map(s => 
          s.id === scholarId 
            ? { ...s, ...updates } 
            : s
        )
      );
      
      showMessage('Scholar rejected successfully!', 'success');
      
      // Refresh data from backend to ensure UI is in sync
      setTimeout(() => {
        refreshScholarData();
      }, 1000);
      
    } catch (err) {
      console.error('❌ Exception rejecting scholar:', err);
      showMessage('Failed to reject scholar', 'error');
    }
  };

  // Handle scholar query
  const handleQueryScholar = async (scholarId, queryText) => {
    const scholar = scholarList.find(s => s.id === scholarId);
    if (!scholar) {
      showMessage('Scholar not found', 'error');
      return;
    }

    if (!queryText || !queryText.trim()) {
      showMessage('Query text is required', 'error');
      return;
    }

    try {
      // Import department service
      const { addQueryToScholarDeptReview } = await import('../services/departmentScholarService');
      
      // Get the original scholar ID from Supabase data
      const originalScholarId = scholar._supabaseData?.originalId || scholarId;
      const departmentCode = currentUser?.departmentCode || 'UNKNOWN';
      
      console.log(`🔄 Adding query to scholar ${originalScholarId} for department ${departmentCode}`);
      
      // Update in Supabase using new service function
      const result = await addQueryToScholarDeptReview(originalScholarId, queryText.trim(), departmentCode, {
        createdBy: currentUser?.name || 'Department HOD'
      });

      if (!result.success) {
        console.error('❌ Error adding query to scholar:', result.error);
        showMessage(`Failed to add query: ${result.error?.message || 'Unknown error'}`, 'error');
        return;
      }

      console.log('✅ Query added successfully:', result.data);

      // Update local state immediately for better UX (optimistic update)
      const newQuery = {
        id: `query_${Date.now()}`,
        text: queryText.trim(),
        timestamp: new Date().toISOString(),
        createdBy: currentUser?.name || 'Department HOD'
      };

      const updates = {
        queries: [...(scholar.queries || []), newQuery],
        deptReview: 'Query', // This drives the status display and button states
        queryText: queryText.trim(), // Store the query text
        queryTimestamp: new Date().toISOString(), // Store the query timestamp
        query_resolved_dept: null, // Reset query resolved dept status when new query is sent
        _supabaseData: {
          ...scholar._supabaseData,
          deptReview: 'Query',
          dept_query: queryText.trim(),
          query_timestamp: new Date().toISOString(),
          query_resolved_dept: null
        }
      };
      
      setScholarList(prev => 
        prev.map(s => 
          s.id === scholarId 
            ? { ...s, ...updates } 
            : s
        )
      );
      
      showMessage('Query sent successfully!', 'success');
      
      // Refresh data from backend to ensure UI is in sync
      setTimeout(() => {
        refreshScholarData();
      }, 1000);
      
    } catch (err) {
      console.error('❌ Exception adding query to scholar:', err);
      showMessage('Failed to send query', 'error');
    }
  };

  // Handle scholar forwarding
  const handleForwardScholar = async (ids) => {
    if (!ids || ids.length === 0) {
      showMessage('No scholars selected for forwarding', 'error');
      return;
    }

    try {
      // Import department service
      const { forwardScholarFromDepartment } = await import('../services/departmentScholarService');
      
      const departmentCode = currentUser?.departmentCode || 'UNKNOWN';
      const forwardedScholars = [];
      
      // Forward each scholar to Supabase
      for (const scholarId of ids) {
        const scholar = scholarList.find(s => s.id === scholarId);
        if (scholar) {
          const originalScholarId = scholar._supabaseData?.originalId || scholarId;
          
          console.log(`🔄 Forwarding scholar ${originalScholarId} from department ${departmentCode}`);
          
          const { data, error } = await forwardScholarFromDepartment(originalScholarId, departmentCode, 'research_coordinator', {
            forwardedBy: currentUser?.name || 'Department HOD',
            notes: 'Forwarded after department approval'
          });

          if (error) {
            console.error(`❌ Error forwarding scholar ${originalScholarId}:`, error);
            showMessage(`Failed to forward scholar ${scholar.name}`, 'error');
            continue;
          }

          forwardedScholars.push(scholarId);
          console.log(`✅ Scholar ${originalScholarId} forwarded successfully`);
        }
      }

      if (forwardedScholars.length > 0) {
        // Update local state for successfully forwarded scholars (optimistic update)
        // Status display will be based on dept_review column
        const updates = {
          forwarded: true,
          forwardingTimestamp: new Date().toISOString(),
          deptReview: 'Approved', // Forwarded scholars must be approved first
          verificationStatus: 'Approved', // Keep consistent with dept_review
          _supabaseData: {
            ...scholarList.find(s => forwardedScholars.includes(s.id))?._supabaseData,
            deptReview: 'Approved'
          }
        };
        
        setScholarList(prev =>
          prev.map(scholar => {
            if (forwardedScholars.includes(scholar.id)) {
              // Update scholar status - data is backend-connected
              return { ...scholar, ...updates };
            }
            return scholar;
          })
        );
        
        showMessage(
          forwardedScholars.length > 1
            ? `${forwardedScholars.length} scholar(s) forwarded successfully.`
            : 'Scholar forwarded successfully.',
          'success'
        );
        
        // Data refresh will get the updated status from Supabase
      }
    } catch (err) {
      console.error('❌ Exception forwarding scholars:', err);
      showMessage('Failed to forward scholars', 'error');
    }
  };

  // Open scholar details
  const openScholarDetails = (scholar) => {
    setSelectedScholar(scholar);
    setShowScholarDetails(true);
  };

  // Close all modals
  const closeAllModals = () => {
    setShowSettings(false);
    setShowScholarDetails(false);
    setShowRejectionModal(false);
    setShowQuestionPaperModal(false);
    setShowConfirmationModal(false);
    setShowFilterModal(false);
    setShowEvaluatorModal(false);
    setShowPreparerModal(false);
  };

  // Handle keyboard events for accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeAllModals();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        // State
        activeTab,
        sidebarCollapsed,
        currentUser,
        userLoading,
        searchQuery,
        interviewEvaluators,
        questionPaperPreparers,
        scholarList,
        questionPapers,
        activeFilters,
        showSettings,
        showScholarDetails,
        selectedScholar,
        showRejectionModal,
        showQuestionPaperModal,
        showConfirmationModal,
        showFilterModal,
        showEvaluatorModal,
        showPreparerModal,
        message,
        
        // Actions
        toggleSidebar,
        setActiveTab: handleTabChange,
        setSearchQuery,
        setCurrentUser,
        setInterviewEvaluators,
        setQuestionPaperPreparers,
        setScholarList,
        setQuestionPapers,
        setActiveFilters,
        showMessage,
        toggleFullScreen,
        setShowSettings,
        setShowScholarDetails,
        setSelectedScholar,
        setShowRejectionModal,
        setShowQuestionPaperModal,
        setShowConfirmationModal,
        setShowFilterModal,
        setShowEvaluatorModal,
        setShowPreparerModal,
        handleApproveScholar,
        handleRejectScholar,
        handleQueryScholar,
        handleForwardScholar,
        refreshScholarData, // Add refresh function
        openScholarDetails,
        closeAllModals
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = React.useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
