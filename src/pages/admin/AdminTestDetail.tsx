import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { supabase, isOnline } from "../../lib/supabase";
import "./admin-theme.css";

interface TestResultData {
  id: string;
  test_type: string;
  timestamp: string;
  correct_count: number;
  wrong_count: number;
  total_rounds: number;
  average_reaction_time: number | null;
  score: number;
  details: {
    answers?: Array<{
      question: string;
      answer: string;
    }>;
    [key: string]: unknown;
  };
}

interface TestData {
  id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  total_score: number;
  display_name: string | null;
  phone: string | null;
}

const testNames: Record<string, string> = {
  "dot-catch": "Nokta Yakalama",
  "color-match": "Renk Eşleştirme",
  "word-memory": "Kelime Hafıza",
  "he-questionnaire": "Doğru / Yanlış Soruları",
};

const testIcons: Record<string, string> = {
  "dot-catch": "🎯",
  "color-match": "🎨",
  "word-memory": "🧠",
  "he-questionnaire": "✅",
};

export const AdminTestDetail: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [test, setTest] = useState<TestData | null>(null);
  const [results, setResults] = useState<TestResultData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTestDetails();
  }, [testId]);

  const fetchTestDetails = async () => {
    if (!testId) {
      setError("Test ID bulunamadı");
      setLoading(false);
      return;
    }

    if (!isOnline()) {
      setError("İnternet bağlantısı gerekli");
      setLoading(false);
      return;
    }

    try {
      // Fetch test with profile info via RPC
      const { data: testRows, error: testError } = await supabase
        .rpc("get_test_detail", { target_test_id: testId });

      if (testError) throw testError;
      if (!testRows || testRows.length === 0) throw new Error("Test bulunamadı");
      setTest(testRows[0]);

      const { data: resultsData, error: resultsError } = await supabase
        .from("test_results")
        .select("*")
        .eq("test_id", testId)
        .order("timestamp", { ascending: true });

      if (resultsError) throw resultsError;
      setResults(resultsData || []);
    } catch (err) {
      console.error("Error fetching test details:", err);
      setError("Test detayları yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
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

  if (error || !test) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div className="admin-error">
            <span>⚠️</span>
            <p>{error || "Test bulunamadı"}</p>
            <button
              className="admin-btn admin-btn--secondary"
              onClick={() => navigate("/admin/tests")}
            >
              ← Geri Dön
            </button>
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
              onClick={() => navigate("/admin/tests")}
            >
              ← Geri
            </button>
            <h1 className="admin-title">Test Detayı</h1>
            <p className="admin-subtitle">
              <code>{test.id}</code>
            </p>
          </div>
        </div>

        {/* Test Info Card */}
        <div className="admin-card" style={{ padding: '24px' }}>
          <div className="admin-detail-grid">
            <div className="admin-detail-item">
              <label>Kullanıcı</label>
              <div>
                <strong>{test.display_name || "Bilinmiyor"}</strong>
                <div className="admin-text-muted">{test.phone || "-"}</div>
              </div>
            </div>
            <div className="admin-detail-item">
              <label>Başlangıç</label>
              <div>{formatDate(test.started_at)}</div>
            </div>
            <div className="admin-detail-item">
              <label>Bitiş</label>
              <div>
                {test.completed_at ? formatDate(test.completed_at) : "-"}
              </div>
            </div>
            <div className="admin-detail-item">
              <label>Durum</label>
              <div>{getStatusBadge(test.status)}</div>
            </div>
            <div className="admin-detail-item">
              <label>Toplam Puan</label>
              <div>
                <strong className="admin-score">{test.total_score}</strong>
              </div>
            </div>
            <div className="admin-detail-item">
              <label>Test Sayısı</label>
              <div>
                <strong>{results.length}/4</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="admin-section">
          <h2 className="admin-section__title">Test Sonuçları</h2>

          {results.length === 0 ? (
            <div className="admin-card">
              <div className="admin-empty">
                <p>Bu oturumda henüz test sonucu yok</p>
              </div>
            </div>
          ) : (
            <div className="admin-results-grid">
              {results.map((result, index) => (
                <div key={result.id} className="admin-card admin-result-card">
                  <div className="admin-result-card__header">
                    <span className="admin-result-card__number">{index + 1}</span>
                    <span className="admin-result-card__icon">
                      {testIcons[result.test_type]}
                    </span>
                    <div className="admin-result-card__info">
                      <h3>{testNames[result.test_type]}</h3>
                      <p>{new Date(result.timestamp).toLocaleTimeString("tr-TR")}</p>
                    </div>
                  </div>

                  {result.test_type === "he-questionnaire" ? (
                    <div className="admin-answers">
                      <div className="admin-stats-mini">
                        <div>
                          <label>Doğru</label>
                          <strong className="text-success">{result.correct_count}</strong>
                        </div>
                        <div>
                          <label>Yanlış</label>
                          <strong className="text-error">{result.wrong_count}</strong>
                        </div>
                        <div>
                          <label>Toplam</label>
                          <strong>{result.total_rounds}</strong>
                        </div>
                      </div>
                      {result.details.answers && result.details.answers.length > 0 && (
                        <div className="admin-answers-list">
                          {result.details.answers.map((answer, idx) => (
                            <div key={idx} className="admin-answer-item">
                              <div className="admin-answer-item__question">
                                <span className="admin-answer-item__number">
                                  {idx + 1}.
                                </span>
                                {answer.question}
                              </div>
                              <span
                                className={`admin-answer-badge admin-answer-badge--${
                                  answer.answer.toLowerCase() === "doğru" || answer.answer.toLowerCase() === "evet"
                                    ? "correct"
                                    : "wrong"
                                }`}
                              >
                                {answer.answer}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="admin-stats-mini">
                      <div>
                        <label>Doğru</label>
                        <strong className="text-success">{result.correct_count}</strong>
                      </div>
                      <div>
                        <label>Yanlış</label>
                        <strong className="text-error">{result.wrong_count}</strong>
                      </div>
                      <div>
                        <label>Toplam</label>
                        <strong>{result.total_rounds}</strong>
                      </div>
                      {result.average_reaction_time && (
                        <div>
                          <label>Ort. Süre</label>
                          <strong>{result.average_reaction_time}ms</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTestDetail;
