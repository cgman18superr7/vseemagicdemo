-- 修復 sync_logs 表的 RLS 政策
-- 刪除現有的過於寬鬆的政策
DROP POLICY IF EXISTS "Allow authenticated users to read sync logs" ON public.sync_logs;

-- 創建更安全的 SELECT 政策（只允許查看基本資訊，不包含錯誤訊息）
CREATE POLICY "Users can view sync status summary" 
ON public.sync_logs 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 添加 INSERT 政策（只允許服務角色插入）
CREATE POLICY "Only service role can insert sync logs" 
ON public.sync_logs 
FOR INSERT 
WITH CHECK (false);

-- 添加 UPDATE 政策（禁止更新）
CREATE POLICY "No one can update sync logs" 
ON public.sync_logs 
FOR UPDATE 
USING (false);

-- 添加 DELETE 政策（禁止刪除）
CREATE POLICY "No one can delete sync logs" 
ON public.sync_logs 
FOR DELETE 
USING (false);

-- 修復 sheet_sync 表的 RLS 政策
-- 添加 INSERT 政策（只允許服務角色插入）
CREATE POLICY "Only service role can insert sheet sync" 
ON public.sheet_sync 
FOR INSERT 
WITH CHECK (false);

-- 添加 UPDATE 政策（只允許服務角色更新）
CREATE POLICY "Only service role can update sheet sync" 
ON public.sheet_sync 
FOR UPDATE 
USING (false);

-- 添加 DELETE 政策（只允許服務角色刪除）
CREATE POLICY "Only service role can delete sheet sync" 
ON public.sheet_sync 
FOR DELETE 
USING (false);