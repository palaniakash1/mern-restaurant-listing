import { useState } from "react";
import { TextInput } from "flowbite-react";

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 3l18 18M10.584 10.587A2 2 0 0013.414 13.4M9.88 5.09A9.953 9.953 0 0112 4c7 0 10 8 10 8a15.79 15.79 0 01-4.04 5.19M6.61 6.61A15.91 15.91 0 002 12s3 8 10 8a9.95 9.95 0 005.39-1.61"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function PasswordInput({
  className = "",
  rightIconClassName = "",
  ...props
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={`relative ${className}`.trim()}>
      <TextInput
        {...props}
        type={isVisible ? "text" : "password"}
        className="[&_input]:pr-12"
      />
      <button
        type="button"
        aria-label={isVisible ? "Hide password" : "Show password"}
        className={`absolute inset-y-0 right-0 z-10 flex items-center px-3 text-slate-400 transition hover:text-slate-600 ${rightIconClassName}`.trim()}
        onClick={() => setIsVisible((current) => !current)}
      >
        <EyeIcon open={isVisible} />
      </button>
    </div>
  );
}
