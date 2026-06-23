import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { supabase, isOnline } from "../../lib/supabase";
import "./admin-theme.css";

interface User {
  id: string;
  display_name: string;
  phone: string | null;
  age: number | null;
  gender: string | null;
  created_at: string;
  consent_accepted: boolean;
  is_active: boolean;
}

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      if (!isOnline()) {
        setError("İnternet bağlantısı gerekli");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Kullanıcılar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      const { error: rpcError } = await supabase.rpc("admin_deactivate_user", {
        target_user_id: userId,
      });

      if (rpcError) throw rpcError;

      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, is_active: false } : u
        )
      );
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Error deactivating user:", err);
      alert("Kullanıcı pasife alınırken hata oluştu");
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const filteredUsers = users.filter(
    (user) =>
      user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(searchTerm))
  );

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
            <h1 className="admin-title">Kullanıcı Yönetimi</h1>
            <p className="admin-subtitle">
              Toplam {users.length} kullanıcı
            </p>
          </div>
          <Link to="/admin/users/create" className="admin-btn admin-btn--primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Yeni Kullanıcı
          </Link>
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
              placeholder="İsim veya telefon ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="admin-card">
          {filteredUsers.length === 0 ? (
            <div className="admin-empty">
              <p>
                {searchTerm
                  ? "Arama sonucu bulunamadı"
                  : "Henüz kullanıcı yok"}
              </p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>İsim</th>
                    <th>Telefon</th>
                    <th>Yaş</th>
                    <th>Cinsiyet</th>
                    <th>Durum</th>
                    <th>Kayıt Tarihi</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="admin-user-cell">
                          <div className="admin-avatar">
                            {user.display_name.charAt(0).toUpperCase()}
                          </div>
                          <strong>{user.display_name}</strong>
                        </div>
                      </td>
                      <td>{user.phone || "-"}</td>
                      <td>{user.age || "-"}</td>
                      <td>
                        <span className="admin-badge admin-badge--muted">
                          {user.gender === "male" ? "Erkek" : user.gender === "female" ? "Kadın" : "-"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`admin-badge admin-badge--${
                            user.is_active ? "success" : "muted"
                          }`}
                        >
                          {user.is_active ? "Aktif" : "Pasif"}
                        </span>
                      </td>
                      <td>{formatDate(user.created_at)}</td>
                      <td>
                        <div className="admin-table-actions">
                          <Link
                            to={`/admin/users/${user.id}`}
                            className="admin-icon-btn"
                            title="Düzenle"
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </Link>
                          {deleteConfirm === user.id ? (
                            <div className="admin-delete-confirm">
                              <button
                                className="admin-icon-btn admin-icon-btn--danger"
                                onClick={() => handleDelete(user.id)}
                                title="Pasife Al"
                              >
                                ✓
                              </button>
                              <button
                                className="admin-icon-btn"
                                onClick={() => setDeleteConfirm(null)}
                                title="İptal"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              className="admin-icon-btn admin-icon-btn--danger"
                              onClick={() => setDeleteConfirm(user.id)}
                              title="Pasife Al"
                              disabled={!user.is_active}
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          )}
                        </div>
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

export default AdminUsers;
