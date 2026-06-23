import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { Button, ProgressBar, useToast } from "../../components";
import { saveTestResult, generateId } from "../../lib/db";
import type {
  ColorMatchRound,
  ColorMatchDetails,
  TestResult,
  TestColor,
} from "../../types";
import "./TestCommon.css";
import "./ColorMatchTest.css";

const TOTAL_ROUNDS = 15;

const COLORS: { id: TestColor; name: string; css: string }[] = [
  { id: "black", name: "Siyah", css: "var(--test-color-black)" },
  { id: "red", name: "Kırmızı", css: "var(--test-color-red)" },
  { id: "yellow", name: "Sarı", css: "var(--test-color-yellow)" },
  { id: "green", name: "Yeşil", css: "var(--test-color-green)" },
  { id: "blue", name: "Mavi", css: "var(--test-color-blue)" },
];

type Phase = "instructions" | "playing" | "finished";

interface ColorMatchTestProps {
  onComplete?: () => void;
  isSequential?: boolean;
}

export const ColorMatchTest: React.FC<ColorMatchTestProps> = ({
  onComplete,
  isSequential = false,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [phase, setPhase] = useState<Phase>("instructions");
  const [currentRound, setCurrentRound] = useState(0);
  const [currentColor, setCurrentColor] = useState<TestColor | null>(null);
  const [roundStartTime, setRoundStartTime] = useState<number>(0);
  const [rounds, setRounds] = useState<ColorMatchRound[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);

  const generateRandomColor = useCallback((previous: TestColor | null): TestColor => {
    const available = COLORS.filter((c) => c.id !== previous);
    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex].id;
  }, []);

  const startRound = useCallback(() => {
    setCurrentColor((prev) => {
      const color = generateRandomColor(prev);
      setRoundStartTime(performance.now());
      return color;
    });
  }, [generateRandomColor]);

  const handleColorSelect = useCallback(
    (selectedColor: TestColor) => {
      if (!currentColor) return;

      const reactionTime = Math.round(performance.now() - roundStartTime);
      const isCorrect = selectedColor === currentColor;

      const round: ColorMatchRound = {
        round: currentRound + 1,
        targetColor: currentColor,
        selectedColor,
        isCorrect,
        reactionTime,
      };

      setRounds((prev) => [...prev, round]);

      if (currentRound + 1 >= TOTAL_ROUNDS) {
        finishTest([...rounds, round]);
      } else {
        setCurrentRound((prev) => prev + 1);
        startRound();
      }
    },
    [
      currentColor,
      roundStartTime,
      currentRound,
      rounds,
      startRound,
    ]
  );

  const finishTest = useCallback(
    async (allRounds: ColorMatchRound[]) => {
      const correctCount = allRounds.filter((r) => r.isCorrect).length;
      const wrongCount = allRounds.filter((r) => !r.isCorrect).length;
      const avgReactionTime = Math.round(
        allRounds.reduce((sum, r) => sum + r.reactionTime, 0) / allRounds.length
      );
      const score = Math.round((correctCount / TOTAL_ROUNDS) * 100);

      const details: ColorMatchDetails = { rounds: allRounds };

      const testResult: TestResult = {
        id: generateId(),
        testType: "color-match",
        timestamp: new Date(),
        correctCount,
        wrongCount,
        totalRounds: TOTAL_ROUNDS,
        averageReactionTime: avgReactionTime,
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
    },
    [showToast, isSequential]
  );

  const handleStart = () => {
    setPhase("playing");
    setCurrentRound(0);
    setRounds([]);
    setTimeout(() => startRound(), 500);
  };

  const handleContinue = () => {
    if (onComplete) {
      onComplete();
    }
  };

  const handleRestart = () => {
    setPhase("instructions");
    setResult(null);
    setRounds([]);
    setCurrentRound(0);
  };

  const getColorCSS = (colorId: TestColor): string => {
    return COLORS.find((c) => c.id === colorId)?.css || "black";
  };

  return (
    <div className="test-page container container--app">
      {phase === "instructions" && (
        <div className="test-instructions animate-fade-in">
          <div className="test-instructions__icon">🎨</div>
          <h1 className="test-instructions__title">Renk Eşleştirme Testi</h1>
          <p className="test-instructions__description">
            Ekrandaki ##### sembolünün rengine dikkat edin ve aşağıdaki
            butonlardan doğru rengi seçin.
          </p> 
          <Button variant="primary" size="lg" fullWidth onClick={handleStart}>
            Testi Başlat
          </Button>
        </div>
      )}

      {phase === "playing" && (
        <div className="test-playing animate-fade-in">
          <ProgressBar current={currentRound + 1} total={TOTAL_ROUNDS} />

          <div className="color-match-area">
            {currentColor && (
              <div
                className="color-match-symbol"
                style={{ color: getColorCSS(currentColor) }}
              >
                #####
              </div>
            )}
          </div>

          <div className="color-buttons">
            {COLORS.map((color) => (
              <button
                key={color.id}
                className="color-button"
                style={{ backgroundColor: color.css }}
                onClick={() => handleColorSelect(color.id)}
                aria-label={color.name}
              >
                <span className="sr-only">{color.name}</span>
              </button>
            ))}
          </div>

          <p className="test-hint">Sembolün rengini seçin</p>
        </div>
      )}

      {phase === "finished" && result && (
        <div className="test-result animate-fade-in">
          <div className="test-result__icon">🎉</div>
          <h1 className="test-result__title">Test Tamamlandı!</h1>

          <div className="test-result__actions">
            {isSequential ? (
              <Button variant="primary" fullWidth onClick={handleContinue}>
                Sonraki Teste Geç
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

export default ColorMatchTest;
