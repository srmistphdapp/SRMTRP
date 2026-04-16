import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { supabaseAuth } from '../../supabaseAuth.js';
import { getCoordinatorByEmail } from '../../../../services/coordinatorService';
import { fetchDepartmentUserByEmail } from '../../../../services/departmentService';
import { fetchAdminByEmail } from '../../../../services/adminService';
import ForgotPasswordModal from './ForgotPasswordModal.js';

const roleConfig = {
  director: {
    email: "director@srmtrp.edu.in",
    redirect: "/director",
    title: "Director"
  },
  admin: {
    email: null, // Will check against admins table
    redirect: "/admin",
    title: "Admin"
  },
  department: {
    email: null, // Will check against department_users table
    redirect: "/department",
    title: "Department"
  },
  coordinator: {
    email: null, // Will check against coordinators table
    redirect: "/foet",
    title: "Coordinator"
  }
};

const LoginForm = ({ role }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailInvalid, setIsEmailInvalid] = useState(false);
  const [isPasswordInvalid, setIsPasswordInvalid] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    setEmail('');
    setPassword('');
    setError('');
    setIsEmailInvalid(false);
    setIsPasswordInvalid(false);
  }, [role]);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) {
      setError('');
      setIsEmailInvalid(false);
      setIsPasswordInvalid(false);
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) {
      setError('');
      setIsEmailInvalid(false);
      setIsPasswordInvalid(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsEmailInvalid(false);
    setIsPasswordInvalid(false);

    const expectedEmail = roleConfig[role]?.email;

    // For director role, check against hardcoded email
    if (role === 'director') {
      if (email.toLowerCase() !== expectedEmail) {
        setError(`Access denied. Please use the designated ${role} email.`);
        setIsEmailInvalid(true);
        return;
      }
    }

    // Try to authenticate first, then validate role
    try {
      await supabaseAuth.signIn(email, password);
      console.log(`Login successful for ${role}`);

      // After successful auth, validate the role
      if (role === 'coordinator') {
        const { data: coordinatorData } = await getCoordinatorByEmail(email);
        if (!coordinatorData) {
          await supabaseAuth.signOut();
          setError(`Access denied. You are not registered as a coordinator.`);
          setIsEmailInvalid(true);
          return;
        }
      } else if (role === 'department') {
        const { data: departmentUserData } = await fetchDepartmentUserByEmail(email);
        if (!departmentUserData) {
          await supabaseAuth.signOut();
          setError(`Access denied. You are not registered as a department user.`);
          setIsEmailInvalid(true);
          return;
        }
      } else if (role === 'admin') {
        const { data: adminData } = await fetchAdminByEmail(email);
        console.log('Admin validation after auth:', { email, adminData });

        if (!adminData) {
          await supabaseAuth.signOut();
          setError(`Access denied. You are not registered as an admin.`);
          setIsEmailInvalid(true);
          return;
        }

        if (adminData.status !== 'Active') {
          await supabaseAuth.signOut();
          setError(`Your admin account is ${adminData.status.toLowerCase()}. Please contact the director.`);
          setIsEmailInvalid(true);
          return;
        }
      }

      // Store the role in sessionStorage (per-tab) so each portal can verify its role
      sessionStorage.setItem('userRole', role);
      sessionStorage.setItem('userEmail', email.toLowerCase());

      window.location.pathname = roleConfig[role].redirect;
    } catch (err) {
      console.error(`Login failed for ${role}:`, err);
      let message = 'Invalid email or password provided.';

      if (err.message) {
        if (err.message.includes('Invalid login credentials')) {
          message = 'Invalid email or password provided.';
        } else if (err.message.includes('Email not confirmed')) {
          message = 'Please verify your email address.';
        } else {
          message = err.message;
        }
      }

      setError(message);
      setIsEmailInvalid(true);
      setIsPasswordInvalid(true);
    }
  };

  return (
    <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/20 p-4 sm:p-5 shadow-2xl">
      <div className="text-center mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-white">{roleConfig[role].title} Login</h3>
      </div>
      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="email"
            className={`w-full pl-10 pr-3 py-2 sm:py-3 rounded-lg border transition-all duration-300 bg-white text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent ${isEmailInvalid ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
              }`}
            placeholder="Enter your email"
            value={email}
            onChange={handleEmailChange}
            required
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type={showPassword ? 'text' : 'password'}
            className={`w-full pl-10 pr-10 py-2 sm:py-3 rounded-lg border transition-all duration-300 bg-white text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent ${isPasswordInvalid ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
              }`}
            placeholder="Enter your password"
            value={password}
            onChange={handlePasswordChange}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="text-right mb-2">
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors duration-300 underline-offset-2 hover:underline"
          >
            Forgot Password?
          </button>
        </div>

        {error && <div className="mb-2"><p className="text-red-400 text-xs">{error}</p></div>}

        <button
          type="submit"
          className="w-full py-2 sm:py-3 px-4 rounded-lg font-semibold text-sm sm:text-base bg-primary-900 hover:bg-yellow-500 text-white hover:text-gray-900 transition-all duration-300 transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-yellow-400/50 active:scale-95"
        >
          Sign In
        </button>
      </form>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
};

export default LoginForm;