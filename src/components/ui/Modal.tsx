import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./Modal.css";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  closeOnOverlayClick = true,
  showCloseButton = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      modalRef.current?.focus();

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handleEscape);

      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "";
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div className={`modal modal--${size}`} ref={modalRef} tabIndex={-1}>
        {(title || showCloseButton) && (
          <div className="modal__header">
            {title && (
              <h2 id="modal-title" className="modal__title">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                className="modal__close"
                onClick={onClose}
                aria-label="Kapat"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="modal__content">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
