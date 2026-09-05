import { useMemo } from 'react';
import { Trade } from '../../types/trade';
import { analyzeByAssetClass } from '../../lib/calculations';
import { PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

interface AssetDistributionProps {
  trades: Trade[];
}

export function AssetDistribution({ trades }: AssetDistributionProps) {
  const { formatCurrency } = useCurrency();
  const assetData = useMemo(() => {
    return analyzeByAssetClass(trades);
  }, [trades]);

  const directionData = useMemo(() => {
    const longs = trades.filter(t => t.direction === 'Long');
    const shorts = trades.filter(t => t.direction === 'Short');
    const total = trades.length || 1;

    const longPnl = longs.reduce((acc, t) => acc + (t.netPnl || 0), 0);
    const shortPnl = shorts.reduce((acc, t) => acc + (t.netPnl || 0), 0);

    return {
      longCount: longs.length,
      longPercent: Number(((longs.length / total) * 100).toFixed(0)),
      longPnl,
      shortCount: shorts.length,
      shortPercent: Number(((shorts.length / total) * 100).toFixed(0)),
      shortPnl,
    };
  }, [trades]);

  const assetColorMap: Record<string, string> = {
    Crypto: 'bg-purple-500',
    Stocks: 'bg-blue-500',
    Forex: 'bg-emerald-500',
    Futures: 'bg-amber-500',
    Options: 'bg-pink-500',
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-6">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Market & Direction Exposure</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Distribution across asset classes & long vs short ratio
        </p>
      </div>

      {/* Long vs Short Ratio Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-emerald-500">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Longs ({directionData.longPercent}%)</span>
            <span className="font-mono text-[11px] text-slate-500">
              {directionData.longPnl >= 0 ? '+' : ''}{formatCurrency(directionData.longPnl).split('.')[0]}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-rose-500">
            <span className="font-mono text-[11px] text-slate-500">
              {directionData.shortPnl >= 0 ? '+' : ''}{formatCurrency(directionData.shortPnl).split('.')[0]}
            </span>
            <span>Shorts ({directionData.shortPercent}%)</span>
            <ArrowDownRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${directionData.longPercent}%` }}
          />
          <div
            className="h-full bg-rose-500 transition-all duration-500"
            style={{ width: `${directionData.shortPercent}%` }}
          />
        </div>
      </div>

      {/* Asset breakdown list */}
      <div className="space-y-3 pt-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Asset Class Breakdown
        </span>

        {assetData.length === 0 ? (
          <p className="text-xs text-slate-500">No trade data available</p>
        ) : (
          assetData.map((item) => {
            const barColor = assetColorMap[item.assetClass] || 'bg-indigo-500';
            const isPos = item.totalPnl >= 0;

            return (
              <div key={item.assetClass} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {item.assetClass}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-[11px]">
                      {item.count} trades ({item.percentage}%)
                    </span>
                    <span className={`font-mono font-bold ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isPos ? '+' : ''}{formatCurrency(item.totalPnl)}
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
