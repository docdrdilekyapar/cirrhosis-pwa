import React, { useState } from "react";
import { useNavigate } from "react-router";
import { adminCreateUser, isOnline } from "../../lib/supabase";
import "./admin-theme.css";

export const AdminUserCreate: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    passwordConfirm: "",
    display_name: "",
    phone: "",
    age: "",
    gender: "male",
    is_active: true,
    consent_accepted: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target;
    const name = target.name;

    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: target.checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: target.value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!formData.email.trim()) {
      setError("Email alanı zorunludur.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }

    if (!formData.display_name.trim()) {
      setError("Ad soyad alanı zorunludur.");
      return;
    }

    if (!isOnline()) {
      setError("İnternet bağlantısı gerekli.");
      return;
    }

    setSaving(true);

    try {
      await adminCreateUser({
        email: formData.email,
        password: formData.password,
        displayName: formData.display_name,
        phone: formData.phone || undefined,
        age: formData.age ? parseInt(formData.age) : null,
        gender: (formData.gender as "male" | "female" | "other") || null,
        isActive: formData.is_active,
        consentAccepted: formData.consent_accepted,
      });

      navigate("/admin/users");
    } catch (err: any) {
      console.error("Error creating user:", err);
      setError(err.message || "Kullanıcı oluşturulurken hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

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
            <h1 className="admin-title">Yeni Kullanıcı Oluştur</h1>
            <p className="admin-subtitle">
              Auth ve profil bilgilerini girerek yeni bir kullanıcı hesabı oluşturun
            </p>
          </div>
        </div>

        <div className="admin-card admin-form-card" style={{ padding: "16px" }}>
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
            {/* Auth Bilgileri */}
            <div className="admin-form-section">
              <h3 className="admin-form-section__title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Giriş Bilgileri
              </h3>

              <div className="admin-form-group">
                <label htmlFor="email" className="admin-label">
                  Email <span className="admin-required">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="admin-input"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="ornek@email.com"
                  required
                  autoComplete="off"
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group admin-form-group--flex">
                  <label htmlFor="password" className="admin-label">
                    Şifre <span className="admin-required">*</span>
                  </label>
                  <div className="admin-input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      className="admin-input"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="En az 6 karakter"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="admin-input-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? "Gizle" : "Göster"}
                    </button>
                  </div>
                </div>

                <div className="admin-form-group admin-form-group--flex">
                  <label htmlFor="passwordConfirm" className="admin-label">
                    Şifre Tekrar <span className="admin-required">*</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="passwordConfirm"
                    name="passwordConfirm"
                    className="admin-input"
                    value={formData.passwordConfirm}
                    onChange={handleChange}
                    placeholder="Şifreyi tekrar girin"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            {/* Profil Bilgileri */}
            <div className="admin-form-section">
              <h3 className="admin-form-section__title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profil Bilgileri
              </h3>

              <div className="admin-form-group">
                <label htmlFor="display_name" className="admin-label">
                  Ad Soyad <span className="admin-required">*</span>
                </label>
                <input
                  type="text"
                  id="display_name"
                  name="display_name"
                  className="admin-input"
                  value={formData.display_name}
                  onChange={handleChange}
                  placeholder="Ad Soyad"
                  required
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group admin-form-group--flex">
                  <label htmlFor="phone" className="admin-label">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className="admin-input"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="05XX XXX XX XX"
                  />
                </div>

                <div className="admin-form-group admin-form-group--flex">
                  <label htmlFor="age" className="admin-label">
                    Yaş
                  </label>
                  <input
                    type="number"
                    id="age"
                    name="age"
                    className="admin-input"
                    value={formData.age}
                    onChange={handleChange}
                    min="0"
                    max="150"
                    placeholder="Yaş"
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label htmlFor="gender" className="admin-label">
                  Cinsiyet
                </label>
                <select
                  id="gender"
                  name="gender"
                  className="admin-input"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="male">Erkek</option>
                  <option value="female">Kadın</option>
                  <option value="other">Diğer</option>
                </select>
              </div>
            </div>

            {/* Durum Ayarları */}
            <div className="admin-form-section">
              <h3 className="admin-form-section__title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Durum Ayarları
              </h3>

              <div className="admin-form-row">
                <div className="admin-form-group admin-form-group--flex">
                  <label htmlFor="is_active" className="admin-label">
                    Hesap Durumu
                  </label>
                  <select
                    id="is_active"
                    name="is_active"
                    className="admin-input"
                    value={formData.is_active.toString()}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_active: e.target.value === "true",
                      }))
                    }
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Pasif</option>
                  </select>
                </div>

                <div className="admin-form-group admin-form-group--flex">
                  <label className="admin-label">Onam Durumu</label>
                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      name="consent_accepted"
                      checked={formData.consent_accepted}
                      onChange={handleChange}
                    />
                    <span className="admin-checkbox__mark"></span>
                    <span className="admin-checkbox__text">
                      Bilgilendirilmiş onam kabul edildi
                    </span>
                  </label>
                </div>
              </div>
            </div>

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
                {saving ? (
                  <>
                    <span className="admin-btn-spinner"></span>
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Kullanıcı Oluştur
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminUserCreate;
