import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import logo from "../assets/eatwisely.ico";
import PasswordStrength from "../components/PasswordStrength";
import { resetPassword } from "../services/authService";

const EyeIcon = () => (
  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.46-1.32" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

const KeyIcon = () => (
  <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="m11.5 11.5 7.5 7.5" />
    <path d="m21 21-3-3" />
    <path d="M11.5 8.5 9 11" />
    <path d="M14.5 11.5 12 14" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-16 h-16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m9 11 3 3L22 4" />
  </svg>
);

const WarningIcon = () => (
  <svg className="w-16 h-16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get("token");
  const userId = searchParams.get("userId");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isValidLink, setIsValidLink] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!token || !userId) {
      setIsValidLink(false);
    }
  }, [token, userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError("Password must be at least 8 characters with 1 capital letter and 1 number");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(userId, token, password);
      setSuccess(true);
      setTimeout(() => navigate("/sign-in"), 3500);
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidLink) {
    return (
      <div className="min-h-screen bg-[#f1f8eb] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#8fa31e]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#8fa31e]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>
        
        <div className={`relative z-10 w-full max-w-md transform transition-all duration-700 ${mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-10 text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <div className="text-red-500">
                <WarningIcon />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Link Expired</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              This password reset link has expired or is invalid. Please request a new one.
            </p>
            <Link
              to="/sign-in"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#8fa31e] hover:bg-[#7a8c1a] text-white font-bold rounded-full transition-all duration-300 shadow-lg shadow-[#8fa31e]/30"
            >
              <LockIcon /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f1f8eb] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#8fa31e]/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>
        
        <div className={`relative z-10 w-full max-w-md transform transition-all duration-700 ${mounted ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
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
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Password Reset!</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Your password has been successfully updated. Redirecting you to login...
            </p>
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-2 h-2 bg-[#8fa31e] rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
              <div className="w-2 h-2 bg-[#8fa31e] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              <div className="w-2 h-2 bg-[#8fa31e] rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
            </div>
            <Link
              to="/sign-in"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#8fa31e] hover:bg-[#7a8c1a] text-white font-bold rounded-full transition-all duration-300 shadow-lg shadow-[#8fa31e]/30"
            >
              Sign In Now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f8eb] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#8fa31e]/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#8fa31e]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-[#8fa31e]/40 rounded-full animate-float"
            style={{
              top: `${15 + i * 10}%`,
              left: `${5 + i * 12}%`,
              animationDelay: `${i * 0.4}s`,
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
              <KeyIcon />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-3">New Password</h1>
          <p className="text-gray-500">Create a secure password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <LockIcon /> New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-5 py-4 bg-[#f1f8eb] border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#8fa31e] focus:ring-4 focus:ring-[#8fa31e]/10 transition-all duration-300"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#8fa31e] transition-colors p-1"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-5 py-4 bg-[#f1f8eb] border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#8fa31e] focus:ring-4 focus:ring-[#8fa31e]/10 transition-all duration-300"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#8fa31e] transition-colors p-1"
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              
              {confirmPassword && (
                <p className={`text-xs font-medium ${password === confirmPassword ? "text-green-500" : "text-red-500"}`}>
                  {password === confirmPassword ? "✓ Passwords match" : "✗ Passwords don't match"}
                </p>
              )}
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
                  Updating...
                </>
              ) : (
                <>
                  <LockIcon />
                  Update Password
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Remember your password?{" "}
            <Link to="/sign-in" className="text-[#8fa31e] hover:text-emerald-600 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-10 flex justify-center gap-6 text-gray-400 text-xs">
          <div className="flex items-center gap-1">
            <LockIcon />
            <span>256-bit SSL</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>1hr expiry</span>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">© 2025 EatWisely</p>
      </div>
    </div>
  );
}