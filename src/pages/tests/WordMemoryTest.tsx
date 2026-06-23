import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Card, Button, useToast } from "../../components";
import { saveTestResult, generateId } from "../../lib/db";
import type { WordMemoryDetails, TestResult } from "../../types";
import "./TestCommon.css";
import "./WordMemoryTest.css";

const WORD_POOL = [
  "yatak",
  "yastık",
  "vazo",
  "ütü",
  "tuzluk",
  "toka",
  "terlik",
  "tepsi",
  "tencere",
  "televizyon",
  "telefon",
  "tava",
  "tarak",
  "takvim",
  "tabak",
  "şişe",
  "şapka",
  "süpürge",
  "suluk",
  "soba",
  "silgi",
  "sepet",
  "sehpa",
  "sandık",
  "sandalye",
  "saksı",
  "sabun",
  "saat",
  "radyo",
  "pil",
  "perde",
  "peçete",
  "parfüm",
  "pantolon",
  "pamuk",
  "ocak",
  "masa",
  "makas",
  "lamba",
  "kürek",
  "kumanda",
  "kulaklık",
  "koltuk",
  "kolonya",
  "kitap",
  "kilit",
  "kilim",
  "kibrit",
  "kepçe",
  "kemer",
  "kazak",
  "kaşık",
  "kalem",
  "ip",
  "havlu",
  "halı",
  "gömlek",
  "gazete",
  "fotoğraf",
  "fincan",
  "fırın",
  "fırça",
  "fener",
  "etek",
  "eldiven",
  "elbise",
  "dolap",
  "defter",
  "çorap",
  "çizme",
  "çekiç",
  "çaydanlık",
  "çatal",
  "çanta",
  "çakmak",
  "cüzdan",
  "ceket",
  "buzdolabı",
  "bot",
  "bilgisayar",
  "bıçak",
  "bere",
  "battaniye",
  "bardak",
  "balta",
  "ayna",
  "ayakkabı",
  "atkı",
  "askı",
  "anahtar",
  "zil",
  "zar",
  "tekerlek",
  "sünger",
  "poşet",
  "mum",
  "mandal",
  "kova",
  "kapak",
  "hırka",
  "gözlük",
  "çivi",
  "bavul",
];

const SHOW_WORDS_COUNT = 4;
// const SELECTION_OPTIONS_COUNT = 8;
const MEMORIZE_TIME = 20;
const WAIT_TIME = 10;

type Phase = "instructions" | "memorize" | "wait" | "select" | "finished";

interface WordMemoryTestProps {
  onComplete?: () => void;
  isSequential?: boolean;
}

export const WordMemoryTest: React.FC<WordMemoryTestProps> = ({
  onComplete,
  isSequential = false,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Müzik dosyaları
  const MUSIC_FILES = [
    "/assets/sounds/aLittleNight.mp3",
    "/assets/sounds/violin_mozart.mp3",
  ];

  const [phase, setPhase] = useState<Phase>("instructions");
  const [shownWords, setShownWords] = useState<string[]>([]);
  const [allWords, setAllWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(MEMORIZE_TIME);
  const [result, setResult] = useState<TestResult | null>(null);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const selectRandomWords = useCallback(
    (pool: string[], count: number): string[] => {
      const shuffled = shuffleArray(pool);
      return shuffled.slice(0, count);
    },
    []
  );

  const startMemorize = useCallback(() => {
    const words = selectRandomWords(WORD_POOL, SHOW_WORDS_COUNT);
    setShownWords(words);
    setPhase("memorize");
    setTimeRemaining(MEMORIZE_TIME);
  }, [selectRandomWords]);

  const startWait = useCallback(() => {
    setPhase("wait");
    setTimeRemaining(WAIT_TIME);

    // Rastgele müzik çal
    const randomIndex = Math.floor(Math.random() * MUSIC_FILES.length);
    const audio = new Audio(MUSIC_FILES[randomIndex]);
    audio.volume = 0.3; // Hafif ses seviyesi
    audioRef.current = audio;
    audio.play().catch((err) => console.log("Audio play failed:", err));
  }, []);

  const startSelection = useCallback(() => {
    // Müziği durdur
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const mixedWords = shuffleArray([...shownWords]);

    setAllWords(mixedWords);
    setPhase("select");
    setSelectedWords([]);
  }, [shownWords]);

  useEffect(() => {
    if (phase === "memorize" || phase === "wait") {
      timerRef.current = window.setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            if (phase === "memorize") {
              startWait();
            } else if (phase === "wait") {
              startSelection();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [phase, startWait, startSelection]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleWordToggle = (word: string) => {
    setSelectedWords((prev) => {
      if (prev.includes(word)) {
        return prev.filter((w) => w !== word);
      } else {
        return [...prev, word];
      }
    });
  };

  const handleSubmit = async () => {
    const correctSelections = selectedWords.filter((w) =>
      shownWords.includes(w)
    );
    const wrongSelections = selectedWords.filter(
      (w) => !shownWords.includes(w)
    );

    const correctCount = correctSelections.length;
    const wrongCount = wrongSelections.length; // Sadece yanlış seçilenler
    const score = Math.round((correctCount / SHOW_WORDS_COUNT) * 100);

    const details: WordMemoryDetails = {
      shownWords,
      selectedWords,
      correctSelections,
      wrongSelections,
    };

    const testResult: TestResult = {
      id: generateId(),
      testType: "word-memory",
      timestamp: new Date(),
      correctCount,
      wrongCount,
      totalRounds: SHOW_WORDS_COUNT,
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

  const handleStart = () => {
    startMemorize();
  };

  const handleContinue = () => {
    if (onComplete) {
      onComplete();
    }
  };

  const handleRestart = () => {
    setPhase("instructions");
    setResult(null);
    setShownWords([]);
    setAllWords([]);
    setSelectedWords([]);
  };

  return (
    <div className="test-page container container--app">
      {phase === "instructions" && (
        <div className="test-instructions animate-fade-in">
          <div className="test-instructions__icon">🧠</div>
          <h1 className="test-instructions__title">Kelime Hafıza Testi</h1>
          <Card
            variant="outlined"
            padding="md"
            className="test-instructions__info"
          >
            <div className="test-instructions__body">
              <p>
                Hastanıza, ekrandaki kelimeleri göstermeden yüksek sesle 3 kez
                okuyun.
              </p>
              <p>
                Daha sonra hastadan kelimeleri bir kez tekrar etmesini isteyin.
              </p>
              <p>
                Yaklaşık 10 saniye bekledikten sonra hastaya hatırladığı
                kelimeleri sorun.
              </p>
              <p>Bu aşamada ekran hastaya gösterilmemelidir.</p>
              <p className="test-instructions__highlight">
                ✅ Hastanın doğru söylediği her kelime işaretlenmelidir.
              </p>
            </div>
          </Card>
          <Button variant="primary" size="lg" fullWidth onClick={handleStart}>
            Testi Başlat
          </Button>
        </div>
      )}

      {phase === "memorize" && (
        <div className="test-playing animate-fade-in">
          <div className="timer-display">
            <div
              className="timer-circle"
              style={
                {
                  "--progress": (MEMORIZE_TIME - timeRemaining) / MEMORIZE_TIME,
                } as React.CSSProperties
              }
            >
              <span className="timer-value">{timeRemaining}</span>
            </div>
            <span className="timer-label">Kelimeleri ezberleyin</span>
          </div>

          <div className="word-display">
            {shownWords.map((word, index) => (
              <div
                key={index}
                className="word-box animate-scale-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {word}
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "wait" && (
        <div className="test-playing animate-fade-in">
          <div className="wait-screen">
            <div
              className="timer-circle timer-circle--wait"
              style={
                {
                  "--progress": (WAIT_TIME - timeRemaining) / WAIT_TIME,
                } as React.CSSProperties
              }
            >
              <span className="timer-value">{timeRemaining}</span>
            </div>
            <span className="timer-label">Bekleyin...</span>
            <div className="wait-icon">🎵</div>
            <p className="wait-hint">Kelimeleri hatırlamaya çalışın</p>
          </div>
        </div>
      )}

      {phase === "select" && (
        <div className="test-playing animate-fade-in">
          <div className="selection-header">
            <h2>Hastanızın hatırladığı kelimeleri seçin </h2>
            <p className="selection-count">
              {selectedWords.length} / {SHOW_WORDS_COUNT} seçildi
            </p>
          </div>

          <div className="word-selection">
            {allWords.map((word, index) => (
              <button
                key={index}
                className={`word-option ${selectedWords.includes(word) ? "selected" : ""
                  }`}
                onClick={() => handleWordToggle(word)}
              >
                <span className="word-option__checkbox">
                  {selectedWords.includes(word) && "✓"}
                </span>
                <span className="word-option__text">{word}</span>
              </button>
            ))}
          </div>

          <div className="selection-actions"> 
            {selectedWords.length > 0 ? (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleSubmit}
                disabled={selectedWords.length === 0}
              >
                Seçimi Onayla
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleSubmit}
              >
                Hiç birini hatırlayamadı
              </Button>
            )}
          </div>
        </div>
      )}

      {phase === "finished" && result && (
        <div className="test-result animate-fade-in">
          <div className="test-result__icon">🎉</div>
          <h1 className="test-result__title">Test Tamamlandı!</h1> 

          <div className="test-result__actions">
            {isSequential ? (
              <Button variant="primary" fullWidth onClick={handleContinue}>
                Tamamla
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

export default WordMemoryTest;
