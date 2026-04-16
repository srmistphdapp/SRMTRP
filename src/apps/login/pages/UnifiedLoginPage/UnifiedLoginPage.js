import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Crown, UserCog, BookOpen, Building2 } from 'lucide-react';
import { getCurrentCampus, switchCampus } from '../../../../supabaseClient';

import './UnifiedLoginPage.css';
import LoginForm from '../RmpLoginPage/LoginForm.js';

const roles = [
    { id: 'director', label: 'Director', icon: <Crown /> },
    { id: 'admin', label: 'Admin', icon: <UserCog /> },
    { id: 'coordinator', label: 'Coordinator', icon: <BookOpen /> },
    { id: 'department', label: 'Department', icon: <Building2 /> },
];

const UnifiedLoginPage = () => {
    const [selectedRole, setSelectedRole] = useState('director');
    const [selectedCampus, setSelectedCampus] = useState(getCurrentCampus());

    const handleCampusChange = (campus) => {
        if (campus !== selectedCampus) {
            switchCampus(campus); // This will reload the page
        }
    };

    const campusConfig = {
        rmp: {
            name: 'Ramapuram Campus',
            className: 'rmp-login-wrapper',
            banner: 'rmp-banner',
            container: 'rmp-content-container',
            main: 'rmp-main-content',
            roleSection: 'rmp-role-section',
            formSection: 'rmp-form-section',
            footer: 'rmp-footer'
        },
        trp: {
            name: 'Trichy Campus',
            className: 'trp-login-wrapper',
            banner: 'trp-banner',
            container: 'trp-content-container',
            main: 'trp-main-content',
            roleSection: 'trp-role-section',
            formSection: 'trp-form-section',
            footer: 'trp-footer'
        }
    };

    const config = campusConfig[selectedCampus];

    return (
        <div className={config.className}>
            <div className={config.banner}></div>

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
                            <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-white">{config.name} Portal</h1>
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

            <div className={config.container}>
                <main className={config.main}>


                    {/* Role Selection */}
                    <section className={config.roleSection}>
                        <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 lg:px-6">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                                {roles.map((role) => (
                                    <button
                                        key={role.id}
                                        className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-2xl font-semibold transition-all duration-300 backdrop-blur-md border border-white/20 text-xs sm:text-sm ${selectedRole === role.id
                                            ? 'bg-white text-primary-900 shadow-xl scale-105'
                                            : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105'
                                            }`}
                                        onClick={() => setSelectedRole(role.id)}
                                    >
                                        <span className="text-sm sm:text-base">
                                            {role.icon}
                                        </span>
                                        <span className="text-xs sm:text-xs font-medium">{role.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Login Form */}
                    <section className={config.formSection}>
                        <div className="w-full max-w-sm mx-auto px-3 sm:px-4 lg:px-6">
                            <LoginForm role={selectedRole} />
                        </div>
                    </section>
                </main>

                <footer className={config.footer}>
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

export default UnifiedLoginPage;