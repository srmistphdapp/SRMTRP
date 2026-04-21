import React, { useState, useEffect } from 'react';
import './DirectorPortal.css';
import {
  MdDashboard,
  MdPeople,
  MdSecurity,
  MdBusiness,
  MdSchool,
  MdAssignment,
  MdSupervisorAccount,
  MdDescription,
  MdEmojiEvents,
  MdAccountTree,
  MdPieChart,
  MdLogout,
  MdLocationCity,
  MdAdminPanelSettings,
} from 'react-icons/md';
import { supabaseAuth } from '../../login/supabaseAuth';
import { fetchAdminByEmail } from '../../../services/adminService';

// Double check that every component below uses "export default" in its file!
import Dashboard from './components/Dashboard';
import AdminManagement from './components/AdminManagement';
import Coordinators from './components/Coordinators';
import Faculties from './components/Faculties';
import ScholarManagement from './components/ScholarManagement';
import VerifiedScholars from './components/VerifiedScholars';
import HallTicket from './components/HallTicket';
import Examination from './components/Examination';
import Supervisors from './components/Supervisors';
import QuestionPapers from './components/QuestionPapers';
import Result from './components/Result';
import WorkflowScholarAdmin from './components/WorkflowScholarAdmin';
import WorkflowExamination from './components/WorkflowExamination';
import PartTimeSplit from './components/PartTimeSplit';
import TransferredScholars from './components/TransferredScholars';


const DirectorPortal = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [messageBox, setMessageBox] = useState({ show: false, text: '', type: 'info' });
  const [modals, setModals] = useState({});
  const [selectedCampus, setSelectedCampus] = useState('Trichy');
  const [hasActiveModal, setHasActiveModal] = useState(false);
  const [scholarSubmenuOpen, setScholarSubmenuOpen] = useState(false);
  const [workflowSubmenuOpen, setWorkflowSubmenuOpen] = useState(false); // NEW: Workflow dropdown state
  const [directorInfo, setDirectorInfo] = useState(null);
  const [loadingDirector, setLoadingDirector] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [previousSidebarState, setPreviousSidebarState] = useState(false);

  // Auto-open Scholar Administration submenu when on those pages
  useEffect(() => {
    if (activeTab === 'scholarManagement' || activeTab === 'verifiedScholars') {
      setScholarSubmenuOpen(true);
    }
  }, [activeTab]);

  // Fetch director info on component mount and validate role
  useEffect(() => {
    const fetchDirectorInfo = async () => {
      try {
        const user = await supabaseAuth.getCurrentUser();
        console.log('Current director user:', user);

        // Check if this tab was logged in as director (using per-tab sessionStorage)
        const storedRole = sessionStorage.getItem('userRole');
        const storedEmail = sessionStorage.getItem('userEmail');

        // If no role stored in this tab, or role is not 'director', redirect to login
        if (!storedRole || storedRole !== 'director') {
          console.warn('Session role mismatch: expected "director", got "' + storedRole + '". Redirecting to login.');
          window.location.href = '/login';
          return;
        }

        // Verify the Supabase session matches the stored email for this tab
        if (user?.email && storedEmail && user.email.toLowerCase() !== storedEmail) {
          console.warn('Session was overwritten by another tab. Expected:', storedEmail, 'Got:', user.email);
          // The Supabase session was overwritten by another tab login
          // Show the stored role info instead of the mismatched Supabase session
          setDirectorInfo({
            name: 'Director',
            email: storedEmail,
            role: 'Director',
            campus: 'Trichy'
          });
          setLoadingDirector(false);
          return;
        }

        if (user?.email === 'director@srmtrp.edu.in') {
          setDirectorInfo({
            name: 'Director',
            email: 'director@srmtrp.edu.in',
            role: 'Director',
            campus: 'Trichy'
          });
        } else if (storedRole === 'director' && storedEmail) {
          // Fallback: use stored session info if Supabase session was overwritten
          setDirectorInfo({
            name: 'Director',
            email: storedEmail,
            role: 'Director',
            campus: 'Trichy'
          });
        }
      } catch (error) {
        console.error('Error fetching director info:', error);
      } finally {
        setLoadingDirector(false);
      }
    };

    fetchDirectorInfo();

    // Listen for auth state changes to detect session swaps from other tabs
    const subscription = supabaseAuth.onAuthStateChange((event, session) => {
      const storedRole = sessionStorage.getItem('userRole');
      const storedEmail = sessionStorage.getItem('userEmail');

      if (event === 'SIGNED_OUT') {
        // Only redirect if this tab's role was director
        if (storedRole === 'director') {
          sessionStorage.removeItem('userRole');
          sessionStorage.removeItem('userEmail');
          window.location.href = '/login';
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // If session changed to a different user, keep showing director's stored info
        if (session?.user?.email && storedEmail && session.user.email.toLowerCase() !== storedEmail) {
          console.log('Auth state changed to different user in another tab, maintaining director context');
          // Don't update the director info - keep the original
        }
      }
    });

    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Sample data structure
  const [appData] = useState({
    RMP: {
      name: "Trichy",
      adminList: [
        { id: 'admin1', name: 'Jaikumar', email: 'ad1@srmist.edu.in', role: 'Admin', campus: 'Trichy' },
      ],
      faculties: [
        {
          id: 'FOET',
          name: "Faculty of Engineering & Technology",
          modeOfStudy: "Full-time/Part-time",
          departments: [
            { id: 'MECH-RMP', name: "Mechanical Engineering", hod: "Dr. M. Kumar", hodEmail: "hod.mech@srmrmp.edu.in", contact: "9876543210", staffCount: 15, departmentStaff: [] },
            { id: 'CSE-RMP', name: "Computer Science and Engineering", hod: "Dr. E. Poovammal", hodEmail: "hod.cse@srmrmp.edu.in", contact: "9876543214", staffCount: 20, departmentStaff: [] }
          ]
        },
        {
          id: 'FSH',
          name: "Faculty of Science & Humanities",
          modeOfStudy: "Full-time/Part-time",
          departments: [
            { id: 'COMMERCE-SH', name: "Commerce", hod: "Dr. S. Rajesh", hodEmail: "hod.commerce@srmrmp.edu.in", contact: "9876543221", staffCount: 8, departmentStaff: [] },
            { id: 'VISCOM-SH', name: "Visual Communication", hod: "Dr. M. Priyanka", hodEmail: "hod.viscom@srmrmp.edu.in", contact: "9876543222", staffCount: 6, departmentStaff: [] }
          ]
        }
      ],
      coordinatorList: [
        { id: 'coord1', name: 'Umesh Shankar', email: 'coordinator1@srmist.edu.in', assignedFaculty: 'Faculty of Science & Humanities' },
        { id: 'coord2', name: 'Adithya Raj', email: 'coordinator2@srmist.edu.in', assignedFaculty: 'Faculty of Engineering & Technology' }
      ],
      scholarList: []
    }
  });

  const showMessage = (text, type = 'info') => {
    setMessageBox({ show: true, text, type });
  };

  const closeMessage = () => {
    setMessageBox({ show: false, text: '', type: 'info' });
  };

  const openModal = (modalId) => {
    setModals(prev => ({ ...prev, [modalId]: true }));
  };

  const closeModal = (modalId) => {
    setModals(prev => ({ ...prev, [modalId]: false }));
  };

  const toggleSidebar = () => {
    // Only allow toggle when no modal is active
    if (!hasActiveModal) {
      const newState = !isSidebarMinimized;
      setIsSidebarMinimized(newState);
      // Update the previous state immediately for future modal operations
      setPreviousSidebarState(newState);
    }
  };

  const handleModalStateChange = (isModalOpen) => {
    if (isModalOpen) {
      // Store current sidebar state before hiding
      setPreviousSidebarState(isSidebarMinimized);
      setHasActiveModal(true);
      // Sidebar will be completely hidden via CSS when hasActiveModal is true
    } else {
      // Restore previous sidebar state when modal closes
      setHasActiveModal(false);
      // Restore the sidebar state immediately
      setIsSidebarMinimized(previousSidebarState);
    }
  };

  // Handle logout confirmation
  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      // Clear per-tab session info
      sessionStorage.removeItem('userRole');
      sessionStorage.removeItem('userEmail');
      await supabaseAuth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      sessionStorage.removeItem('userRole');
      sessionStorage.removeItem('userEmail');
      window.location.href = '/login';
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const renderTabContent = () => {
    const scrollableComponents = [
      'dashboard', 'coordinators', 'departments', 'adminManagement', 'supervisors',
      'questionPapers', 'result', 'workflowScholarAdmin', 'workflowExamination', 'partTimeSplit', 'scholarManagement', 'verifiedScholars', 'transferredScholars', 'hallTicket'    
    ];

    const needsScroll = scrollableComponents.includes(activeTab);

    let content;
    switch (activeTab) {
      case 'dashboard':
        content = <Dashboard appData={appData} />;
        break;
      case 'coordinators':
        content = <Coordinators appData={appData} openModal={openModal} onModalStateChange={handleModalStateChange} />;
        break;
      case 'adminManagement':
        content = <AdminManagement appData={appData} openModal={openModal} onModalStateChange={handleModalStateChange} />;
        break;
      case 'departments':
        content = <Faculties appData={appData} openModal={openModal} onModalStateChange={handleModalStateChange} />;
        break;
      case 'scholarManagement':
        content = <ScholarManagement
          appData={appData}
          openModal={openModal}
          isSidebarMinimized={isSidebarMinimized}
          onFullscreenChange={(isFs) => setIsFullscreen(isFs)}
          onModalStateChange={handleModalStateChange}
        />;
        break;
      case 'verifiedScholars':
        content = <VerifiedScholars
          appData={appData}
          openModal={openModal}
          isSidebarMinimized={isSidebarMinimized}
          onFullscreenChange={(isFs) => setIsFullscreen(isFs)}
          onModalStateChange={handleModalStateChange}
        />;
        break;
      case 'transferredScholars':
        content = <TransferredScholars
          onModalStateChange={handleModalStateChange}
        />;
        break;
      case 'hallTicket':
        content = <HallTicket
          appData={appData}
          onFullscreenChange={(isFs) => setIsFullscreen(isFs)}
          onModalStateChange={handleModalStateChange}
          isSidebarMinimized={isSidebarMinimized}
        />;
        break;
      case 'examination':
        content = (
          <Examination
            appData={appData}
            onFullscreenChange={(isFs) => setIsFullscreen(isFs)}
            onModalStateChange={handleModalStateChange}
            isSidebarClosed={isSidebarMinimized} // Prop added here
          />
        );
        break;
      case 'supervisors':
        content = <Supervisors appData={appData} openModal={openModal} isSidebarClosed={isSidebarMinimized} onModalStateChange={handleModalStateChange} />;
        break;
      case 'questionPapers':
        content = <QuestionPapers
          appData={appData}
          onFullscreenChange={(isFs) => setIsFullscreen(isFs)}
          onModalStateChange={handleModalStateChange}
        />;
        break;
      case 'result':
        content = <Result appData={appData} onModalStateChange={handleModalStateChange} />;
        break;
      case 'workflowScholarAdmin':
        content = <WorkflowScholarAdmin
          appData={appData}
          onModalStateChange={handleModalStateChange}
          onFullscreenChange={(isFs) => setIsFullscreen(isFs)}
        />;
        break;
      case 'workflowExamination':
        content = <WorkflowExamination appData={appData} onModalStateChange={handleModalStateChange} />;
        break;
      case 'partTimeSplit':
        content = <PartTimeSplit appData={appData} />;
        break;

      default:
        content = <Dashboard appData={appData} />;
    }

    return needsScroll ? (
      <div className="h-full overflow-y-auto custom-scrollbar">
        {content}
      </div>
    ) : content;
  };

  return (
    <div className={`director-portal w-full max-w-full px-0 ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      {/* Message Box */}
      {messageBox.show && (
        <div className="message-box max-w-sm">
          <p className="text-base">{messageBox.text}</p>
          <div className="flex justify-end mt-4 space-x-3">
            <button
              onClick={closeMessage}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className={`h-screen flex flex-col p-0 w-full ${isFullscreen ? 'pt-0' : 'pt-12'}`}>
        <div className="sidebar-layout-container">
          {/* Sidebar */}
          <nav
            className={`sidebar-fixed ${isFullscreen ? 'sidebar-hidden' : hasActiveModal ? 'sidebar-hidden' : isSidebarMinimized ? 'sidebar-minimized' : 'sidebar-expanded'} bg-white/5 backdrop-blur-xl flex flex-col shadow-2xl border-r border-white/20`}
            style={{ top: '0' }}
          >
            <div className="p-4 border-b border-white/10" style={{ paddingTop: '1.25rem', paddingBottom: '1.25rem' }}>
              {/* Campus Selection - Above Directorate Name - Hide in Examination fullscreen */}
              {!(isFullscreen && activeTab === 'examination') && (
                <div className={`sidebar-campus-section ${isSidebarMinimized ? 'minimized' : ''}`}>
                  <div
                    className="campus-buttons-container"
                    data-active={selectedCampus}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      padding: '8px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    {['Ramapuram', 'Trichy', 'Overall'].map((campus) => (
                      <button
                        key={campus}
                        onClick={() => setSelectedCampus(campus)}
                        className={`campus-filter-btn ${selectedCampus === campus ? 'active' : ''}`}
                        title={campus}
                        style={{
                          flex: campus === 'Trichy' ? '1.3' : '1',
                          padding: '10px 6px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'pointer',
                          border: 'none',
                          outline: 'none',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          minWidth: 0,
                          ...(selectedCampus === campus ? {
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4), 0 2px 6px rgba(139, 92, 246, 0.3)',
                            transform: 'translateY(-1px)'
                          } : {
                            background: 'rgba(255, 255, 255, 0.9)',
                            color: '#6b7280',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                          })
                        }}
                        onMouseEnter={(e) => {
                          if (selectedCampus !== campus) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
                            e.currentTarget.style.color = '#4b5563';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedCampus !== campus) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                            e.currentTarget.style.color = '#6b7280';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                          }
                        }}
                      >
                        {campus}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src="https://logodix.com/logo/1787040.png"
                    alt="SRM Logo"
                    className="h-10 w-10 flex-shrink-0"
                    style={{ borderRadius: '50%' }}
                  />
                  {!isSidebarMinimized && (
                    <span className="text-xl font-bold text-black tracking-wide">Directorate of Research</span>
                  )}
                </div>
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-lg transition-colors flex-shrink-0 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                  title={isSidebarMinimized ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Director Profile Card */}
            {!isSidebarMinimized && directorInfo && (
              <div className="px-3 py-3 mx-2 mb-4 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl border border-amber-400/30 backdrop-blur-sm hover:border-amber-400/50 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white flex-shrink-0">
                    <MdAdminPanelSettings className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{directorInfo.name}</p>
                    <p className="text-xs text-gray-600 truncate">{directorInfo.role}</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-600 font-medium min-w-fit">Email:</span>
                    <span className="text-gray-700 truncate">{directorInfo.email}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-600 font-medium min-w-fit">Campus:</span>
                    <span className="text-gray-700 truncate">{directorInfo.campus}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="nav-container py-4 px-2 flex-1 overflow-y-auto">
              <div className="flex flex-col space-y-1">
                <TabButton
                  id="dashboard"
                  active={activeTab === 'dashboard'}
                  onClick={() => setActiveTab('dashboard')}
                  icon={<MdDashboard className="w-5 h-5" />}
                  isMinimized={isSidebarMinimized}
                >
                  Dashboard
                </TabButton>
                <TabButton
                  id="adminManagement"
                  active={activeTab === 'adminManagement'}
                  onClick={() => setActiveTab('adminManagement')}
                  icon={<MdSecurity className="w-5 h-5" />}
                  isMinimized={isSidebarMinimized}
                >
                  Admin Administration
                </TabButton>
                <TabButton
                  id="coordinators"
                  active={activeTab === 'coordinators'}
                  onClick={() => setActiveTab('coordinators')}
                  icon={<MdPeople className="w-5 h-5" />}
                  isMinimized={isSidebarMinimized}
                >
                  Coordinators
                </TabButton>
                <TabButton
                  id="departments"
                  active={activeTab === 'departments'}
                  onClick={() => setActiveTab('departments')}
                  icon={<MdBusiness className="w-5 h-5" />}
                  isMinimized={isSidebarMinimized}
                >
                  Faculties
                </TabButton>
                {/* Scholar Administration with Submenu */}
                <div className="relative">
                  <TabButton
                    id="scholarManagement"
                    active={activeTab === 'scholarManagement' || activeTab === 'verifiedScholars' || activeTab === 'transferredScholars'}                    onClick={() => {
                      if (isSidebarMinimized) {
                        // When minimized, default to Initial view
                        setActiveTab('scholarManagement');
                      } else {
                        setScholarSubmenuOpen(!scholarSubmenuOpen);
                      }
                    }}
                    icon={<MdSchool className="w-5 h-5" />}
                    isMinimized={isSidebarMinimized}
                    hasSubmenu={!isSidebarMinimized}
                    submenuOpen={scholarSubmenuOpen}
                  >
                    Scholar Administration
                  </TabButton>

                  {/* Submenu - Only show when sidebar is expanded */}
                  {scholarSubmenuOpen && !isSidebarMinimized && (
                    <div className="ml-8 mt-1 space-y-1">
                      <button
                        onClick={() => {
                          setActiveTab('scholarManagement');
                          setScholarSubmenuOpen(true);
                        }}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${activeTab === 'scholarManagement'
                          ? 'bg-blue-600 text-white font-semibold shadow-md'
                          : 'text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${activeTab === 'scholarManagement' ? 'bg-white' : 'bg-blue-500'}`}></span>
                        Uploaded Scholars
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('verifiedScholars');
                          setScholarSubmenuOpen(true);
                        }}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${activeTab === 'verifiedScholars'
                          ? 'bg-green-600 text-white font-semibold shadow-md'
                          : 'text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${activeTab === 'verifiedScholars' ? 'bg-white' : 'bg-green-500'}`}></span>
                        Verified Scholars
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('transferredScholars');
                          setScholarSubmenuOpen(true);
                        }}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${activeTab === 'transferredScholars'
                          ? 'bg-purple-600 text-white font-semibold shadow-md'
                          : 'text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${activeTab === 'transferredScholars' ? 'bg-white' : 'bg-purple-500'}`}></span>
                        Transferred Scholars
                      </button>

                    </div>
                  )}
                </div>
                <TabButton
                  id="hallTicket"
                  active={activeTab === 'hallTicket'}
                  onClick={() => setActiveTab('hallTicket')}
                  icon={<MdDescription className="w-5 h-5" />}
                  isMinimized={isSidebarMinimized}
                >
                  Hall Ticket
                </TabButton>
                <TabButton
                  id="examination"
                  active={activeTab === 'examination'}
                  onClick={() => setActiveTab('examination')}
                  icon={<MdAssignment className="w-5 h-5" />}
                  isMinimized={isSidebarMinimized}
                >
                  Examination
                </TabButton>
                <TabButton
                  id="result"
                  active={activeTab === 'result'}
                  onClick={() => setActiveTab('result')}
                  icon={<MdEmojiEvents className="w-5 h-5" />}
                  isMinimized={isSidebarMinimized}
                >
                  Result
                </TabButton>
                <TabButton
                  id="supervisors"
                  active={activeTab === 'supervisors'}
                  onClick={() => setActiveTab('supervisors')}
                  icon={<MdSupervisorAccount className="w-5 h-5" />}
                  isMinimized={isSidebarMinimized}
                >
                  Supervisors
                </TabButton>
                <TabButton
                  id="partTimeSplit"
                  active={activeTab === 'partTimeSplit'}
                  onClick={() => setActiveTab('partTimeSplit')}
                  icon={<MdPieChart className="w-5 h-5" />}
                  isMinimized={isSidebarMinimized}
                >
                  Part Time Split
                </TabButton>
                <TabButton
                  id="questionPapers"
                  active={activeTab === 'questionPapers'}
                  onClick={() => setActiveTab('questionPapers')}
                  icon={<MdDescription className="w-5 h-5" />}
                  isMinimized={isSidebarMinimized}
                >
                  Question Papers
                </TabButton>

                {/* Workflow Dropdown */}
                <TabButton
                  id="workflow"
                  active={activeTab === 'workflowScholarAdmin' || activeTab === 'workflowExamination'}
                  onClick={() => setWorkflowSubmenuOpen(!workflowSubmenuOpen)}
                  icon={<MdAccountTree className="w-5 h-5" />}
                  isMinimized={isSidebarMinimized}
                >
                  Workflow
                </TabButton>

                {/* Workflow Submenu */}
                {workflowSubmenuOpen && !isSidebarMinimized && (
                  <div className="ml-4 mt-1 mb-2 space-y-1 bg-white/5 rounded-lg p-2">
                    <button
                      onClick={() => {
                        setActiveTab('workflowScholarAdmin');
                        setWorkflowSubmenuOpen(true);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${activeTab === 'workflowScholarAdmin'
                        ? 'bg-purple-600 text-white font-semibold shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${activeTab === 'workflowScholarAdmin' ? 'bg-white' : 'bg-purple-500'}`}></span>
                      Scholar Administration
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('workflowExamination');
                        setWorkflowSubmenuOpen(true);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${activeTab === 'workflowExamination'
                        ? 'bg-indigo-600 text-white font-semibold shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${activeTab === 'workflowExamination' ? 'bg-white' : 'bg-indigo-500'}`}></span>
                      Examination
                    </button>
                  </div>
                )}

              </div>
            </div>

            {/* Logout Button - Bottom of Sidebar */}
            {!isFullscreen && (
              <div className="sidebar-logout-section border-t border-white/10 p-3 mt-auto">
                <button
                  onClick={handleLogout}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-3 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg text-sm"
                >
                  <MdLogout className="w-4 h-4" />
                  {!isSidebarMinimized && <span>Logout</span>}
                </button>
              </div>
            )}
          </nav>

          {/* Main Content Area */}
          <main className={`main-content-area ${isFullscreen ? 'content-fullscreen' : hasActiveModal ? 'content-with-sidebar-hidden' : isSidebarMinimized ? 'content-with-sidebar-minimized' : 'content-with-sidebar-expanded'}`}>
            <div className={`${activeTab === 'examination' ? 'examination-page-wrapper p-4' : activeTab === 'scholarManagement' || activeTab === 'verifiedScholars' || activeTab === 'transferredScholars' || activeTab === 'hallTicket' || activeTab === 'questionPapers' ? 'fullscreen-page-wrapper p-4' : 'p-4 h-full'}`}>
              {renderTabContent()}
            </div>
          </main>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <MdLogout className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Confirm Logout</h3>
                <p className="text-gray-600">
                  Are you sure you want to logout? You will need to sign in again to access the director portal.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelLogout}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Tab Button Component - Styled to match image exactly
const TabButton = ({ id, active, onClick, icon, children, isMinimized, hasSubmenu, submenuOpen }) => (
  <button
    id={id}
    className={`tab-button flex items-center ${isMinimized ? 'justify-center' : 'justify-between'} w-full text-left transition-all duration-200 ${active ? 'active' : ''}`}
    onClick={onClick}
    title={isMinimized ? children : ''}
    style={isMinimized ? {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0.875rem'
    } : {}}
  >
    <div className={`flex items-center ${isMinimized ? 'justify-center' : 'gap-3'}`}>
      <span
        className="transition-all duration-200"
        style={isMinimized ? {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          visibility: 'visible',
          opacity: 1
        } : {}}
      >
        {icon}
      </span>
      {!isMinimized && (
        <span className="transition-all duration-200">
          {children}
        </span>
      )}
    </div>
    {hasSubmenu && !isMinimized && (
      <svg
        className={`w-4 h-4 transition-transform duration-200 ${submenuOpen ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )}
  </button>
);

export default DirectorPortal;