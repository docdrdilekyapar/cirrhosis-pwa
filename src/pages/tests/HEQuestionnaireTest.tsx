import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Card, Button, ProgressBar, useToast } from "../../components";
import { saveTestResult, generateId } from "../../lib/db";
import type {
  HEQuestionnaireAnswer,
  HEQuestionnaireDetails,
  TestResult,
} from "../../types";
import "./TestCommon.css";
import "./HEQuestionnaireTest.css";

const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

const CLINICAL_QUESTIONS: string[] = [
  "Hastanız her zamankinden farklı davranıyor mu? Örneğin sebepsiz yere kızıyor ya da aşırı mutlu oluyor mu?",
  "Hastanız konuşurken zaman zaman kelime bulmakta zorlanıyor mu ya da ne söyleyeceğini unutup duraksadığı oluyor mu?",
  "Hastanızın uykusunda değişiklik var mı? Örneğin uykuya dalmakta zorlanma, gece uyanık kalma ya da gündüz her zamankinden daha fazla uyuma ihtiyacı oldu mu?",
  "Hastanıza aşağıdaki soruyu sorun ve soruya verdiği cevapların doğru olup olmadığını işaretleyin: \nSoru: Hangi Yıldayız? \nCevap: " + new Date().getFullYear(),
  "Hastanıza aşağıdaki soruyu sorun ve soruya verdiği cevapların doğru olup olmadığını işaretleyin: \nSoru: Hangi Aydayız? \nCevap: " + MONTH_NAMES[new Date().getMonth()],
  "Hastanıza aşağıdaki soruyu sorun ve soruya verdiği cevapların doğru olup olmadığını işaretleyin: \nSoru: Hangi Şehirde yaşıyoruz?",
  "Hastanıza aşağıdaki soruyu sorun ve soruya verdiği cevapların doğru olup olmadığını işaretleyin: \nSoru: Şu an neredeyiz? (Evde, hastanede, dışarıda gibi.)",
  "Hastanıza aşağıdaki soruyu sorun ve soruya verdiği cevapların doğru olup olmadığını işaretleyin: \nSoru: Günün hangi zamanındayız? Sence sabah mı, öğlen mi, akşam mı yoksa gece mi? \nCevap: " + (new Date().getHours() < 12 ? "Sabah" : new Date().getHours() < 18 ? "Öğlen" : "Akşam veya Gece"),
  "Hastanızın konuşması belirgin şekilde değişti mi? Örneğin konuşması yavaşladı, cümle kurmakta zorlandı ya da söyledikleri zor anlaşıldı mı?",
  "Hastanız günlük işlerini yaparken zorlanıyor mu? (Yemek, giyinme, tuvalet gibi.)",
  "Hastanız yürürken dengesini kaybediyor ya da sendeleme yaşıyor mu?",
  "Hastanız konuşurken konuyla ilgisiz, mantıksız ya da anlamsız şeyler söylüyor mu?",
  "Hastanızın ellerinde, yeni başlayan ya da eskisine göre belirgin şekilde artmış bir titreme oldu mu?",
  "Hastanız neredeyse tüm gün uyanık kalıyor mu?",
  "Hastanız sizi veya yakınlarını tanımakta zorlanıyor mu?",
  "Hastanızı uyandırmakta zorlanıyor musunuz?",
];

const SYMPTOM_QUESTIONS = [
  { label: "Kabızlık oldu mu?", question: "Son 48 saat içinde kabızlık oldu mu?" },
  { label: "Ateş / enfeksiyon belirtisi oldu mu?", question: "Son 48 saat içinde ateş / enfeksiyon belirtisi oldu mu?" },
  { label: "Kusma oldu mu?", question: "Son 48 saat içinde kusma oldu mu?" },
  { label: "Siyah dışkı oldu mu?", question: "Son 48 saat içinde siyah dışkı oldu mu?" },
  { label: "Kanama şüphesi oldu mu?", question: "Son 48 saat içinde kanama şüphesi oldu mu?" },
  { label: "Yeterince sıvı alamama durumu oldu mu?", question: "Son 48 saat içinde yeterince sıvı alamama durumu oldu mu?" },
  { label: "İshal oldu mu?", question: "Son 48 saat içinde ishal oldu mu?" },
  { label: "Alkol kullanımı oldu mu?", question: "Son 48 saat içinde alkol kullanımı oldu mu?" },
  { label: "Sakinleştirici ilaç alımı oldu mu?", question: "Son 48 saat içinde sakinleştirici ilaç alımı oldu mu?" },
  {
    label: "Siroz ilaçlarını önerildiği şekilde almama durumu oldu mu?",
    question: "Son 48 saat içinde siroz ilaçlarını önerildiği şekilde almama durumu oldu mu?",
  },
];

const QUESTIONS = [
  ...CLINICAL_QUESTIONS,
  ...SYMPTOM_QUESTIONS.map((item) => item.question),
];

type Phase = "instructions" | "playing" | "symptoms" | "finished";
type AnswerValue = "Doğru" | "Yanlış" | "Evet" | "Hayır";

interface HEQuestionnaireTestProps {
  onComplete?: () => void;
  isSequential?: boolean;
}

export const HEQuestionnaireTest: React.FC<HEQuestionnaireTestProps> = ({
  onComplete,
  isSequential = false,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [phase, setPhase] = useState<Phase>("instructions");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<HEQuestionnaireAnswer[]>([]);
  const [symptomSelections, setSymptomSelections] = useState<boolean[]>(
    () => SYMPTOM_QUESTIONS.map(() => false)
  );
  const [result, setResult] = useState<TestResult | null>(null);

  const handleStart = () => {
    setPhase("playing");
    setCurrentIndex(0);
    setAnswers([]);
    setSymptomSelections(SYMPTOM_QUESTIONS.map(() => false));
  };

  const finishTest = async (allAnswers: HEQuestionnaireAnswer[]) => {
    const correctCount = allAnswers.filter((a) => a.answer === "Doğru" || a.answer === "Evet").length;
    const wrongCount = allAnswers.filter((a) => a.answer === "Yanlış" || a.answer === "Hayır").length;
    const score = Math.round((correctCount / QUESTIONS.length) * 100);

    const details: HEQuestionnaireDetails = {
      answers: allAnswers,
    };

    const testResult: TestResult = {
      id: generateId(),
      testType: "he-questionnaire",
      timestamp: new Date(),
      correctCount,
      wrongCount,
      totalRounds: QUESTIONS.length,
      score,
      details,
    };

    try {
      await saveTestResult(testResult);
      setResult(testResult);
      setPhase("finished");

      if (!isSequential) {
        showToast("success", "Test tamamlandı ve kaydedildi!");
      }
    } catch (error) {
      showToast("error", "Sonuç kaydedilemedi");
      console.error("Error saving result:", error);
    }
  };

  const handleAnswer = async (answer: AnswerValue) => {
    if (phase !== "playing") return;

    const nextAnswers = [
      ...answers,
      {
        question: QUESTIONS[currentIndex],
        answer,
      },
    ];

    if (currentIndex >= CLINICAL_QUESTIONS.length - 1) {
      setAnswers(nextAnswers);
      setPhase("symptoms");
      return;
    }

    setAnswers(nextAnswers);
    setCurrentIndex((prev) => prev + 1);
  };

  const toggleSymptom = (index: number) => {
    setSymptomSelections((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const handleSymptomsComplete = async () => {
    const symptomAnswers: HEQuestionnaireAnswer[] = SYMPTOM_QUESTIONS.map(
      (item, index) => ({
        question: item.question,
        answer: symptomSelections[index] ? "Evet" : "Hayır",
      })
    );

    await finishTest([...answers, ...symptomAnswers]);
  };

  const handleContinue = () => {
    if (onComplete) {
      onComplete();
    }
  };

  const handleRestart = () => {
    setPhase("instructions");
    setCurrentIndex(0);
    setAnswers([]);
    setSymptomSelections(SYMPTOM_QUESTIONS.map(() => false));
    setResult(null);
  };

  return (
    <div className="test-page container container--app">
      {phase === "instructions" && (
        <div className="test-instructions animate-fade-in">
          <div className="test-instructions__icon">✅</div>
          <h1 className="test-instructions__title">Doğru / Yanlış Soruları</h1>
          <p className="test-instructions__description">
            Soruları okuyup hasta için uygun olan yanıtı işaretleyin.
          </p> 
          <Button variant="primary" size="lg" fullWidth onClick={handleStart}>
            Testi Başlat
          </Button>
        </div>
      )}

      {phase === "playing" && (
        <div className="test-playing animate-fade-in">
          <ProgressBar
            current={currentIndex + 1}
            total={CLINICAL_QUESTIONS.length}
          />

          <Card
            variant="elevated"
            padding="lg"
            className="he-questionnaire__question-card"
          >
            <p className="he-questionnaire__counter">
              Soru {currentIndex + 1} / {CLINICAL_QUESTIONS.length}
            </p>
            <p className="he-questionnaire__question">
              {CLINICAL_QUESTIONS[currentIndex]}
            </p>
          </Card>

          <div className="he-questionnaire__answers">
            {currentIndex >= 3 && currentIndex <= 7 ? (
              <>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => handleAnswer("Doğru")}
                >
                  Doğru
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  fullWidth
                  onClick={() => handleAnswer("Yanlış")}
                >
                  Yanlış
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => handleAnswer("Evet")}
                >
                  Evet
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  fullWidth
                  onClick={() => handleAnswer("Hayır")}
                >
                  Hayır
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {phase === "symptoms" && (
        <div className="test-playing animate-fade-in he-symptoms">
          <Card
            variant="elevated"
            padding="lg"
            className="he-symptoms__card"
          >
            <p className="he-symptoms__section">
              Semptom Değerlendirmesi (10 madde)
            </p>
            <h2 className="he-symptoms__title">
              Hastanızda son 48 saat içinde aşağıdakilerden hangisi/hangileri oldu?
            </h2>
            <ul className="he-symptoms__list">
              {SYMPTOM_QUESTIONS.map((item, index) => (
                <li key={item.question}>
                  <label
                    className={`he-symptoms__item ${
                      symptomSelections[index] ? "selected" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={symptomSelections[index]}
                      onChange={() => toggleSymptom(index)}
                      className="he-symptoms__input"
                    />
                    <span className="he-symptoms__checkbox" aria-hidden="true">
                      {symptomSelections[index] && "✓"}
                    </span>
                    <span className="he-symptoms__label">{item.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </Card>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSymptomsComplete}
          >
            Testi Tamamla
          </Button>
        </div>
      )}

      {phase === "finished" && result && (
        <div className="test-result animate-fade-in">
          <div className="test-result__icon">🎉</div>
          <h1 className="test-result__title">Test Tamamlandı!</h1>

          <div className="test-result__actions">
            {isSequential ? (
              <Button variant="primary" fullWidth onClick={handleContinue}>
                Sonraki Adıma Geç
              </Button>
            ) : (
              <>
                <Button variant="primary" fullWidth onClick={handleRestart}>
                  Tekrar Dene
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => navigate("/")}
                >
                  Ana Sayfa
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HEQuestionnaireTest;
