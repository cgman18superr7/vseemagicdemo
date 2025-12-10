-- Create table to store user edits from Google Sheet
CREATE TABLE public.sheet_edits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  row_data JSONB NOT NULL DEFAULT '{}',
  original_row_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, original_row_index)
);

-- Enable Row Level Security
ALTER TABLE public.sheet_edits ENABLE ROW LEVEL SECURITY;

-- Users can only view their own edits
CREATE POLICY "Users can view their own edits"
ON public.sheet_edits
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own edits
CREATE POLICY "Users can insert their own edits"
ON public.sheet_edits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own edits
CREATE POLICY "Users can update their own edits"
ON public.sheet_edits
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own edits
CREATE POLICY "Users can delete their own edits"
ON public.sheet_edits
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sheet_edits_updated_at
BEFORE UPDATE ON public.sheet_edits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();