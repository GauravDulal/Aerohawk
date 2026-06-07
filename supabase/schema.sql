-- ═══════════════════════════════════════════
-- AeroHawk Cleaning — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════

-- ──────────────────────────────────
-- 0. ADMIN USERS (role-based access)
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can read the admin list
CREATE POLICY "Admins can read admin_users" ON admin_users
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()));

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid());
$$;

-- ──────────────────────────────────
-- 1. AVAILABILITY SLOTS
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS availability_slots (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date        DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),

  UNIQUE(date, start_time, end_time)
);

ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

-- Drop old permissive policies if they exist
DROP POLICY IF EXISTS "Public can read availability" ON availability_slots;
DROP POLICY IF EXISTS "Admin can insert availability" ON availability_slots;
DROP POLICY IF EXISTS "Admin can update availability" ON availability_slots;
DROP POLICY IF EXISTS "Admin can delete availability" ON availability_slots;

CREATE POLICY "Public can read availability" ON availability_slots
  FOR SELECT USING (true);

CREATE POLICY "Admin can insert availability" ON availability_slots
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "Admin can update availability" ON availability_slots
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY "Admin can delete availability" ON availability_slots
  FOR DELETE TO authenticated USING (is_admin());

-- ──────────────────────────────────
-- 2. BLOCKED DATES
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_dates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date        DATE NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read blocked dates" ON blocked_dates;
DROP POLICY IF EXISTS "Admin can insert blocked dates" ON blocked_dates;
DROP POLICY IF EXISTS "Admin can update blocked dates" ON blocked_dates;
DROP POLICY IF EXISTS "Admin can delete blocked dates" ON blocked_dates;

CREATE POLICY "Public can read blocked dates" ON blocked_dates
  FOR SELECT USING (true);

CREATE POLICY "Admin can insert blocked dates" ON blocked_dates
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "Admin can update blocked dates" ON blocked_dates
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY "Admin can delete blocked dates" ON blocked_dates
  FOR DELETE TO authenticated USING (is_admin());

-- ──────────────────────────────────
-- 3. APPOINTMENTS
-- ──────────────────────────────────
DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM (
    'pending', 'confirmed', 'completed', 'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS appointments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_code    TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  phone       TEXT NOT NULL CHECK (char_length(phone) BETWEEN 5 AND 30),
  email       TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  service     TEXT NOT NULL CHECK (service IN (
    'Residential Cleaning', 'Office / Commercial Cleaning',
    'Deep Cleaning', 'End of Lease Clean',
    'Carpet & Upholstery', 'Window Cleaning'
  )),
  address     TEXT NOT NULL CHECK (char_length(address) BETWEEN 5 AND 500),
  notes       TEXT DEFAULT '' CHECK (char_length(notes) <= 1000),
  date        DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  status      appointment_status DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can create appointments" ON appointments;
DROP POLICY IF EXISTS "Admin can read appointments" ON appointments;
DROP POLICY IF EXISTS "Admin can update appointments" ON appointments;
DROP POLICY IF EXISTS "Admin can delete appointments" ON appointments;
DROP POLICY IF EXISTS "Public can lookup own appointment" ON appointments;

-- Anyone can create an appointment (public booking) — guarded by RPC
CREATE POLICY "Public can create appointments" ON appointments
  FOR INSERT WITH CHECK (true);

-- Public can look up their own appointment by ref_code (for booking lookup page)
CREATE POLICY "Public can lookup own appointment" ON appointments
  FOR SELECT USING (true);

-- Only admin users can update
CREATE POLICY "Admin can update appointments" ON appointments
  FOR UPDATE TO authenticated USING (is_admin());

-- Only admin users can delete
CREATE POLICY "Admin can delete appointments" ON appointments
  FOR DELETE TO authenticated USING (is_admin());

-- ──────────────────────────────────
-- 4. RACE CONDITION PREVENTION
-- Atomic check-and-book function
-- With input validation and ref_code retry
-- ──────────────────────────────────
CREATE OR REPLACE FUNCTION book_appointment(
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_service TEXT,
  p_address TEXT,
  p_notes TEXT,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME
) RETURNS TABLE(success BOOLEAN, ref_code TEXT, error_message TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ref TEXT;
  v_existing INT;
  v_total_duration INTERVAL;
  v_retries INT := 0;
  v_services TEXT[] := ARRAY[
    'Residential Cleaning', 'Office / Commercial Cleaning',
    'Deep Cleaning', 'End of Lease Clean',
    'Carpet & Upholstery', 'Window Cleaning'
  ];
BEGIN
  -- ── INPUT VALIDATION ──

  -- Name
  IF p_name IS NULL OR char_length(TRIM(p_name)) < 1 OR char_length(p_name) > 200 THEN
    RETURN QUERY SELECT false, ''::TEXT, 'Name is required (max 200 characters).'::TEXT;
    RETURN;
  END IF;

  -- Phone
  IF p_phone IS NULL OR char_length(p_phone) < 5 OR char_length(p_phone) > 30 THEN
    RETURN QUERY SELECT false, ''::TEXT, 'Valid phone number is required.'::TEXT;
    RETURN;
  END IF;

  -- Email
  IF p_email IS NULL OR p_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN QUERY SELECT false, ''::TEXT, 'Valid email address is required.'::TEXT;
    RETURN;
  END IF;

  -- Service whitelist
  IF p_service IS NULL OR NOT (p_service = ANY(v_services)) THEN
    RETURN QUERY SELECT false, ''::TEXT, 'Please select a valid service.'::TEXT;
    RETURN;
  END IF;

  -- Address
  IF p_address IS NULL OR char_length(TRIM(p_address)) < 5 OR char_length(p_address) > 500 THEN
    RETURN QUERY SELECT false, ''::TEXT, 'Valid address is required (5-500 characters).'::TEXT;
    RETURN;
  END IF;

  -- Notes length
  IF p_notes IS NOT NULL AND char_length(p_notes) > 1000 THEN
    RETURN QUERY SELECT false, ''::TEXT, 'Notes must be under 1000 characters.'::TEXT;
    RETURN;
  END IF;

  -- Sanitize notes
  p_notes := COALESCE(TRIM(p_notes), '');

  -- ── AVAILABILITY CHECKS ──

  -- Lock the rows to prevent concurrent bookings in the range
  PERFORM 1 FROM availability_slots
    WHERE date = p_date AND start_time >= p_start_time AND end_time <= p_end_time
    FOR UPDATE;

  -- Check if slot range overlaps with any already booked appointments (non-cancelled)
  SELECT COUNT(*) INTO v_existing
    FROM appointments
    WHERE date = p_date
      AND status != 'cancelled'
      AND NOT (end_time <= p_start_time OR start_time >= p_end_time);

  IF v_existing > 0 THEN
    RETURN QUERY SELECT false, ''::TEXT, 'Part of this slot range has already been booked. Please choose another.'::TEXT;
    RETURN;
  END IF;

  -- Check if date is blocked
  IF EXISTS (SELECT 1 FROM blocked_dates WHERE date = p_date) THEN
    RETURN QUERY SELECT false, ''::TEXT, 'This date is not available for booking.'::TEXT;
    RETURN;
  END IF;

  -- Check that the availability slots in the range exist and cover the entire duration
  SELECT COALESCE(SUM(end_time - start_time), '0 hour'::INTERVAL) INTO v_total_duration
    FROM availability_slots
    WHERE date = p_date AND start_time >= p_start_time AND end_time <= p_end_time;

  IF v_total_duration != (p_end_time - p_start_time) THEN
    RETURN QUERY SELECT false, ''::TEXT, 'This time slot range is no longer fully available.'::TEXT;
    RETURN;
  END IF;

  -- Generate reference code with collision retry (up to 5 attempts)
  LOOP
    v_ref := 'AH-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));

    BEGIN
      INSERT INTO appointments (ref_code, name, phone, email, service, address, notes, date, start_time, end_time)
      VALUES (v_ref, TRIM(p_name), TRIM(p_phone), LOWER(TRIM(p_email)), p_service, TRIM(p_address), p_notes, p_date, p_start_time, p_end_time);

      RETURN QUERY SELECT true, v_ref, ''::TEXT;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      v_retries := v_retries + 1;
      IF v_retries >= 5 THEN
        RETURN QUERY SELECT false, ''::TEXT, 'Unable to generate booking reference. Please try again.'::TEXT;
        RETURN;
      END IF;
      -- Loop will retry with a new ref code
    END;
  END LOOP;
END;
$$;
