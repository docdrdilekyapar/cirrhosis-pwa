import React from "react";
import "./Card.css";

export interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  as?: "div" | "article" | "section";
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  padding = "md",
  className = "",
  onClick,
  as: Component = "div",
}) => {
  const classes = [
    "card",
    `card--${variant}`,
    `card--padding-${padding}`,
    onClick && "card--clickable",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Component
      className={classes}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      {children}
    </Component>
  );
};

export default Card;
