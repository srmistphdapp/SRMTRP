import { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabaseAuth } from '../../supabaseAuth.js';
import { Link, useNavigate } from 'react-router-dom';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Sending OTP to:', email);
      await supabaseAuth.resetPassword(email);
      console.log('OTP sent successfully');
      setIsSuccess(true);
      
      // Redirect to reset password page after 3 seconds
      setTimeout(() => {
        const redirectUrl = `/login/reset-password?email=${encodeURIComponent(email)}`;
        console.log('Redirecting to:', redirectUrl);
        navigate(redirectUrl);
      }, 3000);
    } catch (error) {
      console.error('Password reset request error:', error);
      setError(error.message || 'Failed to send reset email. Please try again.');
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
          <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">Check Your Email!</h2>
          <p className="text-gray-200 mb-6 leading-relaxed">
            We've sent an 8-digit OTP to <span className="text-yellow-300 font-semibold">{email}</span>
          </p>
          <p className="text-gray-300 text-sm mb-8">
            Redirecting you to the verification page in a few seconds...
          </p>
          <button
            onClick={() => {
              const redirectUrl = `/login/reset-password?email=${encodeURIComponent(email)}`;
              console.log('Manual redirect to:', redirectUrl);
              navigate(redirectUrl);
            }}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-gray-900 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Continue to Verification
          </button>
        </div>
      </div>
    );
  }

  // Email input form
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8 w-full max-w-md transform animate-in fade-in-0 zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400/20 to-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Mail className="w-10 h-10 text-blue-400 drop-shadow-lg" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3 drop-shadow-lg">Forgot Password?</h2>
          <p className="text-gray-200 text-sm leading-relaxed">
            Enter your email address and we'll send you an OTP to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="email"
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all duration-300"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-300 text-sm text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-gray-900 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={isLoading || !email}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending OTP...
              </span>
            ) : 'Send OTP'}
          </button>

          <div className="text-center space-y-2">
            <Link
              to="/"
              className="inline-flex items-center text-gray-300 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;