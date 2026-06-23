import React, { useEffect, useState } from "react";
import "./OfflineOverlay.css";

export const OfflineOverlay: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="offline-overlay">
      <div className="offline-overlay__card">
        <svg
          className="offline-overlay__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
        </svg>
        <h2 className="offline-overlay__title">İnternet Bağlantısı Gerekli</h2>
        <p className="offline-overlay__message">
          Bu uygulamayı kullanabilmek için aktif bir internet bağlantısına
          ihtiyacınız var. Lütfen internet bağlantınızı kontrol edin.
        </p>
        <div className="offline-overlay__status">
          <span className="offline-overlay__dot" />
          Bağlantı bekleniyor…
        </div>
      </div>
    </div>
  );
};
