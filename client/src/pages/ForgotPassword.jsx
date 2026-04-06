import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/eatwisely.ico';
import { forgotPassword } from '../services/authService';

const MailIcon = () => (
  <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-16 h-16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m9 11 3 3L22 4" />
  </svg>
);

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f8eb] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#8fa31e]/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#8fa31e]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-[#8fa31e]/40 rounded-full animate-float"
            style={{
              top: `${20 + i * 12}%`,
              left: `${8 + i * 14}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i * 0.5}s`
            }}
          />
        ))}
      </div>

      <div className={`relative z-10 w-full max-w-lg transform transition-all duration-700 ${mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <img src={logo} alt="logo" className="w-14 h-14" />
          </Link>
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#8fa31e] to-emerald-600 rounded-2xl mb-6 shadow-xl shadow-[#8fa31e]/40 rotate-3 hover:rotate-0 transition-transform duration-500">
            <div className="text-white">
              <MailIcon />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-3">Forgot Password?</h1>
          <p className="text-gray-500">No worries, we'll send you reset instructions.</p>
        </div>

        {success ? (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-10 text-center">
            <div className="relative">
              <div className="w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <div className="text-green-500">
                  <CheckIcon />
                </div>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#8fa31e] rounded-full flex items-center justify-center animate-bounce">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Check Your Email</h2>
            <p className="text-gray-500 mb-6 leading-relaxed">
              If an account exists for <span className="font-semibold text-gray-700">{email}</span>, we have sent password reset instructions.
            </p>
            <div className="bg-[#f1f8eb] rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-[#8fa31e]">TIP:</span> Check your Mailtrap inbox if testing on localhost
              </p>
            </div>
            <Link
              to="/sign-in"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#8fa31e] hover:bg-[#7a8c1a] text-white font-bold rounded-full transition-all duration-300 shadow-lg shadow-[#8fa31e]/30"
            >
              <LockIcon /> Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <MailIcon /> Email Address
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="w-full px-5 py-4 bg-[#f1f8eb] border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#8fa31e] focus:ring-4 focus:ring-[#8fa31e]/10 transition-all duration-300"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-[#8fa31e] to-emerald-600 text-white font-bold rounded-2xl hover:shadow-xl hover:shadow-[#8fa31e]/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <MailIcon />
                    Send Reset Link
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Remember your password?{' '}
            <Link to="/sign-in" className="text-[#8fa31e] hover:text-emerald-600 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">© 2025 EatWisely</p>
      </div>
    </div>
  );
}