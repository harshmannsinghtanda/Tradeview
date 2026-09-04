import { useState, useMemo } from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck, Flame, Lock } from 'lucide-react';
import { Trade } from '../../types/trade';

interface TiltCircuitBreakerProps {
  trades: Trade[];
  currency?: string;
  dailyLossLimit?: number; // e.g. $500 max loss
  onUpdateLossLimit?: (limit: number) => void;
}

export function TiltCircuitBreaker({
  trades,
  currency = '$',
  dailyLossLimit = 500,
}: TiltCircuitBreakerProps) {
  const [isLocked, setIsLocked] = useState(false);

  // Compute today's trades and session stats
  const sessionStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const todayTrades = trades.filter(t => {
      const d = (t.exitDate || t.entryDate).split('T')[0];
      return d === todayStr;
    });

    const recentHourTrades = trades.filter(t => {
      const time = new Date(t.exitDate || t.entryDate).getTime();
      return time >= oneHourAgo;
    });

    const todayClosed = todayTrades.filter(t => t.status === 'Closed');
    const todayNetPnl = todayClosed.reduce((acc, t) => acc + (t.netPnl || 0), 0);
    const todayWins = todayClosed.filter(t => (t.netPnl || 0) > 0).length;
    const todayWinRate = todayClosed.length > 0 ? (todayWins / todayClosed.length) * 100 : 0;

    // Check revenge/tilt risk
    const recentRevengeTrades = todayTrades.filter(t => t.emotion === 'Revenge' || t.emotion === 'FOMO');
    const isRapidFire = recentHourTrades.length >= 6;
    const lossPercentageOfLimit = todayNetPnl < 0 ? Math.min(100, (Math.abs(todayNetPnl) / dailyLossLimit) * 100) : 0;
    const isBreached = todayNetPnl <= -dailyLossLimit;
    const isWarning = lossPercentageOfLimit >= 70 && !isBreached;

    return {
      todayCount: todayTrades.length,
      recentHourCount: recentHourTrades.length,
      todayNetPnl,
      todayWinRate: Number(todayWinRate.toFixed(0)),
      recentRevengeCount: recentRevengeTrades.length,
      isRapidFire,
      lossPercentageOfLimit,
      isBreached,
      isWarning,
    };
  }, [trades, dailyLossLimit]);

  return (
    <div className={`p-4 rounded-2xl border transition-all duration-200 ${
      sessionStats.isBreached
        ? 'bg-rose-500/10 border-rose-500/40 text-rose-500'
        : sessionStats.isWarning
        ? 'bg-amber-500/10 border-amber-500/40'
        : 'bg-slate-100/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/80'
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {sessionStats.isBreached ? (
            <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
          ) : sessionStats.isWarning ? (
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          )}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Prop Firm & Tilt Circuit Breaker</span>
              {sessionStats.isBreached && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-black animate-bounce">
                  MAX LOSS BREACHED
                </span>
              )}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Live risk guard to protect capital from emotional revenge trading
            </p>
          </div>
        </div>

        {/* Cooldown Lock Button */}
        <button
          onClick={() => setIsLocked(!isLocked)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            isLocked
              ? 'bg-rose-600 text-white'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>{isLocked ? 'Cooldown Active (Take a Walk)' : 'Lock Session'}</span>
        </button>
      </div>

      {/* Grid Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        
        {/* Daily Drawdown Progress */}
        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
          <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400">
            <span>Daily Loss Limit</span>
            <span className="font-mono">{currency}{dailyLossLimit}</span>
          </div>
          <div className="flex justify-between items-center font-mono font-bold">
            <span className={sessionStats.todayNetPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
              {sessionStats.todayNetPnl >= 0 ? '+' : ''}{currency}{sessionStats.todayNetPnl.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400">
              {sessionStats.lossPercentageOfLimit.toFixed(0)}% used
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                sessionStats.isBreached ? 'bg-rose-600' : sessionStats.isWarning ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${sessionStats.lossPercentageOfLimit}%` }}
            />
          </div>
        </div>

        {/* Rapid Fire Pace in last 60m */}
        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 space-y-0.5">
          <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400">
            <span>Velocity (Last 60m)</span>
            <Flame className={`w-3.5 h-3.5 ${sessionStats.isRapidFire ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className="text-base font-bold font-mono text-slate-800 dark:text-slate-200">
            {sessionStats.recentHourCount} trades
          </div>
          <p className="text-[10px] text-slate-500">
            {sessionStats.isRapidFire ? '⚠️ Rapid execution warning' : 'Controlled pace'}
          </p>
        </div>

        {/* Today's Win Rate */}
        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Session Win Rate</span>
          <div className="text-base font-bold font-mono text-emerald-500">
            {sessionStats.todayWinRate}%
          </div>
          <p className="text-[10px] text-slate-500">
            {sessionStats.todayCount} total scalps today
          </p>
        </div>

        {/* Tilt Warning / Psychological Leak */}
        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">FOMO / Revenge Scalps</span>
          <div className={`text-base font-bold font-mono ${sessionStats.recentRevengeCount > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
            {sessionStats.recentRevengeCount} flagged
          </div>
          <p className="text-[10px] text-slate-500">
            {sessionStats.recentRevengeCount > 0 ? 'Costly emotional leak' : 'Disciplined session'}
          </p>
        </div>

      </div>
    </div>
  );
}
