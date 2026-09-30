import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Layers, 
  ArrowUpRight,
  Info,
  SlidersHorizontal,
  Flame,
  Crosshair
} from 'lucide-react';
import { Trade } from '../../types/trade';
import { generatePatternAnalytics } from '../../lib/pattern-detector';
import { useCurrency } from '../../context/CurrencyContext';
import { AssetBadge, DirectionBadge, EmotionBadge } from '../common/Badge';

interface PatternLabProps {
  trades: Trade[];
  onSelectPatternFilter?: (pattern: string) => void;
  onViewTrade?: (trade: Trade) => void;
}

export function PatternLab({ trades, onSelectPatternFilter }: PatternLabProps) {
  const { formatCurrency } = useCurrency();
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'netPnl' | 'winRate' | 'totalTrades'>('netPnl');

  const analytics = useMemo(() => generatePatternAnalytics(trades), [trades]);

  const sortedPatterns = useMemo(() => {
    return [...analytics.patternStats].sort((a, b) => {
      if (sortBy === 'winRate') return b.winRate - a.winRate;
      if (sortBy === 'totalTrades') return b.totalTrades - a.totalTrades;
      return b.netPnl - a.netPnl;
    });
  }, [analytics.patternStats, sortBy]);

  // Selected pattern matching trades
  const patternTrades = useMemo(() => {
    if (!selectedPattern) return [];
    return trades.filter((t) => t.patterns?.includes(selectedPattern));
  }, [trades, selectedPattern]);

  return (
    <div className="space-y-6">
      {/* Top Banner: Pattern Identification Intelligence Overview */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-6 md:p-8 text-white border border-indigo-800/40 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pattern Identification Engine • Version 2</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Trading Pattern Lab & Setup Matrix
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Algorithmic discovery of your highest-expectancy candlestick, SMC, and chart patterns, combined with auto-detection of behavioral execution leaks.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center">
              <span className="text-xs text-slate-400 block font-medium">Patterns Active</span>
              <span className="text-xl font-bold text-white mt-1 block">
                {analytics.patternStats.length}
              </span>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center">
              <span className="text-xs text-emerald-400 block font-medium">Best Edge</span>
              <span className="text-sm font-bold text-emerald-300 mt-1 block truncate max-w-[120px]" title={analytics.bestPattern?.pattern || 'None'}>
                {analytics.bestPattern ? analytics.bestPattern.pattern : 'N/A'}
              </span>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center col-span-2 sm:col-span-1">
              <span className="text-xs text-rose-400 block font-medium">Behavior Leaks</span>
              <span className="text-sm font-bold text-rose-300 mt-1 block">
                {analytics.revengeTradeCount > 0 ? `${analytics.revengeTradeCount} Leaks` : 'Clean'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Behavioral Execution Leaks Alert Section */}
      {analytics.behavioralHabits.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Auto-Detected Behavioral Execution Leaks
            </h3>
            <span className="text-xs text-slate-500">
              Total capital drag: <strong className="text-rose-500 font-semibold">{formatCurrency(-analytics.totalLeakageCost)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.behavioralHabits.map((habit) => (
              <motion.div
                key={habit.flag}
                whileHover={{ y: -2 }}
                className="rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 p-4 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400">
                      <Flame className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {habit.flag}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold">
                          {habit.count} {habit.count === 1 ? 'Trade' : 'Trades'}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {habit.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">Cost</span>
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      -{formatCurrency(habit.totalCost)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-amber-500/15 flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">
                    💡 <strong>Action:</strong> {habit.recommendation}
                  </span>
                  <span className="text-slate-500 font-medium">
                    Win Rate: <strong>{habit.winRate}%</strong>
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Pattern Performance Matrix Leaderboard */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              Technical & Candlestick Pattern Leaderboard
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ranked setup analysis across your logged trade setups.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Sort:
            </span>
            <div className="inline-flex rounded-lg p-1 bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
              <button
                onClick={() => setSortBy('netPnl')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  sortBy === 'netPnl'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Net P&L
              </button>
              <button
                onClick={() => setSortBy('winRate')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  sortBy === 'winRate'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Win Rate
              </button>
              <button
                onClick={() => setSortBy('totalTrades')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  sortBy === 'totalTrades'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Frequency
              </button>
            </div>
          </div>
        </div>

        {/* Pattern Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPatterns.map((p, index) => {
            const isProfitable = p.netPnl >= 0;
            const isSelected = selectedPattern === p.pattern;

            return (
              <motion.div
                key={p.pattern}
                whileHover={{ y: -3 }}
                onClick={() => setSelectedPattern(isSelected ? null : p.pattern)}
                className={`relative rounded-xl border p-5 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      #{index + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        {p.pattern}
                      </h4>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {p.totalTrades} {p.totalTrades === 1 ? 'trade' : 'trades'} ({p.winningTrades}W - {p.losingTrades}L)
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-base font-extrabold flex items-center justify-end gap-0.5 ${
                        isProfitable ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {isProfitable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {formatCurrency(p.netPnl)}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Profit Factor: <strong>{p.profitFactor === 99 ? '∞' : p.profitFactor.toFixed(2)}</strong>
                    </span>
                  </div>
                </div>

                {/* Win Rate Progress Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">Win Rate</span>
                    <span className={p.winRate >= 50 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                      {p.winRate}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        p.winRate >= 60 
                          ? 'bg-emerald-500' 
                          : p.winRate >= 45 
                          ? 'bg-amber-500' 
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, p.winRate))}%` }}
                    />
                  </div>
                </div>

                {/* Additional Metrics Row */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span>Avg Return: <strong className={p.avgPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}>{formatCurrency(p.avgPnl)}</strong></span>
                  <span>Avg R: <strong className="text-slate-700 dark:text-slate-300">{p.avgRMultiple > 0 ? `+${p.avgRMultiple}R` : `${p.avgRMultiple}R`}</strong></span>
                </div>

                {/* Click action indicator */}
                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  <span>{isSelected ? 'Hide Trades ▲' : 'View Matching Trades ▼'}</span>
                  {onSelectPatternFilter && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPatternFilter(p.pattern);
                      }}
                      className="hover:underline flex items-center gap-0.5"
                    >
                      Filter Trade Log <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Selected Pattern Trade Inspector Drawer / Panel */}
      {selectedPattern && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-indigo-500/30 bg-slate-900 text-white p-6 shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-bold text-white">
                Trades Matching Pattern: <span className="text-indigo-400">{selectedPattern}</span>
              </h3>
            </div>
            <button
              onClick={() => setSelectedPattern(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
            >
              Close Panel ✕
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Symbol</th>
                  <th className="pb-2">Direction</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Strategy</th>
                  <th className="pb-2">Emotion</th>
                  <th className="pb-2 text-right">Net P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {patternTrades.map((t) => {
                  const win = (t.netPnl || 0) > 0;
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 text-slate-300 font-mono">
                        {new Date(t.entryDate).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 font-bold text-white flex items-center gap-2">
                        {t.symbol}
                        <AssetBadge assetClass={t.assetClass} />
                      </td>
                      <td className="py-2.5">
                        <DirectionBadge direction={t.direction} />
                      </td>
                      <td className="py-2.5">
                        <span className="text-slate-400">{t.status}</span>
                      </td>
                      <td className="py-2.5 text-slate-300">{t.strategy}</td>
                      <td className="py-2.5">
                        <EmotionBadge emotion={t.emotion} />
                      </td>
                      <td className={`py-2.5 text-right font-bold ${win ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(t.netPnl || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Candlestick & Technical Pattern Catalog Reference Guide */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white mb-2">
          <Info className="w-4 h-4 text-indigo-500" />
          Pattern Catalog & Methodology
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          TradeView V2 uses multi-attribute pattern matching across your journaled trades. You can tag one or more patterns (e.g. <em>Breakout & Retest</em>, <em>Fair Value Gap</em>, <em>Hammer / Pin Bar</em>, <em>Liquidity Sweep</em>) when recording or editing trades. The engine cross-references win rates, profit factor, and behavioral leaks to ensure your playbook stays rooted in cold mathematical reality.
        </p>
      </section>
    </div>
  );
}
