import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Card, Button, useToast, Loading } from "../components";
import { useAuth } from "../context";
import {
  getProfile,
  updateProfile,
  getCurrentUserEmail,
  changePassword,
} from "../lib/supabase";
import "./Profile.css";

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isOnline, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState("");
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const getProfilePayload = () => {
    const normalizedAge = age.trim();
    const parsedAge = normalizedAge ? Number.parseInt(normalizedAge, 10) : null;

    return {
      display_name: displayName.trim() || null,
      phone: phone.trim() || null,
      age: Number.isNaN(parsedAge) ? null : parsedAge,
      gender: gender || null,
    } as const;
  };

  const getSnapshot = () => JSON.stringify(getProfilePayload());

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userEmail = await getCurrentUserEmail();
        if (userEmail) setEmail(userEmail);

        const profile = await getProfile();
        if (profile) {
          setDisplayName(profile.display_name || "");
          setPhone(profile.phone || "");
          setAge(profile.age?.toString() || "");
          setGender(profile.gender || "");
          setLastSavedSnapshot(
            JSON.stringify({
              display_name: profile.display_name || null,
              phone: profile.phone || null,
              age: profile.age ?? null,
              gender: profile.gender || null,
            })
          );
        } else {
          setLastSavedSnapshot(
            JSON.stringify({
              display_name: null,
              phone: null,
              age: null,
              gender: null,
            })
          );
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const saveProfile = async (showSuccessToast: boolean) => {
    if (!isOnline) {
      if (showSuccessToast) {
        showToast("error", "Profil güncellemek için internet bağlantısı gerekli");
      }
      return;
    }

    try {
      const payload = getProfilePayload();
      await updateProfile(payload);
      setLastSavedSnapshot(JSON.stringify(payload));

      if (showSuccessToast) {
        showToast("success", "Profil güncellendi");
      }
    } catch (error) {
      if (showSuccessToast) {
        showToast(
          "error",
          error instanceof Error ? error.message : "Profil güncellenemedi"
        );
      }
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveProfile(true);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (loading || saving || !isOnline) return;

    const currentSnapshot = getSnapshot();
    if (!lastSavedSnapshot || currentSnapshot === lastSavedSnapshot) return;

    const timer = window.setTimeout(async () => {
      setIsAutoSaving(true);
      try {
        await saveProfile(false);
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        setIsAutoSaving(false);
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [displayName, phone, age, gender, loading, saving, isOnline, lastSavedSnapshot]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      showToast("error", "Çıkış yapılamadı");
    }
  };

  if (loading) {
    return (
      <div className="profile container container--app">
        <Loading
          message="Profil yükleniyor"
        />
      </div>
    );
  }

  return (
    <div className="profile container container--app">
      <header className="profile__header">
        <h1 className="profile__title">Profil</h1>
        <p className="profile__subtitle">Kişisel bilgilerinizi güncelleyin</p>
      </header>

      <form onSubmit={handleSubmit}>
        <Card variant="elevated" padding="lg" className="profile__card">
          <div className="form-group">
            <label htmlFor="email">E-posta</label>
            <input
              type="email"
              id="email"
              value={email}
              disabled
              className="input-disabled"
            />
            <span className="form-hint">E-posta değiştirilemez</span>
          </div>

          <div className="form-group">
            <label htmlFor="displayName">Ad Soyad</label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Adınız Soyadınız"
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Telefon</label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XX XXX XX XX"
              disabled={saving}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="age">Yaş</label>
              <input
                type="number"
                id="age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Yaş"
                min="1"
                max="120"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="gender">Cinsiyet</label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as typeof gender)}
                disabled={saving}
              >
                <option value="">Seçiniz</option>
                <option value="male">Erkek</option>
                <option value="female">Kadın</option>
                <option value="other">Diğer</option>
              </select>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={saving || isAutoSaving}
            disabled={!isOnline}
          >
            {isAutoSaving ? "Kaydediliyor..." : "Kaydet"}
          </Button>

          {!isOnline && (
            <p className="profile__offline-warning">
              📡 Profil güncellemek için internet bağlantısı gerekli
            </p>
          )}
        </Card>
      </form>

      <Card variant="elevated" padding="lg" className="profile__card">
        <h3 style={{ marginBottom: "var(--spacing-md)" }}>Şifre Değiştir</h3>
        <PasswordChangeForm isOnline={isOnline} showToast={showToast} />
      </Card>

      <Card variant="outlined" padding="md" className="profile__danger-zone">
        <h3>Hesap</h3>
        <p>Hesabınızdan çıkış yapın</p>
        <Button variant="danger" onClick={handleLogout}>
          Çıkış Yap
        </Button>
      </Card>
    </div>
  );
};

const PasswordChangeForm: React.FC<{
  isOnline: boolean;
  showToast: (type: "success" | "error" | "info" | "warning", message: string) => void;
}> = ({ isOnline: online, showToast }) => {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPw.length < 6) {
      showToast("error", "Yeni şifre en az 6 karakter olmalıdır");
      return;
    }
    if (newPw !== confirmPw) {
      showToast("error", "Yeni şifreler eşleşmiyor");
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPw, newPw);
      showToast("success", "Şifre başarıyla değiştirildi");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Şifre değiştirilemedi"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleChangePassword}>
      <div className="form-group">
        <label htmlFor="currentPassword">Mevcut Şifre</label>
        <input
          type="password"
          id="currentPassword"
          value={currentPw}
          onChange={(e) => setCurrentPw(e.target.value)}
          placeholder="Mevcut şifreniz"
          required
          disabled={saving}
          autoComplete="current-password"
        />
      </div>
      <div className="form-group">
        <label htmlFor="newPassword">Yeni Şifre</label>
        <input
          type="password"
          id="newPassword"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          placeholder="En az 6 karakter"
          required
          minLength={6}
          disabled={saving}
          autoComplete="new-password"
        />
      </div>
      <div className="form-group">
        <label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</label>
        <input
          type="password"
          id="confirmPassword"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          placeholder="Yeni şifrenizi tekrar girin"
          required
          minLength={6}
          disabled={saving}
          autoComplete="new-password"
        />
      </div>
      <Button
        type="submit"
        variant="primary"
        fullWidth
        loading={saving}
        disabled={!online}
      >
        Şifreyi Değiştir
      </Button>
      {!online && (
        <p className="profile__offline-warning">
          📡 Şifre değiştirmek için internet bağlantısı gerekli
        </p>
      )}
    </form>
  );
};

export default Profile;
