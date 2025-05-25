-- Supabase Database Schema for Hellas Direct Insurance System
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  full_name text NULL,
  registration_number text NULL,
  afm text NULL,
  starting_date timestamp with time zone NULL,
  ending_at timestamp with time zone NULL,
  phone_number text NULL,
  email text NULL,
  address text NULL,
  CONSTRAINT users_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Create custom ENUM type for case_type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'casetype') THEN
        CREATE TYPE public.caseType AS ENUM ('AC', 'RA', 'OTHER');
    END IF;
END$$;

-- Incidents Table
CREATE TABLE IF NOT EXISTS public.incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  registration_number text NULL,
  location text NULL,
  description text NULL,
  case_type public.caseType NULL,
  final_vehicle_destination text NULL,
  possible_vehicle_malfunction text NULL,
  possible_problem_resolution text NULL,
  recommended_garage text NULL,
  is_destination_out_perfecture boolean NULL,
  delay_voucher_issued boolean NULL,
  geolocation_link_sent text NULL,
  responsible_declaration_required text NULL,
  is_fast_case boolean NULL,
  is_fraud_case numeric NULL, -- Consider boolean or a more specific type if appropriate
  communication_quality text NULL,
  case_summary text NULL,
  images text[] NULL,
  CONSTRAINT "User Cases Table_pkey" PRIMARY KEY (id),
  CONSTRAINT incidents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_registration_number ON public.users(registration_number);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON public.incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_case_type ON public.incidents(case_type);
CREATE INDEX IF NOT EXISTS idx_incidents_registration_number ON public.incidents(registration_number);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users table
CREATE OR REPLACE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Apply trigger to incidents table
CREATE OR REPLACE TRIGGER update_incidents_updated_at
    BEFORE UPDATE ON public.incidents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Allow service_role to manage users" ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for incidents table
CREATE POLICY "Allow service_role to manage incidents" ON public.incidents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their own incidents" ON public.incidents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create incidents for themselves" ON public.incidents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own incidents" ON public.incidents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert sample data for testing

-- Sample Users
-- Ensure these are idempotent or handle conflicts appropriately if run multiple times
INSERT INTO public.users (id, full_name, registration_number, phone_number, email) VALUES
(gen_random_uuid(), 'Γιάννης Παπαδόπουλος', 'ABC1234', '+30123456789', 'yannis@example.com'),
(gen_random_uuid(), 'Μαρία Κωνσταντίνου', 'XYZ5678', '+30987654321', 'maria@example.com')
ON CONFLICT (email) DO NOTHING; -- Example: use email as a conflict target for sample data if appropriate

-- Sample Incidents
-- Note: This requires user_id from the public.users table.
-- For robust seeding, you might select user_ids first.
DO $$
DECLARE
    yannis_user_id uuid;
    maria_user_id uuid;
BEGIN
    SELECT id INTO yannis_user_id FROM public.users WHERE email = 'yannis@example.com' LIMIT 1;
    SELECT id INTO maria_user_id FROM public.users WHERE email = 'maria@example.com' LIMIT 1;

    IF yannis_user_id IS NOT NULL THEN
        INSERT INTO public.incidents (user_id, registration_number, location, description, case_type, final_vehicle_destination, possible_vehicle_malfunction)
        VALUES (yannis_user_id, 'ABC1234', 'Athens Ring Road', 'Collision with stationary object', 'AC', 'My Home Garage, Athens', 'Front bumper damage')
        ON CONFLICT DO NOTHING;
    END IF;

    IF maria_user_id IS NOT NULL THEN
        INSERT INTO public.incidents (user_id, registration_number, location, description, case_type, final_vehicle_destination, possible_vehicle_malfunction)
        VALUES (maria_user_id, 'XYZ5678', 'Egnatia Odos, near Thessaloniki', 'Engine overheating, smoke from hood', 'RA', 'Authorised BMW Garage, Thessaloniki', 'Coolant leak or Fan malfunction')
        ON CONFLICT DO NOTHING;
    END IF;
END$$;

COMMENT ON COLUMN public.incidents.is_fraud_case IS 'Consider boolean or a more specific type if appropriate. Numeric might be used for a score.';
