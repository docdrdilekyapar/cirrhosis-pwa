import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Card, Button, useToast, Loading } from "../components";
import { useAuth } from "../context";
import {
  getLastTestTimestamp,
  saveTestSession,
  getTestSession,
  clearTestSession,
  incrementTodayTestSessionCount,
} from "../lib/db";
import { createTestSession, completeTestSession } from "../lib/supabase";
import DotCatchTest from "./tests/DotCatchTest";
import ColorMatchTest from "./tests/ColorMatchTest";
import WordMemoryTest from "./tests/WordMemoryTest";
import HEQuestionnaireTest from "./tests/HEQuestionnaireTest";
import "./TestSession.css";

const COOLDOWN_MINUTES = 0;

type TestStep =
  | "waiting"
  | "dot-catch"
  | "color-match"
  | "word-memory"
  | "he-questionnaire"
  | "completed";

export const TestSession: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { canStartTest, testBlockReason, checkTestAccess, sync, isOnline, dailyTestLimitReached, refreshSyncStatus } =
    useAuth();

  const [currentStep, setCurrentStep] = useState<TestStep>("waiting");
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const checkCooldown = async () => {
      try {
        // Önce test erişim kontrolü yap
        await checkTestAccess();

        const session = await getTestSession();
        if (session && session.currentStep !== "completed") {
          setCurrentStep(session.currentStep as TestStep);
          setIsLoading(false);
          return;
        }

        const lastTest = await getLastTestTimestamp();
        if (lastTest) {
          const elapsed = Date.now() - new Date(lastTest).getTime();
          const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;

          if (elapsed < cooldownMs) {
            const remaining = Math.ceil((cooldownMs - elapsed) / 1000);
            setCooldownRemaining(remaining);
          }
        }
      } catch (error) {
        console.error("Error checking cooldown:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkCooldown();
  }, [checkTestAccess]);

  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setInterval(() => {
        setCooldownRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [cooldownRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  /**
   * @
   */
  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await sync();
      await checkTestAccess();
      showToast("success", "Senkronizasyon tamamlandı!");
    } catch (error) {
      showToast("error", "Senkronizasyon başarısız");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStartSession = async () => {
    try {
      // Create test session in Supabase
      await createTestSession();
      await saveTestSession({
        currentStep: "dot-catch",
        startedAt: new Date(),
      });
      setCurrentStep("dot-catch");
      showToast("info", "Test oturumu başladı. 4 test sırasıyla yapılacak.");
    } catch (error) {
      console.error("Failed to create test session:", error);
      showToast("error", "Test oturumu başlatılamadı");
    }
  };

  const handleTestComplete = async (testType: string) => {
    let nextStep: TestStep;

    switch (testType) {
      case "dot-catch":
        nextStep = "color-match";
        showToast(
          "success",
          "Nokta Yakalama testi tamamlandı! Sıradaki: Renk Eşleştirme"
        );
        break;
      case "color-match":
        nextStep = "word-memory";
        showToast(
          "success",
          "Renk Eşleştirme testi tamamlandı! Sıradaki: Kelime Hafıza"
        );
        break;
      case "word-memory":
        nextStep = "he-questionnaire";
        showToast(
          "success",
          "Kelime Hafıza testi tamamlandı! Sıradaki: Doğru/Yanlış Soruları"
        );
        break;
      case "he-questionnaire":
        nextStep = "completed";
        break;
      default:
        nextStep = "completed";
    }

    await saveTestSession({ currentStep: nextStep, startedAt: new Date() });
    setCurrentStep(nextStep);
  };

  if (isLoading) {
    return (
      <div className="test-session container container--app">
        <Loading
          message="Test oturumu hazırlanıyor"
          subtitle="Lütfen bekleyin"
        />
      </div>
    );
  }

  // Günlük test limiti (2/gün)
  if (dailyTestLimitReached && currentStep === "waiting") {
    return (
      <div className="test-session container container--app">
        <div className="test-session__blocked animate-fade-in">
          <div className="blocked-icon">⛔</div>
          <h1 className="blocked-title">Günlük Test Limiti</h1>
          <p className="blocked-description">
            Bugün için maksimum 2 test oturumu tamamladınız. Yarın tekrar test yapabilirsiniz.
          </p>
          <Card variant="outlined" padding="md" className="blocked-info">
            <p>
              ℹ️ Günde en fazla <strong>2 test oturumu</strong> yapılabilir.
              Bu sınır sonuçların güvenilirliği için gereklidir.
            </p>
          </Card>
       {/*    <Button variant="secondary" onClick={() => navigate("/results")}>
            Sonuçları Görüntüle
          </Button> */}
          <Button variant="secondary" onClick={() => navigate("/")}>
            Ana Sayfaya Dön
          </Button>
        </div>
      </div>
    );
  }
/*
  // Sync yapılmamışsa engelle
  if (!canStartTest && testBlockReason) {
    return (
      <div className="test-session container container--app">
        <div className="test-session__blocked animate-fade-in">
          <div className="blocked-icon">🔒</div>
          <h1 className="blocked-title">Senkronizasyon Gerekli</h1>
          <p className="blocked-description">{testBlockReason}</p>
          <Card variant="outlined" padding="md" className="blocked-info">
            <p>
              ⚠️ Test sonuçlarınızın doğru kaydedilmesi için günlük
              senkronizasyon gereklidir. Lütfen internet bağlantınızı kontrol
              edin ve senkronize edin.
            </p>
          </Card>
          {isOnline ? (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSyncNow}
              loading={isSyncing}
            >
              Şimdi Senkronize Et
            </Button>
          ) : (
            <Card variant="outlined" padding="md" className="blocked-offline">
              <p>📡 Çevrimdışısınız. Senkronizasyon için internet gerekli.</p>
            </Card>
          )}
          <Button
            variant="secondary"
            onClick={() => navigate("/")}
            disabled={isSyncing}
          >
            Ana Sayfaya Dön
          </Button>
        </div>
      </div>
    );
  }
*/
  if (cooldownRemaining > 0 && currentStep === "waiting") {
    return (
      <div className="test-session container container--app">
        <div className="test-session__cooldown animate-fade-in">
          <div className="cooldown-icon">⏳</div>
          <h1 className="cooldown-title">Bekleme Süresi</h1>
          <p className="cooldown-description">
            Yeni bir test oturumu başlatmak için lütfen bekleyin.
          </p>
          <div className="cooldown-timer">
            <span className="cooldown-time">
              {formatTime(cooldownRemaining)}
            </span>
            <span className="cooldown-label">kaldı</span>
          </div>
          <Card variant="outlined" padding="md" className="cooldown-info">
            <p>
              Her test oturumu arasında{" "}
              <strong>{COOLDOWN_MINUTES} dakika</strong> beklemeniz
              gerekmektedir. Bu süre, sonuçların doğruluğunu sağlamak için
              gereklidir.
            </p>
          </Card>
          <Button variant="secondary" onClick={() => navigate("/results")}>
            Sonuçları Görüntüle
          </Button>
        </div>
      </div>
    );
  }

  if (currentStep === "waiting") {
    return (
      <div className="test-session container container--app">
        <div className="test-session__start animate-fade-in">
          <div className="start-icon">🧠</div>
          <h1 className="start-title">HETracker Oturumu</h1>
          <p className="start-description">
            Bu oturumda 4 test sırasıyla yapılacaktır:
          </p>
          <div className="test-list">
            <div className="test-list__item">
              <span className="test-list__number">1</span>
              <span className="test-list__icon">🎯</span>
              <span className="test-list__name">Nokta Yakalama Testi</span>
            </div>
            <div className="test-list__item">
              <span className="test-list__number">2</span>
              <span className="test-list__icon">🎨</span>
              <span className="test-list__name">Renk Eşleştirme Testi</span>
            </div>
            <div className="test-list__item">
              <span className="test-list__number">3</span>
              <span className="test-list__icon">🧠</span>
              <span className="test-list__name">Kelime Hafıza Testi</span>
            </div>
            <div className="test-list__item">
              <span className="test-list__number">4</span>
              <span className="test-list__icon">✅</span>
              <span className="test-list__name">Doğru / Yanlış Soruları</span>
            </div>
          </div>
          <Card variant="outlined" padding="md" className="start-info">
            <p>
              ⚠️ Oturum başladıktan sonra tüm testleri tamamlamanız gerekir.
              Testler arasında çıkış yapamazsınız.
            </p>
          </Card>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleStartSession}
          >
            Oturumu Başlat
          </Button>
        </div>
      </div>
    );
  }

  const handleSaveTest = async () => {
    try {
      await clearTestSession();
      incrementTodayTestSessionCount();
      await completeTestSession();
      await sync();
      await refreshSyncStatus();
      showToast("success", "Test sonuçları kaydedildi!");
      navigate("/");
    } catch (error) {
      console.error("Failed to save test:", error);
      showToast("error", "Kaydetme sırasında hata oluştu");
    }
  };

  const handleSkipSave = async () => {
    await clearTestSession();
    navigate("/");
  };

  if (currentStep === "completed") {
    return (
      <div className="test-session container container--app">
        <div className="test-session__completed animate-fade-in">
          <div className="completed-icon">🎉</div>
          <h1 className="completed-title">Tebrikler!</h1>
          <p className="completed-description">
            Tüm testleri başarıyla tamamladınız.
          </p>
          <div className="completed-actions">
            <Button
              variant="primary"
              fullWidth
              onClick={handleSaveTest}
            >
              Testi Kaydet ve Sonuçları Gönder
            </Button>
            <Button variant="secondary" fullWidth onClick={handleSkipSave}>
              Testi Kaydetme ve Testi Tekrarla
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="test-session">
      <div className="test-session__progress">
        <div
          className={`progress-step ${currentStep === "dot-catch" ? "active" : ""
            } ${["color-match", "word-memory", "he-questionnaire"].includes(
              currentStep
            )
              ? "completed"
              : ""
            }`}
        >
          <span className="progress-step__icon">🎯</span>
        </div>
        <div
          className={`progress-step__line ${[
              "color-match",
              "word-memory",
              "he-questionnaire",
            ].includes(currentStep)
              ? "completed"
              : ""
            }`}
        />
        <div
          className={`progress-step ${currentStep === "color-match" ? "active" : ""
            } ${["word-memory", "he-questionnaire"].includes(currentStep)
              ? "completed"
              : ""
            }`}
        >
          <span className="progress-step__icon">🎨</span>
        </div>
        <div
          className={`progress-step__line ${[
              "word-memory",
              "he-questionnaire",
            ].includes(currentStep)
              ? "completed"
              : ""
            }`}
        />
        <div
          className={`progress-step ${currentStep === "word-memory" ? "active" : ""
            } ${currentStep === "he-questionnaire" ? "completed" : ""}`}
        >
          <span className="progress-step__icon">🧠</span>
        </div>
        <div
          className={`progress-step__line ${currentStep === "he-questionnaire" ? "completed" : ""
            }`}
        >
        </div>
        <div
          className={`progress-step ${currentStep === "he-questionnaire" ? "active" : ""
            }`}
        >
          <span className="progress-step__icon">✅</span>
        </div>
      </div>

      {currentStep === "dot-catch" && (
        <DotCatchTest
          onComplete={() => handleTestComplete("dot-catch")}
          isSequential
        />
      )}
      {currentStep === "color-match" && (
        <ColorMatchTest
          onComplete={() => handleTestComplete("color-match")}
          isSequential
        />
      )}
      {currentStep === "word-memory" && (
        <WordMemoryTest
          onComplete={() => handleTestComplete("word-memory")}
          isSequential
        />
      )}
      {currentStep === "he-questionnaire" && (
        <HEQuestionnaireTest
          onComplete={() => handleTestComplete("he-questionnaire")}
          isSequential
        />
      )}
    </div>
  );
};

export default TestSession;
