import React, { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { Button, ProgressBar, useToast } from "../../components";
import { saveTestResult, generateId } from "../../lib/db";
import type { DotCatchRound, DotCatchDetails, TestResult } from "../../types";
import "./TestCommon.css";
import "./DotCatchTest.css";

const TOTAL_ROUNDS = 15;
const DOT_SIZE = 60;
const AREA_PADDING = 20;

type Phase = "instructions" | "playing" | "finished";

interface DotCatchTestProps {
  onComplete?: () => void;
  isSequential?: boolean;
}

export const DotCatchTest: React.FC<DotCatchTestProps> = ({
  onComplete,
  isSequential = false,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const areaRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>(
    isSequential ? "instructions" : "instructions"
  );
  const [currentRound, setCurrentRound] = useState(0);
  const [dotPosition, setDotPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [roundStartTime, setRoundStartTime] = useState<number>(0);
  const [rounds, setRounds] = useState<DotCatchRound[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);

  const generateDotPosition = useCallback(() => {
    if (!areaRef.current) return { x: 50, y: 50 };
    const rect = areaRef.current.getBoundingClientRect();
    const maxX = rect.width - DOT_SIZE - AREA_PADDING * 2;
    const maxY = rect.height - DOT_SIZE - AREA_PADDING * 2;
    return {
      x: Math.random() * maxX + AREA_PADDING,
      y: Math.random() * maxY + AREA_PADDING,
    };
  }, []);

  const startRound = useCallback(() => {
    const position = generateDotPosition();
    setDotPosition(position);
    setRoundStartTime(performance.now());
  }, [generateDotPosition]);

  const handleDotClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!dotPosition) return;
      const reactionTime = Math.round(performance.now() - roundStartTime);
      let clickX = 0,
        clickY = 0;
      if ("touches" in e) {
        const touch = e.touches[0] || e.changedTouches[0];
        clickX = touch.clientX;
        clickY = touch.clientY;
      } else {
        clickX = e.clientX;
        clickY = e.clientY;
      }

      const round: DotCatchRound = {
        round: currentRound + 1,
        reactionTime,
        isCorrect: true,
        dotPosition,
        clickPosition: { x: clickX, y: clickY },
      };

      setRounds((prev) => [...prev, round]);
      setDotPosition(null);

      if (currentRound + 1 >= TOTAL_ROUNDS) {
        finishTest([...rounds, round]);
      } else {
        setCurrentRound((prev) => prev + 1);
        startRound();
      }
    },
    [
      dotPosition,
      roundStartTime,
      currentRound,
      rounds,
      startRound,
    ]
  );

  const handleAreaClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!dotPosition) return;
      const target = e.target as HTMLElement;
      if (target.classList.contains("dot-target")) return;

      const reactionTime = Math.round(performance.now() - roundStartTime);
      let clickX = 0,
        clickY = 0;
      if ("touches" in e) {
        const touch = e.touches[0] || e.changedTouches[0];
        clickX = touch.clientX;
        clickY = touch.clientY;
      } else {
        clickX = e.clientX;
        clickY = e.clientY;
      }

      const round: DotCatchRound = {
        round: currentRound + 1,
        reactionTime,
        isCorrect: false,
        dotPosition,
        clickPosition: { x: clickX, y: clickY },
      };

      setRounds((prev) => [...prev, round]);
      setDotPosition(null);

      if (currentRound + 1 >= TOTAL_ROUNDS) {
        finishTest([...rounds, round]);
      } else {
        setCurrentRound((prev) => prev + 1);
        startRound();
      }
    },
    [
      dotPosition,
      roundStartTime,
      currentRound,
      rounds,
      startRound,
    ]
  );

  const finishTest = useCallback(
    async (allRounds: DotCatchRound[]) => {
      const correctCount = allRounds.filter((r) => r.isCorrect).length;
      const wrongCount = allRounds.filter((r) => !r.isCorrect).length;
      const avgReactionTime = Math.round(
        allRounds.reduce((sum, r) => sum + r.reactionTime, 0) / allRounds.length
      );
      const score = Math.round((correctCount / TOTAL_ROUNDS) * 100);

      const details: DotCatchDetails = { rounds: allRounds };

      const testResult: TestResult = {
        id: generateId(),
        testType: "dot-catch",
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

  return (
    <div className="test-page container container--app">
      {phase === "instructions" && (
        <div className="test-instructions animate-fade-in">
          <div className="test-instructions__icon">🎯</div>
          <h1 className="test-instructions__title">Nokta Yakalama Testi</h1>
          <p className="test-instructions__description">
            Ekranda beliren mavi noktaya mümkün olduğunca hızlı ve tam ortasına
            dokunun.
          </p> 
          <Button variant="primary" size="lg" fullWidth onClick={handleStart}>
            Testi Başlat
          </Button>
        </div>
      )}

      {phase === "playing" && (
        <div className="test-playing animate-fade-in">
          <ProgressBar current={currentRound + 1} total={TOTAL_ROUNDS} />

          <div
            ref={areaRef}
            className="dot-catch-area"
            onClick={handleAreaClick}
            onTouchStart={handleAreaClick}
          >
            {dotPosition && (
              <button
                className="dot-target"
                style={{
                  left: `${dotPosition.x}px`,
                  top: `${dotPosition.y}px`,
                  width: `${DOT_SIZE}px`,
                  height: `${DOT_SIZE}px`,
                }}
                onClick={handleDotClick}
                onTouchStart={handleDotClick}
                aria-label="Noktaya dokun"
              />
            )}
          </div>

          <p className="test-hint">Mavi noktaya dokunun</p>
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

export default DotCatchTest;
