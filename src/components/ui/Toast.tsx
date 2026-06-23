import React, { createContext, useContext, useState, useCallback } from "react";
import "./Toast.css";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (type: ToastType, message: string, duration = 3000) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, message }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, duration);
    },
    []
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" role="region" aria-label="Bildirimler">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast--${toast.type}`}
            role="alert"
            aria-live="polite"
          >
            <span className="toast__icon">
              {toast.type === "success" && <SuccessIcon />}
              {toast.type === "error" && <ErrorIcon />}
              {toast.type === "warning" && <WarningIcon />}
              {toast.type === "info" && <InfoIcon />}
            </span>
            <span className="toast__message">{toast.message}</span>
            <button
              className="toast__close"
              onClick={() => removeToast(toast.id)}
              aria-label="Bildirimi kapat"
            >
              <CloseIcon />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Icons
const SuccessIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path
      d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M22 4L12 14.01l-3-3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ErrorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const WarningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default ToastProvider;
