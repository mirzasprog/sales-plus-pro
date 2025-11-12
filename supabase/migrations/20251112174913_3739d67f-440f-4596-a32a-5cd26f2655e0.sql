-- Create table for storing floor plan layouts
CREATE TABLE public.floorplan_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  layout_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  store_width NUMERIC NOT NULL DEFAULT 800,
  store_height NUMERIC NOT NULL DEFAULT 600
);

-- Enable RLS
ALTER TABLE public.floorplan_layouts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view layouts"
ON public.floorplan_layouts
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert layouts"
ON public.floorplan_layouts
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update layouts"
ON public.floorplan_layouts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete layouts"
ON public.floorplan_layouts
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_floorplan_layouts_updated_at
BEFORE UPDATE ON public.floorplan_layouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();