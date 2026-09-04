import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Target, Award, Brain, MessageSquare, Edit3 } from 'lucide-react';
import { Trade } from '../../types/trade';
import { DirectionBadge, StatusBadge, AssetBadge, EmotionBadge } from '../common/Badge';

interface TradeDetailModalProps {
  trade: Trade | null;
  onClose: () => void;
  onEdit: (trade: Trade) => void;
  currency?: string;
}

export function TradeDetailModal({ trade, onClose, onEdit, currency = '$' }: TradeDetailModalProps) {
  if (!trade) return null;

  const isProfit = (trade.netPnl ?? 0) > 0;
  const isLoss = (trade.netPnl ?? 0) < 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="relative w-full max-w-xl bg-white dark:bg-[#101422] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {trade.symbol}
              </span>
              <AssetBadge assetClass={trade.assetClass} />
              <DirectionBadge direction={trade.direction} />
              <StatusBadge status={trade.status} />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  onClose();
                  onEdit(trade);
                }}
                className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Edit"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            
            {/* Big Financial Highlight */}
            {trade.status === 'Closed' && trade.netPnl !== undefined && (
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                isProfit 
                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                  : isLoss 
                  ? 'bg-rose-500/10 border-rose-500/30' 
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Net Realized Result
                  </span>
                  <div className={`text-2xl font-black font-mono tabular-nums ${isProfit ? 'text-emerald-500' : isLoss ? 'text-rose-500' : 'text-slate-400'}`}>
                    {isProfit ? '+' : ''}{currency}{trade.netPnl.toFixed(2)}
                    {trade.pnlPercentage !== undefined && (
                      <span className="text-sm font-semibold ml-2 opacity-80">
                        ({isProfit ? '+' : ''}{trade.pnlPercentage.toFixed(2)}%)
                      </span>
                    )}
                  </div>
                </div>

                {trade.rMultiple !== undefined && trade.rMultiple !== 0 && (
                  <div className="text-right">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      R-Multiple
                    </span>
                    <div className={`text-xl font-bold font-mono ${trade.rMultiple > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {trade.rMultiple > 0 ? '+' : ''}{trade.rMultiple}R
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Execution Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Entry Price</span>
                <p className="text-sm font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200 mt-0.5">
                  {currency}{trade.entryPrice.toLocaleString()}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Exit Price</span>
                <p className="text-sm font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200 mt-0.5">
                  {trade.exitPrice ? `${currency}${trade.exitPrice.toLocaleString()}` : '—'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Quantity</span>
                <p className="text-sm font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200 mt-0.5">
                  {trade.quantity}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Fees / Commission</span>
                <p className="text-sm font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200 mt-0.5">
                  {currency}{trade.fees.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Stop Loss & Take Profit Target */}
            {(trade.stopLoss || trade.takeProfit) && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                {trade.stopLoss && (
                  <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                    <span className="text-rose-500 text-[10px] uppercase font-bold">Planned Stop Loss</span>
                    <p className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                      {currency}{trade.stopLoss}
                    </p>
                  </div>
                )}
                {trade.takeProfit && (
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <span className="text-emerald-500 text-[10px] uppercase font-bold">Take Profit Target</span>
                    <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {currency}{trade.takeProfit}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Strategy & Emotion Tags */}
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-xs">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-slate-400 font-medium">Strategy:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{trade.strategy || 'General'}</span>
              </div>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

              <div className="flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-slate-400 font-medium">Emotion:</span>
                <EmotionBadge emotion={trade.emotion} />
              </div>
            </div>

            {/* Notes & Lessons */}
            {trade.notes && (
              <div className="space-y-1 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> Entry Rationale & Notes
                </span>
                <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 text-slate-600 dark:text-slate-300 leading-relaxed">
                  {trade.notes}
                </p>
              </div>
            )}

            {trade.lessons && (
              <div className="space-y-1 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500" /> Post-Trade Lessons
                </span>
                <p className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-slate-700 dark:text-slate-300 leading-relaxed">
                  {trade.lessons}
                </p>
              </div>
            )}

            {/* Timestamps */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Opened: {new Date(trade.entryDate).toLocaleString()}
              </span>
              {trade.exitDate && (
                <span>Closed: {new Date(trade.exitDate).toLocaleString()}</span>
              )}
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
