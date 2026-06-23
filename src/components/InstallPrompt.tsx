import React, { useState, useEffect } from "react";
import "./InstallPrompt.css";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const InstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already installed
        const standalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as Navigator & { standalone?: boolean }).standalone ===
            true;
        setIsStandalone(standalone);

        // Check if iOS
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
        setIsIOS(ios);

        // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowPrompt(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstall);

        // Show iOS prompt if not installed
        if (ios && !standalone) {
            setShowPrompt(true);
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
            setShowPrompt(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Remember dismissal for this session
        sessionStorage.setItem("pwa-prompt-dismissed", "true");
    };

    // Don't show if already installed or dismissed
    if (
        isStandalone ||
        !showPrompt ||
        sessionStorage.getItem("pwa-prompt-dismissed")
    ) {
        return null;
    }

    return (
        <div className="install-prompt">
            <div className="install-prompt__content">
                <div className="install-prompt__icon">📱</div>
                <div className="install-prompt__text">
                    <strong>Uygulamayı İndir</strong>
                    {isIOS ? (
                        <span>
                            Safari'de{" "}
                            <span className="install-prompt__share-icon">
                                <svg viewBox="0 0 24 24" width="16" height="16">
                                    <path
                                        fill="currentColor"
                                        d="M12 2l-5 5h3v9h4V7h3l-5-5zm-7 18v2h14v-2H5z"
                                    />
                                </svg>
                            </span>{" "}
                            simgesine, ardından "Ana Ekrana Ekle"ye dokunun
                        </span>
                    ) : (
                        <span>Hızlı erişim için ana ekranınıza ekleyin</span>
                    )}
                </div>
            </div>
            <div className="install-prompt__actions">
                {!isIOS && (
                    <button className="install-prompt__button" onClick={handleInstall}>
                        İndir
                    </button>
                )}
                <button
                    className="install-prompt__dismiss"
                    onClick={handleDismiss}
                    aria-label="Kapat"
                >
                    ✕
                </button>
            </div>
        </div>
    );
};

export default InstallPrompt;
