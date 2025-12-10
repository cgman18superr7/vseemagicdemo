-- Create table to store synced Google Sheet data
CREATE TABLE public.sheet_sync (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  row_index INTEGER NOT NULL,
  row_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(row_index)
);

-- Create table to track sync history
CREATE TABLE public.sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'manual' or 'scheduled'
  rows_synced INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sheet_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read synced data
CREATE POLICY "Authenticated users can view synced data"
ON public.sheet_sync
FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to view sync logs
CREATE POLICY "Authenticated users can view sync logs"
ON public.sync_logs
FOR SELECT
TO authenticated
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_sheet_sync_updated_at
BEFORE UPDATE ON public.sheet_sync
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for sheet_sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.sheet_sync;