-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create stores table
CREATE TABLE public.stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Create positions table
CREATE TABLE public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  position_number TEXT NOT NULL,
  format TEXT NOT NULL,
  display_type TEXT NOT NULL,
  purpose TEXT,
  department TEXT,
  category TEXT,
  nearest_person TEXT,
  responsible_person TEXT,
  tenant TEXT,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'occupied')),
  x NUMERIC NOT NULL DEFAULT 0,
  y NUMERIC NOT NULL DEFAULT 0,
  width NUMERIC NOT NULL DEFAULT 100,
  height NUMERIC NOT NULL DEFAULT 80,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, position_number)
);

-- Enable RLS on positions
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- User roles RLS Policies
CREATE POLICY "Admins can view all user roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Stores RLS Policies
CREATE POLICY "Authenticated users can view stores"
  ON public.stores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert stores"
  ON public.stores FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update stores"
  ON public.stores FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete stores"
  ON public.stores FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Positions RLS Policies
CREATE POLICY "Authenticated users can view positions"
  ON public.positions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update tenant and expiry"
  ON public.positions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    -- Regular users can only update tenant and expiry_date
    CASE 
      WHEN public.has_role(auth.uid(), 'admin') THEN true
      ELSE (
        -- Check that only tenant and expiry_date are being modified
        tenant IS DISTINCT FROM (SELECT tenant FROM public.positions WHERE id = positions.id) OR
        expiry_date IS DISTINCT FROM (SELECT expiry_date FROM public.positions WHERE id = positions.id)
      )
    END
  );

CREATE POLICY "Admins can insert positions"
  ON public.positions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete positions"
  ON public.positions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    new.email
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample stores
INSERT INTO public.stores (id, name, address) VALUES
  ('1000001', 'Prodavnica 001', 'Adresa 1'),
  ('1000002', 'Prodavnica 002', 'Adresa 2'),
  ('1000003', 'Prodavnica 003', 'Adresa 3'),
  ('1000004', 'Prodavnica 004', 'Adresa 4'),
  ('1000005', 'Prodavnica 005', 'Adresa 5');

-- Insert sample positions for store 1000001
INSERT INTO public.positions (store_id, position_number, format, display_type, purpose, department, category, nearest_person, responsible_person, tenant, expiry_date, status, x, y, width, height) VALUES
  ('1000001', '001', 'Mali', 'PAL', 'N', 'A', 'Prehrambeni', 'Marko Marković', 'Ana Anić', 'Violeta doo', '2025-12-31', 'occupied', 50, 50, 100, 80),
  ('1000001', '002', 'Veliki', 'BOČ', 'P', 'B', 'Neprehrambeni', 'Ivan Ivić', '', '', NULL, 'free', 200, 50, 120, 80),
  ('1000001', '003', 'Srednji', 'KOR', 'N', 'A', 'Prehrambeni', 'Petra Petrić', 'Marko Marković', 'Delta doo', '2025-06-15', 'occupied', 50, 180, 80, 60),
  ('1000001', '004', 'Mali', 'PLUG', 'P', 'C', 'Kozmetika', 'Ana Anić', '', '', NULL, 'free', 200, 180, 90, 70),
  ('1000001', '005', 'Veliki', 'PAL', 'N', 'A', 'Prehrambeni', 'Marko Marković', 'Petra Petrić', 'Beta doo', '2025-08-20', 'occupied', 350, 50, 110, 90);