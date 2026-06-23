import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Button, Card } from "../components";
import "./RegisterScreen.css";

type AuthMode = "login" | "register";

export const RegisterScreen: React.FC = () => {
  const { register, login, isLoading, error, isOnline, clearError } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (mode === "register" && !displayName.trim()) {
      setLocalError("Ad Soyad gerekli");
      return;
    }

    if (!email.trim()) {
      setLocalError("E-posta adresi gerekli");
      return;
    }

    if (!password.trim()) {
      setLocalError("Şifre gerekli");
      return;
    }

    if (password.length < 6) {
      setLocalError("Şifre en az 6 karakter olmalı");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setLocalError("Şifreler eşleşmiyor");
      return;
    }

    try {
      if (mode === "register") {
        await register(email, password, displayName);
      } else {
        await login(email, password);
      }
    } catch (err) {
      // Error is handled in context
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setLocalError(null);
    clearError();
    setConfirmPassword("");
    setDisplayName("");
  };

  return (
    <div className="register-screen">
      <div className="register-screen__content">
        <div className="register-screen__icon">🧠</div>
        <h1 className="register-screen__title">HETracker Uygulaması</h1>
        <p className="register-screen__subtitle">
          Siroz hastaları için dikkat, reaksiyon ve hafıza testleri
        </p>

        <Card variant="elevated" padding="lg" className="register-screen__card">
          <h2>{mode === "login" ? "Giriş Yap" : "Kayıt Ol"}</h2>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === "register" && (
              <div className="form-group">
                <label htmlFor="displayName">Ad Soyad</label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Adınız Soyadınız"
                  disabled={isLoading}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">E-posta</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Şifre</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
            </div>

            {mode === "register" && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Şifre Tekrar</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>
            )}

            {!isOnline && (
              <div className="auth-warning">
                <span>📡</span>
                <p>İnternet bağlantısı yok</p>
              </div>
            )}

            {(error || localError) && (
              <div className="auth-error">
                <span>⚠️</span>
                <p>{error || localError}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              disabled={!isOnline}
            >
              {mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
            </Button>
          </form>

          <div className="auth-switch">
            {
              false && (
                <button
              type="button"
              onClick={toggleMode}
              className="auth-switch__button"
            >
              {mode === "login"
                ? "Hesabınız yok mu? Kayıt olun"
                : "Hesabınız var mı? Giriş yapın"}
            </button>
              )
            }
            
          </div>
        </Card>

        <div className="register-screen__info">
          <ul>
            <li>✅ Çevrimdışı test yapabilirsiniz</li>
            <li>✅ Sonuçlarınız güvenle saklanır</li>
            <li>✅ Günde 2 kez senkronizasyon yeterli</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;
