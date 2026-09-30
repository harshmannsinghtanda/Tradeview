import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Trade } from '../types/trade';

const SUPABASE_URL_KEY = 'tradeview_supabase_url';
const SUPABASE_ANON_KEY = 'tradeview_supabase_anon_key';
const SUPABASE_AUTO_SYNC_KEY = 'tradeview_supabase_auto_sync';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  autoSync: boolean;
}

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
  
  const savedUrl = localStorage.getItem(SUPABASE_URL_KEY) || envUrl;
  const savedKey = localStorage.getItem(SUPABASE_ANON_KEY) || envKey;
  const autoSync = localStorage.getItem(SUPABASE_AUTO_SYNC_KEY) === 'true';

  return {
    url: savedUrl.trim(),
    anonKey: savedKey.trim(),
    autoSync,
  };
}

export function saveSupabaseConfig(url: string, anonKey: string, autoSync = false): void {
  localStorage.setItem(SUPABASE_URL_KEY, url.trim());
  localStorage.setItem(SUPABASE_ANON_KEY, anonKey.trim());
  localStorage.setItem(SUPABASE_AUTO_SYNC_KEY, String(autoSync));
  cachedClient = null; // Reset cached client on credentials change
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(SUPABASE_URL_KEY);
  localStorage.removeItem(SUPABASE_ANON_KEY);
  localStorage.removeItem(SUPABASE_AUTO_SYNC_KEY);
  cachedClient = null;
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey);
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;

  try {
    cachedClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Validates connection with Supabase by performing a light ping or count query
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase URL or Anon Key is missing.' };
  }

  try {
    const { error } = await client.from('trades').select('id', { count: 'exact', head: true });
    if (error) {
      // If table doesn't exist yet, give friendly notice
      if (error.code === '42P01') {
        return { 
          success: false, 
          message: 'Connected to Supabase, but the "trades" table does not exist. Please run the SQL schema script in your Supabase SQL Editor.' 
        };
      }
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Successfully connected to Supabase PostgreSQL database!' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Connection failed: ${msg}` };
  }
}

/**
 * Formats a local Trade object to Supabase database row format
 */
function tradeToDbRow(trade: Trade) {
  return {
    id: trade.id,
    symbol: trade.symbol,
    asset_class: trade.assetClass,
    direction: trade.direction,
    status: trade.status,
    entry_date: trade.entryDate,
    exit_date: trade.exitDate || null,
    entry_price: trade.entryPrice,
    exit_price: trade.exitPrice || null,
    quantity: trade.quantity,
    stop_loss: trade.stopLoss || null,
    take_profit: trade.takeProfit || null,
    fees: trade.fees || 0,
    gross_pnl: trade.grossPnl || 0,
    net_pnl: trade.netPnl || 0,
    pnl_percentage: trade.pnlPercentage || 0,
    r_multiple: trade.rMultiple || 0,
    strategy: trade.strategy || 'Unassigned',
    patterns: trade.patterns || [],
    behavioral_flags: trade.behavioralFlags || [],
    emotion: trade.emotion || 'Disciplined',
    rating: trade.rating || 0,
    notes: trade.notes || '',
    lessons: trade.lessons || '',
    image_url: trade.imageUrl || null,
    created_at: trade.createdAt ? new Date(trade.createdAt).toISOString() : new Date().toISOString(),
    updated_at: trade.updatedAt ? new Date(trade.updatedAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Formats a Supabase row to local Trade object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbRowToTrade(row: any): Trade {
  return {
    id: row.id,
    symbol: row.symbol,
    assetClass: row.asset_class,
    direction: row.direction,
    status: row.status,
    entryDate: row.entry_date,
    exitDate: row.exit_date || undefined,
    entryPrice: Number(row.entry_price),
    exitPrice: row.exit_price ? Number(row.exit_price) : undefined,
    quantity: Number(row.quantity),
    stopLoss: row.stop_loss ? Number(row.stop_loss) : undefined,
    takeProfit: row.take_profit ? Number(row.take_profit) : undefined,
    fees: Number(row.fees || 0),
    grossPnl: row.gross_pnl !== null ? Number(row.gross_pnl) : undefined,
    netPnl: row.net_pnl !== null ? Number(row.net_pnl) : undefined,
    pnlPercentage: row.pnl_percentage !== null ? Number(row.pnl_percentage) : undefined,
    rMultiple: row.r_multiple !== null ? Number(row.r_multiple) : undefined,
    strategy: row.strategy || 'Unassigned',
    patterns: Array.isArray(row.patterns) ? row.patterns : [],
    behavioralFlags: Array.isArray(row.behavioral_flags) ? row.behavioral_flags : [],
    emotion: row.emotion || 'Disciplined',
    rating: row.rating ? Number(row.rating) : undefined,
    notes: row.notes || '',
    lessons: row.lessons || '',
    imageUrl: row.image_url || undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };
}

/**
 * Uploads all local trades into Supabase (Upsert by ID)
 */
export async function pushTradesToSupabase(trades: Trade[]): Promise<{ count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { count: 0, error: 'Supabase client is not configured.' };
  }
  if (!trades.length) {
    return { count: 0 };
  }

  const rows = trades.map(tradeToDbRow);

  const { error } = await client.from('trades').upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error('Failed to push trades to Supabase:', error);
    return { count: 0, error: error.message };
  }

  return { count: rows.length };
}

/**
 * Fetches all trades from Supabase
 */
export async function fetchTradesFromSupabase(): Promise<{ trades: Trade[]; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { trades: [], error: 'Supabase client is not configured.' };
  }

  const { data, error } = await client
    .from('trades')
    .select('*')
    .order('entry_date', { ascending: false });

  if (error) {
    console.error('Failed to fetch trades from Supabase:', error);
    return { trades: [], error: error.message };
  }

  return { trades: (data || []).map(dbRowToTrade) };
}

/**
 * Upserts a single trade to Supabase
 */
export async function upsertTradeToSupabase(trade: Trade): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase not configured' };

  const row = tradeToDbRow(trade);
  const { error } = await client.from('trades').upsert(row, { onConflict: 'id' });
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Deletes a trade from Supabase by ID
 */
export async function deleteTradeFromSupabase(id: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase not configured' };

  const { error } = await client.from('trades').delete().eq('id', id);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
