import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { supabase, isOnline } from "../../lib/supabase";
import "./admin-theme.css";

interface Test {
  id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  total_score: number;
  display_name: string | null;
  phone: string | null;
}

export const AdminTests: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      if (!isOnline()) {
        setError("İnternet bağlantısı gerekli");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .rpc("get_tests_with_profiles");

      if (fetchError) throw fetchError;
      setTests(data || []);
    } catch (err) {
      console.error("Error fetching tests:", err);
      setError("Testler yüklenirken hata oluştu");
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

  const filteredTests = tests
    .filter((test) => filterStatus === "all" || test.status === filterStatus)
    .filter(
      (test) =>
        test.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (test.display_name && test.display_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (test.phone && test.phone.includes(searchTerm))
    );

  const stats = {
    all: tests.length,
    completed: tests.filter((t) => t.status === "completed").length,
    in_progress: tests.filter((t) => t.status === "in_progress").length,
    not_completed: tests.filter((t) => t.status === "not_completed").length,
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
            <h1 className="admin-title">Test Oturumları</h1>
            <p className="admin-subtitle">Toplam {tests.length} test</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="admin-tabs">
          <button
            className={`admin-tab ${filterStatus === "all" ? "active" : ""}`}
            onClick={() => setFilterStatus("all")}
          >
            Tümü
            <span className="admin-tab-count">{stats.all}</span>
          </button>
          <button
            className={`admin-tab ${filterStatus === "completed" ? "active" : ""}`}
            onClick={() => setFilterStatus("completed")}
          >
            Tamamlandı
            <span className="admin-tab-count">{stats.completed}</span>
          </button>
          <button
            className={`admin-tab ${filterStatus === "in_progress" ? "active" : ""}`}
            onClick={() => setFilterStatus("in_progress")}
          >
            Devam Ediyor
            <span className="admin-tab-count">{stats.in_progress}</span>
          </button>
          <button
            className={`admin-tab ${filterStatus === "not_completed" ? "active" : ""}`}
            onClick={() => setFilterStatus("not_completed")}
          >
            Tamamlanmadı
            <span className="admin-tab-count">{stats.not_completed}</span>
          </button>
        </div>

        {/* Search */}
        <div className="admin-card">
          <div className="admin-search">
            <svg
              className="admin-search__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              className="admin-search__input"
              placeholder="Test ID veya kullanıcı ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tests Table */}
        <div className="admin-card">
          {filteredTests.length === 0 ? (
            <div className="admin-empty">
              <p>
                {searchTerm || filterStatus !== "all"
                  ? "Arama sonucu bulunamadı"
                  : "Henüz test yok"}
              </p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Test ID</th>
                    <th>Kullanıcı</th>
                    <th>Başlangıç</th>
                    <th>Bitiş</th>
                    <th>Durum</th>
                    <th>Puan</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTests.map((test) => (
                    <tr key={test.id}>
                      <td>
                        <code className="admin-code">{test.id.slice(0, 8)}...</code>
                      </td>
                      <td>
                        <div>
                          <strong>{test.display_name || "Bilinmiyor"}</strong>
                          <div className="admin-text-muted">
                            {test.phone || "-"}
                          </div>
                        </div>
                      </td>
                      <td>{formatDate(test.started_at)}</td>
                      <td>
                        {test.completed_at
                          ? formatDate(test.completed_at)
                          : "-"}
                      </td>
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
  );
};

export default AdminTests;
