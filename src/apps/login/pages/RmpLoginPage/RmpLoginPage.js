import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Crown, UserCog, BookOpen, Building2 } from 'lucide-react';

import './RmpLoginPage.css';
import LoginForm from './LoginForm.js';

const roles = [
  { id: 'director', label: 'Director', icon: <Crown /> },
  { id: 'admin', label: 'Admin', icon: <UserCog /> },
  { id: 'coordinator', label: 'Coordinator', icon: <BookOpen /> },
  { id: 'department', label: 'Department', icon: <Building2 /> },
];

const RmpLoginPage = () => {
  const [selectedRole, setSelectedRole] = useState('director');
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsHeaderScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="rmp-login-wrapper">
      <div className="rmp-banner"></div>
      
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-transparent">
        <div className="px-3 sm:px-6 lg:px-8 py-2 transition-all duration-300">
          <div className="flex flex-col sm:grid sm:grid-cols-3 items-center gap-2 sm:gap-0">
            <div className="flex items-center justify-center sm:justify-start">
              <img 
                src="https://srmrmp.edu.in/wp-content/uploads/2025/02/New-Logo-SRM-02-1-768x335.png"
                alt="SRM Logo"
                className="h-8 sm:h-10 lg:h-12 w-auto"
              />
            </div>
            <div className="text-center">
              <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-white">Ramapuram Campus Portal</h1>
            </div>
            <nav className="flex justify-center sm:justify-end">
              <Link 
                className="text-white hover:text-yellow-400 transition-colors duration-300 font-medium text-xs sm:text-sm" 
                to="/login"
              >
                Back to Home
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="rmp-content-container">
        <main className="rmp-main-content">
          

          <section className="rmp-form-section">
            <div className="w-full max-w-sm mx-auto px-3 sm:px-4 lg:px-6">
              <LoginForm role={selectedRole} />
            </div>
          </section>
        </main>
        
        <footer className="rmp-footer">
          <div className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6">
            <div className="border-t border-white/20 pt-4">
              <p className="text-xs mb-1 text-white/80">© 2025 SRM Institute of Science and Technology. All Rights Reserved.</p>
              <p className="text-xs text-white/80">
                <a href="#" className="text-yellow-400 hover:text-yellow-300 transition-colors">Privacy Policy</a>
                <span className="mx-2">|</span>
                <a href="#" className="text-yellow-400 hover:text-yellow-300 transition-colors">Terms of Use</a>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default RmpLoginPage;