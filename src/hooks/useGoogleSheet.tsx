import { useState, useEffect, useCallback } from "react";

interface SheetRow {
  rowIndex: number;
  data: string[];
}

export const useGoogleSheet = (sheetId: string) => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSheet = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch Google Sheet as CSV
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const response = await fetch(csvUrl);
      
      if (!response.ok) {
        throw new Error("無法讀取 Google Sheet");
      }
      
      const csvText = await response.text();
      const lines = parseCSV(csvText);
      
      if (lines.length > 0) {
        setHeaders(lines[0]);
        setRows(
          lines.slice(1).map((data, index) => ({
            rowIndex: index + 1,
            data,
          }))
        );
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sheetId]);

  useEffect(() => {
    fetchSheet();
  }, [fetchSheet]);

  return { headers, rows, loading, error, refetch: fetchSheet };
};

// Simple CSV parser that handles quoted fields
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentLine.push(currentField);
        currentField = "";
      } else if (char === "\r" && nextChar === "\n") {
        currentLine.push(currentField);
        lines.push(currentLine);
        currentLine = [];
        currentField = "";
        i++;
      } else if (char === "\n") {
        currentLine.push(currentField);
        lines.push(currentLine);
        currentLine = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField);
    lines.push(currentLine);
  }

  return lines.filter(line => line.some(cell => cell.trim() !== ""));
}
