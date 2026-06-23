import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://smaqjzhwoqqshifznaro.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseKey);

const adminCreateClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

type ProfileWritableFields = {
  display_name?: string | null;
  phone?: string | null;
  age?: number | null;
  gender?: "male" | "female" | "other" | null;
  consent_accepted?: boolean;
  consent_accepted_at?: string | null;
  is_active?: boolean;
};

async function upsertProfile(
  client: typeof supabase,
  userId: string,
  payload: ProfileWritableFields
): Promise<void> {
  const row = {
    id: userId,
    ...payload,
  };

  const { error } = await client
    .from("profiles")
    .upsert(row, { onConflict: "id" });

  if (error) {
    throw new Error("Profil güncellenemedi: " + error.message);
  }
}

// Profile type
export interface UserProfile {
  id: string;
  display_name: string | null;
  phone: string | null;
  age: number | null;
  gender: "male" | "female" | "other" | null;
  is_active?: boolean;
  is_admin?: boolean;
  consent_accepted: boolean;
  consent_accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UserStatusRow {
  is_active?: boolean;
}

function resolveUserActive(row: UserStatusRow | null): boolean {
  // Backward compatible: if column does not exist yet, treat user as active.
  if (!row || typeof row.is_active === "undefined" || row.is_active === null) {
    return true;
  }
  return row.is_active;
}

async function getUserStatus(userId: string): Promise<UserStatusRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user status:", error);
    return null;
  }

  return data;
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Get current user ID
export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
}

// Get current user email
export async function getCurrentUserEmail(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email || null;
}

export function getConfiguredAdminEmails(): string[] {
  const raw = import.meta.env.VITE_ADMIN_EMAILS as string | undefined;
  if (!raw) return [];

  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single(); 
    console.log(data);
    
    
  if (error || !data) return false;
  return data.is_admin === true;
}

// Check if user is authenticated (checks localStorage first, then Supabase)
export async function checkUserRegistration(): Promise<string | null> {
  // First check localStorage for valid session
  const storedSession = localStorage.getItem("cirrhosis-session");
  if (storedSession) {
    try {
      const session = JSON.parse(storedSession);
      const now = Math.floor(Date.now() / 1000); // Current time in seconds

      // If token hasn't expired, use stored user_id
      if (session.expires_at && session.expires_at > now && session.user_id) {
        if (isOnline()) {
          const status = await getUserStatus(session.user_id);
          if (!resolveUserActive(status)) {
            await signOut();
            return null;
          }
        }
        return session.user_id;
      }
    } catch (e) {
      console.error("Failed to parse stored session:", e);
    }
  }

  // Fallback to Supabase session check
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  if (isOnline()) {
    const status = await getUserStatus(userId);
    if (!resolveUserActive(status)) {
      await signOut();
      return null;
    }
  }

  return userId;
}

// Sign up with email and password
export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<string> {
  if (!isOnline()) {
    throw new Error("İnternet bağlantısı gerekli. Lütfen çevrimiçi olun.");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    if (error.message.includes("already registered")) {
      throw new Error("Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın.");
    }
    throw new Error("Kayıt başarısız: " + error.message);
  }

  if (!data.user || !data.session) {
    throw new Error("Kayıt başarısız: Kullanıcı oluşturulamadı");
  }

  // Update profile with display name
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", data.user.id);

  if (profileError) {
    console.error("Failed to update profile:", profileError);
  }

  // Save session info to localStorage
  const sessionInfo = {
    access_token: data.session.access_token,
    token_type: data.session.token_type,
    expires_in: data.session.expires_in,
    expires_at: data.session.expires_at,
    refresh_token: data.session.refresh_token,
    user_id: data.user.id,
    email: data.user.email,
  };
  localStorage.setItem("cirrhosis-session", JSON.stringify(sessionInfo));
  localStorage.setItem("cirrhosis-last-sync", new Date().toISOString());
  return data.user.id;
}

export interface AdminCreateUserPayload {
  email: string;
  password: string;
  displayName?: string;
  phone?: string;
  age?: number | null;
  gender?: "male" | "female" | "other" | null;
  isActive?: boolean;
  consentAccepted?: boolean;
}

export interface AdminCreateUserResult {
  userId: string;
  email: string;
  requiresEmailConfirmation: boolean;
}

async function adminConfirmUserEmail(userId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_confirm_user_email", {
    target_user_id: userId,
  });

  if (error) {
    throw new Error(
      "Kullanıcı e-posta onayı otomatik yapılamadı. Supabase'de admin_confirm_user_email fonksiyonunu çalıştırın. " +
        error.message
    );
  }
}

export async function adminCreateUser(
  payload: AdminCreateUserPayload
): Promise<AdminCreateUserResult> {
  if (!isOnline()) {
    throw new Error("Kullanıcı eklemek için internet bağlantısı gerekli.");
  }

  const email = payload.email.trim().toLowerCase();
  const password = payload.password.trim();
  const displayName = payload.displayName?.trim();
  const phone = payload.phone?.trim();
  const age = payload.age ?? null;
  const gender = payload.gender ?? null;
  const isActive = payload.isActive ?? true;
  const consentAccepted = payload.consentAccepted ?? false;

  if (!email) {
    throw new Error("E-posta alanı zorunludur.");
  }
  if (password.length < 6) {
    throw new Error("Şifre en az 6 karakter olmalıdır.");
  }

  const { data, error } = await adminCreateClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || null,
        phone: phone || null,
        age,
        gender,
        is_active: isActive,
        consent_accepted: consentAccepted,
      },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      throw new Error("Bu e-posta ile kayıtlı bir kullanıcı zaten var.");
    }
    throw new Error("Kullanıcı oluşturulamadı: " + error.message);
  }

  if (!data.user) {
    throw new Error("Kullanıcı oluşturulamadı.");
  }

  // Admin panelden eklenen kullanıcılar otomatik onaylanır.
  await adminConfirmUserEmail(data.user.id);

  // If signUp returned a session, we can patch all profile fields for the created user.
  if (data.session) {
    const updates: {
      display_name?: string | null;
      phone?: string | null;
      age?: number | null;
      gender?: "male" | "female" | "other" | null;
      is_active?: boolean;
      consent_accepted?: boolean;
      consent_accepted_at?: string | null;
    } = {
      is_active: isActive,
      consent_accepted: consentAccepted,
      consent_accepted_at: consentAccepted ? new Date().toISOString() : null,
    };

    if (displayName) {
      updates.display_name = displayName;
    }
    if (phone) {
      updates.phone = phone;
    }
    updates.age = age;
    updates.gender = gender;
    await upsertProfile(adminCreateClient, data.user.id, updates);
  }

  return {
    userId: data.user.id,
    email: data.user.email || email,
    requiresEmailConfirmation: false,
  };
}

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<string> {
  if (!isOnline()) {
    throw new Error("İnternet bağlantısı gerekli. Lütfen çevrimiçi olun.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      throw new Error("E-posta veya şifre hatalı.");
    }
    throw new Error("Giriş başarısız: " + error.message);
  }

  if (!data.user || !data.session) {
    throw new Error("Giriş başarısız");
  }

  const status = await getUserStatus(data.user.id);
  if (!resolveUserActive(status)) {
    await signOut();
    throw new Error(
      "Hesabınız pasif durumda. Lütfen sistem yöneticisi ile iletişime geçin."
    );
  }

  // Save session info to localStorage
  const sessionInfo = {
    access_token: data.session.access_token,
    token_type: data.session.token_type,
    expires_in: data.session.expires_in,
    expires_at: data.session.expires_at,
    refresh_token: data.session.refresh_token,
    user_id: data.user.id,
    email: data.user.email,
  };
  localStorage.setItem("cirrhosis-session", JSON.stringify(sessionInfo));
  localStorage.setItem("cirrhosis-last-sync", new Date().toISOString());
  return data.user.id;
}

export async function adminUpdateUserDisplayName(
  userId: string,
  displayName: string
): Promise<void> {
  if (!isOnline()) {
    throw new Error("Kullanıcı güncellemek için internet bağlantısı gerekli.");
  }

  await upsertProfile(supabase, userId, {
    display_name: displayName.trim() || null,
  });
}

export interface AdminUserProfileUpdate {
  display_name: string | null;
  phone: string | null;
  age: number | null;
  gender: "male" | "female" | "other" | null;
  consent_accepted: boolean;
  is_active: boolean;
}

export async function adminUpdateUserProfile(
  userId: string,
  payload: AdminUserProfileUpdate
): Promise<void> {
  if (!isOnline()) {
    throw new Error("Kullanıcı güncellemek için internet bağlantısı gerekli.");
  }

  await upsertProfile(supabase, userId, payload);
}

export async function adminSetUserActive(
  userId: string,
  isActive: boolean
): Promise<void> {
  if (!isOnline()) {
    throw new Error("Kullanıcı durumu değiştirmek için internet gerekli.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) {
    if (error.message.includes("is_active")) {
      throw new Error(
        "is_active kolonu bulunamadı. Supabase'de profiles tablosuna BOOLEAN is_active DEFAULT true ekleyin."
      );
    }
    throw new Error("Kullanıcı durumu güncellenemedi: " + error.message);
  }
}

// Change current user's password
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (!isOnline()) {
    throw new Error("Şifre değiştirmek için internet bağlantısı gerekli.");
  }

  if (newPassword.length < 6) {
    throw new Error("Yeni şifre en az 6 karakter olmalıdır.");
  }

  // Verify current password by re-authenticating
  const email = await getCurrentUserEmail();
  if (!email) {
    throw new Error("Kullanıcı oturumu bulunamadı.");
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (signInError) {
    throw new Error("Mevcut şifre hatalı.");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    throw new Error("Şifre değiştirilemedi: " + error.message);
  }
}

// Admin: change another user's password via RPC
export async function adminChangeUserPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  if (!isOnline()) {
    throw new Error("Şifre değiştirmek için internet bağlantısı gerekli.");
  }

  if (newPassword.length < 6) {
    throw new Error("Şifre en az 6 karakter olmalıdır.");
  }

  const { error } = await supabase.rpc("admin_change_user_password", {
    target_user_id: userId,
    new_password: newPassword,
  });

  if (error) {
    throw new Error("Şifre değiştirilemedi: " + error.message);
  }
}

export async function adminChangeUserEmail(
  userId: string,
  newEmail: string
): Promise<void> {
  if (!isOnline()) {
    throw new Error("E-posta değiştirmek için internet bağlantısı gerekli.");
  }

  const trimmed = newEmail.trim().toLowerCase();
  if (!trimmed) {
    throw new Error("E-posta adresi boş olamaz.");
  }

  const { error } = await supabase.rpc("admin_change_user_email", {
    target_user_id: userId,
    new_email: trimmed,
  });

  if (error) {
    throw new Error("E-posta değiştirilemedi: " + error.message);
  }
}

// Sign out
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  localStorage.removeItem("cirrhosis-session");
  localStorage.removeItem("cirrhosis-last-sync");
}

// Get user profile
export async function getProfile(): Promise<UserProfile | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data;
}

// Update user profile
export async function updateProfile(
  profile: Partial<Omit<UserProfile, "id" | "created_at" | "updated_at">>
): Promise<void> {
  if (!isOnline()) {
    throw new Error("İnternet bağlantısı gerekli.");
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Kullanıcı oturumu bulunamadı");
  }

  const { error } = await supabase
    .from("profiles")
    .update(profile)
    .eq("id", userId);

  if (error) {
    throw new Error("Profil güncellenemedi: " + error.message);
  }
}

export async function acceptInformedConsent(fullName: string): Promise<void> {
  if (!isOnline()) {
    throw new Error("Onam kaydı için internet bağlantısı gerekli.");
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Kullanıcı oturumu bulunamadı");
  }

  const updates: {
    consent_accepted: boolean;
    consent_accepted_at: string;
    display_name?: string;
  } = {
    consent_accepted: true,
    consent_accepted_at: new Date().toISOString(),
  };

  if (fullName.trim()) {
    updates.display_name = fullName.trim();
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", userId);

  if (error) {
    if (error.message.includes("Could not find the 'consent_accepted' column")) {
      throw new Error(
        "Onam kaydedilemedi: Veritabani guncel degil. Supabase SQL Editor'da consent_accepted alanlarini ekleyen migration'i calistirin."
      );
    }
    throw new Error("Onam kaydedilemedi: " + error.message);
  }
}

// Check if sync is required (2 times per day = every 12 hours)
export function isSyncRequired(): boolean {
  const lastSync = localStorage.getItem("cirrhosis-last-sync");
  if (!lastSync) return true;

  const lastSyncTime = new Date(lastSync).getTime();
  const now = Date.now();
  const twelveHours = 12 * 60 * 60 * 1000;

  return now - lastSyncTime > twelveHours;
}

// Get time until next required sync
export function getTimeUntilSync(): { hours: number; minutes: number } | null {
  const lastSync = localStorage.getItem("cirrhosis-last-sync");
  if (!lastSync) return null;

  const lastSyncTime = new Date(lastSync).getTime();
  const twelveHours = 12 * 60 * 60 * 1000;
  const nextSyncTime = lastSyncTime + twelveHours;
  const remaining = nextSyncTime - Date.now();

  if (remaining <= 0) return null;

  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

  return { hours, minutes };
}

// Update last sync time
export function updateLastSyncTime(): void {
  localStorage.setItem("cirrhosis-last-sync", new Date().toISOString());
}

// =============================================
// TEST SESSION FUNCTIONS
// =============================================

export interface TestSession {
  id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  status: "in_progress" | "completed" | "cancelled";
  total_score: number;
  notes: string | null;
  created_at: string;
}

// Create a new test session
export async function createTestSession(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Kullanıcı oturumu bulunamadı");
  }

  if (!isOnline()) {
    // Generate local ID for offline mode
    const localId = `local-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    localStorage.setItem("cirrhosis-current-test-id", localId);
    return localId;
  }

  const { data, error } = await supabase
    .from("tests")
    .insert({ user_id: userId })
    .select("id")
    .single();

  if (error) {
    throw new Error("Test oturumu oluşturulamadı: " + error.message);
  }

  // Store current test ID in localStorage
  localStorage.setItem("cirrhosis-current-test-id", data.id);
  return data.id;
}

// Get current test session ID
export function getCurrentTestId(): string | null {
  return localStorage.getItem("cirrhosis-current-test-id");
}

// Complete test session
export async function completeTestSession(): Promise<void> {
  const testId = getCurrentTestId();
  if (!testId) return;

  if (isOnline() && !testId.startsWith("local-")) {
    await supabase
      .from("tests")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", testId);
  }

  localStorage.removeItem("cirrhosis-current-test-id");
}

// Get user's test history
export async function getTestHistory(): Promise<TestSession[]> {
  const userId = await getCurrentUserId();
  if (!userId || !isOnline()) return [];

  const { data, error } = await supabase
    .from("tests")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to fetch test history:", error);
    return [];
  }

  return data || [];
}
