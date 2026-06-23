-- Cirrhosis PWA Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- =============================================
-- PROFILES TABLE (extends auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', NULL)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  consent_accepted BOOLEAN NOT NULL DEFAULT false,
  consent_accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backward-compatible profile consent columns (safe to re-run)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS consent_accepted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS consent_accepted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- =============================================
-- TESTS TABLE (test sessions linked to user)
-- =============================================
CREATE TABLE IF NOT EXISTS tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  total_score INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TEST_RESULTS TABLE (individual test results linked to test session)
-- =============================================
CREATE TABLE IF NOT EXISTS test_results (
  id TEXT PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL CHECK (test_type IN ('dot-catch', 'color-match', 'word-memory', 'he-questionnaire')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  total_rounds INTEGER NOT NULL DEFAULT 0,
  average_reaction_time INTEGER,
  score INTEGER NOT NULL DEFAULT 0,
  details JSONB DEFAULT '{}'::jsonb,
  synced BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_tests_user_id ON tests(user_id);
CREATE INDEX IF NOT EXISTS idx_tests_status ON tests(status);
CREATE INDEX IF NOT EXISTS idx_tests_started_at ON tests(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_test_results_test_id ON test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_type ON test_results(test_type);
CREATE INDEX IF NOT EXISTS idx_test_results_timestamp ON test_results(timestamp DESC);

-- Backward-compatible test_type constraint update (safe to re-run)
ALTER TABLE test_results
  DROP CONSTRAINT IF EXISTS test_results_test_type_check;

ALTER TABLE test_results
  ADD CONSTRAINT test_results_test_type_check
  CHECK (test_type IN ('dot-catch', 'color-match', 'word-memory', 'he-questionnaire'));

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Tests policies
CREATE POLICY "Users can view own tests" ON tests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tests" ON tests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tests" ON tests
  FOR UPDATE USING (auth.uid() = user_id);

-- Test results policies
CREATE POLICY "Users can view own results" ON test_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own results" ON test_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own results" ON test_results
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    display_name,
    phone,
    age,
    gender,
    is_active,
    consent_accepted,
    consent_accepted_at
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'phone',
    CASE
      WHEN NEW.raw_user_meta_data->>'age' IS NULL THEN NULL
      ELSE (NEW.raw_user_meta_data->>'age')::INTEGER
    END,
    CASE
      WHEN NEW.raw_user_meta_data->>'gender' IN ('male', 'female', 'other')
        THEN NEW.raw_user_meta_data->>'gender'
      ELSE NULL
    END,
    COALESCE((NEW.raw_user_meta_data->>'is_active')::BOOLEAN, true),
    COALESCE((NEW.raw_user_meta_data->>'consent_accepted')::BOOLEAN, false),
    CASE
      WHEN COALESCE((NEW.raw_user_meta_data->>'consent_accepted')::BOOLEAN, false)
        THEN NOW()
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    phone = EXCLUDED.phone,
    age = EXCLUDED.age,
    gender = EXCLUDED.gender,
    is_active = EXCLUDED.is_active,
    consent_accepted = EXCLUDED.consent_accepted,
    consent_accepted_at = EXCLUDED.consent_accepted_at,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Admin-created users: force email confirmation in auth schema.
-- NOTE: Restrict execution by granting only trusted roles/users.
CREATE OR REPLACE FUNCTION public.admin_confirm_user_email(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users
  SET
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW()
  WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_confirm_user_email(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_confirm_user_email(UUID) TO authenticated;

-- Admin: change any user's password (SECURITY DEFINER - runs with owner privileges)
-- Only admins (profiles.is_admin = true) can call this.
CREATE OR REPLACE FUNCTION public.admin_change_user_password(
  target_user_id UUID,
  new_password TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_is_admin BOOLEAN;
BEGIN
  -- Verify caller is admin
  SELECT is_admin INTO caller_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Bu işlem için admin yetkisi gerekli.';
  END IF;

  -- Validate password length
  IF length(new_password) < 6 THEN
    RAISE EXCEPTION 'Şifre en az 6 karakter olmalıdır.';
  END IF;

  -- Update password in auth.users using Supabase's internal function
  UPDATE auth.users
  SET
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = NOW()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kullanıcı bulunamadı.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_change_user_password(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_change_user_password(UUID, TEXT) TO authenticated;

-- Admin: change user email
CREATE OR REPLACE FUNCTION public.admin_change_user_email(
  target_user_id UUID,
  new_email TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_is_admin BOOLEAN;
  normalized_email TEXT;
BEGIN
  -- Verify caller is admin
  SELECT is_admin INTO caller_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Bu işlem için admin yetkisi gerekli.';
  END IF;

  normalized_email := lower(trim(new_email));

  IF normalized_email = '' OR normalized_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RAISE EXCEPTION 'Geçerli bir e-posta adresi giriniz.';
  END IF;

  -- Check if email is already in use
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = normalized_email AND id != target_user_id) THEN
    RAISE EXCEPTION 'Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor.';
  END IF;

  -- Update email in auth.users
  UPDATE auth.users
  SET
    email = normalized_email,
    updated_at = NOW()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kullanıcı bulunamadı.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_change_user_email(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_change_user_email(UUID, TEXT) TO authenticated;

-- Update profile updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_update ON profiles;
CREATE TRIGGER on_profile_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Update test total_score when results are added
CREATE OR REPLACE FUNCTION update_test_total_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tests
  SET total_score = (
    SELECT COALESCE(SUM(score), 0)
    FROM test_results
    WHERE test_id = NEW.test_id
  )
  WHERE id = NEW.test_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_test_result_insert ON test_results;
CREATE TRIGGER on_test_result_insert
  AFTER INSERT ON test_results
  FOR EACH ROW
  EXECUTE FUNCTION update_test_total_score();
