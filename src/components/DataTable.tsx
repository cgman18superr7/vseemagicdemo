import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Save, RefreshCw } from "lucide-react";

interface DataTableProps {
  headers: string[];
  rows: { rowIndex: number; data: string[] }[];
  userEmail: string;
  userId: string;
  onRefresh: () => void;
}

export const DataTable = ({ headers, rows, userEmail, userId, onRefresh }: DataTableProps) => {
  const [editedRows, setEditedRows] = useState<Record<number, string[]>>({});
  const [savedEdits, setSavedEdits] = useState<Record<number, string[]>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Filter rows where column A (index 0) matches user email
  const userRows = rows.filter(
    (row) => row.data[0]?.toLowerCase().trim() === userEmail.toLowerCase().trim()
  );

  // Load saved edits from database
  useEffect(() => {
    const loadSavedEdits = async () => {
      const { data, error } = await supabase
        .from("sheet_edits")
        .select("*")
        .eq("user_id", userId);

      if (!error && data) {
        const edits: Record<number, string[]> = {};
        data.forEach((edit: any) => {
          if (edit.original_row_index !== null && edit.row_data) {
            edits[edit.original_row_index] = edit.row_data as string[];
          }
        });
        setSavedEdits(edits);
      }
    };

    loadSavedEdits();
  }, [userId]);

  const handleCellChange = (rowIndex: number, cellIndex: number, value: string) => {
    setEditedRows((prev) => {
      const currentRow = prev[rowIndex] || savedEdits[rowIndex] || rows.find(r => r.rowIndex === rowIndex)?.data || [];
      const newRow = [...currentRow];
      newRow[cellIndex] = value;
      return { ...prev, [rowIndex]: newRow };
    });
  };

  const handleSave = async (rowIndex: number) => {
    setSaving(true);
    const rowData = editedRows[rowIndex] || savedEdits[rowIndex] || rows.find(r => r.rowIndex === rowIndex)?.data;

    if (!rowData) {
      toast({ title: "錯誤", description: "找不到資料", variant: "destructive" });
      setSaving(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("sheet_edits")
        .upsert({
          user_id: userId,
          user_email: userEmail,
          original_row_index: rowIndex,
          row_data: rowData,
        }, {
          onConflict: "user_id,original_row_index",
        });

      if (error) throw error;

      setSavedEdits((prev) => ({ ...prev, [rowIndex]: rowData }));
      setEditedRows((prev) => {
        const newEdits = { ...prev };
        delete newEdits[rowIndex];
        return newEdits;
      });

      toast({ title: "已儲存！", description: "你的修改已儲存到資料庫。" });
    } catch (err: any) {
      toast({ title: "儲存失敗", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getCellValue = (row: { rowIndex: number; data: string[] }, cellIndex: number) => {
    if (editedRows[row.rowIndex]?.[cellIndex] !== undefined) {
      return editedRows[row.rowIndex][cellIndex];
    }
    if (savedEdits[row.rowIndex]?.[cellIndex] !== undefined) {
      return savedEdits[row.rowIndex][cellIndex];
    }
    return row.data[cellIndex] || "";
  };

  const hasChanges = (rowIndex: number) => {
    return editedRows[rowIndex] !== undefined;
  };

  if (userRows.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">找不到與你電郵 ({userEmail}) 對應的資料。</p>
        <Button variant="outline" onClick={onRefresh} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          重新載入
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          顯示 {userRows.length} 行你的資料
        </p>
        <Button variant="outline" onClick={onRefresh} size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          重新載入
        </Button>
      </div>
      
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header, index) => (
                <TableHead key={index} className="min-w-[150px]">
                  {header}
                </TableHead>
              ))}
              <TableHead className="w-[100px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userRows.map((row) => (
              <TableRow key={row.rowIndex}>
                {headers.map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    {cellIndex === 0 ? (
                      <span className="text-muted-foreground">{getCellValue(row, cellIndex)}</span>
                    ) : (
                      <Input
                        value={getCellValue(row, cellIndex)}
                        onChange={(e) => handleCellChange(row.rowIndex, cellIndex, e.target.value)}
                        className="min-w-[120px]"
                      />
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  <Button
                    size="sm"
                    onClick={() => handleSave(row.rowIndex)}
                    disabled={saving || !hasChanges(row.rowIndex)}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    儲存
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <p className="text-xs text-muted-foreground">
        * 電郵欄位無法修改。修改其他欄位後按「儲存」將資料存入資料庫。
      </p>
    </div>
  );
};
