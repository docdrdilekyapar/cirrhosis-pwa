import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Card, Button, Loading } from "../components";
import { supabase, isOnline } from "../lib/supabase";
import "./TestDetail.css";

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
  started_at: string;
  completed_at: string | null;
  status: string;
  total_score: number;
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

const TESTS_PER_SESSION = 4;

export const TestDetail: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [test, setTest] = useState<TestData | null>(null);
  const [results, setResults] = useState<TestResultData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTestDetails = async () => {
      if (!testId) {
        setError("Test ID bulunamadı");
        setLoading(false);
        return;
      }

      if (!isOnline()) {
        setError("Detayları görüntülemek için internet bağlantısı gerekli");
        setLoading(false);
        return;
      }

      try {
        // Fetch test session
        const { data: testData, error: testError } = await supabase
          .from("tests")
          .select("*")
          .eq("id", testId)
          .single();

        if (testError) throw testError;
        setTest(testData);

        // Fetch test results
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

    fetchTestDetails();
  }, [testId]);

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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "var(--color-success)";
    if (score >= 50) return "var(--color-warning)";
    return "var(--color-error)";
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Tamamlandı";
      case "in_progress":
        return "Devam Ediyor";
      case "not_completed":
        return "Tamamlanmadı";
      case "cancelled":
        return "İptal Edildi";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="test-detail container container--app">
        <Loading message="Test detayları yükleniyor" />
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="test-detail container container--app">
        <Card variant="outlined" padding="lg">
          <div className="test-detail__error">
            <span>⚠️</span>
            <p>{error || "Test bulunamadı"}</p>
            <Button variant="secondary" onClick={() => navigate("/results")}>
              Geri Dön
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="test-detail container container--app">
      <header className="test-detail__header">
        <button
          className="test-detail__back"
          onClick={() => navigate("/results")}
        >
          ← Geri
        </button>
        <h1 className="test-detail__title">Test Detayları</h1>
      </header>

      <Card variant="elevated" padding="lg" className="test-detail__summary">
        <div className="summary-header">
          <div className="summary-icon">🧪</div>
          <div className="summary-info">
            <h2>Test Oturumu</h2>
            <p className="summary-date">{formatDate(test.started_at)}</p>
          </div>
        </div>

        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat__label">Durum</span>
            <span className="summary-stat__value">
              {getStatusText(test.status)}
            </span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat__label">Toplam Puan</span>
            <span
              className="summary-stat__value summary-stat__value--score"
              style={{ color: getScoreColor(test.total_score / TESTS_PER_SESSION) }}
            >
              {test.total_score}
            </span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat__label">Test Sayısı</span>
            <span className="summary-stat__value">
              {results.length}/{TESTS_PER_SESSION}
            </span>
          </div>
        </div>
      </Card>

      <h2 className="test-detail__section-title">Test Sonuçları</h2>

      {results.length === 0 ? (
        <Card variant="outlined" padding="md">
          <p className="test-detail__no-results">
            Bu oturumda henüz test sonucu yok.
          </p>
        </Card>
      ) : (
        <div className="test-detail__results">
          {results.map((result, index) => (
            <Card
              key={result.id}
              variant="default"
              padding="md"
              className="result-item"
            >
              <div className="result-item__header">
                <span className="result-item__number">{index + 1}</span>
                <span className="result-item__icon">
                  {testIcons[result.test_type]}
                </span>
                <div className="result-item__info">
                  <h3>{testNames[result.test_type]}</h3>
                  <p className="result-item__time">
                    {new Date(result.timestamp).toLocaleTimeString("tr-TR")}
                  </p>
                </div> 
              </div>

              {result.test_type === "he-questionnaire" ? (
                // HE Questionnaire - Cevapları listele
                <div className="result-item__answers">
                  {result.details.answers && result.details.answers.length > 0 ? (
                    <div className="answers-list">
                      {result.details.answers.map((answer, idx) => (
                        <div key={idx} className="answer-item">
                          <div className="answer-item__question">
                            <span className="answer-item__number">{idx + 1}.</span>
                            {answer.question}
                          </div>
                          <div className={`answer-item__answer answer-item__answer--${
                            answer.answer.toLowerCase() === "doğru" ? "correct" : "wrong"
                          }`}>
                            {answer.answer}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-answers">Cevap bulunamadı</p>
                  )}
                </div>
              ) : (
                // Diğer testler - istatistikleri göster
                <div className="result-item__stats">
                  <div className="result-item__stat">
                    <span className="result-item__stat-label">Doğru</span>
                    <span className="result-item__stat-value text-success">
                      {result.correct_count}
                    </span>
                  </div>
                  <div className="result-item__stat">
                    <span className="result-item__stat-label">Yanlış</span>
                    <span className="result-item__stat-value text-error">
                      {result.wrong_count}
                    </span>
                  </div>
                  <div className="result-item__stat">
                    <span className="result-item__stat-label">Toplam</span>
                    <span className="result-item__stat-value">
                      {result.total_rounds}
                    </span>
                  </div>
                  {result.average_reaction_time && (
                    <div className="result-item__stat">
                      <span className="result-item__stat-label">Ort. Süre</span>
                      <span className="result-item__stat-value">
                        {result.average_reaction_time}ms
                      </span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestDetail;
