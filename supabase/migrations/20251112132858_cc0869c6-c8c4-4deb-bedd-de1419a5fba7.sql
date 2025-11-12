-- Create position_history table for tracking changes
CREATE TABLE public.position_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_position_history_position_id ON public.position_history(position_id);
CREATE INDEX idx_position_history_created_at ON public.position_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.position_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view history
CREATE POLICY "Authenticated users can view history"
ON public.position_history
FOR SELECT
USING (true);

-- Allow authenticated users to insert history
CREATE POLICY "Authenticated users can insert history"
ON public.position_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create floorplan_images table
CREATE TABLE public.floorplan_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.floorplan_images ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view floorplan images
CREATE POLICY "Authenticated users can view floorplan images"
ON public.floorplan_images
FOR SELECT
USING (true);

-- Allow admins to insert floorplan images
CREATE POLICY "Admins can insert floorplan images"
ON public.floorplan_images
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete floorplan images
CREATE POLICY "Admins can delete floorplan images"
ON public.floorplan_images
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for floorplan images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('floorplans', 'floorplans', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for floorplan uploads
CREATE POLICY "Public can view floorplan images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'floorplans');

CREATE POLICY "Admins can upload floorplan images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'floorplans' AND 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete floorplan images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'floorplans' AND 
  has_role(auth.uid(), 'admin'::app_role)
);