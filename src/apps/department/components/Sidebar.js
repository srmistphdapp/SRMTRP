import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck2, UserX2, Send, Award, FilePlus2, LogOut, Menu, MessageSquare, BarChart3, ClipboardList
} from 'lucide-react';
import { FaGraduationCap } from 'react-icons/fa';
import { signOutDepartmentUser } from '../services/departmentService';

// --- CONTENT PRESERVED ---
const sidebarTabs = [
  { id: 'Applications', label: 'Scholar Administration', icon: <FaGraduationCap /> },
  { id: 'Approved', label: 'Eligible Scholars', icon: <UserCheck2 className="w-5 h-5" /> },
  { id: 'Queries', label: 'Queries', icon: <MessageSquare className="w-5 h-5" /> },
  { id: 'Rejected', label: 'Rejected Scholars', icon: <UserX2 className="w-5 h-5" /> },
  { id: 'Forwarded', label: 'Forwarded Scholars', icon: <Send className="w-5 h-5" /> },
  { id: 'Results', label: 'Results', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'Interview', label: 'Interview', icon: <Award className="w-5 h-5" /> },
  { id: 'QuestionPaper', label: 'Question Papers', icon: <FilePlus2 className="w-5 h-5" /> },
  { id: 'MinutesofMeeting', label: 'Minutes of Meeting', icon: <ClipboardList className="w-5 h-5" /> },
];

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { sidebarCollapsed, toggleSidebar, currentUser, userLoading } = useAppContext();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Handle logout confirmation
  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      // Clear all localStorage data for Minutes of Meeting
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('minutesOfMeeting_')) {
          localStorage.removeItem(key);
        }
      });
      
      // Sign out from Supabase
      await signOutDepartmentUser();
      
      // Navigate to login
      navigate('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      // Still navigate to login even if there's an error
      navigate('/login');
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <aside
      id="mainSidebar"
      className={`flex flex-col bg-white text-slate-800 border-r border-slate-200 shadow-sm transition-all duration-300 relative ${sidebarCollapsed ? 'w-20' : 'w-[320px]'}`}
    >

      {/* Header Area */}
      <div className={`flex flex-col items-center justify-center py-6 relative transition-all duration-300 ${sidebarCollapsed ? 'gap-4' : ''}`}>

        {/* Toggle Button (Updated Alignment Logic) */}
        <button
          id="sidebarToggle"
          onClick={toggleSidebar}
          className={`
            p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors z-10
            ${sidebarCollapsed
              ? 'relative' // When collapsed: Relative positioning lets the parent flex-col center it
              : 'absolute right-3 top-3' // When expanded: Stick to the top right corner
            }
          `}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo & Title Logic */}
        {!sidebarCollapsed ? (
          // Expanded Header
          <div className="flex flex-col items-start w-full px-6 mt-2 animate-fadeIn">
            <div className="flex items-center gap-3">
              <img
                src="https://logodix.com/logo/1787040.png"
                alt="SRM Logo"
                className="w-10 h-10 object-contain rounded-full bg-slate-50"
              />
              <div className="flex flex-col">
                {userLoading ? (
                  <span className="text-lg font-bold text-slate-900 leading-tight">Loading...</span>
                ) : currentUser ? (
                  <span className="text-lg font-bold text-slate-900 leading-tight">
                    HOD {currentUser.department || 'N/A'}
                  </span>
                ) : (
                  <span className="text-lg font-bold text-slate-900 leading-tight">HOD Portal</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Collapsed Header
          <div className="flex flex-col items-center">
            <img
              src="https://logodix.com/logo/1787040.png"
              alt="SRM Small Logo"
              className="w-9 h-9 object-contain rounded-full bg-slate-50"
            />
          </div>
        )}
      </div>

      {/* User Info Panel - Only show when expanded */}
      {!sidebarCollapsed && currentUser && !userLoading && (
        <div className="mx-4 mb-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
              {currentUser.name?.charAt(0) || 'H'}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 text-sm truncate" title={currentUser.name}>
                {currentUser.name}
              </h3>
              <p className="text-xs text-slate-600 truncate" title={currentUser.email}>
                {currentUser.email}
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-blue-700">Faculty:</span>
                  <span className="text-xs text-slate-700 truncate" title={currentUser.faculty}>
                    {currentUser.faculty}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-blue-700">Dept:</span>
                  <span className="text-xs text-slate-700 truncate" title={currentUser.department}>
                    {currentUser.department}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto py-4">
        {sidebarTabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-tab={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={sidebarCollapsed ? tab.label : ''}
              className={`
                group flex items-center w-full p-4 rounded-lg transition-all duration-200 font-semibold
                ${isActive
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl rounded-xl px-6 py-4 mx-1 my-1 transform scale-105 border-2 border-blue-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }
                ${sidebarCollapsed ? 'justify-center' : 'justify-start gap-3'}
              `}
            >
              {/* Icon */}
              <span className={`
                 transition-colors duration-200 flex items-center justify-center
                 ${isActive ? 'text-white' : 'text-slate-900'}
              `}>
                {React.cloneElement(tab.icon, {
                  className: `w-5 h-5 ${isActive ? 'text-white' : 'currentColor'}`
                })}
              </span>

              {/* Label */}
              {!sidebarCollapsed && (
                <span className="text-sm tracking-wide">
                  {tab.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout Section */}
      <div className="p-4 mt-auto">
        <button
          id="logoutButton"
          onClick={handleLogout}
          className={`
            flex items-center w-full py-3 rounded-lg transition-all duration-300 font-semibold shadow-sm
            bg-red-600 text-white hover:bg-red-700 active:scale-95
            ${sidebarCollapsed ? 'justify-center px-0' : 'justify-center gap-2 px-4'}
          `}
        >
          <LogOut className="w-5 h-5 text-white" />
          {!sidebarCollapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <LogOut className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Confirm Logout</h3>
                <p className="text-gray-600">
                  Are you sure you want to logout? You will need to sign in again to access the department portal.
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
    </aside>
  );
};

export default Sidebar;