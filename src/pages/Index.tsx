import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGoogleSheet } from "@/hooks/useGoogleSheet";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Loader2 } from "lucide-react";

// Extract sheet ID from the URL
const SHEET_ID = "1T-vyJr4oWKO9Bz78NfH2FyAU83OEFsBYgU2x7m_53DHg";

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { headers, rows, loading: sheetLoading, error, refetch } = useGoogleSheet(SHEET_ID);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

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

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>你的資料</CardTitle>
            <CardDescription>
              以下顯示與你電郵對應的資料行。你可以編輯並儲存修改。
            </CardDescription>
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
      </main>
    </div>
  );
};

export default Index;
