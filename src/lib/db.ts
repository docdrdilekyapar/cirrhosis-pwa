import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { TestResult } from "../types";
import {
  supabase,
  isOnline,
  updateLastSyncTime,
  getCurrentUserId,
  getCurrentTestId,
} from "./supabase";

interface CirrhosisDB extends DBSchema {
  testResults: {
    key: string;
    value: TestResult & {
      synced: boolean;
      userId: string;
      testId: string | null;
    };
    indexes: {
      "by-type": string;
      "by-timestamp": Date;
      "by-synced": number;
    };
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      action: "create" | "update" | "delete";
      data: TestResult;
      testId: string | null;
      timestamp: Date;
    };
  };
}

const DB_NAME = "cirrhosis-pwa-db";
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<CirrhosisDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<CirrhosisDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CirrhosisDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 3) {
          if (db.objectStoreNames.contains("testResults")) {
            db.deleteObjectStore("testResults");
          }
          if (db.objectStoreNames.contains("syncQueue")) {
            db.deleteObjectStore("syncQueue");
          }
        }

        if (!db.objectStoreNames.contains("testResults")) {
          const store = db.createObjectStore("testResults", { keyPath: "id" });
          store.createIndex("by-type", "testType");
          store.createIndex("by-timestamp", "timestamp");
          store.createIndex("by-synced", "synced");
        }

        if (!db.objectStoreNames.contains("syncQueue")) {
          db.createObjectStore("syncQueue", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Save test result (local + sync if online)
export async function saveTestResult(result: TestResult): Promise<void> {
  const db = await getDB();
  const userId = await getCurrentUserId();
  const testId = getCurrentTestId();

  if (!userId) {
    throw new Error("Kullanıcı oturumu bulunamadı");
  }

  const localResult = {
    ...result,
    synced: false,
    userId,
    testId,
  };

  await db.put("testResults", localResult);

  if (isOnline() && testId && !testId.startsWith("local-")) {
    try {
      await syncSingleResult(result, userId, testId);
      await db.put("testResults", { ...localResult, synced: true });
    } catch (error) {
      console.error("Sync failed, will retry later:", error);
      await addToSyncQueue(result, testId);
    }
  } else {
    await addToSyncQueue(result, testId);
  }
}

async function syncSingleResult(
  result: TestResult,
  userId: string,
  testId: string
): Promise<void> {
  const { error } = await supabase.from("test_results").upsert({
    id: result.id,
    test_id: testId,
    user_id: userId,
    test_type: result.testType,
    timestamp: result.timestamp,
    correct_count: result.correctCount,
    wrong_count: result.wrongCount,
    total_rounds: result.totalRounds,
    average_reaction_time: result.averageReactionTime || null,
    score: result.score,
    details: result.details,
    synced: true,
  });

  if (error) {
    throw error;
  }
}

async function addToSyncQueue(
  result: TestResult,
  testId: string | null
): Promise<void> {
  const db = await getDB();
  await db.put("syncQueue", {
    id: result.id,
    action: "create",
    data: result,
    testId,
    timestamp: new Date(),
  });
}

export async function getAllTestResults(): Promise<TestResult[]> {
  const db = await getDB();
  const results = await db.getAll("testResults");
  return results
    .map(
      (r) =>
        ({
          id: r.id,
          testType: r.testType,
          timestamp: r.timestamp,
          correctCount: r.correctCount,
          wrongCount: r.wrongCount,
          totalRounds: r.totalRounds,
          averageReactionTime: r.averageReactionTime,
          score: r.score,
          details: r.details,
        } as TestResult)
    )
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}

export async function getUnsyncedCount(): Promise<number> {
  const db = await getDB();
  const results = await db.getAll("testResults");
  return results.filter((r) => !r.synced).length;
}

export async function syncAllResults(): Promise<{
  synced: number;
  failed: number;
}> {
  if (!isOnline()) {
    throw new Error("İnternet bağlantısı yok");
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Kullanıcı oturumu bulunamadı");
  }

  const db = await getDB();
  const results = await db.getAll("testResults");
  const unsynced = results.filter((r) => !r.synced);

  let synced = 0;
  let failed = 0;

  for (const result of unsynced) {
    try {
      if (result.testId && !result.testId.startsWith("local-")) {
        await syncSingleResult(result, userId, result.testId);
      }
      await db.put("testResults", { ...result, synced: true });
      synced++;
    } catch (error) {
      console.error("Failed to sync result:", result.id, error);
      failed++;
    }
  }

  await db.clear("syncQueue");
  updateLastSyncTime();
  await fetchResultsFromServer(userId);

  return { synced, failed };
}

async function fetchResultsFromServer(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("test_results")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to fetch results from server:", error);
    return;
  }

  if (!data) return;

  const db = await getDB();

  for (const serverResult of data) {
    const localResult = await db.get("testResults", serverResult.id);

    if (!localResult) {
      await db.put("testResults", {
        id: serverResult.id,
        testType: serverResult.test_type,
        timestamp: new Date(serverResult.timestamp),
        correctCount: serverResult.correct_count,
        wrongCount: serverResult.wrong_count,
        totalRounds: serverResult.total_rounds,
        averageReactionTime: serverResult.average_reaction_time,
        score: serverResult.score,
        details: serverResult.details,
        synced: true,
        userId: serverResult.user_id,
        testId: serverResult.test_id,
      });
    }
  }
}

export async function getTestStatistics() {
  const results = await getAllTestResults();

  const stats = {
    totalTests: results.length,
    dotCatchCount: 0,
    colorMatchCount: 0,
    wordMemoryCount: 0,
    heQuestionnaireCount: 0,
    averageScore: 0,
    bestScores: {
      "dot-catch": 0,
      "color-match": 0,
      "word-memory": 0,
      "he-questionnaire": 0,
    } as Record<string, number>,
  };

  if (results.length === 0) return stats;

  let totalScore = 0;

  results.forEach((result) => {
    totalScore += result.score;

    switch (result.testType) {
      case "dot-catch":
        stats.dotCatchCount++;
        break;
      case "color-match":
        stats.colorMatchCount++;
        break;
      case "word-memory":
        stats.wordMemoryCount++;
        break;
      case "he-questionnaire":
        stats.heQuestionnaireCount++;
        break;
    }

    if (result.score > stats.bestScores[result.testType]) {
      stats.bestScores[result.testType] = result.score;
    }
  });

  stats.averageScore = Math.round(totalScore / results.length);

  return stats;
}

// Session management
const SESSION_KEY = "cirrhosis-test-session";
const LAST_TEST_KEY = "cirrhosis-last-test-timestamp";

export interface TestSession {
  currentStep: string;
  startedAt: Date;
}

export async function saveTestSession(session: TestSession): Promise<void> {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function getTestSession(): Promise<TestSession | null> {
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;
  return JSON.parse(data);
}

export async function clearTestSession(): Promise<void> {
  localStorage.removeItem(SESSION_KEY);
  localStorage.setItem(LAST_TEST_KEY, new Date().toISOString());
}

export async function getLastTestTimestamp(): Promise<Date | null> {
  const localTimestamp = localStorage.getItem(LAST_TEST_KEY);
  if (localTimestamp) {
    return new Date(localTimestamp);
  }

  const results = await getAllTestResults();
  if (results.length > 0) {
    return new Date(results[0].timestamp);
  }

  return null;
}

// Bugün tamamlanan test oturum sayısını döndür
const DAILY_TEST_COUNT_KEY = "cirrhosis-daily-test-count";

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function getTodayTestSessionCount(): number {
  const data = localStorage.getItem(DAILY_TEST_COUNT_KEY);
  if (!data) return 0;
  const parsed = JSON.parse(data);
  if (parsed.date !== getTodayKey()) return 0;
  return parsed.count || 0;
}

export function incrementTodayTestSessionCount(): void {
  const todayKey = getTodayKey();
  const current = getTodayTestSessionCount();
  localStorage.setItem(
    DAILY_TEST_COUNT_KEY,
    JSON.stringify({ date: todayKey, count: current + 1 })
  );
}
