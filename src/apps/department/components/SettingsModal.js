import React, { useState, useEffect } from 'react';
import { X, Sun, Moon, Palette, Bell, Mail, Save } from 'lucide-react';

const themes = [
  { 
    name: 'light', 
    label: 'Light', 
    icon: Sun,
    colors: { 
      primary: 'bg-blue-600',
      secondary: 'bg-blue-700',
      text: 'text-gray-800',
      bg: 'bg-white',
      border: 'border-gray-200',
      card: 'bg-white',
      'card-hover': 'bg-gray-50',
      'text-muted': 'text-gray-500',
    } 
  },
  { 
    name: 'dark', 
    label: 'Dark',
    icon: Moon,
    colors: { 
      primary: 'bg-blue-600',
      secondary: 'bg-blue-700',
      text: 'text-white',
      bg: 'bg-gray-900',
      border: 'border-gray-700',
      card: 'bg-gray-800',
      'card-hover': 'bg-gray-700',
      'text-muted': 'text-gray-400',
    } 
  },
  { 
    name: 'blue', 
    label: 'Blue',
    icon: Palette,
    colors: { 
      primary: 'bg-blue-700',
      secondary: 'bg-blue-800',
      text: 'text-blue-900',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      card: 'bg-white',
      'card-hover': 'bg-blue-100',
      'text-muted': 'text-blue-700',
    } 
  },
  { 
    name: 'slate', 
    label: 'Slate',
    icon: Palette,
    colors: { 
      primary: 'bg-slate-700',
      secondary: 'bg-slate-800',
      text: 'text-slate-100',
      bg: 'bg-slate-800',
      border: 'border-slate-700',
      card: 'bg-slate-800',
      'card-hover': 'bg-slate-700',
      'text-muted': 'text-slate-400',
    } 
  },
];

export default function SettingsModal({ isOpen, onClose, user, onUpdateUser }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    displayName: user.name || '',
    email: user.email || '',
    theme: 'light',
    notifications: true,
    emailNotifications: true,
    desktopNotifications: false,
  });

  useEffect(() => {
    if (isOpen) {
      // Initialize form data with user information
      // Note: Settings are now managed through backend services
      setFormData(prev => ({
        ...prev,
        displayName: user.name || '',
        email: user.email || '',
      }));

      // Set active tab based on URL hash if present
      const hash = window.location.hash.replace('#', '');
      if (hash && ['profile', 'appearance', 'notifications', 'account'].includes(hash)) {
        setActiveTab(hash);
      }
    }
  }, [isOpen, user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Note: Settings are now managed through backend services
    // In a real implementation, this would save to Supabase user preferences table
    
    // Update user in parent component
    if (formData.displayName !== user.name) {
      onUpdateUser({
        ...user,
        name: formData.displayName
      });
    }
    
    // Apply theme (this can remain client-side)
    document.documentElement.setAttribute('data-theme', formData.theme);
    
    // Show success message
    const saveButton = e.target.querySelector('button[type="submit"]');
    const originalText = saveButton.textContent;
    saveButton.textContent = 'Saved!';
    saveButton.classList.add('bg-green-600', 'hover:bg-green-700');
    
    setTimeout(() => {
      saveButton.textContent = originalText;
      saveButton.classList.remove('bg-green-600', 'hover:bg-green-700');
      onClose();
    }, 1000);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Profile Information</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-300">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <button 
                      type="button" 
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Change photo
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">JPG, GIF or PNG. Max size 2MB</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="displayName"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      disabled
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Tell us a little about yourself..."
                  ></textarea>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Change Password</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter current password"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter new password"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Theme</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {themes.map((theme) => {
                  const Icon = theme.icon;
                  return (
                    <div 
                      key={theme.name}
                      onClick={() => setFormData(prev => ({ ...prev, theme: theme.name }))}
                      className={`relative cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                        formData.theme === theme.name 
                          ? 'ring-2 ring-blue-500 ring-offset-2' 
                          : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className={`h-24 ${theme.colors.bg} flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${theme.colors.text.includes('white') ? 'text-white' : 'text-gray-800'}`} />
                      </div>
                      <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{theme.label}</div>
                      </div>
                      {formData.theme === theme.name && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Layout</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Compact Mode</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Reduce padding and spacing for a more compact interface</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={formData.compactMode || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, compactMode: e.target.checked }))}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Sidebar Position</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Choose the position of the sidebar</p>
                  </div>
                  <select 
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-32 p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    value={formData.sidebarPosition || 'left'}
                    onChange={(e) => setFormData(prev => ({ ...prev, sidebarPosition: e.target.value }))}
                  >
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="emailNotifications"
                      name="emailNotifications"
                      type="checkbox"
                      checked={formData.emailNotifications}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="emailNotifications" className="font-medium text-gray-700 dark:text-gray-300">
                      Email notifications
                    </label>
                    <p className="text-gray-500 dark:text-gray-400">Receive email notifications about important updates</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="desktopNotifications"
                      name="desktopNotifications"
                      type="checkbox"
                      checked={formData.desktopNotifications}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="desktopNotifications" className="font-medium text-gray-700 dark:text-gray-300">
                      Desktop notifications
                    </label>
                    <p className="text-gray-500 dark:text-gray-400">Show desktop notifications for new activities</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="marketingEmails"
                      name="marketingEmails"
                      type="checkbox"
                      checked={formData.marketingEmails || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, marketingEmails: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="marketingEmails" className="font-medium text-gray-700 dark:text-gray-300">
                      Marketing emails
                    </label>
                    <p className="text-gray-500 dark:text-gray-400">Receive emails about new features and updates</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Notification Sounds</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="enableSounds"
                      name="enableSounds"
                      type="checkbox"
                      checked={formData.enableSounds || true}
                      onChange={(e) => setFormData(prev => ({ ...prev, enableSounds: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="enableSounds" className="font-medium text-gray-700 dark:text-gray-300">
                      Enable notification sounds
                    </label>
                    <p className="text-gray-500 dark:text-gray-400">Play a sound when receiving new notifications</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Volume</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Adjust the volume of notification sounds</p>
                  </div>
                  <div className="w-32">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={formData.notificationVolume || 70} 
                      onChange={(e) => setFormData(prev => ({ ...prev, notificationVolume: e.target.value }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'account':
        return (
          <div className="space-y-6">
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    These settings are critical. Please be cautious when making changes.
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Danger Zone</h3>
              <div className="space-y-4">
                <div className="border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">Deactivate Account</h4>
                  <p className="text-xs text-red-600 dark:text-red-400 mb-3">
                    Your account will be temporarily disabled. You can reactivate it by logging in again.
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-800/50"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to deactivate your account? You can reactivate it by logging in again.')) {
                        // Handle account deactivation
                        alert('Account deactivation request sent.');
                      }
                    }}
                  >
                    Deactivate Account
                  </button>
                </div>
                
                <div className="border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">Delete Account</h4>
                  <p className="text-xs text-red-600 dark:text-red-400 mb-3">
                    This action cannot be undone. All your data will be permanently removed from our servers.
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    onClick={() => {
                      if (window.confirm('WARNING: This will permanently delete your account and all associated data. This action cannot be undone. Are you sure?')) {
                        // Handle account deletion
                        alert('Account deletion request received. You will be logged out shortly.');
                      }
                    }}
                  >
                    Delete Account
                  </button>
                </div>
                
                <div className="border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">Export Data</h4>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-3">
                    Download a copy of all your personal data in a machine-readable format.
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-800/50"
                    onClick={() => {
                      // Handle data export
                      alert('Preparing your data export. You will receive an email with a download link when it\'s ready.');
                    }}
                  >
                    Export My Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75 dark:bg-gray-900 dark:opacity-75"></div>
        </div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="w-full">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
                  <button 
                    type="button"
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Sidebar Navigation */}
                  <div className="w-full md:w-48 flex-shrink-0">
                    <nav className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setActiveTab('profile')}
                        className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md ${
                          activeTab === 'profile'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setActiveTab('appearance')}
                        className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md ${
                          activeTab === 'appearance'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center">
                          <Palette className="mr-2 h-4 w-4" />
                          Appearance
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setActiveTab('notifications')}
                        className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md ${
                          activeTab === 'notifications'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center">
                          <Bell className="mr-2 h-4 w-4" />
                          Notifications
                        </div>
                      </button>
                      
                      <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                      
                      <button
                        type="button"
                        onClick={() => setActiveTab('account')}
                        className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md ${
                          activeTab === 'account'
                            ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                            : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/10'
                        }`}
                      >
                        <div className="flex items-center">
                          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Account
                        </div>
                      </button>
                    </nav>
                  </div>
                  
                  {/* Main Content */}
                  <div className="flex-1">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {renderTabContent()}
                      
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <button
                          type="button"
                          onClick={onClose}
                          className="mr-3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
