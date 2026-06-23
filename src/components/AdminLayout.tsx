import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { isCurrentUserAdmin } from "../lib/supabase";
import "./AdminLayout.css";

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<"loading" | "authorized" | "denied">("loading");

  useEffect(() => {
    isCurrentUserAdmin().then((isAdmin) => {
      console.log('isAdmin', isAdmin);
      
      if (isAdmin) {
        setAuthState("authorized");
      } else {
        setAuthState("denied");
      }
    });
  }, []);

  if (authState === "loading") {
    return (
      <div className="admin-layout">
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (authState === "denied") {
    return (
      <div className="admin-layout">
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", gap: "16px" }}>
          <h2 style={{ color: "#dc2626", margin: 0 }}>Erişim Reddedildi</h2>
          <p style={{ color: "#64748b", margin: 0 }}>Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
          <button
            onClick={() => navigate("/")}
            style={{ padding: "10px 24px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="admin-layout">
      <header className="admin-layout__header safe-area-top">
        <div className="admin-layout__container container container--admin"> 
          <Link to="/admin" className="admin-layout__brand">
            <div className="admin-layout__brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M2 12h20" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="admin-layout__brand-text">HETracker Admin</span>
          </Link>

          <nav className="admin-layout__nav">
            <Link
              to="/admin"
              className={`admin-layout__nav-link ${isActive("/admin") && location.pathname === "/admin" ? "active" : ""}`}
            >
              Dashboard
            </Link>
            <Link
              to="/admin/users"
              className={`admin-layout__nav-link ${isActive("/admin/users") ? "active" : ""}`}
            >
              Kullanıcılar
            </Link>
            <Link
              to="/admin/tests"
              className={`admin-layout__nav-link ${isActive("/admin/tests") ? "active" : ""}`}
            >
              Testler
            </Link>
            <Link
              to="/"
              className={`admin-layout__nav-link`}
            >
              Test ekranına git
            </Link>
          </nav>
        </div>
      </header>

      <main className="admin-layout__main">
        <Outlet />
      </main>

      <footer className="admin-layout__footer safe-area-bottom">
        <div className="admin-layout__container container container--admin">
          <p className="admin-layout__footer-text">© 2026 HETracker Admin</p>
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;
