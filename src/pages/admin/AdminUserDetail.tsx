import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { supabase, isOnline, adminChangeUserPassword, adminChangeUserEmail } from "../../lib/supabase";
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

export const AdminUserDetail: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const isCreateMode = userId === "create";

  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    display_name: "",
    phone: "",
    age: "",
    gender: "male",
    is_active: true,
  });
  const [loading, setLoading] = useState(!isCreateMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isCreateMode && userId) {
      fetchUser();
    }
  }, [userId, isCreateMode]);

  const fetchUser = async () => {
    if (!userId || !isOnline()) return;

    try {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (fetchError) throw fetchError;
      
      setUser(data);
      setFormData({
        display_name: data.display_name,
        phone: data.phone || "",
        age: data.age?.toString() || "",
        gender: data.gender || "male",
        is_active: data.is_active,
      });
    } catch (err) {
      console.error("Error fetching user:", err);
      setError("Kullanıcı yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      if (!isOnline()) {
        throw new Error("İnternet bağlantısı gerekli");
      }

      if (isCreateMode) {
        // Create new user - Admin panelden manuel oluşturma desteklenmiyor
        throw new Error("Kullanıcılar sadece kayıt ekranından oluşturulabilir");
      } else {
        // Update existing user via RPC (bypasses RLS)
        const { data, error: updateError } = await supabase.rpc(
          "admin_update_profile",
          {
            target_user_id: userId,
            new_display_name: formData.display_name,
            new_phone: formData.phone || null,
            new_age: formData.age ? parseInt(formData.age) : null,
            new_gender: formData.gender,
            new_is_active: formData.is_active,
          }
        );

        console.log("Update response:", { data, error: updateError });

        if (updateError) {
          console.error("Update error:", updateError);
          throw updateError;
        }

        setSuccess(true);
        // Başarılı güncelleme sonrası 1.5 saniye bekleyip yönlendir
        setTimeout(() => {
          navigate("/admin/users");
        }, 1500);
      }
    } catch (err: any) {
      console.error("Error saving user:", err);
      setError(err.message || "Kullanıcı kaydedilirken hata oluştu");
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <button
              className="admin-back-btn"
              onClick={() => navigate("/admin/users")}
            >
              ← Geri
            </button>
            <h1 className="admin-title">
              {isCreateMode ? "Yeni Kullanıcı" : "Kullanıcı Düzenle"}
            </h1>
            {!isCreateMode && user && (
              <p className="admin-subtitle">
                <code>{user.id}</code>
              </p>
            )}
          </div>
        </div>

        <div className="admin-card admin-form-card" style={{padding: '16px'}}>
          {success && (
            <div className="admin-alert admin-alert--success">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Kullanıcı başarıyla güncellendi!
            </div>
          )}

          {error && (
            <div className="admin-alert admin-alert--error">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="admin-form-group">
              <label htmlFor="display_name" className="admin-label">
                İsim Soyisim <span className="admin-required">*</span>
              </label>
              <input
                type="text"
                id="display_name"
                className="admin-input"
                value={formData.display_name}
                onChange={(e) =>
                  setFormData({ ...formData, display_name: e.target.value })
                }
                required
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="phone" className="admin-label">
                Telefon <span className="admin-required">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                className="admin-input"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+90 5XX XXX XX XX"
                required
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="age" className="admin-label">
                Yaş
              </label>
              <input
                type="number"
                id="age"
                className="admin-input"
                value={formData.age}
                onChange={(e) =>
                  setFormData({ ...formData, age: e.target.value })
                }
                min="0"
                max="150"
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="gender" className="admin-label">
                Cinsiyet <span className="admin-required">*</span>
              </label>
              <select
                id="gender"
                className="admin-input"
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value })
                }
                required
              >
                <option value="male">Erkek</option>
                <option value="female">Kadın</option>
              </select>
            </div>

            <div className="admin-form-group">
              <label htmlFor="is_active" className="admin-label">
                Durum
              </label>
              <select
                id="is_active"
                className="admin-input"
                value={formData.is_active.toString()}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.value === "true" })
                }
              >
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </div>

            {!isCreateMode && user && (
              <div className="admin-form-group">
                <label className="admin-label">Kayıt Tarihi</label>
                <div className="admin-text-muted">
                  {new Date(user.created_at).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            )}

            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => navigate("/admin/users")}
                disabled={saving}
              >
                İptal
              </button>
              <button
                type="submit"
                className="admin-btn admin-btn--primary"
                disabled={saving}
              >
                {saving ? "Kaydediliyor..." : isCreateMode ? "Oluştur" : "Kaydet"}
              </button>
            </div>
          </form>
        </div>

        {!isCreateMode && userId && (
          <AdminEmailChange userId={userId} />
        )}

        {!isCreateMode && userId && (
          <AdminPasswordChange userId={userId} />
        )}
      </div>
    </div>
  );
};

const AdminEmailChange: React.FC<{ userId: string }> = ({ userId }) => {
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!newEmail.trim()) {
      setError("E-posta adresi boş olamaz");
      return;
    }

    setSaving(true);
    try {
      await adminChangeUserEmail(userId, newEmail);
      setSuccess(true);
      setNewEmail("");
    } catch (err: any) {
      setError(err.message || "E-posta değiştirilemedi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-card admin-form-card" style={{ padding: "16px", marginTop: "16px" }}>
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "12px" }}>E-posta Değiştir</h2>

      {success && (
        <div className="admin-alert admin-alert--success">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          E-posta başarıyla değiştirildi!
        </div>
      )}

      {error && (
        <div className="admin-alert admin-alert--error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="admin-form-group">
          <label htmlFor="admin_new_email" className="admin-label">Yeni E-posta</label>
          <input
            type="email"
            id="admin_new_email"
            className="admin-input"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="ornek@email.com"
            required
            autoComplete="email"
          />
        </div>
        <div className="admin-form-actions">
          <button
            type="submit"
            className="admin-btn admin-btn--primary"
            disabled={saving}
          >
            {saving ? "Değiştiriliyor..." : "E-postayı Değiştir"}
          </button>
        </div>
      </form>
    </div>
  );
};

const AdminPasswordChange: React.FC<{ userId: string }> = ({ userId }) => {
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPw.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır");
      return;
    }
    if (newPw !== confirmPw) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    setSaving(true);
    try {
      await adminChangeUserPassword(userId, newPw);
      setSuccess(true);
      setNewPw("");
      setConfirmPw("");
    } catch (err: any) {
      setError(err.message || "Şifre değiştirilemedi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-card admin-form-card" style={{ padding: "16px", marginTop: "16px" }}>
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "12px" }}>Şifre Değiştir</h2>

      {success && (
        <div className="admin-alert admin-alert--success">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Şifre başarıyla değiştirildi!
        </div>
      )}

      {error && (
        <div className="admin-alert admin-alert--error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="admin-form-group">
          <label htmlFor="admin_new_pw" className="admin-label">Yeni Şifre</label>
          <input
            type="password"
            id="admin_new_pw"
            className="admin-input"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="En az 6 karakter"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <div className="admin-form-group">
          <label htmlFor="admin_confirm_pw" className="admin-label">Yeni Şifre (Tekrar)</label>
          <input
            type="password"
            id="admin_confirm_pw"
            className="admin-input"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="Yeni şifreyi tekrar girin"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <div className="admin-form-actions">
          <button
            type="submit"
            className="admin-btn admin-btn--primary"
            disabled={saving}
          >
            {saving ? "Değiştiriliyor..." : "Şifreyi Değiştir"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminUserDetail;
