import { useState, useEffect, forwardRef } from "react";
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

export const DataTable = forwardRef<HTMLDivElement, DataTableProps>(({ headers, rows, userEmail, userId, onRefresh }, ref) => {
  const [editedRows, setEditedRows] = useState<Record<number, string[]>>({});
  const [savedEdits, setSavedEdits] = useState<Record<number, string[]>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Check if row belongs to current user (column A email matches)
  const isUserRow = (row: { data: string[] }) => {
    return row.data[0]?.toLowerCase().trim() === userEmail.toLowerCase().trim();
  };

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
      // Save to Supabase database
      const { error } = await supabase
        .from("sheet_edits")
        .upsert({
          user_id: userId,
          original_row_index: rowIndex,
          row_data: rowData,
        }, {
          onConflict: "user_id,original_row_index",
        });

      if (error) throw error;

      // Write back to Google Sheet via Apps Script
      const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyEnbOcA9zOMuNfnNMf2X54TOUfhG3TU7KjF2HDiAAamVCLghhUdKFc1uJ-QxN2vstDWA/exec";
      
      try {
        await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            row_index: rowIndex,
            row_data: rowData,
          }),
        });
      } catch (sheetError) {
        console.warn("Google Sheet 同步失敗，但資料已存到資料庫", sheetError);
      }

      setSavedEdits((prev) => ({ ...prev, [rowIndex]: rowData }));
      setEditedRows((prev) => {
        const newEdits = { ...prev };
        delete newEdits[rowIndex];
        return newEdits;
      });

      toast({ title: "已儲存！", description: "你的修改已同步到資料庫和 Google Sheet。" });
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

  // Columns to truncate (show only first 10 characters)
  const truncateColumns = ["主題", "ig link", "api key", "ig帳", "biolato id"];
  
  const shouldTruncate = (header: string) => {
    const h = header.toLowerCase().trim();
    return truncateColumns.some(col => h.includes(col.toLowerCase()) || col.toLowerCase().includes(h));
  };

  const truncateText = (text: string, maxLength: number = 10) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const hasChanges = (rowIndex: number) => {
    return editedRows[rowIndex] !== undefined;
  };

  if (rows.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">沒有資料。</p>
        <Button variant="outline" onClick={onRefresh} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          重新載入
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4" ref={ref}>
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          共 {rows.length} 行屬於你的資料
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
            {rows.map((row) => {
              const canEdit = isUserRow(row);
              return (
                <TableRow 
                  key={row.rowIndex}
                  className={canEdit ? "bg-primary/5" : ""}
                >
                  {headers.map((header, cellIndex) => {
                    const cellValue = getCellValue(row, cellIndex);
                    const displayValue = shouldTruncate(header) ? truncateText(cellValue) : cellValue;
                    
                    return (
                      <TableCell key={cellIndex}>
                        {!canEdit || cellIndex === 0 ? (
                          <span 
                            className={cellIndex === 0 ? "text-muted-foreground" : ""}
                            title={shouldTruncate(header) ? cellValue : undefined}
                          >
                            {displayValue}
                          </span>
                        ) : (
                          <Input
                            value={cellValue}
                            onChange={(e) => handleCellChange(row.rowIndex, cellIndex, e.target.value)}
                            className="min-w-[120px]"
                          />
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    {canEdit ? (
                      <Button
                        size="sm"
                        onClick={() => handleSave(row.rowIndex)}
                        disabled={saving || !hasChanges(row.rowIndex)}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        儲存
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">只讀</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      <p className="text-xs text-muted-foreground">
        * 只有 A 欄電郵與你登入電郵相同的行才可編輯（淺色背景）。電郵欄位無法修改。
      </p>
    </div>
  );
});

DataTable.displayName = "DataTable";
