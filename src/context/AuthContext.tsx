import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  checkUserRegistration,
  signUp,
  signIn,
  signOut as supabaseSignOut,
  isOnline,
  supabase,
  updateLastSyncTime,
} from "../lib/supabase";
import { syncAllResults, getUnsyncedCount } from "../lib/db";
import {
  initAutoSync,
  getNextSyncTime,
  canStartTest,
  wasTodaySynced,
  requestNotificationPermission,
  isSyncDeadlinePassed,
  type SyncTime,
} from "../lib/autoSync";
import { getTodayTestSessionCount } from "../lib/db";

interface AuthContextType {
  isRegistered: boolean;
  isLoading: boolean;
  userId: string | null;
  error: string | null;
  isOnline: boolean;
  isSyncRequired: boolean;
  unsyncedCount: number;
  nextSyncTime: { time: SyncTime; remaining: string } | null;
  canStartTest: boolean;
  testBlockReason: string | null;
  todaySyncStatus: { synced: boolean; times: SyncTime[] };
  autoSyncInProgress: boolean;
  dailyTestLimitReached: boolean;
  syncDeadlineWarning: boolean;
  register: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sync: () => Promise<{ synced: number; failed: number }>;
  refreshSyncStatus: () => void;
  checkTestAccess: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(isOnline());
  const [syncRequired, setSyncRequired] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [nextSyncTimeState, setNextSyncTimeState] = useState<{
    time: SyncTime;
    remaining: string;
  } | null>(null);
  const [canStartTestState, setCanStartTestState] = useState(true);
  const [testBlockReason, setTestBlockReason] = useState<string | null>(null);
  const [todaySyncStatus, setTodaySyncStatus] = useState<{
    synced: boolean;
    times: SyncTime[];
  }>({ synced: false, times: [] });
  const [autoSyncInProgress, setAutoSyncInProgress] = useState(false);
  const [dailyTestLimitReached, setDailyTestLimitReached] = useState(false);
  const [syncDeadlineWarning, setSyncDeadlineWarning] = useState(false);

  // Auth kontrolü
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const id = await checkUserRegistration();
        if (id) {
          setUserId(id);
          setIsRegistered(true);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        setIsRegistered(true);
      } else {
        setUserId(null);
        setIsRegistered(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Online/Offline takibi
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sync durumu refresh
  const refreshSyncStatus = useCallback(async () => {
    setNextSyncTimeState(getNextSyncTime());

    try {
      const count = await getUnsyncedCount();
      setUnsyncedCount(count);
      setSyncRequired(count > 0);

      const todayStatus = await wasTodaySynced();
      setTodaySyncStatus(todayStatus);

      // Günlük test limiti kontrolü (2/gün)
      const todayCount = getTodayTestSessionCount();
      // test hakkı
      setDailyTestLimitReached(false);
      // setDailyTestLimitReached(todayCount >= 2);

      // Saat 16:00 sync deadline kontrolü
      const deadlinePassed = await isSyncDeadlinePassed();
      setSyncDeadlineWarning(deadlinePassed);
    } catch (err) {
      console.error("Failed to get sync status:", err);
    }
  }, []);

  // Test erişim kontrolü
  const checkTestAccess = useCallback(async () => {
    try {
      const result = await canStartTest();
      setCanStartTestState(result.allowed);
      setTestBlockReason(result.reason || null);
    } catch (err) {
      console.error("Failed to check test access:", err);
      setCanStartTestState(true);
    }
  }, []);

  // Auto-sync başlat
  useEffect(() => {
    if (isRegistered) {
      refreshSyncStatus();
      checkTestAccess();

      // Notification izni iste
      requestNotificationPermission();

      // Auto-sync servisi başlat
      const cleanup = initAutoSync(
        // onSyncRequired
        () => {
          setAutoSyncInProgress(true);
        },
        // onSyncComplete
        (result) => {
          setAutoSyncInProgress(false);
          refreshSyncStatus();
          checkTestAccess();
          console.log(
            `Auto sync completed: ${result.synced} synced, ${result.failed} failed`
          );
        },
        // onOfflineWarning
        () => {
          setAutoSyncInProgress(false);
          setSyncRequired(true);
        }
      );

      // Her dakika sync durumunu güncelle
      const interval = setInterval(() => {
        refreshSyncStatus();
        setNextSyncTimeState(getNextSyncTime());
      }, 60000);

      return () => {
        cleanup();
        clearInterval(interval);
      };
    }
  }, [isRegistered, refreshSyncStatus, checkTestAccess]);

  const register = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    setError(null);
    setIsLoading(true);

    try {
      const id = await signUp(email, password, displayName);
      setUserId(id);
      setIsRegistered(true);
      await refreshSyncStatus();
      await checkTestAccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const id = await signIn(email, password);
      setUserId(id);
      setIsRegistered(true);
      await refreshSyncStatus();
      await checkTestAccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabaseSignOut();
      setUserId(null);
      setIsRegistered(false);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const sync = async () => {
    setError(null);

    try {
      const result = await syncAllResults();
      updateLastSyncTime();
      await refreshSyncStatus();
      await checkTestAccess();
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Senkronizasyon başarısız";
      setError(message);
      throw err;
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        isRegistered,
        isLoading,
        userId,
        error,
        isOnline: online,
        isSyncRequired: syncRequired,
        unsyncedCount,
        nextSyncTime: nextSyncTimeState,
        canStartTest: canStartTestState,
        testBlockReason,
        todaySyncStatus,
        autoSyncInProgress,
        dailyTestLimitReached,
        syncDeadlineWarning,
        register,
        login,
        logout,
        sync,
        refreshSyncStatus,
        checkTestAccess,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
