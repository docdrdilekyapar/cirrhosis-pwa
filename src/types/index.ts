// Test Types
export type TestType =
  | "dot-catch"
  | "color-match"
  | "word-memory"
  | "he-questionnaire";

export type TestColor = "black" | "red" | "yellow" | "green" | "blue";

export interface DotCatchRound {
  round: number;
  reactionTime: number; // milliseconds
  isCorrect: boolean;
  dotPosition: { x: number; y: number };
  clickPosition: { x: number; y: number };
}

export interface ColorMatchRound {
  round: number;
  targetColor: TestColor;
  selectedColor: TestColor;
  isCorrect: boolean;
  reactionTime: number;
}

export interface WordMemoryDetails {
  shownWords: string[];
  selectedWords: string[];
  correctSelections: string[];
  wrongSelections: string[];
}

export interface HEQuestionnaireAnswer {
  question: string;
  answer: "Doğru" | "Yanlış" | "Evet" | "Hayır";
}

export interface HEQuestionnaireDetails {
  answers: HEQuestionnaireAnswer[];
}

// Test Result Details
export interface DotCatchDetails {
  rounds: DotCatchRound[];
}

export interface ColorMatchDetails {
  rounds: ColorMatchRound[];
}

// Main Test Result Interface
export interface TestResult {
  id: string;
  testType: TestType;
  timestamp: Date;
  correctCount: number;
  wrongCount: number;
  totalRounds: number;
  averageReactionTime?: number; // ms, only for dot-catch and color-match
  score: number; // 0-100 percentage
  details:
    | DotCatchDetails
    | ColorMatchDetails
    | WordMemoryDetails
    | HEQuestionnaireDetails;
}

// Test State Types
export type TestPhase = "instructions" | "playing" | "finished";

export interface BaseTestState {
  phase: TestPhase;
  currentRound: number;
  totalRounds: number;
  correctCount: number;
  wrongCount: number;
}

export interface DotCatchState extends BaseTestState {
  dotPosition: { x: number; y: number } | null;
  roundStartTime: number | null;
  rounds: DotCatchRound[];
}

export interface ColorMatchState extends BaseTestState {
  currentColor: TestColor | null;
  roundStartTime: number | null;
  rounds: ColorMatchRound[];
}

export interface WordMemoryState {
  phase: "instructions" | "memorize" | "wait" | "select" | "finished";
  shownWords: string[];
  allWords: string[]; // Mixed words for selection
  selectedWords: string[];
  timeRemaining: number;
}

// Toast Types
export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// Navigation Types
export interface TestInfo {
  id: TestType;
  title: string;
  description: string;
  icon: string;
  path: string;
  color: string;
}
