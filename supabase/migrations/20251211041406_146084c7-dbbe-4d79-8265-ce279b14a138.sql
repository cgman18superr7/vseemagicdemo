-- Remove user_email column from sheet_edits to avoid exposing personal data
-- We can derive email from user_id when needed through auth
ALTER TABLE public.sheet_edits DROP COLUMN IF EXISTS user_email;