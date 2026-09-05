import { Trade, PerformanceMetrics } from '../types/trade';

/**
 * Calculates financial outputs for an individual trade
 */
export function calculateTradeFinancials(trade: Partial<Trade>): {
  grossPnl: number;
  netPnl: number;
  pnlPercentage: number;
  rMultiple: number;
} {
  const entryPrice = Number(trade.entryPrice) || 0;
  const exitPrice = trade.exitPrice !== undefined && trade.exitPrice !== null && trade.exitPrice !== 0
    ? Number(trade.exitPrice)
    : entryPrice;
  const quantity = Number(trade.quantity) || 0;
  const fees = Number(trade.fees) || 0;
  const direction = trade.direction || 'Long';

  let grossPnl = 0;
  if (direction === 'Long') {
    grossPnl = (exitPrice - entryPrice) * quantity;
  } else {
    grossPnl = (entryPrice - exitPrice) * quantity;
  }

  const netPnl = grossPnl - fees;

  const totalCost = entryPrice * quantity;
  const pnlPercentage = totalCost > 0 ? (netPnl / totalCost) * 100 : 0;

  // Calculate R-Multiple if stop loss was provided
  let rMultiple = 0;
  if (trade.stopLoss && trade.stopLoss !== entryPrice) {
    const riskPerUnit = direction === 'Long' 
      ? entryPrice - trade.stopLoss 
      : trade.stopLoss - entryPrice;
    
    if (riskPerUnit > 0) {
      const totalRisk = riskPerUnit * quantity;
      if (totalRisk > 0) {
        rMultiple = Number((netPnl / totalRisk).toFixed(2));
      }
    }
  }

  return {
    grossPnl: Number(grossPnl.toFixed(2)),
    netPnl: Number(netPnl.toFixed(2)),
    pnlPercentage: Number(pnlPercentage.toFixed(2)),
    rMultiple,
  };
}

/**
 * Computes portfolio-wide performance metrics from closed trades
 */
export function calculatePerformanceMetrics(trades: Trade[]): PerformanceMetrics {
  const closedTrades = trades.filter((t) => t.status === 'Closed');
  const openTrades = trades.filter((t) => t.status === 'Open');

  let grossProfit = 0;
  let grossLoss = 0;
  let totalFees = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let breakEvenTrades = 0;
  let largestWin = 0;
  let largestLoss = 0;
  let sumWin = 0;
  let sumLoss = 0;
  let sumR = 0;
  let rCount = 0;

  closedTrades.forEach((t) => {
    const net = t.netPnl ?? 0;
    totalFees += t.fees ?? 0;

    if (t.rMultiple !== undefined && t.rMultiple !== 0) {
      sumR += t.rMultiple;
      rCount += 1;
    }

    if (net > 0.01) {
      winningTrades += 1;
      grossProfit += net;
      sumWin += net;
      if (net > largestWin) largestWin = net;
    } else if (net < -0.01) {
      losingTrades += 1;
      grossLoss += Math.abs(net);
      sumLoss += Math.abs(net);
      if (net < largestLoss) largestLoss = net;
    } else {
      breakEvenTrades += 1;
    }
  });

  const netPnl = grossProfit - grossLoss;
  const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
  const avgWin = winningTrades > 0 ? sumWin / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? sumLoss / losingTrades : 0;
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 999 : 0;
  const avgRMultiple = rCount > 0 ? sumR / rCount : 0;

  // Max Drawdown calculation along the chronological curve
  const sorted = [...closedTrades].sort(
    (a, b) => new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime()
  );

  let peak = 0;
  let currentEquity = 0;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  sorted.forEach((t) => {
    currentEquity += t.netPnl ?? 0;
    if (currentEquity > peak) {
      peak = currentEquity;
    }
    const dd = peak - currentEquity;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
      maxDrawdownPercent = peak > 0 ? (dd / peak) * 100 : 0;
    }
  });

  return {
    totalTrades: trades.length,
    openTrades: openTrades.length,
    closedTrades: closedTrades.length,
    winningTrades,
    losingTrades,
    breakEvenTrades,
    winRate: Number(winRate.toFixed(1)),
    netPnl: Number(netPnl.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    avgWin: Number(avgWin.toFixed(2)),
    avgLoss: Number(avgLoss.toFixed(2)),
    winLossRatio: Number(winLossRatio.toFixed(2)),
    largestWin: Number(largestWin.toFixed(2)),
    largestLoss: Number(largestLoss.toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(1)),
    avgRMultiple: Number(avgRMultiple.toFixed(2)),
    totalFees: Number(totalFees.toFixed(2)),
  };
}

/**
 * Builds points for the cumulative P&L equity curve
 */
export function buildCumulativePnlSeries(trades: Trade[]): {
  date: string;
  pnl: number;
  cumulative: number;
  symbol: string;
}[] {
  const closed = trades
    .filter((t) => t.status === 'Closed' && t.netPnl !== undefined)
    .sort((a, b) => new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime());

  let rolling = 0;
  return closed.map((t) => {
    rolling += t.netPnl ?? 0;
    const raw = t.exitDate || t.entryDate;
    const d = new Date(raw);
    const dateStr = !isNaN(d.getTime())
      ? d.toISOString().split('T')[0]
      : String(raw).split('T')[0].split(' ')[0];
    return {
      date: dateStr,
      pnl: t.netPnl ?? 0,
      cumulative: Number(rolling.toFixed(2)),
      symbol: t.symbol,
    };
  });
}

/**
 * Groups net P&L by calendar date (YYYY-MM-DD) for heatmaps
 */
export function buildCalendarHeatmapData(trades: Trade[]): Record<string, { pnl: number; count: number }> {
  const result: Record<string, { pnl: number; count: number }> = {};

  trades.forEach((t) => {
    if (t.status === 'Closed' && t.netPnl !== undefined) {
      const raw = t.exitDate || t.entryDate;
      const d = new Date(raw);
      const dateKey = !isNaN(d.getTime())
        ? d.toISOString().split('T')[0]
        : String(raw).split('T')[0].split(' ')[0];

      if (!result[dateKey]) {
        result[dateKey] = { pnl: 0, count: 0 };
      }
      result[dateKey].pnl += t.netPnl;
      result[dateKey].count += 1;
    }
  });

  return result;
}

/**
 * Analyzes performance grouped by Emotion
 */
export function analyzeByEmotion(trades: Trade[]): {
  emotion: string;
  count: number;
  winRate: number;
  totalPnl: number;
}[] {
  const groups: Record<string, { wins: number; total: number; pnl: number }> = {};

  trades.forEach((t) => {
    if (t.status === 'Closed' && t.emotion) {
      if (!groups[t.emotion]) {
        groups[t.emotion] = { wins: 0, total: 0, pnl: 0 };
      }
      groups[t.emotion].total += 1;
      const net = t.netPnl ?? 0;
      groups[t.emotion].pnl += net;
      if (net > 0) groups[t.emotion].wins += 1;
    }
  });

  return Object.entries(groups).map(([emotion, val]) => ({
    emotion,
    count: val.total,
    winRate: Number(((val.wins / val.total) * 100).toFixed(1)),
    totalPnl: Number(val.pnl.toFixed(2)),
  })).sort((a, b) => b.totalPnl - a.totalPnl);
}

/**
 * Analyzes performance grouped by Setup / Strategy
 */
export function analyzeByStrategy(trades: Trade[]): {
  strategy: string;
  count: number;
  winRate: number;
  totalPnl: number;
}[] {
  const groups: Record<string, { wins: number; total: number; pnl: number }> = {};

  trades.forEach((t) => {
    if (t.status === 'Closed' && t.strategy) {
      const strat = t.strategy.trim() || 'Uncategorized';
      if (!groups[strat]) {
        groups[strat] = { wins: 0, total: 0, pnl: 0 };
      }
      groups[strat].total += 1;
      const net = t.netPnl ?? 0;
      groups[strat].pnl += net;
      if (net > 0) groups[strat].wins += 1;
    }
  });

  return Object.entries(groups).map(([strategy, val]) => ({
    strategy,
    count: val.total,
    winRate: Number(((val.wins / val.total) * 100).toFixed(1)),
    totalPnl: Number(val.pnl.toFixed(2)),
  })).sort((a, b) => b.totalPnl - a.totalPnl);
}

/**
 * Analyzes distribution across Asset Classes
 */
export function analyzeByAssetClass(trades: Trade[]): {
  assetClass: string;
  count: number;
  percentage: number;
  totalPnl: number;
}[] {
  const groups: Record<string, { count: number; pnl: number }> = {};
  const totalTrades = trades.length || 1;

  trades.forEach((t) => {
    const ac = t.assetClass || 'Crypto';
    if (!groups[ac]) {
      groups[ac] = { count: 0, pnl: 0 };
    }
    groups[ac].count += 1;
    if (t.status === 'Closed') {
      groups[ac].pnl += t.netPnl ?? 0;
    }
  });

  return Object.entries(groups).map(([assetClass, val]) => ({
    assetClass,
    count: val.count,
    percentage: Number(((val.count / totalTrades) * 100).toFixed(1)),
    totalPnl: Number(val.pnl.toFixed(2)),
  })).sort((a, b) => b.count - a.count);
}
