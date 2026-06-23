import { useRegisterSW } from "virtual:pwa-register/react";
import "./PWABadge.css";

function PWABadge() {
  const period = 60 * 1000;

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl: string, registration: ServiceWorkerRegistration | undefined) {
      if (!registration || period <= 0) return;
      registerPeriodicSync(period, swUrl, registration);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const handleUpdate = async () => {
    window.__ALLOW_APP_RELOAD__ = true;
    await updateServiceWorker(true);
  };

  if (!offlineReady && !needRefresh) {
    return null;
  }

  return (
    <div className="PWABadge" role="alert" aria-labelledby="pwa-toast-message">
      <div className="PWABadge-toast">
        <p id="pwa-toast-message" className="PWABadge-toast-message">
          {offlineReady
            ? "Uygulama cevrimdisi kullanima hazir."
            : "Yeni surum hazir. Guncelle butonuna basarak en son surume gecebilirsiniz."}
        </p>
        <div className="PWABadge-buttons">
          {needRefresh && (
            <button className="PWABadge-toast-button primary" onClick={handleUpdate}>
              Guncelle
            </button>
          )}
          <button className="PWABadge-toast-button" onClick={close}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

export default PWABadge;

function registerPeriodicSync(
  periodMs: number,
  swUrl: string,
  registration: ServiceWorkerRegistration
) {
  setInterval(async () => {
    if ("onLine" in navigator && !navigator.onLine) {
      return;
    }

    const response = await fetch(swUrl, {
      cache: "no-store",
      headers: {
        cache: "no-store",
        "cache-control": "no-cache",
      },
    });

    if (response.status === 200) {
      await registration.update();
    }
  }, periodMs);
}
