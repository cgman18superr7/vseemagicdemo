-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view synced data" ON public.sheet_sync;

-- Create a new restrictive policy that allows users to only view rows where their email matches
-- This checks both 'email' and '電郵' fields in the row_data JSONB column
CREATE POLICY "Users can only view their own synced data" 
ON public.sheet_sync 
FOR SELECT 
TO authenticated
USING (
  LOWER(TRIM(row_data->>'email')) = LOWER(auth.email()) 
  OR LOWER(TRIM(row_data->>'電郵')) = LOWER(auth.email())
);