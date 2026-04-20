import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import './App.css';

// Supabase
import { supabase } from '../../supabaseClient';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import DepartmentControl from './components/DepartmentControl';
import ScholarManagement from './components/ScholarManagement';
import AdminForwardPage from './components/AdminForwardPage';
import QueryScholar from './components/QueryScholar';
import ScholarExamDistribution from './components/ScholarExamDistribution';
import WorkflowPage from './components/WorkflowPage';
import Results from './components/Results';
import QuestionPapers from './components/QuestionPapers';

// Modals
import SettingsModal from './components/Modals/SettingsModal';
import MessageBox from './components/Modals/MessageBox';

// Data and Utils
import { appData, cgpaEligibilityCriteria, facultyAcronyms } from './data/appData';
import { generateUniqueId, getFacultyDetails, getFacultyByDepartmentFromAll, checkCGPAEligibility } from './utils/helpers';

// Supabase Services
import {
  fetchFacultyScholars,
  fetchAdminForwardScholars,
  fetchQueryScholars,
  fetchFacultyExaminationRecords,
  fetchFacultyQuestionPapers,
  fetchDepartments
} from './services/supabaseService';
import { fetchDepartments as fetchAllDepartments } from '../../services/departmentService';

// Context for global state
const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

// Theme management moved outside to prevent recreation on every render
const themes = {
  default: { name: 'SRM Blue', colors: { '--primary-blue': '#0d47a1', '--secondary-blue': '#1e88e5' } },
  emerald: { name: 'Emerald Sea', colors: { '--primary-blue': '#065f46', '--secondary-blue': '#10b981' } },
  indigo: { name: 'Royal Indigo', colors: { '--primary-blue': '#4338ca', '--secondary-blue': '#818cf8' } },
  crimson: { name: 'Crimson Red', colors: { '--primary-blue': '#991b1b', '--secondary-blue': '#f87171' } }
};

function App() {
  const location = useLocation();

  // Map routes to tab names
  const getTabFromRoute = (pathname) => {
    // Remove /foet prefix if present
    const cleanPath = pathname.replace(/^\/foet/, '') || '/';
    const routeMap = {
      '/': 'Dashboard',
      '/dashboard': 'Dashboard',
      '/departments': 'DepartmentControl',
      '/scholar-management': 'ScholarManagement',
      '/admin-forward': 'AdminForward',
      '/query-scholar': 'QueryScholar',
      '/examination': 'ScholarExamDistribution',
      '/workflow': 'SubmissionWorkflow',
      '/foet-result': 'Results',
      '/question-papers': 'QuestionPapers'
    };
    return routeMap[cleanPath] || 'Dashboard';
  };

  // Global State
  const [selectedCampusId] = useState('RMP');
  const [selectedFacultyId] = useState('FOET');
  const [currentActiveTab, setCurrentActiveTab] = useState(getTabFromRoute(location.pathname));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Filter and Sort States
  const [departmentSortOrder, setDepartmentSortOrder] = useState('asc');
  const [departmentFilters, setDepartmentFilters] = useState({ departmentName: 'All' });
  const [examSortOrder, setExamSortOrder] = useState('asc');
  const [examFilters, setExamFilters] = useState({ department: 'All', status: 'All' });
  const [workflowSortOrder, setWorkflowSortOrder] = useState('asc');
  const [workflowFilters, setWorkflowFilters] = useState({
    mode: 'All',
    department: 'All',
    coordinatorStatus: 'All',
    adminDecision: 'All',
    vivaEvaluator: 'All'
  });
  const [scholarSortOrder, setScholarSortOrder] = useState('asc');
  const [scholarFilters, setScholarFilters] = useState({ specialization: 'All', mode: 'All' });

  // Modal States
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [messageBoxData, setMessageBoxData] = useState({
    show: false,
    title: '',
    message: '',
    type: 'alert',
    onConfirm: null
  });

  // User Settings
  const [coordinatorName, setCoordinatorName] = useState('Research Coordinator');
  const [coordinatorImage, setCoordinatorImage] = useState('https://placehold.co/40x40/EBF4FF/1D4ED8?text=RC');
  const [currentTheme, setCurrentTheme] = useState('default');
  const [coordinatorInfo, setCoordinatorInfo] = useState(null);
  const [assignedFaculty, setAssignedFaculty] = useState(null);

  // Data State (you might want to use a more sophisticated state management solution for production)
  const [data, setData] = useState(appData);

  // Supabase Data States
  const [scholarsData, setScholarsData] = useState([]);
  const [adminScholarsData, setAdminScholarsData] = useState([]);
  const [queryScholarsData, setQueryScholarsData] = useState([]);
  const [examinationsData, setExaminationsData] = useState([]);
  const [questionPapersData, setQuestionPapersData] = useState([]);
  const [departmentsData, setDepartmentsData] = useState([]);
  const [facultiesData, setFacultiesData] = useState([]);
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(true);

  const applyTheme = useCallback((themeName) => {
    const theme = themes[themeName];
    if (!theme) return;

    Object.entries(theme.colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });

    setCurrentTheme(themeName);
    localStorage.setItem('srm-coordinator-theme', themeName);
  }, []);

  // 1. Initial System Load (Theme & Local Settings)
  useEffect(() => {
    const savedName = localStorage.getItem('srm-coordinator-name');
    const savedImage = localStorage.getItem('srm-coordinator-image');
    const savedTheme = localStorage.getItem('srm-coordinator-theme') || 'default';

    if (savedName) setCoordinatorName(savedName);
    if (savedImage) setCoordinatorImage(savedImage);
    applyTheme(savedTheme);
  }, [applyTheme]);

  // 2. Auth & Session Management
  useEffect(() => {
    const getTabCoordinatorInfo = () => {
      const stored = sessionStorage.getItem('foet_coordinator_info');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (err) {
          return null;
        }
      }
      return null;
    };

    const loadCoordinatorInfo = async (email) => {
      try {
        const { data: coordinatorData, error } = await supabase
          .from('coordinators')
          .select('*')
          .eq('email', email)
          .eq('status', 'Active')
          .single();

        if (!error && coordinatorData) {
          const info = {
            name: coordinatorData.name,
            email: coordinatorData.email,
            faculty: coordinatorData.assigned_faculty,
            campus: coordinatorData.campus
          };

          sessionStorage.setItem('foet_coordinator_info', JSON.stringify(info));
          sessionStorage.setItem('foet_assigned_faculty', coordinatorData.assigned_faculty);

          setCoordinatorInfo(info);
          setAssignedFaculty(coordinatorData.assigned_faculty);
          setCoordinatorName(coordinatorData.name);
        }
      } catch (err) {
        console.error('Exception loading coordinator info:', err);
      }
    };

    // Always re-fetch from DB to ensure the correct faculty is loaded for the
    // currently authenticated user — never rely solely on the sessionStorage cache,
    // which may belong to a previously logged-in coordinator.
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        loadCoordinatorInfo(user.email);
      } else {
        // No active session — fall back to cached info if available
        const tabCoordinator = getTabCoordinatorInfo();
        if (tabCoordinator) {
          setCoordinatorInfo(tabCoordinator);
          setAssignedFaculty(tabCoordinator.faculty);
          setCoordinatorName(tabCoordinator.name);
        }
      }
    });

    // Auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const tabInfo = getTabCoordinatorInfo();
        if (!tabInfo || tabInfo.email === session.user.email) {
          loadCoordinatorInfo(session.user.email);
        }
      } else if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('foet_coordinator_info');
        sessionStorage.removeItem('foet_assigned_faculty');
        window.location.pathname = '/';
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load Supabase data on component mount
  useEffect(() => {
    const loadSupabaseData = async () => {
      setIsLoadingSupabase(true);
      try {
        // Fetch all required data from Supabase
        const [scholarsRes, adminScholarsRes, queryScholarsRes, examsRes, qpRes, deptRes, allDeptRes] = await Promise.all([
          fetchFacultyScholars(assignedFaculty),
          fetchAdminForwardScholars(assignedFaculty),
          fetchQueryScholars(assignedFaculty),
          fetchFacultyExaminationRecords(assignedFaculty),
          fetchFacultyQuestionPapers(assignedFaculty),
          fetchDepartments(assignedFaculty),
          fetchAllDepartments() // Fetch all departments for transfer functionality
        ]);

        // Handle scholars data - already filtered by faculty in the service
        if (scholarsRes.data) {
          setScholarsData(scholarsRes.data);
          console.log(`Loaded ${scholarsRes.data.length} scholars for ${assignedFaculty}`);
        }

        // Handle admin scholars data - filtered by dept_status
        if (adminScholarsRes.data) {
          setAdminScholarsData(adminScholarsRes.data);
          console.log(`Loaded ${adminScholarsRes.data.length} admin scholars for ${assignedFaculty}`);
        }

        // Handle query scholars data - filtered by query_resolved and query_faculty
        if (queryScholarsRes.data) {
          setQueryScholarsData(queryScholarsRes.data);
          console.log(`Loaded ${queryScholarsRes.data.length} query scholars for ${assignedFaculty}`);
        }

        // Handle examinations data - already filtered by faculty in the service
        if (examsRes.data) {
          setExaminationsData(examsRes.data);
          console.log(`Loaded ${examsRes.data.length} examination records for ${assignedFaculty}`);
        }

        // Handle question papers data - already filtered by faculty in the service
        if (qpRes.data) {
          setQuestionPapersData(qpRes.data);
          console.log(`Loaded ${qpRes.data.length} question papers for ${assignedFaculty}`);
        }

        // Handle departments data - already filtered by faculty in the service
        if (deptRes.data) {
          setDepartmentsData(deptRes.data);
          console.log(`Loaded ${deptRes.data.length} departments for ${assignedFaculty}`);
        }

        // Handle all departments data for transfer functionality
        if (allDeptRes.data) {
          // Group departments by faculty (same logic as admin)
          const grouped = {};

          allDeptRes.data.forEach(dept => {
            if (!grouped[dept.faculty]) {
              grouped[dept.faculty] = {
                id: Object.keys(grouped).length + 1,
                name: dept.faculty,
                departments: []
              };
            }
            grouped[dept.faculty].departments.push({
              id: dept.id,
              name: dept.department_name,
              hod: dept.head_of_department || 'N/A',
              staffCount: 0
            });
          });

          // Convert to array and set state
          const facultiesArray = Object.values(grouped);
          setFacultiesData(facultiesArray);
          console.log('Loaded faculties for transfer functionality:', facultiesArray);
        }
      } catch (err) {
        console.error('Error loading Supabase data:', err);
      } finally {
        setIsLoadingSupabase(false);
      }
    };

    // Only load data when assignedFaculty is available
    if (assignedFaculty) {
      loadSupabaseData();
    }
  }, [assignedFaculty]);

  // Realtime subscription for scholar_applications changes
  useEffect(() => {
    if (!assignedFaculty) return;

    console.log('Setting up realtime subscription for scholar_applications...');

    // Subscribe to changes on scholar_applications table
    const subscription = supabase
      .channel('scholar_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'scholar_applications'
        },
        (payload) => {
          console.log('📡 Database change detected:', payload.eventType, payload);

          // Refresh data whenever any change occurs
          const refreshAfterChange = async () => {
            console.log('🔄 Refreshing data after database change...');

            try {
              const [scholarsRes, adminScholarsRes, queryScholarsRes] = await Promise.all([
                fetchFacultyScholars(assignedFaculty),
                fetchAdminForwardScholars(assignedFaculty),
                fetchQueryScholars(assignedFaculty)
              ]);

              if (scholarsRes.data) setScholarsData(scholarsRes.data);
              if (adminScholarsRes.data) setAdminScholarsData(adminScholarsRes.data);
              if (queryScholarsRes.data) setQueryScholarsData(queryScholarsRes.data);

              console.log('✓ Data refreshed after change');
            } catch (err) {
              console.error('Error refreshing after database change:', err);
            }
          };

          refreshAfterChange();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up realtime subscription...');
      subscription.unsubscribe();
    };
  }, [assignedFaculty]);

  // Message Box function
  const showMessageBox = (message, type = 'alert', onConfirm = null) => {
    setMessageBoxData({
      show: true,
      title: type === 'confirm' ? 'Please Confirm' : 'Notification',
      message,
      type,
      onConfirm
    });
  };

  const closeMessageBox = () => {
    setMessageBoxData(prev => ({ ...prev, show: false }));
  };

  const handleMessageBoxConfirm = (confirmed) => {
    if (messageBoxData.onConfirm) {
      messageBoxData.onConfirm(confirmed);
    }
    closeMessageBox();
  };

  // Save settings
  const saveSettings = (newName, newImageFile) => {
    if (newName) {
      setCoordinatorName(newName);
      localStorage.setItem('srm-coordinator-name', newName);
    }

    if (newImageFile) {
      if (newImageFile.size < 2 * 1024 * 1024 && newImageFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function (e) {
          setCoordinatorImage(e.target.result);
          localStorage.setItem('srm-coordinator-image', e.target.result);
        };
        reader.readAsDataURL(newImageFile);
        return true;
      } else {
        return false;
      }
    }
    return true;
  };

  // Fullscreen functionality
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.log('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.log('Error attempting to exit fullscreen:', err);
      });
    }
  };

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isInFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isInFullscreen);

      // Add/remove CSS class to body for styling
      if (isInFullscreen) {
        document.body.classList.add('fullscreen-mode');
      } else {
        document.body.classList.remove('fullscreen-mode');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Context value
  const contextValue = {
    // Global state
    selectedCampusId,
    selectedFacultyId,
    currentActiveTab,
    setCurrentActiveTab,
    isFullscreen,
    toggleFullscreen,
    sidebarCollapsed,
    setSidebarCollapsed,

    // Filter and sort states
    departmentSortOrder,
    setDepartmentSortOrder,
    departmentFilters,
    setDepartmentFilters,
    examSortOrder,
    setExamSortOrder,
    examFilters,
    setExamFilters,
    workflowSortOrder,
    setWorkflowSortOrder,
    workflowFilters,
    setWorkflowFilters,
    scholarSortOrder,
    setScholarSortOrder,
    scholarFilters,
    setScholarFilters,

    // User settings
    coordinatorName,
    coordinatorImage,
    currentTheme,
    themes,
    applyTheme,
    saveSettings,

    // Coordinator info
    coordinatorInfo,
    assignedFaculty,

    // Data
    data,
    setData,

    // Supabase Data
    scholarsData,
    setScholarsData,
    adminScholarsData,
    setAdminScholarsData,
    queryScholarsData,
    setQueryScholarsData,
    examinationsData,
    setExaminationsData,
    questionPapersData,
    setQuestionPapersData,
    departmentsData,
    setDepartmentsData,
    facultiesData,
    setFacultiesData,
    isLoadingSupabase,

    // Refresh functions for updating data after mutations
    refreshScholarsData: async () => {
      if (!assignedFaculty) return;
      console.log('Refreshing scholars data after mutation...');

      try {
        const [scholarsRes, adminScholarsRes, queryScholarsRes] = await Promise.all([
          fetchFacultyScholars(assignedFaculty),
          fetchAdminForwardScholars(assignedFaculty),
          fetchQueryScholars(assignedFaculty)
        ]);

        if (scholarsRes.data) {
          setScholarsData(scholarsRes.data);
          console.log(`✓ Refreshed ${scholarsRes.data.length} scholars`);
        }

        if (adminScholarsRes.data) {
          setAdminScholarsData(adminScholarsRes.data);
          console.log(`✓ Refreshed ${adminScholarsRes.data.length} admin scholars`);
        }

        if (queryScholarsRes.data) {
          setQueryScholarsData(queryScholarsRes.data);
          console.log(`✓ Refreshed ${queryScholarsRes.data.length} query scholars`);
        }

        return true;
      } catch (err) {
        console.error('Error refreshing scholars data:', err);
        return false;
      }
    },

    // Utility functions
    showMessageBox,
    generateUniqueId,
    getFacultyDetails: () => getFacultyDetails(selectedCampusId, selectedFacultyId, data),
    getFacultyByDepartmentFromAll: (departmentName) => getFacultyByDepartmentFromAll(departmentName, selectedCampusId, data),
    checkCGPAEligibility: (scholar) => checkCGPAEligibility(scholar, selectedCampusId, selectedFacultyId, cgpaEligibilityCriteria),

    // Constants
    facultyAcronyms,
    cgpaEligibilityCriteria
  };

  // Update active tab when route changes
  useEffect(() => {
    setCurrentActiveTab(getTabFromRoute(location.pathname));
  }, [location.pathname]);


  return (
    <AppContext.Provider value={contextValue}>
      <div className="sidebar-layout-container">
        <Sidebar />

        {/* Main Content Area */}
        <main className={`main-content-area ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <Header />
          <div className="content-wrapper">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/departments" element={<DepartmentControl />} />
              <Route path="/scholar-management" element={<ScholarManagement />} />
              <Route path="/admin-forward" element={<AdminForwardPage />} />
              <Route path="/query-scholar" element={<QueryScholar />} />
              <Route path="/examination" element={<ScholarExamDistribution />} />
              <Route path="/workflow" element={<WorkflowPage />} />
              <Route path="/results" element={<Results />} />
              <Route path="/foet-result" element={<Results />} />
              <Route path="/question-papers" element={<QuestionPapers />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />

      <MessageBox
        {...messageBoxData}
        onClose={closeMessageBox}
        onConfirm={handleMessageBoxConfirm}
      />
    </AppContext.Provider>
  );
}

export default App;