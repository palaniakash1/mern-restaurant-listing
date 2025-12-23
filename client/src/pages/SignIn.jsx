import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  signInStart,
  signInSuccess,
  signInFailure,
  clearError,
} from "../redux/user/userSlice";
import { useDispatch, useSelector } from "react-redux";
import OAuth from "../components/OAuth";

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

export default function SignIn() {
  const [formData, setFormData] = useState({});
  const { loading, error } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // State to hold the password value
  const [password, setPassword] = useState("");
  // State to toggle between 'password' and 'text' input types
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    if (error) dispatch(clearError());
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
    if (e.target.id === "password") {
      setPassword(e.target.value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      dispatch(signInFailure("Please fill in all fields"));
      return;
    }
    try {
      dispatch(signInStart());
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success === false) {
        dispatch(signInFailure(data.message));
        return;
      }
      if (res.ok) {
        dispatch(signInSuccess(data));
        navigate("/");
      }
    } catch (error) {
      dispatch(signInFailure(error.message));
    }
  };

  // Toggles the showPassword state
  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  // Determine the input type dynamically
  const inputType = showPassword ? "text" : "password";

  return (
    <main className="min-h-[88vh] pt-4">
      <div className="p-3 max-w-lg mx-auto">
        <h1 className="text-3xl text-center font-bold my-5">Sign In</h1>
        {error && <p className="text-red-600 my-4">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            id="email"
            className="border p-3 rounded-lg bg-white"
            onChange={handleChange}
          />
          {/* Password Input Container */}
          <div className="relative">
            <input
              type={inputType} // Dynamically set type
              placeholder="Password"
              id="password"
              className="w-full border p-3 rounded-lg bg-white pr-10 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
              onChange={handleChange}
              value={password}
            />

            {/* Password Toggle Button */}
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-150"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOffIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          <button
            disabled={loading}
            className="uppercase p-2 rounded-lg bg-gradient-to-br from-pink-500 to-orange-400 text-white hover:bg-gradient-to-bl focus:ring-pink-200 dark:focus:ring-pink-800"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
          <OAuth />
        </form>
        <div className="flex gap-2 mt-4">
          <p className="capitalize">Don't having an account?</p>
          <Link to={"/sign-up"}>
            <span className="text-blue-700 underline">Sign Up</span>
          </Link>
        </div>
      </div>

    </main>
  );
}
