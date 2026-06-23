/**
 * Auto Sync Service - Otomatik Senkronizasyon Servisi
 *
 * Günde 2 kere (12:30 ve 18:00) otomatik senkronizasyon yapar.
 * Offline durumda notification gönderir.
 * Önceki gün sync yapılmamışsa teste girişi engeller.
 */

import { syncAllResults, getUnsyncedCount } from "./db";
import { isOnline, updateLastSyncTime } from "./supabase";
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

// Sync zamanları
export const SYNC_TIMES = ["12:30", "18:00"] as const;
export type SyncTime = (typeof SYNC_TIMES)[number];

// Sync geçmişi için DB şeması
interface SyncHistoryDB extends DBSchema {
    syncHistory: {
        key: string;
        value: SyncHistoryEntry;
        indexes: {
            "by-date": string;
        };
    };
}

export interface SyncHistoryEntry {
    id: string;
    date: string; // YYYY-MM-DD
    syncTime: SyncTime;
    status: "success" | "failed" | "offline";
    timestamp: Date;
    syncedCount?: number;
    failedCount?: number;
}

const SYNC_HISTORY_DB = "cirrhosis-sync-history";
const SYNC_HISTORY_VERSION = 1;

let syncHistoryDB: Promise<IDBPDatabase<SyncHistoryDB>> | null = null;

function getSyncHistoryDB(): Promise<IDBPDatabase<SyncHistoryDB>> {
    if (!syncHistoryDB) {
        syncHistoryDB = openDB<SyncHistoryDB>(
            SYNC_HISTORY_DB,
            SYNC_HISTORY_VERSION,
            {
                upgrade(db) {
                    if (!db.objectStoreNames.contains("syncHistory")) {
                        const store = db.createObjectStore("syncHistory", {
                            keyPath: "id",
                        });
                        store.createIndex("by-date", "date");
                    }
                },
            }
        );
    }
    return syncHistoryDB;
}

// Tarih formatı: YYYY-MM-DD
function formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
}

// Sync geçmişi kaydet
export async function saveSyncHistory(
    entry: Omit<SyncHistoryEntry, "id">
): Promise<void> {
    const db = await getSyncHistoryDB();
    const id = `${entry.date}-${entry.syncTime}`;
    await db.put("syncHistory", { ...entry, id });
}

// Belirli günün sync durumunu al
export async function getSyncHistoryForDate(
    date: string
): Promise<SyncHistoryEntry[]> {
    const db = await getSyncHistoryDB();
    const index = db.transaction("syncHistory").store.index("by-date");
    return index.getAll(date);
}

// Önceki gün sync yapıldı mı?
export async function wasPreviousDaySynced(): Promise<boolean> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = formatDate(yesterday);

    const entries = await getSyncHistoryForDate(dateStr);

    // En az bir başarılı sync varsa OK
    return entries.some((e) => e.status === "success");
}

// Bugün sync yapıldı mı?
export async function wasTodaySynced(): Promise<{
    synced: boolean;
    times: SyncTime[];
}> {
    const today = formatDate(new Date());
    const entries = await getSyncHistoryForDate(today);

    const successfulTimes = entries
        .filter((e) => e.status === "success")
        .map((e) => e.syncTime);

    return {
        synced: successfulTimes.length > 0,
        times: successfulTimes,
    };
}

// Sonraki sync zamanını hesapla
export function getNextSyncTime(): { time: SyncTime; remaining: string } | null {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const time of SYNC_TIMES) {
        const [hours, minutes] = time.split(":").map(Number);
        const syncMinutes = hours * 60 + minutes;

        if (syncMinutes > currentMinutes) {
            const remainingMinutes = syncMinutes - currentMinutes;
            const h = Math.floor(remainingMinutes / 60);
            const m = remainingMinutes % 60;

            return {
                time,
                remaining: h > 0 ? `${h} saat ${m} dakika` : `${m} dakika`,
            };
        }
    }

    // Yarın 12:30
    const [hours, minutes] = SYNC_TIMES[0].split(":").map(Number);
    const syncMinutes = hours * 60 + minutes;
    const remainingMinutes = 24 * 60 - currentMinutes + syncMinutes;
    const h = Math.floor(remainingMinutes / 60);
    const m = remainingMinutes % 60;

    return {
        time: SYNC_TIMES[0],
        remaining: `${h} saat ${m} dakika`,
    };
}

// Şimdi sync zamanı mı?
export function isScheduledSyncTime(): SyncTime | null {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    for (const time of SYNC_TIMES) {
        if (currentTime === time) {
            return time;
        }
    }

    return null;
}

// Notification izni iste
export async function requestNotificationPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
        console.warn("Bu tarayıcı notification desteklemiyor");
        return false;
    }

    if (Notification.permission === "granted") {
        return true;
    }

    if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        return permission === "granted";
    }

    return false;
}

// Notification gönder
export async function sendNotification(
    title: string,
    body: string
): Promise<void> {
    if (Notification.permission !== "granted") {
        return;
    }

    const registration = await navigator.serviceWorker?.ready;
    if (registration) {
        await registration.showNotification(title, {
            body,
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-72x72.png",
            tag: "sync-reminder",
            requireInteraction: true,
        });
    } else {
        new Notification(title, { body });
    }
}

// Son kontrol zamanını takip etmek için
let lastCheckedTime: string | null = null;

// Otomatik sync kontrolünü başlat
export function initAutoSync(
    onSyncRequired: () => void,
    onSyncComplete: (result: { synced: number; failed: number }) => void,
    onOfflineWarning: () => void
): () => void {
    // Her dakika kontrol et
    const intervalId = setInterval(async () => {
        const scheduleTime = isScheduledSyncTime();

        // Aynı dakikada tekrar tetiklenmesin
        if (scheduleTime && scheduleTime !== lastCheckedTime) {
            lastCheckedTime = scheduleTime;

            const today = formatDate(new Date());
            const entries = await getSyncHistoryForDate(today);
            const alreadySynced = entries.some(
                (e) => e.syncTime === scheduleTime && e.status === "success"
            );

            if (alreadySynced) {
                return; // Bu saat zaten sync yapılmış
            }

            if (isOnline()) {
                onSyncRequired();

                try {
                    const result = await syncAllResults();
                    updateLastSyncTime();

                    await saveSyncHistory({
                        date: today,
                        syncTime: scheduleTime,
                        status: "success",
                        timestamp: new Date(),
                        syncedCount: result.synced,
                        failedCount: result.failed,
                    });

                    onSyncComplete(result);
                } catch (error) {
                    console.error("Auto sync failed:", error);

                    await saveSyncHistory({
                        date: today,
                        syncTime: scheduleTime,
                        status: "failed",
                        timestamp: new Date(),
                    });
                }
            } else {
                // Offline - notification gönder
                await saveSyncHistory({
                    date: today,
                    syncTime: scheduleTime,
                    status: "offline",
                    timestamp: new Date(),
                });

                await sendNotification(
                    "Senkronizasyon Gerekli",
                    "İnternet bağlantınız yok. Lütfen bağlanıp uygulamayı açın."
                );

                onOfflineWarning();
            }
        } else if (!scheduleTime) {
            lastCheckedTime = null;
        }
    }, 30000); // 30 saniyede bir kontrol

    // Cleanup fonksiyonu
    return () => {
        clearInterval(intervalId);
    };
}

// Test başlatılabilir mi kontrolü
export async function canStartTest(): Promise<{
    allowed: boolean;
    reason?: string;
}> {
    const previousDaySynced = await wasPreviousDaySynced();

    if (!previousDaySynced) {
        // İlk gün mü kontrol et (hiç sync geçmişi yok)
        const db = await getSyncHistoryDB();
        const allEntries = await db.getAll("syncHistory");

        if (allEntries.length === 0) {
            // İlk kullanım, teste izin ver
            return { allowed: true };
        }

        return {
            allowed: false,
            reason:
                "Dünkü senkronizasyon tamamlanmadı. Teste başlamak için önce verilerinizi senkronize etmeniz gerekiyor.",
        };
    }

    return { allowed: true };
}

// Bekleyen sync sayısı
export async function getPendingSyncCount(): Promise<number> {
    return getUnsyncedCount();
}

// Saat 16:00 geçti mi ve senkronize edilmemiş test var mı?
const SYNC_DEADLINE_HOUR = 16;

export async function isSyncDeadlinePassed(): Promise<boolean> {
    const now = new Date();
    if (now.getHours() < SYNC_DEADLINE_HOUR) {
        return false;
    }

    // Bugün en az 1 test yapılmış mı?
    const { getTodayTestSessionCount } = await import("./db");
    const todayCount = getTodayTestSessionCount();
    if (todayCount === 0) {
        return false;
    }

    // Bugün başarılı sync var mı?
    const todayStatus = await wasTodaySynced();
    if (todayStatus.synced) {
        return false;
    }

    // Senkronize edilmemiş sonuç var mı?
    const unsyncedCount = await getUnsyncedCount();
    return unsyncedCount > 0;
}
