import { 
  Target, 
  Scale, 
  ShieldAlert, 
  Layers, 
  Zap,
  TrendingUp
} from 'lucide-react';
import { PerformanceMetrics } from '../../types/trade';
import { StatCard } from '../common/StatCard';
import { useCurrency } from '../../context/CurrencyContext';

interface MetricsGridProps {
  metrics: PerformanceMetrics;
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  const { formatCurrency } = useCurrency();
  const isProfitable = metrics.netPnl >= 0;
  const pnlTone = metrics.netPnl > 0 ? 'profit' : metrics.netPnl < 0 ? 'loss' : 'neutral';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
      {/* Net PnL */}
      <StatCard
        title="Net P&L"
        value={`${isProfitable && metrics.netPnl > 0 ? '+' : ''}${formatCurrency(metrics.netPnl)}`}
        subValue={`Gross Win: ${formatCurrency(metrics.grossProfit)} | Loss: ${formatCurrency(-metrics.grossLoss)}`}
        icon={<TrendingUp className="w-4 h-4 text-indigo-500" />}
        trend={metrics.netPnl > 0 ? 'up' : metrics.netPnl < 0 ? 'down' : 'neutral'}
        tone={pnlTone}
      />

      {/* Win Rate */}
      <StatCard
        title="Win Rate"
        value={`${metrics.winRate}%`}
        subValue={`${metrics.winningTrades}W • ${metrics.losingTrades}L • ${metrics.breakEvenTrades}BE`}
        icon={<Target className="w-4 h-4 text-emerald-500" />}
        trend={metrics.winRate >= 50 ? 'up' : 'down'}
        tone={metrics.winRate >= 50 ? 'profit' : 'loss'}
      />

      {/* Profit Factor */}
      <StatCard
        title="Profit Factor"
        value={metrics.profitFactor > 50 ? '∞' : metrics.profitFactor.toFixed(2)}
        subValue={metrics.profitFactor >= 1.5 ? 'Excellent edge' : metrics.profitFactor >= 1.0 ? 'Breakeven / Moderate' : 'Needs refinement'}
        icon={<Scale className="w-4 h-4 text-amber-500" />}
        tone={metrics.profitFactor >= 1.5 ? 'profit' : metrics.profitFactor >= 1.0 ? 'neutral' : 'loss'}
      />

      {/* Avg Win / Avg Loss */}
      <StatCard
        title="Avg Win / Loss"
        value={`${formatCurrency(metrics.avgWin)} / ${formatCurrency(metrics.avgLoss)}`}
        subValue={`Win/Loss Ratio: ${metrics.winLossRatio.toFixed(2)}x`}
        icon={<Zap className="w-4 h-4 text-cyan-500" />}
        tone={metrics.winLossRatio >= 1.5 ? 'profit' : 'neutral'}
      />

      {/* Max Drawdown */}
      <StatCard
        title="Max Drawdown"
        value={`${formatCurrency(-metrics.maxDrawdown)}`}
        subValue={`Peak-to-Trough: -${metrics.maxDrawdownPercent}%`}
        icon={<ShieldAlert className="w-4 h-4 text-rose-500" />}
        tone="loss"
      />

      {/* Total Executed Trades */}
      <StatCard
        title="Total Activity"
        value={metrics.totalTrades}
        subValue={`${metrics.closedTrades} Closed • ${metrics.openTrades} Currently Open`}
        icon={<Layers className="w-4 h-4 text-purple-500" />}
        tone="neutral"
      />
    </div>
  );
}
