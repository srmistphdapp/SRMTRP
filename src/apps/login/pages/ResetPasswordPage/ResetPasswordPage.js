import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, Mail, ArrowLeft } from 'lucide-react';
import { supabaseAuth } from '../../supabaseAuth.js';
import { Link, useSearchParams } from 'react-router-dom';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState('otp'); // 'otp' or 'password'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Try to get email from URL params or session
    const emailFromUrl = searchParams.get('email');
    console.log('ResetPasswordPage - Email from URL:', emailFromUrl);
    console.log('ResetPasswordPage - Current URL:', window.location.href);
    
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    } else {
      // If no email in URL, redirect to forgot password page
      console.log('No email found, redirecting to forgot password page');
      window.location.href = '/login/forgot-password';
    }
  }, [searchParams]);

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    if (!otp || otp.length !== 8) {
      setError('Please enter the 8-digit OTP from your email.');
      return;
    }

    setIsLoading(true);

    try {
      await supabaseAuth.verifyOtp(email, otp, 'recovery');
      setStep('password');
    } catch (error) {
      console.error('OTP verification error:', error);
      setError(error.message || 'Invalid OTP. Please check your email and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await supabaseAuth.updatePassword(password);
      setIsSuccess(true);
    } catch (error) {
      console.error('Password update error:', error);
      setError(error.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Success screen
  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8 w-full max-w-md text-center transform animate-in fade-in-0 zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400/20 to-green-600/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="w-10 h-10 text-green-400 drop-shadow-lg" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">Password Updated!</h2>
          <p className="text-gray-200 mb-8 leading-relaxed">
            Your password has been successfully updated. You can now sign in with your new password.
          </p>
          <Link
            to="/"
            className="w-full inline-block py-4 px-6 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-gray-900 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  // OTP Verification Step
  if (step === 'otp') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8 w-full max-w-md transform animate-in fade-in-0 zoom-in-95 duration-300">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400/20 to-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Mail className="w-10 h-10 text-blue-400 drop-shadow-lg" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 drop-shadow-lg">Enter OTP</h2>
            <p className="text-gray-200 text-sm leading-relaxed mb-2">
              We've sent an 8-digit OTP to:
            </p>
            <p className="text-yellow-300 font-semibold text-sm">
              {email}
            </p>
          </div>

          <form onSubmit={handleOtpSubmit} className="space-y-6">
            <div className="relative">
              <input
                type="text"
                className="w-full px-4 py-6 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 text-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 text-center tracking-[0.5em] font-mono transition-all duration-300"
                placeholder="00000000"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                  setOtp(value);
                }}
                maxLength={8}
                required
                disabled={isLoading}
                autoFocus
              />
              <p className="text-gray-400 text-xs text-center mt-2">
                Enter the 8-digit code from your email
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-300 text-sm text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-gray-900 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              disabled={isLoading || otp.length !== 8}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : 'Verify OTP'}
            </button>

            <div className="text-center space-y-2">
              <Link
                to="/login/forgot-password"
                className="text-sm text-yellow-300 hover:text-yellow-200 transition-colors duration-300 underline-offset-2 hover:underline"
              >
                Didn't receive the code? Try again
              </Link>
              <br />
              <Link
                to="/"
                className="text-sm text-gray-400 hover:text-gray-300 transition-colors duration-300"
              >
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Password Reset Step
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8 w-full max-w-md transform animate-in fade-in-0 zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <button
            onClick={() => setStep('otp')}
            className="inline-flex items-center text-gray-300 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to OTP
          </button>
          <h2 className="text-3xl font-bold text-white mb-3 drop-shadow-lg">Set New Password</h2>
          <p className="text-gray-200 text-sm leading-relaxed">Enter your new password below</p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type={showPassword ? 'text' : 'password'}
              className="w-full pl-12 pr-12 py-4 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all duration-300"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              className="w-full pl-12 pr-12 py-4 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all duration-300"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-300 text-sm text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-gray-900 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating Password...
              </span>
            ) : 'Update Password'}
          </button>

          <div className="text-center">
            <Link
              to="/"
              className="text-sm text-yellow-300 hover:text-yellow-200 transition-colors duration-300 underline-offset-2 hover:underline"
            >
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;