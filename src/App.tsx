import { useCallback, useEffect, useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import {
  Layout,
  AdminLayout,
  ToastProvider,
  Loading,
  Card,
  Button,
  OfflineOverlay,
} from "./components";
import { AuthProvider, useAuth } from "./context";
import { acceptInformedConsent, getProfile } from "./lib/supabase";
import Home from "./pages/Home";
import Results from "./pages/Results";
import TestDetail from "./pages/TestDetail";
import TestSession from "./pages/TestSession";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import RegisterScreen from "./pages/RegisterScreen";
import ConsentScreen from "./pages/ConsentScreen";
import {
  AdminDashboard,
  AdminUsers,
  AdminUserCreate,
  AdminUserDetail,
  AdminTests,
  AdminTestDetail,
} from "./pages/admin";
import PWABadge from "./PWABadge";
import "./index.css";

const router = createBrowserRouter([
  {
    index: true,
    element: (
      <Layout>
        <Home />
      </Layout>
    ),
  },
  {
    path: "/results",
    element: (
      <Layout>
        <Results />
      </Layout>
    ),
  },
  {
    path: "/results/:testId",
    element: (
      <Layout>
        <TestDetail />
      </Layout>
    ),
  },
  {
    path: "/test",
    element: (
      <Layout>
        <TestSession />
      </Layout>
    ),
  },
  {
    path: "/profile",
    element: (
      <Layout>
        <Profile />
      </Layout>
    ),
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      {
        path: "users",
        element: <AdminUsers />,
      },
      {
        path: "users/create",
        element: <AdminUserCreate />,
      },
      {
        path: "users/:userId",
        element: <AdminUserDetail />,
      },
      {
        path: "tests",
        element: <AdminTests />,
      },
      {
        path: "tests/:testId",
        element: <AdminTestDetail />,
      },
    ],
  },
  {
    path: "*",
    element: (
      <Layout>
        <NotFound />
      </Layout>
    ),
  },
]);

function AppContent() {
  const { isRegistered, isLoading } = useAuth();
  const [consentStatus, setConsentStatus] = useState<
    "loading" | "required" | "accepted"
  >("loading");
  const [consentError, setConsentError] = useState<string | null>(null);

  const refreshConsentStatus = useCallback(async () => {
    setConsentError(null);
    setConsentStatus("loading");
    try {
      const profile = await getProfile();
      if (!profile) {
        throw new Error("Profil bilgisi alınamadı.");
      }
      setConsentStatus(profile.consent_accepted ? "accepted" : "required");
    } catch (error) {
      setConsentError(
        error instanceof Error
          ? error.message
          : "Onam durumu kontrol edilirken hata oluştu."
      );
    }
  }, []);

  useEffect(() => {
    if (!isRegistered) {
      setConsentStatus("loading");
      setConsentError(null);
      return;
    }
    refreshConsentStatus();
  }, [isRegistered, refreshConsentStatus]);

  const handleConsentAccept = useCallback(async (fullName: string) => {
    await acceptInformedConsent(fullName);
    setConsentStatus("accepted");
  }, []);

  if (isLoading) {
    return (
      <Loading
        message="Uygulama yükleniyor"
        size="lg"
        fullScreen
      />
    );
  }

  if (!isRegistered) {
    return <RegisterScreen />;
  }

  if (consentStatus === "loading") {
    return <Loading message="Onam durumu kontrol ediliyor" size="lg" fullScreen />;
  }

  if (consentError) {
    return (
      <div className="container" style={{ paddingTop: "2rem" }}>
        <Card variant="outlined" padding="lg">
          <p style={{ marginBottom: "1rem" }}>
            Onam durumu Supabase&apos;den kontrol edilemedi.
          </p>
          <p style={{ marginBottom: "1rem" }}>{consentError}</p>
          <Button variant="primary" fullWidth onClick={refreshConsentStatus}>
            Tekrar Dene
          </Button>
        </Card>
      </div>
    );
  }

  if (consentStatus === "required") {
    return <ConsentScreen onAccept={handleConsentAccept} />;
  }

  return <RouterProvider router={router} />;
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <OfflineOverlay />
        <AppContent />
        <PWABadge />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
