import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

declare global {
  interface Window {
    __ALLOW_APP_RELOAD__?: boolean;
  }
}

function setupReloadGuards() {
  const handleKeydown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    const refreshShortcut =
      event.key === "F5" || ((event.ctrlKey || event.metaKey) && key === "r");

    if (refreshShortcut) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (window.__ALLOW_APP_RELOAD__) {
      return;
    }
    event.preventDefault();
    event.returnValue = "";
  };

  window.addEventListener("keydown", handleKeydown, { capture: true });
  window.addEventListener("beforeunload", handleBeforeUnload);

  const originalGo = window.history.go.bind(window.history);
  window.history.go = ((delta?: number) => {
    if (delta === 0) return;
    originalGo(delta);
  }) as History["go"];

  try {
    Reflect.set(window.location, "reload", () => undefined);
  } catch {
    // Some browsers lock Location methods; keydown/beforeunload guards still apply.
  }
}

setupReloadGuards();

// Prevent pinch-to-zoom and double-tap zoom for native app feel
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("gesturechange", (e) => e.preventDefault());
document.addEventListener("gestureend", (e) => e.preventDefault());

let lastTouchEnd = 0;
document.addEventListener("touchend", (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
