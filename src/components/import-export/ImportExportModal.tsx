import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  Sparkles, 
  Trash2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { Trade } from '../../types/trade';
import { parseTradesFromCsv } from '../../lib/csv-parser';
import { exportTradesToJson, exportTradesToCsv } from '../../lib/storage';
import { Button } from '../common/Button';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  onImportTrades: (newTrades: Trade[]) => void;
  onLoadSampleTrades: () => void;
  onClearTrades: () => void;
}

export function ImportExportModal({
  isOpen,
  onClose,
  trades,
  onImportTrades,
  onLoadSampleTrades,
  onClearTrades,
}: ImportExportModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success?: string; error?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
      setImportStatus({ error: 'Please upload a valid .csv or .json backup file.' });
      return;
    }

    const reader = new FileReader();

    if (file.name.endsWith('.json')) {
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          if (Array.isArray(parsed)) {
            onImportTrades(parsed);
            setImportStatus({ success: `Successfully restored ${parsed.length} trades from backup.` });
          } else {
            setImportStatus({ error: 'JSON backup file has invalid format.' });
          }
        } catch (err: any) {
          setImportStatus({ error: `Failed to parse JSON: ${err.message}` });
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const result = parseTradesFromCsv(text);
        if (result.trades.length > 0) {
          onImportTrades(result.trades);
          setImportStatus({
            success: `Imported ${result.trades.length} trades successfully! ${
              result.errors.length > 0 ? `(${result.errors.length} skipped)` : ''
            }`,
          });
        } else {
          setImportStatus({
            error: result.errors[0] || 'No valid trades found in this CSV.',
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#101422] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 my-4 sm:my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Data Management & CSV Import
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                100% private, on-device data storage with seamless backup & export
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            
            {/* Drag & Drop Import Box */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Import Trades (CSV or JSON Backup)
              </span>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-colors ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-900/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-2">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Click to upload or drag & drop broker CSV
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supports Generic CSV, Zerodha, Binance, MetaTrader, and IBKR files
                </p>
              </div>

              {/* Status Message */}
              {importStatus?.success && (
                <div className="mt-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{importStatus.success}</span>
                </div>
              )}

              {importStatus?.error && (
                <div className="mt-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importStatus.error}</span>
                </div>
              )}
            </div>

            {/* Export Section */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Export & Backups ({trades.length} trades currently saved)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <Button
                  variant="outline"
                  size="md"
                  icon={<FileSpreadsheet className="w-4 h-4 text-emerald-500" />}
                  disabled={trades.length === 0}
                  onClick={() => exportTradesToCsv(trades)}
                  className="text-xs w-full justify-center"
                >
                  Export CSV Spreadsheet
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  icon={<Download className="w-4 h-4 text-indigo-500" />}
                  disabled={trades.length === 0}
                  onClick={() => exportTradesToJson(trades)}
                  className="text-xs w-full justify-center"
                >
                  Export JSON Backup
                </Button>
              </div>
            </div>

            {/* Quick Demo & Reset Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Sample Demo Dataset</h4>
                  <p className="text-[11px] text-slate-500">Populate journal with realistic multi-asset trades</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                  onClick={() => {
                    onLoadSampleTrades();
                    setImportStatus({ success: 'Sample multi-asset demo dataset loaded!' });
                  }}
                  className="text-xs"
                >
                  Load Sample Data
                </Button>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <h4 className="text-xs font-bold text-rose-500">Clear All Journal Records</h4>
                  <p className="text-[11px] text-slate-500">Permanently delete all trades on this device</p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  disabled={trades.length === 0}
                  onClick={() => {
                    if (window.confirm('Are you sure you want to clear all trading journal records? Make sure you have exported a backup.')) {
                      onClearTrades();
                      setImportStatus({ success: 'All records cleared.' });
                    }
                  }}
                  className="text-xs"
                >
                  Clear All
                </Button>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
