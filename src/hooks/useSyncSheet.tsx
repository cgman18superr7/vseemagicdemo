import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useSyncSheet = () => {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const syncSheet = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-sheet', {
        body: { sync_type: 'manual' },
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setLastSync(new Date().toLocaleString('zh-TW'));
        toast({
          title: '同步成功',
          description: data.message || `已同步 ${data.rows_synced} 筆資料`,
        });
        return { success: true, data };
      } else {
        throw new Error(data?.error || '同步失敗');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: '同步失敗',
        description: error.message || '無法同步 Google Sheet',
        variant: 'destructive',
      });
      return { success: false, error };
    } finally {
      setSyncing(false);
    }
  };

  return { syncSheet, syncing, lastSync };
};
