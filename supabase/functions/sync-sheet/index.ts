import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHEET_ID = "1T-yJr4oWKO9Bz78NfH2FyAU83OEFsBYgU2x7m_53DHg";

function parseCSV(text: string): string[][] {
  const lines = text.split('\n');
  const result: string[][] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const row: string[] = [];
    let cell = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(cell.trim());
        cell = '';
      } else {
        cell += char;
      }
    }
    row.push(cell.trim());
    result.push(row);
  }
  
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sync_type = 'manual' } = await req.json().catch(() => ({}));
    
    console.log(`Starting ${sync_type} sync for sheet: ${SHEET_ID}`);
    
    // Fetch Google Sheet as CSV
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
    const response = await fetch(sheetUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.status}`);
    }
    
    const csvText = await response.text();
    const parsedData = parseCSV(csvText);
    
    if (parsedData.length === 0) {
      throw new Error("No data found in sheet");
    }
    
    const headers = parsedData[0];
    const rows = parsedData.slice(1);
    
    console.log(`Parsed ${rows.length} rows with ${headers.length} columns`);
    
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Upsert each row
    const syncData = rows.map((row, index) => {
      const rowData: Record<string, string> = {};
      headers.forEach((header, i) => {
        rowData[header] = row[i] || '';
      });
      
      return {
        row_index: index,
        row_data: rowData,
        synced_at: new Date().toISOString(),
      };
    });
    
    // Delete old data and insert new
    await supabase.from('sheet_sync').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    const { error: insertError } = await supabase
      .from('sheet_sync')
      .upsert(syncData, { onConflict: 'row_index' });
    
    if (insertError) {
      throw new Error(`Failed to sync data: ${insertError.message}`);
    }
    
    // Log the sync
    await supabase.from('sync_logs').insert({
      sync_type,
      rows_synced: rows.length,
      status: 'success',
    });
    
    console.log(`Successfully synced ${rows.length} rows`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        rows_synced: rows.length,
        headers,
        message: `成功同步 ${rows.length} 筆資料`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync error:', errorMessage);
    
    // Try to log the error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase.from('sync_logs').insert({
        sync_type: 'manual',
        rows_synced: 0,
        status: 'error',
        error_message: errorMessage,
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
