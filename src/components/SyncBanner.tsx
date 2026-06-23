import React from "react";
import { useAuth } from "../context/AuthContext";
import "./SyncBanner.css";

export const SyncBanner: React.FC = () => {
  const {
    isOnline,
    unsyncedCount,
    nextSyncTime,
    todaySyncStatus,
    autoSyncInProgress,
  } = useAuth();

  // Auto sync devam ediyorsa
  if (autoSyncInProgress) {
    return (
      <div className="sync-banner sync-banner--info">
        <div className="sync-banner__content">
          <span className="sync-banner__icon">🔄</span>
          <div className="sync-banner__text">
            <strong>Otomatik senkronizasyon yapılıyor...</strong>
          </div>
        </div>
        <div className="sync-banner__spinner" />
      </div>
    );
  }

  // Offline uyarısı
  if (!isOnline && unsyncedCount > 0) {
    return (
      <div className="sync-banner sync-banner--warning">
        <div className="sync-banner__content">
          <span className="sync-banner__icon">📡</span>
          <div className="sync-banner__text">
            <strong>Çevrimdışı</strong>
            <span> • {unsyncedCount} sonuç senkronize edilmeyi bekliyor</span>
          </div>
        </div>
      </div>
    );
  }

  // Bugün sync yapıldıysa başarı mesajı
  if (todaySyncStatus.synced && todaySyncStatus.times.length > 0) {
    return (
      <div className="sync-banner sync-banner--success">
        <div className="sync-banner__content">
          <span className="sync-banner__icon">✅</span>
          <div className="sync-banner__text">
            <strong>
              Bugün {todaySyncStatus.times.join(" ve ")} senkronize edildi
            </strong>
            {nextSyncTime && (
              <span> • Sonraki: {nextSyncTime.time}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
 
export default SyncBanner;
