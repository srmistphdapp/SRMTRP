import React, { useState, useEffect } from 'react';
import './adminportal.css';
import {
  MdDashboard,
  MdPeople,
  MdBusiness,
  MdSchool,
  MdAssignment,
  MdSupervisorAccount,
  MdDescription,
  MdEmojiEvents,
  MdAccountTree,
  MdPieChart,
  MdLogout,
  MdAdminPanelSettings,
} from 'react-icons/md';
import { supabaseAuth } from '../../login/supabaseAuth';
import { fetchAdminByEmail } from '../../../services/adminService';

// Double check that every component below uses "export default" in its file!
import Dashboard from './components/Dashboard';
import Coordinators from './components/Coordinators';
import Faculties from './components/Faculties';
import Examination from './components/Examination';
import Supervisors from './components/Supervisors';
import QuestionPapers from './components/QuestionPapers';
import Result from './components/Result';
import WorkflowScholarAdmin from './components/WorkflowScholarAdmin';
import WorkflowExamination from './components/WorkflowExamination';
import Checklist from './components/Checklist'; // ✅ NEW
import VerifiedScholars from './components/VerifiedScholars';
import ScholarManagement from './components/ScholarManagement';
import HallTicket from './components/HallTicket';
import TransferredScholars from './components/TransferredScholars';

const AdminPortal = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [scholarSubmenuOpen, setScholarSubmenuOpen] = useState(false);
  const [workflowSubmenuOpen, setWorkflowSubmenuOpen] = useState(false); // NEW: Workflow dropdown state
  const [messageBox, setMessageBox] = useState({ show: false, text: '', type: 'info' });
  const [modals, setModals] = useState({});
  const [adminInfo, setAdminInfo] = useState(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [hasActiveModal, setHasActiveModal] = useState(false);
  const [previousSidebarState, setPreviousSidebarState] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Sample data structure
  const [appData] = useState({
    RMP: {
      name: "Ramapuram",
      adminList: [
        { id: 'admin1', name: 'Jaikumar', email: 'ad1@srmist.edu.in', role: 'Admin', campus: 'Ramapuram' },
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

  // Fetch admin info on component mount and validate role
  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        const user = await supabaseAuth.getCurrentUser();
        console.log('Current user:', user);

        // Check if this tab was logged in as admin (using per-tab sessionStorage)
        const storedRole = sessionStorage.getItem('userRole');
        const storedEmail = sessionStorage.getItem('userEmail');

        // If no role stored in this tab, or role is not 'admin', redirect to login
        if (!storedRole || storedRole !== 'admin') {
          console.warn('Session role mismatch: expected "admin", got "' + storedRole + '". Redirecting to login.');
          window.location.href = '/login';
          return;
        }

        // Verify the Supabase session matches the stored email for this tab
        if (user?.email && storedEmail && user.email.toLowerCase() !== storedEmail) {
          console.warn('Session was overwritten by another tab. Expected:', storedEmail, 'Got:', user.email);
          // The Supabase session was overwritten by another tab login
          // Try to fetch admin info using the stored email
          const { data: admin } = await fetchAdminByEmail(storedEmail);
          if (admin) {
            setAdminInfo(admin);
          } else {
            setAdminInfo({
              name: storedEmail.split('@')[0],
              email: storedEmail,
              role: 'Admin',
              campus: 'Ramapuram'
            });
          }
          setLoadingAdmin(false);
          return;
        }

        if (user?.email) {
          console.log('Fetching admin for email:', user.email);
          const { data: admin } = await fetchAdminByEmail(user.email);
          console.log('Admin data fetched:', admin);

          if (admin) {
            setAdminInfo(admin);
          } else {
            // Fallback if admin not found in database
            setAdminInfo({
              name: user.email.split('@')[0],
              email: user.email,
              role: 'Admin',
              campus: 'Ramapuram'
            });
          }
        } else if (storedRole === 'admin' && storedEmail) {
          // Fallback: use stored session info if Supabase session was overwritten
          const { data: admin } = await fetchAdminByEmail(storedEmail);
          if (admin) {
            setAdminInfo(admin);
          } else {
            setAdminInfo({
              name: storedEmail.split('@')[0],
              email: storedEmail,
              role: 'Admin',
              campus: 'Ramapuram'
            });
          }
        }
      } catch (error) {
        console.error('Error fetching admin info:', error);
      } finally {
        setLoadingAdmin(false);
      }
    };

    fetchAdminInfo();

    // Listen for auth state changes to detect session swaps from other tabs
    const subscription = supabaseAuth.onAuthStateChange((event, session) => {
      const storedRole = sessionStorage.getItem('userRole');
      const storedEmail = sessionStorage.getItem('userEmail');

      if (event === 'SIGNED_OUT') {
        // Only redirect if this tab's role was admin
        if (storedRole === 'admin') {
          sessionStorage.removeItem('userRole');
          sessionStorage.removeItem('userEmail');
          window.location.href = '/login';
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // If session changed to a different user, keep showing admin's stored info
        if (session?.user?.email && storedEmail && session.user.email.toLowerCase() !== storedEmail) {
          console.log('Auth state changed to different user in another tab, maintaining admin context');
          // Don't update the admin info - keep the original
        }
      }
    });

    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const renderTabContent = () => {
    const scrollableComponents = [
      'dashboard',
      'coordinators',
      'departments',
      'supervisors',
      'questionPapers',
      'result',
      'workflow',
      'verifiedScholars',
      'hallTicket',
      'transferredScholars',      
      'checklist', // ✅ NEW
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
      case 'departments':
        content = <Faculties appData={appData} openModal={openModal} onModalStateChange={handleModalStateChange} />;
        break;
      case 'examination':
        content = (
          <Examination
            appData={appData}
            onFullscreenChange={(isFs) => setIsFullscreen(isFs)}
            onModalStateChange={handleModalStateChange}
            isSidebarClosed={isSidebarMinimized}
          />
        );
        break;
      case 'supervisors':
        content = (
          <Supervisors
            appData={appData}
            openModal={openModal}
            isSidebarClosed={isSidebarMinimized}
            onModalStateChange={handleModalStateChange}
          />
        );
        break;
      case 'questionPapers':
        content = (
          <QuestionPapers
            appData={appData}
            onFullscreenChange={(isFs) => setIsFullscreen(isFs)}
            onModalStateChange={handleModalStateChange}
          />
        );
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
      case 'verifiedScholars':
        content = (
          <VerifiedScholars
            appData={appData}
            onFullscreenChange={(isFs) => setIsFullscreen(isFs)}
            onModalStateChange={handleModalStateChange}
          />
        );
        break;
      case 'uploadedScholars':
        content = (
          <ScholarManagement
            appData={appData}
            onFullscreenChange={(isFs) => setIsFullscreen(isFs)}
            onModalStateChange={handleModalStateChange}
          />
        );
        break;
      case 'transferredScholars':
        content = (
          <TransferredScholars
            onModalStateChange={handleModalStateChange}
          />
        );
        break;
      case 'hallTicket':
        content = (
          <HallTicket
            appData={appData}
            onFullscreenChange={(isFs) => setIsFullscreen(isFs)}
            onModalStateChange={handleModalStateChange}
            isSidebarMinimized={isSidebarMinimized}
          />
        );
        break;
      case 'checklist': // ✅ NEW
        content = <Checklist appData={appData} onModalStateChange={handleModalStateChange} />;
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
    <div className={`admin-portal w-full max-w-full px-0 ${isFullscreen ? 'fullscreen-mode' : ''}`}>
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
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src="https://logodix.com/logo/1787040.png"
                    alt="SRM Logo"
                    className="h-10 w-10 flex-shrink-0"
                    style={{ borderRadius: '50%' }}
                  />
                  {!isSidebarMinimized && (
                    <span className="text-xl font-bold text-black tracking-wide">
                      Administration of Research
                    </span>
                  )}
                </div>
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-lg transition-colors flex-shrink-0 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                  title={isSidebarMinimized ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Admin Profile Card */}
            {!isSidebarMinimized && adminInfo && (
              <div className="px-3 py-3 mx-2 mb-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-400/30 backdrop-blur-sm hover:border-blue-400/50 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white flex-shrink-0">
                    <MdAdminPanelSettings className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{adminInfo.name}</p>
                    <p className="text-xs text-gray-600 truncate">{adminInfo.role}</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-600 font-medium min-w-fit">Email:</span>
                    <span className="text-gray-700 truncate">{adminInfo.email}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-600 font-medium min-w-fit">Campus:</span>
                    <span className="text-gray-700 truncate">{adminInfo.campus}</span>
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

                <TabButton
                  id="scholarManagement"
                  active={activeTab === 'uploadedScholars' || activeTab === 'verifiedScholars' || activeTab === 'transferredScholars'}                  onClick={() => {
                    if (isSidebarMinimized) {
                      setActiveTab('verifiedScholars');
                    } else {
                      setScholarSubmenuOpen(!scholarSubmenuOpen);
                    }
                  }}
                  icon={<MdSchool className="w-5 h-5" />}
                  isMinimized={isSidebarMinimized}
                >
                  Scholar Administration
                </TabButton>
                {scholarSubmenuOpen && !isSidebarMinimized && (
                  <div className="ml-8 mt-1 space-y-1">
                    <button
                      onClick={() => {
                        setActiveTab('uploadedScholars');
                        setScholarSubmenuOpen(true);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${activeTab === 'uploadedScholars'
                        ? 'bg-blue-600 text-white font-semibold shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${activeTab === 'uploadedScholars' ? 'bg-white' : 'bg-blue-500'}`}></span>
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
                  id="checklist"
                  active={activeTab === 'checklist'}
                  onClick={() => setActiveTab('checklist')}
                  icon={<MdPieChart className="w-5 h-5" />}
                  isMinimized={isSidebarMinimized}
                >
                  Checklist
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
          <main
            className={`main-content-area ${isFullscreen ? 'content-fullscreen' : hasActiveModal ? 'content-with-sidebar-hidden' : isSidebarMinimized ? 'content-with-sidebar-minimized' : 'content-with-sidebar-expanded'}`}
          >
            <div
              className={`${activeTab === 'examination'
                ? 'examination-page-wrapper p-4'
                : activeTab === 'questionPapers'
                  ? 'fullscreen-page-wrapper p-4'
                  : 'p-4 h-full'
                }`}
            >
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
                  Are you sure you want to logout? You will need to sign in again to access the admin portal.
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

// Tab Button Component
const TabButton = ({ id, active, onClick, icon, children, isMinimized }) => (
  <button
    id={id}
    className={`tab-button flex items-center ${isMinimized ? 'justify-center' : 'gap-4'
      } w-full text-left transition-all duration-300 ${active
        ? 'active bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl rounded-xl px-6 py-4 mx-1 my-1 transform scale-105 border-2 border-blue-300'
        : 'text-black hover:bg-gray-100 hover:text-gray-800 px-4 py-3 rounded-lg mx-2'
      }`}
    onClick={onClick}
    title={isMinimized ? children : ''}
  >
    <span
      className={`transition-all duration-300 ${active ? 'text-white bg-white/20 rounded-full p-1.5 shadow-lg' : 'text-black'
        }`}
    >
      {icon}
    </span>
    {!isMinimized && (
      <span
        className={`transition-all duration-300 font-medium ${active ? 'text-white font-bold tracking-wide' : 'text-black'
          }`}
      >
        {children}
      </span>
    )}
  </button>
);

export default AdminPortal;