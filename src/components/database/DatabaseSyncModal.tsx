import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  UploadCloud, 
  DownloadCloud, 
  ExternalLink, 
  Copy, 
  Check, 
  Key, 
  Globe, 
  X,
  ShieldCheck,
  Server
} from 'lucide-react';
import { Button } from '../common/Button';
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  clearSupabaseConfig, 
  testSupabaseConnection, 
  pushTradesToSupabase, 
  fetchTradesFromSupabase 
} from '../../lib/supabase';
import { Trade } from '../../types/trade';

interface DatabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  onTradesUpdated: (trades: Trade[]) => void;
}

export function DatabaseSyncModal({
  isOpen,
  onClose,
  trades,
  onTradesUpdated,
}: DatabaseSyncModalProps) {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [autoSync, setAutoSync] = useState(false);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = getSupabaseConfig();
      setUrl(config.url);
      setAnonKey(config.anonKey);
      setAutoSync(config.autoSync);
      setTestResult(null);
      setSyncStatus(null);
    }
  }, [isOpen]);

  const handleSave = () => {
    saveSupabaseConfig(url, anonKey, autoSync);
    setSyncStatus('Credentials saved successfully.');
    setTimeout(() => setSyncStatus(null), 3000);
  };

  const handleClear = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setAutoSync(false);
    setTestResult(null);
    setSyncStatus('Database disconnected. TradeView is now in local-only mode.');
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    // Temporarily save to test with current input
    saveSupabaseConfig(url, anonKey, autoSync);
    const res = await testSupabaseConnection();
    setTestResult(res);
    setIsTesting(false);
  };

  const handlePushToCloud = async () => {
    setIsSyncing(true);
    setSyncStatus('Pushing trades to Supabase PostgreSQL...');
    saveSupabaseConfig(url, anonKey, autoSync);
    const res = await pushTradesToSupabase(trades);
    if (res.error) {
      setSyncStatus(`Error: ${res.error}`);
    } else {
      setSyncStatus(`Successfully pushed ${res.count} trades to Supabase!`);
    }
    setIsSyncing(false);
  };

  const handlePullFromCloud = async () => {
    setIsSyncing(true);
    setSyncStatus('Fetching trades from Supabase...');
    saveSupabaseConfig(url, anonKey, autoSync);
    const res = await fetchTradesFromSupabase();
    if (res.error) {
      setSyncStatus(`Error: ${res.error}`);
    } else {
      onTradesUpdated(res.trades);
      setSyncStatus(`Successfully imported ${res.trades.length} trades from Supabase into your journal!`);
    }
    setIsSyncing(false);
  };

  const copySqlSchema = () => {
    const sql = `-- TradeView V2 Schema
CREATE TABLE IF NOT EXISTS public.trades (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    asset_class TEXT NOT NULL,
    direction TEXT NOT NULL,
    status TEXT NOT NULL,
    entry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    exit_date TIMESTAMP WITH TIME ZONE,
    entry_price NUMERIC NOT NULL,
    exit_price NUMERIC,
    quantity NUMERIC NOT NULL,
    stop_loss NUMERIC,
    take_profit NUMERIC,
    fees NUMERIC DEFAULT 0,
    gross_pnl NUMERIC DEFAULT 0,
    net_pnl NUMERIC DEFAULT 0,
    pnl_percentage NUMERIC DEFAULT 0,
    r_multiple NUMERIC DEFAULT 0,
    strategy TEXT DEFAULT 'Unassigned',
    patterns JSONB DEFAULT '[]'::jsonb,
    behavioral_flags JSONB DEFAULT '[]'::jsonb,
    emotion TEXT DEFAULT 'Disciplined',
    rating INTEGER DEFAULT 0,
    notes TEXT,
    lessons TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all access" ON public.trades FOR ALL USING (true);`;

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  if (!isOpen) return null;

  const isConfigured = Boolean(url && anonKey);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Cloud Database Sync (Supabase PostgreSQL)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Connect your personal PostgreSQL cloud database for multi-device sync and permanent backup.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Status Callout */}
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              isConfigured
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                : 'bg-indigo-500/5 border-indigo-500/20 text-indigo-800 dark:text-indigo-300'
            }`}>
              <Server className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
              <div className="text-xs leading-relaxed">
                <strong className="block text-sm font-semibold mb-0.5">
                  {isConfigured ? 'Supabase Backend Configured' : 'Offline / Local-First Mode Active'}
                </strong>
                TradeView is built with an offline-first architecture. When connected to Supabase, your trades sync directly to your personal PostgreSQL database. If offline or disconnected, everything continues to save locally in your browser.
              </div>
            </div>

            {/* Supabase Connection Form */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  Supabase Anon Public API Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Auto-sync trades in background when changes are saved</span>
                </label>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTest}
                    disabled={!url || !anonKey || isTesting}
                  >
                    {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                    Test Connection
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    Save Config
                  </Button>
                </div>
              </div>
            </div>

            {/* Test Connection Banner */}
            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  testResult.success 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                }`}
              >
                {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{testResult.message}</span>
              </motion.div>
            )}

            {/* Sync Status Banner */}
            {syncStatus && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-medium"
              >
                {syncStatus}
              </motion.div>
            )}

            {/* Cloud Sync Operations (Push / Pull) */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Cloud Sync Actions
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handlePushToCloud}
                  disabled={!isConfigured || isSyncing}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Push Local Trades to Cloud
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Uploads {trades.length} local trades into PostgreSQL
                    </span>
                  </div>
                </button>

                <button
                  onClick={handlePullFromCloud}
                  disabled={!isConfigured || isSyncing}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-indigo-500/50 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                    <DownloadCloud className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Pull Cloud Trades to Local
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Syncs latest database rows to this device
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Setup Guide & SQL Schema */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  1-Minute Supabase Quick Setup
                </span>
                <button
                  onClick={copySqlSchema}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedSql ? 'SQL Copied!' : 'Copy SQL Schema Script'}
                </button>
              </div>

              <ol className="text-xs text-slate-500 dark:text-slate-400 space-y-1 list-decimal list-inside leading-relaxed">
                <li>Create a free project at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-2.5 h-2.5" /></a></li>
                <li>Go to <strong>SQL Editor</strong>, paste the copied SQL script, and click <strong>Run</strong></li>
                <li>Go to <strong>Project Settings → API</strong>, copy your <strong>URL</strong> and <strong>anon key</strong>, and paste them above!</li>
              </ol>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            {isConfigured ? (
              <button
                onClick={handleClear}
                className="text-xs font-semibold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
              >
                Disconnect Database
              </button>
            ) : (
              <span className="text-xs text-slate-400 font-medium">No database connected</span>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
