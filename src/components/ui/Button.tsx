import React from "react";
import "./Button.css";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = "left",
  disabled,
  className = "",
  ...props
}) => {
  const classes = [
    "btn",
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth && "btn--full-width",
    loading && "btn--loading",
    disabled && "btn--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading && (
        <span className="btn__spinner" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" opacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
        </span>
      )}
      {icon && iconPosition === "left" && !loading && (
        <span className="btn__icon btn__icon--left">{icon}</span>
      )}
      <span className="btn__text">{children}</span>
      {icon && iconPosition === "right" && !loading && (
        <span className="btn__icon btn__icon--right">{icon}</span>
      )}
    </button>
  );
};

export default Button;
