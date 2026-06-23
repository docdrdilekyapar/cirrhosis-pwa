import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { supabase, isOnline } from "../../lib/supabase";
import "./admin-theme.css";

interface DashboardStats {
  totalUsers: number;
  totalTests: number;
  completedTests: number;
  averageScore: number;
  recentTests: Array<{
    id: string;
    user_id: string;
    started_at: string;
    status: string;
    total_score: number;
  }>;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalTests: 0,
    completedTests: 0,
    averageScore: 0,
    recentTests: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      if (!isOnline()) {
        setError("İnternet bağlantısı gerekli");
        setLoading(false);
        return;
      }

      // Fetch users count
      const { count: usersCount, error: usersError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (usersError) throw usersError;

      // Fetch tests count
      const { count: testsCount, error: testsError } = await supabase
        .from("tests")
        .select("*", { count: "exact", head: true });

      if (testsError) throw testsError;

      // Fetch completed tests
      const { count: completedCount, error: completedError } = await supabase
        .from("tests")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed");

      if (completedError) throw completedError;

      // Fetch average score
      const { data: testsData, error: avgError } = await supabase
        .from("tests")
        .select("total_score")
        .eq("status", "completed");

      if (avgError) throw avgError;

      const avgScore =
        testsData && testsData.length > 0
          ? Math.round(
              testsData.reduce((sum, t) => sum + t.total_score, 0) /
                testsData.length / 4
            )
          : 0;

      // Fetch recent tests
      const { data: recentData, error: recentError } = await supabase
        .from("tests")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      setStats({
        totalUsers: usersCount || 0,
        totalTests: testsCount || 0,
        completedTests: completedCount || 0,
        averageScore: avgScore,
        recentTests: recentData || [],
      });
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      setError("İstatistikler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; class: string }> = {
      completed: { text: "Tamamlandı", class: "success" },
      in_progress: { text: "Devam Ediyor", class: "warning" },
      not_completed: { text: "Tamamlanmadı", class: "muted" },
      cancelled: { text: "İptal", class: "error" },
    };
    const badge = badges[status] || { text: status, class: "muted" };
    return <span className={`admin-badge admin-badge--${badge.class}`}>{badge.text}</span>;
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div className="admin-loading">
            <div className="admin-spinner"></div>
            <p>Yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div className="admin-error">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Dashboard</h1>
            <p className="admin-subtitle">Sistem geneline genel bakış</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card admin-stat-card--primary">
            <div className="admin-stat-card__icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="admin-stat-card__content">
              <p className="admin-stat-card__label">Toplam Kullanıcı</p>
              <h2 className="admin-stat-card__value">{stats.totalUsers}</h2>
            </div>
          </div>

          <div className="admin-stat-card admin-stat-card--success">
            <div className="admin-stat-card__icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <div className="admin-stat-card__content">
              <p className="admin-stat-card__label">Tamamlanan Test</p>
              <h2 className="admin-stat-card__value">{stats.completedTests}</h2>
            </div>
          </div>

          <div className="admin-stat-card admin-stat-card--info">
            <div className="admin-stat-card__icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="2" />
              </svg>
            </div>
            <div className="admin-stat-card__content">
              <p className="admin-stat-card__label">Toplam Test</p>
              <h2 className="admin-stat-card__value">{stats.totalTests}</h2>
            </div>
          </div> 
        </div>

        {/* Recent Tests */}
        <div className="admin-section">
          <div className="admin-section__header">
            <h2 className="admin-section__title">Son Testler</h2>
            <Link to="/admin/tests" className="admin-link">
              Tümünü Gör →
            </Link>
          </div>

          <div className="admin-card">
            {stats.recentTests.length === 0 ? (
              <div className="admin-empty">
                <p>Henüz test yok</p>
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Test ID</th>
                      <th>Başlangıç</th>
                      <th>Durum</th>
                      <th>Puan</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentTests.map((test) => (
                      <tr key={test.id}>
                        <td>
                          <code className="admin-code">{test.id.slice(0, 8)}...</code>
                        </td>
                        <td>{formatDate(test.started_at)}</td>
                        <td>{getStatusBadge(test.status)}</td>
                        <td>
                          <strong>{test.total_score}</strong>
                        </td>
                        <td>
                          <Link
                            to={`/admin/tests/${test.id}`}
                            className="admin-table-action"
                          >
                            Detay →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
