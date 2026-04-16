import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OAuth from '../components/OAuth';
import wavepattern from '../assets/wavepattern.png';
import logo from '../assets/eatwisely.ico';
import { Modal } from 'flowbite-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { forgotPassword } from '../services/authService';

const EyeIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.46-1.32" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

const MailIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const LockIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CloseIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className='text-red-500'
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export default function SignIn() {
  const [formData, setFormData] = useState({});
  const { login, isLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
    if (e.target.id === 'password') {
      setPassword(e.target.value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    const result = await login(formData.email, formData.password);

    if (result.success) {
      navigate('/');
      return;
    }

    showToast(result.error, 'error');
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!resetEmail) {
      showToast('Please enter your email address', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    setResetLoading(true);

    try {
      await forgotPassword(resetEmail);
      setResetSuccess(true);
    } catch (err) {
      showToast(
        err.message || 'Failed to send reset email. Please try again.',
        'error'
      );
    } finally {
      setResetLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const inputType = showPassword ? 'text' : 'password';

  const openForgotModal = () => {
    setResetEmail(formData.email || '');
    setResetSuccess(false);
    setResetError(null);
    setShowForgotModal(true);
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setResetEmail('');
    setResetSuccess(false);
    setResetError(null);
  };

  return (
    <>
      <main className="min-h-screen flex">
        <div className="hidden lg:flex flex-col w-[45%] bg-[#8fa31e] relative overflow-hidden p-12 justify-center items-start">
          <img
            src={wavepattern}
            alt="pattern"
            className="absolute top-0 left-0 w-full opacity-30 pointer-events-none object-cover"
          />

          <div className="relative z-10">
            <h1 className="text-7xl font-black text-white leading-tight uppercase tracking-normal">
              CLARITY IN <br /> EVERY <br /> INGREDIENT
            </h1>
            <div className="mt-8 w-full">
              <svg
                viewBox="0 0 120 40"
                fill="none"
                className="w-full h-auto"
                preserveAspectRatio="xMidYMid meet"
              >
                <path
                  d="M10 10C30 35 90 35 110 10"
                  stroke="#ff0000"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M5 12L15 8"
                  stroke="#ff0000"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M115 12L105 8"
                  stroke="#ff0000"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-[#f1f8eb] flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100">
            <div className="py-8 text-center pb-0">
              <div className="flex items-center justify-center gap-1 mb-6">
                <Link to="/">
                  <img src={logo} width="200px" height="200px" alt="logo" />
                </Link>
              </div>
              <div className="bg-[#8fa31e] text-white py-3 rounded-[2px] shadow-md">
                <h2 className="text-xl font-semibold">Welcome Back</h2>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
              <div className="space-y-1 mt-4">
                <label className="text-md font-normal text-gray-500 mt-10">
                  Enter Email
                </label>
                <input
                  type="email"
                  placeholder=""
                  id="email"
                  className="w-full border-gray-200 p-3 !rounded-[5px] bg-white focus:!ring-[#8fa31e] focus:!border-[#8fa31e]"
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1 relative ">
                <label className="text-md font-normal text-gray-500 mt-10">
                  Enter Password
                </label>
                <div className="relative">
                  <input
                    type={inputType}
                    placeholder=""
                    id="password"
                    className=" w-full border-gray-200 p-3 !rounded-[5px] bg-white pr-12 focus:!ring-[#8fa31e] focus:!border-[#8fa31e]"
                    onChange={handleChange}
                    value={password}
                  />

                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center  !text-[#8fa31e]"
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <div className="text-right mt-1">
                  <button
                    type="button"
                    onClick={openForgotModal}
                    className="text-xs text-[#8fa31e] hover:underline bg-transparent border-none cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              <button
                disabled={isLoading}
                className=" p-2 rounded-[5px] !bg-[#8fa31e] hover:!bg-[#7a8c1a] text-white !rounded-[4px] border-none"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
              <OAuth />
            </form>

            <div className="text-center pt-4">
              <p className="text-gray-600 text-sm">
                Create new account?{' '}
                <Link
                  to="/sign-up"
                  className="text-red-600 font-bold hover:underline"
                >
                  Sign Up
                </Link>
              </p>
            </div>

            <div className="pb-6 mt-10 text-center">
              <p className="text-[10px] text-gray-400">© 2025 EatWisely</p>
            </div>
          </div>
        </div>
      </main>

      <Modal
        show={showForgotModal}
        onClose={closeForgotModal}
        size="md"
        popup
        className="forgot-password-modal"
        dismissible={true}
      >
        <Modal.Header className="border-b-0 pb-0" />
        <Modal.Body className="pt-0">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-[#8fa31e]/10 rounded-full flex items-center justify-center mb-4">
              <LockIcon className="h-8 w-8 text-[#8fa31e]" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Forgot Password?
            </h3>
            <p className="text-gray-500 text-sm">
              No worries, we'll send you reset instructions.
            </p>
          </div>

          {resetSuccess ? (
            <div className="text-center py-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <MailIcon className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Check Your Email
              </h4>
              <p className="text-gray-500 text-sm mb-4">
                If an account exists for{' '}
                <span className="font-medium text-gray-700">{resetEmail}</span>,
                we have sent password reset instructions.
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Please check your spam folder if you don't see the email.
              </p>
              <button
                onClick={closeForgotModal}
                className="w-full p-3 rounded-[5px] !bg-[#8fa31e] hover:!bg-[#7a8c1a] text-white border-none cursor-pointer font-medium"
              >
                Got it, close
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter your email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MailIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      if (resetError) setResetError(null);
                    }}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-[5px] focus:ring-2 focus:ring-[#8fa31e] focus:border-[#8fa31e]"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeForgotModal}
                  className="flex-1 p-3 rounded-[5px] !bg-[#B42627] hover:!bg-[#910712] text-gray-700 border-none cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 p-3 rounded-[5px] !bg-[#8fa31e] hover:!bg-[#7a8c1a] text-white border-none cursor-pointer font-medium disabled:opacity-50"
                >
                  {resetLoading ? 'Sending...' : 'Send Instructions'}
                </button>
              </div>
            </form>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
