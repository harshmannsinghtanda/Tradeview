import { Trade, BehavioralPatternFlag, POPULAR_PATTERNS } from '../types/trade';

export interface PatternPerformance {
  pattern: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  avgRMultiple: number;
  avgPnl: number;
}

export interface BehavioralHabitReport {
  flag: BehavioralPatternFlag;
  count: number;
  totalCost: number; // Sum of negative PnL caused by this behavior
  winRate: number;
  description: string;
  recommendation: string;
  affectedTradeIds: string[];
}

export interface PatternAnalyticsSummary {
  patternStats: PatternPerformance[];
  behavioralHabits: BehavioralHabitReport[];
  totalPatternsIdentified: number;
  bestPattern: PatternPerformance | null;
  worstPattern: PatternPerformance | null;
  revengeTradeCount: number;
  totalLeakageCost: number;
}

/**
 * Automatically inspects trade chronology and execution details to tag behavioral habits
 */
export function detectBehavioralFlags(trades: Trade[]): Map<string, BehavioralPatternFlag[]> {
  const flagsMap = new Map<string, BehavioralPatternFlag[]>();
  
  if (!trades || trades.length === 0) return flagsMap;

  // Sort chronologically ascending
  const sorted = [...trades].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());

  // Calculate median position size for sizing risk outlier detection
  const sizes = sorted.map((t) => t.quantity * t.entryPrice).sort((a, b) => a - b);
  const medianSize = sizes[Math.floor(sizes.length / 2)] || 1;

  // Group trades by calendar day for overtrading detection
  const dayGroups = new Map<string, Trade[]>();
  for (const t of sorted) {
    const day = t.entryDate.split('T')[0] || t.entryDate.slice(0, 10);
    if (!dayGroups.has(day)) dayGroups.set(day, []);
    dayGroups.get(day)!.push(t);
  }

  // Detect overtrading days (> 4 trades in a single day where daily PnL is negative)
  const overtradingTradeIds = new Set<string>();
  dayGroups.forEach((dayTrades) => {
    if (dayTrades.length >= 4) {
      const dayNetPnl = dayTrades.reduce((sum, t) => sum + (t.netPnl || 0), 0);
      if (dayNetPnl < 0) {
        // Mark trades starting from the 4th trade as overtrading streak
        for (let i = 3; i < dayTrades.length; i++) {
          overtradingTradeIds.add(dayTrades[i].id);
        }
      }
    }
  });

  for (let i = 0; i < sorted.length; i++) {
    const trade = sorted[i];
    const flags: BehavioralPatternFlag[] = [];

    // 1. Existing manual flags if already assigned
    if (trade.behavioralFlags && trade.behavioralFlags.length > 0) {
      flags.push(...trade.behavioralFlags);
    }

    // 2. Revenge Trading Detection:
    // If entered within 20 minutes of a losing trade
    if (i > 0) {
      const prev = sorted[i - 1];
      const prevLoss = (prev.netPnl || 0) < 0;
      if (prevLoss && prev.exitDate) {
        const prevExitTime = new Date(prev.exitDate).getTime();
        const currEntryTime = new Date(trade.entryDate).getTime();
        const diffMinutes = (currEntryTime - prevExitTime) / (1000 * 60);

        if (diffMinutes >= 0 && diffMinutes <= 20) {
          if (!flags.includes('Revenge Trading')) {
            flags.push('Revenge Trading');
          }
        }
      }
    }

    // 3. Overtrading Streak
    if (overtradingTradeIds.has(trade.id) && !flags.includes('Overtrading Streak')) {
      flags.push('Overtrading Streak');
    }

    // 4. Oversized Risk (Position capital > 2.2x median capital)
    const positionSize = trade.quantity * trade.entryPrice;
    if (positionSize > medianSize * 2.2 && !flags.includes('Oversized Risk')) {
      flags.push('Oversized Risk');
    }

    // 5. FOMO Chase
    if (trade.emotion === 'FOMO' && !flags.includes('FOMO Chase')) {
      flags.push('FOMO Chase');
    }

    if (flags.length > 0) {
      flagsMap.set(trade.id, Array.from(new Set(flags)));
    }
  }

  return flagsMap;
}

/**
 * Calculates aggregated performance metrics grouped by technical & chart pattern
 */
export function calculatePatternPerformance(trades: Trade[]): PatternPerformance[] {
  const patternMap = new Map<string, Trade[]>();

  trades.forEach((trade) => {
    const patterns = trade.patterns && trade.patterns.length > 0 ? trade.patterns : ['Uncategorized Pattern'];
    patterns.forEach((pattern) => {
      const trimmed = pattern.trim();
      if (!trimmed) return;
      if (!patternMap.has(trimmed)) {
        patternMap.set(trimmed, []);
      }
      patternMap.get(trimmed)!.push(trade);
    });
  });

  const results: PatternPerformance[] = [];

  patternMap.forEach((patternTrades, pattern) => {
    const closed = patternTrades.filter((t) => t.status === 'Closed');
    const totalTrades = closed.length;
    if (totalTrades === 0) return;

    let wins = 0;
    let losses = 0;
    let netPnl = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let sumR = 0;
    let validRCount = 0;

    closed.forEach((t) => {
      const pnl = t.netPnl || 0;
      netPnl += pnl;
      if (pnl > 0) {
        wins++;
        grossProfit += pnl;
      } else if (pnl < 0) {
        losses++;
        grossLoss += Math.abs(pnl);
      }

      if (t.rMultiple !== undefined && t.rMultiple !== null) {
        sumR += t.rMultiple;
        validRCount++;
      }
    });

    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;
    const avgRMultiple = validRCount > 0 ? sumR / validRCount : 0;
    const avgPnl = totalTrades > 0 ? netPnl / totalTrades : 0;

    results.push({
      pattern,
      totalTrades,
      winningTrades: wins,
      losingTrades: losses,
      winRate: Math.round(winRate * 10) / 10,
      netPnl: Math.round(netPnl * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossLoss: Math.round(grossLoss * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      avgRMultiple: Math.round(avgRMultiple * 100) / 100,
      avgPnl: Math.round(avgPnl * 100) / 100,
    });
  });

  // Sort by net PnL descending
  return results.sort((a, b) => b.netPnl - a.netPnl);
}

/**
 * Builds behavioral habit leakage report and actionable recommendations
 */
export function analyzeBehavioralHabits(trades: Trade[]): BehavioralHabitReport[] {
  const flagsMap = detectBehavioralFlags(trades);

  const flagBuckets: Record<BehavioralPatternFlag, { trades: Trade[]; cost: number }> = {
    'Revenge Trading': { trades: [], cost: 0 },
    'Overtrading Streak': { trades: [], cost: 0 },
    'Oversized Risk': { trades: [], cost: 0 },
    'Premature Exit': { trades: [], cost: 0 },
    'FOMO Chase': { trades: [], cost: 0 },
  };

  trades.forEach((trade) => {
    const flags = flagsMap.get(trade.id) || [];
    flags.forEach((f) => {
      if (flagBuckets[f]) {
        flagBuckets[f].trades.push(trade);
        if ((trade.netPnl || 0) < 0) {
          flagBuckets[f].cost += Math.abs(trade.netPnl || 0);
        }
      }
    });
  });

  const habitsMeta: Record<BehavioralPatternFlag, { desc: string; rec: string }> = {
    'Revenge Trading': {
      desc: 'Entering trades shortly after taking a loss trying to win capital back immediately.',
      rec: 'Enforce a mandatory 20-minute screen cooldown after any stop loss execution.',
    },
    'Overtrading Streak': {
      desc: 'Executing high trade frequency during choppy market sessions with diminishing returns.',
      rec: 'Set a hard daily cap of 3 trades max. Once reached, lock the terminal for the session.',
    },
    'Oversized Risk': {
      desc: 'Risking significantly more capital or leverage than your baseline account plan.',
      rec: 'Fix your stop loss dollar risk strictly to 1%–2% of total account capital per idea.',
    },
    'Premature Exit': {
      desc: 'Closing winning positions too early due to fear, preventing high R-multiple realization.',
      rec: 'Use automated trailing stop brackets or scale out half at 1.5R and let runners breathe.',
    },
    'FOMO Chase': {
      desc: 'Jumping into extended candles or breakout moves without waiting for a retest.',
      rec: 'Set limit entry orders at key structure levels rather than clicking market buys on green bars.',
    },
  };

  const reports: BehavioralHabitReport[] = [];

  (Object.keys(flagBuckets) as BehavioralPatternFlag[]).forEach((flag) => {
    const bucket = flagBuckets[flag];
    if (bucket.trades.length > 0) {
      const wins = bucket.trades.filter((t) => (t.netPnl || 0) > 0).length;
      const winRate = Math.round((wins / bucket.trades.length) * 100);

      reports.push({
        flag,
        count: bucket.trades.length,
        totalCost: Math.round(bucket.cost * 100) / 100,
        winRate,
        description: habitsMeta[flag].desc,
        recommendation: habitsMeta[flag].rec,
        affectedTradeIds: bucket.trades.map((t) => t.id),
      });
    }
  });

  return reports.sort((a, b) => b.totalCost - a.totalCost);
}

/**
 * Complete pattern identification and intelligence report
 */
export function generatePatternAnalytics(trades: Trade[]): PatternAnalyticsSummary {
  const patternStats = calculatePatternPerformance(trades);
  const behavioralHabits = analyzeBehavioralHabits(trades);

  const bestPattern = patternStats.length > 0 ? patternStats[0] : null;
  const worstPattern = patternStats.length > 1 ? patternStats[patternStats.length - 1] : null;

  const revengeHabit = behavioralHabits.find((h) => h.flag === 'Revenge Trading');
  const revengeTradeCount = revengeHabit ? revengeHabit.count : 0;
  const totalLeakageCost = behavioralHabits.reduce((acc, h) => acc + h.totalCost, 0);

  const totalPatternsIdentified = trades.reduce((sum, t) => sum + (t.patterns ? t.patterns.length : 0), 0);

  return {
    patternStats,
    behavioralHabits,
    totalPatternsIdentified,
    bestPattern,
    worstPattern,
    revengeTradeCount,
    totalLeakageCost: Math.round(totalLeakageCost * 100) / 100,
  };
}

export { POPULAR_PATTERNS };
