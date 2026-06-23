import React from "react";
import "./ProgressBar.css";

export interface ProgressBarProps {
  current: number;
  total: number;
  showLabel?: boolean;
  variant?: "default" | "success" | "warning";
  size?: "sm" | "md";
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  showLabel = true,
  variant = "default",
  size = "md",
  animated = true,
}) => {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className={`progress progress--${size}`}>
      {showLabel && (
        <div className="progress__label">
          <span className="progress__count">
            {current} / {total}
          </span>
          <span className="progress__percentage">{percentage}%</span>
        </div>
      )}
      <div
        className="progress__track"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`progress__fill progress__fill--${variant} ${
            animated ? "progress__fill--animated" : ""
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
