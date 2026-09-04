import { Trade } from '../types/trade';

const STORAGE_KEY = 'tradeview_trades_v1';
const SETTINGS_KEY = 'tradeview_settings_v1';

export interface AppSettings {
  currency: string;
  theme: 'dark' | 'light';
  accountBalance: number;
}

export const defaultSettings: AppSettings = {
  currency: '$',
  theme: 'dark',
  accountBalance: 10000,
};

const INIT_KEY = 'tradeview_initialized_v1';

export function isStorageInitialized(): boolean {
  return localStorage.getItem(INIT_KEY) === 'true';
}

export function setStorageInitialized(val = true): void {
  localStorage.setItem(INIT_KEY, String(val));
}

/**
 * Loads all trades from local storage
 */
export function loadTradesFromStorage(): Trade[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse trades from localStorage:', err);
    return [];
  }
}

/**
 * Saves all trades to local storage
 */
export function saveTradesToStorage(trades: Trade[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  } catch (err) {
    console.error('Failed to save trades to localStorage:', err);
  }
}

/**
 * Loads user settings
 */
export function loadSettingsFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

/**
 * Saves user settings
 */
export function saveSettingsToStorage(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings to localStorage:', err);
  }
}

/**
 * Export full journal as JSON string
 */
export function exportTradesToJson(trades: Trade[]): void {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trades, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  const dateStamp = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute("download", `TradeView_Backup_${dateStamp}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Export trades as standard CSV spreadsheet
 */
export function exportTradesToCsv(trades: Trade[]): void {
  const headers = [
    'ID',
    'Symbol',
    'AssetClass',
    'Direction',
    'Status',
    'EntryDate',
    'ExitDate',
    'EntryPrice',
    'ExitPrice',
    'Quantity',
    'StopLoss',
    'TakeProfit',
    'Fees',
    'NetPnL',
    'PnL%',
    'RMultiple',
    'Strategy',
    'Emotion',
    'Notes'
  ];

  const rows = trades.map(t => [
    t.id,
    t.symbol,
    t.assetClass,
    t.direction,
    t.status,
    t.entryDate,
    t.exitDate || '',
    t.entryPrice,
    t.exitPrice || '',
    t.quantity,
    t.stopLoss || '',
    t.takeProfit || '',
    t.fees,
    t.netPnl ?? '',
    t.pnlPercentage ?? '',
    t.rMultiple ?? '',
    `"${(t.strategy || '').replace(/"/g, '""')}"`,
    t.emotion,
    `"${(t.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStamp = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `TradeView_Trades_${dateStamp}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
