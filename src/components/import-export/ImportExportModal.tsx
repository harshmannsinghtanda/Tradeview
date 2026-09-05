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
  AlertCircle,
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Trade } from '../../types/trade';
import { parseTradesFromCsv, ParseCsvResult } from '../../lib/csv-parser';
import { exportTradesToJson, exportTradesToCsv } from '../../lib/storage';
import { Button } from '../common/Button';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  onImportTrades: (newTrades: Trade[], overwrite?: boolean) => void;
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
  const [parsedPreview, setParsedPreview] = useState<{
    fileName: string;
    result: ParseCsvResult;
  } | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [showWarnings, setShowWarnings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    setImportStatus(null);

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
      setImportStatus({ error: 'Please upload a valid .csv or .json backup file.' });
      return;
    }

    const reader = new FileReader();

    if (file.name.endsWith('.json')) {
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          if (Array.isArray(parsed) && parsed.length > 0) {
            onImportTrades(parsed, true);
            setImportStatus({ success: `Successfully restored ${parsed.length} trades from backup.` });
            setParsedPreview(null);
          } else {
            setImportStatus({ error: 'JSON backup file has invalid format or contains no trades.' });
          }
        } catch (err: any) {
          setImportStatus({ error: `Failed to parse JSON: ${err.message}` });
        }
      };
      reader.readAsText(file);
    } else {
      // Process CSV
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const result = parseTradesFromCsv(text);

          if (result.trades.length > 0) {
            setParsedPreview({
              fileName: file.name,
              result,
            });
            setImportStatus(null);
          } else {
            setParsedPreview(null);
            setImportStatus({
              error: result.errors[0] || 'No valid trades found in this CSV. Please check the file headers.',
            });
          }
        } catch (err: any) {
          setImportStatus({ error: `Failed to process CSV: ${err.message}` });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedPreview) return;
    const { trades: newTrades } = parsedPreview.result;
    onImportTrades(newTrades, importMode === 'replace');
    setImportStatus({
      success: `Successfully imported ${newTrades.length} trades into your journal! (${importMode === 'replace' ? 'Replaced existing' : 'Appended to existing'})`,
    });
    setParsedPreview(null);
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
          className="relative w-full max-w-xl bg-white dark:bg-[#101422] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 my-4 sm:my-8 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                Data Management & CSV Importer
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Multi-broker CSV analysis with on-device privacy
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
            
            {/* If a CSV was uploaded and parsed, display the Instant Analysis Card */}
            {parsedPreview ? (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                  {/* Analysis Title & Detected Broker Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        CSV Analysis Complete
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-sm">
                        {parsedPreview.fileName}
                      </h3>
                    </div>
                    {parsedPreview.result.brokerDetected && (
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
                        {parsedPreview.result.brokerDetected}
                      </span>
                    )}
                  </div>

                  {/* Summary Metric Ribbon */}
                  {parsedPreview.result.summary && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                          <Layers className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Total Trades</span>
                        </div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 font-mono">
                          {parsedPreview.result.summary.totalParsed}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {parsedPreview.result.summary.closedCount} closed, {parsedPreview.result.summary.openCount} open
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Win Rate</span>
                        </div>
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                          {parsedPreview.result.summary.winRate}%
                        </div>
                        <div className="text-[10px] text-slate-500">
                          of closed trades
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                          <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Net P&L</span>
                        </div>
                        <div className={`text-sm font-bold mt-1 font-mono ${parsedPreview.result.summary.netPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {parsedPreview.result.summary.netPnl >= 0 ? '+' : ''}${parsedPreview.result.summary.netPnl.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          realized return
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-amber-500" />
                          <span>Date Range</span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-1 truncate">
                          {parsedPreview.result.summary.dateStart || 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          to {parsedPreview.result.summary.dateEnd || 'N/A'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sample Preview Rows */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Sample Extracted Trades Preview
                    </span>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100/70 dark:bg-slate-800/50 text-[10px] font-bold text-slate-500 uppercase">
                          <tr>
                            <th className="p-2">Symbol</th>
                            <th className="p-2">Type</th>
                            <th className="p-2 text-right">Entry</th>
                            <th className="p-2 text-right">Exit</th>
                            <th className="p-2 text-right">P&L</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-mono">
                          {parsedPreview.result.trades.slice(0, 3).map((t) => (
                            <tr key={t.id} className="text-[11px]">
                              <td className="p-2 font-bold text-slate-800 dark:text-slate-200">{t.symbol}</td>
                              <td className="p-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${t.direction === 'Long' ? 'bg-emerald-500/10 text-emerald-500' : 'text-rose-500 bg-rose-500/10'}`}>
                                  {t.direction}
                                </span>
                              </td>
                              <td className="p-2 text-right text-slate-600 dark:text-slate-400">${t.entryPrice}</td>
                              <td className="p-2 text-right text-slate-600 dark:text-slate-400">{t.exitPrice ? `$${t.exitPrice}` : '—'}</td>
                              <td className={`p-2 text-right font-bold ${(t.netPnl ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {(t.netPnl ?? 0) >= 0 ? '+' : ''}${(t.netPnl ?? 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Skipped Rows / Warnings */}
                  {parsedPreview.result.errors.length > 0 && (
                    <div className="border border-amber-500/30 rounded-xl bg-amber-500/10 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowWarnings(!showWarnings)}
                        className="w-full px-3 py-2 text-left flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-semibold cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {parsedPreview.result.errors.length} skipped row(s) detected
                        </span>
                        {showWarnings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      {showWarnings && (
                        <div className="px-3 pb-2.5 max-h-24 overflow-y-auto space-y-1 text-[10px] font-mono text-amber-700 dark:text-amber-300">
                          {parsedPreview.result.errors.slice(0, 10).map((err, idx) => (
                            <div key={idx}>{err}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Import Mode Selector */}
                  <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/40">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Choose Journal Destination
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label
                        onClick={() => setImportMode('replace')}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-start gap-2 transition-colors ${
                          importMode === 'replace'
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="font-bold">Replace Journal (Recommended)</div>
                          <div className="text-[10px] opacity-80 font-normal">
                            Clears sample demo trades and loads CSV data exclusively
                          </div>
                        </div>
                      </label>

                      <label
                        onClick={() => setImportMode('append')}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-start gap-2 transition-colors ${
                          importMode === 'append'
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="font-bold">Append to Journal</div>
                          <div className="text-[10px] opacity-80 font-normal">
                            Merge new CSV trades with your existing records
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Confirmation & Cancel Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="primary"
                      size="md"
                      icon={<CheckCircle2 className="w-4 h-4" />}
                      onClick={handleConfirmImport}
                      className="flex-1 justify-center text-xs"
                    >
                      Import {parsedPreview.result.trades.length} Trades into Journal
                    </Button>
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => setParsedPreview(null)}
                      className="text-xs"
                    >
                      Pick Another File
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Drag & Drop Upload Zone */
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

                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-2.5">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Click to upload or drag & drop CSV file
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                    Auto-detects Zerodha, Binance, MetaTrader 4/5, Interactive Brokers, and standard spreadsheets.
                  </p>
                </div>

                {/* Status Alert */}
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
            )}

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

            {/* Demo Data & Reset Actions */}
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
                    setParsedPreview(null);
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
                      setParsedPreview(null);
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
