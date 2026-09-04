import { useMemo } from 'react';
import { Trade } from '../../types/trade';
import { analyzeByEmotion } from '../../lib/calculations';
import { Brain, AlertTriangle, ShieldCheck } from 'lucide-react';
import { EmotionBadge } from '../common/Badge';

interface PsychologyAnalyticsProps {
  trades: Trade[];
  currency?: string;
}

export function PsychologyAnalytics({ trades, currency = '$' }: PsychologyAnalyticsProps) {
  const data = useMemo(() => {
    return analyzeByEmotion(trades);
  }, [trades]);

  const profitableEmotions = data.filter(d => d.totalPnl > 0);
  const harmfulEmotions = data.filter(d => d.totalPnl < 0);

  const bestEmotion = profitableEmotions[0];
  const worstEmotion = harmfulEmotions[harmfulEmotions.length - 1];

  return (
    <div className="space-y-6">
      {/* Psychology Top Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Most Profitable Mindset */}
        <div className="glass-panel rounded-2xl p-5 border border-emerald-500/20 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-2 text-emerald-500 mb-2">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Most Profitable Mindset</span>
          </div>
          {bestEmotion ? (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{bestEmotion.emotion}</span>
                <span className="text-emerald-500 font-mono font-bold text-lg">
                  +{currency}{bestEmotion.totalPnl.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {bestEmotion.winRate}% win rate across {bestEmotion.count} trade executions.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Log more trades to analyze profitable habits.</p>
          )}
        </div>

        {/* Most Destructive Mindset */}
        <div className="glass-panel rounded-2xl p-5 border border-rose-500/20 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-2 text-rose-500 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Costliest Leaks</span>
          </div>
          {worstEmotion ? (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{worstEmotion.emotion}</span>
                <span className="text-rose-500 font-mono font-bold text-lg">
                  {currency}{worstEmotion.totalPnl.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {worstEmotion.winRate}% win rate across {worstEmotion.count} trade executions.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No major emotional leaks detected yet!</p>
          )}
        </div>
      </div>

      {/* Breakdown Matrix Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Psychology & Emotional State Impact
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {data.length} mindsets tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-900/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Emotional State</th>
                <th className="py-3 px-4 text-center">Trades Count</th>
                <th className="py-3 px-4 text-center">Win Rate</th>
                <th className="py-3 px-4 text-right">Total Net P&L</th>
                <th className="py-3 px-4 text-right">Avg P&L / Trade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs font-medium">
              {data.map((item) => {
                const isPos = item.totalPnl >= 0;
                const avg = item.count > 0 ? item.totalPnl / item.count : 0;

                return (
                  <tr key={item.emotion} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <EmotionBadge emotion={item.emotion as any} />
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                      {item.count}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <span className={`font-mono font-bold ${item.winRate >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {item.winRate}%
                        </span>
                        <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full ${item.winRate >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: `${item.winRate}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isPos ? '+' : ''}{currency}{item.totalPnl.toFixed(2)}
                    </td>

                    <td className={`py-3 px-4 text-right font-mono tabular-nums ${avg >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {avg >= 0 ? '+' : ''}{currency}{avg.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
