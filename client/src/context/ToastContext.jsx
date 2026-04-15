import { createContext, useContext, useState, useCallback } from 'react';
/* eslint-disable react-refresh/only-export-components */

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const hideToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onHide }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3"
      onClick={(e) => e.stopPropagation()}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onHide={onHide} />
      ))}
    </div>
  );
}

function Toast({ toast, onHide }) {
  const colors = {
    success: {
      bg: 'bg-[#f5faeb]',
      text: 'text-[#4d6518]',
      border: 'border-[#dce6c1]',
      iconColor: 'text-[#4d6518]'
    },
    error: {
      bg: 'bg-[#fff5f5]',
      text: 'text-[#8e1d1d]',
      border: 'border-[#fecaca]',
      iconColor: 'text-[#b62828]'
    },
    warning: {
      bg: 'bg-[#fbf6ea]',
      text: 'text-[#6f5a12]',
      border: 'border-[#fde68a]',
      iconColor: 'text-[#b98c1c]'
    },
    info: {
      bg: 'bg-[#eef4ff]',
      text: 'text-[#1f4f8c]',
      border: 'border-[#bfdbfe]',
      iconColor: 'text-[#1f4f8c]'
    }
  };

  const style = colors[toast.type] || colors.info;

  const icons = {
    success: (
      <svg
        className={`w-5 h-5 flex-shrink-0 ${style.iconColor}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    ),
    error: (
      <svg
        className={`w-5 h-5 flex-shrink-0 ${style.iconColor}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    warning: (
      <svg
        className={`w-5 h-5 flex-shrink-0 ${style.iconColor}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    info: (
      <svg
        className={`w-5 h-5 flex-shrink-0 ${style.iconColor}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    )
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-[1.5rem] border ${style.bg} ${style.text} ${style.border} shadow-md min-w-[320px] max-w-[420px] animate-slide-up`}
      role="alert"
    >
      {icons[toast.type]}
      <p className="text-sm font-medium flex-1 leading-tight">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onHide(toast.id);
        }}
        className={`flex-shrink-0 p-1 rounded-full hover:bg-black/5 transition-colors ${style.text} opacity-60 hover:opacity-100`}
        aria-label="Close"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
