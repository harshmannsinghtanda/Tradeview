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

export interface HoldingDurationAnalysis {
  avgWinMinutes: number;
  avgLossMinutes: number;
  ratio: number; // avgLoss / avgWin
  isBagHolding: boolean; // if ratio > 1.8
  winCount: number;
  lossCount: number;
  diagnosis: string;
  recommendation: string;
}

export interface TimeOfDayPattern {
  session: string;
  hourRange: string;
  totalTrades: number;
  winningTrades: number;
  winRate: number;
  netPnl: number;
  profitFactor: number;
  isTrap: boolean;
}

export interface DayOfWeekPattern {
  dayName: string;
  dayIndex: number;
  totalTrades: number;
  winRate: number;
  netPnl: number;
  profitFactor: number;
  isBestDay: boolean;
  isWorstDay: boolean;
}

export interface DirectionalBiasAnalysis {
  longCount: number;
  longWinRate: number;
  longNetPnl: number;
  longProfitFactor: number;
  shortCount: number;
  shortWinRate: number;
  shortNetPnl: number;
  shortProfitFactor: number;
  favoredDirection: 'Long' | 'Short' | 'Balanced';
  biasSummary: string;
}

export interface PatternAnalyticsSummary {
  patternStats: PatternPerformance[];
  behavioralHabits: BehavioralHabitReport[];
  totalPatternsIdentified: number;
  bestPattern: PatternPerformance | null;
  worstPattern: PatternPerformance | null;
  revengeTradeCount: number;
  totalLeakageCost: number;
  holdingDuration: HoldingDurationAnalysis;
  timeOfDayPatterns: TimeOfDayPattern[];
  dayOfWeekPatterns: DayOfWeekPattern[];
  directionalBias: DirectionalBiasAnalysis;
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

  // Calculate median holding duration for closed trades
  const durations = sorted
    .filter((t) => t.status === 'Closed' && t.exitDate)
    .map((t) => Math.max(1, (new Date(t.exitDate!).getTime() - new Date(t.entryDate).getTime()) / 60000))
    .sort((a, b) => a - b);
  const medianDuration = durations[Math.floor(durations.length / 2)] || 30;

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

        // 3. Martingale Sizing Escalation Detection (Size >= 1.4x previous trade after a loss)
        const prevSize = prev.quantity * prev.entryPrice;
        const currSize = trade.quantity * trade.entryPrice;
        if (currSize >= prevSize * 1.4 && !flags.includes('Martingale Escalation')) {
          flags.push('Martingale Escalation');
        }
      }
    }

    // 4. Overtrading Streak
    if (overtradingTradeIds.has(trade.id) && !flags.includes('Overtrading Streak')) {
      flags.push('Overtrading Streak');
    }

    // 5. Oversized Risk (Position capital > 2.2x median capital)
    const positionSize = trade.quantity * trade.entryPrice;
    if (positionSize > medianSize * 2.2 && !flags.includes('Oversized Risk')) {
      flags.push('Oversized Risk');
    }

    // 6. Midday Chop Trap (Entered between 11:30 and 13:30 local/UTC hours and resulted in loss)
    const entryDateObj = new Date(trade.entryDate);
    const hour = entryDateObj.getHours() + entryDateObj.getMinutes() / 60;
    if (hour >= 11.5 && hour <= 13.5 && (trade.netPnl || 0) < 0 && !flags.includes('Midday Chop Trap')) {
      flags.push('Midday Chop Trap');
    }

    // 7. Zombie Bag-Holding (Losing trade held > 2.5x median duration)
    if (trade.status === 'Closed' && trade.exitDate && (trade.netPnl || 0) < 0) {
      const holdTime = (new Date(trade.exitDate).getTime() - new Date(trade.entryDate).getTime()) / 60000;
      if (holdTime > medianDuration * 2.5 && !flags.includes('Zombie Bag-Holding')) {
        flags.push('Zombie Bag-Holding');
      }
    }

    // 8. FOMO Chase
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
    'Zombie Bag-Holding': { trades: [], cost: 0 },
    'Midday Chop Trap': { trades: [], cost: 0 },
    'Martingale Escalation': { trades: [], cost: 0 },
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
    'Zombie Bag-Holding': {
      desc: 'Holding losing trades significantly longer than planned in hope of a turnaround.',
      rec: 'Honor your hard Stop Loss unconditionally. Cut invalid ideas immediately.',
    },
    'Midday Chop Trap': {
      desc: 'Taking trades during low-volume lunchtime hours (11:30–13:30) where momentum decays.',
      rec: 'Step away from the screen between 11:30 AM and 1:30 PM. Only trade high-volume sessions.',
    },
    'Martingale Escalation': {
      desc: 'Increasing position size or contract sizing immediately following a loss.',
      rec: 'Maintain fixed risk units ($ or R). Never increase sizing after a red trade.',
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
 * Analyzes holding duration differences between winning and losing trades (Disposition Effect)
 */
export function analyzeHoldingDuration(trades: Trade[]): HoldingDurationAnalysis {
  const closed = trades.filter((t) => t.status === 'Closed' && t.exitDate);

  let winDurationSum = 0;
  let winCount = 0;
  let lossDurationSum = 0;
  let lossCount = 0;

  closed.forEach((t) => {
    const entry = new Date(t.entryDate).getTime();
    const exit = new Date(t.exitDate!).getTime();
    const minutes = Math.max(1, (exit - entry) / 60000);

    if ((t.netPnl || 0) > 0) {
      winDurationSum += minutes;
      winCount++;
    } else if ((t.netPnl || 0) < 0) {
      lossDurationSum += minutes;
      lossCount++;
    }
  });

  const avgWinMinutes = winCount > 0 ? Math.round(winDurationSum / winCount) : 0;
  const avgLossMinutes = lossCount > 0 ? Math.round(lossDurationSum / lossCount) : 0;
  const ratio = avgWinMinutes > 0 ? Math.round((avgLossMinutes / avgWinMinutes) * 10) / 10 : 1;
  const isBagHolding = ratio >= 1.8;

  let diagnosis = 'Healthy Duration Symmetry: You exit winning and losing trades in balanced timeframes.';
  let recommendation = 'Keep maintaining disciplined stops and structured target exits.';

  if (isBagHolding) {
    diagnosis = `Disposition Leak Detected: You hold losing trades ${ratio}x longer than winners (${avgLossMinutes}m vs. ${avgWinMinutes}m).`;
    recommendation = 'Set automated bracket orders so losing trades exit strictly when invalidated without lingering in hope.';
  } else if (ratio < 0.6 && avgWinMinutes > 0) {
    diagnosis = 'Patience Edge: You let winning trades run significantly longer than losing trades.';
    recommendation = 'Maintain this trend-following patience; it gives positive statistical expectancy.';
  }

  return {
    avgWinMinutes,
    avgLossMinutes,
    ratio,
    isBagHolding,
    winCount,
    lossCount,
    diagnosis,
    recommendation,
  };
}

/**
 * Analyzes trade performance across intraday sessions (Opening Drive, Midday Chop, Power Hour, Off-Hours)
 */
export function analyzeTimeOfDayPatterns(trades: Trade[]): TimeOfDayPattern[] {
  const closed = trades.filter((t) => t.status === 'Closed');

  const sessions = [
    { session: 'Opening Drive', hourRange: '09:00 - 11:30', minH: 9, maxH: 11.5 },
    { session: 'Midday Chop', hourRange: '11:30 - 13:30', minH: 11.5, maxH: 13.5 },
    { session: 'Afternoon Power Hour', hourRange: '13:30 - 16:00', minH: 13.5, maxH: 16 },
    { session: 'Off-Hours & Crypto 24/7', hourRange: '16:00 - 09:00', minH: 16, maxH: 33 }, // wraps
  ];

  return sessions.map((s) => {
    const matching = closed.filter((t) => {
      const d = new Date(t.entryDate);
      const h = d.getHours() + d.getMinutes() / 60;
      if (s.minH === 16) {
        return h >= 16 || h < 9;
      }
      return h >= s.minH && h < s.maxH;
    });

    const totalTrades = matching.length;
    const wins = matching.filter((t) => (t.netPnl || 0) > 0);
    const winRate = totalTrades > 0 ? Math.round((wins.length / totalTrades) * 100) : 0;
    const netPnl = Math.round(matching.reduce((acc, t) => acc + (t.netPnl || 0), 0) * 100) / 100;
    
    const grossProfit = wins.reduce((acc, t) => acc + (t.netPnl || 0), 0);
    const grossLoss = Math.abs(matching.filter((t) => (t.netPnl || 0) < 0).reduce((acc, t) => acc + (t.netPnl || 0), 0));
    const profitFactor = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? 99 : 0;

    const isTrap = totalTrades >= 2 && netPnl < 0 && winRate < 45;

    return {
      session: s.session,
      hourRange: s.hourRange,
      totalTrades,
      winningTrades: wins.length,
      winRate,
      netPnl,
      profitFactor,
      isTrap,
    };
  });
}

/**
 * Analyzes performance patterns across days of the week (Monday through Sunday)
 */
export function analyzeDayOfWeekPatterns(trades: Trade[]): DayOfWeekPattern[] {
  const closed = trades.filter((t) => t.status === 'Closed');
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const results: DayOfWeekPattern[] = dayNames.map((dayName, dayIndex) => {
    const matching = closed.filter((t) => new Date(t.entryDate).getDay() === dayIndex);
    const totalTrades = matching.length;
    const wins = matching.filter((t) => (t.netPnl || 0) > 0);
    const winRate = totalTrades > 0 ? Math.round((wins.length / totalTrades) * 100) : 0;
    const netPnl = Math.round(matching.reduce((acc, t) => acc + (t.netPnl || 0), 0) * 100) / 100;

    const grossProfit = wins.reduce((acc, t) => acc + (t.netPnl || 0), 0);
    const grossLoss = Math.abs(matching.filter((t) => (t.netPnl || 0) < 0).reduce((acc, t) => acc + (t.netPnl || 0), 0));
    const profitFactor = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? 99 : 0;

    return {
      dayName,
      dayIndex,
      totalTrades,
      winRate,
      netPnl,
      profitFactor,
      isBestDay: false,
      isWorstDay: false,
    };
  }).filter((d) => d.totalTrades > 0);

  // Identify best and worst day
  if (results.length > 0) {
    const sorted = [...results].sort((a, b) => b.netPnl - a.netPnl);
    sorted[0].isBestDay = true;
    if (sorted.length > 1 && sorted[sorted.length - 1].netPnl < 0) {
      sorted[sorted.length - 1].isWorstDay = true;
    }
  }

  return results;
}

/**
 * Compares Long vs. Short execution edge and directional blindspots
 */
export function analyzeDirectionalBias(trades: Trade[]): DirectionalBiasAnalysis {
  const closed = trades.filter((t) => t.status === 'Closed');

  const longs = closed.filter((t) => t.direction === 'Long');
  const shorts = closed.filter((t) => t.direction === 'Short');

  const calcSide = (sideTrades: Trade[]) => {
    const count = sideTrades.length;
    const wins = sideTrades.filter((t) => (t.netPnl || 0) > 0);
    const winRate = count > 0 ? Math.round((wins.length / count) * 100) : 0;
    const netPnl = Math.round(sideTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0) * 100) / 100;
    const grossProfit = wins.reduce((acc, t) => acc + (t.netPnl || 0), 0);
    const grossLoss = Math.abs(sideTrades.filter((t) => (t.netPnl || 0) < 0).reduce((acc, t) => acc + (t.netPnl || 0), 0));
    const profitFactor = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? 99 : 0;
    return { count, winRate, netPnl, profitFactor };
  };

  const longStats = calcSide(longs);
  const shortStats = calcSide(shorts);

  let favoredDirection: 'Long' | 'Short' | 'Balanced' = 'Balanced';
  let biasSummary = 'Balanced directional performance between Longs and Shorts.';

  if (longStats.netPnl > shortStats.netPnl + 100 && longStats.winRate > shortStats.winRate + 15) {
    favoredDirection = 'Long';
    biasSummary = `Long-Side Edge: Your Long trades outperform Shorts with a ${longStats.winRate}% win rate vs. ${shortStats.winRate}% on Shorts.`;
  } else if (shortStats.netPnl > longStats.netPnl + 100 && shortStats.winRate > longStats.winRate + 15) {
    favoredDirection = 'Short';
    biasSummary = `Short-Side Edge: You show higher profitability going Short (${shortStats.winRate}% win rate) compared to buying Longs (${longStats.winRate}%).`;
  }

  return {
    longCount: longStats.count,
    longWinRate: longStats.winRate,
    longNetPnl: longStats.netPnl,
    longProfitFactor: longStats.profitFactor,
    shortCount: shortStats.count,
    shortWinRate: shortStats.winRate,
    shortNetPnl: shortStats.netPnl,
    shortProfitFactor: shortStats.profitFactor,
    favoredDirection,
    biasSummary,
  };
}

/**
 * Complete pattern identification and intelligence report
 */
export function generatePatternAnalytics(trades: Trade[]): PatternAnalyticsSummary {
  const patternStats = calculatePatternPerformance(trades);
  const behavioralHabits = analyzeBehavioralHabits(trades);
  const holdingDuration = analyzeHoldingDuration(trades);
  const timeOfDayPatterns = analyzeTimeOfDayPatterns(trades);
  const dayOfWeekPatterns = analyzeDayOfWeekPatterns(trades);
  const directionalBias = analyzeDirectionalBias(trades);

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
    holdingDuration,
    timeOfDayPatterns,
    dayOfWeekPatterns,
    directionalBias,
  };
}

export { POPULAR_PATTERNS };
