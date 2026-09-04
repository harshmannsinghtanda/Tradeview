import { useMemo } from 'react';
import { Trade } from '../../types/trade';
import { analyzeByStrategy } from '../../lib/calculations';
import { Target } from 'lucide-react';

interface StrategyAnalyticsProps {
  trades: Trade[];
  currency?: string;
}

export function StrategyAnalytics({ trades, currency = '$' }: StrategyAnalyticsProps) {
  const data = useMemo(() => {
    return analyzeByStrategy(trades);
  }, [trades]);

  return (
    <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Setup & Strategy Performance
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          {data.length} setups categorized
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-900/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Setup / Model</th>
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
                <tr key={item.strategy} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                    {item.strategy}
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
  );
}
