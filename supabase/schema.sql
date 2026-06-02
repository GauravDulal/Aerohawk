-- ═══════════════════════════════════════════
-- AeroHawk Cleaning — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════

-- ──────────────────────────────────
-- 1. AVAILABILITY SLOTS
-- ──────────────────────────────────
CREATE TABLE availability_slots (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date        DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),

  UNIQUE(date, start_time, end_time)
);

ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read availability" ON availability_slots
  FOR SELECT USING (true);

CREATE POLICY "Admin can insert availability" ON availability_slots
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admin can update availability" ON availability_slots
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admin can delete availability" ON availability_slots
  FOR DELETE TO authenticated USING (true);

-- ──────────────────────────────────
-- 2. BLOCKED DATES
-- ──────────────────────────────────
CREATE TABLE blocked_dates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date        DATE NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read blocked dates" ON blocked_dates
  FOR SELECT USING (true);

CREATE POLICY "Admin can insert blocked dates" ON blocked_dates
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admin can update blocked dates" ON blocked_dates
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admin can delete blocked dates" ON blocked_dates
  FOR DELETE TO authenticated USING (true);

-- ──────────────────────────────────
-- 3. APPOINTMENTS
-- ──────────────────────────────────
CREATE TYPE appointment_status AS ENUM (
  'pending', 'confirmed', 'completed', 'cancelled'
);

CREATE TABLE appointments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_code    TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT NOT NULL,
  service     TEXT NOT NULL,
  address     TEXT NOT NULL,
  notes       TEXT DEFAULT '',
  date        DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  status      appointment_status DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Anyone can create an appointment (public booking)
CREATE POLICY "Public can create appointments" ON appointments
  FOR INSERT WITH CHECK (true);

-- Only authenticated users can read all appointments
CREATE POLICY "Admin can read appointments" ON appointments
  FOR SELECT TO authenticated USING (true);

-- Only authenticated users can update
CREATE POLICY "Admin can update appointments" ON appointments
  FOR UPDATE TO authenticated USING (true);

-- Only authenticated users can delete
CREATE POLICY "Admin can delete appointments" ON appointments
  FOR DELETE TO authenticated USING (true);

-- ──────────────────────────────────
-- 4. RACE CONDITION PREVENTION
-- Atomic check-and-book function
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
BEGIN
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

  -- Generate reference code
  v_ref := 'AH-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));

  -- Insert the appointment
  INSERT INTO appointments (ref_code, name, phone, email, service, address, notes, date, start_time, end_time)
  VALUES (v_ref, p_name, p_phone, p_email, p_service, p_address, p_notes, p_date, p_start_time, p_end_time);

  RETURN QUERY SELECT true, v_ref, ''::TEXT;
END;
$$;
