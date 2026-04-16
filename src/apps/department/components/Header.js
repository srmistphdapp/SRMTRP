import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, Bell, ChevronDown, X } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

const Header = () => {
  const { toggleSidebar, sidebarCollapsed, currentUser, toggleFullScreen } = useAppContext();
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const profileRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileOpen]);

  // Keep track of fullscreen state to update icon
  useEffect(() => {
    const onFullScreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullScreenChange);
  }, []);

  // Get user initials
  const getUserInitials = () => {
    if (!currentUser?.name) return 'US';
    return currentUser.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const searchTerm = searchInputRef.current?.value || '';
    // Handle search logic here
    console.log('Searching for:', searchTerm);
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left side - Menu */}
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Search - Desktop */}
          <div className={`${searchOpen ? 'hidden' : 'hidden md:block'} relative`}>
            <form onSubmit={handleSearch} className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search..."
              />
              <button 
                type="button"
                onClick={() => setSearchOpen(true)}
                className="md:hidden absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <Search className="h-4 w-4 text-gray-400" />
              </button>
            </form>
          </div>
        </div>
        
        {/* Right side - User and Notifications */}
        <div className="flex items-center space-x-4">
          {/* Search - Mobile */}
          <button 
            onClick={() => setSearchOpen(!searchOpen)}
            className="md:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>
          
          {/* Fullscreen Toggle */}
          <button
            onClick={() => {
              // Toggle fullscreen only for the main content area with id 'app-main'
              try {
                toggleFullScreen && toggleFullScreen('app-main');
              } catch (e) {
                if (!document.fullscreenElement) document.getElementById('app-main')?.requestFullscreen().catch(() => {});
                else if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
              }
            }}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
            aria-label="Toggle fullscreen"
          >
            <span className="sr-only">Toggle fullscreen</span>
            {!isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 14H5v4h4v-1.5M15 10h4V6h-4V7.5"></path>
                <path d="M21 3v6M3 21v-6"></path>
              </svg>
            )}
          </button>
          
          {/* Notifications */}
          <button className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
          </button>
          
          {/* User Profile */}
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center space-x-2 focus:outline-none"
              aria-label="User menu"
              aria-expanded={profileOpen}
            >
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-sm">
                {getUserInitials()}
              </div>
              <span className="hidden md:inline-block text-sm font-medium text-gray-700">
                {currentUser?.name || 'User'}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${profileOpen ? 'transform rotate-180' : ''}`} />
            </button>
            
            {/* Profile Dropdown */}
            {profileOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="py-1" role="none">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm text-gray-700 font-medium">{currentUser?.name || 'User'}</p>
                    <p className="text-xs text-gray-500">{currentUser?.email || ''}</p>
                  </div>
                  
                  <a
                    href="#"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    Your Profile
                  </a>
                  <a
                    href="#"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    Settings
                  </a>
                  <a
                    href="#"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    Sign out
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Search Bar */}
      {searchOpen && (
        <div className="md:hidden px-4 pb-3">
          <form onSubmit={handleSearch} className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search..."
              autoFocus
            />
            <button 
              type="button"
              onClick={() => setSearchOpen(false)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </form>
        </div>
      )}
    </header>
  );
};

export default Header;
