import {
  LayoutDashboard, Building2, GraduationCap,
  ClipboardList, GitPullRequest, Trophy, LogOut, ChevronDown, ChevronRight, FileText, User
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../App';
import { supabase } from '../../../supabaseClient';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    showMessageBox,
    sidebarCollapsed
  } = useAppContext();

  const [expandedItems, setExpandedItems] = useState(['ScholarAdministration', 'SubmissionWorkflow']);
  const [coordinatorInfo, setCoordinatorInfo] = useState(null);

  // Load coordinator info
  useEffect(() => {
    const loadCoordinatorInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user && user.email) {
          const { data: coordinatorData, error } = await supabase
            .from('coordinators')
            .select('*')
            .eq('email', user.email)
            .eq('status', 'Active')
            .single();

          if (!error && coordinatorData) {
            setCoordinatorInfo({
              name: coordinatorData.name,
              email: coordinatorData.email,
              faculty: coordinatorData.assigned_faculty,
              campus: coordinatorData.campus
            });
          }
        }
      } catch (err) {
        console.error('Error loading coordinator info:', err);
      }
    };

    loadCoordinatorInfo();
  }, []);

  // Map routes to nav items
  const routeMap = {
    '/foet': 'Dashboard',
    '/foet/': 'Dashboard',
    '/foet/dashboard': 'Dashboard',
    '/foet/departments': 'DepartmentControl',
    '/foet/scholar-management': 'ScholarManagement',
    '/foet/admin-forward': 'AdminForward',
    '/foet/query-scholar': 'QueryScholar',
    '/foet/examination': 'ScholarExamDistribution',
    '/foet/workflow': 'SubmissionWorkflow',
    '/foet/foet-result': 'Results',
    '/foet/question-papers': 'QuestionPapers'
  };

  const navItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard, route: '/foet/dashboard' },
    { id: 'DepartmentControl', label: 'Departments', icon: Building2, route: '/foet/departments' },
    { 
      id: 'ScholarAdministration', 
      label: 'Scholar Administration', 
      icon: GraduationCap,
      subItems: [
        { id: 'ScholarManagement', label: 'Uploaded Scholars', route: '/foet/scholar-management' },
        { id: 'AdminForward', label: 'Verified Scholars', route: '/foet/admin-forward' },
        { id: 'QueryScholar', label: 'Query Scholar', route: '/foet/query-scholar' }
      ]
    },
    { id: 'ScholarExamDistribution', label: 'Examination', icon: ClipboardList, route: '/foet/examination' },
    { id: 'QuestionPapers', label: 'Question Papers', icon: FileText, route: '/foet/question-papers' },
    { id: 'Results', label: 'Result', icon: Trophy, route: '/foet/foet-result' },
    { 
      id: 'SubmissionWorkflow', 
      label: 'Workflow', 
      icon: GitPullRequest,
      subItems: [
        { id: 'WorkflowScholarAdmin', label: 'Scholar Administration', route: '/foet/workflow?tab=scholar-administration' },
        { id: 'WorkflowExamination', label: 'Examination', route: '/foet/workflow?tab=examination' }
      ]
    }
  ];

  const handleTabClick = (tabId, route, hasSubItems = false) => {
    if (hasSubItems) {
      // Toggle expansion
      setExpandedItems(prev => 
        prev.includes(tabId) 
          ? prev.filter(id => id !== tabId)
          : [...prev, tabId]
      );
    } else {
      navigate(route);
    }
  };

  const getCurrentTab = () => {
    return routeMap[location.pathname] || 'Dashboard';
  };



  const handleLogout = () => {
    showMessageBox('Are you sure you want to logout?', 'confirm', (confirmed) => {
      if (confirmed) {
        console.log("Logging out...");
        // Clear any stored user data
        localStorage.clear();
        sessionStorage.clear();

        // Redirect to login page
        window.location.href = '/login';
      }
    });
  };

  const currentTab = getCurrentTab();

  const { setSidebarCollapsed } = useAppContext();

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <aside id="mainSidebar" className={`main-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      {/* Header Section */}
      <div className="sidebar-header">
        {!sidebarCollapsed && (
          <div className="logo-text">
            <div>Research</div>
            <div>Coordinator</div>
          </div>
        )}
        <img
          src="https://logodix.com/logo/1787040.png"
          alt="SRM Logo"
          className="logo-image"
        />
        <button
          onClick={toggleSidebar}
          className="sidebar-toggle-btn"
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Coordinator Info Section */}
      {coordinatorInfo && !sidebarCollapsed && (
        <div className="coordinator-info-sidebar">
          <div className="coordinator-avatar">
            <User size={24} />
          </div>
          <div className="coordinator-details">
            <div className="coordinator-name-sidebar">{coordinatorInfo.name}</div>
            <div className="coordinator-email-sidebar">{coordinatorInfo.email}</div>
            <div className="coordinator-faculty-badge">{coordinatorInfo.faculty}</div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="nav-container">
        {navItems.map((item) => {
          const Icon = item.icon;
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded = expandedItems.includes(item.id);
          const isActive = currentTab === item.id || 
                          (hasSubItems && item.subItems.some(sub => sub.id === currentTab));
          
          return (
            <div key={item.id} className="nav-item-wrapper">
              <button
                onClick={() => handleTabClick(item.id, item.route, hasSubItems)}
                className={`tab-button ${isActive ? 'active' : ''}`}
                title={sidebarCollapsed ? item.label : ''}
              >
                <Icon className="tab-icon" />
                {!sidebarCollapsed && (
                  <>
                    <span className="nav-text">
                      {item.label}
                    </span>
                    {hasSubItems && (
                      isExpanded ? 
                        <ChevronDown className="expand-icon" size={16} /> : 
                        <ChevronRight className="expand-icon" size={16} />
                    )}
                  </>
                )}
              </button>
              
              {/* Sub-items */}
              {hasSubItems && isExpanded && !sidebarCollapsed && (
                <div className="sub-items">
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem.id}
                      onClick={() => handleTabClick(subItem.id, subItem.route, false)}
                      className={`sub-item-button ${currentTab === subItem.id ? 'active' : ''}`}
                    >
                      <span className="sub-item-text">{subItem.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="logout-section">
        <button
          onClick={handleLogout}
          className="logout-button"
          title={sidebarCollapsed ? 'Logout' : ''}
        >
          <LogOut className="tab-icon" />
          {!sidebarCollapsed && (
            <span className="nav-text">
              Logout
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;