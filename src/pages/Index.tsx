import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGoogleSheet } from "@/hooks/useGoogleSheet";
import { useSyncSheet } from "@/hooks/useSyncSheet";
import { DataTable } from "@/components/DataTable";
import { SyncHistory } from "@/components/SyncHistory";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Loader2, RefreshCw } from "lucide-react";

// Extract sheet ID from the URL
const SHEET_ID = "1T-yJr4oWKO9Bz78NfH2FyAU83OEFsBYgU2x7m_53DHg";

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { headers, rows, loading: sheetLoading, error, refetch } = useGoogleSheet(SHEET_ID);
  const { syncSheet, syncing, lastSync } = useSyncSheet();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleSync = async () => {
    const result = await syncSheet();
    if (result.success) {
      refetch();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">資料編輯系統</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              登出
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>你的資料</CardTitle>
                <CardDescription>
                  以下顯示與你電郵對應的資料行。你可以編輯並儲存修改。
                  {lastSync && <span className="ml-2 text-xs">（上次同步：{lastSync}）</span>}
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                同步資料
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {sheetLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2">載入資料中...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                <p>讀取資料時發生錯誤：{error}</p>
                <Button variant="outline" onClick={refetch} className="mt-4">
                  重試
                </Button>
              </div>
            ) : (
              <DataTable
                headers={headers}
                rows={rows}
                userEmail={user.email || ""}
                userId={user.id}
                onRefresh={refetch}
              />
            )}
          </CardContent>
        </Card>

        <SyncHistory />
      </main>
    </div>
  );
};

export default Index;
