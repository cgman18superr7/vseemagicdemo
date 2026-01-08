import { useState, useEffect, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface SyncLog {
  id: string;
  sync_type: string;
  rows_synced: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

export const SyncHistory = forwardRef<HTMLDivElement>((_, ref) => {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("sync_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">同步歷史紀錄</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">載入中...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card ref={ref}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" />
          同步歷史紀錄
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚無同步紀錄</p>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-start gap-3">
                    {log.status === "success" ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={log.sync_type === "scheduled" ? "secondary" : "outline"}>
                          {log.sync_type === "scheduled" ? "自動" : "手動"}
                        </Badge>
                        <span className="text-sm font-medium">
                          {log.status === "success"
                            ? `同步 ${log.rows_synced} 筆資料`
                            : "同步失敗"}
                        </span>
                      </div>
                      {log.error_message && (
                        <p className="text-xs text-destructive mt-1">{log.error_message}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(log.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
});

SyncHistory.displayName = "SyncHistory";
