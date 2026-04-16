import React from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleForgotPassword = () => {
    onClose();
    navigate('/login/forgot-password');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/20 p-6 shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">Reset Password</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="text-center">
          <p className="text-gray-300 text-sm mb-6">
            Need to reset your password? We'll send you an OTP to verify your identity and create a new password.
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleForgotPassword}
              className="flex-1 py-2 px-4 rounded-lg bg-primary-900 hover:bg-yellow-500 text-white hover:text-gray-900 transition-all duration-300"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;