import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { Card, Button, Loading } from "../components";
import { getTestHistory, type TestSession } from "../lib/supabase";
import { isOnline } from "../lib/supabase";
import "./Results.css";

const TESTS_PER_SESSION = 4;

export const Results: React.FC = () => {
  const [tests, setTests] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        if (!isOnline()) {
          setError("Sonuçları görüntülemek için internet bağlantısı gerekli");
          return;
        }
        const data = await getTestHistory();
        setTests(data);
      } catch (err) {
        console.error("Error fetching tests:", err);
        setError("Sonuçlar yüklenirken hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

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
    switch (status) {
      case "completed":
        return (
          <span className="status-badge status-badge--success">Tamamlandı</span>
        );
      case "in_progress":
        return (
          <span className="status-badge status-badge--warning">
            Devam Ediyor
          </span>
        );
      case "not_completed":
        return (
          <span className="status-badge status-badge--muted">Tamamlanmadı</span>
        );
      case "cancelled":
        return (
          <span className="status-badge status-badge--error">İptal Edildi</span>
        );
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "var(--color-success)";
    if (score >= 50) return "var(--color-warning)";
    return "var(--color-error)";
  };

  if (loading) {
    return (
      <div className="results container container--app">
        <Loading message="Sonuçlar yükleniyor" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="results container container--app">
        <Card variant="outlined" padding="lg">
          <div className="results__error">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="results container container--app">
      <header className="results__header">
        <h1 className="results__title">Test Oturumları</h1>
        <p className="results__subtitle">
          Geçmiş test oturumlarınızı görüntüleyin
        </p>
      </header>

      {tests.length === 0 ? (
        <Card variant="outlined" padding="lg" className="results__empty">
          <div className="results__empty-content">
            <span className="results__empty-icon">📋</span>
            <h2>Henüz test yok</h2>
            <p>Test tamamladığınızda sonuçlarınız burada görünecek.</p>
            <Link to="/test">
              <Button variant="primary">Teste Başla</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="results__list">
          {tests.map((test) => (
            <Link
              key={test.id}
              to={`/results/${test.id}`}
              className="test-card-link"
            >
              <Card variant="default" padding="md" className="test-card">
                <div className="test-card__header">
                  <div className="test-card__icon">🧪</div>
                  <div className="test-card__info">
                    <h3 className="test-card__title">Test Oturumu</h3>
                    <p className="test-card__date">
                      {formatDate(test.started_at)}
                    </p>
                  </div>
                  {getStatusBadge(test.status)}
                </div>
                <div className="test-card__footer">
                  <div className="test-card__score">
                    <span className="test-card__score-label">Toplam Puan</span>
                    <span
                      className="test-card__score-value"
                      style={{
                        color: getScoreColor(test.total_score / TESTS_PER_SESSION),
                      }}
                    >
                      {test.total_score}
                    </span>
                  </div>
                  <div className="test-card__arrow">→</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Results;
