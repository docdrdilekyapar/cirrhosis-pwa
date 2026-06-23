import { useState, useEffect, useCallback } from "react";
import type { TestResult } from "../types";
import {
  getAllTestResults,
  saveTestResult,
  getTestStatistics,
} from "../lib/db";

export function useTestResults(testType?: string) {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let data = await getAllTestResults();

      // Filter by type if specified
      if (testType) {
        data = data.filter((r) => r.testType === testType);
      }

      setResults(data);
    } catch (err) {
      setError("Sonuçlar yüklenirken hata oluştu");
      console.error("Error fetching results:", err);
    } finally {
      setLoading(false);
    }
  }, [testType]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const addResult = async (result: TestResult) => {
    try {
      await saveTestResult(result);
      await fetchResults();
    } catch (err) {
      setError("Sonuç kaydedilirken hata oluştu");
      console.error("Error saving result:", err);
    }
  };

  return {
    results,
    loading,
    error,
    addResult,
    refetch: fetchResults,
  };
}

export function useTestStatistics() {
  const [stats, setStats] = useState<Awaited<
    ReturnType<typeof getTestStatistics>
  > | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getTestStatistics();
        setStats(data);
      } catch (err) {
        console.error("Error fetching statistics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading };
}
