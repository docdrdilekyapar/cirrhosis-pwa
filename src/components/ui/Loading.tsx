import React from "react";
import "./Loading.css";

interface LoadingProps {
  /** Yükleme mesajı */
  message?: string;
  /** Boyut varyantı */
  size?: "sm" | "md" | "lg";
  /** Tam ekran modu */
  fullScreen?: boolean;
  /** Alt mesaj (opsiyonel) */
  subtitle?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  message = "Yükleniyor",
  size = "md",
  fullScreen = false,
  subtitle,
}) => {
  return (
    <div
      className={`loading ${fullScreen ? "loading--fullscreen" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={`loading__content loading__content--${size}`}>
        <div className="loading__spinner-container">
          <svg
            className="loading__spinner"
            viewBox="0 0 50 50"
            aria-hidden="true"
          >
            <circle
              className="loading__spinner-track"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              strokeWidth="4"
            />
            <circle
              className="loading__spinner-progress"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
          <div className="loading__pulse" aria-hidden="true" />
        </div>
        
        <div className="loading__text">
          <p className="loading__message">
            {message}
            <span className="loading__dots" aria-hidden="true">
              <span className="loading__dot">.</span>
              <span className="loading__dot">.</span>
              <span className="loading__dot">.</span>
            </span>
          </p>
          {subtitle && (
            <p className="loading__subtitle">{subtitle}</p>
          )}
        </div>
        
        {/* Screen reader only text */}
        <span className="sr-only">
          {message}, lütfen bekleyin
        </span>
      </div>
    </div>
  );
};

export default Loading;
